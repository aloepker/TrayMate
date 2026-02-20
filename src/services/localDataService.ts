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
  mealPeriod: 'Breakfast' | 'Lunch' | 'Dinner' | 'All Day';
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
//       calories: 372,
//       totalFat: "11g",
//       cholesterol: "64mg",
//       carbohydrate: "61g",
//       fiber: "3.1g",
//       sugar: "17g",
//       sodium: "240mg",
//       protein: "10g"
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
//       calories: 746,
//       totalFat: "58g",
//       saturatedFat: "34g",
//       transFat: "1.1g",
//       cholesterol: "411mg",
//       carbohydrate: "37g",
//       fiber: "1.2g",
//       sugar: "3.2g",
//       sodium: "680mg",
//       protein: "22g"
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
//       calories: 250,
//       totalFat: "18g",
//       cholesterol: "66mg",
//       carbohydrate: "2g",
//       fiber: "1g",
//       sugar: "1g",
//       sodium: "405mg",
//       protein: "20g"
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
//       calories: 266,
//       totalFat: "13g",
//       saturatedFat: "2.1g",
//       cholesterol: "83mg",
//       carbohydrate: "9g",
//       fiber: "2.6g",
//       sugar: "3.7g",
//       sodium: "582mg",
//       protein: "28g"
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
  /**
   * Get all meals
   */
  getAllMeals: (): Meal[] => {
    return MEALS_DATABASE.filter(m => m.isAvailable);
  },

  /**
   * Get meal by ID
   */
  getMealById: (id: number): Meal | undefined => {
    return MEALS_DATABASE.find(m => m.id === id);
  },

  /**
   * Get meals by period (Breakfast, Lunch, Dinner)
   */
  getMealsByPeriod: (period: 'Breakfast' | 'Lunch' | 'Dinner' | null): Meal[] => {
    if (!period) return MEALS_DATABASE.filter(m => m.isAvailable);
    
    return MEALS_DATABASE.filter(m => {
      if (!m.isAvailable) return false;
      if (m.mealPeriod === 'All Day') return true;
      return m.mealPeriod === period;
    });
  },

  /**
   * Search meals by name or description
   */
  searchMeals: (query: string): Meal[] => {
    const lowerQuery = query.toLowerCase();
    return MEALS_DATABASE.filter(m => 
      m.isAvailable && (
        m.name.toLowerCase().includes(lowerQuery) ||
        m.description.toLowerCase().includes(lowerQuery) ||
        m.ingredients.some(i => i.toLowerCase().includes(lowerQuery)) ||
        m.tags.some(t => t.toLowerCase().includes(lowerQuery))
      )
    );
  },

  /**
   * Get meals by tag
   */
  getMealsByTag: (tag: string): Meal[] => {
    return MEALS_DATABASE.filter(m => 
      m.isAvailable && m.tags.some(t => t.toLowerCase() === tag.toLowerCase())
    );
  },

  /**
   * Get meals grouped by period
   */
  getMealsGroupedByPeriod: () => {
    return {
      breakfast: MealService.getMealsByPeriod('Breakfast'),
      lunch: MealService.getMealsByPeriod('Lunch'),
      dinner: MealService.getMealsByPeriod('Dinner'),
    };
  },

  /**
   * Get seasonal meals
   */
  getSeasonalMeals: (): Meal[] => {
    return MEALS_DATABASE.filter(m => m.isAvailable && m.isSeasonal);
  }
};

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

  /**
   * Get favorite meals for resident
   */
  getFavoriteMeals: (residentId: string): Meal[] => {
    const resident = ResidentService.getResidentById(residentId);
    if (!resident) return [];
    
    return resident.favoriteMealIds
      .map(id => MealService.getMealById(id))
      .filter((m): m is Meal => m !== undefined);
  }
};

// ==================== RECOMMENDATION SERVICE ====================

