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

const API_BASE_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://127.0.0.1:8000";

function splitCommaList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseNutrition(nutri_info: string, nutri_amounts: string): Nutrition {
  // Example:
  // nutri_info = "Calories, Total Fat, Cholesterol, Carbohydrate, Fiber, Sugar, Sodium, Protein"
  // nutri_amounts = "372, 11g, 64mg, 61g, 3.1g, 17g, 240mg, 10g"

  const keys = splitCommaList(nutri_info).map((k) => k.toLowerCase());
  const vals = splitCommaList(nutri_amounts);

  const map = new Map<string, string>();
  keys.forEach((k, i) => map.set(k, vals[i] ?? ""));

  // build Nutrition with safe defaults
  return {
    calories: Number(map.get("calories") ?? 0) || 0,
    totalFat: map.get("total fat") ?? "",
    saturatedFat: map.get("saturated fat") || undefined,
    transFat: map.get("trans fat") || undefined,
    cholesterol: map.get("cholesterol") ?? "",
    carbohydrate: map.get("carbohydrate") ?? map.get("carbogydrate") ?? "",
    fiber: map.get("fiber") ?? "",
    sugar: map.get("sugar") ?? "",
    sodium: map.get("sodium") ?? "",
    protein: map.get("protein") ?? "",
  };
}

function normalizeMealPeriod(value: string): Meal["mealPeriod"] {
  const v = value.trim();
  if (v.includes("Drinks") || v.includes("Beverage")) return "Drinks";
  if (v.includes("Breakfast")) return "Breakfast";
  if (v.includes("Lunch")) return "Lunch";
  if (v.includes("Dinner")) return "Dinner";
  return "All Day";
}

// Converts one API row into your app's Meal interface
function apiMealToMeal(api: any): Meal {
  return {
    id: api.id,
    name: api.name,
    ingredients: splitCommaList(api.ingredients),
    nutrition: parseNutrition(api.nutri_info ?? "", api.nutri_amounts ?? ""),
    description: api.description ?? "",
    imageUrl: api.image_url ?? "",
    mealType: api.mealtype ?? "",
    mealPeriod: normalizeMealPeriod(api.mealPeriod ?? "All Day"),
    timeRange: api.time_range ?? "",
    allergenInfo: splitCommaList(api.allergen_info),
    tags: splitCommaList(api.tags),
    isAvailable: Boolean(api.isAvailable),
    isSeasonal: Boolean(api.isSeasonal),
  };
}

