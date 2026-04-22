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

/**
 * Batch-translate meal names/descriptions that aren't in the static lookup table.
 * Returns a map of { name → { Español, Français, 中文 } }.
 * Tries each model in fallback order; returns empty object on total failure.
 */
export async function translateMealNamesWithGemini(
  names: string[],
): Promise<Record<string, { Español: string; Français: string; 中文: string }>> {
  if (names.length === 0) return {};

  const prompt = `Translate these English food/meal names into Spanish (Español), French (Français), and Chinese (中文).
Return ONLY valid JSON — no markdown, no explanation — exactly like this example:
{"Chicken Noodle Soup":{"Español":"Sopa de Fideos con Pollo","Français":"Soupe de Nouilles au Poulet","中文":"鸡肉面条汤"}}

Names to translate:
${names.join('\n')}`;

  for (const model of GEMINI_CONFIG.models) {
    try {
      const url = `${BASE_URL}/${model}:generateContent?key=${GEMINI_CONFIG.apiKey}`;
      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 800, temperature: 0.1 },
      };
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      // Strip markdown code fences if present
      const clean = raw.replace(/```json\n?|```\n?/g, '').trim();
      return JSON.parse(clean);
    } catch {
      continue;
    }
  }
  return {};
}

/**
 * Batch-translate meal descriptions (full sentences) into ES/FR/ZH.
 * Same shape as translateMealNamesWithGemini, but keyed by the original
 * English description string.
 */
export async function translateMealDescriptionsWithGemini(
  descriptions: string[],
): Promise<Record<string, { Español: string; Français: string; 中文: string }>> {
  if (descriptions.length === 0) return {};

  // Use numeric keys in the prompt to avoid JSON escaping issues with quotes
  // and punctuation inside descriptions.
  const numbered = descriptions.map((d, i) => `${i + 1}. ${d}`).join('\n');
  const prompt = `Translate these English meal description sentences into Spanish (Español), French (Français), and Chinese (中文).
Return ONLY valid JSON — no markdown, no explanation — keyed by the same number.
Example: {"1":{"Español":"...","Français":"...","中文":"..."}, "2":{...}}

Descriptions:
${numbered}`;

  for (const model of GEMINI_CONFIG.models) {
    try {
      const url = `${BASE_URL}/${model}:generateContent?key=${GEMINI_CONFIG.apiKey}`;
      const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.1 },
      };
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const clean = raw.replace(/```json\n?|```\n?/g, '').trim();
      const numbered = JSON.parse(clean) as Record<string, { Español: string; Français: string; 中文: string }>;
      // Re-key by original English description
      const result: Record<string, { Español: string; Français: string; 中文: string }> = {};
      for (const [idx, tr] of Object.entries(numbered)) {
        const i = Number(idx) - 1;
        const orig = descriptions[i];
        if (orig) result[orig] = tr;
      }
      return result;
    } catch {
      continue;
    }
  }
  return {};
}

// Factory for creating independent sessions (e.g. the standalone screen)
export function createGeminiChat(): GeminiChatService {
  return new GeminiChatService();
}

// ──────────────────────────────────────────────────────────────────
// AI Meal Recommendation (single-shot, non-chat)
// ──────────────────────────────────────────────────────────────────

/**
 * Shape we ask Gemini to pick from. Only the fields the model needs —
 * keep the prompt tight so the model stays focused.
 */
export type AICandidateMeal = {
  id: number | string;
  name: string;
  description?: string;
  ingredients?: string[];
  allergens?: string[];
  calories?: number | string;
  sodium?: number | string;
  protein?: number | string;
  tags?: string[];
  meal_period?: string;
  time_range?: string;
};

export type AIRecommendationResult = {
  meal_name: string;
  reason: string;
  dietary_restrictions: string[];
};

type AIResidentInfo = {
  name: string;
  foodAllergies?: string[];
  dietaryRestrictions?: string[];
  medicalConditions?: string[];
};

/**
 * Ask Gemini to pick ONE meal from an already-safety-filtered candidate list.
 * Returns null if Gemini is unreachable or the pick isn't in the candidate
 * list (hallucination guard). Callers should fall back to a sensible default
 * in that case.
 *
 * The safety filter MUST run before this — never trust the model to enforce
 * allergy rules alone.
 */