export const RecommendationService = {
  /**
   * Get personalized meal recommendations for a resident
   */
  getRecommendations: (
    residentId: string, 
    period?: 'Breakfast' | 'Lunch' | 'Dinner' | null,
    limit: number = 3
  ): Recommendation[] => {
    const resident = ResidentService.getResidentById(residentId);
    if (!resident) return [];

    let meals = MealService.getMealsByPeriod(period || null);
    
    // Filter out unsafe meals
    meals = meals.filter(m => ResidentService.isMealSafeForResident(m, resident));

    // Filter out meals with disliked ingredients
    meals = meals.filter(m => {
      const mealIngredients = m.ingredients.map(i => i.toLowerCase());
      return !resident.dislikedIngredients.some(disliked => 
        mealIngredients.some(ing => ing.includes(disliked.toLowerCase()))
      );
    });

    // Score each meal
    const scored = meals.map(meal => {
      let score = 50;
      const reasons: string[] = [];

      // Bonus for favorites
      if (resident.favoriteMealIds.includes(meal.id)) {
        score += 30;
        reasons.push("One of your favorites");
      }

      // Score based on nutrition goals
      const sodium = parseInt(meal.nutrition.sodium.replace(/[^\d]/g, '') || '0');
      const protein = parseInt(meal.nutrition.protein.replace(/[^\d]/g, '') || '0');

      // Low sodium bonus
      if (sodium <= resident.nutritionGoals.maxSodium / 3) {
        score += 15;
        reasons.push("Low sodium");
      }

      // High protein bonus
      if (protein >= resident.nutritionGoals.minProtein / 3) {
        score += 10;
        reasons.push("High protein");
      }

      // Heart healthy tags
      if (meal.tags.some(t => t.toLowerCase().includes('heart healthy'))) {
        const hasHeartRestriction = resident.dietaryRestrictions
          .some(r => r.name.toLowerCase().includes('heart'));
        if (hasHeartRestriction) {
          score += 20;
          reasons.push("Heart healthy");
        }
      }

      // Seasonal bonus
      if (meal.isSeasonal) {
        score += 5;
        reasons.push("Seasonal special");
      }

      return {
        meal,
        score,
        reason: reasons[0] || "Good nutritional balance",
        allReasons: reasons.length > 0 ? reasons : ["Good nutritional balance"]
      };
    });

    // Sort by score and return top recommendations
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },

  /**
   * Get the top recommendation for AI banner
   */
  getTopRecommendation: (residentId: string, period?: 'Breakfast' | 'Lunch' | 'Dinner' | null) => {
    const recommendations = RecommendationService.getRecommendations(residentId, period, 1);
    if (recommendations.length === 0) return null;

    const resident = ResidentService.getResidentById(residentId);
    const rec = recommendations[0];
    
    const restrictions = resident?.dietaryRestrictions.map(r => r.name) || [];

    return {
      meal_name: rec.meal.name,
      reason: `Based on their dietary restrictions (${restrictions.join(', ')}), we suggest the`,
      dietary_restrictions: restrictions
    };
  }
};

// ==================== ORDER SERVICE ====================

