/**
 * mealSafetyService.ts
 * ------------------------------------------------------------------
 * Single source of truth for deciding whether a meal is safe for a
 * resident given their allergies, dietary restrictions, and medical
 * conditions. EVERY meal-choosing surface (cart, browse, GrannyGBT,
 * kitchen substitute picker) should funnel through these functions so
 * nothing leaks past the safety net.
 *
 * Exports
 *   getUnsafeReason(meal, resident)  → human reason or null
 *   isMealSafe(meal, resident)       → boolean
 *   filterSafeMeals(meals, resident) → only the safe ones
 *   getSafeAlternatives(...)         → same-period, safe substitutes
 *   collectUnsafeMealNames(...)      → list for GrannyGBT hard prompt
 */

// ── Types ─────────────────────────────────────────────────────────

/**
 * Minimal meal shape the safety checker needs. Works with BOTH the cart
 * meal (sparse) and the local/backend meal shape (rich). Any field that
 * isn't supplied is simply skipped — the check still runs against
 * whatever text it has.
 */
export type SafetyMeal = {
  id: number | string;
  name?: string;
  description?: string;
  tags?: string[];
  allergens?: string[];        // preferred explicit allergen list
  allergenInfo?: string[];     // alias used by localDataService
  ingredients?: string[];      // deep ingredient list (optional)
  kcal?: number;
  sodium_mg?: number;
  sodium?: string | number;    // fallback for "400mg" string shape
  meal_period?: string;
  mealPeriod?: string;
};

/**
 * Resident profile shape (matches the backend Resident returned by
 * api.ts — string arrays). If your caller has the local-service
 * Resident with DietaryRestriction[] objects, flatten to name strings
 * before calling in.
 */
export type SafetyResident = {
  foodAllergies?: string[];
  dietaryRestrictions?: string[];
  medicalConditions?: string[];
};

// ── Allergy keyword groups ───────────────────────────────────────
// When a resident lists an allergy like "dairy", we also scan the
// meal's name/description/tags for any of these related keywords —
// so "Broccoli-Cheddar Quiche" still trips the dairy allergy even if
// the meal payload doesn't carry an explicit `allergenInfo: ["Dairy"]`.
const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  dairy:     ["milk", "cheese", "butter", "cream", "yogurt", "dairy", "cheddar", "parmesan", "mozzarella", "feta", "ricotta"],
  eggs:      ["egg", "omelet", "omelette", "quiche", "frittata"],
  egg:       ["egg", "omelet", "omelette", "quiche", "frittata"],
  gluten:    ["flour", "bread", "pasta", "wheat", "rye", "barley", "crouton", "pizza", "noodle", "sandwich", "toast", "bun"],
  wheat:     ["flour", "bread", "pasta", "wheat", "noodle", "toast", "bun"],
  shellfish: ["shrimp", "lobster", "crab", "crayfish", "prawn", "shellfish"],
  fish:      ["salmon", "tuna", "cod", "tilapia", "fish", "anchovy", "sardine", "halibut", "trout"],
  nuts:      ["peanut", "almond", "cashew", "walnut", "pecan", "hazelnut", "pistachio", "nut"],
  "tree nuts": ["almond", "cashew", "walnut", "pecan", "hazelnut", "pistachio"],
  peanuts:   ["peanut"],
  peanut:    ["peanut"],
  soy:       ["soy", "tofu", "edamame", "tempeh", "miso"],
  sesame:    ["sesame", "tahini"],
};

// ── Dietary restriction keyword groups ───────────────────────────
// For each restriction, meals containing these words are blocked.
const DIET_KEYWORDS: Record<string, string[]> = {
  vegetarian: ["beef", "pork", "chicken", "turkey", "lamb", "bacon", "ham", "shrimp", "fish", "salmon", "tuna", "sausage", "steak", "meatball"],
  vegan:      ["beef", "pork", "chicken", "turkey", "lamb", "bacon", "ham", "shrimp", "fish", "salmon", "tuna", "sausage", "steak", "meatball",
               "milk", "cheese", "butter", "cream", "yogurt", "egg", "honey"],
  halal:      ["pork", "bacon", "ham", "sausage", "alcohol", "wine"],
  kosher:     ["pork", "bacon", "ham", "shrimp", "lobster", "crab"],
  pescatarian: ["beef", "pork", "chicken", "turkey", "lamb", "bacon", "ham", "sausage", "steak"],
};

// Medical-condition-driven rules. Most are keyword-based like diets, but
// a few (low sodium, diabetic) need numeric thresholds.
const CONDITION_SODIUM_LIMIT_MG = 600;

// ── Helpers ──────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().trim();
}

