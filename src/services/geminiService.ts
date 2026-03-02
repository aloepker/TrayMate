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

/**
 * Builds the full system prompt with resident + meal context
 */
function buildSystemPrompt(residentId: string, language: string = 'English'): string {
  const resident = ResidentService.getResidentById(residentId);
  if (!resident) {
    return 'You are GrannyGBT, a warm and loving grandmotherly meal planning assistant. No resident data is available.';
  }

  const allMeals = MealService.getAllMeals();

  const residentContext = `
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

RESPONSE GUIDELINES:
- Be concise, friendly, and helpful. No over-the-top grandma persona.
- Answer greetings naturally and casually.
- When recommending meals, explain WHY they are safe and suitable for this resident.
- When a meal is unsafe, explain which specific allergen or restriction it violates.
- Format meal names in bold using **name**.
- Use bullet points for lists.
- If asked about a meal not in the database, say you can only recommend from the currently available meals.
- If asked a general nutrition or diet question, answer helpfully but tie it back to available meals.
- Keep responses concise — no more than 3-4 short paragraphs.

LANGUAGE: You MUST respond in ${language}. All your responses — greetings, recommendations, warnings, everything — must be in ${language}. Meal names can stay in English but all descriptions and conversation must be in ${language}.`;
}

/**
 * Try calling Gemini REST API with a specific model.
 * Returns the response text or throws on error.
 */
async function callGeminiModel(
  modelName: string,
  systemPrompt: string,
  history: GeminiMessage[],
  userMessage: string,
): Promise<string> {
  const url = `${BASE_URL}/${modelName}:generateContent?key=${GEMINI_CONFIG.apiKey}`;

  // Build contents array: system instruction as first user message,
  // then conversation history, then current message
  const contents: GeminiMessage[] = [];

  // Include conversation history
  for (const msg of history) {
    contents.push(msg);
  }

  // Add current user message
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const body = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.8,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const status = response.status;
    const message =
      errorData?.error?.message || `HTTP ${status}`;
    throw new Error(`[${status}] ${message}`);
  }

  const data = await response.json();

  // Extract text from response
  const candidate = data?.candidates?.[0];
  if (!candidate?.content?.parts?.[0]?.text) {
    throw new Error('No text in Gemini response');
  }

  return candidate.content.parts[0].text;
}

/**
 * Manages a Gemini chat session with model fallback and conversation history.
 */
export class GeminiChatService {
  private systemPrompt: string = '';
  private history: GeminiMessage[] = [];
  private currentModel: string = GEMINI_CONFIG.models[0];

  /**
   * Check if the Gemini API key is configured.
   */
  isConfigured(): boolean {
    return (
      GEMINI_CONFIG.apiKey !== 'YOUR_GEMINI_API_KEY_HERE' &&
      GEMINI_CONFIG.apiKey.length > 0
    );
  }

  /**
   * Initialize (or re-initialize) a chat session for the given resident.
   */
  initialize(residentId: string, language: string = 'English'): void {
    this.systemPrompt = buildSystemPrompt(residentId, language);
    this.history = [];
    this.currentModel = GEMINI_CONFIG.models[0];
  }

  /**
   * Send a message and get a response, with automatic model fallback.
   */
  async sendMessage(userMessage: string): Promise<string> {
    if (!this.systemPrompt) {
      throw new Error('Chat not initialized. Call initialize() first.');
    }

    let lastError: Error | null = null;

    // Try each model in order
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
        const is429 = error.message?.includes('[429]');
        const is404 = error.message?.includes('[404]');

        if (is429 || is404) {
          console.warn(
            `[GrannyGBT] ${modelName} unavailable (${is429 ? 'quota' : 'not found'}), trying next model...`,
          );
          continue; // Try next model
        }

        // For other errors (network, 500, etc.), don't retry
        throw error;
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
   * Reset the chat session for a (possibly different) resident.
   */
  reset(residentId: string, language: string = 'English'): void {
    this.initialize(residentId, language);
  }
}

// Singleton for the BrowseMealOptions chat modal
export const geminiChat = new GeminiChatService();

// Factory for creating independent sessions (e.g. the standalone screen)
export function createGeminiChat(): GeminiChatService {
  return new GeminiChatService();
}
