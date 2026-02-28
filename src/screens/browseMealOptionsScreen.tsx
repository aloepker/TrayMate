import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import { StatusBar } from "react-native";
import { useCart } from "./context/CartContext";
import { useSettings } from './context/SettingsContext';

// Local CSV-backed data service (temporary until API is ready)
import {
  MealService,
  ResidentService,
  RecommendationService,
  Meal as ServiceMeal,
} from "../services/localDataService";
import {
  translateMealDescription,
  translateMealName,
  translateMealPeriod,
  translateMealTag,
  translateMealTimeRange,
} from "../services/mealLocalization";

import { geminiChat } from "../services/geminiService";


const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Meal placeholder image colors based on meal type
const MEAL_PLACEHOLDER_COLORS: Record<string, { bg: string; accent: string; emoji: string }> = {
  'Banana-Chocolate Pancakes': { bg: '#FEF3C7', accent: '#92400E', emoji: '🥞' },
  'Broccoli-Cheddar Quiche': { bg: '#DCFCE7', accent: '#166534', emoji: '🥧' },
  'Caesar Salad with Chicken': { bg: '#D1FAE5', accent: '#065F46', emoji: '🥗' },
  'Citrus Butter Salmon': { bg: '#DBEAFE', accent: '#1E40AF', emoji: '🐟' },
  'Chicken Bruschetta': { bg: '#FEE2E2', accent: '#991B1B', emoji: '🍗' },
  'Breakfast Banana Split': { bg: '#FCE7F3', accent: '#9D174D', emoji: '🍌' },
  'Herb Baked Chicken': { bg: '#FEF3C7', accent: '#78350F', emoji: '🍗' },
  'Garden Vegetable Medley': { bg: '#DCFCE7', accent: '#14532D', emoji: '🥦' },
  'Strawberry Belgian Waffle': { bg: '#FCE7F3', accent: '#831843', emoji: '🧇' },
  'Spring Menu Special': { bg: '#E0E7FF', accent: '#3730A3', emoji: '🌸' },
  'Grilled Salmon Fillet': { bg: '#CFFAFE', accent: '#155E75', emoji: '🐟' },
  'Oatmeal Bowl': { bg: '#FEF3C7', accent: '#78350F', emoji: '🥣' },
};

const getMealPlaceholder = (mealName: string) => {
  return MEAL_PLACEHOLDER_COLORS[mealName] || { bg: '#F3F4F6', accent: '#6B7280', emoji: '🍽' };
};

