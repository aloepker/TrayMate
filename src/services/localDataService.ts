/**
 * TrayMate Local Data Service
 * 
 * This file contains all meal data from the meals_db.csv database.
 * Use this while waiting for the backend API to be set up.
 * 
 * Usage:
 *   import { MealService, ResidentService, OrderService } from './services/localDataService';
 *   
 *   const meals = MealService.getAllMeals();
 *   const breakfastMeals = MealService.getMealsByPeriod('Breakfast');
 */

// ==================== TYPES ====================
import { Platform } from "react-native";
import { cachePersistedMealTranslations } from "./mealLocalization";

const API_BASE_URL = "https://traymate-auth.onrender.com";
// For local testing use: 
// const API_BASE_URL = Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://127.0.0.1:8000";

function splitCommaList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeMealPeriod(value: string | null | undefined): Meal["mealPeriod"] {
  const v = (value ?? "").trim().toLowerCase();

  if (v.includes("drink") || v.includes("beverage")) return "Drinks";
  if (v.includes("side")) return "Sides";
  if (v.includes("breakfast")) return "Breakfast";
  if (v.includes("lunch")) return "Lunch";
  if (v.includes("dinner")) return "Dinner";
  return "All Day";
}

/**
 * Authoritative name → period map. Used as a safety net when the
 * backend row has a null/empty/garbage `mealperiod` and would
 * otherwise default to "All Day", letting drinks/sides leak into
 * the main tab. Mirrors the backend seeder's NAME_TO_PERIOD map.
 */
const KNOWN_NAME_TO_PERIOD: Record<string, Meal["mealPeriod"]> = {
  "Banana Pancakes":                   "Breakfast",
  "Broccoli-Cheddar Quiche":           "Breakfast",
  "Caesar Salad with chicken":         "Lunch",
  "Citrus Butter Salmon":              "Dinner",
  "Chicken Brushetta":                 "Dinner",
  "Breakfast Banana Split":            "Breakfast",
  "Herbed Baked Chicken":              "Lunch",
  "Pumpkin Soup":                      "Sides",
  "Hot Coffee":                        "Drinks",
  "Orange Juice":                      "Drinks",
  "Soft Drink (Soda)":                 "Drinks",
  "Herbal Tea":                        "Drinks",
  "Spiced Pear Tea":                   "Drinks",
  "Warm Apple Cider":                  "Drinks",
  "Vanilla Cake Slice":                "Sides",
  "Side Garden Salad":                 "Sides",
  "Oatmeal Cookie":                    "Sides",
  "Strawberry Belgian Waffle":         "Breakfast",
  "All-American Hamburger":            "Lunch",
  "Traditional BLT Sandwich":          "Lunch",
  "Fish and Chips":                    "Lunch",
  "Chicken Soft Tacos":                "Lunch",
  "Chef's cut steak":                  "Dinner",
  "Oatmeal Bowl":                      "Breakfast",
  "Garden Vegetable Medly":            "Lunch",
  "Baked Mac & Cheese":                "Lunch",
  "French Toast":                      "Breakfast",
  "Soft Scrambled Eggs":               "Breakfast",
  "Beef Stew":                         "Dinner",
  "Pasta with Meat Sauce":             "Dinner",
  "Chicken and Rice Bowl":             "Lunch",
  "Water":                             "Drinks",
  "Whole Milk":                        "Drinks",
  "Sparkling Water":                   "Drinks",
  "Cranberry Juice":                   "Drinks",
  "Apple Juice":                       "Drinks",
  "Hot Cocoa":                         "Drinks",
  "Chicken Noodle Soup":               "Sides",
};

/**
 * Resolve a meal's period: prefer the explicit backend value, but if
 * normalisation would land on "All Day" AND the meal name is one we
 * know better, use the known answer. Safer than overwriting backend
 * data — anything genuinely intended as All Day still passes through.
 */
function resolvePeriodWithFallback(
  apiMealPeriod: string | null | undefined,
  name: string | null | undefined,
): Meal["mealPeriod"] {
  const normalized = normalizeMealPeriod(apiMealPeriod);
  if (normalized !== "All Day") return normalized;
  const known = name ? KNOWN_NAME_TO_PERIOD[name.trim()] : undefined;
  return known ?? "All Day";
}

function parseNutrition(nutritionText: string | null | undefined): Nutrition {
  const text = typeof nutritionText === "string" ? nutritionText : "";

  const extract = (label: string): string => {
    const regex = new RegExp(`${label}\\s*:?\\s*([^,]+)`, "i");
    const match = text.match(regex);
    return match?.[1]?.trim() ?? "";
  };
  const caloriesRaw = extract("Calories");
  const totalFat = extract("Total Fat");
  const saturatedFat = extract("Saturated Fat");
  const transFat = extract("Trans Fat");
  const cholesterol = extract("Cholesterol");
  const carbohydrate = extract("Carbohydrate");
  const fiber = extract("Fiber");
  const sugar = extract("Sugar");
  const sodium = extract("Sodium");
  const protein = extract("Protein");

  const calories = parseInt(caloriesRaw.replace(/[^\d]/g, ""), 10) || 0;

  return {
    calories,
    totalFat,
    saturatedFat: saturatedFat || undefined,
    transFat: transFat || undefined,
    cholesterol,
    carbohydrate,
    fiber,
    sugar,
    sodium,
    protein,
  };
}

