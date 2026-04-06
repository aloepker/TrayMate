/**
 * TrayMate Gemini AI Service
 *
 * Uses direct REST API calls to Gemini (not the SDK) for maximum
 * compatibility with React Native. Supports model fallback — if one
 * model hits quota (429), it automatically tries the next.
 *
 * Features:
 * - Direct fetch-based API calls (no SDK dependency issues)
 * - Automatic model fallback (gemini-2.5-flash → 2.0-flash → 2.0-flash-lite)
 * - Conversation history for multi-turn chat
 * - Resident-aware system prompt with full meal database
 */

import { GEMINI_CONFIG } from '../config/geminiConfig';
import { MealService, ResidentService } from './localDataService';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

type GeminiMessage = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

type ResidentOverride = {
  name: string;
  dietaryRestrictions?: string[];
};

/**
 * Builds the full system prompt with resident + meal context.
 * Supports both local residents (full data) and API-sourced residents
 * (name + dietary restrictions passed via residentOverride).
 */
async function buildSystemPrompt(
  residentId: string,
  language: string = 'English',
  residentOverride?: ResidentOverride,
): Promise<string> {
  const resident = ResidentService.getResidentById(residentId);
  const allMeals = await MealService.getAllMeals();

  let residentContext: string;

  if (resident) {
    // Local resident — full data available
    residentContext = `
CURRENT RESIDENT: ${resident.fullName} (Room ${resident.roomNumber})

ALLERGIES & DIETARY RESTRICTIONS:
${resident.dietaryRestrictions
    .map(r => `- ${r.name} (type: ${r.type}, severity: ${r.severity})`)
    .join('\n')}

DISLIKED INGREDIENTS: ${
    resident.dislikedIngredients.length > 0
      ? resident.dislikedIngredients.join(', ')
      : 'None'
  }

NUTRITION GOALS:
- Daily Calories: ${resident.nutritionGoals.dailyCalories} kcal
- Max Sodium: ${resident.nutritionGoals.maxSodium}mg
- Min Protein: ${resident.nutritionGoals.minProtein}g
- Max Cholesterol: ${resident.nutritionGoals.maxCholesterol}mg
- Max Sugar: ${resident.nutritionGoals.maxSugar}g

FAVORITE MEAL IDS: ${resident.favoriteMealIds.join(', ')}
`;
  } else if (residentOverride) {
    // API-sourced resident — use override data
    const restrictions = residentOverride.dietaryRestrictions;
    residentContext = `
CURRENT RESIDENT: ${residentOverride.name}

ALLERGIES & DIETARY RESTRICTIONS:
${restrictions && restrictions.length > 0
    ? restrictions.map(r => `- ${r} (MUST AVOID)`).join('\n')
    : 'None specified'}

DISLIKED INGREDIENTS: None specified
`;
  } else {
    // No resident data at all — still include meal database
    residentContext = `
CURRENT RESIDENT: Unknown resident

ALLERGIES & DIETARY RESTRICTIONS: None specified
DISLIKED INGREDIENTS: None specified
`;
  }

  const mealsContext = allMeals
    .map(
      m =>
        `[ID:${m.id}] ${m.name} | ${m.mealPeriod} (${m.timeRange})
  Ingredients: ${m.ingredients.join(', ')}
  Allergens: ${m.allergenInfo.length > 0 ? m.allergenInfo.join(', ') : 'None'}
  Nutrition: ${m.nutrition.calories} cal, ${m.nutrition.sodium} sodium, ${m.nutrition.protein} protein
  Tags: ${m.tags.join(', ')}
  Description: ${m.description}`,
    )
    .join('\n\n');

  return `You are GrannyGBT, a friendly and knowledgeable meal planning assistant for a senior living facility called TrayMate.
Your tone is warm, helpful, and conversational — like a smart friend who knows a lot about food and nutrition.
DO NOT use grandma-style pet names like "dear", "sweetie", "honey", "sugar", "sweetheart", or "darling". Just talk naturally and friendly.
Use emojis sparingly — one or two per response max (like 🍽 or ✅), not every sentence.

Your primary role is to help staff and residents select safe, nutritious, and enjoyable meals.

CRITICAL SAFETY RULES:
1. NEVER suggest meals that contain allergens listed in this resident's dietary restrictions.
2. For SEVERE allergies, always explicitly warn if a meal contains or may contain the allergen.
3. Always cross-reference meal ingredients and allergenInfo against the resident's restrictions before recommending.
4. Flag any meal that contains the resident's disliked ingredients.
5. Consider the resident's nutrition goals when making recommendations.
6. You can ONLY recommend meals from the AVAILABLE MEALS list below. Do not invent meals.

${residentContext}

AVAILABLE MEALS:
${mealsContext}

RESPONSE RULES — KEEP IT SHORT:
- Max 2-3 sentences per response. Never write paragraphs.
- For meal recommendations: one sentence on why it fits, then the meal name in bold.
- For menu listing: bullet points only, no extra commentary.
- Never repeat the resident's name back in every sentence.
- No filler phrases like "Great question!" or "Of course!".
- Format meal names in bold: **name**.
- Flag unsafe meals in one short sentence.
- Only recommend meals from the AVAILABLE MEALS list.

LANGUAGE: Respond in ${language} only. Meal names stay in English.`;
}

/**
 * Try calling Gemini REST API with a specific model.
 * Uses the :generateContent endpoint with systemInstruction.
 * Returns the response text or throws on error.
 */
