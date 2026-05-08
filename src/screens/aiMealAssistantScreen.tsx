import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { useCart } from './context/CartContext';
import Feather from 'react-native-vector-icons/Feather';
import {
  MealService,
  ResidentService,
  RecommendationService,
  Meal as ServiceMeal,
} from '../services/localDataService';
import {
  translateMealName,
  translateMealPeriod,
  translateMealTimeRange,
} from '../services/mealLocalization';
import { createGeminiChat, GeminiChatService } from '../services/geminiService';
import { getDefaultMealsApi } from '../services/api';
import { getMealImage } from '../services/mealDisplayService';
import { useSettings } from './context/SettingsContext';

// ---------- TrayMate Color Palette ----------
const COLORS = {
  primary: '#717644',
  primaryLight: '#F4F3EE',
  accent: '#717644',
  white: '#FFFFFF',
  background: '#FAF9F6',
  surface: '#FFFFFF',
  textDark: '#1A1A1A',
  textMid: '#374151',
  textLight: '#5C5C5C',
  border: '#E8E6E1',
  warmBg: '#FDF8F0',
  warmBorder: '#E8DCC8',
  success: '#2D6A4F',
};

// ---------- Meal Placeholder Map ----------
const MEAL_PLACEHOLDERS: Record<string, { bg: string; emoji: string }> = {
  'Banana-Chocolate Pancakes': { bg: '#FEF3C7', emoji: '🥞' },
  'Broccoli-Cheddar Quiche': { bg: '#DCFCE7', emoji: '🥧' },
  'Caesar Salad with Chicken': { bg: '#D1FAE5', emoji: '🥗' },
  'Citrus Butter Salmon': { bg: '#DBEAFE', emoji: '🐟' },
  'Chicken Bruschetta': { bg: '#FEE2E2', emoji: '🍗' },
  'Breakfast Banana Split': { bg: '#FCE7F3', emoji: '🍌' },
  'Herb Baked Chicken': { bg: '#FEF3C7', emoji: '🍗' },
  'Garden Vegetable Medley': { bg: '#DCFCE7', emoji: '🥦' },
  'Strawberry Belgian Waffle': { bg: '#FCE7F3', emoji: '🧇' },
  'Spring Menu Special': { bg: '#E0E7FF', emoji: '🌸' },
  'Grilled Salmon Fillet': { bg: '#CFFAFE', emoji: '🐟' },
  'Oatmeal Bowl': { bg: '#FEF3C7', emoji: '🥣' },
};

const getMealPlaceholder = (name: string) =>
  MEAL_PLACEHOLDERS[name] || { bg: COLORS.primaryLight, emoji: '🍽' };

