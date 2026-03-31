import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect, useRef } from 'react';
import { AccessibilityInfo } from 'react-native';

// ---------- Types ----------

export type Language = 'English' | 'Español' | 'Français' | '中文';
export type TextSize = 'large' | 'xlarge' | 'xxlarge';

export type AccessibilitySettings = {
  highContrastMode: boolean;
  largeTouchTargets: boolean;
  screenReaderSupport: boolean;
};

export type NotificationSettings = {
  mealReminders: boolean;
  orderUpdates: boolean;
  menuUpdates: boolean;
};

// ---------- Translation Keys ----------

export type TranslationKeys = {
  // Global
  back: string;
  backToMenu: string;
  // Settings
  settings: string;
  language: string;
  textSize: string;
  accessibility: string;
  highContrast: string;
  highContrastDesc: string;
  largeTouchTargets: string;
  largeTouchTargetsDesc: string;
  screenReader: string;
  screenReaderDesc: string;
  dietaryRestrictions: string;
  managedByCaregiver: string;
  notifications: string;
  mealReminders: string;
  mealRemindersDesc: string;
  orderUpdates: string;
  orderUpdatesDesc: string;
  menuUpdates: string;
  menuUpdatesDesc: string;
  account: string;
  editResident: string;
  deliveryPrefs: string;
  supportHelp: string;
  logOut: string;
  large: string;
  extraLarge: string;
  xxlarge: string;
  // Home
  goodMorning: string;
  goodAfternoon: string;
  goodEvening: string;
  quickActions: string;
  seeAll: string;
  browseMenu: string;
  mealsAvailable: string;
  upcomingMeals: string;
  activeOrders: string;
  grannyGBT: string;
  aiMealAssistant: string;
  myCart: string;
  itemsReady: string;
  // Browse Meals
  availableMenus: string;
  orderingFor: string;
  allDay: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  beverages: string;
  desserts: string;
  sides: string;
  seasonal: string;
  tapToAdd: string;
  meals: string;
  // Cart
  yourCart: string;
  cartEmpty: string;
  cartEmptyDesc: string;
  remove: string;
  totalNutrition: string;
  totalCalories: string;
  totalSodium: string;
  totalProtein: string;
  confirmOrder: string;
  // Upcoming Meals
  activeOrdersLabel: string;
  completed: string;
  noUpcoming: string;
  noUpcomingDesc: string;
  orderNutrition: string;
  calories: string;
  sodium: string;
  protein: string;
  confirmed: string;
  preparing: string;
  ready: string;
  mealCompleted: string;
  startPreparing: string;
  markReady: string;
  markCompleted: string;
  // Login
  whoAreYou: string;
  personalMealCompanion: string;
  // AI
  aiAssistantDesc: string;
  browseMenusDesc: string;
  browseMenus: string;
  orderHistory: string;
  orderHistoryDesc: string;
  upcomingMealsDesc: string;
  aiAssistant: string;
  // Shared additional UI
  today: string;
  tomorrow: string;
  mealAdvisorFor: string;
  quickQuestionsLabel: string;
  thinking: string;
  askAboutMeals: string;
  typeYourMessage: string;
  somethingWentWrong: string;
  whatsOnMenuToday: string;
  recommendAMeal: string;
  viewDietaryRestrictionsPrompt: string;
  whatMealsLowSodium: string;
  placeLunchOrder: string;
  // Fallback / offline responses
  heresTheMenu: string;
  aiOfflineMenuAvailable: string;
  topPicksFor: string;
  aiCurrentlyOffline: string;
  youCanStillTry: string;
  viewTodaysMeals: string;
  seeTopPicks: string;
  tryAgainMoment: string;
  grannyWelcome: string;
  grannyWelcomeShort: string;
  noRecommendation: string;
};