async function callGeminiModel(
  modelName: string,
  systemPrompt: string,
  history: GeminiMessage[],
  userMessage: string,
): Promise<string> {
  const url = `${BASE_URL}/${modelName}:generateContent?key=${GEMINI_CONFIG.apiKey}`;
  console.log(`[GrannyGBT] Calling ${modelName}, key starts with: ${GEMINI_CONFIG.apiKey.substring(0, 10)}...`);

  // Build contents array: conversation history followed by current message
  const contents: GeminiMessage[] = [...history, { role: 'user', parts: [{ text: userMessage }] }];

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
  };

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (fetchErr: any) {
    console.error(`[GrannyGBT] fetch() threw: ${fetchErr.message}`);
    throw new Error(`Network error: ${fetchErr.message}`);
  }

  console.log(`[GrannyGBT] ${modelName} response status: ${resp.status}`);

  const text = await resp.text().catch(() => '');
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { _raw: text };
  }

  if (!resp.ok) {
    const status = resp.status;
    const message = data?.error?.message || data?._raw || `HTTP ${status}`;
    console.error(`[GrannyGBT] ${modelName} error: [${status}] ${message}`);
    throw new Error(`[${status}] ${message}`);
  }

  // Extract text from candidates (standard Gemini response shape)
  const parts = data?.candidates?.[0]?.content?.parts;
  if (parts && Array.isArray(parts)) {
    const combined = parts.map((p: any) => p.text).filter(Boolean).join('\n');
    if (combined.trim().length > 0) return combined.trim();
  }

  throw new Error('No text in Gemini response');
}

/**
 * Manages a Gemini chat session with model fallback and conversation history.
 */
export class GeminiChatService {
  private systemPrompt: string = '';
  private history: GeminiMessage[] = [];
  private currentModel: string = GEMINI_CONFIG.models[0];
  private initPromise: Promise<void> | null = null;

  /**
   * Check if the Gemini API key is configured.
   */
  isConfigured(): boolean {
    const key = GEMINI_CONFIG.apiKey;
    return (
      typeof key === 'string' &&
      key.length > 0 &&
      key !== 'YOUR_GEMINI_API_KEY_HERE' &&
      key !== 'REPLACE_WITH_YOUR_KEY'
    );
  }

  /**
   * Initialize (or re-initialize) a chat session for the given resident.
   * Pass residentOverride for API-sourced residents not in the local database.
   */
  async initialize(
    residentId: string,
    language: string = 'English',
    residentOverride?: ResidentOverride,
  ): Promise<void> {
    this.initPromise = (async () => {
      this.systemPrompt = await buildSystemPrompt(residentId, language, residentOverride);
      this.history = [];
      this.currentModel = GEMINI_CONFIG.models[0];
      console.log('[GrannyGBT] Chat initialized, system prompt length:', this.systemPrompt.length);
    })();
    return this.initPromise;
  }

  /**
   * Send a message and get a response, with automatic model fallback.
   * Waits for initialization to complete if still in progress.
   */
  async sendMessage(userMessage: string): Promise<string> {
    // Wait for initialization to complete if it's in progress
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.systemPrompt) {
      throw new Error('Chat not initialized. Call initialize() first.');
    }

    let lastError: Error | null = null;

    // Try each model in order — retry on any failure
    for (const modelName of GEMINI_CONFIG.models) {
      try {
        const responseText = await callGeminiModel(
          modelName,
          this.systemPrompt,
          this.history,
          userMessage,
        );

        // Success! Save to conversation history
        this.history.push({
          role: 'user',
          parts: [{ text: userMessage }],
        });
        this.history.push({
          role: 'model',
          parts: [{ text: responseText }],
        });

        // Keep history manageable (last 10 turns = 20 messages)
        if (this.history.length > 20) {
          this.history = this.history.slice(-20);
        }

        this.currentModel = modelName;
        console.log(`[GrannyGBT] Response from ${modelName}`);
        return responseText;
      } catch (error: any) {
        lastError = error;
        console.warn(
          `[GrannyGBT] ${modelName} failed: ${error.message}, trying next model...`,
        );
        continue; // Try next model
      }
    }

    // All models failed
    throw lastError || new Error('All Gemini models are unavailable');
  }

  /**
   * Get which model is currently being used.
   */
  getCurrentModel(): string {
    return this.currentModel;
  }

  /**
   * Test connectivity to Gemini models by sending a tiny safety-check message.
   * Returns true if any model responds successfully.
   */
  async testConnection(): Promise<boolean> {
    if (!this.systemPrompt) return false;

    try {
      // Try each model but do not mutate conversation history
      for (const modelName of GEMINI_CONFIG.models) {
        try {
          const res = await callGeminiModel(modelName, this.systemPrompt, [], 'Say "ok"');
          if (res && res.length > 0) {
            this.currentModel = modelName;
            return true;
          }
        } catch (e) {
          // try next
          continue;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Reset the chat session for a (possibly different) resident.
   */
  reset(residentId: string, language: string = 'English', residentOverride?: ResidentOverride): void {
    this.initialize(residentId, language, residentOverride);
  }
}

// Singleton for the BrowseMealOptions chat modal
export const geminiChat = new GeminiChatService();

// Factory for creating independent sessions (e.g. the standalone screen)
export function createGeminiChat(): GeminiChatService {
  return new GeminiChatService();
}
