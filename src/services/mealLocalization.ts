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
  'Caesar Salad with chicken': {
    Español: 'Ensalada César con Pollo',
    Français: 'Salade César au Poulet',
    中文: '鸡肉凯撒沙拉',
  },
  'Chicken Brushetta': {
    Español: 'Pollo Bruschetta',
    Français: 'Poulet Bruschetta',
    中文: '意式番茄鸡肉',
  },
  'Herbed Baked Chicken': {
    Español: 'Pollo al Horno con Hierbas',
    Français: 'Poulet Rôti aux Herbes',
    中文: '香草烤鸡',
  },
  'Pumpkin Soup': {
    Español: 'Sopa de Calabaza',
    Français: 'Soupe de Potiron',
    中文: '南瓜汤',
  },
  'Fresh Orange Juice': {
    Español: 'Jugo de Naranja Fresco',
    Français: "Jus d'Orange Frais",
    中文: '鲜橙汁',
  },
  'Orange Juice': {
    Español: 'Jugo de Naranja',
    Français: "Jus d'Orange",
    中文: '橙汁',
  },
  'Hot Green Tea': {
    Español: 'Té Verde Caliente',
    Français: 'Thé Vert Chaud',
    中文: '热绿茶',
  },
  'Hot Coffee': {
    Español: 'Café Caliente',
    Français: 'Café Chaud',
    中文: '热咖啡',
  },
  'Soft Drink (Soda)': {
    Español: 'Refresco',
    Français: 'Boisson Gazeuse',
    中文: '汽水',
  },
  'Herbal Tea': {
    Español: 'Té de Hierbas',
    Français: 'Tisane',
    中文: '花草茶',
  },
  'Spiced Pear Tea': {
    Español: 'Té de Pera Especiada',
    Français: 'Thé à la Poire Épicée',
    中文: '香料梨茶',
  },
  'Warm Apple Cider': {
    Español: 'Sidra de Manzana Caliente',
    Français: 'Cidre de Pomme Chaud',
    中文: '热苹果西打',
  },
  'Vanilla Cake Slice': {
    Español: 'Rebanada de Pastel de Vainilla',
    Français: 'Part de Gâteau à la Vanille',
    中文: '香草蛋糕片',
  },
  'Side Garden Salad': {
    Español: 'Ensalada Verde de Acompañamiento',
    Français: 'Salade Verte en Accompagnement',
    中文: '配菜田园沙拉',
  },
  'Oatmeal Cookie': {
    Español: 'Galleta de Avena',
    Français: "Biscuit à l'Avoine",
    中文: '燕麦饼干',
  },
  'All-American Hamburger': {
    Español: 'Hamburguesa Americana Clásica',
    Français: 'Hamburger Américain Classique',
    中文: '经典美式汉堡',
  },
  'Traditional BLT Sandwich': {
    Español: 'Sándwich BLT Tradicional',
    Français: 'Sandwich BLT Traditionnel',
    中文: '传统培根生菜番茄三明治',
  },
  'Fish and Chips': {
    Español: 'Pescado con Papas Fritas',
    Français: 'Poisson-Frites',
    中文: '炸鱼薯条',
  },
  'Chicken Soft Tacos': {
    Español: 'Tacos Suaves de Pollo',
    Français: 'Tacos Souples au Poulet',
    中文: '软皮鸡肉塔可',
  },
  "Chef's cut steak": {
    Español: 'Corte de Carne del Chef',
    Français: 'Pièce de Steak du Chef',
    中文: '主厨精选牛排',
  },
  'Mixed Berry Smoothie': {
    Español: 'Batido de Frutos Rojos',
    Français: 'Smoothie aux Fruits Rouges',
    中文: '混合莓果奶昔',
  },
  'Sparkling Water': {
    Español: 'Agua con Gas',
    Français: 'Eau Pétillante',
    中文: '气泡水',
  },
  'Whole Milk': {
    Español: 'Leche Entera',
    Français: 'Lait Entier',
    中文: '全脂牛奶',
  },
  'Decaf Coffee': {
    Español: 'Café Descafeinado',
    Français: 'Café Décaféiné',
    中文: '低咖啡因咖啡',
  },
  'Chamomile Tea': {
    Español: 'Té de Manzanilla',
    Français: 'Tisane de Camomille',
    中文: '洋甘菊茶',
  },
  'Cranberry Juice': {
    Español: 'Jugo de Arándano',
    Français: 'Jus de Canneberge',
    中文: '蔓越莓汁',
  },
  'Apple Juice': {
    Español: 'Jugo de Manzana',
    Français: 'Jus de Pomme',
    中文: '苹果汁',
  },
  'Hot Cocoa': {
    Español: 'Chocolate Caliente',
    Français: 'Chocolat Chaud',
    中文: '热可可',
  },
  'Chicken Noodle Soup': {
    Español: 'Sopa de Fideos con Pollo',
    Français: 'Soupe de Nouilles au Poulet',
    中文: '鸡肉面汤',
  },
  'Garden Side Salad': {
    Español: 'Ensalada Verde de Acompañamiento',
    Français: 'Salade Verte en Accompagnement',
    中文: '田园配菜沙拉',
  },
  'Vanilla Ice Cream': {
    Español: 'Helado de Vainilla',
    Français: 'Glace à la Vanille',
    中文: '香草冰淇淋',
  },
  'Apple Pie Slice': {
    Español: 'Rebanada de Pay de Manzana',
    Français: 'Part de Tarte aux Pommes',
    中文: '苹果派片',
  },
  'Chocolate Chip Cookies': {
    Español: 'Galletas con Chispas de Chocolate',
    Français: 'Biscuits aux Pépites de Chocolat',
    中文: '巧克力豆饼干',
  },
  'Fresh Fruit Cup': {
    Español: 'Copa de Fruta Fresca',
    Français: 'Coupe de Fruits Frais',
    中文: '新鲜水果杯',
  },
  'Tomato Basil Soup': {
    Español: 'Sopa de Tomate y Albahaca',
    Français: 'Soupe Tomate Basilic',
    中文: '番茄罗勒汤',
  },
  'Rice Pudding': {
    Español: 'Arroz con Leche',
    Français: 'Riz au Lait',
    中文: '米布丁',
  },
  'Turkey & Avocado Wrap': {
    Español: 'Wrap de Pavo y Aguacate',
    Français: "Wrap Dinde et Avocat",
    中文: '火鸡牛油果卷',
  },
  'Tomato Basil Omelette': {
    Español: 'Omelette de Tomate y Albahaca',
    Français: 'Omelette Tomate Basilic',
    中文: '番茄罗勒煎蛋卷',
  },
  'Beef Pot Roast': {
    Español: 'Estofado de Res',
    Français: 'Boeuf Braisé',
    中文: '炖牛肉',
  },
  'Lentil Vegetable Soup': {
    Español: 'Sopa de Lentejas y Verduras',
    Français: 'Soupe de Lentilles aux Légumes',
    中文: '扁豆蔬菜汤',
  },
  'French Toast': {
    Español: 'Tostada Francesa',
    Français: 'Pain Perdu',
    中文: '法式吐司',
  },
  'Baked Mac & Cheese': {
    Español: 'Macarrones con Queso al Horno',
    Français: 'Macaroni au Fromage Gratiné',
    中文: '烤芝士通心粉',
  },
  'Shrimp Stir-Fry': {
    Español: 'Salteado de Camarones',
    Français: 'Sauté de Crevettes',
    中文: '炒虾仁',
  },
  'Avocado Toast': {
    Español: 'Tostada de Aguacate',
    Français: "Toast à l'Avocat",
    中文: '牛油果吐司',
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
  'Pancakes topped with fresh sliced bananas and chocolate chips, served with scrambled eggs.': {
    Español: 'Panqueques con plátano fresco en rodajas y chispas de chocolate, servidos con huevos revueltos.',
    Français: 'Pancakes garnis de bananes fraîches et de pépites de chocolat, servis avec des oeufs brouillés.',
    中文: '煎饼配新鲜香蕉片和巧克力豆，搭配炒蛋。',
  },
  'Diced broccoli with cheddar and parmesan cheese in a traditional quiche.': {
    Español: 'Brócoli en cubos con quesos cheddar y parmesano en una quiche tradicional.',
    Français: 'Brocoli en dés avec cheddar et parmesan dans une quiche traditionnelle.',
    中文: '传统乳蛋饼加入西兰花丁、切达和帕玛森芝士。',
  },
  'Diced broccoli with cheddar and parmesean cheese in a traditional quiche - served with fresh fruit.': {
    Español: 'Brócoli en cubos con quesos cheddar y parmesano en una quiche tradicional, servido con fruta fresca.',
    Français: 'Brocoli en dés avec cheddar et parmesan dans une quiche traditionnelle, servi avec des fruits frais.',
    中文: '传统乳蛋饼加入西兰花丁、切达和帕玛森芝士，配新鲜水果。',
  },
  'Fresh romaine, caesar dressing, shaved parmesan, and herb croutons.': {
    Español: 'Lechuga romana fresca, aderezo César, parmesano laminado y crutones con hierbas.',
    Français: 'Romaine fraîche, sauce César, parmesan en copeaux et croûtons aux herbes.',
    中文: '新鲜罗马生菜配凯撒酱、刨片帕玛森芝士和香草面包丁。',
  },
  'Fresh romaine, caesar dressing, shaved parmesean, and herb crutons. Add chicken or salmon if desired': {
    Español: 'Lechuga romana fresca, aderezo César, parmesano laminado y crutones con hierbas. Se puede añadir pollo o salmón.',
    Français: 'Romaine fraîche, sauce César, parmesan en copeaux et croûtons aux herbes. Ajoutez du poulet ou du saumon si souhaité.',
    中文: '新鲜罗马生菜配凯撒酱、刨片帕玛森芝士和香草面包丁，可加鸡肉或三文鱼。',
  },
  'Fresh salmon with brown sugar-lemon seasoning topped with compound butter.': {
    Español: 'Salmón fresco con sazón de azúcar morena y limón, cubierto con mantequilla compuesta.',
    Français: 'Saumon frais assaisonné sucre brun-citron, garni de beurre composé.',
    中文: '新鲜三文鱼以红糖柠檬调味，配复合黄油。',
  },
  'Fresh salmon with brown suagr-lemon seasoning - topped with compound butter and citrus salsa - served with mashed potatoes and seasonal vegetables.': {
    Español: 'Salmón fresco con sazón de azúcar morena y limón, cubierto con mantequilla compuesta y salsa cítrica, servido con puré de papa y verduras de temporada.',
    Français: 'Saumon frais assaisonné sucre brun-citron, garni de beurre composé et de salsa aux agrumes, servi avec purée de pommes de terre et légumes de saison.',
    中文: '新鲜三文鱼以红糖柠檬调味，配复合黄油和柑橘莎莎，佐土豆泥和时令蔬菜。',
  },
  'A baked chicken breast topped with fresh tomatoes, garlic, and basil.': {
    Español: 'Pechuga de pollo al horno con tomate fresco, ajo y albahaca.',
    Français: 'Blanc de poulet rôti garni de tomates fraîches, ail et basilic.',
    中文: '烤鸡胸配新鲜番茄、蒜和罗勒。',
  },
  'Fresh sliced banana with vanilla Greek yogurt, fresh berries, granola and honey.': {
    Español: 'Plátano fresco en rebanadas con yogurt griego de vainilla, frutos rojos frescos, granola y miel.',
    Français: 'Bananes fraîches tranchées avec yaourt grec vanille, baies fraîches, granola et miel.',
    中文: '新鲜香蕉片配香草希腊酸奶、新鲜莓果、麦片和蜂蜜。',
  },
  'Chicken marinated in olive oil, rosemary, thyme, and garlic,  is served with fluffy white rice and a medley of seasonal vegetables.': {
    Español: 'Pollo marinado en aceite de oliva, romero, tomillo y ajo, servido con arroz blanco esponjoso y una mezcla de verduras de temporada.',
    Français: "Poulet mariné à l'huile d'olive, romarin, thym et ail, servi avec riz blanc moelleux et légumes de saison.",
    中文: '鸡肉以橄榄油、迷迭香、百里香和蒜腌制，配松软白米饭和时令蔬菜拼盘。',
  },
  'A warm and creamy pumpkin soup, lightly spiced with nutmeg and served fresh for a comforting breakfast option.': {
    Español: 'Sopa de calabaza tibia y cremosa, ligeramente especiada con nuez moscada y servida fresca como opción reconfortante de desayuno.',
    Français: 'Soupe de potiron chaude et crémeuse, légèrement épicée à la muscade et servie fraîche pour un petit-déjeuner réconfortant.',
    中文: '温热顺滑的南瓜汤，以肉豆蔻轻轻调味，新鲜供应，是暖心的早餐选择。',
  },
  'Freshly brewed hot coffee, served regular or decaf with optional milk and sugar.': {
    Español: 'Café caliente recién hecho, regular o descafeinado, con leche y azúcar opcionales.',
    Français: 'Café chaud fraîchement préparé, régulier ou décaféiné, avec lait et sucre en option.',
    中文: '现煮热咖啡，可选普通或低咖啡因，并可加牛奶和糖。',
  },
  'Chilled orange juice, rich in vitamin C and served fresh.': {
    Español: 'Jugo de naranja frío, rico en vitamina C y servido fresco.',
    Français: "Jus d'orange frais et froid, riche en vitamine C.",
    中文: '冰镇橙汁，富含维生素C，新鲜供应。',
  },
  'Chilled soft drink available in a variety of classic flavors.': {
    Español: 'Refresco frío disponible en varios sabores clásicos.',
    Français: 'Boisson gazeuse fraîche disponible en plusieurs saveurs classiques.',
    中文: '冰镇汽水，提供多种经典口味。',
  },
  'A soothing cup of caffeine-free herbal tea, served hot with optional honey.': {
    Español: 'Una taza relajante de té de hierbas sin cafeína, servida caliente con miel opcional.',
    Français: 'Une tasse apaisante de tisane sans caféine, servie chaude avec miel en option.',
    中文: '舒缓的无咖啡因花草茶，热饮，可选加蜂蜜。',
  },
  'A lightly spiced pear-infused tea with cinnamon and cloves, served warm and gently sweet.': {
    Español: 'Té infusionado con pera, ligeramente especiado con canela y clavo, servido tibio y suavemente dulce.',
    Français: 'Thé infusé à la poire, légèrement épicé à la cannelle et au clou de girofle, servi chaud et délicatement sucré.',
    中文: '梨香茶配肉桂和丁香，温热供应，甜味柔和。',
  },
  'A warm, spiced apple cider with cinnamon and cloves, served hot during the fall and winter seasons.': {
    Español: 'Sidra de manzana tibia y especiada con canela y clavo, servida caliente en otoño e invierno.',
    Français: 'Cidre de pomme chaud et épicé à la cannelle et au clou de girofle, servi en automne et en hiver.',
    中文: '温热香料苹果西打，加入肉桂和丁香，秋冬热饮。',
  },
  'A soft and moist slice of classic vanilla cake, lightly sweetened and easy to enjoy.': {
    Español: 'Rebanada suave y esponjosa de pastel clásico de vainilla, ligeramente dulce y fácil de disfrutar.',
    Français: 'Part moelleuse de gâteau classique à la vanille, légèrement sucrée et facile à savourer.',
    中文: '柔软湿润的经典香草蛋糕片，甜度适中，易于享用。',
  },
  'A light side salad with fresh vegetables, served with your choice of dressing.': {
    Español: 'Ensalada ligera de acompañamiento con verduras frescas, servida con aderezo a elección.',
    Français: 'Salade légère en accompagnement avec légumes frais, servie avec la vinaigrette de votre choix.',
    中文: '清爽配菜沙拉，含新鲜蔬菜，可选沙拉酱。',
  },
  'A soft oatmeal cookie with a hint of cinnamon, perfect as a small snack.': {
    Español: 'Galleta suave de avena con un toque de canela, perfecta como pequeño refrigerio.',
    Français: "Biscuit moelleux à l'avoine avec une touche de cannelle, parfait comme petite collation.",
    中文: '柔软燕麦饼干，带一点肉桂香，适合作为小点心。',
  },
  'A house-made Belgian waffle topped with fresh strawberries and whipped cream, and your choice of bacon or sausage.': {
    Español: 'Waffle belga hecho en casa con fresas frescas y crema batida, acompañado con tocino o salchicha a elección.',
    Français: 'Gaufre belge maison garnie de fraises fraîches et de crème fouettée, avec bacon ou saucisse au choix.',
    中文: '自制比利时华夫饼，配新鲜草莓和鲜奶油，可选培根或香肠。',
  },
  'Topped with caramelized onions, tomato, pickles, and lettuce on a toasted brioche bun - served with fresh fruit or fries': {
    Español: 'Con cebollas caramelizadas, tomate, pepinillos y lechuga en un pan brioche tostado, servido con fruta fresca o papas fritas.',
    Français: 'Garni d’oignons caramélisés, tomate, cornichons et laitue dans un pain brioché grillé, servi avec fruits frais ou frites.',
    中文: '烤布里欧修面包夹焦糖洋葱、番茄、酸黄瓜和生菜，配新鲜水果或薯条。',
  },
  'Crispy bacon, freshly sliced tomato, and green leaf lettuce on a toasted multigrain bread - served with spinach-orzo salad and fresh fruit.': {
    Español: 'Tocino crujiente, tomate recién cortado y lechuga verde en pan multigrano tostado, servido con ensalada de espinaca y orzo y fruta fresca.',
    Français: 'Bacon croustillant, tomate fraîchement tranchée et laitue verte sur pain multigrain grillé, servi avec salade épinards-orzo et fruits frais.',
    中文: '烤多谷物面包夹香脆培根、新鲜番茄片和绿叶生菜，配菠菜米粒面沙拉和新鲜水果。',
  },
  'Golden, crispy battered fish served with a side of hot, seasoned fries. Accompanied by tangy tartar sauce, fresh lemon wedges, and a splash of malt vinegar for a classic, comforting seafood favorite.': {
    Español: 'Pescado rebozado dorado y crujiente servido con papas fritas calientes y sazonadas. Acompañado de salsa tártara ácida, gajos de limón fresco y un toque de vinagre de malta.',
    Français: 'Poisson pané doré et croustillant servi avec des frites chaudes assaisonnées. Accompagné de sauce tartare acidulée, quartiers de citron frais et vinaigre de malt.',
    中文: '金黄酥脆的裹浆炸鱼，配热腾腾的调味薯条。佐以酸香塔塔酱、新鲜柠檬角和少许麦芽醋。',
  },
  'Shredded and seasoned chicken in a corn tortilla with lettuce, diced tomatoes and sour cream - served with black bean and bell pepper salad.': {
    Español: 'Pollo deshebrado y sazonado en tortilla de maíz con lechuga, tomate en cubos y crema agria, servido con ensalada de frijol negro y pimiento.',
    Français: 'Poulet effiloché et assaisonné dans une tortilla de maïs avec laitue, tomates en dés et crème sure, servi avec salade de haricots noirs et poivrons.',
    中文: '调味手撕鸡肉玉米饼，配生菜、番茄丁和酸奶油，搭配黑豆甜椒沙拉。',
  },
  "Chef's cut steak, cooked to your liking - served with spinach-orzo salad and seasonal vegetables.": {
    Español: 'Corte de carne del chef, cocinado a tu gusto, servido con ensalada de espinaca y orzo y verduras de temporada.',
    Français: 'Pièce de steak du chef, cuite à votre goût, servie avec salade épinards-orzo et légumes de saison.',
    中文: '主厨精选牛排，可按喜好烹调，配菠菜米粒面沙拉和时令蔬菜。',
  },
  'Freshly squeezed orange juice, chilled and vitamin-rich.': {
    Español: 'Jugo de naranja recién exprimido, frío y rico en vitaminas.',
    Français: "Jus d'orange fraîchement pressé, frais et riche en vitamines.",
    中文: '鲜榨橙汁，冰镇且富含维生素。',
  },
  'Lightly brewed green tea served hot. Antioxidant-rich.': {
    Español: 'Té verde de infusión ligera servido caliente. Rico en antioxidantes.',
    Français: 'Thé vert léger servi chaud. Riche en antioxydants.',
    中文: '淡泡热绿茶，富含抗氧化物。',
  },
  'Freshly brewed drip coffee. Available with cream or sugar.': {
    Español: 'Café filtrado recién hecho. Disponible con crema o azúcar.',
    Français: 'Café filtre fraîchement préparé. Disponible avec crème ou sucre.',
    中文: '现煮滴滤咖啡，可加奶油或糖。',
  },
  'Thick blend of fresh berries with Greek yogurt and honey.': {
    Español: 'Batido espeso de frutos rojos frescos con yogurt griego y miel.',
    Français: 'Mélange épais de baies fraîches avec yaourt grec et miel.',
    中文: '浓稠的新鲜莓果奶昔，含希腊酸奶和蜂蜜。',
  },
  'Warm spiced apple cider with cinnamon and cloves.': {
    Español: 'Sidra de manzana tibia con canela y clavo.',
    Français: 'Cidre de pomme chaud aux épices, cannelle et clou de girofle.',
    中文: '温热香料苹果西打，带肉桂和丁香。',
  },
  'Lightly lemon-flavored sparkling water. Refreshing.': {
    Español: 'Agua con gas con ligero sabor a limón. Refrescante.',
    Français: 'Eau pétillante légèrement citronnée. Rafraîchissante.',
    中文: '淡柠檬味气泡水，清爽解渴。',
  },
  'Cold whole milk, rich in calcium and protein.': {
    Español: 'Leche entera fría, rica en calcio y proteína.',
    Français: 'Lait entier froid, riche en calcium et en protéines.',
    中文: '冷全脂牛奶，富含钙和蛋白质。',
  },
  'Full-bodied decaf coffee — all the flavour, no caffeine.': {
    Español: 'Café descafeinado con cuerpo: todo el sabor, sin cafeína.',
    Français: 'Café décaféiné corsé : toute la saveur, sans caféine.',
    中文: '醇厚低咖啡因咖啡，保留风味，不含咖啡因。',
  },
  'Soothing chamomile herbal tea with a touch of honey.': {
    Español: 'Té herbal de manzanilla relajante con un toque de miel.',
    Français: 'Tisane de camomille apaisante avec une touche de miel.',
    中文: '舒缓洋甘菊花草茶，带一点蜂蜜。',
  },
  '100% cranberry juice. Supports urinary tract health.': {
    Español: 'Jugo de arándano 100 %. Apoya la salud urinaria.',
    Français: 'Jus de canneberge 100 %. Soutient la santé urinaire.',
    中文: '100%蔓越莓汁，有助于泌尿系统健康。',
  },
  'Clear, mild apple juice — easy on sensitive stomachs.': {
    Español: 'Jugo de manzana claro y suave, fácil para estómagos sensibles.',
    Français: 'Jus de pomme clair et doux, facile pour les estomacs sensibles.',
    中文: '清澈温和的苹果汁，对敏感胃部更友好。',
  },
  'Warm, creamy hot cocoa made with real milk and cocoa.': {
    Español: 'Chocolate caliente tibio y cremoso hecho con leche y cacao reales.',
    Français: 'Chocolat chaud crémeux préparé avec du vrai lait et du cacao.',
    中文: '温热顺滑的热可可，由真正牛奶和可可制成。',
  },
  'Classic chicken noodle soup — warm, comforting, and easy to eat.': {
    Español: 'Sopa clásica de fideos con pollo, tibia, reconfortante y fácil de comer.',
    Français: 'Soupe classique de nouilles au poulet, chaude, réconfortante et facile à manger.',
    中文: '经典鸡肉面汤，温暖舒适，易于食用。',
  },
  'Fresh mixed greens with cherry tomatoes, cucumber, and light ranch.': {
    Español: 'Verduras frescas mixtas con tomates cherry, pepino y aderezo ranch ligero.',
    Français: 'Mélange de verdures fraîches avec tomates cerises, concombre et ranch léger.',
    中文: '新鲜混合生菜配樱桃番茄、黄瓜和清淡牧场酱。',
  },
  'Two scoops of creamy vanilla ice cream — a classic comfort dessert.': {
    Español: 'Dos bolas de helado cremoso de vainilla, un postre clásico y reconfortante.',
    Français: 'Deux boules de glace crémeuse à la vanille, un dessert réconfortant classique.',
    中文: '两勺香草冰淇淋，经典暖心甜点。',
  },
  'Warm slice of homemade apple pie with a flaky golden crust.': {
    Español: 'Rebanada tibia de pay de manzana casero con corteza dorada y hojaldrada.',
    Français: 'Part chaude de tarte aux pommes maison avec croûte dorée et feuilletée.',
    中文: '温热自制苹果派片，金黄酥皮。',
  },
  'Two freshly baked chocolate chip cookies — soft and chewy.': {
    Español: 'Dos galletas con chispas de chocolate recién horneadas, suaves y masticables.',
    Français: 'Deux biscuits aux pépites de chocolat fraîchement cuits, moelleux et tendres.',
    中文: '两块新鲜烘烤的巧克力豆饼干，柔软有嚼劲。',
  },
  'Seasonal mixed fresh fruit — light, refreshing, and vitamin-rich.': {
    Español: 'Mezcla de fruta fresca de temporada, ligera, refrescante y rica en vitaminas.',
    Français: 'Mélange de fruits frais de saison, léger, rafraîchissant et riche en vitamines.',
    中文: '时令新鲜水果组合，清淡爽口，富含维生素。',
  },
  'Creamy tomato soup with fresh basil — perfect with a side of bread.': {
    Español: 'Sopa cremosa de tomate con albahaca fresca, perfecta con pan.',
    Français: 'Soupe crémeuse à la tomate avec basilic frais, parfaite avec du pain.',
    中文: '奶油番茄汤配新鲜罗勒，适合搭配面包。',
  },
  'Creamy rice pudding with cinnamon and raisins — a nostalgic treat.': {
    Español: 'Arroz con leche cremoso con canela y pasas, un postre nostálgico.',
    Français: 'Riz au lait crémeux avec cannelle et raisins secs, une douceur nostalgique.',
    中文: '奶香米布丁配肉桂和葡萄干，怀旧甜点。',
  },
  'Sliced turkey breast with fresh avocado, lettuce and Swiss cheese in a soft wrap.': {
    Español: 'Pechuga de pavo en rebanadas con aguacate fresco, lechuga y queso suizo en un wrap suave.',
    Français: 'Poitrine de dinde tranchée avec avocat frais, laitue et fromage suisse dans un wrap moelleux.',
    中文: '软卷饼包裹火鸡胸片、新鲜牛油果、生菜和瑞士奶酪。',
  },
  'Fluffy three-egg omelette with fresh tomato, basil and melted mozzarella.': {
    Español: 'Omelette esponjoso de tres huevos con tomate fresco, albahaca y mozzarella derretida.',
    Français: 'Omelette moelleuse aux trois oeufs avec tomate fraîche, basilic et mozzarella fondue.',
    中文: '松软三蛋煎蛋卷，配新鲜番茄、罗勒和融化马苏里拉。',
  },
  'Slow-braised beef with tender root vegetables in a rich herb broth.': {
    Español: 'Res braseada lentamente con verduras de raíz tiernas en un caldo rico con hierbas.',
    Français: 'Boeuf braisé lentement avec légumes racines tendres dans un bouillon aux herbes riche.',
    中文: '慢炖牛肉配软嫩根茎蔬菜和浓郁香草汤汁。',
  },
  'Hearty lentil soup with seasonal vegetables and warming spices.': {
    Español: 'Sopa sustanciosa de lentejas con verduras de temporada y especias cálidas.',
    Français: 'Soupe consistante aux lentilles avec légumes de saison et épices réconfortantes.',
    中文: '丰盛扁豆汤，配时令蔬菜和暖香料。',
  },
  'Thick-cut brioche French toast dusted with powdered sugar and served with maple syrup.': {
    Español: 'Tostada francesa de brioche gruesa espolvoreada con azúcar glas y servida con jarabe de maple.',
    Français: 'Pain perdu brioché épais saupoudré de sucre glace et servi avec sirop d’érable.',
    中文: '厚切布里欧修法式吐司，撒糖粉，配枫糖浆。',
  },
  'Creamy homemade macaroni and cheese baked with a golden breadcrumb crust.': {
    Español: 'Macarrones con queso caseros y cremosos, horneados con una corteza dorada de pan molido.',
    Français: 'Macaroni au fromage maison crémeux, gratiné avec une croûte dorée de chapelure.',
    中文: '自制奶油芝士通心粉，烤至金黄面包屑脆皮。',
  },
  'Tender shrimp with colorful vegetables tossed in a light ginger-soy glaze over steamed rice.': {
    Español: 'Camarones tiernos con verduras coloridas en un glaseado ligero de jengibre y soya sobre arroz al vapor.',
    Français: 'Crevettes tendres avec légumes colorés dans un léger glaçage gingembre-soja sur riz vapeur.',
    中文: '嫩虾仁和彩色蔬菜拌姜味酱油薄芡，铺在蒸米饭上。',
  },
  'Creamy mashed avocado on toasted whole grain bread with a squeeze of lemon.': {
    Español: 'Aguacate cremoso machacado sobre pan integral tostado con un toque de limón.',
    Français: "Avocat écrasé crémeux sur pain complet grillé avec un trait de citron.",
    中文: '全谷物吐司上铺顺滑牛油果泥，并加少许柠檬汁。',
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
  'Low Fat': { Español: 'Bajo en Grasa', Français: 'Faible en Matières Grasses', 中文: '低脂' },
  'High Fat': { Español: 'Alto en Grasa', Français: 'Riche en Matières Grasses', 中文: '高脂肪' },
  'Low Fiber': { Español: 'Bajo en Fibra', Français: 'Faible en Fibres', 中文: '低纤维' },
  'High Sodium': { Español: 'Alto en Sodio', Français: 'Riche en Sodium', 中文: '高钠' },
  'High Sugar': { Español: 'Alto en Azúcar', Français: 'Riche en Sucre', 中文: '高糖' },
  'Low Sugar': { Español: 'Bajo en Azúcar', Français: 'Faible en Sucre', 中文: '低糖' },
  'Gluten-Free': { Español: 'Sin Gluten', Français: 'Sans Gluten', 中文: '无麸质' },
  'Gluten Free': { Español: 'Sin Gluten', Français: 'Sans Gluten', 中文: '无麸质' },
  Seasonal: { Español: 'De Temporada', Français: 'Saisonnier', 中文: '时令' },
  'Vitamin C': { Español: 'Vitamina C', Français: 'Vitamine C', 中文: '维生素C' },
  Antioxidant: { Español: 'Antioxidante', Français: 'Antioxydant', 中文: '抗氧化' },
  Caffeine: { Español: 'Cafeína', Français: 'Caféine', 中文: '含咖啡因' },
  Decaf: { Español: 'Descafeinado', Français: 'Décaféiné', 中文: '低咖啡因' },
  'Caffeine-Free': { Español: 'Sin Cafeína', Français: 'Sans Caféine', 中文: '无咖啡因' },
  Warming: { Español: 'Reconfortante', Français: 'Réconfortant', 中文: '暖胃' },
  Calming: { Español: 'Relajante', Français: 'Apaisant', 中文: '舒缓' },
  Calcium: { Español: 'Calcio', Français: 'Calcium', 中文: '钙' },
  Gentle: { Español: 'Suave', Français: 'Doux', 中文: '温和' },
  Comfort: { Español: 'Reconfortante', Français: 'Réconfortant', 中文: '舒适暖心' },
  Dairy: { Español: 'Lácteos', Français: 'Produits Laitiers', 中文: '乳制品' },
  Gluten: { Español: 'Gluten', Français: 'Gluten', 中文: '麸质' },
  'Whole Grain': { Español: 'Grano Integral', Français: 'Céréales Complètes', 中文: '全谷物' },
  'UTI Prevention': { Español: 'Prevención Urinaria', Français: 'Prévention Urinaire', 中文: '泌尿护理' },
};

const PERIOD_TRANSLATIONS: Record<string, Partial<Record<AppLanguage, string>>> = {
  Breakfast: { Español: 'Desayuno',    Français: 'Petit-déjeuner',  中文: '早餐' },
  Lunch:     { Español: 'Almuerzo',    Français: 'Déjeuner',        中文: '午餐' },
  Dinner:    { Español: 'Cena',        Français: 'Dîner',           中文: '晚餐' },
  'All Day': { Español: 'Todo el Día', Français: 'Toute la Journée',中文: '全天' },
  Drinks:    { Español: 'Bebida',      Français: 'Boisson',         中文: '饮品' },
  Sides:     { Español: 'Acompañamiento', Français: 'Accompagnement', 中文: '配菜' },
};

const TIME_RANGE_TRANSLATIONS: Record<string, Partial<Record<AppLanguage, string>>> = {
  '7am - 9am': { Español: '7 a. m. - 9 a. m.', Français: '7 h - 9 h', 中文: '上午7点 - 上午9点' },
  '7am - 10am': { Español: '7 a. m. - 10 a. m.', Français: '7 h - 10 h', 中文: '上午7点 - 上午10点' },
  '11am - 1pm': { Español: '11 a. m. - 1 p. m.', Français: '11 h - 13 h', 中文: '上午11点 - 下午1点' },
  '11am - 2pm': { Español: '11 a. m. - 2 p. m.', Français: '11 h - 14 h', 中文: '上午11点 - 下午2点' },
  '11am - 7pm': { Español: '11 a. m. - 7 p. m.', Français: '11 h - 19 h', 中文: '上午11点 - 晚上7点' },
  '11am - 8pm': { Español: '11 a. m. - 8 p. m.', Français: '11 h - 20 h', 中文: '上午11点 - 晚上8点' },
  '4pm - 7pm': { Español: '4 p. m. - 7 p. m.', Français: '16 h - 19 h', 中文: '下午4点 - 晚上7点' },
  '5pm - 7pm': { Español: '5 p. m. - 7 p. m.', Français: '17 h - 19 h', 中文: '下午5点 - 晚上7点' },
  '7am - 7pm': { Español: '7 a. m. - 7 p. m.', Français: '7 h - 19 h', 中文: '上午7点 - 晚上7点' },
  '7am - 8pm': { Español: '7 a. m. - 8 p. m.', Français: '7 h - 20 h', 中文: '上午7点 - 晚上8点' },
  '8am - 8pm': { Español: '8 a. m. - 8 p. m.', Français: '8 h - 20 h', 中文: '上午8点 - 晚上8点' },
  '7am – 8pm': { Español: '7 a. m. - 8 p. m.', Français: '7 h - 20 h', 中文: '上午7点 - 晚上8点' },
  '8am – 8pm': { Español: '8 a. m. - 8 p. m.', Français: '8 h - 20 h', 中文: '上午8点 - 晚上8点' },
  '11am – 7pm': { Español: '11 a. m. - 7 p. m.', Français: '11 h - 19 h', 中文: '上午11点 - 晚上7点' },
  '11am – 8pm': { Español: '11 a. m. - 8 p. m.', Français: '11 h - 20 h', 中文: '上午11点 - 晚上8点' },
};

// ── Dynamic translation cache ──────────────────────────────────────────────
// Populated at runtime via translateMealNamesWithGemini / translateMealFieldsWithGemini
// for API/kitchen meals not present in the static tables above.
const DYNAMIC_NAME_CACHE: Record<string, Partial<Record<AppLanguage, string>>> = {};
const DYNAMIC_DESCRIPTION_CACHE: Record<string, Partial<Record<AppLanguage, string>>> = {};
const DYNAMIC_TAG_CACHE: Record<string, Partial<Record<AppLanguage, string>>> = {};

/**
 * Store Gemini-translated names into the in-memory cache.
 * Call this after translateMealNamesWithGemini resolves.
 */
export function setCachedMealTranslations(
  results: Record<string, { Español: string; Français: string; 中文: string }>,
): void {
  for (const [name, translations] of Object.entries(results)) {
    DYNAMIC_NAME_CACHE[name] = {
      Español: translations.Español,
      Français: translations.Français,
      中文: translations['中文'],
    };
  }
}

/**
 * Store Gemini-translated descriptions. Same shape as setCachedMealTranslations
 * but keyed by the original English description string.
 */
export function setCachedDescriptionTranslations(
  results: Record<string, { Español: string; Français: string; 中文: string }>,
): void {
  for (const [desc, translations] of Object.entries(results)) {
    DYNAMIC_DESCRIPTION_CACHE[desc] = {
      Español: translations.Español,
      Français: translations.Français,
      中文: translations['中文'],
    };
  }
}

/** Same as above but for tag labels (e.g. "Gluten-Free", "Low Sodium"). */
export function setCachedTagTranslations(
  results: Record<string, { Español: string; Français: string; 中文: string }>,
): void {
  for (const [tag, translations] of Object.entries(results)) {
    DYNAMIC_TAG_CACHE[tag] = {
      Español: translations.Español,
      Français: translations.Français,
      中文: translations['中文'],
    };
  }
}

/**
 * Returns true if this meal name already has a static translation entry
 * (so we don't waste an API call on it).
 */
export function hasMealNameTranslation(name: string): boolean {
  return Boolean(
    findKeyCaseInsensitive(MEAL_NAME_TRANSLATIONS, name) ||
    findKeyCaseInsensitive(DYNAMIC_NAME_CACHE, name)
  );
}

export function hasMealDescriptionTranslation(description: string): boolean {
  return Boolean(
    findKeyCaseInsensitive(MEAL_DESCRIPTION_TRANSLATIONS, description) ||
    findKeyCaseInsensitive(DYNAMIC_DESCRIPTION_CACHE, description)
  );
}

export function hasTagTranslation(tag: string): boolean {
  return Boolean(
    findKeyCaseInsensitive(TAG_TRANSLATIONS, tag) ||
    findKeyCaseInsensitive(DYNAMIC_TAG_CACHE, tag)
  );
}

// Case-insensitive lookup helper. Backend meals sometimes ship with
// minor casing differences (e.g. "Caesar Salad with chicken" vs the
// static "Caesar Salad with Chicken") and we don't want a single
// lowercase letter to drop the meal back to English.
const normalizeLookupText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .replace(/[.!]+$/g, '')
    .trim();

const findKeyCaseInsensitive = (
  store: Record<string, Partial<Record<AppLanguage, string>>>,
  needle: string,
): string | undefined => {
  if (store[needle]) return needle;
  const normalized = normalizeLookupText(needle);
  return Object.keys(store).find((k) => normalizeLookupText(k) === normalized);
};

export const translateMealName = (name: string, language: AppLanguage): string => {
  if (language === 'English') return name;
  const staticKey = findKeyCaseInsensitive(MEAL_NAME_TRANSLATIONS, name);
  if (staticKey && MEAL_NAME_TRANSLATIONS[staticKey][language]) {
    return MEAL_NAME_TRANSLATIONS[staticKey][language] as string;
  }
  const dynKey = findKeyCaseInsensitive(DYNAMIC_NAME_CACHE, name);
  if (dynKey && DYNAMIC_NAME_CACHE[dynKey][language]) {
    return DYNAMIC_NAME_CACHE[dynKey][language] as string;
  }
  return name;
};

export const translateMealDescription = (description: string, language: AppLanguage): string => {
  if (language === 'English') return description;
  const staticKey = findKeyCaseInsensitive(MEAL_DESCRIPTION_TRANSLATIONS, description);
  if (staticKey && MEAL_DESCRIPTION_TRANSLATIONS[staticKey][language]) {
    return MEAL_DESCRIPTION_TRANSLATIONS[staticKey][language] as string;
  }
  const dynKey = findKeyCaseInsensitive(DYNAMIC_DESCRIPTION_CACHE, description);
  if (dynKey && DYNAMIC_DESCRIPTION_CACHE[dynKey][language]) {
    return DYNAMIC_DESCRIPTION_CACHE[dynKey][language] as string;
  }
  return description;
};

export const translateMealTag = (tag: string, language: AppLanguage): string => {
  if (language === 'English') return tag;
  const staticKey = findKeyCaseInsensitive(TAG_TRANSLATIONS, tag);
  if (staticKey && TAG_TRANSLATIONS[staticKey][language]) {
    return TAG_TRANSLATIONS[staticKey][language] as string;
  }
  const dynKey = findKeyCaseInsensitive(DYNAMIC_TAG_CACHE, tag);
  if (dynKey && DYNAMIC_TAG_CACHE[dynKey][language]) {
    return DYNAMIC_TAG_CACHE[dynKey][language] as string;
  }
  return (
    tag
  );
};

export const translateMealPeriod = (period: string, language: AppLanguage): string => {
  return PERIOD_TRANSLATIONS[period]?.[language] ?? period;
};

export const translateMealTimeRange = (timeRange: string, language: AppLanguage): string => {
  if (language === 'English') return timeRange;
  const key = findKeyCaseInsensitive(TIME_RANGE_TRANSLATIONS, timeRange);
  return key ? (TIME_RANGE_TRANSLATIONS[key]?.[language] ?? timeRange) : timeRange;
};