const EN: TranslationKeys = {
  back: '← Back',
  backToMenu: '← Back to Menu',
  settings: 'Settings',
  language: 'Language',
  textSize: 'Text Size',
  accessibility: 'Accessibility',
  highContrast: 'High Contrast Mode',
  highContrastDesc: 'Increase contrast for better visibility',
  largeTouchTargets: 'Large Touch Targets',
  largeTouchTargetsDesc: 'Make buttons and links easier to tap',
  screenReader: 'Screen Reader Support',
  screenReaderDesc: 'Enhanced compatibility with screen readers',
  dietaryRestrictions: 'Dietary Restrictions',
  managedByCaregiver: 'Dietary restrictions are managed by your caregiver or facility admin. Contact staff to request changes.',
  notifications: 'Notifications',
  mealReminders: 'Meal Reminders',
  mealRemindersDesc: 'Get notified before meal times',
  orderUpdates: 'Order Updates',
  orderUpdatesDesc: 'Updates on meal confirmations',
  menuUpdates: 'Menu Updates',
  menuUpdatesDesc: 'New seasonal items and specials',
  account: 'Account',
  editResident: 'Edit Resident Information',
  deliveryPrefs: 'Delivery Preferences',
  supportHelp: 'Support & Help',
  logOut: 'Log Out',
  large: 'Large',
  extraLarge: 'Extra Large',
  xxlarge: 'Extra Extra Large',
  goodMorning: 'Good Morning',
  goodAfternoon: 'Good Afternoon',
  goodEvening: 'Good Evening',
  quickActions: 'Quick Actions',
  seeAll: 'See All',
  browseMenu: 'Browse Menu',
  mealsAvailable: 'meals available today',
  upcomingMeals: 'Upcoming Meals',
  activeOrders: 'active orders',
  grannyGBT: 'GrannyGBT',
  aiMealAssistant: 'AI meal assistant',
  myCart: 'My Cart',
  itemsReady: 'items ready to order',
  availableMenus: 'Available Menus',
  orderingFor: 'Ordering for',
  allDay: 'All Day',
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  beverages: 'Beverages',
  desserts: 'Desserts',
  sides: 'Sides',
  seasonal: 'Seasonal',
  tapToAdd: 'Tap to add to order',
  meals: 'Meals',
  yourCart: 'Your Cart',
  cartEmpty: 'Your cart is empty',
  cartEmptyDesc: 'Add meals from the menu to get started',
  remove: 'Remove',
  totalNutrition: 'Total Nutrition',
  totalCalories: 'Total Calories',
  totalSodium: 'Total Sodium',
  totalProtein: 'Total Protein',
  confirmOrder: 'Confirm Order',
  activeOrdersLabel: 'Active Orders',
  completed: 'Completed',
  noUpcoming: 'No upcoming meals',
  noUpcomingDesc: 'Order meals from the browse menu to see them here',
  orderNutrition: 'Order Nutrition',
  calories: 'calories',
  sodium: 'sodium',
  protein: 'protein',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  mealCompleted: 'Meal completed',
  startPreparing: 'Start Preparing',
  markReady: 'Mark as Ready',
  markCompleted: 'Mark as Completed',
  whoAreYou: 'Who are you?',
  personalMealCompanion: 'Your personal meal companion',
  aiAssistantDesc: 'Get personalized meal suggestions',
  browseMenusDesc: 'View daily specials and seasonal menus',
  browseMenus: 'Browse Menus',
  orderHistory: 'Order History',
  orderHistoryDesc: 'View past meal orders',
  upcomingMealsDesc: 'View confirmed and pending meals',
  aiAssistant: 'AI Assistant',
  today: 'Today',
  tomorrow: 'Tomorrow',
  mealAdvisorFor: 'Meal advisor for',
  quickQuestionsLabel: 'Quick questions:',
  thinking: 'Thinking...',
  askAboutMeals: 'Ask about meals...',
  typeYourMessage: 'Type your message...',
  somethingWentWrong: 'Something went wrong — please try again! 😅',
  whatsOnMenuToday: "What's on the menu today?",
  recommendAMeal: 'Recommend a meal',
  viewDietaryRestrictionsPrompt: 'View dietary restrictions',
  whatMealsLowSodium: 'What meals are low sodium?',
  placeLunchOrder: 'Place lunch order',
  heresTheMenu: "Here's the menu!",
  aiOfflineMenuAvailable: 'AI is currently offline, but the menu data is still available.',
  topPicksFor: 'Top picks for',
  aiCurrentlyOffline: 'AI is currently offline.',
  youCanStillTry: 'You can still try:',
  viewTodaysMeals: "View today's meals",
  seeTopPicks: 'See top picks',
  tryAgainMoment: 'Or try again in a moment!',
  grannyWelcome: "Hey! 👋 I'm GrannyGBT, your meal planning assistant. I've got {name}'s dietary profile loaded up — allergies, nutrition goals, the works.\n\nWhat can I help you with?",
  grannyWelcomeShort: "Hey! 👋 I'm GrannyGBT, your meal planning assistant for {name}. I've got their dietary needs covered.\n\nWhat can I help with?",
  noRecommendation: 'No recommendation available.',
};