// Fallback meals for when the API is unreachable
const FALLBACK_MEALS: Meal[] = [
  { id: 1, name: "Banana-Chocolate Pancakes", ingredients: ["Flour","Sugar","Baking Powder","Cinnamon","Milk","Banana","Egg","Vanilla","Chocolate Chips"], nutrition: { calories: 372, totalFat: "11g", cholesterol: "64mg", carbohydrate: "61g", fiber: "3.1g", sugar: "17g", sodium: "240mg", protein: "10g" }, description: "Pancakes topped with fresh sliced bananas and chocolate chips, served with scrambled eggs.", imageUrl: "", mealType: "B", mealPeriod: "Breakfast", timeRange: "7am - 9am", allergenInfo: ["Eggs","Dairy","Gluten"], tags: ["Contains Dairy","Contains Eggs"], isAvailable: true, isSeasonal: false },
  { id: 2, name: "Broccoli-Cheddar Quiche", ingredients: ["AP Flour","Sugar","Salt","Eggs","Butter","Garlic","Heavy Cream","Cheese","Pepper","Broccoli"], nutrition: { calories: 746, totalFat: "58g", saturatedFat: "34g", transFat: "1.1g", cholesterol: "411mg", carbohydrate: "37g", fiber: "1.2g", sugar: "3.2g", sodium: "680mg", protein: "22g" }, description: "Diced broccoli with cheddar and parmesan cheese in a traditional quiche.", imageUrl: "", mealType: "B", mealPeriod: "Breakfast", timeRange: "7am - 9am", allergenInfo: ["Eggs","Dairy","Gluten"], tags: ["Vegetarian","High Protein"], isAvailable: true, isSeasonal: false },
  { id: 3, name: "Caesar Salad with Chicken", ingredients: ["Croutons","Chicken","Parmesan Cheese","Caesar Dressing","Romaine Lettuce"], nutrition: { calories: 250, totalFat: "18g", cholesterol: "66mg", carbohydrate: "2g", fiber: "1g", sugar: "1g", sodium: "405mg", protein: "20g" }, description: "Fresh romaine, caesar dressing, shaved parmesan, and herb croutons.", imageUrl: "", mealType: "L, D", mealPeriod: "All Day", timeRange: "11am - 7pm", allergenInfo: ["Dairy","Gluten"], tags: ["High Protein","Low Carb"], isAvailable: true, isSeasonal: false },
  { id: 4, name: "Citrus Butter Salmon", ingredients: ["Salmon","Olive Oil","Basil","Parsley","Salt","Pepper","Lemon","Butter"], nutrition: { calories: 239, totalFat: "17g", cholesterol: "52mg", carbohydrate: "1g", fiber: "0.3g", sugar: "0.2g", sodium: "135mg", protein: "19g" }, description: "Fresh salmon with brown sugar-lemon seasoning topped with compound butter.", imageUrl: "", mealType: "D", mealPeriod: "Dinner", timeRange: "5pm - 7pm", allergenInfo: ["Fish","Dairy"], tags: ["Low Sodium","Heart Healthy","Omega-3","High Protein"], isAvailable: true, isSeasonal: false },
  { id: 5, name: "Chicken Bruschetta", ingredients: ["Olive Oil","Chicken","Oregano","Garlic","Salt","Pepper","Tomatoes","Basil","Parmesan"], nutrition: { calories: 266, totalFat: "13g", saturatedFat: "2.1g", cholesterol: "83mg", carbohydrate: "9g", fiber: "2.6g", sugar: "3.7g", sodium: "582mg", protein: "28g" }, description: "A baked chicken breast topped with fresh tomatoes, garlic, and basil.", imageUrl: "", mealType: "D", mealPeriod: "Dinner", timeRange: "5pm - 7pm", allergenInfo: ["Dairy"], tags: ["High Protein"], isAvailable: true, isSeasonal: false },
  { id: 6, name: "Breakfast Banana Split", ingredients: ["Banana","Greek Yogurt","Granola","Honey","Strawberries","Blueberries"], nutrition: { calories: 212, totalFat: "4.5g", cholesterol: "6mg", carbohydrate: "36g", fiber: "2.6g", sugar: "26g", sodium: "84mg", protein: "8g" }, description: "Fresh sliced banana with vanilla Greek yogurt, fresh berries, granola and honey.", imageUrl: "", mealType: "B", mealPeriod: "Breakfast", timeRange: "7am - 9am", allergenInfo: ["Dairy","Nuts"], tags: ["Vegetarian","Low Sodium","Healthy Choice"], isAvailable: true, isSeasonal: false },
  { id: 7, name: "Herb Baked Chicken", ingredients: ["Chicken Breast","Olive Oil","Rosemary","Thyme","Garlic","Salt","Pepper"], nutrition: { calories: 420, totalFat: "12g", cholesterol: "125mg", carbohydrate: "8g", fiber: "2g", sugar: "2g", sodium: "380mg", protein: "45g" }, description: "Steamed White Rice, Seasonal Vegetables", imageUrl: "", mealType: "L", mealPeriod: "Lunch", timeRange: "11am - 1pm", allergenInfo: [], tags: ["Low Sodium","Heart Healthy","High Protein"], isAvailable: true, isSeasonal: false },
  { id: 8, name: "Garden Vegetable Medley", ingredients: ["Zucchini","Bell Peppers","Carrots","Broccoli","Olive Oil","Herbs"], nutrition: { calories: 180, totalFat: "8g", cholesterol: "0mg", carbohydrate: "24g", fiber: "6g", sugar: "8g", sodium: "240mg", protein: "6g" }, description: "Fresh Seasonal Vegetables", imageUrl: "", mealType: "L", mealPeriod: "Lunch", timeRange: "11am - 1pm", allergenInfo: [], tags: ["Vegetarian","Vegan","Heart Healthy","Low Calorie"], isAvailable: true, isSeasonal: true },
  { id: 9, name: "Strawberry Belgian Waffle", ingredients: ["Flour","Eggs","Butter","Milk","Sugar","Strawberries","Whipped Cream"], nutrition: { calories: 350, totalFat: "14g", cholesterol: "95mg", carbohydrate: "48g", fiber: "2g", sugar: "22g", sodium: "420mg", protein: "8g" }, description: "Fresh Berries, Light Syrup", imageUrl: "", mealType: "B", mealPeriod: "Breakfast", timeRange: "7am - 9am", allergenInfo: ["Eggs","Dairy","Gluten"], tags: ["Contains Dairy"], isAvailable: true, isSeasonal: false },
  { id: 10, name: "Spring Menu Special", ingredients: ["Chef's Selection"], nutrition: { calories: 480, totalFat: "18g", cholesterol: "85mg", carbohydrate: "32g", fiber: "4g", sugar: "6g", sodium: "520mg", protein: "32g" }, description: "Chef's Daily Creation", imageUrl: "", mealType: "D", mealPeriod: "Dinner", timeRange: "5pm - 7pm", allergenInfo: [], tags: ["Chef Special"], isAvailable: true, isSeasonal: true },
  { id: 11, name: "Grilled Salmon Fillet", ingredients: ["Atlantic Salmon","Lemon","Dill","Olive Oil","Asparagus"], nutrition: { calories: 390, totalFat: "22g", cholesterol: "78mg", carbohydrate: "4g", fiber: "2g", sugar: "1g", sodium: "320mg", protein: "38g" }, description: "Citrus Butter, Roasted Asparagus", imageUrl: "", mealType: "D", mealPeriod: "Dinner", timeRange: "5pm - 7pm", allergenInfo: ["Fish"], tags: ["Low Sodium","Heart Healthy","Omega-3","High Protein"], isAvailable: true, isSeasonal: false },
  { id: 12, name: "Oatmeal Bowl", ingredients: ["Steel Cut Oats","Milk","Honey","Blueberries","Almonds","Cinnamon"], nutrition: { calories: 280, totalFat: "8g", cholesterol: "5mg", carbohydrate: "45g", fiber: "6g", sugar: "18g", sodium: "120mg", protein: "12g" }, description: "Fresh Berries, Honey, Almonds", imageUrl: "", mealType: "B", mealPeriod: "Breakfast", timeRange: "7am - 9am", allergenInfo: ["Dairy","Nuts"], tags: ["Vegetarian","Heart Healthy","High Fiber"], isAvailable: true, isSeasonal: false },
  // Drinks (elder-care curated selection)
  { id: 13, name: "Fresh Orange Juice",   ingredients: ["Oranges"],                                                                  nutrition: { calories: 112, totalFat: "0g",  cholesterol: "0mg",  carbohydrate: "26g", fiber: "0.5g", sugar: "21g", sodium: "2mg",   protein: "2g" }, description: "Freshly squeezed orange juice, chilled and vitamin-rich.", imageUrl: "", mealType: "D", mealPeriod: "Drinks", timeRange: "7am – 8pm", allergenInfo: [],         tags: ["Vegan","Low Sodium","Vitamin C"],                 isAvailable: true,  isSeasonal: false },
  { id: 14, name: "Hot Green Tea",        ingredients: ["Green Tea Leaves","Water"],                                                 nutrition: { calories: 2,   totalFat: "0g",  cholesterol: "0mg",  carbohydrate: "0g",  fiber: "0g",   sugar: "0g",  sodium: "2mg",   protein: "0g" }, description: "Lightly brewed green tea served hot. Antioxidant-rich.",   imageUrl: "", mealType: "D", mealPeriod: "Drinks", timeRange: "7am – 8pm", allergenInfo: [],         tags: ["Vegan","Low Calorie","Antioxidant"],              isAvailable: true,  isSeasonal: false },
  { id: 15, name: "Hot Coffee",           ingredients: ["Coffee Beans","Water"],                                                     nutrition: { calories: 5,   totalFat: "0g",  cholesterol: "0mg",  carbohydrate: "0g",  fiber: "0g",   sugar: "0g",  sodium: "5mg",   protein: "0g" }, description: "Freshly brewed drip coffee. Available with cream or sugar.", imageUrl: "", mealType: "D", mealPeriod: "Drinks", timeRange: "7am – 2pm", allergenInfo: [],         tags: ["Low Calorie","Caffeine"],                         isAvailable: true,  isSeasonal: false },
  { id: 16, name: "Mixed Berry Smoothie", ingredients: ["Strawberries","Blueberries","Raspberries","Greek Yogurt","Honey","Milk"],   nutrition: { calories: 180, totalFat: "2g",  cholesterol: "8mg",  carbohydrate: "35g", fiber: "4g",   sugar: "24g", sodium: "65mg",  protein: "8g" }, description: "Thick blend of fresh berries with Greek yogurt and honey.",  imageUrl: "", mealType: "D", mealPeriod: "Drinks", timeRange: "7am – 4pm", allergenInfo: ["Dairy"], tags: ["Vegetarian","High Fiber","Vitamin C"],            isAvailable: true,  isSeasonal: false },
  { id: 17, name: "Warm Apple Cider",     ingredients: ["Apple Juice","Cinnamon","Cloves","Nutmeg"],                                 nutrition: { calories: 120, totalFat: "0g",  cholesterol: "0mg",  carbohydrate: "30g", fiber: "0g",   sugar: "28g", sodium: "10mg",  protein: "0g" }, description: "Warm spiced apple cider with cinnamon and cloves.",         imageUrl: "", mealType: "D", mealPeriod: "Drinks", timeRange: "8am – 8pm", allergenInfo: [],         tags: ["Vegan","Seasonal","Warming"],                     isAvailable: true,  isSeasonal: true  },
  { id: 18, name: "Sparkling Water",      ingredients: ["Carbonated Water","Natural Lemon Flavoring"],                              nutrition: { calories: 0,   totalFat: "0g",  cholesterol: "0mg",  carbohydrate: "0g",  fiber: "0g",   sugar: "0g",  sodium: "20mg",  protein: "0g" }, description: "Lightly lemon-flavored sparkling water. Refreshing.",       imageUrl: "", mealType: "D", mealPeriod: "Drinks", timeRange: "7am – 8pm", allergenInfo: [],         tags: ["Vegan","Low Calorie","Low Sodium"],               isAvailable: true,  isSeasonal: false },
  { id: 19, name: "Whole Milk",           ingredients: ["Whole Milk"],                                                              nutrition: { calories: 149, totalFat: "8g",  cholesterol: "24mg", carbohydrate: "12g", fiber: "0g",   sugar: "12g", sodium: "107mg", protein: "8g" }, description: "Cold whole milk, rich in calcium and protein.",             imageUrl: "", mealType: "D", mealPeriod: "Drinks", timeRange: "7am – 8pm", allergenInfo: ["Dairy"], tags: ["Vegetarian","High Protein","Calcium"],            isAvailable: true,  isSeasonal: false },
  { id: 20, name: "Decaf Coffee",         ingredients: ["Decaffeinated Coffee","Water"],                                            nutrition: { calories: 5,   totalFat: "0g",  cholesterol: "0mg",  carbohydrate: "0g",  fiber: "0g",   sugar: "0g",  sodium: "5mg",   protein: "0g" }, description: "Full-bodied decaf coffee — all the flavour, no caffeine.",  imageUrl: "", mealType: "D", mealPeriod: "Drinks", timeRange: "7am – 8pm", allergenInfo: [],         tags: ["Low Calorie","Decaf","Caffeine-Free"],            isAvailable: true,  isSeasonal: false },
  { id: 21, name: "Chamomile Tea",        ingredients: ["Chamomile Flowers","Water","Honey"],                                       nutrition: { calories: 5,   totalFat: "0g",  cholesterol: "0mg",  carbohydrate: "1g",  fiber: "0g",   sugar: "1g",  sodium: "2mg",   protein: "0g" }, description: "Soothing chamomile herbal tea with a touch of honey.",      imageUrl: "", mealType: "D", mealPeriod: "Drinks", timeRange: "8am – 8pm", allergenInfo: [],         tags: ["Vegan","Calming","Caffeine-Free"],                isAvailable: true,  isSeasonal: false },
  { id: 22, name: "Cranberry Juice",      ingredients: ["Cranberry Juice","Water","Sugar"],                                         nutrition: { calories: 116, totalFat: "0g",  cholesterol: "0mg",  carbohydrate: "30g", fiber: "0.5g", sugar: "28g", sodium: "5mg",   protein: "0g" }, description: "100% cranberry juice. Supports urinary tract health.",      imageUrl: "", mealType: "D", mealPeriod: "Drinks", timeRange: "7am – 8pm", allergenInfo: [],         tags: ["Vegan","Antioxidant","UTI Prevention"],          isAvailable: true,  isSeasonal: false },
  { id: 23, name: "Apple Juice",          ingredients: ["Pressed Apples","Water"],                                                  nutrition: { calories: 114, totalFat: "0g",  cholesterol: "0mg",  carbohydrate: "28g", fiber: "0.5g", sugar: "24g", sodium: "7mg",   protein: "0g" }, description: "Clear, mild apple juice — easy on sensitive stomachs.",     imageUrl: "", mealType: "D", mealPeriod: "Drinks", timeRange: "7am – 8pm", allergenInfo: [],         tags: ["Vegan","Low Sodium","Gentle"],                   isAvailable: true,  isSeasonal: false },
  { id: 24, name: "Hot Cocoa",            ingredients: ["Cocoa Powder","Milk","Sugar","Vanilla"],                                   nutrition: { calories: 192, totalFat: "6g",  cholesterol: "18mg", carbohydrate: "30g", fiber: "2g",   sugar: "25g", sodium: "120mg", protein: "8g" }, description: "Warm, creamy hot cocoa made with real milk and cocoa.",     imageUrl: "", mealType: "D", mealPeriod: "Drinks", timeRange: "7am – 8pm", allergenInfo: ["Dairy"], tags: ["Vegetarian","Warming","Comfort"],                 isAvailable: true,  isSeasonal: false },
];

