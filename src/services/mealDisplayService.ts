/**
 * mealDisplayService.ts
 *
 * Centralised display-layer constants and helpers for the Browse Meals screen.
 * Extracted from browseMealOptionsScreen.tsx so the screen file focuses on
 * layout / interaction only, while all data-mapping, image references, and
 * colour tokens live here.
 *
 * ── Exports ──────────────────────────────────────────────────────────────
 *  COLORS              – TrayMate colour palette used across the browse UI
 *  DisplayMeal         – The shape the browse list / cart expects
 *  MEAL_PLACEHOLDER_COLORS – emoji + bg colour per meal name
 *  getMealPlaceholder  – safe accessor (returns neutral default for unknowns)
 *  MEAL_IMAGES         – require() map keyed by meal name
 *  getMealImage        – safe accessor (returns null for unknowns)
 *  mapServiceMeal      – converts a localDataService.Meal → DisplayMeal
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { Meal as ServiceMeal } from "./localDataService";

// ─────────────────────────────────────────────────────────────────────────
// Colour palette (from TrayMate design slide)
// ─────────────────────────────────────────────────────────────────────────

/** TrayMate brand colour palette – shared by browse screen, chat, and detail modal */
export const COLORS = {
  /** Olive green – primary actions, headers */
  primary: "#717644",
  /** Bright orange – accent badges, highlights */
  accent: "#f6a72d",
  /** Burnt orange – secondary CTA */
  secondary: "#d27028",
  /** Warm gray – neutral backgrounds */
  neutral: "#cbc2b4",
  /** Caramel – support elements */
  support: "#b77f3f",

  white: "#FFFFFF",
  textDark: "#111827",
  textMid: "#374151",
  textLight: "#6B7280",
  borderLight: "#E5E7EB",
  surface: "#F3F4F6",
};

// ─────────────────────────────────────────────────────────────────────────
// DisplayMeal – the screen-local meal shape used by the browse list & cart
// ─────────────────────────────────────────────────────────────────────────

/** Flat meal record consumed by the FlatList, detail modal, and CartContext. */
export type DisplayMeal = {
  id: string;
  name: string;
  meal_period: "Breakfast" | "Lunch" | "Dinner" | "Drinks" | "Sides";
  description: string;
  time_range: string;
  kcal: number;
  sodium_mg: number;
  protein_g: number;
  imageUrl?: string;
  tags?: string[];
  isSeasonal?: boolean;
  /** Allergen names for dietary restriction checks */
  allergens?: string[];
  /** Optional special note added by the user in the detail modal */
  specialNote?: string;
};

// ─────────────────────────────────────────────────────────────────────────
// Placeholder colours + emoji
// ─────────────────────────────────────────────────────────────────────────

/**
 * Card placeholder styling for every known meal/drink/side.
 * When a real photo is missing, the card renders
 * `bg` as background colour and `emoji` as a large centred glyph.
 */
export const MEAL_PLACEHOLDER_COLORS: Record<
  string,
  { bg: string; accent: string; emoji: string }