// Converts one API row into app's Meal interface
function apiMealToMeal(api: any): Meal {
  console.log("API meal row:", api);
  const name = api.name ?? "";
  const description = api.description ?? "";
  const parsedNutrition = parseNutrition(api.nutrition);
  cachePersistedMealTranslations({ ...api, name, description });

  return {
    id: Number(api.id),
    name,
    ingredients: splitCommaList(api.ingredients),
    nutrition: {
      calories: Number(api.calories) || parsedNutrition.calories || 0,
      totalFat: parsedNutrition.totalFat,
      saturatedFat: parsedNutrition.saturatedFat,
      transFat: parsedNutrition.transFat,
      cholesterol: parsedNutrition.cholesterol,
      carbohydrate: parsedNutrition.carbohydrate,
      fiber: parsedNutrition.fiber,
      sugar: parsedNutrition.sugar,
      sodium: String(api.sodium ?? parsedNutrition.sodium ?? ""),
      protein: String(api.protein ?? parsedNutrition.protein ?? ""),
    },
    description,
    imageUrl: String(api.imageUrl ?? "").trim(),
    mealType: api.mealtype ?? "",
    // Use the name-aware fallback so drinks/sides whose backend
    // mealperiod is null/garbage don't leak into the All Day tab.
    mealPeriod: resolvePeriodWithFallback(api.mealperiod, api.name),
    timeRange: api.timeRange ?? "",
    allergenInfo: splitCommaList(api.allergenInfo),
    tags: splitCommaList(api.tags),
    isAvailable: Boolean(api.available),
    isSeasonal: Boolean(api.seasonal),
  };
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Top up a backend meal list with any bundled meals that the server
 * doesn't have yet. Matches by case-insensitive name so duplicates
 * never sneak in when both sides ship the same dish.
 *
 * Use case: the Soft Bite roll-out — we ship 13 new meals in the
 * mobile bundle ahead of the backend seeder running in production, so
 * the kitchen / resident screens still see them.
 */
function mergeBundledIntoBackend(backend: Meal[], bundled: Meal[]): Meal[] {
  const backendNames = new Set(
    backend.map((m) => m.name.toLowerCase()).filter(Boolean),
  );
  // Tag bundled-only meals so the order-placement path can detect they
  // don't exist on the backend. Without this flag, placing a bundled
  // meal sends an ID the backend doesn't know about and the order
  // comes back with that item silently missing (the "auto-order shows
  // 3 items but Upcoming Meals shows only one" bug).
  const missing = bundled
    .filter((m) => !backendNames.has(m.name.toLowerCase()))
    .map((m) => ({ ...m, _local: true } as Meal & { _local: boolean }));
  return [...backend, ...missing];
}

async function fetchAllMealsFromApi(): Promise<Meal[]> {
  try {
    const data = await fetchJsonWithTimeout(`${API_BASE_URL}/menu`);
    const list = Array.isArray(data) ? data.map(apiMealToMeal) : [];
    return mergeBundledIntoBackend(list, FALLBACK_MEALS);
  } catch (error) {
    console.warn("Backend /menu unreachable, using fallback meals:", error);
    return FALLBACK_MEALS;
  }
}

// ── /menu in-memory cache ────────────────────────────────────────────
// The single biggest cause of the "menu view gets slower the more I
// navigate" memory/perf issue: browseMealOptions kicks off SIX parallel
// /menu fetches on every mount (3 for the auto-order candidates, plus
// Drinks/Sides/loadMenu/loadRecommendation), upcomingMealsScreen does
// three more for periodAlternatives, and none of them shared a result.
// Every nav back into the menu re-fetched the entire catalog from the
// server, in parallel, while the prior batch was still resolving.
//
// 20s TTL is short enough that admin edits propagate quickly, but long
// enough to coalesce the burst that happens on a single screen mount
// into one network round-trip. In-flight de-duping ensures concurrent
// callers share the same promise instead of stacking parallel requests.
const MENU_CACHE_TTL_MS = 20_000;
let menuCache: { data: Meal[]; expiresAt: number } | null = null;
let menuCacheInflight: Promise<Meal[]> | null = null;

/** Invalidate the menu cache — call after an admin edit so the next
 *  read goes back to the server. Safe to call repeatedly. */
export function invalidateMenuCache(): void {
  menuCache = null;
  menuCacheInflight = null;
}

async function fetchAvailableMealsFromApi(): Promise<Meal[]> {
  const now = Date.now();
  if (menuCache && menuCache.expiresAt > now) {
    return menuCache.data;
  }
  if (menuCacheInflight) {
    // Another caller already kicked off a fetch — share its result.
    return menuCacheInflight;
  }
  // We intentionally fetch ALL meals (not just /menu/available) so that
  // unavailable items can still be shown (greyed out) in the UI. The
  // `isAvailable` flag is preserved on each meal for the screen to use.
  menuCacheInflight = (async () => {
    try {
      const data = await fetchJsonWithTimeout(`${API_BASE_URL}/menu`);
      const list = Array.isArray(data) ? data.map(apiMealToMeal) : [];
      const merged = mergeBundledIntoBackend(list, FALLBACK_MEALS);
      menuCache = { data: merged, expiresAt: Date.now() + MENU_CACHE_TTL_MS };
      return merged;
    } catch (error) {
      console.warn("Backend /menu unreachable, using fallback meals:", error);
      // Cache the fallback briefly too so we don't hammer the network
      // when offline. Shorter TTL so we recover quickly when back online.
      menuCache = { data: FALLBACK_MEALS, expiresAt: Date.now() + 5_000 };
      return FALLBACK_MEALS;
    } finally {
      menuCacheInflight = null;
    }
  })();
  return menuCacheInflight;
}

async function fetchMealsByPeriodFromApi(period: Meal["mealPeriod"]): Promise<Meal[]> {
  // Filter bundled by period (same rules as the empty-backend fallback)
  // so we can top up the backend list with anything the server hasn't
  // seeded yet for this period — e.g. Soft Bite breakfasts.
  const bundledForPeriod = FALLBACK_MEALS.filter((m) => {
    if (!m.isAvailable) return false;
    if (m.mealPeriod === "All Day") return true;
    return m.mealPeriod === period;
  });
  try {
    const encodedPeriod = encodeURIComponent(period);
    const data = await fetchJsonWithTimeout(`${API_BASE_URL}/menu/period/${encodedPeriod}`);
    const list = Array.isArray(data) ? data.map(apiMealToMeal) : [];
    return mergeBundledIntoBackend(list, bundledForPeriod);
  } catch (error) {
    console.warn(`Backend /menu/period/${period} unreachable, using fallback meals:`, error);
    return bundledForPeriod;
  }
}

// Same TTL + inflight-dedupe pattern as the main menu cache — drinks
// and sides are pulled separately on every browseMealOptions mount
// AND from the customize-order modal, so they were a second source
// of redundant /menu/period/* calls.
let drinksCache: { data: Meal[]; expiresAt: number } | null = null;
let drinksInflight: Promise<Meal[]> | null = null;
let sidesCache: { data: Meal[]; expiresAt: number } | null = null;
let sidesInflight: Promise<Meal[]> | null = null;

/** Invalidate the drinks cache — call on logout/cleanup so the next
 *  read goes back to the server. Safe to call repeatedly. */
export function invalidateDrinksCache(): void {
  drinksCache = null;
  drinksInflight = null;
}

/** Invalidate the sides cache — call on logout/cleanup so the next
 *  read goes back to the server. Safe to call repeatedly. */
export function invalidateSidesCache(): void {
  sidesCache = null;
  sidesInflight = null;
}

async function fetchDrinksFromApi(): Promise<Meal[]> {
  const now = Date.now();
  if (drinksCache && drinksCache.expiresAt > now) return drinksCache.data;
  if (drinksInflight) return drinksInflight;
  const bundledDrinks = FALLBACK_MEALS.filter((m) => m.mealPeriod === "Drinks");
  drinksInflight = (async () => {
    try {
      const data = await fetchJsonWithTimeout(`${API_BASE_URL}/menu/period/drinks`);
      const list = Array.isArray(data) ? data.map(apiMealToMeal) : [];
      const merged = mergeBundledIntoBackend(list, bundledDrinks);
      drinksCache = { data: merged, expiresAt: Date.now() + MENU_CACHE_TTL_MS };
      return merged;
    } catch (error) {
      console.warn("Backend /menu/period/drinks unreachable, using fallback drinks:", error);
      drinksCache = { data: bundledDrinks, expiresAt: Date.now() + 5_000 };
      return bundledDrinks;
    } finally {
      drinksInflight = null;
    }
  })();
  return drinksInflight;
}

async function fetchSidesFromApi(): Promise<Meal[]> {
  const now = Date.now();
  if (sidesCache && sidesCache.expiresAt > now) return sidesCache.data;
  if (sidesInflight) return sidesInflight;
  const bundledSides = FALLBACK_MEALS.filter((m) => m.mealPeriod === "Sides");
  sidesInflight = (async () => {
    try {
      const data = await fetchJsonWithTimeout(`${API_BASE_URL}/menu/period/sides`);
      const list = Array.isArray(data) ? data.map(apiMealToMeal) : [];
      const merged = mergeBundledIntoBackend(list, bundledSides);
      sidesCache = { data: merged, expiresAt: Date.now() + MENU_CACHE_TTL_MS };
      return merged;
    } catch (error) {
      console.warn("Backend /menu/period/sides unreachable, using fallback sides:", error);
      sidesCache = { data: bundledSides, expiresAt: Date.now() + 5_000 };
      return bundledSides;
    } finally {
      sidesInflight = null;
    }
  })();
  return sidesInflight;
}
// Fallback meals for when the API is unreachable
export const FALLBACK_MEALS: Meal[] = [
  // { id: 1, name: "Banana Pancakes", ingredients: ["Flour","Sugar","Baking Powder","Cinnamon","Milk","Banana","Egg","Vanilla","Chocolate Chips"], nutrition: { calories: 450, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "300", protein: "10" }, description: "Soft fluffy pancakes", imageUrl: "https://deliciouslysprinkled.com/wp-content/uploads/2016/06/Banana-Chocolate-Chip-Pancakes-6454.jpg", mealType: "B", mealPeriod: "Breakfast", timeRange: "7am - 10am", allergenInfo: ["Eggs","Dairy","Gluten"], tags: ["Contains Dairy","Contains Eggs"], isAvailable: true, isSeasonal: false },
  // { id: 2, name: "Broccoli-Cheddar Quiche", ingredients: ["AP Flour","Sugar","Salt","Eggs","White Vinegar","Water","Butter","Garlic","Heavy Cream","Cheese","Pepper","Broccoli"], nutrition: { calories: 212, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "84", protein: "8" }, description: "Diced broccoli with cheddar and parmesean cheese in a traditional quiche - served with fresh fruit.", imageUrl: "https://feelgoodfoodie.net/wp-content/uploads/2020/12/Broccoli-and-Cheese-Quiche-10-1024x1536.jpg", mealType: "B", mealPeriod: "Breakfast", timeRange: "7am - 10am", allergenInfo: ["Eggs","Dairy","Gluten"], tags: ["Vegetarian","High Protein"], isAvailable: true, isSeasonal: false },
  // { id: 3, name: "Caesar Salad with chicken", ingredients: ["Croutons","Chicken","Parmesean Cheese","Caesar Dressing"], nutrition: { calories: 251, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "405", protein: "20" }, description: "Fresh romaine, caesar dressing, shaved parmesean, and herb crutons. Add chicken or salmon if desired", imageUrl: "https://img.freepik.com/premium-photo/tasty-caesar-salad-with-chicken-vegetables-top-view_151349-3402.jpg", mealType: "L", mealPeriod: "Lunch", timeRange: "11am - 2pm", allergenInfo: ["Eggs","dairy","fish","Gluten"], tags: ["High Protein","Low Carb"], isAvailable: true, isSeasonal: true },
  // { id: 4, name: "Citrus Butter Salmon", ingredients: ["Salmon","Olive Oil","Basil","Parsley","Salt","Pepper","Lemon"], nutrition: { calories: 239, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "135", protein: "19" }, description: "Fresh salmon with brown suagr-lemon seasoning - topped with compound butter and citrus salsa - served with mashed potatoes and seasonal vegetables.", imageUrl: "https://i0.wp.com/justinesnacks.com/wp-content/uploads/2022/02/how-to-make-citrus-salmon.jpg?resize=1229%2C1536&ssl=1", mealType: "D", mealPeriod: "Dinner", timeRange: "4pm - 7pm", allergenInfo: ["Fish","Dairy"], tags: ["Low Sodium","Heart Healthy","Omega-3","High Protein"], isAvailable: true, isSeasonal: true },
  // { id: 5, name: "Chicken Brushetta", ingredients: ["Olive Oil","Chicken","Oregano","Garlic","Salt","Pepper","Tomatoes","Shallot","Basil","Parmesean","Balsamic Glaze"], nutrition: { calories: 266, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "582", protein: "28" }, description: "A baked chicken breast topped with fresh tomatoes, garlic, and basil - served with herbed corn and a baked potato.", imageUrl: "https://www.eatingwell.com/thmb/iLEss554Lm_eBe_1C54cB7BQxA8=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/EWL-ChickenBruschetta-beauty-66-a886c95ddb2b4f2d93cc9b91b74a2dbe.jpg", mealType: "D", mealPeriod: "Dinner", timeRange: "4pm - 7pm", allergenInfo: ["Dairy"], tags: ["High Protein"], isAvailable: true, isSeasonal: false },
  // { id: 6, name: "Breakfast Banana Split", ingredients: ["Banana","Greek yogurt","Granola","Honey","Strawberries","Blueberries","Blackberries"], nutrition: { calories: 212, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "84", protein: "8" }, description: "Fresh sliced banana, with scoops of vanilla Greek yogurt, fresh berries, topped with granola and honey.", imageUrl: "https://i.pinimg.com/originals/7a/e8/fd/7ae8fd286537f47647e440ec560b63ba.jpg", mealType: "B", mealPeriod: "Breakfast", timeRange: "7am - 10am", allergenInfo: ["Dairy","Nuts"], tags: ["Vegetarian","Low Sodium","Healthy Choice"], isAvailable: true, isSeasonal: false },
  // { id: 7, name: "Herbed Baked Chicken", ingredients: ["Chicken Breast","Olive Oil","Rosemary","Thyme","Garlic","Salt","Pepper"], nutrition: { calories: 420, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "380", protein: "45" }, description: "Chicken marinated in olive oil, rosemary, thyme, and garlic,  is served with fluffy white rice and a medley of seasonal vegetables.", imageUrl: "https://cdn.scrambledchefs.com/wp-content/uploads/2020/08/IMG_4125.jpg", mealType: "L", mealPeriod: "Lunch", timeRange: "11am - 2pm", allergenInfo: [], tags: ["Low Sodium","Heart Healthy","High Protein"], isAvailable: true, isSeasonal: false },
  // { id: 8, name: "Pumpkin Soup", ingredients: ["Pumpkin","Onion","Garlic","Vegetable Broth","Cream","Olive Oil","Salt","Pepper","Nutmeg"], nutrition: { calories: 180, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "300", protein: "5" }, description: "A warm and creamy pumpkin soup, lightly spiced with nutmeg and served fresh for a comforting breakfast option.", imageUrl: "https://img.freepik.com/premium-photo/white-background-isolated-butternut-squash-soup-bowl-top-view_908985-24523.jpg?w=2000", mealType: "Side", mealPeriod: "Sides", timeRange: "7am - 10am", allergenInfo: ["Dairy"], tags: ["Vegetarian","High Fiber","Gluten Free","Low Fat"], isAvailable: true, isSeasonal: false },
  // { id: 9, name: "Hot Coffee", ingredients: ["Coffee Beans","Water","Optional Milk","Optional Sugar"], nutrition: { calories: 5, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "5", protein: "0" }, description: "Freshly brewed hot coffee, served regular or decaf with optional milk and sugar.", imageUrl: "https://img.freepik.com/premium-photo/high-angle-view-cappuccino-white-background_1048944-1712952.jpg", mealType: "Beverage", mealPeriod: "Drinks", timeRange: "7am - 7pm", allergenInfo: ["Dairy"], tags: ["Low Calorie","Low Sodium","Vegetarian"], isAvailable: true, isSeasonal: false },
  // { id: 10, name: "Orange Juice", ingredients: ["Fresh Oranges"], nutrition: { calories: 110, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "2", protein: "2" }, description: "Chilled orange juice, rich in vitamin C and served fresh.", imageUrl: "https://img.freepik.com/premium-photo/glass-orange-juice_770606-2417.jpg?w=2000", mealType: "Beverage", mealPeriod: "Drinks", timeRange: "7am - 10am", allergenInfo: [], tags: ["Vegetarian","Gluten-Free","Vitamin C"], isAvailable: true, isSeasonal: false },
  // { id: 11, name: "Soft Drink (Soda)", ingredients: ["Carbonated Water","Sugar","Natural Flavors"], nutrition: { calories: 150, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "45", protein: "0" }, description: "Chilled soft drink available in a variety of classic flavors.", imageUrl: "https://thumbs.dreamstime.com/b/soda-glass-16532262.jpg", mealType: "Beverage", mealPeriod: "Drinks", timeRange: "11am - 7pm", allergenInfo: [], tags: ["Vegetarian","High Sugar"], isAvailable: true, isSeasonal: false },
  // { id: 12, name: "Herbal Tea", ingredients: ["Herbal Tea Leaves","Water","Optional Honey"], nutrition: { calories: 2, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "0", protein: "0" }, description: "A soothing cup of caffeine-free herbal tea, served hot with optional honey.", imageUrl: "https://img.freepik.com/premium-photo/herbal-tea-cup-white-background_908985-113998.jpg?w=2000", mealType: "Beverage", mealPeriod: "Drinks", timeRange: "7am - 7pm", allergenInfo: [], tags: ["Caffeine-Free","Vegetarian","Low Calorie"], isAvailable: true, isSeasonal: false },
  // { id: 13, name: "Spiced Pear Tea", ingredients: ["Pear Slices","Black Tea","Cinnamon","Cloves","Water"], nutrition: { calories: 40, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "5", protein: "0" }, description: "A lightly spiced pear-infused tea with cinnamon and cloves, served warm and gently sweet.", imageUrl: "https://artfultea.com/cdn/shop/products/GF_2B-_2BSpring_2BFancy_2B_28cup_29.jpg?v=1715870809", mealType: "Beverage", mealPeriod: "Drinks", timeRange: "7am - 7pm", allergenInfo: [], tags: ["Low Sugar","Vegetarian","Seasonal","Low Sodium"], isAvailable: true, isSeasonal: true },
  // { id: 14, name: "Warm Apple Cider", ingredients: ["Apple Cider","Cinnamon Stick","Cloves","Orange Peel"], nutrition: { calories: 120, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "10", protein: "0" }, description: "A warm, spiced apple cider with cinnamon and cloves, served hot during the fall and winter seasons.", imageUrl: "https://img.freepik.com/free-photo/glass-with-apple-cider-cinnamon-sticks-lime-apple-pieces-white-background-close-up_185193-165818.jpg", mealType: "Beverage", mealPeriod: "Drinks", timeRange: "7am - 7pm", allergenInfo: [], tags: ["Vegetarian","Gluten-Free","Seasonal"], isAvailable: false, isSeasonal: true },
  // { id: 15, name: "Vanilla Cake Slice", ingredients: ["Flour","Sugar","Eggs","Butter","Milk","Vanilla Extract"], nutrition: { calories: 280, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "220", protein: "4" }, description: "A soft and moist slice of classic vanilla cake, lightly sweetened and easy to enjoy.", imageUrl: "https://img.freepik.com/premium-photo/vertical-view-delicious-birthday-white-cream-flowers-top-cake-with-drip-side_198067-759116.jpg?w=1800", mealType: "Side", mealPeriod: "Sides", timeRange: "11am - 7pm", allergenInfo: ["Eggs","Dairy","Gluten"], tags: ["Vegetarian"], isAvailable: true, isSeasonal: false },
  // { id: 16, name: "Side Garden Salad", ingredients: ["Lettuce","Tomato","Cucumber","Carrots","Dressing"], nutrition: { calories: 70, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "120", protein: "2" }, description: "A light side salad with fresh vegetables, served with your choice of dressing.", imageUrl: "https://img.freepik.com/premium-photo/salad-isolated_777576-4254.jpg", mealType: "Side", mealPeriod: "Sides", timeRange: "11am - 7pm", allergenInfo: [], tags: ["Vegetarian","Gluten-Free","Low Calorie"], isAvailable: false, isSeasonal: false },
  // { id: 17, name: "Oatmeal Cookie", ingredients: ["Oats","Flour","Sugar","Butter","Eggs","Cinnamon"], nutrition: { calories: 130, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "90", protein: "2" }, description: "A soft oatmeal cookie with a hint of cinnamon, perfect as a small snack.", imageUrl: "https://cobblerscakesandkream.com/wp-content/uploads/2021/11/Cookie-Pic-A-800x533.jpg", mealType: "Side", mealPeriod: "Sides", timeRange: "7am - 7pm", allergenInfo: ["Eggs","Dairy","Gluten","Tree Nuts"], tags: ["Vegetarian","Whole Grain"], isAvailable: false, isSeasonal: false },
  // { id: 18, name: "Strawberry Belgian Waffle", ingredients: ["flour","sugar","baking powder","salt","eggs","milk","butter","vanilla extract","strawberries","whipped cream"], nutrition: { calories: 388, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "388", protein: "10" }, description: "A house-made Belgian waffle topped with fresh strawberries and whipped cream, and your choice of bacon or sausage.", imageUrl: "https://www.frugalmomeh.com/wp-content/uploads/2022/06/Strawberry-Waffles-14-scaled-540x720.jpg", mealType: "B", mealPeriod: "Breakfast", timeRange: "7am - 10am", allergenInfo: ["Eggs","Dairy","Gluten"], tags: ["Vegetarian"], isAvailable: true, isSeasonal: true },
  // { id: 19, name: "All-American Hamburger", ingredients: ["ground beef","bun","american cheese","lettuce","tomato","onion","pickles","ketchup","mustard","mayonnaise","salt","pepper"], nutrition: { calories: 638, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "404", protein: "31" }, description: "Topped with caramelized onions, tomato, pickles, and lettuce on a toasted brioche bun - served with fresh fruit or fries", imageUrl: "https://static01.nyt.com/images/2020/03/04/dining/03fakemeat11/merlin_168791031_610e4a8d-848c-4630-9858-e4183765f57e-videoSixteenByNineJumbo1600.jpg", mealType: "L", mealPeriod: "Lunch", timeRange: "11am - 2pm", allergenInfo: ["Gluten","Dairy"], tags: ["High Protein"], isAvailable: true, isSeasonal: true },
  // { id: 20, name: "Traditional BLT Sandwich", ingredients: ["bacon","bread","lettuce","tomato","mayonnaise","salt","black pepper"], nutrition: { calories: 737, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "1101", protein: "19" }, description: "Crispy bacon, freshly sliced tomato, and green leaf lettuce on a toasted multigrain bread - served with spinach-orzo salad and fresh fruit.", imageUrl: "https://media.istockphoto.com/id/182355553/photo/toasted-blt-sandwich-with-coleslaw.jpg?s=170667a&w=0&k=20&c=1wG5MJfXqYaR9Kd1vI7_xOOFWhlH79GujPmwbPoBmro=", mealType: "L", mealPeriod: "Lunch", timeRange: "11am - 2pm", allergenInfo: ["Gluten"], tags: ["High Protein","Low Fiber","High Sodium","Moderate Carb"], isAvailable: true, isSeasonal: true },
  // { id: 21, name: "Fish and Chips", ingredients: ["white fish","flour","baking powder","salt","potatoes","vegetable oil","vinegar","lemon","tartar sauce"], nutrition: { calories: 444, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "688", protein: "38" }, description: "Golden, crispy battered fish served with a side of hot, seasoned fries. Accompanied by tangy tartar sauce, fresh lemon wedges, and a splash of malt vinegar for a classic, comforting seafood favorite.", imageUrl: "https://th.bing.com/th/id/OIP.CW_EMrIfE5YkYnk-WR9WhgHaEK?r=0&o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3", mealType: "L", mealPeriod: "Lunch", timeRange: "11am - 2pm", allergenInfo: ["Gluten","Fish"], tags: ["High Fat","High Sodium","High Carb"], isAvailable: true, isSeasonal: true },
  // { id: 22, name: "Chicken Soft Tacos", ingredients: ["chicken","corn tortillas","lettuce","tomato","onion","cheese","sour cream","salsa","cilantro","black bean","bell pepper"], nutrition: { calories: 334, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "483", protein: "30" }, description: "Shredded and seasoned chicken in a corn tortilla with lettuce, diced tomatoes and sour cream - served with black bean and bell pepper salad.", imageUrl: "https://th.bing.com/th/id/OSK.45eb48b2815ab7bc57a70c62bd10c262?w=424&h=424&c=7&rs=1&qlt=90&o=6&dpr=1.5&pid=16.1", mealType: "L", mealPeriod: "Lunch", timeRange: "11am - 2pm", allergenInfo: ["Gluten","Dairy"], tags: ["High Protein"], isAvailable: true, isSeasonal: true },
  // { id: 23, name: "Chef's cut steak", ingredients: ["beef steak","salt","black pepper","butter","garlic","thyme","olive oil"], nutrition: { calories: 1132, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "907", protein: "65" }, description: "Chef's cut steak, cooked to your liking - served with spinach-orzo salad and seasonal vegetables.", imageUrl: "https://d3s8tbcesxr4jm.cloudfront.net/recipe-images/v0/chuck-eye-steak-recipe-with-garlic-herb-butter_large.jpg", mealType: "D", mealPeriod: "Dinner", timeRange: "4pm - 7pm", allergenInfo: [], tags: ["High Protein","High Fat","Low Carb"], isAvailable: true, isSeasonal: true },
  // { id: 24, name: "Oatmeal Bowl", ingredients: ["Steel Cut Oats","Milk","Honey","Blueberries","Almonds","Cinnamon"], nutrition: { calories: 280, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "120", protein: "12" }, description: "Warm rolled oats topped with fresh fruit and a drizzle of honey, creating a hearty and comforting breakfast option packed with fiber and natural sweetness.", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Porridge_with_blueberries.jpg/800px-Porridge_with_blueberries.jpg", mealType: "B", mealPeriod: "Breakfast", timeRange: "7am - 10am", allergenInfo: ["Nuts","Dairy"], tags: ["Vegetarian","Hearth Healthy","High Fiber"], isAvailable: true, isSeasonal: true },
  // { id: 25, name: "Garden Vegetable Medly", ingredients: ["Broccoli","carrots","zucchini","yellow squash","green beans","olive oil","garlic","salt","black pepper","herbs"], nutrition: { calories: 1000, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "0", protein: "50" }, description: "A colorful blend of seasonal garden vegetables lightly seasoned and roasted to bring out their natural freshness and flavor.", imageUrl: "https://mydelightrecipes.com/wp-content/uploads/2025/02/foodmacronutrients_Spring_Vegetable_Medley_Recipe_in_a_white_pl_50f6a01c-53b0-4566-85e8-16a3e407773b.png", mealType: "L", mealPeriod: "Lunch", timeRange: "11am - 2pm", allergenInfo: [], tags: ["Vegetarian","Vegan","Heart Healthy","Low Calorie"], isAvailable: true, isSeasonal: false },
  // { id: 26, name: "Baked Mac & Cheese", ingredients: ["Elbow macaroni","cheddar cheese","mozzarella cheese","milk","butter","flour","breadcrumbs","salt","pepper"], nutrition: { calories: 520, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "680", protein: "22" }, description: "reamy macaroni pasta baked in a rich cheese sauce and topped with a golden crispy breadcrumb crust.", imageUrl: "https://www.allrecipes.com/thmb/e8uotDI18ieXNBY0KpmtGKbxMRM=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/238691-Simple-Macaroni-And-Cheese-mfs_008-4x3-6ed91ba87a1344558aacc0f9ef0f4b41.jpg", mealType: "L", mealPeriod: "Lunch", timeRange: "11am - 2pm", allergenInfo: ["Gluten","Dairy","Eggs"], tags: ["Vegetarian"], isAvailable: true, isSeasonal: true },
  // { id: 27, name: "French Toast", ingredients: ["Bread","eggs","milk","cinnamon","vanilla extract","butter","powdered sugar","maple syrup"], nutrition: { calories: 340, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "370", protein: "11" }, description: "Golden slices of cinnamon-vanilla French toast served warm and lightly dusted with powdered sugar.", imageUrl: "https://www.jessicagavin.com/wp-content/uploads/2020/05/french-toast-11-1200.jpg", mealType: "B", mealPeriod: "Breakfast", timeRange: "7am - 10am", allergenInfo: ["Eggs","Dairy","Gluten"], tags: ["Vegetarian"], isAvailable: true, isSeasonal: true },
  // { id: 28, name: "Soft Scrambled Eggs", ingredients: ["Eggs","butter","milk or cream","salt","black pepper"], nutrition: { calories: 310, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "360", protein: "17" }, description: "Fluffy and creamy scrambled eggs cooked low and slow for a soft, comforting texture. Garnished with scallions and served with a side of toast.", imageUrl: "https://www.allrecipes.com/thmb/0VXMwCY9RVNrNvWcF_9v0iZpNqA=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/JF_241160_CreamyCottageCheeseScrambled_4x3_12902-619d00dc88594ea9b8ed884a108db16d.jpg", mealType: "B", mealPeriod: "Breakfast", timeRange: "7am - 11am", allergenInfo: ["Eggs","Dairy"], tags: ["Soft Bite","High Protein","Gluten-Free"], isAvailable: true, isSeasonal: true },
  // { id: 29, name: "Beef Stew", ingredients: ["Beef chunks","potatoes","carrots","celery","onions","beef broth","tomato paste","garlic","herbs"], nutrition: { calories: 420, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "560", protein: "34" }, description: "Tender beef and hearty vegetables simmered in a savory rich broth for a classic homestyle stew.", imageUrl: "https://feelgoodfoodie.net/wp-content/uploads/2025/02/Stovetop-Beef-Stew-13.jpg", mealType: "D", mealPeriod: "Dinner", timeRange: "4pm - 7pm", allergenInfo: [], tags: ["Soft Bite","High Protein"], isAvailable: true, isSeasonal: true },
  // { id: 30, name: "Pasta with Meat Sauce", ingredients: ["Pasta","ground beef","tomato sauce","onions","garlic","olive oil","Italian herbs","parmesan cheese"], nutrition: { calories: 450, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "540", protein: "28" }, description: "Classic pasta topped with a slow-simmered savory meat sauce seasoned with Italian herbs.", imageUrl: "https://www.savorynothings.com/wp-content/uploads/2018/08/one-pot-spaghetti-and-meat-sauce-image-9-768x1152.jpg", mealType: "D", mealPeriod: "Dinner", timeRange: "4pm - 7pm", allergenInfo: ["Gluten","Dairy"], tags: ["Soft Bite","High Protein"], isAvailable: true, isSeasonal: true },
  // { id: 31, name: "Chicken and Rice Bowl", ingredients: ["Grilled chicken","rice","broccoli","carrots","soy sauce or seasoning blend","garlic","olive oil"], nutrition: { calories: 430, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "430", protein: "30" }, description: "Seasoned grilled chicken served over fluffy rice with fresh vegetables in a warm comforting bowl.", imageUrl: "https://recipes2day.com/wp-content/uploads/2025/03/Chicken-Rice-Bowl.webp", mealType: "L", mealPeriod: "Lunch", timeRange: "11am - 2pm", allergenInfo: [], tags: ["Soft Bite","High Protein"], isAvailable: true, isSeasonal: true },
  // { id: 32, name: "Water", ingredients: ["Purified water"], nutrition: { calories: 0, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "0", protein: "0" }, description: "Refreshing chilled purified water served ice cold.", imageUrl: "https://media-cldnry.s-nbcnews.com/image/upload/t_fit-760w,f_auto,q_auto:best/rockcms/2026-03/restaurant-water-glass-eb-260320-4da88f.jpg", mealType: "Beverage", mealPeriod: "Drinks", timeRange: "7am - 7pm", allergenInfo: [], tags: [], isAvailable: true, isSeasonal: true },
  // { id: 33, name: "Whole Milk", ingredients: ["Whole milk"], nutrition: { calories: 149, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "107", protein: "8" }, description: "Fresh and creamy whole milk served chilled.", imageUrl: "https://static.vecteezy.com/system/resources/thumbnails/037/981/897/small_2x/ai-generated-milk-glass-on-light-background-photo.jpg", mealType: "Beverage", mealPeriod: "Drinks", timeRange: "7am - 7pm", allergenInfo: ["Dairy"], tags: ["Vegetarian","High Protein","Calcium"], isAvailable: true, isSeasonal: true },
  // { id: 34, name: "Sparkling Water", ingredients: ["Carbonated water","natural mineral content"], nutrition: { calories: 0, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "20", protein: "0" }, description: "Crisp sparkling water with refreshing bubbles for a light and clean taste.", imageUrl: "https://www.skinnymixes.com/cdn/shop/articles/PISTACHIO_Recipe_Images-19.png?v=1684161821", mealType: "Beverage", mealPeriod: "Drinks", timeRange: "7am - 7pm", allergenInfo: [], tags: ["Low Calorie","Low Sodium"], isAvailable: true, isSeasonal: true },
  // { id: 35, name: "Cranberry Juice", ingredients: ["Cranberry juice concentrate","water","sugar","vitamin C"], nutrition: { calories: 116, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "5", protein: "0" }, description: "weet and tart cranberry juice served chilled and refreshing.", imageUrl: "https://agresearchmag.ars.usda.gov/media/9359/d3598-1a.jpg", mealType: "Beverage", mealPeriod: "Drinks", timeRange: "7am - 7pm", allergenInfo: [], tags: ["Vegan"], isAvailable: true, isSeasonal: true },
  // { id: 36, name: "Apple Juice", ingredients: ["Apple juice concentrate","water","vitamin C"], nutrition: { calories: 114, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "7", protein: "0" }, description: "Refreshing apple juice with a naturally sweet and crisp flavor.", imageUrl: "https://www.mariaushakova.com/wp-content/uploads/2023/06/Apple-Juice-in-Glasses.jpg", mealType: "Beverage", mealPeriod: "Drinks", timeRange: "7am - 7pm", allergenInfo: [], tags: ["Vegan"], isAvailable: true, isSeasonal: true },
  // { id: 37, name: "Hot Cocoa", ingredients: ["Milk","cocoa powder","sugar","vanilla extract"], nutrition: { calories: 192, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "120", protein: "8" }, description: "Rich and creamy hot cocoa made with chocolate and served warm for a cozy treat.", imageUrl: "https://www.wellplated.com/wp-content/uploads/2022/11/How-to-Make-Hot-Chocolate-Cocoa-Powder.jpg", mealType: "Beverage", mealPeriod: "Drinks", timeRange: "7am - 7pm", allergenInfo: ["Dairy"], tags: ["Vegetarian"], isAvailable: true, isSeasonal: true },
  // { id: 38, name: "Chicken Noodle Soup", ingredients: ["Chicken breast","egg noodles","carrots","celery","onions","chicken broth","garlic","herbs"], nutrition: { calories: 120, totalFat: "", cholesterol: "", carbohydrate: "", fiber: "", sugar: "", sodium: "890", protein: "8" }, description: "Comforting chicken noodle soup filled with tender chicken, hearty noodles, and vegetables in a savory broth.", imageUrl: "https://www.simplyrecipes.com/thmb/wL2O85jWlNeh-Z6l3Mtbb13MXjQ=/2000x1334/filters:no_upscale():max_bytes(150000):strip_icc()/__opt__aboutcom__coeus__resources__content_migration__simply_recipes__uploads__2019__01__Chicken-Noo", mealType: "Side", mealPeriod: "Sides", timeRange: "11am - 7pm", allergenInfo: ["Gluten"], tags: ["Low Sodium"], isAvailable: true, isSeasonal: true },
];

export interface Nutrition {
  calories: number;
  totalFat: string;
  saturatedFat?: string;
  transFat?: string;
  cholesterol: string;
  carbohydrate: string;
  fiber: string;
  sugar: string;
  sodium: string;
  protein: string;
}

export interface Meal {
  id: number;
  name: string;
  ingredients: string[];
  nutrition: Nutrition;
  description: string;
  imageUrl: string;
  mealType: string; // 'B', 'L', 'D', or combinations like 'L, D'
  mealPeriod: 'Breakfast' | 'Lunch' | 'Dinner' | 'All Day' | 'Drinks' | 'Sides';
  timeRange: string;
  allergenInfo: string[];
  tags: string[];
  isAvailable: boolean;
  isSeasonal: boolean;
}

export interface DietaryRestriction {
  type: 'allergy' | 'intolerance' | 'preference' | 'medical';
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface NutritionGoals {
  dailyCalories: number;
  maxSodium: number;
  minProtein: number;
  maxCholesterol: number;
  maxSugar: number;
}

export interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  roomNumber: string;
  role: 'resident' | 'staff' | 'kitchen' | 'admin';
  dietaryRestrictions: DietaryRestriction[];
  nutritionGoals: NutritionGoals;
  dislikedIngredients: string[];
  favoriteMealIds: number[];
  isActive: boolean;
}

export interface OrderItem {
  meal: Meal;
  quantity: number;
  specialInstructions?: string;
}

export interface Order {
  id: string;
  residentId: string;
  items: OrderItem[];
  mealPeriod: 'Breakfast' | 'Lunch' | 'Dinner';
  scheduledDate: Date;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  totalNutrition: {
    calories: number;
    sodium: number;
    protein: number;
  };
  createdAt: Date;
}

export interface Recommendation {
  meal: Meal;
  score: number;
  reason: string;
  allReasons: string[];
}

// ==================== RESIDENTS DATABASE ====================

const RESIDENTS_DATABASE: Resident[] = [
  {
    id: "resident_001",
    firstName: "Bobby",
    lastName: "Johnson",
    fullName: "Bobby Johnson",
    email: "bobby.johnson@example.com",
    phone: "555-0101",
    roomNumber: "101",
    role: "resident",
    dietaryRestrictions: [
      { type: "medical", name: "Low Sodium", severity: "moderate" },
      { type: "preference", name: "Heart Healthy", severity: "mild" },
      { type: "allergy", name: "Shellfish", severity: "severe" }
    ],
    nutritionGoals: {
      dailyCalories: 1800,
      maxSodium: 1500,
      minProtein: 50,
      maxCholesterol: 200,
      maxSugar: 40
    },
    dislikedIngredients: ["mushrooms", "olives"],
    favoriteMealIds: [4, 7, 11],
    isActive: true
  },
  {
    id: "resident_002",
    firstName: "Mary",
    lastName: "Williams",
    fullName: "Mary Williams",
    email: "mary.williams@example.com",
    phone: "555-0102",
    roomNumber: "102",
    role: "resident",
    dietaryRestrictions: [
      { type: "allergy", name: "Peanuts", severity: "severe" },
      { type: "intolerance", name: "Lactose", severity: "moderate" }
    ],
    nutritionGoals: {
      dailyCalories: 1600,
      maxSodium: 2000,
      minProtein: 45,
      maxCholesterol: 250,
      maxSugar: 35
    },
    dislikedIngredients: ["onions"],
    favoriteMealIds: [6, 8, 12],
    isActive: true
  },
  {
    id: "resident_003",
    firstName: "Robert",
    lastName: "Davis",
    fullName: "Robert Davis",
    email: "robert.davis@example.com",
    phone: "555-0103",
    roomNumber: "103",
    role: "resident",
    dietaryRestrictions: [
      { type: "medical", name: "Diabetic", severity: "moderate" }
    ],
    nutritionGoals: {
      dailyCalories: 2000,
      maxSodium: 2300,
      minProtein: 55,
      maxCholesterol: 300,
      maxSugar: 25
    },
    dislikedIngredients: [],
    favoriteMealIds: [3, 5, 7],
    isActive: true
  }
];

// ==================== ORDERS DATABASE ====================

let ORDERS_DATABASE: Order[] = [];

// ==================== MEAL SERVICE ====================
export const MealService = {
  getAllMeals: async (): Promise<Meal[]> => {
    return await fetchAvailableMealsFromApi();
  },

  getMealById: async (id: number): Promise<Meal | undefined> => {
    const meals = await fetchAllMealsFromApi();
    return meals.find((m) => m.id === id);
  },

  getMealsByPeriod: async (
    period: Meal["mealPeriod"] | null
  ): Promise<Meal[]> => {
    // fetchAvailableMealsFromApi now returns ALL meals (including
    // unavailable ones) so the UI can show them greyed-out.
    const meals = await fetchAvailableMealsFromApi();

    if (!period) {
      // Drinks/Sides have their own tabs (Beverages, Desserts) — keep them
      // out of All Day. Filter on mealPeriod since mealType codes are
      // ambiguous ("D" is used for both Dinner and Drinks in fallback data).
      return meals.filter(
        (m) => m.mealPeriod !== "Drinks" && m.mealPeriod !== "Sides"
      );
    }

    if (period === "Drinks") {
      return await fetchDrinksFromApi();
    }

    if (period === "Sides") {
      return await fetchSidesFromApi();
    }

    return meals.filter((m) => {
      // exclude drinks and sides from meal tabs
      if (m.mealType === "Beverage" || m.mealType === "Side") return false;
      if (m.mealPeriod === "All Day") return true;
      return m.mealPeriod === period;
    });
  },

  searchMeals: async (query: string): Promise<Meal[]> => {
    const meals = await fetchAvailableMealsFromApi();
    const lowerQuery = query.toLowerCase();
    return meals.filter(
      (m) =>
        m.name.toLowerCase().includes(lowerQuery) ||
        m.description.toLowerCase().includes(lowerQuery) ||
        m.ingredients.some((i) => i.toLowerCase().includes(lowerQuery)) ||
        m.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  },

  getMealsByTag: async (tag: string): Promise<Meal[]> => {
    const normalizedTag = tag.toLowerCase();
    const matchesTag = (meal: Meal) =>
      meal.isAvailable &&
      meal.tags.some((t) => t.toLowerCase() === normalizedTag);

    const meals = await fetchAvailableMealsFromApi();
    let taggedMeals = meals.filter(matchesTag);

    if (normalizedTag !== "soft bite") {
      return taggedMeals;
    }

    // Live backend deploys can lag behind the mobile bundle. Keep the new
    // Soft Bite tab populated from the bundled seed until the DB seeder has
    // inserted the same rows upstream.
    const fallbackByName = new Map(
      FALLBACK_MEALS
        .filter(matchesTag)
        .map((m) => [m.name.toLowerCase(), m]),
    );

    taggedMeals = taggedMeals.map((meal) => {
      const fallback = fallbackByName.get(meal.name.toLowerCase());
      const imageUrl = meal.imageUrl.trim();
      const usesRedirectImage = imageUrl.includes("commons.wikimedia.org/wiki/Special:");
      if (!fallback || (imageUrl && !usesRedirectImage)) return meal;
      return { ...meal, imageUrl: fallback.imageUrl };
    });

    const seenNames = new Set(taggedMeals.map((m) => m.name.toLowerCase()));
    const fallbackSoftBiteMeals = Array.from(fallbackByName.values())
      .filter((m) => !seenNames.has(m.name.toLowerCase()));

    return [...taggedMeals, ...fallbackSoftBiteMeals];
  },

  getMealsGroupedByPeriod: async () => {
    const [breakfast, lunch, dinner] = await Promise.all([
      MealService.getMealsByPeriod("Breakfast"),
      MealService.getMealsByPeriod("Lunch"),
      MealService.getMealsByPeriod("Dinner"),
    ]);
    return { breakfast, lunch, dinner };
  },

  getSeasonalMeals: async (): Promise<Meal[]> => {
    const meals = await fetchAvailableMealsFromApi();
    return meals.filter((m) => m.isAvailable && m.isSeasonal);
  },
};

// ==================== RESIDENT SERVICE ====================
//
// Backend-backed in-memory cache. Populated by primeResidentsCache() after
// login (see App.tsx). Until that runs, the cache falls back to the small
// RESIDENTS_DATABASE seed above so demo/offline flows still work.
//
// The sync getters preserved below match the signatures every screen has
// always used — swapping to async would cascade through a dozen UI files.
// Keeping the cache in module scope lets us stay sync without lying about
// where the data comes from.

let residentsCache: Resident[] = [];

function activeResidents(): Resident[] {
  const pool = residentsCache.length > 0 ? residentsCache : RESIDENTS_DATABASE;
  return pool.filter((r) => r.isActive);
}

// Convert a backend Resident DTO (shape from api.ts) into the rich local
// Resident type this app has always used internally.
type BackendResident = {
  id: string | number;
  name?: string;
  room?: string;
  dietaryRestrictions?: string[];
  foodAllergies?: string[];
  medicalConditions?: string[];
  medications?: string[];
};

function toLocalResident(b: BackendResident): Resident {
  const full = (b.name ?? "").trim();
  const parts = full.split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "";

  const allergies = (b.foodAllergies ?? []).map((name) => ({
    type: "allergy" as const,
    name,
    severity: "severe" as const,
  }));
  const medical = (b.medicalConditions ?? []).map((name) => ({
    type: "medical" as const,
    name,
    severity: "moderate" as const,
  }));
  const prefs = (b.dietaryRestrictions ?? []).map((name) => ({
    type: "preference" as const,
    name,
    severity: "mild" as const,
  }));

  return {
    id: String(b.id),
    firstName,
    lastName,
    fullName: full,
    email: "",
    phone: "",
    roomNumber: b.room ?? "",
    role: "resident",
    dietaryRestrictions: [...allergies, ...medical, ...prefs],
    nutritionGoals: {
      dailyCalories: { min: 0, max: 0 },
      sodium: { max: 0 },
      protein: { min: 0 },
    } as any,
    dislikedIngredients: [],
    favoriteMealIds: [],
    isActive: true,
  };
}

// Called after login. Accepts the already-fetched backend list so callers
// can pick the role-appropriate endpoint (admin vs caregiver) in one place.
export function setResidentsCache(backendResidents: BackendResident[] | null | undefined): void {
  if (!backendResidents || backendResidents.length === 0) {
    residentsCache = [];
    return;
  }
  residentsCache = backendResidents.map(toLocalResident);
}

export function clearResidentsCache(): void {
  residentsCache = [];
}

export const ResidentService = {
  /**
   * Get all residents
   */
  getAllResidents: (): Resident[] => {
    return activeResidents();
  },

  /**
   * Get resident by ID — checks backend-backed cache first, then falls
   * through to the demo seed. Accepts numeric backend ids as well as the
   * legacy "resident_001" strings.
   */
  getResidentById: (id: string): Resident | undefined => {
    const key = String(id);
    const pool = residentsCache.length > 0 ? residentsCache : RESIDENTS_DATABASE;
    return pool.find((r) => r.id === key);
  },

  /**
   * Get resident by room number
   */
  getResidentByRoom: (roomNumber: string): Resident | undefined => {
    const pool = residentsCache.length > 0 ? residentsCache : RESIDENTS_DATABASE;
    return pool.find((r) => r.roomNumber === roomNumber);
  },

  /**
   * Get default resident — first active record. Backed by the live cache
   * once primed; falls back to the demo seed otherwise.
   */
  getDefaultResident: (): Resident => {
    const pool = activeResidents();
    return pool[0] ?? RESIDENTS_DATABASE[0];
  },

  /**
   * Check if meal is safe for resident (no allergens)
   */
  isMealSafeForResident: (meal: Meal, resident: Resident): boolean => {
    const residentAllergies = resident.dietaryRestrictions
      .filter(r => r.type === 'allergy')
      .map(r => r.name.toLowerCase());

    // Check allergen info
    for (const allergen of meal.allergenInfo) {
      if (residentAllergies.some(a => allergen.toLowerCase().includes(a))) {
        return false;
      }
    }

    // Check ingredients for shellfish, etc.
    for (const ingredient of meal.ingredients) {
      const lowerIngredient = ingredient.toLowerCase();
      if (residentAllergies.includes('shellfish') && 
          (lowerIngredient.includes('shrimp') || 
           lowerIngredient.includes('crab') || 
           lowerIngredient.includes('lobster'))) {
        return false;
      }
    }

    return true;
  },

  // /**
  //  * Get favorite meals for resident
  //  */
  getFavoriteMeals: async (residentId: string): Promise<Meal[]> => {
  const resident = ResidentService.getResidentById(residentId);
  if (!resident) return [];

  const meals = await Promise.all(
    resident.favoriteMealIds.map((id) => MealService.getMealById(id))
  );

  return meals.filter((m): m is Meal => m !== undefined);
}
};

// ==================== RECOMMENDATION SERVICE ====================

export const RecommendationService = {
  /**
   * Get personalized meal recommendations for a resident
   */

  getRecommendations: async (
  residentId: string,
  period?: Meal["mealPeriod"] | null,
  limit: number = 3
): Promise<Recommendation[]> => {
  const resident = ResidentService.getResidentById(residentId);
  if (!resident) return [];

  let meals = await MealService.getMealsByPeriod(period || null);

  // Filter out unsafe meals
  meals = meals.filter((m) => ResidentService.isMealSafeForResident(m, resident));

  // Filter out meals with disliked ingredients
  meals = meals.filter((m) => {
    const mealIngredients = m.ingredients.map((i) => i.toLowerCase());
    return !resident.dislikedIngredients.some((disliked) =>
      mealIngredients.some((ing) => ing.includes(disliked.toLowerCase()))
    );
  });

  const scored = meals.map((meal) => {
    let score = 50;
    const reasons: string[] = [];

    if (resident.favoriteMealIds.includes(meal.id)) {
      score += 30;
      reasons.push("One of your favorites");
    }

    const sodium = parseInt(meal.nutrition.sodium.replace(/[^\d]/g, "") || "0");
    const protein = parseInt(meal.nutrition.protein.replace(/[^\d]/g, "") || "0");

    if (sodium <= resident.nutritionGoals.maxSodium / 3) {
      score += 15;
      reasons.push("Low sodium");
    }

    if (protein >= resident.nutritionGoals.minProtein / 3) {
      score += 10;
      reasons.push("High protein");
    }

    if (meal.tags.some((t) => t.toLowerCase().includes("heart healthy"))) {
      const hasHeartRestriction = resident.dietaryRestrictions.some((r) =>
        r.name.toLowerCase().includes("heart")
      );
      if (hasHeartRestriction) {
        score += 20;
        reasons.push("Heart healthy");
      }
    }

    if (meal.isSeasonal) {
      score += 5;
      reasons.push("Seasonal special");
    }

    return {
      meal,
      score,
      reason: reasons[0] || "Good nutritional balance",
      allReasons: reasons.length > 0 ? reasons : ["Good nutritional balance"],
    };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
},

  /**
   * Get the top recommendation for AI banner
   */

  getTopRecommendation: async (
  residentId: string,
  period?: Meal["mealPeriod"] | null
) => {
  const recommendations = await RecommendationService.getRecommendations(residentId, period, 1);
  if (recommendations.length === 0) return null;

  const resident = ResidentService.getResidentById(residentId);
  const rec = recommendations[0];

  const restrictions = resident?.dietaryRestrictions.map((r) => r.name) || [];

  // Build a specific explanation of WHY this meal is safe and recommended
  const whyParts: string[] = [];

  // Explain allergen safety
  if (restrictions.length > 0) {
    const avoided = restrictions.filter(
      (r) => !rec.meal.allergenInfo.some((a) => a.toLowerCase().includes(r.toLowerCase()))
    );
    if (avoided.length > 0) {
      whyParts.push(`free of ${avoided.join(', ')}`);
    }
  }

  // Add scoring reasons
  if (rec.allReasons && rec.allReasons.length > 0) {
    for (const r of rec.allReasons) {
      const lower = r.toLowerCase();
      // Avoid duplicating the allergen info
      if (!lower.includes('free of')) {
        whyParts.push(r.toLowerCase());
      }
    }
  }

  const whyText = whyParts.length > 0
    ? `It's ${whyParts.join(', ')} — a great fit for ${resident?.firstName || 'this resident'}. We recommend the`
    : `Based on ${resident?.firstName || 'their'}'s profile (${restrictions.join(', ')}), we suggest the`;

  return {
    meal_name: rec.meal.name,
    reason: whyText,
    dietary_restrictions: restrictions,
  };
},

  /**
   * Get top recommendation using a pre-built resident object (e.g. from backend params).
   * Used when the resident isn't in the local RESIDENTS_DATABASE.
   */
  getTopRecommendationForResident: async (
    resident: Resident,
    period?: Meal["mealPeriod"] | null
  ) => {
    let meals = await MealService.getMealsByPeriod(period || null);

    // Filter out meals unsafe for this resident's allergies
    meals = meals.filter((m) => ResidentService.isMealSafeForResident(m, resident));

    // Filter out disliked ingredients
    meals = meals.filter((m) => {
      const mealIngredients = m.ingredients.map((i) => i.toLowerCase());
      return !resident.dislikedIngredients.some((disliked) =>
        mealIngredients.some((ing) => ing.includes(disliked.toLowerCase()))
      );
    });

    if (meals.length === 0) return null;

    const scored = meals.map((meal) => {
      let score = 50;
      const reasons: string[] = [];

      const sodium = parseInt(meal.nutrition.sodium.replace(/[^\d]/g, '') || '0');
      const protein = parseInt(meal.nutrition.protein.replace(/[^\d]/g, '') || '0');

      if (sodium <= 400) { score += 15; reasons.push('Low sodium'); }
      if (protein >= 15) { score += 10; reasons.push('High protein'); }
      if (meal.isSeasonal) { score += 5; reasons.push('Seasonal special'); }
      if (meal.tags.some((t) => t.toLowerCase().includes('heart healthy'))) {
        score += 10; reasons.push('Heart healthy');
      }

      return { meal, score, reasons };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];

    const restrictions = resident.dietaryRestrictions.map((r) => r.name);
    const whyParts: string[] = [];
    if (restrictions.length > 0) {
      whyParts.push(`free of ${restrictions.join(', ')}`);
    }
    if (top.reasons.length > 0) {
      for (const r of top.reasons) {
        if (!r.toLowerCase().includes('free of')) whyParts.push(r.toLowerCase());
      }
    }

    const whyText = whyParts.length > 0
      ? `It's ${whyParts.join(', ')} — a great fit for ${resident.firstName}. We recommend the`
      : `Based on ${resident.firstName}'s profile, we suggest the`;

    return {
      meal_name: top.meal.name,
      reason: whyText,
      dietary_restrictions: restrictions,
    };
  },
};

// ==================== ORDER SERVICE ====================

export const OrderService = {
  /**
   * Create a new order
   */
  createOrder: async (
    residentId: string,
    items: { mealId: number; quantity: number; specialInstructions?: string }[],
    mealPeriod: "Breakfast" | "Lunch" | "Dinner",
    scheduledDate: Date
  ): Promise<Order | null> => {
    const resident = ResidentService.getResidentById(residentId);
    if (!resident) return null;

  const maybeOrderItems = await Promise.all(
    items.map(async (item) => {
      const meal = await MealService.getMealById(item.mealId);
      if (!meal) return null;

      return {
        meal,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions,
      } as OrderItem;
    })
  );

  const orderItems = maybeOrderItems.filter((item): item is OrderItem => item !== null);
  if (orderItems.length === 0) return null;

  const totalNutrition = orderItems.reduce(
    (acc, item) => {
      const calories = item.meal.nutrition.calories * item.quantity;
      const sodium =
        parseInt(item.meal.nutrition.sodium.replace(/[^\d]/g, "") || "0") * item.quantity;
      const protein =
        parseInt(item.meal.nutrition.protein.replace(/[^\d]/g, "") || "0") * item.quantity;

      return {
        calories: acc.calories + calories,
        sodium: acc.sodium + sodium,
        protein: acc.protein + protein,
      };
    },
    { calories: 0, sodium: 0, protein: 0 }
  );

  const order: Order = {
    id: `order_${Date.now()}`,
    residentId,
    items: orderItems,
    mealPeriod,
    scheduledDate,
    status: "pending",
    totalNutrition,
    createdAt: new Date(),
  };

  ORDERS_DATABASE.push(order);
  return order;
  },

  /**
   * Get orders for a resident
   */
  getOrdersByResident: (residentId: string): Order[] => {
    return ORDERS_DATABASE.filter(o => o.residentId === residentId);
  },

  /**
   * Get upcoming orders for a resident
   */
  getUpcomingOrders: (residentId: string): Order[] => {
    const now = new Date();
    return ORDERS_DATABASE
      .filter(o => 
        o.residentId === residentId && 
        o.scheduledDate >= now &&
        o.status !== 'cancelled' &&
        o.status !== 'delivered'
      )
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  },

  /**
   * Update order status
   */
  updateOrderStatus: (orderId: string, status: Order['status']): Order | null => {
    const order = ORDERS_DATABASE.find(o => o.id === orderId);
    if (!order) return null;
    
    order.status = status;
    return order;
  },

  /**
   * Cancel an order
   */
  cancelOrder: (orderId: string): boolean => {
    const order = ORDERS_DATABASE.find(o => o.id === orderId);
    if (!order || order.status === 'delivered') return false;
    
    order.status = 'cancelled';
    return true;
  }
};

// ==================== AI CHAT SERVICE ====================

export const AIChatService = {
  /**
   * Generate AI response based on user message
   */
  generateResponse: async (
    userMessage: string,
    residentId: string,
    currentMeals: Meal[]
  ): Promise<string> => {
    const resident = ResidentService.getResidentById(residentId);
    if (!resident) return "I couldn't find the resident information. Please try again.";

    const lowerMessage = userMessage.toLowerCase();

    // Menu questions
    if (
      lowerMessage.includes("menu") ||
      lowerMessage.includes("today") ||
      lowerMessage.includes("available")
    ) {
      const menuItems = currentMeals
        .map((m) => `• ${m.name} (${m.mealPeriod})`)
        .join("\n");

      return `Here's what's available today:\n\n${menuItems}\n\nWould you like me to recommend something based on ${resident.firstName}'s dietary needs?`;
    }

    // Recommendation questions
    if (lowerMessage.includes("recommend") || lowerMessage.includes("suggest")) {
      const recommendations = await RecommendationService.getRecommendations(residentId, null, 2);

      if (recommendations.length === 0) {
        return `I don't have any recommendations available at the moment.`;
      }

      const restrictions = resident.dietaryRestrictions.map((r) => r.name).join(", ");
      const topRec = recommendations[0];

      return `Based on ${resident.firstName}'s dietary restrictions (${restrictions}), I recommend the **${topRec.meal.name}**.\n\n${topRec.allReasons.join(
        ", "
      )} - which aligns perfectly with their needs.\n\nWould you like to add it to their order?`;
    }

    // Dietary restriction questions
    if (
      lowerMessage.includes("dietary") ||
      lowerMessage.includes("restriction") ||
      lowerMessage.includes("allerg")
    ) {
      const restrictions = resident.dietaryRestrictions
        .map((r) => `• ${r.name} (${r.type}, ${r.severity})`)
        .join("\n");

      return `${resident.firstName}'s current dietary restrictions are:\n\n${restrictions}\n\nAll meal recommendations take these into account. Would you like to update these restrictions?`;
    }

    // Order questions
    if (lowerMessage.includes("order") || lowerMessage.includes("place")) {
      const recommendations = await RecommendationService.getRecommendations(residentId, null, 2);
      const recNames = recommendations.map((r) => r.meal.name).join(" or ");

      return `I can help you place an order! Which meal would you like to order for ${resident.firstName}?\n\nBased on their dietary needs, I'd suggest the ${recNames}.`;
    }

    // Nutrition questions
    if (
      lowerMessage.includes("calorie") ||
      lowerMessage.includes("nutrition") ||
      lowerMessage.includes("sodium") ||
      lowerMessage.includes("protein")
    ) {
      const goals = resident.nutritionGoals;

      return `${resident.firstName}'s nutrition goals are:\n\n• Daily Calories: ${goals.dailyCalories} kcal\n• Max Sodium: ${goals.maxSodium}mg\n• Min Protein: ${goals.minProtein}g\n• Max Cholesterol: ${goals.maxCholesterol}mg\n\nWould you like to see which meals best fit these goals?`;
    }

    // Default response
    return `I'd be happy to help with that! I can assist you with:\n\n• Viewing today's menu\n• Meal recommendations for ${resident.firstName}\n• Dietary restrictions\n• Placing orders\n• Nutritional information\n\nWhat would you like to know?`;
  },
};

// ==================== EXPORT DEFAULT ====================

export default {
  MealService,
  ResidentService,
  RecommendationService,
  OrderService,
  AIChatService
};