const ES: TranslationKeys = {
  back: '← Volver',
  backToMenu: '← Volver al Menú',
  settings: 'Ajustes',
  language: 'Idioma',
  textSize: 'Tamaño de Texto',
  accessibility: 'Accesibilidad',
  highContrast: 'Modo Alto Contraste',
  highContrastDesc: 'Aumentar contraste para mejor visibilidad',
  largeTouchTargets: 'Botones Grandes',
  largeTouchTargetsDesc: 'Hacer botones más fáciles de tocar',
  screenReader: 'Lector de Pantalla',
  screenReaderDesc: 'Compatibilidad mejorada con lectores',
  dietaryRestrictions: 'Restricciones Dietéticas',
  managedByCaregiver: 'Las restricciones dietéticas son administradas por su cuidador. Contacte al personal para cambios.',
  notifications: 'Notificaciones',
  mealReminders: 'Recordatorios de Comidas',
  mealRemindersDesc: 'Recibir aviso antes de las comidas',
  orderUpdates: 'Estado de Pedidos',
  orderUpdatesDesc: 'Actualizaciones de confirmaciones',
  menuUpdates: 'Cambios en el Menú',
  menuUpdatesDesc: 'Nuevos platos y especiales de temporada',
  account: 'Cuenta',
  editResident: 'Editar Información de Residente',
  deliveryPrefs: 'Preferencias de Entrega',
  supportHelp: 'Soporte y Ayuda',
  logOut: 'Cerrar Sesión',
  large: 'Grande',
  extraLarge: 'Extra Grande',
  xxlarge: 'Extra Extra Grande',
  goodMorning: 'Buenos Días',
  goodAfternoon: 'Buenas Tardes',
  goodEvening: 'Buenas Noches',
  quickActions: 'Acciones Rápidas',
  seeAll: 'Ver Todo',
  browseMenu: 'Ver Menú',
  mealsAvailable: 'comidas disponibles hoy',
  upcomingMeals: 'Próximas Comidas',
  activeOrders: 'pedidos activos',
  grannyGBT: 'GrannyGBT',
  aiMealAssistant: 'Asistente de comidas IA',
  myCart: 'Mi Carrito',
  itemsReady: 'artículos listos para pedir',
  availableMenus: 'Menús Disponibles',
  orderingFor: 'Pidiendo para',
  allDay: 'Todo el Día',
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  beverages: 'Bebidas',
  desserts: 'Postres',
  sides: 'Acompañamientos',
  seasonal: 'De Temporada',
  tapToAdd: 'Toque para agregar al pedido',
  meals: 'Comidas',
  yourCart: 'Tu Carrito',
  cartEmpty: 'Tu carrito está vacío',
  cartEmptyDesc: 'Agrega comidas del menú para comenzar',
  remove: 'Eliminar',
  totalNutrition: 'Nutrición Total',
  totalCalories: 'Calorías Totales',
  totalSodium: 'Sodio Total',
  totalProtein: 'Proteína Total',
  confirmOrder: 'Confirmar Pedido',
  activeOrdersLabel: 'Pedidos Activos',
  completed: 'Completado',
  noUpcoming: 'Sin comidas próximas',
  noUpcomingDesc: 'Pide comidas del menú para verlas aquí',
  orderNutrition: 'Nutrición del Pedido',
  calories: 'calorías',
  sodium: 'sodio',
  protein: 'proteína',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  mealCompleted: 'Comida completada',
  startPreparing: 'Comenzar Preparación',
  markReady: 'Marcar como Listo',
  markCompleted: 'Marcar como Completado',
  whoAreYou: '¿Quién eres?',
  personalMealCompanion: 'Tu compañero personal de comidas',
  aiAssistantDesc: 'Sugerencias personalizadas de comidas',
  browseMenusDesc: 'Especiales diarios y menús de temporada',
  browseMenus: 'Ver Menús',
  orderHistory: 'Historial de Pedidos',
  orderHistoryDesc: 'Ver pedidos anteriores',
  upcomingMealsDesc: 'Ver comidas confirmadas y pendientes',
  aiAssistant: 'Asistente IA',
  today: 'Hoy',
  tomorrow: 'Mañana',
  mealAdvisorFor: 'Asesor de comidas para',
  quickQuestionsLabel: 'Preguntas rápidas:',
  thinking: 'Pensando...',
  askAboutMeals: 'Pregunta sobre comidas...',
  typeYourMessage: 'Escribe tu mensaje...',
  somethingWentWrong: 'Algo salió mal. ¡Inténtalo de nuevo! 😅',
  whatsOnMenuToday: '¿Qué hay en el menú hoy?',
  recommendAMeal: 'Recomiéndame una comida',
  viewDietaryRestrictionsPrompt: 'Ver restricciones dietéticas',
  whatMealsLowSodium: '¿Qué comidas son bajas en sodio?',
  placeLunchOrder: 'Pedir almuerzo',
  heresTheMenu: '¡Aquí está el menú!',
  aiOfflineMenuAvailable: 'La IA está fuera de línea, pero los datos del menú siguen disponibles.',
  topPicksFor: 'Mejores opciones para',
  aiCurrentlyOffline: 'La IA está fuera de línea.',
  youCanStillTry: 'Puedes intentar:',
  viewTodaysMeals: 'Ver las comidas de hoy',
  seeTopPicks: 'Ver mejores opciones',
  tryAgainMoment: '¡O inténtalo de nuevo en un momento!',
  grannyWelcome: '¡Hola! 👋 Soy GrannyGBT, tu asistente de planificación de comidas. Tengo el perfil dietético de {name} cargado — alergias, objetivos nutricionales, todo.\n\n¿En qué puedo ayudarte?',
  grannyWelcomeShort: '¡Hola! 👋 Soy GrannyGBT, tu asistente de comidas para {name}. Tengo sus necesidades dietéticas cubiertas.\n\n¿En qué puedo ayudar?',
  noRecommendation: 'No hay recomendación disponible.',
};

