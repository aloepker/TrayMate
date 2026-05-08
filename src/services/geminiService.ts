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
import { isMealSafe, getUnsafeReason, SafetyResident, SafetyMeal } from './mealSafetyService';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// ─── Quota / rate-limit handling ─────────────────────────────────────────
// Each free-tier model has its own quota. When one returns 429 we mark it
// "cool" for this many ms and skip it on the next call — both the chat path
// and the recommendation card. After cooldown the model is tried again.
const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const rateLimitedUntil: Record<string, number> = {};

const isModelCool = (modelName: string): boolean => {
  const until = rateLimitedUntil[modelName];
  if (!until) return false;
  if (Date.now() >= until) {
    delete rateLimitedUntil[modelName];
    return false;
  }
  return true;
};

// ─── Recommendation result cache ─────────────────────────────────────────
// AI picks for a given resident + meal period don't change minute-to-minute.
// Re-using the cached pick for a few minutes drastically cuts API calls
// (and 429s) while feeling instant in the UI.
const REC_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
type CachedRec = { value: AIRecommendationResult; expires: number };
const recCache: Record<string, CachedRec> = {};

const recCacheKey = (residentName: string, period: string | null | undefined, candidateIds: (string | number)[]) =>
  // Including candidate IDs invalidates the cache the moment the menu changes.
  `${residentName}|${period ?? 'any'}|${candidateIds.slice().sort().join(',')}`;

type GeminiMessage = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

