import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
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
} from "react-native";
import { StatusBar } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import { useCart } from "./context/CartContext";
import { useSettings } from './context/SettingsContext';

// Display-layer constants (images, colours, mappers) — extracted for clarity
import {
  COLORS,
  DisplayMeal,
  getMealPlaceholder,
  getMealImage,
  mapServiceMeal,
} from '../services/mealDisplayService';

// Local CSV-backed data service (temporary until API is ready)
import {
  MealService,
  ResidentService,
  RecommendationService,
  Meal as ServiceMeal,
  Resident,
} from "../services/localDataService";
import {
  translateMealDescription,
  translateMealName,
  translateMealPeriod,
  translateMealTag,
  translateMealTimeRange,
  hasMealNameTranslation,
  setCachedMealTranslations,
} from "../services/mealLocalization";
import { translateMealNamesWithGemini } from "../services/geminiService";

import { geminiChat } from "../services/geminiService";
import { useClock } from '../context/useClock';
import { Picker } from "@react-native-picker/picker";


const { width: SCREEN_WIDTH } = Dimensions.get('window');

// MEAL_PLACEHOLDER_COLORS, MEAL_IMAGES, getMealPlaceholder, getMealImage
// → now imported from ../services/mealDisplayService.ts

// ---------- Rich Text Renderer for Chat ----------
const ChatRichText = ({
  text,
  isUser,
  scaled,
  language,
  allMeals = [],
}: {
  text: string;
  isUser: boolean;
  scaled: (base: number) => number;
  language: 'English' | 'Español' | 'Français' | '中文';
  allMeals?: ServiceMeal[];
}) => {
  const lines = text.split('\n');
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  return (
    <View>
      {lines.map((line, lineIdx) => {
        // Check if line has a bold meal name that matches a real meal
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
              // allow small formatting differences (hyphens, extra words)
              if (requestedMealName.length >= 4 && (n1.includes(requestedMealName) || n2.includes(requestedMealName))) return true;
              if (n1.length >= 4 && requestedMealName.includes(n1)) return true;
              if (n2.length >= 4 && requestedMealName.includes(n2)) return true;
              return false;
            })
          : null;

        if (matchedMeal && !isUser) {
          const ph = getMealPlaceholder(matchedMeal.name);
          const realImg = getMealImage(matchedMeal.name);
          const suffixText = mealCardMatch?.[2]?.replace(/^\s*[—–-]\s*/, '').trim() || '';
          return (
            <View key={lineIdx} style={chatRichStyles.mealCard} accessibilityLabel={`${matchedMeal.name}, ${matchedMeal.nutrition.calories} calories${suffixText ? `, ${suffixText}` : ''}`}>
              <View style={[chatRichStyles.mealCardImage, { backgroundColor: ph.bg }]}>
                {realImg ? (
                  <Image source={realImg} style={chatRichStyles.mealCardRealImage} resizeMode="cover" />
                ) : (
                  <Text style={chatRichStyles.mealCardEmoji}>{ph.emoji}</Text>
                )}
              </View>
              <View style={chatRichStyles.mealCardInfo}>
                <Text style={[chatRichStyles.mealCardName, { fontSize: scaled(16) }]}>
                  {translateMealName(matchedMeal.name, language)}
                </Text>
                <Text style={[chatRichStyles.mealCardMeta, { fontSize: scaled(13) }]}>
                  {translateMealPeriod(matchedMeal.mealPeriod, language)} · {translateMealTimeRange(matchedMeal.timeRange, language)}
                </Text>
                <Text style={[chatRichStyles.mealCardNutrition, { fontSize: scaled(12) }]}>
                  {matchedMeal.nutrition.calories} cal · {matchedMeal.nutrition.sodium} sodium · {matchedMeal.nutrition.protein} protein
                </Text>
                {suffixText !== '' && (
                  <Text style={[chatRichStyles.mealCardReason, { fontSize: scaled(12) }]}>
                    {suffixText}
                  </Text>
                )}
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
                  <Text key={pi} style={[chatRichStyles.text, { fontSize: scaled(16), lineHeight: scaled(24) }, chatRichStyles.bold, isUser && chatRichStyles.textUser]}>
                    {boldMatch[1]}
                  </Text>
                );
              }
              return (
                <Text key={pi} style={[chatRichStyles.text, { fontSize: scaled(16), lineHeight: scaled(24) }, isUser && chatRichStyles.textUser]}>
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
  lineRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 3 },
  bulletRow: { paddingLeft: 4, marginBottom: 5 },
  text: { fontSize: 16, lineHeight: 24, color: '#374151' },
  textUser: { color: '#FFFFFF' },
  bold: { fontWeight: '700', color: '#111827' },
  mealCard: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginVertical: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mealCardImage: { width: 80, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  mealCardRealImage: { width: 80, height: 80 },
  mealCardEmoji: { fontSize: 30 },
  mealCardInfo: { flex: 1, padding: 12 },
  mealCardName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 3 },
  mealCardMeta: { fontSize: 13, color: '#6B7280', marginBottom: 3 },
  mealCardNutrition: { fontSize: 12, color: '#b77f3f', fontWeight: '600' },
  mealCardReason: { fontSize: 12, color: '#15803d', fontWeight: '700', marginTop: 5 },
});

// COLORS → imported from ../services/mealDisplayService.ts
// DisplayMeal (aliased as Meal below) → imported from ../services/mealDisplayService.ts
type Meal = DisplayMeal;

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

// ── Period accent colours (for card left strip) ───────────────────────────────
const PERIOD_ACCENT: Record<string, { color: string; light: string }> = {
  Breakfast: { color: '#C47A2A', light: '#FEF3C7' },
  Lunch:     { color: '#2D7A52', light: '#DCFCE7' },
  Dinner:    { color: '#4F4FA8', light: '#EEF2FF' },
  Drinks:    { color: '#2A6FA8', light: '#E0F2FE' },
  Sides:     { color: '#7A3A6A', light: '#FCE7F3' },
  'All Day': { color: '#717644', light: '#F0EFE6' },
};

// ── Per-period header themes ──────────────────────────────────────────────────
const PERIOD_THEMES: Record<string, {
  bg: string;
  titleColor: string;
  subColor: string;
  tabActiveBg: string;
  tabActiveText: string;
  tabInactiveBg: string;
  tabInactiveText: string;
  icon: string;
  buttonBg: string;
  buttonBorder: string;
}> = {
  allDay:    { bg: '#FAFAF8', titleColor: '#1C1C1C', subColor: '#888880', tabActiveBg: '#717644', tabActiveText: '#FFF', tabInactiveBg: 'rgba(0,0,0,0.04)',    tabInactiveText: '#555550', icon: '🍽',  buttonBg: '#FFFFFF', buttonBorder: 'rgba(113,118,68,0.2)'  },
  breakfast: { bg: '#FFFCF5', titleColor: '#3B2A14', subColor: '#8A6A40', tabActiveBg: '#9A7230', tabActiveText: '#FFF', tabInactiveBg: 'rgba(154,114,48,0.08)', tabInactiveText: '#7A5A30', icon: '🌅', buttonBg: '#FFFDF8', buttonBorder: 'rgba(154,114,48,0.2)'  },
  lunch:     { bg: '#F7FAF8', titleColor: '#1A3028', subColor: '#4A6A58', tabActiveBg: '#4A7A60', tabActiveText: '#FFF', tabInactiveBg: 'rgba(74,122,96,0.07)',  tabInactiveText: '#3A5A48', icon: '☀️', buttonBg: '#F5F9F6', buttonBorder: 'rgba(74,122,96,0.2)'   },
  dinner:    { bg: '#22213A', titleColor: '#D8DAF0', subColor: '#8A8DB0', tabActiveBg: '#5C5FA8', tabActiveText: '#FFF', tabInactiveBg: 'rgba(200,205,240,0.1)', tabInactiveText: '#A8AACC', icon: '🌙', buttonBg: '#2E2C4A', buttonBorder: 'rgba(200,205,240,0.18)' },
  beverages: { bg: '#F5F9FC', titleColor: '#1A3040', subColor: '#4A6A80', tabActiveBg: '#4A7A9A', tabActiveText: '#FFF', tabInactiveBg: 'rgba(74,122,154,0.07)', tabInactiveText: '#3A607A', icon: '🥤', buttonBg: '#F2F7FA', buttonBorder: 'rgba(74,122,154,0.2)'  },
  desserts:  { bg: '#FCF7FA', titleColor: '#32142A', subColor: '#7A4A68', tabActiveBg: '#8A4A72', tabActiveText: '#FFF', tabInactiveBg: 'rgba(138,74,114,0.07)', tabInactiveText: '#6A3A58', icon: '🍰', buttonBg: '#FAF4F8', buttonBorder: 'rgba(138,74,114,0.2)'  },
  seasonal:  { bg: '#F6FAF6', titleColor: '#1A3020', subColor: '#4A6848', tabActiveBg: '#4A7850', tabActiveText: '#FFF', tabInactiveBg: 'rgba(74,120,80,0.07)',  tabInactiveText: '#3A5840', icon: '🌸', buttonBg: '#F4F9F4', buttonBorder: 'rgba(74,120,80,0.2)'   },
};

const PERIOD_KEYS: PeriodOption[] = [
  { key: "allDay", value: null },
  { key: "breakfast", value: "Breakfast" },
  { key: "lunch", value: "Lunch" },
  { key: "dinner", value: "Dinner" },
  { key: "beverages", value: "Drinks" },
  { key: "desserts", value: "Sides" },
  { key: "seasonal", value: null },
];

// ---------- AI Chat Component ----------
const AIAssistantChat = ({
  visible,
  onClose,
  residentName,
  residentId,
  dietaryRestrictions = [],
}: {
  visible: boolean;
  onClose: () => void;
  residentName: string;
  residentId: string;
  dietaryRestrictions?: string[];
}) => {
  const { t, scaled, language } = useSettings();
    const [aiAvailable, setAiAvailable] = useState<boolean>(false);
  const QUICK_QUESTIONS = [
    t.whatsOnMenuToday,
    t.recommendAMeal,
    t.viewDietaryRestrictionsPrompt,
    t.placeLunchOrder,
  ];
  const [chatMeals, setChatMeals] = useState<ServiceMeal[]>([]);
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

  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // If Gemini replies without **Meal Name** formatting, try to bold known meal names
  const injectMealBold = (raw: string) => {
    if (!raw) return raw;
    // If the model already used markdown bold somewhere, don't over-touch it
    if (raw.includes('**')) return raw;

    // Prefer longer names first to avoid partial replacements
    const mealNames = (chatMeals || [])
      .map(m => ({
        raw: m.name,
        localized: translateMealName(m.name, language),
      }))
      .sort((a, b) => b.localized.length - a.localized.length);

    let out = raw;
    for (const mn of mealNames) {
      const candidates = Array.from(new Set([mn.localized, mn.raw])).filter(Boolean);
      for (const c of candidates) {
        const re = new RegExp(`\\b${escapeRegExp(c)}\\b`, 'gi');
        out = out.replace(re, match => `**${match}**`);
      }
    }
    return out;
  };

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

  // Load meals for chat when modal opens
  useEffect(() => {
    if (visible) {
      MealService.getAllMeals().then(setChatMeals).catch(() => setChatMeals([]));
    }
  }, [visible]);

  // Initialize Gemini chat session when modal opens
  useEffect(() => {
    if (visible && geminiChat.isConfigured()) {
      const resident = ResidentService.getResidentById(residentId);
      const override = !resident ? { name: residentName, dietaryRestrictions } : undefined;
      geminiChat.initialize(residentId, language, override)
        .then(() => setAiAvailable(true))
        .catch(() => setAiAvailable(false));
    }
  }, [visible, residentId, language, residentName, dietaryRestrictions]);

  // Minimal fallback when ALL Gemini models are down
  const generateFallbackResponse = async (userMessage: string): Promise<string> => {
    const lower = userMessage.toLowerCase();
    const allServiceMeals = await MealService.getAllMeals();
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
      const recs = await RecommendationService.getRecommendations(residentId, null, 3);
      if (recs.length > 0) {
        const recList = recs
          .map((r: any, i: number) => `${i + 1}. **${translateMealName(r.meal.name, language)}** — ${r.allReasons.join(', ')}`)
          .join('\n');
        return `${t.topPicksFor} ${residentName}:\n\n${recList}`;
      }
      // Fallback: filter meals by dietary restrictions and show top 3
      const restrictionsLower = dietaryRestrictions.map((r: string) => r.toLowerCase());
      const safeMeals = allServiceMeals.filter(m => {
        const allergens = m.allergenInfo.map(a => a.toLowerCase());
        return !restrictionsLower.some(r => allergens.some(a => a.includes(r)));
      });
      const topMeals = (safeMeals.length > 0 ? safeMeals : allServiceMeals).slice(0, 3);
      const recList = topMeals
        .map((m, i) => {
          const reasons: string[] = [];
          if (dietaryRestrictions.length > 0) {
            const avoided = dietaryRestrictions.filter(r =>
              !m.allergenInfo.some(a => a.toLowerCase().includes(r.toLowerCase()))
            );
            if (avoided.length > 0) {
              reasons.push(`Free of: ${avoided.join(', ')}`);
            }
          }
          reasons.push(`${m.nutrition.calories} cal`);
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
          responseText = injectMealBold(responseText);
          setAiAvailable(true);
        } catch (apiError) {
          console.warn('Gemini API error:', apiError);
          setAiAvailable(false);
          responseText = await generateFallbackResponse(userMessage.content);
          responseText = injectMealBold(responseText);
        }
      } else {
        responseText = await generateFallbackResponse(userMessage.content);
        responseText = injectMealBold(responseText);
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
            setAiAvailable(true);
          } catch (apiError) {
            console.warn('Gemini API error:', apiError);
            setAiAvailable(false);
            responseText = await generateFallbackResponse(question);
          }
        } else {
          responseText = await generateFallbackResponse(question);
        }

        responseText = injectMealBold(responseText);
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
        <Animated.View style={[chatStyles.container, { transform: [{ translateX: slideAnim }] }]}>

          {/* ── Header ── */}
          <View style={chatStyles.header}>
            <View style={chatStyles.headerAvatarWrap}>
              <Image
                source={require('../styles/pictures/grandma.png')}
                style={chatStyles.headerAvatar}
                resizeMode="contain"
              />
            </View>
            <View style={chatStyles.headerText}>
              <View style={chatStyles.headerTitleRow}>
                <Text style={[chatStyles.headerTitle, { fontSize: scaled(19) }]}>{t.grannyGBT}</Text>
                <View style={[chatStyles.statusPill, aiAvailable ? chatStyles.aiOn : chatStyles.aiOff]}>
                  <Text style={[chatStyles.statusText, { fontSize: scaled(11) }]}>
                    {aiAvailable ? '✦ AI' : '○ Offline'}
                  </Text>
                </View>
              </View>
              <Text style={[chatStyles.headerSubtitle, { fontSize: scaled(13) }]}>
                {t.mealAdvisorFor} {residentName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={chatStyles.closeButton} hitSlop={10}>
              <Feather name="x" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* ── Messages ── */}
          <ScrollView
            ref={scrollViewRef}
            style={chatStyles.messagesContainer}
            contentContainerStyle={chatStyles.messagesContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((message) => (
              <View key={message.id} style={message.role === 'user' ? chatStyles.userRow : chatStyles.assistantRow}>
                {message.role === 'assistant' && (
                  <View style={chatStyles.avatarBadge}>
                    <Image source={require('../styles/pictures/grandma.png')} style={chatStyles.bubbleAvatar} resizeMode="contain" />
                  </View>
                )}
                <View style={[
                  chatStyles.messageBubble,
                  message.role === 'user' ? chatStyles.userBubble : chatStyles.assistantBubble,
                ]}>
                  <ChatRichText
                    text={message.content}
                    isUser={message.role === 'user'}
                    scaled={scaled}
                    language={language}
                    allMeals={chatMeals}
                  />
                  <Text style={[
                    chatStyles.timestamp,
                    { fontSize: scaled(10) },
                    message.role === 'user' && chatStyles.userTimestamp,
                  ]}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}
            {isTyping && (
              <View style={chatStyles.assistantRow}>
                <View style={chatStyles.avatarBadge}>
                  <Image source={require('../styles/pictures/grandma.png')} style={chatStyles.bubbleAvatar} resizeMode="contain" />
                </View>
                <View style={[chatStyles.messageBubble, chatStyles.assistantBubble]}>
                  <Text style={[chatStyles.typingText, { fontSize: scaled(14) }]}>{t.thinking}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* ── Quick Questions ── */}
          <View style={chatStyles.quickQuestionsContainer}>
            <Text style={[chatStyles.quickQuestionsLabel, { fontSize: scaled(12) }]}>{t.quickQuestionsLabel}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
              {QUICK_QUESTIONS.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={chatStyles.quickQuestionButton}
                  onPress={() => handleQuickQuestion(question)}
                >
                  <Text style={[chatStyles.quickQuestionText, { fontSize: scaled(13) }]}>{question}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── Input ── */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={chatStyles.inputContainer}>
              <TextInput
                style={[chatStyles.input, { fontSize: scaled(15) }]}
                value={inputText}
                onChangeText={setInputText}
                placeholder={t.typeYourMessage}
                placeholderTextColor="#A8A89A"
                multiline
                maxLength={500}
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                style={[chatStyles.sendButton, !inputText.trim() && chatStyles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={!inputText.trim()}
              >
                <Feather name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ── Time-range availability check ────────────────────────────────────────────
function parseTimeToMinutes(s: string): number {
  const cleaned = s.trim().toLowerCase().replace(/\s/g, '');
  const isPm = cleaned.includes('pm');
  const isAm = cleaned.includes('am');
  const num = parseInt(cleaned.replace(/[^0-9]/g, ''), 10);
  if (isNaN(num)) return 0;
  let hours = num;
  if (isPm && hours !== 12) hours += 12;
  if (isAm && hours === 12) hours = 0;
  return hours * 60;
}

function isWithinTimeRange(timeRange: string, period?: string, now: Date = new Date()): boolean {
  // Drinks and Sides are available all day
  if (period === 'Drinks' || period === 'Sides') return true;
  if (!timeRange || timeRange.trim() === '') return true;
  const currentMins = now.getHours() * 60 + now.getMinutes();
  // normalize en-dash / em-dash to hyphen
  const normalized = timeRange.replace(/[–—]/g, '-');
  const parts = normalized.split('-').map((p) => p.trim());
  if (parts.length < 2) return true;
  const start = parseTimeToMinutes(parts[0]);
  const end   = parseTimeToMinutes(parts[1]);
  return currentMins >= start && currentMins <= end;
}

/** Start minute of a time-range string, used for sorting */
function timeRangeStartMinutes(timeRange: string): number {
  if (!timeRange) return 0;
  const normalized = timeRange.replace(/[–—]/g, '-');
  const first = normalized.split('-')[0]?.trim() ?? '';
  return parseTimeToMinutes(first);
}

/** Sort meals: available-now first (ordered by start time), then unavailable (ordered by start time) */
function sortMealsByAvailability(meals: Meal[], now: Date = new Date()): Meal[] {
  return [...meals].sort((a, b) => {
    const aAvail = isWithinTimeRange(a.time_range, a.meal_period, now);
    const bAvail = isWithinTimeRange(b.time_range, b.meal_period, now);
    if (aAvail && !bAvail) return -1;
    if (!aAvail && bAvail) return 1;
    return timeRangeStartMinutes(a.time_range) - timeRangeStartMinutes(b.time_range);
  });
}

// ---------- Meal Schedule (iPad device time) ----------
const MEAL_SCHEDULE = [
  { label: 'Breakfast', start: 7 * 60, end: 10 * 60, color: '#D97706', icon: '☀️' },
  { label: 'Lunch',     start: 11 * 60, end: 14 * 60, color: '#4A7A60', icon: '🍽️' },
  { label: 'Dinner',    start: 16 * 60, end: 19 * 60, color: '#5C5FA8', icon: '🌙' },
];

function getCurrentMealPeriod(now: Date = new Date()): string | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  const found = MEAL_SCHEDULE.find((s) => mins >= s.start && mins <= s.end);
  return found ? found.label : null;
}

/** Returns the next upcoming meal period and how many minutes until it starts */
function getNextMealPeriod(now: Date = new Date()): { period: typeof MEAL_SCHEDULE[0]; minsUntil: number } | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  const next = MEAL_SCHEDULE.find((s) => s.start > mins);
  if (next) return { period: next, minsUntil: next.start - mins };
  // After dinner — wrap to tomorrow's breakfast
  const breakfast = MEAL_SCHEDULE[0];
  return { period: breakfast, minsUntil: 24 * 60 - mins + breakfast.start };
}

function formatMinsUntil(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ---------- Main Component ----------
const BrowseMealOptionsScreen = ({ navigation, route }: any) => {
  const { t, scaled, language, getTouchTargetSize, theme, setCurrentResidentId } = useSettings();
  const touchTarget = getTouchTargetSize();
  // --- all hooks at the top, unconditionally, in fixed order ---
  const { currentTime } = useClock();
  const { addToCart, getCartCount, orders, getOrdersForResident, fetchOrderHistory } = useCart();

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(PERIOD_KEYS[0]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [_rawServiceMeals, setRawServiceMeals] = useState<ServiceMeal[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showMealDetail, setShowMealDetail] = useState(false);
  const [specialNote, setSpecialNote] = useState('');
  const [availableDrinks, setAvailableDrinks] = useState<Meal[]>([]);
  const [selectedDrink, setSelectedDrink] = useState<Meal | null>(null);
  const [availableSides, setAvailableSides] = useState<Meal[]>([]);
  const [selectedSide, setSelectedSide] = useState<Meal | null>(null);
  const [menuLoading, setMenuLoading] = useState<boolean>(true);
  const [recLoading, setRecLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showBrowseSupport, setShowBrowseSupport] = useState(false);
  const [autoSuggest, setAutoSuggest] = useState<{ period: string; minsUntil: number; meal: Meal; drink?: Meal; dessert?: Meal } | null>(null);
  const [autoSuggestDismissed, setAutoSuggestDismissed] = useState(false);

  // derived (not hooks)
  const pt = PERIOD_THEMES[selectedPeriod.key] ?? PERIOD_THEMES.allDay;
  const activePeriod = getCurrentMealPeriod(currentTime);

  // Activate this resident's settings when screen mounts
  useEffect(() => {
    setCurrentResidentId(route?.params?.residentId ?? null);
  }, [route?.params?.residentId, setCurrentResidentId]);

  // Get resident name from route params or use localDataService
  const residentId = route?.params?.residentId as string | undefined;
  const residentName =
    (residentId && ResidentService.getResidentById(residentId)?.fullName) ||
    route?.params?.residentName ||
    ResidentService.getDefaultResident().fullName;

  // Navigate to cart screen with resident context
  const goToCart = () => {
    navigation.navigate('Cart', { residentId, residentName, dietaryRestrictions: route?.params?.dietaryRestrictions ?? [] });
  };

  // Navigate to settings with resident context
  const goToSettings = () => {
    navigation.navigate('Settings', { residentId, residentName, dietaryRestrictions: route?.params?.dietaryRestrictions ?? [] });
  };

  // Fetch meals from API (async)
  const loadMenu = useCallback(async (period: PeriodOption["value"], periodKey?: string) => {
    setMenuLoading(true);
    setError("");

    try {
      // Seasonal tab: fetch all meals then filter to seasonal only
      let serviceMeals = periodKey === 'seasonal'
        ? await MealService.getSeasonalMeals()
        : await MealService.getMealsByPeriod(period);

      // Filter out meals that are unsafe for this resident's dietary restrictions
      const resId = residentId || ResidentService.getDefaultResident().id;
      const resident = ResidentService.getResidentById(resId);
      if (resident) {
        // Local DB resident — use full safety check
        serviceMeals = serviceMeals.filter((m) =>
          ResidentService.isMealSafeForResident(m, resident)
        );
      } else {
        // API/backend resident — filter using both dietaryRestrictions AND foodAllergies from caregiver
        const allRestrictions = [
          ...(route?.params?.dietaryRestrictions ?? []),
          ...(route?.params?.foodAllergies ?? []),
        ].map((r: string) => r.toLowerCase());
        if (allRestrictions.length > 0) {
          serviceMeals = serviceMeals.filter((m) => {
            const mealAllergens = m.allergenInfo.map((a) => a.toLowerCase());
            return !mealAllergens.some((allergen) =>
              allRestrictions.some((r) => r.includes(allergen) || allergen.includes(r))
            );
          });
        }
      }

      // mapServiceMeal imported from mealDisplayService.ts
      const mapped: Meal[] = serviceMeals.map(mapServiceMeal);

      // Pre-load drinks and sides for the add-on pickers in meal detail modal
      const drinkServiceMeals = await MealService.getMealsByPeriod("Drinks");
      setAvailableDrinks(drinkServiceMeals.map(mapServiceMeal));
      const sidesServiceMeals = await MealService.getMealsByPeriod("Sides");
      setAvailableSides(sidesServiceMeals.map(mapServiceMeal));

      setRawServiceMeals(serviceMeals);
      setMeals(mapped);
      setMenuLoading(false);

      // Translate any API/kitchen meals not in the static lookup table
      const unknownNames = mapped.map(m => m.name).filter(n => !hasMealNameTranslation(n));
      if (unknownNames.length > 0) {
        translateMealNamesWithGemini(unknownNames).then(results => {
          if (Object.keys(results).length > 0) {
            setCachedMealTranslations(results);
            // Trigger re-render with fresh copy so translated names show
            setMeals(prev => [...prev]);
          }
        });
      }
    } catch {
      setError("Failed to load meals");
      setMenuLoading(false);
    }
  }, [residentId]);

  // Fetch recommendation — works with both local and backend residents
  const loadRecommendation = useCallback(async () => {
    setRecLoading(true);
    setError("");

    try {
      const resId = residentId || ResidentService.getDefaultResident().id;
      const localResident = ResidentService.getResidentById(resId);

      let rec;
      if (localResident) {
        // local resident — use normal path
        rec = await RecommendationService.getTopRecommendation(resId, selectedPeriod.value);
      } else {
        // backend resident — build a virtual resident from route params
        // Combine both dietaryRestrictions AND foodAllergies from caregiver dashboard
        const rawAllergies: string[] = [
          ...(route?.params?.dietaryRestrictions ?? []),
          ...(route?.params?.foodAllergies ?? []),
        ];
        const virtualResident: Resident = {
          id: resId,
          firstName: (route?.params?.residentName ?? 'Resident').split(' ')[0],
          lastName: '',
          fullName: route?.params?.residentName ?? 'Resident',
          email: '',
          phone: '',
          roomNumber: '',
          role: 'resident',
          dietaryRestrictions: rawAllergies.map((name: string) => ({
            type: 'allergy' as const,
            name,
            severity: 'moderate' as const,
          })),
          nutritionGoals: { dailyCalories: 1800, maxSodium: 2000, minProtein: 45, maxCholesterol: 250, maxSugar: 40 },
          dislikedIngredients: [],
          favoriteMealIds: [],
          isActive: true,
        };
        rec = await RecommendationService.getTopRecommendationForResident(virtualResident, selectedPeriod.value);
      }

      setRecommendation(rec);
      setRecLoading(false);
    } catch {
      setRecommendation(null);
      setRecLoading(false);
    }
  }, [residentId, selectedPeriod.value, route?.params]);

  // Pre-load drinks, sides, and backend order history once on mount
  useEffect(() => {
    MealService.getMealsByPeriod("Drinks").then(d => setAvailableDrinks(d.map(mapServiceMeal)));
    MealService.getMealsByPeriod("Sides").then(s => setAvailableSides(s.map(mapServiceMeal)));
    if (residentId) fetchOrderHistory(residentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load menu and recommendation when component mounts or period changes
  useEffect(() => {
    loadMenu(selectedPeriod.value, selectedPeriod.key);
    loadRecommendation();
  }, [selectedPeriod, loadMenu, loadRecommendation]);

  // Auto-suggest next upcoming meal from past orders (always visible, time-aware)
  useEffect(() => {
    if (autoSuggestDismissed || meals.length === 0) return;

    const next = getNextMealPeriod(currentTime);
    if (!next) return;
    const upcoming = next.period;

    // Check if resident already has a current order for this period
    const resOrders = residentId ? getOrdersForResident(residentId) : orders;
    const hasOrderForPeriod = resOrders.some((o) =>
      o.items.some((i) => i.meal_period === upcoming.label)
    );
    if (hasOrderForPeriod) return;

    const allPastItems = resOrders.flatMap((o) => o.items);

    // Pick main meal from past orders or fall back to first available
    const pastMeal = allPastItems.find((i) => i.meal_period === upcoming.label);
    let mainMeal: Meal | null = null;
    if (pastMeal) {
      mainMeal = meals.find((m) => String(m.id) === String(pastMeal.id) || m.name === pastMeal.name) ?? null;
    }
    if (!mainMeal) {
      const periodMeals = meals.filter((m) => m.meal_period === upcoming.label);
      mainMeal = periodMeals[0] ?? null;
    }
    if (!mainMeal) return;

    // Pick drink from past orders or fall back to first available drink
    const pastDrink = allPastItems.find((i) => i.meal_period === 'Drinks');
    let suggestDrink: Meal | undefined;
    if (pastDrink) {
      suggestDrink = availableDrinks.find((d) => String(d.id) === String(pastDrink.id) || d.name === pastDrink.name);
    }
    if (!suggestDrink && availableDrinks.length > 0) {
      suggestDrink = availableDrinks[0];
    }

    // Pick dessert/side from past orders or fall back to first available side
    const pastDessert = allPastItems.find((i) => i.meal_period === 'Sides');
    let suggestDessert: Meal | undefined;
    if (pastDessert) {
      suggestDessert = availableSides.find((s) => String(s.id) === String(pastDessert.id) || s.name === pastDessert.name);
    }
    if (!suggestDessert && availableSides.length > 0) {
      suggestDessert = availableSides[0];
    }

    setAutoSuggest({ period: upcoming.label, minsUntil: next.minsUntil, meal: mainMeal, drink: suggestDrink, dessert: suggestDessert });
  }, [meals, autoSuggestDismissed, orders, residentId, getOrdersForResident, availableDrinks, availableSides, currentTime]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMenu(selectedPeriod.value, selectedPeriod.key);
    await loadRecommendation();
    setRefreshing(false);
  }, [selectedPeriod.value, selectedPeriod.key, loadMenu, loadRecommendation]);

  // Open meal detail modal
  const openMealDetail = (meal: Meal) => {
    setSelectedMeal(meal);
    setSpecialNote('');
    setSelectedDrink(null);
    setSelectedSide(null);
    setShowMealDetail(true);
  };

  // Add meal (and optional drink) to cart from detail modal
  const handleAddToCartFromModal = () => {
    if (!selectedMeal) return;
    addToCart({ ...selectedMeal, id: parseInt(selectedMeal.id), specialNote: specialNote.trim() || undefined });
    if (selectedDrink) {
      addToCart({ ...selectedDrink, id: parseInt(selectedDrink.id) });
    }
    if (selectedSide) {
      addToCart({ ...selectedSide, id: parseInt(selectedSide.id) });
    }
    setShowMealDetail(false);
  };

  // Render individual meal item for FlatList
  const renderMeal = ({ item }: { item: Meal }) => {
    const ph = getMealPlaceholder(item.name);
    const mealImg = !!item.imageUrl;
    const available = isWithinTimeRange(item.time_range, item.meal_period, currentTime);
    const accent = PERIOD_ACCENT[item.meal_period] ?? PERIOD_ACCENT['All Day'];
    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
          !available && styles.cardUnavailable,
        ]}
        activeOpacity={available ? 0.7 : 1}
        onPress={() => { if (available) openMealDetail(item); }}
        disabled={!available}
      >
        {!available && (
          <View style={styles.unavailableOverlay}>
            <Feather name="clock" size={13} color="#717644" />
            <Text style={styles.unavailableText}>Not available · {item.time_range}</Text>
          </View>
        )}
        <View style={[styles.mealImageContainer, { backgroundColor: ph.bg }]}>
          {/* {mealImg ? (
            <Image source={mealImg} style={styles.mealRealImage} resizeMode="contain" />
          ) : (
            <Text style={styles.mealImageEmoji}>{ph.emoji}</Text>
          )} */}
          {mealImg ? (
            <Image source={{ uri: item.imageUrl }} style={styles.mealRealImage} resizeMode="cover" />
          ) : (
            <Image source={require('../styles/pictures/grandma.png')} style={{ width: 60, height: 60, opacity: 0.3 }} resizeMode="contain" />
          )}
          {/* Light frost over image for unavailable meals — image stays visible */}
          {!available && (
            <View style={styles.imageFrost} />
          )}
        </View>
        {/* Coloured left accent strip */}
        <View style={[styles.periodStrip, { backgroundColor: accent.color }]} />
        <View style={[styles.cardContent, { backgroundColor: theme.surface }]}>
          {/* Period pill next to meal title */}
          <View style={[styles.periodPill, { backgroundColor: accent.light, borderColor: accent.color }]}>
            <Text style={[styles.periodPillText, { color: accent.color }]}>
              {translateMealPeriod(item.meal_period, language)}
            </Text>
          </View>
          <Text style={[styles.cardTitle, { fontSize: scaled(20), color: theme.textPrimary }]}>
            {translateMealName(item.name, language)}
          </Text>
          <View style={[styles.timeBadge, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}>
            <Text style={[styles.timeBadgeText, { fontSize: scaled(14), color: theme.accent }]}>
              {item.time_range}
            </Text>
          </View>
          <Text style={[styles.cardDescription, { fontSize: scaled(15), color: theme.textSecondary }]}>
            {translateMealDescription(item.description, language)}
          </Text>
          <View style={styles.nutritionRow}>
            <Text style={[styles.nutritionItem, { fontSize: scaled(13), color: theme.textSecondary }]}>
              {item.kcal} kcal
            </Text>
            <Text style={[styles.nutritionItem, { fontSize: scaled(13), color: theme.textSecondary }]}>
              Sodium: {item.sodium_mg}mg
            </Text>
            <Text style={[styles.nutritionItem, { fontSize: scaled(13), color: theme.textSecondary }]}>
              Protein: {item.protein_g}g
            </Text>
          </View>
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagRow}>
              {item.tags.map((tag, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.tag,
                    {
                      backgroundColor: tag.includes('Low Sodium') ? '#DBEAFE' : '#FEE2E2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      { fontSize: scaled(14) },
                      { color: tag.includes('Low Sodium') ? '#1E40AF' : '#991B1B' },
                    ]}
                  >
                    {translateMealTag(tag, language)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <View style={[styles.header, { backgroundColor: pt.bg }]}>
      {/* Decorative period icon — top right of header */}
      <Text style={styles.headerIcon}>{pt.icon}</Text>

      {/* Back Button, Title & Header Actions */}
      <View style={styles.titleRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: pt.buttonBg, borderColor: pt.buttonBorder }]}
        >
          <View style={styles.backArrow}>
            <View style={[styles.backArrowLine1, { backgroundColor: pt.titleColor }]} />
            <View style={[styles.backArrowLine2, { backgroundColor: pt.titleColor }]} />
          </View>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { fontSize: scaled(28), color: pt.titleColor }]}>{t.availableMenus}</Text>
          <Text style={[styles.subtitle, { fontSize: scaled(15), color: pt.subColor }]}>{t.orderingFor} {residentName}</Text>
        </View>
        {/* Header action buttons — right side */}
        <View style={styles.headerActions}>
          {getCartCount() > 0 && (
            <TouchableOpacity
              style={[styles.headerActionBtn, { backgroundColor: pt.tabActiveBg }]}
              onPress={goToCart}
              activeOpacity={0.85}
            >
              <Feather name="shopping-cart" size={18} color="#FFF" />
              <View style={styles.headerCartBadge}>
                <Text style={styles.headerCartBadgeText}>{getCartCount()}</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: pt.buttonBg, borderColor: pt.buttonBorder, borderWidth: 1.5 }]}
            onPress={() => navigation.navigate('UpcomingMeals', { residentId, residentName, dietaryRestrictions: route?.params?.dietaryRestrictions ?? [] })}
            activeOpacity={0.85}
          >
            <Feather name="calendar" size={20} color={pt.tabActiveBg} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: pt.buttonBg, borderColor: pt.buttonBorder, borderWidth: 1.5 }]}
            onPress={() => setShowBrowseSupport(true)}
            activeOpacity={0.85}
          >
            <Feather name="help-circle" size={20} color={pt.tabActiveBg} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: pt.buttonBg, borderColor: pt.buttonBorder, borderWidth: 1.5 }]}
            onPress={goToSettings}
            activeOpacity={0.85}
          >
            <Feather name="settings" size={20} color={pt.tabActiveBg} />
          </TouchableOpacity>
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
              style={[
                styles.tab,
                { backgroundColor: isActive ? pt.tabActiveBg : pt.tabInactiveBg },
                isActive && { borderColor: pt.tabActiveBg },
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.tabText,
                { fontSize: scaled(16) },
                { color: isActive ? pt.tabActiveText : pt.tabInactiveText },
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const listFooter = (
    <View style={styles.bottomCard}>
      {/* Grandma avatar */}
      <View style={styles.bottomCardAvatar}>
        <Image source={require('../styles/pictures/grandma.png')} style={{ width: 42, height: 42 }} resizeMode="contain" />
      </View>

      <View style={{ flex: 1, gap: 10 }}>
        {/* Recommendation row */}
        <View>
          <Text style={[styles.bottomCardLabel, { fontSize: scaled(12) }]}>
            GrannyGBT · {residentName}
          </Text>
          {recLoading ? (
            <ActivityIndicator color="#4A5C2A" size="small" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
          ) : recommendation ? (
            (() => {
              // Find meal to check availability
              const recMeal = meals.find(
                (m) => m.name === recommendation.meal_name || translateMealName(m.name, language) === recommendation.meal_name
              );
              const recSchedule = recMeal
                ? MEAL_SCHEDULE.find((s) => s.label === recMeal.meal_period)
                : null;
              const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
              const isServing = recSchedule
                ? nowMins >= recSchedule.start && nowMins <= recSchedule.end
                : true;
              return (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => { if (recMeal) openMealDetail(recMeal); }}
                  style={styles.bottomCardRecRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bottomCardRecText, { fontSize: scaled(14) }]}>
                      {recommendation.reason}{' '}
                      <Text style={styles.bottomCardMealName}>
                        {translateMealName(recommendation.meal_name, language)}
                      </Text>
                    </Text>
                    {!isServing && recSchedule && (
                      <Text style={[styles.bottomCardAvailBadge, { fontSize: scaled(11) }]}>
                        Not serving now · Available {recMeal?.time_range || `${recSchedule.start / 60}–${recSchedule.end / 60}`}
                      </Text>
                    )}
                  </View>
                  <View style={styles.bottomCardOrderBtn}>
                    <Feather name="plus" size={14} color="#FFF" />
                    <Text style={styles.bottomCardOrderBtnText}>Order</Text>
                  </View>
                </TouchableOpacity>
              );
            })()
          ) : (
            <Text style={[styles.bottomCardRecText, { fontSize: scaled(14) }]}>{t.noRecommendation}</Text>
          )}
        </View>

        {/* Auto-suggest rows — main meal + optional drink + dessert */}
        {autoSuggest && !autoSuggestDismissed && (
          <>
            <View style={styles.bottomCardDivider} />
            {/* Header row */}
            <View style={styles.bottomCardSuggestHeader}>
              <Feather name="clock" size={13} color="#4A5C2A" />
              <Text style={[styles.bottomCardSuggestTitle, { fontSize: scaled(12) }]}>
                {autoSuggest.period} in {formatMinsUntil(autoSuggest.minsUntil)} — from past orders
              </Text>
              <TouchableOpacity onPress={() => { setAutoSuggestDismissed(true); setAutoSuggest(null); }} hitSlop={8}>
                <Feather name="x" size={14} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {/* Main meal row */}
            <View style={styles.bottomCardSuggestRow}>
              <Text style={[styles.bottomCardSuggestText, { fontSize: scaled(13), flex: 1 }]}>
                <Text style={styles.bottomCardSuggestLabel}>Meal: </Text>
                <Text style={styles.bottomCardMealName}>{autoSuggest.meal.name}</Text>
              </Text>
              <TouchableOpacity
                style={styles.bottomCardSuggestConfirm}
                onPress={() => {
                  const m = autoSuggest.meal;
                  addToCart({ id: Number(m.id), name: m.name, meal_period: m.meal_period as any, description: m.description, kcal: m.kcal, sodium_mg: m.sodium_mg, protein_g: m.protein_g, tags: m.tags });
                }}
              >
                <Text style={styles.bottomCardSuggestConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
            {/* Drink row */}
            {autoSuggest.drink && (
              <View style={styles.bottomCardSuggestRow}>
                <Text style={[styles.bottomCardSuggestText, { fontSize: scaled(13), flex: 1 }]}>
                  <Text style={styles.bottomCardSuggestLabel}>Drink: </Text>
                  <Text style={styles.bottomCardMealName}>{autoSuggest.drink.name}</Text>
                </Text>
                <TouchableOpacity
                  style={styles.bottomCardSuggestConfirm}
                  onPress={() => {
                    const d = autoSuggest.drink!;
                    addToCart({ id: Number(d.id), name: d.name, meal_period: d.meal_period as any, description: d.description, kcal: d.kcal, sodium_mg: d.sodium_mg, protein_g: d.protein_g, tags: d.tags });
                  }}
                >
                  <Text style={styles.bottomCardSuggestConfirmText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Dessert row */}
            {autoSuggest.dessert && (
              <View style={styles.bottomCardSuggestRow}>
                <Text style={[styles.bottomCardSuggestText, { fontSize: scaled(13), flex: 1 }]}>
                  <Text style={styles.bottomCardSuggestLabel}>Side: </Text>
                  <Text style={styles.bottomCardMealName}>{autoSuggest.dessert.name}</Text>
                </Text>
                <TouchableOpacity
                  style={styles.bottomCardSuggestConfirm}
                  onPress={() => {
                    const s = autoSuggest.dessert!;
                    addToCart({ id: Number(s.id), name: s.name, meal_period: s.meal_period as any, description: s.description, kcal: s.kcal, sodium_mg: s.sodium_mg, protein_g: s.protein_g, tags: s.tags });
                  }}
                >
                  <Text style={styles.bottomCardSuggestConfirmText}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Dismiss all */}
            <TouchableOpacity
              style={styles.bottomCardSuggestDismiss}
              onPress={() => { setAutoSuggestDismissed(true); setAutoSuggest(null); }}
            >
              <Text style={[styles.bottomCardSuggestDismissText, { fontSize: scaled(12) }]}>Dismiss all</Text>
            </TouchableOpacity>
          </>
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
          key={`meal-list-cols-2`}
          data={sortMealsByAvailability(meals, currentTime)}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMeal}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
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

      <TouchableOpacity
        style={[styles.floatingGrannyButton, { minHeight: touchTarget, minWidth: touchTarget }]}
        onPress={() => setShowAIChat(true)}
        activeOpacity={0.85}
      >
        <Image source={require('../styles/pictures/grandma.png')} style={styles.floatingGrannyImage} resizeMode="contain" />
      </TouchableOpacity>


      {/* Meal Detail Modal */}
      <Modal
        visible={showMealDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMealDetail(false)}
      >
        <View style={styles.detailModalRoot}>
          <TouchableOpacity style={styles.detailBackdrop} activeOpacity={1} onPress={() => setShowMealDetail(false)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.detailSheetWrap}>
            <View style={styles.detailSheet}>
              <View style={styles.detailSheetHandle} />
              <View style={styles.detailSheetHeader}>
                <Text style={styles.detailSheetLabel}>Customize order</Text>
                <TouchableOpacity
                  style={styles.detailCloseButton}
                  onPress={() => setShowMealDetail(false)}
                  activeOpacity={0.8}
                >
                  <Feather name="x" size={20} color={COLORS.textMid} />
                </TouchableOpacity>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.detailScrollContent}
              >
            {selectedMeal && (() => {
              const ph = getMealPlaceholder(selectedMeal.name);
              //const mealImg = getMealImage(selectedMeal.name);
              const mealImg = !!selectedMeal.imageUrl;
              return (
                <>
                  {/* Image */}
                  <View style={[styles.detailImageWrap, { backgroundColor: ph.bg }]}>
                    {/* {mealImg ? (
                      <Image source={mealImg} style={styles.detailRealImage} resizeMode="contain" />
                    ) : (
                      <Text style={styles.detailImageEmoji}>{ph.emoji}</Text>
                    )} */}
                    {mealImg ? (
                      <Image source={{ uri: selectedMeal.imageUrl }} style={styles.detailRealImage} resizeMode="cover" />
                    ) : (
                      <Image source={require('../styles/pictures/grandma.png')} style={{ width: 80, height: 80, opacity: 0.3 }} resizeMode="contain" />
                    )}
                  </View>
                  {/* Info */}
                  <View style={styles.detailBody}>
                    <Text style={[styles.detailTitle, { fontSize: scaled(22) }]}>{translateMealName(selectedMeal.name, language)}</Text>
                    <Text style={[styles.detailDesc, { fontSize: scaled(15) }]}>{translateMealDescription(selectedMeal.description, language)}</Text>
                    <View style={styles.detailNutrRow}>
                      <Text style={styles.detailNutr}>{selectedMeal.kcal} kcal</Text>
                      <Text style={styles.detailNutr}>Sodium: {selectedMeal.sodium_mg}mg</Text>
                      <Text style={styles.detailNutr}>Protein: {selectedMeal.protein_g}g</Text>
                    </View>

                    {/* Special Note */}
                    <Text style={[styles.detailSectionLabel, { fontSize: scaled(15) }]}>Special note for kitchen</Text>
                    <TextInput
                      style={styles.detailNoteInput}
                      placeholder="e.g. No onions, extra sauce…"
                      placeholderTextColor="#9CA3AF"
                      value={specialNote}
                      onChangeText={setSpecialNote}
                      multiline
                      maxLength={200}
                    />

                    {/* Add-on pickers: Drink & Side — horizontal row */}
                    {selectedMeal.meal_period !== 'Drinks' && selectedMeal.meal_period !== 'Sides' && (availableDrinks.length > 0 || availableSides.length > 0) && (
                      <>
                        <View style={styles.addonRow}>
                          {/* Drink picker */}
                          {availableDrinks.length > 0 && (
                            <View style={styles.addonCol}>
                              <Text style={[styles.detailSectionLabel, { fontSize: scaled(14) }]}>
                                Add a drink?
                              </Text>
                              <View style={styles.drinkPickerWrap}>
                                <Picker
                                  selectedValue={selectedDrink?.id ?? '__none__'}
                                  onValueChange={(val) => {
                                    if (val === '__none__') {
                                      setSelectedDrink(null);
                                    } else {
                                      const found = availableDrinks.find(d => d.id === val);
                                      setSelectedDrink(found ?? null);
                                    }
                                  }}
                                  style={styles.drinkPicker}
                                  itemStyle={styles.drinkPickerItem}
                                >
                                  <Picker.Item label="— No drink —" value="__none__" />
                                  {availableDrinks.map(drink => (
                                    <Picker.Item
                                      key={drink.id}
                                      label={`${drink.name}  ·  ${drink.kcal} kcal`}
                                      value={drink.id}
                                    />
                                  ))}
                                </Picker>
                              </View>
                              {selectedDrink && (
                                <View style={styles.drinkSelectedRow}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={[styles.drinkSelectedName, { fontSize: scaled(13) }]}>
                                      {selectedDrink.name}
                                    </Text>
                                    <Text style={[styles.drinkSelectedMeta, { fontSize: scaled(11) }]}>
                                      {selectedDrink.kcal} kcal · {selectedDrink.sodium_mg}mg Na
                                    </Text>
                                  </View>
                                </View>
                              )}
                            </View>
                          )}

                          {/* Side picker */}
                          {availableSides.length > 0 && (
                            <View style={styles.addonCol}>
                              <Text style={[styles.detailSectionLabel, { fontSize: scaled(14) }]}>
                                Add a side?
                              </Text>
                              <View style={styles.drinkPickerWrap}>
                                <Picker
                                  selectedValue={selectedSide?.id ?? '__none__'}
                                  onValueChange={(val) => {
                                    if (val === '__none__') {
                                      setSelectedSide(null);
                                    } else {
                                      const found = availableSides.find(s => s.id === val);
                                      setSelectedSide(found ?? null);
                                    }
                                  }}
                                  style={styles.drinkPicker}
                                  itemStyle={styles.drinkPickerItem}
                                >
                                  <Picker.Item label="— No side —" value="__none__" />
                                  {availableSides.map(side => (
                                    <Picker.Item
                                      key={side.id}
                                      label={`${side.name}  ·  ${side.kcal} kcal`}
                                      value={side.id}
                                    />
                                  ))}
                                </Picker>
                              </View>
                              {selectedSide && (
                                <View style={styles.drinkSelectedRow}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={[styles.drinkSelectedName, { fontSize: scaled(13) }]}>
                                      {selectedSide.name}
                                    </Text>
                                    <Text style={[styles.drinkSelectedMeta, { fontSize: scaled(11) }]}>
                                      {selectedSide.kcal} kcal · {selectedSide.sodium_mg}mg Na
                                    </Text>
                                  </View>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      </>
                    )}
                  </View>
                </>
              );
            })()}
              </ScrollView>
              <View style={styles.detailFooter}>
                <TouchableOpacity style={styles.detailAddBtn} onPress={handleAddToCartFromModal} activeOpacity={0.85}>
                  <Text style={[styles.detailAddBtnText, { fontSize: scaled(17) }]}>
                    {selectedDrink || selectedSide
                      ? `Add to Cart + ${[selectedDrink?.name, selectedSide?.name].filter(Boolean).join(' + ')}`
                      : 'Add to Cart'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* AI Assistant Chat Modal */}
      <AIAssistantChat
        visible={showAIChat}
        onClose={() => setShowAIChat(false)}
        residentName={residentName}
        residentId={residentId || ResidentService.getDefaultResident().id}
        dietaryRestrictions={route?.params?.dietaryRestrictions || []}
      />

      {/* Browse Support Modal */}
      <Modal visible={showBrowseSupport} transparent animationType="fade" onRequestClose={() => setShowBrowseSupport(false)}>
        <View style={styles.supportBackdrop}>
          <View style={styles.supportCard}>
            <View style={styles.supportCardHeader}>
              <Text style={styles.supportCardTitle}>Need Help?</Text>
              <TouchableOpacity onPress={() => setShowBrowseSupport(false)} hitSlop={10}>
                <Feather name="x" size={22} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
            <Text style={styles.supportCardSub}>Contact your care team or kitchen staff for assistance with meal orders.</Text>

            <View style={styles.scheduleCardBlock}>
              <Text style={styles.scheduleCardTitle}>Kitchen Hours</Text>
              {MEAL_SCHEDULE.map((s) => {
                const isActive = activePeriod === s.label;
                return (
                  <View key={s.label} style={[styles.scheduleCardRow, isActive && styles.scheduleCardRowActive]}>
                    <Text style={styles.scheduleCardIcon}>{s.icon}</Text>
                    <Text style={[styles.scheduleCardLabel, isActive && styles.scheduleCardLabelActive]}>
                      {s.label}
                    </Text>
                    <Text style={[styles.scheduleCardTime, isActive && styles.scheduleCardLabelActive]}>
                      {s.label === 'Breakfast' ? '7:00 am – 10:00 am' : s.label === 'Lunch' ? '11:00 am – 2:00 pm' : '4:00 pm – 7:00 pm'}
                    </Text>
                    {isActive && <View style={styles.scheduleActiveDot} />}
                  </View>
                );
              })}
              <Text style={styles.scheduleKitchenNote}>Kitchen open 7 am – 7 pm daily</Text>
            </View>

            <TouchableOpacity style={styles.supportCloseBtn} onPress={() => setShowBrowseSupport(false)}>
              <Text style={styles.supportCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    overflow: 'hidden',
  },
  headerIcon: {
    position: 'absolute',
    top: 10,
    right: 80,
    fontSize: 72,
    opacity: 0.07,
    zIndex: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(113,118,68,0.25)',
    shadowColor: '#717644',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    marginLeft: 8,
  },
  settingsButtonText: {
    fontSize: 22,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerCartButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerCartBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  floatingGrannyButton: {
    position: 'absolute',
    right: 16,
    bottom: 22,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  floatingGrannyImage: {
    width: 38,
    height: 38,
  },
  floatingTopActions: {
    position: 'absolute',
    top: 18,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 12,
  },
  floatingCartButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  floatingSettingsButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(113,118,68,0.25)',
    shadowColor: '#717644',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  floatingUpcomingBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(113,118,68,0.25)',
    shadowColor: '#717644',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  floatingUpcomingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
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
    paddingBottom: 160,
    paddingHorizontal: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    maxWidth: '48.5%',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    marginTop: 14,
    marginHorizontal: 4,
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
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  mealRealImage: {
    width: '100%',
    height: 200,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  mealImageEmoji: {
    fontSize: 56,
  },
  mealImageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  periodStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    zIndex: 2,
  },
  periodPill: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  periodPillText: {
    fontSize: 11,
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
  // Combined bottom card (recommendation + auto-suggest)
  bottomCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F5F2EA',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#DDD5C0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bottomCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDE8C0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F6C97E',
    overflow: 'hidden',
  },
  bottomCardLabel: {
    fontWeight: '700',
    color: '#6D6040',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bottomCardRecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottomCardRecText: {
    color: '#3C3C3C',
    lineHeight: 20,
    flex: 1,
  },
  bottomCardMealName: {
    fontWeight: '800',
    color: '#2D4018',
  },
  bottomCardOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4A5C2A',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  bottomCardOrderBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  bottomCardAvailBadge: {
    color: '#B45309',
    marginTop: 3,
    fontWeight: '600',
  },
  bottomCardDivider: {
    height: 1,
    backgroundColor: '#DDD5C0',
  },
  bottomCardSuggestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomCardSuggestTitle: {
    flex: 1,
    fontWeight: '700',
    color: '#4A5C2A',
  },
  bottomCardSuggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomCardSuggestText: {
    color: '#555',
    lineHeight: 18,
  },
  bottomCardSuggestLabel: {
    fontWeight: '600',
    color: '#777',
  },
  bottomCardSuggestPeriod: {
    fontWeight: '700',
    color: '#4A5C2A',
  },
  bottomCardSuggestConfirm: {
    backgroundColor: '#4A5C2A',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  bottomCardSuggestConfirmText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  bottomCardSuggestDismiss: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  bottomCardSuggestDismissText: {
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
  cardUnavailable: {
    borderColor: '#DDD0B8',
    borderStyle: 'dashed',
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0EFE6',
    borderWidth: 1,
    borderColor: '#717644',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  unavailableText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#717644',
    letterSpacing: 0.1,
  },
  imageFrost: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245,243,238,0.55)',
    zIndex: 1,
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
  // Meal Detail Modal
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  detailModalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
  },
  detailSheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  detailSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '82%',
    width: '100%',
    overflow: 'hidden',
    marginBottom: 0,
    paddingBottom: 0,
  },
  detailSheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  detailSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailSheetLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMid,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailScrollContent: {
    paddingBottom: 20,
  },
  detailImageWrap: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  detailRealImage: {
    width: '100%',
    height: 220,
  },
  detailImageEmoji: {
    fontSize: 72,
  },
  detailBody: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  detailDesc: {
    fontSize: 15,
    color: COLORS.textLight,
    lineHeight: 22,
    marginBottom: 10,
  },
  detailNutrRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  detailNutr: {
    fontSize: 13,
    color: COLORS.textMid,
    fontWeight: '600',
    backgroundColor: COLORS.surface,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  detailSectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 14,
    marginBottom: 8,
  },
  detailNoteInput: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: COLORS.textDark,
    minHeight: 60,
    backgroundColor: COLORS.surface,
    textAlignVertical: 'top',
  },
  // Drink Picker
  drinkPickerWrap: {
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    marginBottom: 8,
  },
  drinkPicker: {
    height: 50,
    color: COLORS.textDark,
  },
  drinkPickerItem: {
    fontSize: 15,
    color: COLORS.textDark,
  },
  drinkSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  drinkSelectedEmoji: {
    fontSize: 26,
  },
  drinkSelectedName: {
    fontWeight: '700',
    color: COLORS.textDark,
  },
  drinkSelectedMeta: {
    color: COLORS.textMid,
    marginTop: 2,
  },
  addonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  addonCol: {
    flex: 1,
  },
  detailFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: COLORS.white,
  },
  detailAddBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  detailAddBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Recommendation tappable highlight
  aiRecommendationTappable: {
    textDecorationLine: 'underline',
  },

  // Auto-suggest banner
  autoSuggestBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#F0F7E8',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#C2D9A0',
    padding: 14,
    gap: 10,
  },
  autoSuggestLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  autoSuggestTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3A5020',
    marginBottom: 2,
  },
  autoSuggestBody: {
    fontSize: 13,
    color: '#4A5C2A',
    lineHeight: 18,
  },
  autoSuggestMeal: {
    fontWeight: '700',
    color: '#2D4018',
  },
  autoSuggestActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  autoSuggestConfirm: {
    backgroundColor: '#4A5C2A',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  autoSuggestConfirmText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  autoSuggestDeny: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#B0C890',
  },
  autoSuggestDenyText: {
    color: '#4A5C2A',
    fontWeight: '600',
    fontSize: 13,
  },

  // Schedule banner in header
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 14,
  },
  scheduleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  schedulePill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  schedulePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
  },
  schedulePillTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },

  // Support button in floating actions
  floatingSupportButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(113,118,68,0.25)',
    shadowColor: '#717644',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  // Support modal
  supportBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  supportCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 480,
  },
  supportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  supportCardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1A1A1A',
  },
  supportCardSub: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  scheduleCardBlock: {
    backgroundColor: '#F8F7F3',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  scheduleCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4A4A4A',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scheduleCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
    gap: 8,
  },
  scheduleCardRowActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  scheduleCardIcon: {
    fontSize: 16,
  },
  scheduleCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    width: 72,
  },
  scheduleCardLabelActive: {
    color: '#1D4ED8',
  },
  scheduleCardTime: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  scheduleActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  scheduleKitchenNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 10,
    textAlign: 'center',
  },
  supportCloseBtn: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  supportCloseBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
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
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  container: {
    width: SCREEN_WIDTH * 0.88,
    maxWidth: 440,
    backgroundColor: '#F7F4EE',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: -6, height: 0 },
    elevation: 14,
    flexDirection: 'column',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A5C2A',
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  headerAvatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerAvatar: {
    width: 40,
    height: 40,
  },
  headerText: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontWeight: '700',
    color: '#FFF',
  },
  aiOn: {
    backgroundColor: 'rgba(52,211,153,0.85)',
  },
  aiOff: {
    backgroundColor: 'rgba(156,163,175,0.75)',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Messages
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F0EDE5',
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 4,
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 10,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  avatarBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FDE8C0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#F6C97E',
  },
  bubbleAvatar: {
    width: 24,
    height: 24,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#4A5C2A',
    borderBottomRightRadius: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#A8A29E',
    marginTop: 5,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'right',
  },
  typingText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },

  // Quick questions
  quickQuestionsContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EDE8DF',
  },
  quickQuestionsLabel: {
    fontWeight: '700',
    color: '#A8A29E',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  quickQuestionButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F5F0E8',
    borderWidth: 1,
    borderColor: '#DDD8CC',
  },
  quickQuestionText: {
    color: '#4A5C2A',
    fontWeight: '600',
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EDE8DF',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    color: '#2C2C2C',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#DDD8CC',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A5C2A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A5C2A',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#C8C3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
  },
});
