export type AppLanguage = 'English' | 'Español' | 'Français' | '中文';

const MEAL_NAME_TRANSLATIONS: Record<string, Partial<Record<AppLanguage, string>>> = {
  'Banana-Chocolate Pancakes': {
    Español: 'Panqueques de Banana y Chocolate',
    Français: 'Pancakes Banane-Chocolat',
    中文: '香蕉巧克力煎饼',
  },
  'Broccoli-Cheddar Quiche': {
    Español: 'Quiche de Brócoli y Cheddar',
    Français: 'Quiche Brocoli-Cheddar',
    中文: '西兰花切达乳蛋饼',
  },
  'Caesar Salad with Chicken': {
    Español: 'Ensalada César con Pollo',
    Français: 'Salade César au Poulet',
    中文: '鸡肉凯撒沙拉',
  },
  'Citrus Butter Salmon': {
    Español: 'Salmón con Mantequilla Cítrica',
    Français: 'Saumon au Beurre Agrumes',
    中文: '柑橘黄油三文鱼',
  },
  'Chicken Bruschetta': {
    Español: 'Pollo Bruschetta',
    Français: 'Poulet Bruschetta',
    中文: '意式番茄鸡肉',
  },
  'Breakfast Banana Split': {
    Español: 'Banana Split de Desayuno',
    Français: 'Banana Split du Petit-Déjeuner',
    中文: '早餐香蕉船',
  },
  'Herb Baked Chicken': {
    Español: 'Pollo al Horno con Hierbas',
    Français: 'Poulet Rôti aux Herbes',
    中文: '香草烤鸡',
  },
  'Garden Vegetable Medley': {
    Español: 'Mezcla de Verduras del Huerto',
    Français: 'Mélange de Légumes du Jardin',
    中文: '田园蔬菜拼盘',
  },
  'Strawberry Belgian Waffle': {
    Español: 'Waffle Belga de Fresa',
    Français: 'Gaufre Belge aux Fraises',
    中文: '草莓比利时华夫饼',
  },
  'Spring Menu Special': {
    Español: 'Especial de Primavera',
    Français: 'Spécial Menu de Printemps',
    中文: '春季特别菜单',
  },
  'Grilled Salmon Fillet': {
    Español: 'Filete de Salmón a la Parrilla',
    Français: 'Filet de Saumon Grillé',
    中文: '香烤三文鱼排',
  },
  'Oatmeal Bowl': {
    Español: 'Tazón de Avena',
    Français: "Bol d'Avoine",
    中文: '燕麦碗',
  },
};

const MEAL_DESCRIPTION_TRANSLATIONS: Record<string, Partial<Record<AppLanguage, string>>> = {
  'Pancakes topped with fresh sliced bananas and chocolate chips, served with scrambled eggs and your choice of bacon or sausage.': {
    Español: 'Panqueques con plátano fresco en rodajas y chispas de chocolate, servidos con huevos revueltos y tu elección de tocino o salchicha.',
    Français: 'Pancakes garnis de bananes fraîches et de pépites de chocolat, servis avec des oeufs brouillés et votre choix de bacon ou de saucisse.',
    中文: '煎饼配新鲜香蕉片和巧克力豆，搭配炒蛋，可选培根或香肠。',
  },
  'Diced broccoli with cheddar and parmesan cheese in a traditional quiche - served with fresh fruit.': {
    Español: 'Brócoli en cubos con quesos cheddar y parmesano en una quiche tradicional, servido con fruta fresca.',
    Français: 'Brocoli en dés avec cheddar et parmesan dans une quiche traditionnelle, servi avec des fruits frais.',
    中文: '传统乳蛋饼加入西兰花丁、切达和帕玛森芝士，配新鲜水果。',
  },
  'Fresh romaine, caesar dressing, shaved parmesan, and herb croutons. Add chicken or salmon if desired.': {
    Español: 'Lechuga romana fresca, aderezo César, parmesano laminado y crutones con hierbas. Se puede añadir pollo o salmón.',
    Français: 'Romaine fraîche, sauce César, parmesan en copeaux et croûtons aux herbes. Ajoutez du poulet ou du saumon si souhaité.',
    中文: '新鲜罗马生菜配凯撒酱、刨片帕玛森芝士和香草面包丁，可加鸡肉或三文鱼。',
  },
  'Fresh salmon with brown sugar-lemon seasoning - topped with compound butter and citrus salsa - served with mashed potatoes and seasonal vegetables.': {
    Español: 'Salmón fresco con sazón de azúcar morena y limón, cubierto con mantequilla compuesta y salsa cítrica, servido con puré de papa y verduras de temporada.',
    Français: 'Saumon frais assaisonné sucre brun-citron, garni de beurre composé et de salsa aux agrumes, servi avec purée de pommes de terre et légumes de saison.',
    中文: '新鲜三文鱼以红糖柠檬调味，配复合黄油和柑橘莎莎，佐土豆泥和时令蔬菜。',
  },
  'A baked chicken breast topped with fresh tomatoes, garlic, and basil - served with herbed corn and a baked potato.': {
    Español: 'Pechuga de pollo al horno con tomate fresco, ajo y albahaca, servida con maíz con hierbas y papa al horno.',
    Français: 'Blanc de poulet rôti garni de tomates fraîches, ail et basilic, servi avec maïs aux herbes et pomme de terre au four.',
    中文: '烤鸡胸配新鲜番茄、蒜和罗勒，搭配香草玉米与烤土豆。',
  },
  'Fresh sliced banana, with scoops of vanilla Greek yogurt, fresh berries, topped with granola and honey.': {
    Español: 'Plátano fresco en rebanadas con yogurt griego de vainilla, frutos rojos frescos, granola y miel.',
    Français: 'Bananes fraîches tranchées avec yaourt grec vanille, baies fraîches, granola et miel.',
    中文: '新鲜香蕉片配香草希腊酸奶、新鲜莓果、麦片和蜂蜜。',
  },
  'Steamed White Rice, Seasonal Vegetables': {
    Español: 'Arroz blanco al vapor y verduras de temporada',
    Français: 'Riz blanc vapeur et légumes de saison',
    中文: '蒸白米饭，时令蔬菜',
  },
  'Fresh Seasonal Vegetables': {
    Español: 'Verduras frescas de temporada',
    Français: 'Légumes frais de saison',
    中文: '新鲜时令蔬菜',
  },
  'Fresh Berries, Light Syrup': {
    Español: 'Frutos rojos frescos y jarabe ligero',
    Français: 'Baies fraîches et sirop léger',
    中文: '新鲜莓果，轻糖浆',
  },
  "Chef's Daily Creation": {
    Español: 'Creación diaria del chef',
    Français: 'Création quotidienne du chef',
    中文: '主厨每日创意',
  },
  'Citrus Butter, Roasted Asparagus': {
    Español: 'Mantequilla cítrica y espárragos asados',
    Français: 'Beurre aux agrumes et asperges rôties',
    中文: '柑橘黄油，烤芦笋',
  },
  'Fresh Berries, Honey, Almonds': {
    Español: 'Frutos rojos frescos, miel y almendras',
    Français: 'Baies fraîches, miel et amandes',
    中文: '新鲜莓果、蜂蜜和杏仁',
  },
};