const FR: TranslationKeys = {
  back: '← Retour',
  backToMenu: '← Retour au Menu',
  settings: 'Paramètres',
  language: 'Langue',
  textSize: 'Taille du Texte',
  accessibility: 'Accessibilité',
  highContrast: 'Mode Contraste Élevé',
  highContrastDesc: 'Augmenter le contraste pour mieux voir',
  largeTouchTargets: 'Grands Boutons',
  largeTouchTargetsDesc: 'Rendre les boutons plus faciles à toucher',
  screenReader: "Lecteur d'Écran",
  screenReaderDesc: 'Compatibilité améliorée avec les lecteurs',
  dietaryRestrictions: 'Restrictions Alimentaires',
  managedByCaregiver: 'Les restrictions sont gérées par votre soignant. Contactez le personnel pour des modifications.',
  notifications: 'Notifications',
  mealReminders: 'Rappels de Repas',
  mealRemindersDesc: 'Être notifié avant les repas',
  orderUpdates: 'Suivi des Commandes',
  orderUpdatesDesc: 'Mises à jour des confirmations',
  menuUpdates: 'Mises à Jour du Menu',
  menuUpdatesDesc: 'Nouveaux plats et spécialités',
  account: 'Compte',
  editResident: 'Modifier les Informations',
  deliveryPrefs: 'Préférences de Livraison',
  supportHelp: 'Support et Aide',
  logOut: 'Déconnexion',
  large: 'Grand',
  extraLarge: 'Très Grand',
  xxlarge: 'Très Très Grand',
  goodMorning: 'Bonjour',
  goodAfternoon: 'Bon Après-midi',
  goodEvening: 'Bonsoir',
  quickActions: 'Actions Rapides',
  seeAll: 'Voir Tout',
  browseMenu: 'Voir le Menu',
  mealsAvailable: 'repas disponibles',
  upcomingMeals: 'Repas à Venir',
  activeOrders: 'commandes actives',
  grannyGBT: 'GrannyGBT',
  aiMealAssistant: 'Assistant repas IA',
  myCart: 'Mon Panier',
  itemsReady: 'articles prêts à commander',
  availableMenus: 'Menus Disponibles',
  orderingFor: 'Commande pour',
  allDay: 'Toute la Journée',
  breakfast: 'Petit Déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  beverages: 'Boissons',
  desserts: 'Desserts',
  sides: 'Accompagnements',
  seasonal: 'Saisonnier',
  tapToAdd: 'Appuyez pour ajouter',
  meals: 'Repas',
  yourCart: 'Votre Panier',
  cartEmpty: 'Votre panier est vide',
  cartEmptyDesc: 'Ajoutez des repas depuis le menu',
  remove: 'Supprimer',
  totalNutrition: 'Nutrition Totale',
  totalCalories: 'Calories Totales',
  totalSodium: 'Sodium Total',
  totalProtein: 'Protéines Totales',
  confirmOrder: 'Confirmer la Commande',
  activeOrdersLabel: 'Commandes Actives',
  completed: 'Terminé',
  noUpcoming: 'Aucun repas à venir',
  noUpcomingDesc: 'Commandez des repas du menu pour les voir ici',
  orderNutrition: 'Nutrition de la Commande',
  calories: 'calories',
  sodium: 'sodium',
  protein: 'protéines',
  confirmed: 'Confirmé',
  preparing: 'En Préparation',
  ready: 'Prêt',
  mealCompleted: 'Repas terminé',
  startPreparing: 'Commencer la Préparation',
  markReady: 'Marquer comme Prêt',
  markCompleted: 'Marquer comme Terminé',
  whoAreYou: 'Qui êtes-vous?',
  personalMealCompanion: 'Votre compagnon repas personnel',
  aiAssistantDesc: 'Suggestions de repas personnalisées',
  browseMenusDesc: 'Spécialités du jour et menus',
  browseMenus: 'Parcourir les Menus',
  orderHistory: 'Historique des Commandes',
  orderHistoryDesc: 'Voir les commandes passées',
  upcomingMealsDesc: 'Voir les repas confirmés et en attente',
  aiAssistant: 'Assistant IA',
  today: "Aujourd'hui",
  tomorrow: 'Demain',
  mealAdvisorFor: 'Conseiller repas pour',
  quickQuestionsLabel: 'Questions rapides :',
  thinking: 'Réflexion...',
  askAboutMeals: 'Posez une question sur les repas...',
  typeYourMessage: 'Tapez votre message...',
  somethingWentWrong: "Une erreur s'est produite — veuillez réessayer ! 😅",
  whatsOnMenuToday: "Qu'y a-t-il au menu aujourd'hui ?",
  recommendAMeal: 'Recommander un repas',
  viewDietaryRestrictionsPrompt: 'Voir les restrictions alimentaires',
  whatMealsLowSodium: 'Quels repas sont faibles en sodium ?',
  placeLunchOrder: 'Commander le déjeuner',
  heresTheMenu: 'Voici le menu !',
  aiOfflineMenuAvailable: "L'IA est hors ligne, mais les données du menu sont toujours disponibles.",
  topPicksFor: 'Meilleurs choix pour',
  aiCurrentlyOffline: "L'IA est actuellement hors ligne.",
  youCanStillTry: 'Vous pouvez essayer :',
  viewTodaysMeals: "Voir les repas d'aujourd'hui",
  seeTopPicks: 'Voir les meilleurs choix',
  tryAgainMoment: 'Ou réessayez dans un instant !',
  grannyWelcome: "Salut ! 👋 Je suis GrannyGBT, votre assistant de planification des repas. J'ai le profil diététique de {name} — allergies, objectifs nutritionnels, tout.\n\nComment puis-je vous aider ?",
  grannyWelcomeShort: "Salut ! 👋 Je suis GrannyGBT, votre assistant repas pour {name}. Ses besoins alimentaires sont pris en charge.\n\nComment puis-je aider ?",
  noRecommendation: 'Aucune recommandation disponible.',
};