type ResidentOverride = {
  name: string;
  dietaryRestrictions?: string[];
  foodAllergies?: string[];
  medicalConditions?: string[];
  /**
   * Server-computed "usual order" — meal IDs the resident has ordered
   * most often, fetched from GET /mealOrders/default/{id}. Empty when
   * there's no order history.
   */
  favoriteMealIds?: number[];
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
  /**
   * Server-fetched usual-favourite meal IDs (from /mealOrders/default/{id}).
   * Passed separately so it works for both local and API-sourced residents
   * — the local-resident branch builds its own residentContext but still
   * benefits from personalisation.
   */
  favoriteMealIds?: number[],
): Promise<string> {
  const resident = ResidentService.getResidentById(residentId);
  const allMeals = await MealService.getAllMeals();

  // Build a SafetyResident for the safety service. This drives the hard
  // filter that hides restricted meals from the LLM entirely so it can
  // never recommend something unsafe.
  let safetyResident: SafetyResident | null = null;
  if (resident) {
    safetyResident = {
      foodAllergies: resident.dietaryRestrictions
        .filter((r) => r.type === 'allergy')
        .map((r) => r.name),
      dietaryRestrictions: resident.dietaryRestrictions
        .filter((r) => r.type !== 'allergy')
        .map((r) => r.name),
      medicalConditions: [],
    };
  } else if (residentOverride) {
    safetyResident = {
      foodAllergies: residentOverride.foodAllergies ?? [],
      dietaryRestrictions: residentOverride.dietaryRestrictions ?? [],
      medicalConditions: residentOverride.medicalConditions ?? [],
    };
  }

  // Map each meal to the SafetyMeal shape so the centralised checker can
  // judge it against allergens, dietary rules, and medical conditions.
  const toSafetyMeal = (m: typeof allMeals[number]): SafetyMeal => ({
    id: m.id,
    name: m.name,
    description: m.description,
    tags: m.tags,
    allergenInfo: m.allergenInfo,
    ingredients: m.ingredients,
    sodium: m.nutrition?.sodium,
    meal_period: m.mealPeriod,
  });

  // Split into safe vs restricted using the same source of truth as the
  // browse screen. Restricted meals are excluded from the prompt so the LLM
  // physically cannot recommend them — no reliance on prompt obedience.
  const safeMeals = safetyResident
    ? allMeals.filter((m) => isMealSafe(toSafetyMeal(m), safetyResident))
    : allMeals;
  const restrictedMeals = safetyResident
    ? allMeals.filter((m) => !isMealSafe(toSafetyMeal(m), safetyResident))
    : [];

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

  // Helper: parse "7am - 10am" / "11:00 am – 2:00 pm" into start/end minutes
  // so we can tell Granny BT which meals are available *right now*. Returns
  // null if the format is unrecognised (older fallback meals etc.) — those
  // get treated as "always available" and listed without a time tag.
  const parseTimeRange = (range: string | undefined): { start: number; end: number } | null => {
    if (!range) return null;
    const m = range.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (!m) return null;
    const to24 = (h: string, mm: string | undefined, ap: string) => {
      let hh = parseInt(h, 10) % 12;
      if (ap.toLowerCase() === 'pm') hh += 12;
      return hh * 60 + (mm ? parseInt(mm, 10) : 0);
    };
    return { start: to24(m[1], m[2], m[3]), end: to24(m[4], m[5], m[6]) };
  };

  // Group meals into "available now" vs "available later" using the
  // wall clock. Granny BT can then phrase recommendations correctly:
  // "you can order this for breakfast tomorrow" vs "this is being
  // served right now".
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const formatMealLine = (m: typeof safeMeals[number], availability: string) =>
    `[ID:${m.id}] ${m.name} | ${m.mealPeriod} (${m.timeRange}) — ${availability}
  Ingredients: ${m.ingredients.join(', ')}
  Allergens: ${m.allergenInfo.length > 0 ? m.allergenInfo.join(', ') : 'None'}
  Nutrition: ${m.nutrition.calories} cal, ${m.nutrition.sodium} sodium, ${m.nutrition.protein} protein
  Tags: ${m.tags.join(', ')}
  Description: ${m.description}`;

  const availableNow: string[] = [];
  const availableLater: string[] = [];
  for (const m of safeMeals) {
    const tr = parseTimeRange(m.timeRange);
    if (!tr) {
      // Unknown time range — assume always orderable
      availableNow.push(formatMealLine(m, 'available'));
      continue;
    }
    if (nowMins >= tr.start && nowMins <= tr.end) {
      availableNow.push(formatMealLine(m, 'AVAILABLE NOW (being served)'));
    } else {
      const minsUntil = tr.start > nowMins ? tr.start - nowMins : (24 * 60 - nowMins) + tr.start;
      const hoursUntil = Math.floor(minsUntil / 60);
      const minsRem = minsUntil % 60;
      const wait = hoursUntil > 0 ? `${hoursUntil}h ${minsRem}m` : `${minsRem}m`;
      availableLater.push(formatMealLine(m, `available in ${wait} (pre-order ok)`));
    }
  }

  const mealsContext = [
    availableNow.length > 0 ? `── AVAILABLE NOW (being served right now) ──\n${availableNow.join('\n\n')}` : '',
    availableLater.length > 0 ? `\n\n── AVAILABLE LATER (pre-order for an upcoming meal period) ──\n${availableLater.join('\n\n')}` : '',
  ].filter(Boolean).join('');

  // Build an explicit "do not recommend" list so if the resident asks about
  // a restricted meal by name, the LLM knows it's been excluded and can
  // explain why instead of claiming ignorance.
  const restrictedContext = restrictedMeals.length > 0
    ? `\n\nEXCLUDED MEALS (DO NOT RECOMMEND — flagged unsafe for this resident):\n${restrictedMeals
        .map((m) => {
          const reason = safetyResident ? getUnsafeReason(toSafetyMeal(m), safetyResident) : null;
          return `- ${m.name}: ${reason ?? 'restricted'}`;
        })
        .join('\n')}`
    : '';

  // ── Time-of-day awareness ─────────────────────────────────────
  // The tablet's clock drives recommendations. If the resident asks
  // "recommend a meal" without specifying a period, Granny BT should
  // default to whatever's being served right now (or coming up next).
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const SCHEDULE = [
    { label: 'Breakfast', start: 7 * 60,  end: 10 * 60 },
    { label: 'Lunch',     start: 11 * 60, end: 14 * 60 },
    { label: 'Dinner',    start: 16 * 60, end: 19 * 60 },
  ];
  const activePeriod = SCHEDULE.find((s) => mins >= s.start && mins <= s.end);
  const upcomingPeriod = activePeriod ? null : SCHEDULE.find((s) => s.start > mins) ?? SCHEDULE[0];
  const formatTime = (totalMins: number) => {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
  };
  const clockNow = formatTime(mins);
  const timeContext = activePeriod
    ? `CURRENT TIME ON TABLET: ${clockNow}
ACTIVE MEAL PERIOD: ${activePeriod.label} (being served right now, ${formatTime(activePeriod.start)}–${formatTime(activePeriod.end)})
DEFAULT RECOMMENDATION PERIOD: ${activePeriod.label} — when the user asks "recommend a meal" without specifying a period, recommend a ${activePeriod.label} meal.`
    : upcomingPeriod
      ? `CURRENT TIME ON TABLET: ${clockNow}
ACTIVE MEAL PERIOD: None (between meals)
NEXT MEAL PERIOD: ${upcomingPeriod.label} (starts at ${formatTime(upcomingPeriod.start)})
DEFAULT RECOMMENDATION PERIOD: ${upcomingPeriod.label} — when the user asks "recommend a meal" without specifying a period, recommend a ${upcomingPeriod.label} meal (the next one coming up).`
      : `CURRENT TIME ON TABLET: ${clockNow}`;

  // ── Personalisation: resident's usual order ─────────────────────────
  // Server returns meal IDs they order most. We resolve those IDs
  // against the SAFE meal list (so we never surface a favourite that's
  // also restricted) and feed the resulting names back as "usual picks"
  // Granny BT can lean on for personal recommendations.
  // Prefer the explicit favoriteMealIds param (works for any resident path),
  // fall back to whatever's on the override.
  const favoriteIds = favoriteMealIds && favoriteMealIds.length > 0
    ? favoriteMealIds
    : (residentOverride?.favoriteMealIds ?? []);
  const favoriteMealNames = favoriteIds
    .map((id) => safeMeals.find((m) => Number(m.id) === Number(id)))
    .filter((m): m is typeof safeMeals[number] => Boolean(m))
    .map((m) => `${m.name} (${m.mealPeriod})`);
  const favoritesContext = favoriteMealNames.length > 0
    ? `\n\nRESIDENT'S USUAL ORDERS (from their order history — prefer these when recommending if they fit the period):
${favoriteMealNames.map((n) => `- ${n}`).join('\n')}`
    : '';

  return `You are Granny BT, a friendly and knowledgeable meal planning assistant for a senior living facility called TrayMate.
Your tone is warm, helpful, and conversational — like a smart friend who knows a lot about food and nutrition.
DO NOT use grandma-style pet names like "dear", "sweetie", "honey", "sugar", "sweetheart", or "darling". Just talk naturally and friendly.
Use emojis sparingly — one or two per response max (like 🍽 or ✅), not every sentence.

Your primary role is to help staff and residents select safe, nutritious, and enjoyable meals.

CRITICAL SAFETY RULES:
1. The AVAILABLE MEALS list below has ALREADY been filtered to remove anything unsafe for this resident — every meal in it is safe to recommend.
2. NEVER recommend any meal in the EXCLUDED MEALS list. If the resident asks about one, briefly explain why it's not suitable and suggest a safe alternative.
3. You can ONLY recommend meals from the AVAILABLE MEALS list. Do not invent meals or recommend excluded ones.
4. Consider the resident's nutrition goals when making recommendations.

TIME-AWARE RECOMMENDATIONS:
- When the resident asks for a meal recommendation WITHOUT specifying a meal period (e.g. "recommend a meal", "what should I eat", "I'm hungry"), pick from the DEFAULT RECOMMENDATION PERIOD below — match the current tablet clock.
- If the resident DOES specify a period ("for lunch", "for dinner"), recommend from that period instead.
- Drinks and Sides are not full meals — only recommend them as add-ons or when the resident asks for one specifically.
- Each meal in the AVAILABLE MEALS list is tagged "AVAILABLE NOW" (being served right now), "available in Xh Ym" (pre-orderable for an upcoming period), or "available" (no time restriction). Mention this when it's relevant, e.g. "this is being served right now" or "you can pre-order it for breakfast tomorrow".
- If a resident asks about ordering a meal that's in the LATER list, confirm it's pre-order and mention when it'll be ready.

PERSONALISATION:
- If a USUAL ORDERS list is provided below, prefer those meals when recommending — but only if they match the requested period and are still safe. The list is already filtered to safe meals only.
- A short personal touch is welcome ("you usually have X — want that today?") but don't overdo it; one mention max.

${timeContext}

${residentContext}

AVAILABLE MEALS:
${mealsContext}${restrictedContext}${favoritesContext}

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
  console.log(`[Granny BT] Calling ${modelName}, key starts with: ${GEMINI_CONFIG.apiKey.substring(0, 10)}...`);

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
    console.error(`[Granny BT] fetch() threw: ${fetchErr.message}`);
    throw new Error(`Network error: ${fetchErr.message}`);
  }

  console.log(`[Granny BT] ${modelName} response status: ${resp.status}`);

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
    // 429 (free-tier quota exhausted) is expected and recoverable — we
    // cool the model down for 10 minutes and the caller falls back to
    // the next model or the rule-based recommender. Don't shout at the
    // dev console for an expected condition; a quiet warn is enough.
    if (status === 429) {
      rateLimitedUntil[modelName] = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      console.warn(`[Granny BT] ${modelName} hit free-tier quota, cooling down ${RATE_LIMIT_COOLDOWN_MS / 60000} min.`);
    } else if (status === 503) {
      // Transient overload — cool down for 1 minute and fall back silently
      rateLimitedUntil[modelName] = Date.now() + 60_000;
      console.warn(`[Granny BT] ${modelName} overloaded (503), cooling down 1 min.`);
    } else {
      console.error(`[Granny BT] ${modelName} error: [${status}] ${message}`);
    }
    const err = new Error(`[${status}] ${message}`);
    (err as any).status = status;
    throw err;
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
    favoriteMealIds?: number[],
  ): Promise<void> {
    // Stash init args so sendMessage can lazily retry init if a previous
    // attempt didn't populate systemPrompt (e.g. /admin/residents 401'd).
    this.lastInitArgs = { residentId, language, residentOverride, favoriteMealIds };
    // Resolve-always wrapper: if buildSystemPrompt throws, we DON'T let
    // the promise reject. Callers awaiting this would otherwise re-throw
    // and flip the chat into offline mode for one round-trip even though
    // the next sendMessage could succeed with a minimal fallback prompt.
    this.initPromise = (async () => {
      try {
        this.systemPrompt = await buildSystemPrompt(residentId, language, residentOverride, favoriteMealIds);
        this.history = [];
        this.currentModel = GEMINI_CONFIG.models[0];
        console.log('[Granny BT] Chat initialized, system prompt length:', this.systemPrompt.length);
      } catch (err: any) {
        console.warn('[Granny BT] init had issues, will retry on first send:', err?.message ?? err);
        // Leave systemPrompt empty so sendMessage uses the minimal
        // fallback prompt below — but resolve so awaiters don't re-throw.
      }
    })();
    return this.initPromise;
  }

  // Stored so sendMessage can re-init if the first try didn't yield a prompt.
  private lastInitArgs: {
    residentId: string;
    language: string;
    residentOverride?: ResidentOverride;
    favoriteMealIds?: number[];
  } | null = null;

  /**
   * Send a message and get a response, with automatic model fallback.
   * Waits for initialization to complete if still in progress.
   */
  async sendMessage(userMessage: string): Promise<string> {
    // Wait for initialization to complete if it's in progress
    if (this.initPromise) {
      await this.initPromise;
    }
    // If init didn't populate the system prompt (network blip on resident
    // lookup, /menu 401, etc.), retry it once silently before giving up.
    if (!this.systemPrompt && this.lastInitArgs) {
      const args = this.lastInitArgs;
      try {
        this.systemPrompt = await buildSystemPrompt(args.residentId, args.language, args.residentOverride, args.favoriteMealIds);
      } catch (err: any) {
        console.warn('[Granny BT] retry init failed, using minimal prompt:', err?.message ?? err);
      }
    }
    // Final fallback: a tiny prompt that at least lets the model speak.
    // Better than throwing — keeps the user out of the offline flicker
    // cycle when buildSystemPrompt has a transient backend failure.
    if (!this.systemPrompt) {
      this.systemPrompt = `You are Granny BT, a friendly meal planning assistant for residents of a senior living facility. Be warm and concise (2-3 sentences max). If you don't have meal data, say so plainly and suggest the user check the menu screen.`;
    }

    let lastError: Error | null = null;

    // Try each model in order, skipping any that are still in 429 cooldown.
    const models = GEMINI_CONFIG.models.filter((m) => !isModelCool(m));
    for (const modelName of (models.length > 0 ? models : GEMINI_CONFIG.models)) {
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
        console.log(`[Granny BT] Response from ${modelName}`);
        return responseText;
      } catch (error: any) {
        lastError = error;
        console.warn(
          `[Granny BT] ${modelName} failed: ${error.message}, trying next model...`,
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
      // Try each model but do not mutate conversation history.
      // Skip models in 429 cooldown — but if every model is cool, fall
      // through to the original list so we still attempt something.
      const models = GEMINI_CONFIG.models.filter((m) => !isModelCool(m));
      for (const modelName of (models.length > 0 ? models : GEMINI_CONFIG.models)) {
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
  reset(
    residentId: string,
    language: string = 'English',
    residentOverride?: ResidentOverride,
    favoriteMealIds?: number[],
  ): void {
    this.initialize(residentId, language, residentOverride, favoriteMealIds);
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

  // Same "None"/empty filter used below — defined early so the single-
  // candidate shortcut path doesn't emit "None" in the dietary chips.
  const earlyClean = (arr?: string[]) =>
    (arr ?? [])
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0 && !/^(none|n\/?a|null)$/i.test(s));

  // If only one candidate, skip the API call — nothing to pick from.
  if (candidates.length === 1) {
    const only = candidates[0];
    return {
      meal_name: only.name,
      reason: `Only safe option in the current ${targetPeriod || 'menu'} — we recommend the`,
      dietary_restrictions: [
        ...earlyClean(resident.foodAllergies),
        ...earlyClean(resident.dietaryRestrictions),
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

  const allergies        = earlyClean(resident.foodAllergies);
  const restrictions     = earlyClean(resident.dietaryRestrictions);
  const medicalConditions = earlyClean(resident.medicalConditions);
  const hasAnyRestriction = allergies.length + restrictions.length + medicalConditions.length > 0;

  const allergyLines: string[] = [];
  if (allergies.length > 0)         allergyLines.push(`Food allergies: ${allergies.join(', ')}`);
  if (restrictions.length > 0)      allergyLines.push(`Dietary restrictions: ${restrictions.join(', ')}`);
  if (medicalConditions.length > 0) allergyLines.push(`Medical conditions: ${medicalConditions.join(', ')}`);

  const profileBlock = hasAnyRestriction
    ? allergyLines.join('\n')
    : 'No allergies or restrictions on file.';

  // Anti-hallucination phrasing rule depends on whether the resident has
  // any restrictions at all. If none, the model must NOT say "free of …",
  // "no …", "without …" — there's nothing to be free of.
  const phrasingRule = hasAnyRestriction
    ? `- If you mention "free of X" or "no X", X MUST be one of the resident's actual restrictions listed above. Never use "None" / "N/A" as a value.`
    : `- The resident has NO allergies or restrictions on file. Do NOT use phrases like "free of …", "no …", or "without …" in your reason — there is nothing to be free of. Focus only on flavor, comfort, and balance.`;

  const systemPrompt = `You are Granny BT, a meal-planning assistant for a senior living facility.
You pick exactly ONE meal from a short candidate list that has ALREADY been safety-filtered for the resident.
Your job is to pick the most appealing and nutritionally balanced option for THIS meal period.

RULES:
- Pick exactly one meal from the candidate list. Never invent meals.
- The "meal_name" you return MUST match one of the candidate names verbatim.
- Keep "reason" to one short warm sentence (max 20 words) explaining why it's a good pick.
- Reference ONLY facts present in the candidate's listed ingredients, allergens, tags, and nutrition. Never invent properties.
${phrasingRule}
- Do NOT mention the candidates you did NOT pick.
- Return ONLY valid JSON — no markdown, no commentary, no code fences.

Response format (strict):
{"meal_name": "<exact name>", "reason": "<one short sentence>"}`;

  const userMessage = `Resident: ${resident.name}
Meal period: ${targetPeriod || 'current'}
Profile:
${profileBlock}

Candidate meals (all already safety-filtered as safe for this resident):
${candidateBlock}

Pick the best single meal and return the required JSON only.`;

  // ── Cache lookup ────────────────────────────────────────────────────
  const cacheKey = recCacheKey(resident.name, targetPeriod, candidates.map((c) => c.id));
  const cached = recCache[cacheKey];
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  // Build a valid candidate-name set for hallucination guard (case-insensitive)
  const candidateNames = new Set(candidates.map((c) => c.name.toLowerCase()));

  // Skip any model currently in 429 cooldown so we don't burn fetches
  // on a model we know will reject us.
  const modelsToTry = GEMINI_CONFIG.models.filter((m) => !isModelCool(m));
  if (modelsToTry.length === 0) {
    // Every model is cooling down — skip the loop entirely and let the
    // caller fall back to the rule-based recommender.
    console.warn('[Granny BT] All Gemini models in cooldown, skipping AI pick.');
    return null;
  }

  for (const modelName of modelsToTry) {
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
        console.warn(`[Granny BT] Model picked "${pickedName}" not in candidates, retrying next model...`);
        continue;
      }

      // Final scrub: strip any "free of None" / "without None" / "no None"
      // phrases the model slipped through despite the prompt rule. Cheap
      // safety net so a hallucinated "None" never reaches the UI.
      const scrubReason = (s: string): string => {
        let out = s;
        // "free of None", "free of N/A", "free of nothing"
        out = out.replace(/\b(?:free of|without|no|free from|absent of)\s+(?:none|n\/?a|nothing|null)[,.\s]?/gi, '');
        // ", and" / ", but" cleanup if scrubbing left a dangling comma
        out = out.replace(/,\s*(?:and|but|with|plus)\s*,/gi, ',');
        out = out.replace(/^\s*[,.;:!?]+\s*/, '');
        out = out.replace(/\s{2,}/g, ' ').trim();
        return out;
      };

      const cleanedReason = scrubReason(reason);

      const result: AIRecommendationResult = {
        meal_name: pickedName,
        reason: cleanedReason.length > 0
          ? `${cleanedReason.replace(/[.!]$/, '')} — we recommend the`
          : `A great fit for your profile — we recommend the`,
        dietary_restrictions: [
          ...allergies,
          ...restrictions,
        ],
      };

      // Cache so navigating around / re-rendering the card doesn't
      // re-hit the Gemini API for the same candidates and burn quota.
      recCache[cacheKey] = { value: result, expires: Date.now() + REC_CACHE_TTL_MS };
      return result;
    } catch (err: any) {
      // 429s already logged at the fetch layer with a softer "warn".
      // Suppress the duplicate noise here and just continue to the
      // next model.
      if (err?.status !== 429) {
        console.warn(`[Granny BT] getAIRecommendation ${modelName} failed: ${err.message}`);
      }
      continue;
    }
  }

  // All models failed — return null so caller can fall back.
  return null;
}