const TAG_TRANSLATIONS: Record<string, Partial<Record<AppLanguage, string>>> = {
  Vegetarian: { Español: 'Vegetariano', Français: 'Végétarien', 中文: '素食' },
  Vegan: { Español: 'Vegano', Français: 'Végétalien', 中文: '纯素' },
  'High Protein': { Español: 'Alto en Proteína', Français: 'Riche en Protéines', 中文: '高蛋白' },
  'Low Carb': { Español: 'Bajo en Carbohidratos', Français: 'Faible en Glucides', 中文: '低碳水' },
  'Low Sodium': { Español: 'Bajo en Sodio', Français: 'Faible en Sodium', 中文: '低钠' },
  'Heart Healthy': { Español: 'Saludable para el Corazón', Français: 'Bon pour le Coeur', 中文: '护心健康' },
  'Omega-3': { Español: 'Omega-3', Français: 'Oméga-3', 中文: '欧米伽-3' },
  'Healthy Choice': { Español: 'Opción Saludable', Français: 'Choix Santé', 中文: '健康之选' },
  'Low Calorie': { Español: 'Bajo en Calorías', Français: 'Faible en Calories', 中文: '低卡路里' },
  'Chef Special': { Español: 'Especial del Chef', Français: 'Spécial du Chef', 中文: '主厨特选' },
  'Contains Dairy': { Español: 'Contiene Lácteos', Français: 'Contient des Produits Laitiers', 中文: '含乳制品' },
  'Contains Eggs': { Español: 'Contiene Huevos', Français: 'Contient des Oeufs', 中文: '含鸡蛋' },
  'High Fiber': { Español: 'Alto en Fibra', Français: 'Riche en Fibres', 中文: '高纤维' },
};

const PERIOD_TRANSLATIONS: Record<string, Partial<Record<AppLanguage, string>>> = {
  Breakfast: { Español: 'Desayuno', Français: 'Petit-déjeuner', 中文: '早餐' },
  Lunch: { Español: 'Almuerzo', Français: 'Déjeuner', 中文: '午餐' },
  Dinner: { Español: 'Cena', Français: 'Dîner', 中文: '晚餐' },
  'All Day': { Español: 'Todo el Día', Français: 'Toute la Journée', 中文: '全天' },
};

const TIME_RANGE_TRANSLATIONS: Record<string, Partial<Record<AppLanguage, string>>> = {
  '7am - 9am': { Español: '7 a. m. - 9 a. m.', Français: '7 h - 9 h', 中文: '上午7点 - 上午9点' },
  '11am - 1pm': { Español: '11 a. m. - 1 p. m.', Français: '11 h - 13 h', 中文: '上午11点 - 下午1点' },
  '11am - 7pm': { Español: '11 a. m. - 7 p. m.', Français: '11 h - 19 h', 中文: '上午11点 - 晚上7点' },
  '5pm - 7pm': { Español: '5 p. m. - 7 p. m.', Français: '17 h - 19 h', 中文: '下午5点 - 晚上7点' },
};

export const translateMealName = (name: string, language: AppLanguage): string => {
  return MEAL_NAME_TRANSLATIONS[name]?.[language] ?? name;
};

export const translateMealDescription = (description: string, language: AppLanguage): string => {
  return MEAL_DESCRIPTION_TRANSLATIONS[description]?.[language] ?? description;
};

export const translateMealTag = (tag: string, language: AppLanguage): string => {
  return TAG_TRANSLATIONS[tag]?.[language] ?? tag;
};

export const translateMealPeriod = (period: string, language: AppLanguage): string => {
  return PERIOD_TRANSLATIONS[period]?.[language] ?? period;
};

export const translateMealTimeRange = (timeRange: string, language: AppLanguage): string => {
  return TIME_RANGE_TRANSLATIONS[timeRange]?.[language] ?? timeRange;
};