const ZH: TranslationKeys = {
  back: '← 返回',
  backToMenu: '← 返回菜单',
  settings: '设置',
  language: '语言',
  textSize: '字体大小',
  accessibility: '辅助功能',
  highContrast: '高对比度模式',
  highContrastDesc: '提高对比度以获得更好的可见性',
  largeTouchTargets: '大按钮模式',
  largeTouchTargetsDesc: '使按钮更容易点击',
  screenReader: '屏幕阅读器支持',
  screenReaderDesc: '增强与屏幕阅读器的兼容性',
  dietaryRestrictions: '饮食限制',
  managedByCaregiver: '饮食限制由您的护理人员管理。如需更改，请联系工作人员。',
  notifications: '通知',
  mealReminders: '用餐提醒',
  mealRemindersDesc: '在用餐时间前收到通知',
  orderUpdates: '订单更新',
  orderUpdatesDesc: '餐食确认的更新',
  menuUpdates: '菜单更新',
  menuUpdatesDesc: '新的季节性菜品和特色菜',
  account: '账户',
  editResident: '编辑住户信息',
  deliveryPrefs: '配送偏好',
  supportHelp: '支持与帮助',
  logOut: '退出登录',
  large: '大',
  extraLarge: '特大',
  xxlarge: '超大',
  goodMorning: '早上好',
  goodAfternoon: '下午好',
  goodEvening: '晚上好',
  quickActions: '快捷操作',
  seeAll: '查看全部',
  browseMenu: '浏览菜单',
  mealsAvailable: '道菜品可供选择',
  upcomingMeals: '即将到来的餐食',
  activeOrders: '个活动订单',
  grannyGBT: 'GrannyGBT',
  aiMealAssistant: 'AI 餐食助手',
  myCart: '我的购物车',
  itemsReady: '项准备下单',
  availableMenus: '可用菜单',
  orderingFor: '为以下人员点餐',
  allDay: '全天',
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  beverages: '饮品',
  desserts: '甜点',
  sides: '配菜',
  seasonal: '时令',
  tapToAdd: '点击添加到订单',
  meals: '餐食',
  yourCart: '您的购物车',
  cartEmpty: '购物车为空',
  cartEmptyDesc: '从菜单中添加餐食开始',
  remove: '移除',
  totalNutrition: '总营养',
  totalCalories: '总卡路里',
  totalSodium: '总钠',
  totalProtein: '总蛋白质',
  confirmOrder: '确认订单',
  activeOrdersLabel: '活动订单',
  completed: '已完成',
  noUpcoming: '没有即将到来的餐食',
  noUpcomingDesc: '从菜单中点餐即可在此查看',
  orderNutrition: '订单营养',
  calories: '卡路里',
  sodium: '钠',
  protein: '蛋白质',
  confirmed: '已确认',
  preparing: '准备中',
  ready: '就绪',
  mealCompleted: '餐食已完成',
  startPreparing: '开始准备',
  markReady: '标记为就绪',
  markCompleted: '标记为已完成',
  whoAreYou: '你是谁？',
  personalMealCompanion: '您的个人餐食伴侣',
  aiAssistantDesc: '获取个性化餐食建议',
  browseMenusDesc: '查看每日特色和季节菜单',
  browseMenus: '浏览菜单',
  orderHistory: '订单历史',
  orderHistoryDesc: '查看过去的订单',
  upcomingMealsDesc: '查看已确认和待处理的餐食',
  aiAssistant: 'AI 助手',
  today: '今天',
  tomorrow: '明天',
  mealAdvisorFor: '餐食顾问',
  quickQuestionsLabel: '快速问题：',
  thinking: '思考中...',
  askAboutMeals: '询问餐食...',
  typeYourMessage: '输入你的消息...',
  somethingWentWrong: '出错了，请重试！😅',
  whatsOnMenuToday: '今天菜单有什么？',
  recommendAMeal: '推荐一份餐食',
  viewDietaryRestrictionsPrompt: '查看饮食限制',
  whatMealsLowSodium: '哪些餐食低钠？',
  placeLunchOrder: '下单午餐',
  heresTheMenu: '这是菜单！',
  aiOfflineMenuAvailable: 'AI目前离线，但菜单数据仍然可用。',
  topPicksFor: '为以下人员的最佳推荐',
  aiCurrentlyOffline: 'AI目前离线。',
  youCanStillTry: '您仍可以尝试：',
  viewTodaysMeals: '查看今日餐食',
  seeTopPicks: '查看最佳推荐',
  tryAgainMoment: '或稍后再试！',
  grannyWelcome: '你好！👋 我是GrannyGBT，您的餐食规划助手。我已经加载了{name}的饮食档案——过敏信息、营养目标，一应俱全。\n\n有什么可以帮您的？',
  grannyWelcomeShort: '你好！👋 我是GrannyGBT，{name}的餐食助手。他们的饮食需求已覆盖。\n\n有什么可以帮忙的？',
  noRecommendation: '暂无推荐。',
};