> = {
  // ── Meals ──────────────────────────────────────────────────────────────
  "Banana-Chocolate Pancakes": { bg: "#FEF3C7", accent: "#92400E", emoji: "🥞" },
  "Broccoli-Cheddar Quiche":   { bg: "#DCFCE7", accent: "#166534", emoji: "🥧" },
  "Caesar Salad with Chicken": { bg: "#D1FAE5", accent: "#065F46", emoji: "🥗" },
  "Citrus Butter Salmon":      { bg: "#DBEAFE", accent: "#1E40AF", emoji: "🐟" },
  "Chicken Bruschetta":        { bg: "#FEE2E2", accent: "#991B1B", emoji: "🍗" },
  "Breakfast Banana Split":    { bg: "#FCE7F3", accent: "#9D174D", emoji: "🍌" },
  "Herb Baked Chicken":        { bg: "#FEF3C7", accent: "#78350F", emoji: "🍗" },
  "Garden Vegetable Medley":   { bg: "#DCFCE7", accent: "#14532D", emoji: "🥦" },
  "Strawberry Belgian Waffle": { bg: "#FCE7F3", accent: "#831843", emoji: "🧇" },
  "Spring Menu Special":       { bg: "#E0E7FF", accent: "#3730A3", emoji: "🌸" },
  "Grilled Salmon Fillet":     { bg: "#CFFAFE", accent: "#155E75", emoji: "🐟" },
  "Oatmeal Bowl":              { bg: "#FEF3C7", accent: "#78350F", emoji: "🥣" },

  // ── Drinks ─────────────────────────────────────────────────────────────
  "Fresh Orange Juice":   { bg: "#FEF3C7", accent: "#B45309", emoji: "🍊" },
  "Hot Green Tea":        { bg: "#DCFCE7", accent: "#166534", emoji: "🍵" },
  "Hot Coffee":           { bg: "#451A03", accent: "#FDE68A", emoji: "☕" },
  "Mixed Berry Smoothie": { bg: "#FCE7F3", accent: "#9D174D", emoji: "🍓" },
  "Warm Apple Cider":     { bg: "#FEF3C7", accent: "#92400E", emoji: "🍎" },
  "Sparkling Water":      { bg: "#CFFAFE", accent: "#155E75", emoji: "💧" },
  "Whole Milk":           { bg: "#F0FDF4", accent: "#166534", emoji: "🥛" },
  "Decaf Coffee":         { bg: "#78350F", accent: "#FDE68A", emoji: "☕" },
  "Chamomile Tea":        { bg: "#FFFBEB", accent: "#92400E", emoji: "🌼" },
  "Cranberry Juice":      { bg: "#FEE2E2", accent: "#991B1B", emoji: "🫐" },
  "Apple Juice":          { bg: "#ECFDF5", accent: "#065F46", emoji: "🍏" },
  "Hot Cocoa":            { bg: "#3B1A0E", accent: "#FDE68A", emoji: "🍫" },

  // ── Sides ──────────────────────────────────────────────────────────────
  "Chicken Noodle Soup":      { bg: "#FEF3C7", accent: "#92400E", emoji: "🍲" },
  "Garden Side Salad":        { bg: "#DCFCE7", accent: "#166534", emoji: "🥗" },
  "Vanilla Ice Cream":        { bg: "#EFF6FF", accent: "#1E40AF", emoji: "🍨" },
  "Apple Pie Slice":          { bg: "#FEF3C7", accent: "#78350F", emoji: "🥧" },
  "Chocolate Chip Cookies":   { bg: "#FDE68A", accent: "#92400E", emoji: "🍪" },
  "Fresh Fruit Cup":          { bg: "#FCE7F3", accent: "#9D174D", emoji: "🍓" },
  "Tomato Basil Soup":        { bg: "#FEE2E2", accent: "#991B1B", emoji: "🍅" },
  "Rice Pudding":             { bg: "#FFFBEB", accent: "#78350F", emoji: "🍚" },
};

/**
 * Safe accessor – returns a neutral grey placeholder
 * when the meal name is not in `MEAL_PLACEHOLDER_COLORS`.
 */
export const getMealPlaceholder = (mealName: string) =>
  MEAL_PLACEHOLDER_COLORS[mealName] ?? { bg: "#F3F4F6", accent: "#6B7280", emoji: "🍽" };

// ─────────────────────────────────────────────────────────────────────────
// Static image assets  (organised into subfolders for clarity)
//   meals/   – main-course photos
//   drinks/  – beverage photos
//   sides/   – side-dish photos
// ─────────────────────────────────────────────────────────────────────────