async function fetchMealsFromApi(): Promise<Meal[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout
    const res = await fetch(`${API_BASE_URL}/meals`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Failed to fetch meals: HTTP ${res.status}`);
    const data = await res.json();
    return data.map(apiMealToMeal);
  } catch (error) {
    console.warn("API unreachable, using fallback meals:", error);
    return FALLBACK_MEALS;
  }
}

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
  mealPeriod: 'Breakfast' | 'Lunch' | 'Dinner' | 'All Day' | 'Drinks';
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

// ==================== MEALS DATABASE ====================
// Data imported from meals_db.csv

// const MEALS_DATABASE: Meal[] = [
//   {
//     id: 1,
//     name: "Banana-Chocolate Pancakes",
//     ingredients: ["Flour", "Sugar", "Baking Powder", "Cinnamon", "Milk", "Banana", "Egg", "Vanilla", "Chocolate Chips"],
//     nutrition: {
      // calories: 372,
      // totalFat: "11g",
      // cholesterol: "64mg",
      // carbohydrate: "61g",
      // fiber: "3.1g",
      // sugar: "17g",
      // sodium: "240mg",
      // protein: "10g"
//     },
//     description: "Pancakes topped with fresh sliced bananas and chocolate chips, served with scrambled eggs and your choice of bacon or sausage.",
//     imageUrl: "",
//     mealType: "B",
//     mealPeriod: "Breakfast",
//     timeRange: "7am - 9am",
//     allergenInfo: ["Eggs", "Dairy", "Gluten"],
//     tags: ["Contains Dairy", "Contains Eggs"],
//     isAvailable: true,
//     isSeasonal: false
//   },
//   {
//     id: 2,
//     name: "Broccoli-Cheddar Quiche",
//     ingredients: ["AP Flour", "Sugar", "Salt", "Eggs", "White Vinegar", "Water", "Butter", "Garlic", "Heavy Cream", "Cheese", "Pepper", "Broccoli"],
//     nutrition: {
      // calories: 746,
      // totalFat: "58g",
      // saturatedFat: "34g",
      // transFat: "1.1g",
      // cholesterol: "411mg",
      // carbohydrate: "37g",
      // fiber: "1.2g",
      // sugar: "3.2g",
      // sodium: "680mg",
      // protein: "22g"
//     },
//     description: "Diced broccoli with cheddar and parmesan cheese in a traditional quiche - served with fresh fruit.",
//     imageUrl: "",
//     mealType: "B",
//     mealPeriod: "Breakfast",
//     timeRange: "7am - 9am",
//     allergenInfo: ["Eggs", "Dairy", "Gluten"],
//     tags: ["Vegetarian", "High Protein"],
//     isAvailable: true,
//     isSeasonal: false
//   },
//   {
//     id: 3,
//     name: "Caesar Salad with Chicken",
//     ingredients: ["Croutons", "Chicken", "Parmesan Cheese", "Caesar Dressing", "Romaine Lettuce"],
//     nutrition: {
      // calories: 250,
      // totalFat: "18g",
      // cholesterol: "66mg",
      // carbohydrate: "2g",
      // fiber: "1g",
      // sugar: "1g",
      // sodium: "405mg",
      // protein: "20g"
//     },
//     description: "Fresh romaine, caesar dressing, shaved parmesan, and herb croutons. Add chicken or salmon if desired.",
//     imageUrl: "",
//     mealType: "L, D",
//     mealPeriod: "All Day",
//     timeRange: "11am - 7pm",
//     allergenInfo: ["Dairy", "Gluten"],
//     tags: ["High Protein", "Low Carb"],
//     isAvailable: true,
//     isSeasonal: false
//   },
//   {
//     id: 4,
//     name: "Citrus Butter Salmon",
//     ingredients: ["Salmon", "Olive Oil", "Basil", "Parsley", "Salt", "Pepper", "Lemon", "Butter"],
//     nutrition: {
//       calories: 239,
//       totalFat: "17g",
//       cholesterol: "52mg",
//       carbohydrate: "1g",
//       fiber: "0.3g",
//       sugar: "0.2g",
//       sodium: "135mg",
//       protein: "19g"
//     },
//     description: "Fresh salmon with brown sugar-lemon seasoning - topped with compound butter and citrus salsa - served with mashed potatoes and seasonal vegetables.",
//     imageUrl: "",
//     mealType: "D",
//     mealPeriod: "Dinner",
//     timeRange: "5pm - 7pm",
//     allergenInfo: ["Fish", "Dairy"],
//     tags: ["Low Sodium", "Heart Healthy", "Omega-3", "High Protein"],
//     isAvailable: true,
//     isSeasonal: false
//   },
//   {
//     id: 5,
//     name: "Chicken Bruschetta",
//     ingredients: ["Olive Oil", "Chicken", "Oregano", "Garlic", "Salt", "Pepper", "Tomatoes", "Shallot", "Basil", "Parmesan", "Balsamic Glaze"],
//     nutrition: {
      // calories: 266,
      // totalFat: "13g",
      // saturatedFat: "2.1g",
      // cholesterol: "83mg",
      // carbohydrate: "9g",
      // fiber: "2.6g",
      // sugar: "3.7g",
      // sodium: "582mg",
      // protein: "28g"
//     },
//     description: "A baked chicken breast topped with fresh tomatoes, garlic, and basil - served with herbed corn and a baked potato.",
//     imageUrl: "",
//     mealType: "D",
//     mealPeriod: "Dinner",
//     timeRange: "5pm - 7pm",
//     allergenInfo: ["Dairy"],
//     tags: ["High Protein"],
//     isAvailable: true,
//     isSeasonal: false
//   },
//   {
//     id: 6,
//     name: "Breakfast Banana Split",
//     ingredients: ["Banana", "Greek Yogurt", "Granola", "Honey", "Strawberries", "Blueberries", "Blackberries"],
//     nutrition: {
//       calories: 212,
//       totalFat: "4.5g",
//       cholesterol: "6mg",
//       carbohydrate: "36g",
//       fiber: "2.6g",
//       sugar: "26g",
//       sodium: "84mg",
//       protein: "8g"
//     },
//     description: "Fresh sliced banana, with scoops of vanilla Greek yogurt, fresh berries, topped with granola and honey.",
//     imageUrl: "",
//     mealType: "B",
//     mealPeriod: "Breakfast",
//     timeRange: "7am - 9am",
//     allergenInfo: ["Dairy", "Nuts"],
//     tags: ["Vegetarian", "Low Sodium", "Healthy Choice"],
//     isAvailable: true,
//     isSeasonal: false
//   },
//   // Additional meals to match the Figma design
//   {
//     id: 7,
//     name: "Herb Baked Chicken",
//     ingredients: ["Chicken Breast", "Olive Oil", "Rosemary", "Thyme", "Garlic", "Salt", "Pepper"],
//     nutrition: {
//       calories: 420,
//       totalFat: "12g",
//       cholesterol: "125mg",
//       carbohydrate: "8g",
//       fiber: "2g",
//       sugar: "2g",
//       sodium: "380mg",
//       protein: "45g"
//     },
//     description: "Steamed White Rice, Seasonal Vegetables",
//     imageUrl: "",
//     mealType: "L",
//     mealPeriod: "Lunch",
//     timeRange: "11am - 1pm",
//     allergenInfo: [],
//     tags: ["Low Sodium", "Heart Healthy", "High Protein"],
//     isAvailable: true,
//     isSeasonal: false
//   },
//   {
//     id: 8,
//     name: "Garden Vegetable Medley",
//     ingredients: ["Zucchini", "Bell Peppers", "Carrots", "Broccoli", "Olive Oil", "Herbs"],
//     nutrition: {
//       calories: 180,
//       totalFat: "8g",
//       cholesterol: "0mg",
//       carbohydrate: "24g",
//       fiber: "6g",
//       sugar: "8g",
//       sodium: "240mg",
//       protein: "6g"
//     },
//     description: "Fresh Seasonal Vegetables",
//     imageUrl: "",
//     mealType: "L",
//     mealPeriod: "Lunch",
//     timeRange: "11am - 1pm",
//     allergenInfo: [],
//     tags: ["Vegetarian", "Vegan", "Heart Healthy", "Low Calorie"],
//     isAvailable: true,
//     isSeasonal: true
//   },
//   {
//     id: 9,
//     name: "Strawberry Belgian Waffle",
//     ingredients: ["Flour", "Eggs", "Butter", "Milk", "Sugar", "Strawberries", "Whipped Cream", "Maple Syrup"],
//     nutrition: {
//       calories: 350,
//       totalFat: "14g",
//       cholesterol: "95mg",
//       carbohydrate: "48g",
//       fiber: "2g",
//       sugar: "22g",
//       sodium: "420mg",
//       protein: "8g"
//     },
//     description: "Fresh Berries, Light Syrup",
//     imageUrl: "",
//     mealType: "B",
//     mealPeriod: "Breakfast",
//     timeRange: "7am - 9am",
//     allergenInfo: ["Eggs", "Dairy", "Gluten"],
//     tags: ["Contains Dairy"],
//     isAvailable: true,
//     isSeasonal: false
//   },
//   {
//     id: 10,
//     name: "Spring Menu Special",
//     ingredients: ["Chef's Selection"],
//     nutrition: {
//       calories: 480,
//       totalFat: "18g",
//       cholesterol: "85mg",
//       carbohydrate: "32g",
//       fiber: "4g",
//       sugar: "6g",
//       sodium: "520mg",
//       protein: "32g"
//     },
//     description: "Chef's Daily Creation",
//     imageUrl: "",
//     mealType: "D",
//     mealPeriod: "Dinner",
//     timeRange: "5pm - 7pm",
//     allergenInfo: [],
//     tags: ["Chef Special"],
//     isAvailable: true,
//     isSeasonal: true
//   },
//   {
//     id: 11,
//     name: "Grilled Salmon Fillet",
//     ingredients: ["Atlantic Salmon", "Lemon", "Dill", "Olive Oil", "Asparagus"],
//     nutrition: {
//       calories: 390,
//       totalFat: "22g",
//       cholesterol: "78mg",
//       carbohydrate: "4g",
//       fiber: "2g",
//       sugar: "1g",
//       sodium: "320mg",
//       protein: "38g"
//     },
//     description: "Citrus Butter, Roasted Asparagus",
//     imageUrl: "",
//     mealType: "D",
//     mealPeriod: "Dinner",
//     timeRange: "5pm - 7pm",
//     allergenInfo: ["Fish"],
//     tags: ["Low Sodium", "Heart Healthy", "Omega-3", "High Protein"],
//     isAvailable: true,
//     isSeasonal: false
//   },
//   {
//     id: 12,
//     name: "Oatmeal Bowl",
//     ingredients: ["Steel Cut Oats", "Milk", "Honey", "Blueberries", "Almonds", "Cinnamon"],
//     nutrition: {
//       calories: 280,
//       totalFat: "8g",
//       cholesterol: "5mg",
//       carbohydrate: "45g",
//       fiber: "6g",
//       sugar: "18g",
//       sodium: "120mg",
//       protein: "12g"
//     },
//     description: "Fresh Berries, Honey, Almonds",
//     imageUrl: "",
//     mealType: "B",
//     mealPeriod: "Breakfast",
//     timeRange: "7am - 9am",
//     allergenInfo: ["Dairy", "Nuts"],
//     tags: ["Vegetarian", "Heart Healthy", "High Fiber"],
//     isAvailable: true,
//     isSeasonal: false
//   }
// ];

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
    const meals = await fetchMealsFromApi();
    return meals.filter((m) => m.isAvailable);
  },

  getMealById: async (id: number): Promise<Meal | undefined> => {
    const meals = await fetchMealsFromApi();
    return meals.find((m) => m.id === id);
  },

  getMealsByPeriod: async (
    period: Meal["mealPeriod"] | null
  ): Promise<Meal[]> => {
    const meals = await fetchMealsFromApi();
    // null = "All" tab — exclude Drinks from general tabs
    if (!period) return meals.filter((m) => m.isAvailable && m.mealPeriod !== "Drinks");

    if (period === "Drinks") {
      return meals.filter((m) => m.isAvailable && m.mealPeriod === "Drinks");
    }

    return meals.filter((m) => {
      if (!m.isAvailable) return false;
      if (m.mealPeriod === "All Day") return true;
      return m.mealPeriod === period;
    });
  },

  searchMeals: async (query: string): Promise<Meal[]> => {
    const meals = await fetchMealsFromApi();
    const lowerQuery = query.toLowerCase();

    return meals.filter(
      (m) =>
        m.isAvailable &&
        (m.name.toLowerCase().includes(lowerQuery) ||
          m.description.toLowerCase().includes(lowerQuery) ||
          m.ingredients.some((i) => i.toLowerCase().includes(lowerQuery)) ||
          m.tags.some((t) => t.toLowerCase().includes(lowerQuery)))
    );
  },

  getMealsByTag: async (tag: string): Promise<Meal[]> => {
    const meals = await fetchMealsFromApi();
    return meals.filter(
      (m) =>
        m.isAvailable &&
        m.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
    );
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
    const meals = await fetchMealsFromApi();
    return meals.filter((m) => m.isAvailable && m.isSeasonal);
  },
};
// export const MealService = {
//   /**
//    * Get all meals
//    */
//   getAllMeals: (): Meal[] => {
//     return MEALS_DATABASE.filter(m => m.isAvailable);
//   },

//   /**
//    * Get meal by ID
//    */
//   getMealById: (id: number): Meal | undefined => {
//     return MEALS_DATABASE.find(m => m.id === id);
//   },

//   /**
//    * Get meals by period (Breakfast, Lunch, Dinner)
//    */
//   getMealsByPeriod: (period: 'Breakfast' | 'Lunch' | 'Dinner' | null): Meal[] => {
//     if (!period) return MEALS_DATABASE.filter(m => m.isAvailable);
    
//     return MEALS_DATABASE.filter(m => {
//       if (!m.isAvailable) return false;
//       if (m.mealPeriod === 'All Day') return true;
//       return m.mealPeriod === period;
//     });
//   },

//   /**
//    * Search meals by name or description
//    */
//   searchMeals: (query: string): Meal[] => {
//     const lowerQuery = query.toLowerCase();
//     return MEALS_DATABASE.filter(m => 
//       m.isAvailable && (
//         m.name.toLowerCase().includes(lowerQuery) ||
//         m.description.toLowerCase().includes(lowerQuery) ||
//         m.ingredients.some(i => i.toLowerCase().includes(lowerQuery)) ||
//         m.tags.some(t => t.toLowerCase().includes(lowerQuery))
//       )
//     );
//   },

//   /**
//    * Get meals by tag
//    */
//   getMealsByTag: (tag: string): Meal[] => {
//     return MEALS_DATABASE.filter(m => 
//       m.isAvailable && m.tags.some(t => t.toLowerCase() === tag.toLowerCase())
//     );
//   },

//   /**
//    * Get meals grouped by period
//    */
//   getMealsGroupedByPeriod: () => {
//     return {
//       breakfast: MealService.getMealsByPeriod('Breakfast'),
//       lunch: MealService.getMealsByPeriod('Lunch'),
//       dinner: MealService.getMealsByPeriod('Dinner'),
//     };
//   },

//   /**
//    * Get seasonal meals
//    */
//   getSeasonalMeals: (): Meal[] => {
//     return MEALS_DATABASE.filter(m => m.isAvailable && m.isSeasonal);
//   }
// };

// ==================== RESIDENT SERVICE ====================

export const ResidentService = {
  /**
   * Get all residents
   */
  getAllResidents: (): Resident[] => {
    return RESIDENTS_DATABASE.filter(r => r.isActive);
  },

  /**
   * Get resident by ID
   */
  getResidentById: (id: string): Resident | undefined => {
    return RESIDENTS_DATABASE.find(r => r.id === id);
  },

  /**
   * Get resident by room number
   */
  getResidentByRoom: (roomNumber: string): Resident | undefined => {
    return RESIDENTS_DATABASE.find(r => r.roomNumber === roomNumber);
  },

  /**
   * Get default resident (for demo purposes)
   */
  getDefaultResident: (): Resident => {
    return RESIDENTS_DATABASE[0]; // Bobby Johnson
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