const TRANSLATIONS: Record<Language, TranslationKeys> = {
  English: EN,
  'Español': ES,
  'Français': FR,
  '中文': ZH,
};

// ---------- Text Size Scales ----------

const TEXT_SIZE_SCALES: Record<TextSize, number> = {
  large: 1.2,
  xlarge: 1.4,
  xxlarge: 1.6,
};

// ---------- Per-Resident Settings ----------

type PerResidentSettings = {
  language: Language;
  textSize: TextSize;
  accessibility: AccessibilitySettings;
  notifications: NotificationSettings;
};

const DEFAULT_PER_RESIDENT: PerResidentSettings = {
  language: 'English',
  textSize: 'large',
  accessibility: {
    highContrastMode: false,
    largeTouchTargets: true,
    screenReaderSupport: false,
  },
  notifications: {
    mealReminders: true,
    orderUpdates: true,
    menuUpdates: false,
  },
};

// ---------- Context Type ----------

type SettingsContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  fontScale: number;
  scaled: (base: number) => number;
  accessibility: AccessibilitySettings;
  toggleAccessibility: (key: keyof AccessibilitySettings) => void;
  notifications: NotificationSettings;
  toggleNotification: (key: keyof NotificationSettings) => void;
  getTouchTargetSize: () => number;
  theme: {
    background: string;
    surface: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    accent: string;
    success: string;
    danger: string;
  };
  currentResidentId: string | null;
  setCurrentResidentId: (id: string | null) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  // Per-resident settings: each resident gets their own preferences
  const [currentResidentId, setCurrentResidentIdState] = useState<string | null>(null);
  const [residentSettings, setResidentSettings] = useState<Record<string, PerResidentSettings>>({});
  const currentResidentIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentResidentIdRef.current = currentResidentId;
  }, [currentResidentId]);

  const setCurrentResidentId = useCallback((id: string | null) => {
    setCurrentResidentIdState(id);
  }, []);

  // Derive active settings from the current resident (or global default)
  const residentKey = currentResidentId ?? '__default__';
  const currentSettings: PerResidentSettings = residentSettings[residentKey] ?? DEFAULT_PER_RESIDENT;
  const { language, textSize, accessibility, notifications } = currentSettings;

  // Update only the current resident's settings slice
  const updateCurrentSettings = useCallback(
    (updater: (prev: PerResidentSettings) => PerResidentSettings) => {
      setResidentSettings(prev => {
        const key = currentResidentIdRef.current ?? '__default__';
        return { ...prev, [key]: updater(prev[key] ?? DEFAULT_PER_RESIDENT) };
      });
    },
    [],
  );

  const setLanguage = useCallback(
    (lang: Language) => updateCurrentSettings(prev => ({ ...prev, language: lang })),
    [updateCurrentSettings],
  );

  const setTextSize = useCallback(
    (size: TextSize) => updateCurrentSettings(prev => ({ ...prev, textSize: size })),
    [updateCurrentSettings],
  );

  const toggleAccessibility = useCallback(
    (key: keyof AccessibilitySettings) =>
      updateCurrentSettings(prev => ({
        ...prev,
        accessibility: { ...prev.accessibility, [key]: !prev.accessibility[key] },
      })),
    [updateCurrentSettings],
  );

  const toggleNotification = useCallback(
    (key: keyof NotificationSettings) =>
      updateCurrentSettings(prev => ({
        ...prev,
        notifications: { ...prev.notifications, [key]: !prev.notifications[key] },
      })),
    [updateCurrentSettings],
  );

  const t = useMemo(() => TRANSLATIONS[language], [language]);
  const fontScale = useMemo(() => TEXT_SIZE_SCALES[textSize], [textSize]);
  const scaled = useCallback((base: number) => Math.round(base * TEXT_SIZE_SCALES[textSize]), [textSize]);

  const getTouchTargetSize = useCallback(() => {
    return accessibility.largeTouchTargets ? 56 : 44;
  }, [accessibility.largeTouchTargets]);

  const theme = useMemo(
    () =>
      accessibility.highContrastMode
        ? {
            background: '#111111',
            surface: '#000000',
            textPrimary: '#FFFFFF',
            textSecondary: '#E5E5E5',
            border: '#FFFFFF',
            accent: '#FFD400',
            success: '#00E676',
            danger: '#FF6B6B',
          }
        : {
            background: '#F5F3EF',
            surface: '#FFFFFF',
            textPrimary: '#3A3A3A',
            textSecondary: '#8A8A8A',
            border: '#E5E7EB',
            accent: '#717644',
            success: '#15803d',
            danger: '#d27028',
          },
    [accessibility.highContrastMode],
  );

  const prevA11yRef = useRef({
    language,
    textSize,
    highContrastMode: accessibility.highContrastMode,
    largeTouchTargets: accessibility.largeTouchTargets,
  });

  useEffect(() => {
    if (!accessibility.screenReaderSupport) {
      prevA11yRef.current = {
        language,
        textSize,
        highContrastMode: accessibility.highContrastMode,
        largeTouchTargets: accessibility.largeTouchTargets,
      };
      return;
    }

    const prev = prevA11yRef.current;
    const announcements: string[] = [];

    if (prev.language !== language) announcements.push(`Language changed to ${language}.`);
    if (prev.textSize !== textSize) announcements.push(`Text size set to ${textSize}.`);
    if (prev.highContrastMode !== accessibility.highContrastMode) {
      announcements.push(accessibility.highContrastMode ? 'High contrast mode enabled.' : 'High contrast mode disabled.');
    }
    if (prev.largeTouchTargets !== accessibility.largeTouchTargets) {
      announcements.push(accessibility.largeTouchTargets ? 'Large touch targets enabled.' : 'Large touch targets disabled.');
    }

    if (announcements.length > 0) {
      AccessibilityInfo.announceForAccessibility(announcements.join(' '));
    }

    prevA11yRef.current = {
      language,
      textSize,
      highContrastMode: accessibility.highContrastMode,
      largeTouchTargets: accessibility.largeTouchTargets,
    };
  }, [accessibility.highContrastMode, accessibility.largeTouchTargets, accessibility.screenReaderSupport, language, textSize]);

  return (
    <SettingsContext.Provider
      value={{
        language,
        setLanguage,
        t,
        textSize,
        setTextSize,
        fontScale,
        scaled,
        accessibility,
        toggleAccessibility,
        notifications,
        toggleNotification,
        getTouchTargetSize,
        theme,
        currentResidentId,
        setCurrentResidentId,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