// ---------- Rich Text Renderer for Chat ----------
const ChatRichText = ({
  text,
  isUser,
  scaled,
  language,
}: {
  text: string;
  isUser: boolean;
  scaled: (base: number) => number;
  language: 'English' | 'Español' | 'Français' | '中文';
}) => {
  const allMeals = MealService.getAllMeals();
  const lines = text.split('\n');

  return (
    <View>
      {lines.map((line, lineIdx) => {
        // Check if line has a bold meal name that matches a real meal
        const mealCardMatch = line.match(
          /^(?:\d+\.\s*|[•]\s*)?\*\*(.+?)\*\*(.*)$/,
        );
        const requestedMealName = mealCardMatch?.[1].toLowerCase().trim();
        const matchedMeal = mealCardMatch
          ? allMeals.find(
              m =>
                m.name.toLowerCase() === requestedMealName ||
                translateMealName(m.name, language).toLowerCase() === requestedMealName,
            )
          : null;

        if (matchedMeal && !isUser) {
          const ph = getMealPlaceholder(matchedMeal.name);
          return (
            <View key={lineIdx} style={chatRichStyles.mealCard}>
              <View style={[chatRichStyles.mealCardImage, { backgroundColor: ph.bg }]}>
                <Text style={chatRichStyles.mealCardEmoji}>{ph.emoji}</Text>
              </View>
              <View style={chatRichStyles.mealCardInfo}>
                <Text style={[chatRichStyles.mealCardName, { fontSize: scaled(14) }]}>
                  {translateMealName(matchedMeal.name, language)}
                </Text>
                <Text style={[chatRichStyles.mealCardMeta, { fontSize: scaled(11) }]}>
                  {translateMealPeriod(matchedMeal.mealPeriod, language)} · {translateMealTimeRange(matchedMeal.timeRange, language)}
                </Text>
                <Text style={[chatRichStyles.mealCardNutrition, { fontSize: scaled(10) }]}>
                  {matchedMeal.nutrition.calories} cal · {matchedMeal.nutrition.sodium} sodium
                </Text>
              </View>
            </View>
          );
        }

        if (line.trim() === '') {
          return <View key={lineIdx} style={{ height: 5 }} />;
        }

        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const isBullet = line.trimStart().startsWith('•') || line.trimStart().startsWith('-');

        return (
          <View key={lineIdx} style={[chatRichStyles.lineRow, isBullet && chatRichStyles.bulletRow]}>
            {parts.map((part, pi) => {
              const boldMatch = part.match(/^\*\*(.+)\*\*$/);
              if (boldMatch) {
                return (
                  <Text key={pi} style={[chatRichStyles.text, { fontSize: scaled(15), lineHeight: scaled(22) }, chatRichStyles.bold, isUser && chatRichStyles.textUser]}>
                    {boldMatch[1]}
                  </Text>
                );
              }
              return (
                <Text key={pi} style={[chatRichStyles.text, { fontSize: scaled(15), lineHeight: scaled(22) }, isUser && chatRichStyles.textUser]}>
                  {part}
                </Text>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

const chatRichStyles = StyleSheet.create({
  lineRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 2 },
  bulletRow: { paddingLeft: 4, marginBottom: 4 },
  text: { fontSize: 15, lineHeight: 22, color: '#374151' },
  textUser: { color: '#FFFFFF' },
  bold: { fontWeight: '700', color: '#111827' },
  mealCard: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    marginVertical: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mealCardImage: { width: 50, justifyContent: 'center', alignItems: 'center' },
  mealCardEmoji: { fontSize: 24 },
  mealCardInfo: { flex: 1, padding: 8 },
  mealCardName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 1 },
  mealCardMeta: { fontSize: 11, color: '#6B7280', marginBottom: 1 },
  mealCardNutrition: { fontSize: 10, color: '#b77f3f', fontWeight: '600' },
});

// ---------- TrayMate Color Palette (from design slide) ----------
const COLORS = {
  primary: "#717644",       // Olive green
  accent: "#f6a72d",        // Bright orange
  secondary: "#d27028",     // Burnt orange
  neutral: "#cbc2b4",       // Warm gray
  support: "#b77f3f",       // Caramel

  white: "#FFFFFF",
  textDark: "#111827",
  textMid: "#374151",
  textLight: "#6B7280",
  borderLight: "#E5E7EB",
  surface: "#F3F4F6",
};

// ---------- Types ----------
type Meal = {
  id: string;
  name: string;
  meal_period: "Breakfast" | "Lunch" | "Dinner";
  description: string;
  time_range: string;
  kcal: number;
  sodium_mg: number;
  protein_g: number;
  tags?: string[];
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
};

type Recommendation = {
  meal_name: string;
  reason: string;
  dietary_restrictions: string[];
};


// ---------- Period Tabs ----------
type PeriodOption = {
  key: string;
  value: Meal["meal_period"] | null;
};

const PERIOD_KEYS: PeriodOption[] = [
  { key: "allDay", value: null },
  { key: "breakfast", value: "Breakfast" },
  { key: "lunch", value: "Lunch" },
  { key: "dinner", value: "Dinner" },
];

// ---------- AI Chat Component ----------
const AIAssistantChat = ({
  visible,
  onClose,
  residentName,
  residentId,
}: {
  visible: boolean;
  onClose: () => void;
  residentName: string;
  residentId: string;
}) => {
  const { t, scaled, language } = useSettings();
  const QUICK_QUESTIONS = [
    t.whatsOnMenuToday,
    t.recommendAMeal,
    t.viewDietaryRestrictionsPrompt,
    t.placeLunchOrder,
  ];
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: t.grannyWelcomeShort.replace('{name}', residentName),
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // Initialize Gemini chat session when modal opens
  useEffect(() => {
    if (visible && geminiChat.isConfigured()) {
      geminiChat.initialize(residentId, language);
    }
  }, [visible, residentId, language]);

  // Minimal fallback when ALL Gemini models are down
  const generateFallbackResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();
    const allServiceMeals = MealService.getAllMeals();
    const menuItems = allServiceMeals
      .map(
        (m: ServiceMeal) =>
          `• **${translateMealName(m.name, language)}** (${translateMealPeriod(m.mealPeriod, language)}, ${translateMealTimeRange(m.timeRange, language)})`,
      )
      .join('\n');

    const isMenuQuery = lower.includes('menu') || lower.includes('today') || lower.includes('available') || lower.includes(t.whatsOnMenuToday.toLowerCase());
    const isRecommendQuery = lower.includes('recommend') || lower.includes('suggest') || lower.includes(t.recommendAMeal.toLowerCase());

    if (isMenuQuery) {
      return `${t.heresTheMenu} 📋\n\n${menuItems}\n\n${t.aiOfflineMenuAvailable}`;
    }
    if (isRecommendQuery) {
      const recs = RecommendationService.getRecommendations(residentId, null, 3);
      const recList = recs
        .map((r, i) => `${i + 1}. **${translateMealName(r.meal.name, language)}** — ${r.allReasons.join(', ')}`)
        .join('\n');
      return `${t.topPicksFor} ${residentName}:\n\n${recList}`;
    }
    return `${t.aiCurrentlyOffline} 😴\n\n${t.youCanStillTry}\n• **"menu"** — ${t.viewTodaysMeals}\n• **"recommend"** — ${t.seeTopPicks}\n\n${t.tryAgainMoment}`;
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      let responseText: string;

      if (geminiChat.isConfigured()) {
        try {
          responseText = await geminiChat.sendMessage(userMessage.content);
        } catch (apiError) {
          console.warn('Gemini API error:', apiError);
          responseText = generateFallbackResponse(userMessage.content);
        }
      } else {
        responseText = generateFallbackResponse(userMessage.content);
      }

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t.somethingWentWrong,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputText(question);
    setTimeout(async () => {
      setInputText('');
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: question,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);
      try {
        let responseText: string;
        if (geminiChat.isConfigured()) {
          try {
            responseText = await geminiChat.sendMessage(question);
          } catch (apiError) {
            console.warn('Gemini API error:', apiError);
            responseText = generateFallbackResponse(question);
          }
        } else {
          responseText = generateFallbackResponse(question);
        }
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiResponse]);
      } catch {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: t.somethingWentWrong,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
      }
    }, 100);
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={chatStyles.overlay}>
        <TouchableOpacity style={chatStyles.backdrop} onPress={onClose} activeOpacity={1} />
        <Animated.View 
          style={[
            chatStyles.container,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          {/* Header */}
          <View style={chatStyles.header}>
            <View style={chatStyles.headerIcon}>
              <Text style={chatStyles.headerIconText}>👵</Text>
            </View>
            <View style={chatStyles.headerText}>
              <Text style={[chatStyles.headerTitle, { fontSize: scaled(20) }]}>{t.grannyGBT}</Text>
              <Text style={[chatStyles.headerSubtitle, { fontSize: scaled(15) }]}>{t.mealAdvisorFor} {residentName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={chatStyles.closeButton}>
              <Text style={[chatStyles.closeButtonText, { fontSize: scaled(18) }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={chatStyles.messagesContainer}
            contentContainerStyle={chatStyles.messagesContent}
          >
            {messages.map((message) => (
              <View key={message.id}>
                {message.role === 'assistant' && (
                  <View style={chatStyles.avatarRow}>
                    <View style={chatStyles.avatarBadge}>
                      <Text style={chatStyles.avatarEmoji}>👵</Text>
                    </View>
                    <Text style={[chatStyles.avatarLabel, { fontSize: scaled(12) }]}>{t.grannyGBT}</Text>
                  </View>
                )}
                <View
                  style={[
                    chatStyles.messageBubble,
                    message.role === 'user' ? chatStyles.userBubble : chatStyles.assistantBubble
                  ]}
                >
                  <ChatRichText
                    text={message.content}
                    isUser={message.role === 'user'}
                    scaled={scaled}
                    language={language}
                  />
                  <Text style={[
                    chatStyles.timestamp,
                    { fontSize: scaled(11) },
                    message.role === 'user' && chatStyles.userTimestamp
                  ]}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}
            {isTyping && (
              <View>
                <View style={chatStyles.avatarRow}>
                  <View style={chatStyles.avatarBadge}>
                    <Text style={chatStyles.avatarEmoji}>👵</Text>
                  </View>
                  <Text style={[chatStyles.avatarLabel, { fontSize: scaled(12) }]}>{t.grannyGBT}</Text>
                </View>
                <View style={[chatStyles.messageBubble, chatStyles.assistantBubble]}>
                  <Text style={[chatStyles.typingText, { fontSize: scaled(14) }]}>{t.thinking}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick Questions */}
          <View style={chatStyles.quickQuestionsContainer}>
            <Text style={[chatStyles.quickQuestionsLabel, { fontSize: scaled(13) }]}>{t.quickQuestionsLabel}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={chatStyles.quickQuestionsRow}>
                {QUICK_QUESTIONS.map((question, index) => (
                  <TouchableOpacity
                    key={index}
                    style={chatStyles.quickQuestionButton}
                    onPress={() => handleQuickQuestion(question)}
                  >
                    <Text style={[chatStyles.quickQuestionText, { fontSize: scaled(14) }]}>{question}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Input */}
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={chatStyles.inputContainer}>
              <TextInput
                style={[chatStyles.input, { fontSize: scaled(16) }]}
                value={inputText}
                onChangeText={setInputText}
                placeholder={t.typeYourMessage}
                placeholderTextColor={COLORS.textLight}
                multiline
                maxLength={500}
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity 
                style={[
                  chatStyles.sendButton,
                  !inputText.trim() && chatStyles.sendButtonDisabled
                ]} 
                onPress={handleSend}
                disabled={!inputText.trim()}
              >
                <Text style={[chatStyles.sendButtonText, { fontSize: scaled(20) }]}>➤</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ---------- Main Component ----------
const BrowseMealOptionsScreen = ({ navigation, route }: any) => {
  const { t, scaled, language, notifications, getTouchTargetSize, theme } = useSettings();
  const touchTarget = getTouchTargetSize();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(PERIOD_KEYS[0]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);

  // Use the cart context
  const { addToCart, getCartCount } = useCart();

  const [menuLoading, setMenuLoading] = useState<boolean>(true);
  const [recLoading, setRecLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Get resident name from route params or use localDataService
  const residentId = route?.params?.residentId as string | undefined;
  const residentName =
    (residentId && ResidentService.getResidentById(residentId)?.fullName) ||
    route?.params?.residentName ||
    ResidentService.getDefaultResident().fullName;

  // Navigate to cart screen
  const goToCart = () => {
    navigation.navigate('Cart');
  };

  // Local "fetch menu" (CSV-backed)
  const loadMenu = useCallback(async (period: PeriodOption["value"]) => {
    setMenuLoading(true);
    setError("");

    setTimeout(() => {
      try {
        // Pull from localDataService
        const serviceMeals = MealService.getMealsByPeriod(period);

        // Map service Meal -> screen Meal shape
const mapped: Meal[] = serviceMeals.map((m) => ({
  id: String(m.id),
  name: m.name,
  meal_period: (m.mealPeriod === "All Day" ? "Lunch" : m.mealPeriod) as Meal["meal_period"],
          description: m.description,
          time_range: m.timeRange,
          kcal: m.nutrition.calories,
          sodium_mg: parseInt(
            String(m.nutrition.sodium).replace(/[^\d]/g, "") || "0",
            10
          ),
          protein_g: parseInt(
            String(m.nutrition.protein).replace(/[^\d]/g, "") || "0",
            10
          ),
          tags: m.tags ?? [],
        }));

        setMeals(mapped);
        setMenuLoading(false);
      } catch {
        setError("Failed to load meals");
        setMenuLoading(false);
      }
    }, 200);
  }, []);

  // Local "fetch recommendation" (CSV-backed)
  const loadRecommendation = useCallback(async () => {
    setRecLoading(true);
    setError("");

    setTimeout(() => {
      try {
        const resId = (route?.params?.residentId as string | undefined) || ResidentService.getDefaultResident().id;
        const rec = RecommendationService.getTopRecommendation(resId, selectedPeriod.value);
        setRecommendation(rec);
        setRecLoading(false);
      } catch {
        setRecommendation(null);
        setRecLoading(false);
      }
    }, 200);
  }, [route?.params?.residentId, selectedPeriod.value]);

  useEffect(() => {
    loadMenu(selectedPeriod.value);
  }, [loadMenu, selectedPeriod.value]);

  useEffect(() => {
    loadRecommendation();
  }, [loadRecommendation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadMenu(selectedPeriod.value), loadRecommendation()]);
    if (notifications.menuUpdates) {
      Alert.alert(t.menuUpdates, t.menuUpdatesDesc);
    }
    setTimeout(() => setRefreshing(false), 250);
  }, [loadMenu, loadRecommendation, notifications.menuUpdates, selectedPeriod.value, t.menuUpdates, t.menuUpdatesDesc]);

  // Get tag style based on tag name
  const getTagStyle = (tag: string) => {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('vegetarian')) {
      return { bg: '#DCFCE7', text: '#166534' };
    }
    if (tagLower.includes('low sodium') || tagLower.includes('heart')) {
      return { bg: '#DBEAFE', text: '#1E40AF' };
    }
    if (tagLower.includes('dairy') || tagLower.includes('contains')) {
      return { bg: '#FEF3C7', text: '#92400E' };
    }
    if (tagLower.includes('chef') || tagLower.includes('special')) {
      return { bg: '#F3E8FF', text: '#7C3AED' };
    }
    return { bg: '#F3F4F6', text: '#374151' };
  };

const renderMeal = ({ item }: { item: Meal }) => {
    const placeholder = getMealPlaceholder(item.name);
    const localizedMealName = translateMealName(item.name, language);
    const localizedMealPeriod = translateMealPeriod(item.meal_period, language);
    const localizedDescription = translateMealDescription(item.description, language);
    const localizedTimeRange = translateMealTimeRange(item.time_range, language);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => addToCart(item as any)}
      >
        {/* Meal Photo Placeholder */}
        <View style={[styles.mealImageContainer, { backgroundColor: placeholder.bg }]}>
          <Text style={styles.mealImageEmoji}>{placeholder.emoji}</Text>
          <View style={styles.mealImageOverlay}>
            <Text style={[styles.mealImageLabel, { color: placeholder.accent }]}>
              {localizedMealPeriod}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { fontSize: scaled(20) }]}>{localizedMealName}</Text>

          <View style={styles.timeBadge}>
            <Text style={[styles.timeBadgeText, { fontSize: scaled(14) }]}>
              {localizedMealPeriod} • {localizedTimeRange}
            </Text>
          </View>

          <Text style={[styles.cardDescription, { fontSize: scaled(16) }]}>{localizedDescription}</Text>

          {/* Nutrition Quick Info */}
          <View style={styles.nutritionRow}>
            <Text style={[styles.nutritionItem, { fontSize: scaled(13) }]}>🔥 {item.kcal} {t.calories}</Text>
            <Text style={[styles.nutritionItem, { fontSize: scaled(13) }]}>🧂 {item.sodium_mg}mg {t.sodium}</Text>
            <Text style={[styles.nutritionItem, { fontSize: scaled(13) }]}>💪 {item.protein_g}g {t.protein}</Text>
          </View>

          {item.tags?.length ? (
            <View style={styles.tagRow}>
              {item.tags.map((tag) => {
                const tagStyle = getTagStyle(tag);
                return (
                  <View
                    key={tag}
                    style={[styles.tag, { backgroundColor: tagStyle.bg }]}
                  >
                    <Text style={[styles.tagText, { color: tagStyle.text, fontSize: scaled(14) }]}>
                      {translateMealTag(tag, language)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <View style={styles.header}>
      {/* Back Button & Title */}
      <View style={styles.titleRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <View style={styles.backArrow}>
            <View style={styles.backArrowLine1} />
            <View style={styles.backArrowLine2} />
          </View>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { fontSize: scaled(32) }]}>{t.availableMenus}</Text>
          <Text style={[styles.subtitle, { fontSize: scaled(17) }]}>{t.orderingFor} {residentName}</Text>
        </View>
      </View>

      {/* Period Tabs */}
      <View style={styles.tabs}>
        {PERIOD_KEYS.map((period) => {
          const isActive = period.key === selectedPeriod.key;
          const label = t[period.key as keyof typeof t] || period.key;
          return (
            <TouchableOpacity
              key={period.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.tabText, { fontSize: scaled(16) }, isActive && styles.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const listFooter = (
    <View style={styles.aiRecommendation}>
      <View style={styles.aiRecommendationIcon}>
        <Text style={styles.aiRecommendationIconText}>👵</Text>
      </View>
      <View style={styles.aiRecommendationContent}>
        <Text style={[styles.aiRecommendationTitle, { fontSize: scaled(15) }]}>
          {t.recommendAMeal} — {residentName}
        </Text>
        {recLoading ? (
          <ActivityIndicator color="#2563EB" size="small" />
        ) : recommendation ? (
          <Text style={[styles.aiRecommendationText, { fontSize: scaled(16) }]}>
            {recommendation.reason}{' '}
            <Text style={styles.aiRecommendationHighlight}>
              {translateMealName(recommendation.meal_name, language)}
            </Text>.
          </Text>
        ) : (
          <Text style={[styles.aiRecommendationText, { fontSize: scaled(16) }]}>
            {t.noRecommendation}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" />

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={[styles.errorText, { fontSize: scaled(14) }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={[styles.retryText, { fontSize: scaled(14) }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Main Content */}
      {menuLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#1F2937" />
          <Text style={[styles.loadingText, { fontSize: scaled(17) }]}>{t.thinking}</Text>
        </View>
      ) : (
        <FlatList
          key={`meal-list-cols-1`}
          data={meals}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMeal}
          numColumns={1}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { fontSize: scaled(15) }]}>No meals found for this period.</Text>
          }
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

      <View style={styles.floatingActions}>
        <TouchableOpacity
          style={[styles.floatingGrannyButton, { minHeight: touchTarget, minWidth: touchTarget }]}
          onPress={() => setShowAIChat(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.floatingGrannyEmoji}>👵</Text>
        </TouchableOpacity>
        {getCartCount() > 0 && (
          <TouchableOpacity style={styles.floatingCartButton} onPress={goToCart} activeOpacity={0.85}>
            <Text style={[styles.floatingCartText, { fontSize: scaled(16) }]}>🛒 {getCartCount()}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* AI Assistant Chat Modal */}
      <AIAssistantChat
        visible={showAIChat}
        onClose={() => setShowAIChat(false)}
        residentName={residentName}
        residentId={residentId || ResidentService.getDefaultResident().id}
      />
    </SafeAreaView>
  );
};

export default BrowseMealOptionsScreen;

// ---------- Styles ----------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.neutral,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 22,
    paddingBottom: 22,
    backgroundColor: COLORS.white,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  backArrow: {
    width: 12,
    height: 12,
    marginLeft: 2,
  },
  backArrowLine1: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 12,
    height: 2,
    backgroundColor: COLORS.textMid,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }, { translateX: -1 }, { translateY: 2 }],
  },
  backArrowLine2: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 12,
    height: 2,
    backgroundColor: COLORS.textMid,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }, { translateX: -1 }, { translateY: -2 }],
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  subtitle: {
    fontSize: 17,
    color: COLORS.textLight,
    marginTop: 4,
    lineHeight: 22,
  },
  floatingActions: {
    position: 'absolute',
    right: 16,
    bottom: 22,
    zIndex: 10,
    gap: 10,
    alignItems: 'flex-end',
  },
  floatingGrannyButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  floatingGrannyEmoji: {
    fontSize: 25,
  },
  floatingCartButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 12,
    minWidth: 84,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  floatingCartText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMid,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  row: {
    paddingHorizontal: 0,
    gap: 12,
  },
  listContent: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    marginTop: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.support,
    overflow: 'hidden',
  },
  mealImageContainer: {
    height: 122,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mealImageEmoji: {
    fontSize: 56,
  },
  mealImageOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  mealImageLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  timeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  timeBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  cardDescription: {
    fontSize: 16,
    color: COLORS.textLight,
    lineHeight: 24,
    marginBottom: 10,
  },
  nutritionRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  nutritionItem: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // AI Recommendation Banner
  aiRecommendation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.neutral,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.support,
  },
  aiRecommendationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiRecommendationIconText: {
    fontSize: 18,
  },
  aiRecommendationContent: {
    flex: 1,
  },
  aiRecommendationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  aiRecommendationText: {
    fontSize: 16,
    color: COLORS.textMid,
    lineHeight: 24,
  },
  aiRecommendationHighlight: {
    fontWeight: '700',
    color: COLORS.textDark,
  },
  // Loading & Error States
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textLight,
    fontSize: 17,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 15,
    marginTop: 40,
    paddingHorizontal: 40,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    flex: 1,
    color: '#991B1B',
    fontWeight: '600',
  },
  retryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.secondary,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

// ---------- Chat Styles ----------
const chatStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  container: {
    width: SCREEN_WIDTH * 0.85,
    maxWidth: 400,
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: -5, height: 0 },
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerIconText: {
    fontSize: 20,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 4,
  },
  avatarBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f6a72d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  avatarEmoji: {
    fontSize: 12,
  },
  avatarLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b77f3f',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral,
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: COLORS.textMid,
    lineHeight: 24,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 6,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  typingText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  quickQuestionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  quickQuestionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 10,
  },
  quickQuestionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickQuestionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  quickQuestionText: {
    fontSize: 15,
    color: COLORS.textMid,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.textDark,
    maxHeight: 140,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
});