function titleCase(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Lowercased single-string view of everything we can inspect on a meal. */
function mealHaystack(meal: SafetyMeal): string {
  return [
    meal.name ?? "",
    meal.description ?? "",
    ...(meal.tags ?? []),
    ...(meal.allergens ?? []),
    ...(meal.allergenInfo ?? []),
    ...(meal.ingredients ?? []),
  ].join(" ").toLowerCase();
}

/** Pull a numeric sodium value out of whichever field the meal carries. */
function extractSodium(meal: SafetyMeal): number | null {
  if (typeof meal.sodium_mg === "number") return meal.sodium_mg;
  if (typeof meal.sodium === "number") return meal.sodium;
  if (typeof meal.sodium === "string") {
    const n = parseInt(meal.sodium.replace(/\D/g, ""), 10);
    return isNaN(n) ? null : n;
  }
  return null;
}

// ── Core API ─────────────────────────────────────────────────────

/**
 * Returns null if the meal is safe for this resident, otherwise a
 * short human sentence ("Contains Dairy — resident is allergic").
 * First unsafe match wins so UI copy stays concise.
 */
export function getUnsafeReason(meal: SafetyMeal, resident: SafetyResident | null | undefined): string | null {
  if (!resident) return null;

  const allergies    = (resident.foodAllergies ?? []).map(norm).filter(Boolean);
  const restrictions = (resident.dietaryRestrictions ?? []).map(norm).filter(Boolean);
  const conditions   = (resident.medicalConditions ?? []).map(norm).filter(Boolean);
  const haystack     = mealHaystack(meal);

  // ── 1. Allergies (highest priority) ──
  const explicit = [...(meal.allergens ?? []), ...(meal.allergenInfo ?? [])].map(norm);
  for (const allergy of allergies) {
    // Explicit allergen match on the meal's own allergen list.
    if (explicit.some((a) => a.includes(allergy) || allergy.includes(a))) {
      return `Contains ${titleCase(allergy)} — resident is allergic`;
    }
    // Keyword scan of name/description/tags/ingredients.
    const keywords = ALLERGEN_KEYWORDS[allergy] ?? [allergy];
    if (keywords.some((kw) => haystack.includes(kw))) {
      return `Contains ${titleCase(allergy)} — resident is allergic`;
    }
  }

  // ── 2. Dietary restrictions (vegetarian, vegan, halal, kosher…) ──
  for (const restriction of restrictions) {
    // Low-sodium diet → numeric threshold.
    if (restriction.includes("low sodium") || restriction.includes("low-sodium")) {
      const sodium = extractSodium(meal);
      if (sodium != null && sodium > CONDITION_SODIUM_LIMIT_MG) {
        return `High sodium (${sodium}mg) — resident on low-sodium diet`;
      }
      continue;
    }
    const keywords = DIET_KEYWORDS[restriction] ?? [];
    if (keywords.length > 0 && keywords.some((kw) => haystack.includes(kw))) {
      return `Not ${titleCase(restriction)} — resident follows ${titleCase(restriction)} diet`;
    }
  }

  // ── 3. Medical conditions (high blood pressure, diabetes, etc.) ──
  for (const condition of conditions) {
    if (condition.includes("hypertension") || condition.includes("high blood pressure")) {
      const sodium = extractSodium(meal);
      if (sodium != null && sodium > CONDITION_SODIUM_LIMIT_MG) {
        return `High sodium (${sodium}mg) — resident has ${titleCase(condition)}`;
      }
    }
  }

  return null;
}

export function isMealSafe(meal: SafetyMeal, resident: SafetyResident | null | undefined): boolean {
  return getUnsafeReason(meal, resident) === null;
}

export function filterSafeMeals<T extends SafetyMeal>(
  meals: ReadonlyArray<T>,
  resident: SafetyResident | null | undefined,
): T[] {
  if (!resident) return [...meals];
  return meals.filter((m) => isMealSafe(m, resident));
}

/**
 * Return up to `limit` safe alternatives drawn from the same meal period
 * as the rejected meal, sorted by calorie closeness so the substitute
 * feels similar to what the resident originally picked.
 */
export function getSafeAlternatives<T extends SafetyMeal>(
  unsafeMeal: T,
  allMeals: ReadonlyArray<T>,
  resident: SafetyResident | null | undefined,
  limit: number = 3,
): T[] {
  const targetPeriod = unsafeMeal.meal_period ?? unsafeMeal.mealPeriod;
  const targetKcal = unsafeMeal.kcal ?? 0;

  const candidates = allMeals
    .filter((m) => String(m.id) !== String(unsafeMeal.id))
    .filter((m) => {
      const p = m.meal_period ?? m.mealPeriod;
      return !targetPeriod || !p || p === targetPeriod;
    })
    .filter((m) => isMealSafe(m, resident));

  candidates.sort((a, b) => {
    const da = Math.abs((a.kcal ?? 0) - targetKcal);
    const db = Math.abs((b.kcal ?? 0) - targetKcal);
    return da - db;
  });

  return candidates.slice(0, limit);
}

/**
 * Helper for GrannyGBT / AI prompts: returns the names of all meals in
 * `allMeals` that are UNSAFE for this resident, so they can be injected
 * as a hard "never recommend" list in the system prompt.
 */
export function collectUnsafeMealNames(
  allMeals: ReadonlyArray<SafetyMeal>,
  resident: SafetyResident | null | undefined,
): string[] {
  if (!resident) return [];
  return allMeals
    .filter((m) => !isMealSafe(m, resident))
    .map((m) => m.name ?? "")
    .filter(Boolean);
}