/** Static `require()` map keyed by meal name → bundled image asset */
export const MEAL_IMAGES: Record<string, any> = {
  // ── Meals  (src/styles/pictures/meals/) ────────────────────────────────
  "Banana-Chocolate Pancakes": require("../styles/pictures/meals/Chocolate-chip-banana-pancakes.jpg"),
  "Broccoli-Cheddar Quiche":   require("../styles/pictures/meals/Broccoli-Quiche.jpg"),
  "Caesar Salad with Chicken": require("../styles/pictures/meals/Chicken-Caesar-Salad.png"),
  "Citrus Butter Salmon":      require("../styles/pictures/meals/Citrus-butter-salmon.png"),
  "Chicken Bruschetta":        require("../styles/pictures/meals/Grilled_Bruschetta_Chicken.jpg"),
  "Breakfast Banana Split":    require("../styles/pictures/meals/Breakfast-banana-split.webp"),
  "Herb Baked Chicken":        require("../styles/pictures/meals/herb-baked-chicken.png"),
  "Garden Vegetable Medley":   require("../styles/pictures/meals/Seasonal vegetables.png"),

  // ── Drinks  (src/styles/pictures/drinks/) ──────────────────────────────
  "Fresh Orange Juice":   require("../styles/pictures/drinks/drink-orange-juice.jpg"),
  "Hot Green Tea":        require("../styles/pictures/drinks/drink-green-tea.jpg"),
  "Hot Coffee":           require("../styles/pictures/drinks/drink-coffee.jpg"),
  "Mixed Berry Smoothie": require("../styles/pictures/drinks/drink-berry-smoothie.jpg"),
  "Warm Apple Cider":     require("../styles/pictures/drinks/drink-apple-cider.jpg"),
  "Sparkling Water":      require("../styles/pictures/drinks/drink-sparkling-water.jpg"),
  "Whole Milk":           require("../styles/pictures/drinks/drink-milk.jpg"),
  "Decaf Coffee":         require("../styles/pictures/drinks/drink-decaf-coffee.jpg"),
  "Chamomile Tea":        require("../styles/pictures/drinks/drink-chamomile-tea.jpg"),
  "Cranberry Juice":      require("../styles/pictures/drinks/drink-cranberry.jpg"),
  "Apple Juice":          require("../styles/pictures/drinks/drink-apple-juice.jpg"),
  "Hot Cocoa":            require("../styles/pictures/drinks/drink-hot-cocoa.jpg"),

  // ── Sides  (src/styles/pictures/sides/) ────────────────────────────────
  "Chicken Noodle Soup":    require("../styles/pictures/sides/side-chicken-noodle-soup.jpg"),
  "Garden Side Salad":      require("../styles/pictures/sides/side-garden-salad.jpg"),
  "Vanilla Ice Cream":      require("../styles/pictures/sides/side-vanilla-ice-cream.jpg"),
  "Apple Pie Slice":        require("../styles/pictures/sides/side-apple-pie.jpg"),
  "Chocolate Chip Cookies": require("../styles/pictures/sides/side-chocolate-chip-cookies.jpg"),
  "Fresh Fruit Cup":        require("../styles/pictures/sides/side-fruit-cup.jpg"),
  "Tomato Basil Soup":      require("../styles/pictures/sides/side-tomato-basil-soup.jpg"),
  "Rice Pudding":           require("../styles/pictures/sides/side-rice-pudding.jpg"),
};

/**
 * Safe accessor – returns `null` when no bundled image exists,
 * so the UI can fall back to the emoji placeholder.
 */
export const getMealImage = (mealName: string): any | null =>
  MEAL_IMAGES[mealName] ?? null;

// ─────────────────────────────────────────────────────────────────────────
// Service → display mapping
// ─────────────────────────────────────────────────────────────────────────

/**
 * Converts a `Meal` from `localDataService.ts` (the "service" shape)
 * into the flat `DisplayMeal` used by the browse list and cart.
 *
 * Notable quirk: `"All Day"` meals are displayed as `"Lunch"` because
 * the browse-screen local type doesn't include `"All Day"`.
 * The tab filter runs **before** this mapping, so it still works correctly.
 */
export const mapServiceMeal = (m: ServiceMeal): DisplayMeal => ({
  id: String(m.id),
  name: m.name,
  meal_period: (m.mealPeriod === "All Day"
    ? "Lunch"
    : m.mealPeriod) as DisplayMeal["meal_period"],
  description: m.description,
  time_range: m.timeRange,
  kcal: m.nutrition.calories,
  sodium_mg: parseInt(String(m.nutrition.sodium).replace(/[^\d]/g, "") || "0", 10),
  protein_g: parseInt(String(m.nutrition.protein).replace(/[^\d]/g, "") || "0", 10),
  imageUrl: m.imageUrl,
  tags: m.tags ?? [],
  allergens: m.allergenInfo ?? [],
  isSeasonal: m.isSeasonal ?? false,
});