export async function getAIRecommendation(
  resident: AIResidentInfo,
  candidates: AICandidateMeal[],
  targetPeriod: string | null | undefined,
): Promise<AIRecommendationResult | null> {
  if (!candidates || candidates.length === 0) return null;

  // If only one candidate, skip the API call — nothing to pick from.
  if (candidates.length === 1) {
    const only = candidates[0];
    return {
      meal_name: only.name,
      reason: `Only safe option in the current ${targetPeriod || 'menu'} — we recommend the`,
      dietary_restrictions: [
        ...(resident.foodAllergies ?? []),
        ...(resident.dietaryRestrictions ?? []),
      ],
    };
  }

  const candidateBlock = candidates
    .map((m, i) => {
      const lines = [
        `${i + 1}. ${m.name} (id: ${m.id})`,
        m.description ? `   Description: ${m.description}` : null,
        m.ingredients && m.ingredients.length > 0
          ? `   Ingredients: ${m.ingredients.join(', ')}`
          : null,
        m.allergens && m.allergens.length > 0
          ? `   Allergens: ${m.allergens.join(', ')}`
          : null,
        `   Nutrition: ${m.calories ?? '?'} cal, ${m.sodium ?? '?'} sodium, ${m.protein ?? '?'} protein`,
        m.tags && m.tags.length > 0 ? `   Tags: ${m.tags.join(', ')}` : null,
        m.time_range ? `   Serving window: ${m.time_range}` : null,
      ].filter(Boolean);
      return lines.join('\n');
    })
    .join('\n\n');

  const allergyLines: string[] = [];
  if (resident.foodAllergies && resident.foodAllergies.length > 0) {
    allergyLines.push(`Food allergies: ${resident.foodAllergies.join(', ')}`);
  }
  if (resident.dietaryRestrictions && resident.dietaryRestrictions.length > 0) {
    allergyLines.push(`Dietary restrictions: ${resident.dietaryRestrictions.join(', ')}`);
  }
  if (resident.medicalConditions && resident.medicalConditions.length > 0) {
    allergyLines.push(`Medical conditions: ${resident.medicalConditions.join(', ')}`);
  }
  const profileBlock = allergyLines.length > 0
    ? allergyLines.join('\n')
    : 'No allergies or restrictions on file.';

  const systemPrompt = `You are GrannyGBT, a meal-planning assistant for a senior living facility.
You pick exactly ONE meal from a short candidate list that has ALREADY been safety-filtered for the resident.
Your job is to pick the most appealing and nutritionally balanced option for THIS meal period.

RULES:
- Pick exactly one meal from the candidate list. Never invent meals.
- The "meal_name" you return MUST match one of the candidate names verbatim.
- Keep "reason" to one short warm sentence (max 20 words) explaining why it's a good pick.
- Consider balance (not too high sodium, decent protein), flavor appeal, and the resident's profile.
- Do NOT mention the candidates you did NOT pick.
- Return ONLY valid JSON — no markdown, no commentary, no code fences.

Response format (strict):
{"meal_name": "<exact name>", "reason": "<one short sentence>"}`;

  const userMessage = `Resident: ${resident.name}
Meal period: ${targetPeriod || 'current'}
Profile:
${profileBlock}

Candidate meals (all already safe for this resident):
${candidateBlock}

Pick the best single meal and return the required JSON only.`;

  // Build a valid candidate-name set for hallucination guard (case-insensitive)
  const candidateNames = new Set(candidates.map((c) => c.name.toLowerCase()));

  for (const modelName of GEMINI_CONFIG.models) {
    try {
      const raw = await callGeminiModel(modelName, systemPrompt, [], userMessage);
      // Strip markdown fences if the model slipped any in
      const clean = raw.replace(/```json\n?|```\n?/g, '').trim();

      // Be lenient: grab the first {...} block if the model added prose
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);
      const pickedName: string = typeof parsed?.meal_name === 'string' ? parsed.meal_name : '';
      const reason: string = typeof parsed?.reason === 'string' ? parsed.reason : '';

      if (!pickedName) continue;

      // Hallucination guard — the pick must exist in the candidate list.
      if (!candidateNames.has(pickedName.toLowerCase())) {
        console.warn(`[GrannyGBT] Model picked "${pickedName}" not in candidates, retrying next model...`);
        continue;
      }

      return {
        meal_name: pickedName,
        reason: reason.trim().length > 0
          ? `${reason.trim().replace(/[.!]$/, '')} — we recommend the`
          : `A great fit for your profile — we recommend the`,
        dietary_restrictions: [
          ...(resident.foodAllergies ?? []),
          ...(resident.dietaryRestrictions ?? []),
        ],
      };
    } catch (err: any) {
      console.warn(`[GrannyGBT] getAIRecommendation ${modelName} failed: ${err.message}`);
      continue;
    }
  }

  // All models failed — return null so caller can fall back.
  return null;
}