// ---------- Rich Text Renderer ----------
// Parses **bold**, meal names (renders inline cards), and bullet points.
// onOrderMeal — optional callback so meal cards inside chat bubbles can
// trigger a one-tap order from the conversation. Called with the meal
// the user tapped Order on; the parent component handles cart + place.
const RichText = ({
  text,
  isUser,
  allMeals,
  scaled,
  language,
  onOrderMeal,
}: {
  text: string;
  isUser: boolean;
  allMeals: ServiceMeal[];
  scaled: (base: number) => number;
  language: 'English' | 'Español' | 'Français' | '中文';
  onOrderMeal?: (meal: ServiceMeal) => void;
}) => {
  const lines = text.split('\n');
  const norm = (s: string) =>
    s.toLowerCase().replace(/['']/g, "'").replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  return (
    <View>
      {lines.map((line, lineIdx) => {
        // Check if this line is a meal card line (starts with number or bullet + bold meal name)
        const mealCardMatch = line.match(
          /^(?:\d+\.\s*|[•]\s*)?\*\*(.+?)\*\*(.*)$/,
        );
        const requestedMealName = mealCardMatch ? norm(mealCardMatch[1]) : '';
        const matchedMeal = mealCardMatch
          ? allMeals.find(m => {
              const n1 = norm(m.name);
              const n2 = norm(translateMealName(m.name, language));
              if (!requestedMealName) return false;
              if (n1 === requestedMealName || n2 === requestedMealName) return true;
              if (requestedMealName.length >= 4 && (n1.includes(requestedMealName) || n2.includes(requestedMealName))) return true;
              if (n1.length >= 4 && requestedMealName.includes(n1)) return true;
              if (n2.length >= 4 && requestedMealName.includes(n2)) return true;
              return false;
            })
          : null;

        if (matchedMeal && !isUser) {
          const ph = getMealPlaceholder(matchedMeal.name);
          // Real bundled meal image (matches the menu screen) — falls back
          // to emoji if no asset is available for this meal name.
          const realImg = getMealImage(matchedMeal.name);
          // Extract reasoning text after **name** (e.g. " — Free of: Dairy | Low sodium")
          const suffixText = mealCardMatch?.[2]?.replace(/^\s*[—–-]\s*/, '').trim() || '';
          return (
            <View key={lineIdx} style={richStyles.mealCard} accessibilityLabel={`${matchedMeal.name}, ${matchedMeal.nutrition.calories} calories${suffixText ? `, ${suffixText}` : ''}`}>
              <View style={[richStyles.mealCardImage, { backgroundColor: ph.bg }]}>
                {realImg ? (
                  <Image source={realImg} style={richStyles.mealCardRealImage} resizeMode="cover" />
                ) : (
                  <Text style={richStyles.mealCardEmoji}>{ph.emoji}</Text>
                )}
              </View>
              <View style={richStyles.mealCardInfo}>
                <Text style={[richStyles.mealCardName, { fontSize: scaled(17) }]}>
                  {translateMealName(matchedMeal.name, language)}
                </Text>
                <Text style={[richStyles.mealCardMeta, { fontSize: scaled(14) }]}>
                  {translateMealPeriod(matchedMeal.mealPeriod, language)} · {translateMealTimeRange(matchedMeal.timeRange, language)}
                </Text>
                <Text style={[richStyles.mealCardNutrition, { fontSize: scaled(13) }]}>
                  {matchedMeal.nutrition.calories} cal · {matchedMeal.nutrition.sodium} sodium · {matchedMeal.nutrition.protein} protein
                </Text>
                {suffixText !== '' && (
                  <Text style={[richStyles.mealCardReason, { fontSize: scaled(13) }]}>
                    {suffixText}
                  </Text>
                )}
                {onOrderMeal && (
                  <TouchableOpacity
                    style={richStyles.orderBtn}
                    onPress={() => onOrderMeal(matchedMeal)}
                    activeOpacity={0.85}
                  >
                    <Feather name="shopping-bag" size={14} color="#fff" />
                    <Text style={[richStyles.orderBtnText, { fontSize: scaled(13) }]}>
                      Order this
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }

        // Empty line = spacer
        if (line.trim() === '') {
          return <View key={lineIdx} style={{ height: 6 }} />;
        }

        // Render line with inline bold parsing
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const isBullet = line.trimStart().startsWith('•') || line.trimStart().startsWith('-');

        return (
          <View
            key={lineIdx}
            style={[
              richStyles.lineRow,
              isBullet && richStyles.bulletRow,
            ]}
          >
            {parts.map((part, pi) => {
              const boldMatch = part.match(/^\*\*(.+)\*\*$/);
              if (boldMatch) {
                return (
                  <Text
                    key={pi}
                    style={[
                      richStyles.text,
                      { fontSize: scaled(17), lineHeight: scaled(26) },
                      richStyles.bold,
                      isUser && richStyles.textUser,
                    ]}
                  >
                    {boldMatch[1]}
                  </Text>
                );
              }
              return (
                <Text
                  key={pi}
                  style={[richStyles.text, { fontSize: scaled(17), lineHeight: scaled(26) }, isUser && richStyles.textUser]}
                >
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

const richStyles = StyleSheet.create({
  lineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  bulletRow: {
    paddingLeft: 4,
    marginBottom: 4,
  },
  text: {
    fontSize: 17,
    lineHeight: 26,
    color: COLORS.textMid,
  },
  textUser: {
    color: COLORS.white,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.textDark,
  },
  mealCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginVertical: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    // shadow keeps the card visually distinct from the surrounding
    // assistant bubble so timestamps below can't appear to overlap it
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  mealCardImage: {
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mealCardRealImage: {
    width: 96,
    height: 96,
  },
  mealCardEmoji: {
    fontSize: 40,
  },
  mealCardInfo: {
    flex: 1,
    padding: 14,
  },
  mealCardName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  mealCardMeta: {
    fontSize: 14,
    color: COLORS.textMid,
    marginBottom: 4,
  },
  mealCardNutrition: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  mealCardReason: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: '700',
    marginTop: 6,
  },
  orderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  orderBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});

// ---------- Types ----------
type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
};

// ---------- Main Screen ----------
const AIMealAssistantScreen = ({ navigation, route }: any) => {
  const { t, scaled, language, getTouchTargetSize, theme } = useSettings();
  const touchTarget = getTouchTargetSize();
  const residentId =
    (route?.params?.residentId as string | undefined) ||
    ResidentService.getDefaultResident().id;
  const resident = ResidentService.getResidentById(residentId);
  const residentName = route?.params?.residentName || resident?.fullName || 'Resident';
  const dietaryRestrictions: string[] = route?.params?.dietaryRestrictions || [];
  const foodAllergies: string[] = route?.params?.foodAllergies || [];
  const medicalConditions: string[] = route?.params?.medicalConditions || [];
  const [allMeals, setAllMeals] = useState<ServiceMeal[]>([]);
  const { addToCart, clearCart, placeOrder } = useCart();

  /**
   * One-tap "Order this" from a chat meal card. Adds just that meal to
   * the cart, places the order, and shows a confirmation. Uses the
   * meal's own period so drinks/sides go under the right meal window
   * (CartContext's clock fallback handles the edge cases).
   */
  const handleOrderFromChat = async (meal: ServiceMeal) => {
    Alert.alert(
      'Place this order?',
      `${meal.name} for ${residentName}\n\n${meal.mealPeriod} · ${meal.timeRange}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Place Order',
          onPress: async () => {
            try {
              clearCart();
              addToCart({
                id: Number(meal.id),
                name: meal.name,
                meal_period: meal.mealPeriod as any,
                description: meal.description,
                kcal: meal.nutrition.calories,
                sodium_mg: typeof meal.nutrition.sodium === 'number' ? meal.nutrition.sodium : 0,
                protein_g: typeof meal.nutrition.protein === 'number' ? meal.nutrition.protein : 0,
                tags: meal.tags,
              } as any);
              await new Promise<void>((r) => setTimeout(r, 100));
              const period = meal.mealPeriod === 'Drinks' || meal.mealPeriod === 'Sides'
                ? undefined  // let clock fallback decide
                : meal.mealPeriod;
              const result = await placeOrder(residentId, period);
              if (result.order) {
                Alert.alert('Order placed!', `${meal.name} is on its way.`);
              } else if (result.complianceBlock) {
                Alert.alert('Restricted', 'This meal conflicts with the resident\'s dietary profile. Use the menu screen to request an override.');
              } else {
                Alert.alert('Could not place order', 'Please try again or use the menu.');
              }
            } catch (e: any) {
              Alert.alert('Order failed', e?.message ?? 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const chatServiceRef = useRef<GeminiChatService | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // Pick a menu question that matches the wall clock — inside a serving
  // window we ask about that period, between meals (or after dinner) we
  // ask about the next one coming up.
  const getMenuNowQuestion = (): string => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    if (mins >= 7 * 60 && mins <= 10 * 60) return "What's for breakfast?";
    if (mins >= 11 * 60 && mins <= 14 * 60) return "What's for lunch?";
    if (mins >= 16 * 60 && mins <= 19 * 60) return "What's for dinner?";
    if (mins < 7 * 60) return "What's for breakfast?";
    if (mins < 11 * 60) return "What's for lunch?";
    if (mins < 16 * 60) return "What's for dinner?";
    return "What's for breakfast tomorrow?";
  };
  const QUICK_QUESTIONS = [
    getMenuNowQuestion(),
    t.recommendAMeal,
    t.viewDietaryRestrictionsPrompt,
    t.whatMealsLowSodium,
  ];

  // Load meals from API on mount
  useEffect(() => {
    MealService.getAllMeals().then(setAllMeals).catch(() => setAllMeals([]));
  }, []);

  // Initialize chat service on mount
  useEffect(() => {
    const service = createGeminiChat();
    chatServiceRef.current = service;

    if (service.isConfigured()) {
      // Pass override data for API-sourced residents not in the local database.
      // Also fetch the resident's "usual order" so Granny BT can personalise.
      (async () => {
        let favoriteMealIds: number[] = [];
        try {
          favoriteMealIds = await getDefaultMealsApi(residentId);
        } catch { /* no-op — recommendations still work without it */ }
        const override = !resident
          ? { name: residentName, dietaryRestrictions, foodAllergies, medicalConditions, favoriteMealIds }
          : undefined;
        console.log('[AIMealAssistant] Initializing Gemini chat service...');
        // Optimistic: assume AI is available. Init only builds the system
        // prompt — actual API calls happen on send. If init fails (e.g.
        // a sub-fetch 401s), we still let the user try; sendMessage will
        // surface a real error if the API is genuinely unreachable.
        setAiMode('ai');
        service.initialize(residentId, language, override, favoriteMealIds)
          .then(() => console.log('[AIMealAssistant] Gemini initialized successfully'))
          .catch((err) => {
            // Don't flip to offline — the model fallback chain will
            // catch real outages on the first sendMessage attempt.
            console.warn('[AIMealAssistant] Init had issues but continuing:', err?.message || err);
          });
      })();
    } else {
      console.warn('[AIMealAssistant] Gemini not configured (no API key)');
    }

    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: t.grannyWelcome.replace('{name}', residentName),
        timestamp: new Date(),
      },
    ]);
  }, [residentId, residentName, language, t.grannyWelcome]);

  // No periodic retry needed — aiMode is set by actual message success/failure

  // scrollToEnd is handled by onContentSizeChange on the ScrollView

  // Track whether responses are coming from AI or fallback
  const [aiMode, setAiMode] = useState<'connecting' | 'ai' | 'offline'>('connecting');

  // Minimal fallback for when ALL Gemini models are down
  const generateFallbackResponse = async (userMessage: string): Promise<string> => {
    const lower = userMessage.toLowerCase();

    // Detect a specific period in the question so the fallback shows
    // only the relevant slice — matches Granny BT's time-aware behavior.
    let periodFilter: ServiceMeal['mealPeriod'] | null = null;
    let periodHeader: string | null = null;
    if (lower.includes('breakfast')) {
      periodFilter = 'Breakfast';
      periodHeader = lower.includes('tomorrow') ? "Here's tomorrow's breakfast" : "Here's breakfast";
    } else if (lower.includes('lunch')) {
      periodFilter = 'Lunch';
      periodHeader = "Here's lunch";
    } else if (lower.includes('dinner')) {
      periodFilter = 'Dinner';
      periodHeader = "Here's dinner";
    }
    const filteredMeals = periodFilter ? allMeals.filter((m) => m.mealPeriod === periodFilter) : allMeals;
    const menuItems = filteredMeals
      .map(
        (m: ServiceMeal) =>
          `• **${translateMealName(m.name, language)}** (${translateMealPeriod(m.mealPeriod, language)}, ${translateMealTimeRange(m.timeRange, language)})`,
      )
      .join('\n');

    const isMenuQuery = lower.includes('menu') || lower.includes('today') || lower.includes('available') || lower.includes('breakfast') || lower.includes('lunch') || lower.includes('dinner') || lower.includes(t.whatsOnMenuToday.toLowerCase());
    const isRecommendQuery = lower.includes('recommend') || lower.includes('suggest') || lower.includes(t.recommendAMeal.toLowerCase());

    if (isMenuQuery) {
      const header = periodHeader ? `${periodHeader}! 📋` : `${t.heresTheMenu} 📋`;
      return `${header}\n\n${menuItems}`;
    }
    if (isRecommendQuery) {
      const recs = await RecommendationService.getRecommendations(residentId, null, 3);
      if (recs.length > 0) {
        const recList = recs
          .map((r: any, i: number) => `${i + 1}. **${translateMealName(r.meal.name, language)}** — ${r.allReasons.join(', ')}`)
          .join('\n');
        return `${t.topPicksFor} ${residentName}:\n\n${recList}`;
      }
      // Fallback: filter meals by dietary restrictions and show top 3 with reasons
      const restrictionsLower = dietaryRestrictions.map((r: string) => r.toLowerCase());
      const safeMeals = allMeals.filter(m => {
        const allergens = m.allergenInfo.map(a => a.toLowerCase());
        return !restrictionsLower.some(r => allergens.some(a => a.includes(r)));
      });
      const topMeals = (safeMeals.length > 0 ? safeMeals : allMeals).slice(0, 3);
      const recList = topMeals
        .map((m, i) => {
          // Always build useful reasoning so the card shows WHY
          const reasons: string[] = [];
          if (dietaryRestrictions.length > 0) {
            const avoided = dietaryRestrictions.filter(r =>
              !m.allergenInfo.some(a => a.toLowerCase().includes(r.toLowerCase()))
            );
            if (avoided.length > 0) {
              reasons.push(`Free of: ${avoided.join(', ')}`);
            }
          }
          if (m.nutrition.calories <= 500) reasons.push(`${m.nutrition.calories} cal`);
          else reasons.push(`${m.nutrition.calories} cal`);
          if (parseInt(String(m.nutrition.sodium)) <= 400) reasons.push('Low sodium');
          if (parseInt(String(m.nutrition.protein)) >= 20) reasons.push('High protein');
          if (m.allergenInfo.length === 0) reasons.push('No allergens');
          return `${i + 1}. **${translateMealName(m.name, language)}** — ${reasons.join(' · ')}`;
        })
        .join('\n');
      const header = dietaryRestrictions.length > 0
        ? `${t.topPicksFor} ${residentName} (avoiding ${dietaryRestrictions.join(', ')}):`
        : `${t.topPicksFor} ${residentName}:`;
      return `${header}\n\n${recList}`;
    }
    return `${t.aiCurrentlyOffline} 😴\n\n${t.youCanStillTry}\n• **"menu"** — ${t.viewTodaysMeals}\n• **"recommend"** — ${t.seeTopPicks}\n\n${t.tryAgainMoment}`;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      let responseText: string;
      const service = chatServiceRef.current;

      if (service && service.isConfigured()) {
        try {
          responseText = await service.sendMessage(text.trim());
          setAiMode('ai');
        } catch (apiError: any) {
          console.warn('Gemini API error:', apiError?.message || apiError);
          setAiMode('offline');
          responseText = await generateFallbackResponse(text.trim());
        }
      } else {
        setAiMode('offline');
        responseText = await generateFallbackResponse(text.trim());
      }

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch {
      setAiMode('offline');
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
  };

  const handleSend = () => {
    sendMessage(inputText);
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  // Ensure view scrolls to the latest message when messages change
  useEffect(() => {
    // small delay helps when keyboard is animating
    const id = setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [messages]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { minHeight: touchTarget, minWidth: touchTarget }]}
        >
          <Feather name="chevron-left" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { fontSize: scaled(22) }]}>{t.grannyBT}</Text>
            <View style={[styles.aiBadge, aiMode === 'ai' ? styles.aiBadgeOn : aiMode === 'offline' ? styles.aiBadgeOff : styles.aiBadgeConnecting]}>
              <Text style={[styles.aiBadgeText, { fontSize: scaled(11) }]}>
                {aiMode === 'ai' ? 'AI' : aiMode === 'offline' ? 'Offline' : '...'}
              </Text>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { fontSize: scaled(14) }]}>{t.mealAdvisorFor} {residentName}</Text>
        </View>
        <View style={styles.headerIconContainer}>
          <Image source={require('../styles/pictures/grandma.png')} style={styles.headerIconImage} resizeMode="contain" />
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map(message => (
          <View key={message.id}>
            {/* Avatar row for assistant messages */}
            {message.role === 'assistant' && (
              <View style={styles.assistantAvatarRow}>
                <View style={styles.assistantAvatar}>
                  <Image source={require('../styles/pictures/grandma.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                </View>
                <Text style={[styles.assistantLabel, { fontSize: scaled(14) }]}>{t.grannyBT}</Text>
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                message.role === 'user'
                  ? styles.userBubble
                  : styles.assistantBubble,
              ]}
            >
                <RichText
                  text={message.content}
                  isUser={message.role === 'user'}
                  allMeals={allMeals}
                  scaled={scaled}
                  language={language}
                  onOrderMeal={handleOrderFromChat}
                />
              <Text
                style={[
                  styles.timestamp,
                  { fontSize: scaled(13) },
                  message.role === 'user' && styles.userTimestamp,
                ]}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        ))}
        {isTyping && (
          <View>
            <View style={styles.assistantAvatarRow}>
              <View style={styles.assistantAvatar}>
                <Image source={require('../styles/pictures/grandma.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
              </View>
              <Text style={[styles.assistantLabel, { fontSize: scaled(14) }]}>{t.grannyBT}</Text>
            </View>
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <Text style={[styles.typingText, { fontSize: scaled(16) }]}>{t.thinking}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Section — Quick Questions + Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Quick Questions */}
        <View style={styles.quickQuestionsContainer}>
          <Text style={[styles.quickQuestionsLabel, { fontSize: scaled(15) }]}>{t.quickQuestionsLabel}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.quickQuestionsRow}>
              {QUICK_QUESTIONS.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.quickQuestionButton, { minHeight: touchTarget, paddingVertical: 12, paddingHorizontal: 18 }]}
                  onPress={() => handleQuickQuestion(question)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.quickQuestionText, { fontSize: scaled(16) }]}>{question}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { fontSize: scaled(18), paddingVertical: 14 }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t.askAboutMeals}
            placeholderTextColor={COLORS.textLight}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { minHeight: touchTarget, minWidth: touchTarget, width: 54, height: 54, borderRadius: 27 },
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Feather name="send" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AIMealAssistantScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
  },
  aiBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeOn: {
    backgroundColor: 'rgba(52, 211, 153, 0.3)',
  },
  aiBadgeOff: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  aiBadgeConnecting: {
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconImage: {
    width: 34,
    height: 34,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 30,
  },
  assistantAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 4,
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  assistantLabel: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  messageBubble: {
    maxWidth: '92%',
    padding: 18,
    borderRadius: 20,
    marginBottom: 16,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  timestamp: {
    color: COLORS.textLight,
    marginTop: 8,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
  },
  typingText: {
    color: COLORS.primary,
    fontStyle: 'italic',
  },
  quickQuestionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primaryLight,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  quickQuestionsLabel: {
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 10,
  },
  quickQuestionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickQuestionButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickQuestionText: {
    color: COLORS.textMid,
    fontWeight: '600',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    color: COLORS.textDark,
    fontSize: 18,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});