export const OrderService = {
  /**
   * Create a new order
   */
  createOrder: (
    residentId: string,
    items: { mealId: number; quantity: number; specialInstructions?: string }[],
    mealPeriod: 'Breakfast' | 'Lunch' | 'Dinner',
    scheduledDate: Date
  ): Order | null => {
    const resident = ResidentService.getResidentById(residentId);
    if (!resident) return null;

    const orderItems = items
      .map<OrderItem | null>((item) => {
        const meal = MealService.getMealById(item.mealId);
        if (!meal) return null;
        return {
          meal,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
        };
      })
      .filter((item): item is OrderItem => item !== null);

    if (orderItems.length === 0) return null;

    // Calculate total nutrition
    const totalNutrition = orderItems.reduce((acc, item) => {
      const calories = item.meal.nutrition.calories * item.quantity;
      const sodium = parseInt(item.meal.nutrition.sodium.replace(/[^\d]/g, '') || '0') * item.quantity;
      const protein = parseInt(item.meal.nutrition.protein.replace(/[^\d]/g, '') || '0') * item.quantity;
      
      return {
        calories: acc.calories + calories,
        sodium: acc.sodium + sodium,
        protein: acc.protein + protein
      };
    }, { calories: 0, sodium: 0, protein: 0 });

    const order: Order = {
      id: `order_${Date.now()}`,
      residentId,
      items: orderItems,
      mealPeriod,
      scheduledDate,
      status: 'pending',
      totalNutrition,
      createdAt: new Date()
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
  generateResponse: (
    userMessage: string,
    residentId: string,
    currentMeals: Meal[]
  ): string => {
    const resident = ResidentService.getResidentById(residentId);
    if (!resident) return "I couldn't find the resident information. Please try again.";

    const lowerMessage = userMessage.toLowerCase();
    
    // Menu questions
    if (lowerMessage.includes('menu') || lowerMessage.includes('today') || lowerMessage.includes('available')) {
      const menuItems = currentMeals.map(m => `• ${m.name} (${m.mealPeriod})`).join('\n');
      return `Here's what's available today:\n\n${menuItems}\n\nWould you like me to recommend something based on ${resident.firstName}'s dietary needs?`;
    }
    
    // Recommendation questions
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
      const recommendations = RecommendationService.getRecommendations(residentId, null, 2);
      if (recommendations.length === 0) {
        return `I don't have any recommendations available at the moment.`;
      }
      
      const restrictions = resident.dietaryRestrictions.map(r => r.name).join(', ');
      const topRec = recommendations[0];
      
      return `Based on ${resident.firstName}'s dietary restrictions (${restrictions}), I recommend the **${topRec.meal.name}**.\n\n${topRec.allReasons.join(', ')} - which aligns perfectly with their needs.\n\nWould you like to add it to their order?`;
    }
    
    // Dietary restriction questions
    if (lowerMessage.includes('dietary') || lowerMessage.includes('restriction') || lowerMessage.includes('allerg')) {
      const restrictions = resident.dietaryRestrictions
        .map(r => `• ${r.name} (${r.type}, ${r.severity})`)
        .join('\n');
      
      return `${resident.firstName}'s current dietary restrictions are:\n\n${restrictions}\n\nAll meal recommendations take these into account. Would you like to update these restrictions?`;
    }
    
    // Order questions
    if (lowerMessage.includes('order') || lowerMessage.includes('place')) {
      const recommendations = RecommendationService.getRecommendations(residentId, null, 2);
      const recNames = recommendations.map(r => r.meal.name).join(' or ');
      
      return `I can help you place an order! Which meal would you like to order for ${resident.firstName}?\n\nBased on their dietary needs, I'd suggest the ${recNames}.`;
    }
    
    // Nutrition questions
    if (lowerMessage.includes('calorie') || lowerMessage.includes('nutrition') || lowerMessage.includes('sodium') || lowerMessage.includes('protein')) {
      const goals = resident.nutritionGoals;
      
      return `${resident.firstName}'s nutrition goals are:\n\n• Daily Calories: ${goals.dailyCalories} kcal\n• Max Sodium: ${goals.maxSodium}mg\n• Min Protein: ${goals.minProtein}g\n• Max Cholesterol: ${goals.maxCholesterol}mg\n\nWould you like to see which meals best fit these goals?`;
    }
    
    // Default response
    return `I'd be happy to help with that! I can assist you with:\n\n• Viewing today's menu\n• Meal recommendations for ${resident.firstName}\n• Dietary restrictions\n• Placing orders\n• Nutritional information\n\nWhat would you like to know?`;
  }
};

// ==================== EXPORT DEFAULT ====================

export default {
  MealService,
  ResidentService,
  RecommendationService,
  OrderService,
  AIChatService
};