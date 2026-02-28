import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
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
import { useSettings } from './context/SettingsContext';

// ---------- TrayMate Color Palette ----------
const COLORS = {
  primary: '#717644',
  accent: '#f6a72d',
  secondary: '#d27028',
  neutral: '#cbc2b4',
  support: '#b77f3f',
  white: '#FFFFFF',
  textDark: '#111827',
  textMid: '#374151',
  textLight: '#6B7280',
  borderLight: '#E5E7EB',
  surface: '#F3F4F6',
  grannyPink: '#FDF2F8',
  grannyRose: '#BE185D',
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
  MEAL_PLACEHOLDERS[name] || { bg: '#F3F4F6', emoji: '🍽' };

// ---------- Rich Text Renderer ----------
// Parses **bold**, meal names (renders inline cards), and bullet points
const RichText = ({
  text,
  isUser,
  allMeals,
  scaled,
  language,
}: {
  text: string;
  isUser: boolean;
  allMeals: ServiceMeal[];
  scaled: (base: number) => number;
  language: 'English' | 'Español' | 'Français' | '中文';
}) => {
  const lines = text.split('\n');

  return (
    <View>
      {lines.map((line, lineIdx) => {
        // Check if this line is a meal card line (starts with number or bullet + bold meal name)
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
            <View key={lineIdx} style={richStyles.mealCard}>
              <View style={[richStyles.mealCardImage, { backgroundColor: ph.bg }]}>
                <Text style={richStyles.mealCardEmoji}>{ph.emoji}</Text>
              </View>
              <View style={richStyles.mealCardInfo}>
                <Text style={[richStyles.mealCardName, { fontSize: scaled(15) }]}>
                  {translateMealName(matchedMeal.name, language)}
                </Text>
                <Text style={[richStyles.mealCardMeta, { fontSize: scaled(12) }]}>
                  {translateMealPeriod(matchedMeal.mealPeriod, language)} · {translateMealTimeRange(matchedMeal.timeRange, language)}
                </Text>
                <Text style={[richStyles.mealCardNutrition, { fontSize: scaled(11) }]}>
                  {matchedMeal.nutrition.calories} cal · {matchedMeal.nutrition.sodium} sodium · {matchedMeal.nutrition.protein} protein
                </Text>
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
                      { fontSize: scaled(15), lineHeight: scaled(22) },
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
                  style={[richStyles.text, { fontSize: scaled(15), lineHeight: scaled(22) }, isUser && richStyles.textUser]}
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
    fontSize: 15,
    lineHeight: 22,
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
    borderRadius: 12,
    marginVertical: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  mealCardImage: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealCardEmoji: {
    fontSize: 28,
  },
  mealCardInfo: {
    flex: 1,
    padding: 10,
  },
  mealCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  mealCardMeta: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  mealCardNutrition: {
    fontSize: 11,
    color: COLORS.support,
    fontWeight: '600',
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
  const residentName = resident?.fullName || 'Resident';
  const allMeals = MealService.getAllMeals();

  const chatServiceRef = useRef<GeminiChatService | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const QUICK_QUESTIONS = [
    t.whatsOnMenuToday,
    t.recommendAMeal,
    t.viewDietaryRestrictionsPrompt,
    t.whatMealsLowSodium,
  ];

  // Initialize chat service on mount
  useEffect(() => {
    const service = createGeminiChat();
    chatServiceRef.current = service;

    if (service.isConfigured()) {
      service.initialize(residentId, language);
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

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Track whether responses are coming from AI or fallback
  const [aiMode, setAiMode] = useState<'connecting' | 'ai' | 'offline'>('connecting');

  // Minimal fallback for when ALL Gemini models are down
  const generateFallbackResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();
    const menuItems = allMeals
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
          console.warn('Gemini API error:', apiError);
          setAiMode('offline');
          responseText = generateFallbackResponse(text.trim());
        }
      } else {
        setAiMode('offline');
        responseText = generateFallbackResponse(text.trim());
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { minHeight: touchTarget, minWidth: touchTarget }]}
        >
          <View style={styles.backArrow}>
            <View style={styles.backArrowLine1} />
            <View style={styles.backArrowLine2} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { fontSize: scaled(22) }]}>{t.grannyGBT}</Text>
            <View style={[styles.aiBadge, aiMode === 'ai' ? styles.aiBadgeOn : aiMode === 'offline' ? styles.aiBadgeOff : styles.aiBadgeConnecting]}>
              <Text style={[styles.aiBadgeText, { fontSize: scaled(11) }]}>
                {aiMode === 'ai' ? '✨ AI' : aiMode === 'offline' ? '💤 Offline' : '⏳'}
              </Text>
            </View>
          </View>
          <Text style={[styles.headerSubtitle, { fontSize: scaled(14) }]}>{t.mealAdvisorFor} {residentName}</Text>
        </View>
        <View style={styles.headerIconContainer}>
          <Text style={styles.headerIcon}>👵</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map(message => (
          <View key={message.id}>
            {/* Avatar row for assistant messages */}
            {message.role === 'assistant' && (
              <View style={styles.assistantAvatarRow}>
                <View style={styles.assistantAvatar}>
                  <Text style={styles.assistantAvatarText}>👵</Text>
                </View>
                <Text style={[styles.assistantLabel, { fontSize: scaled(12) }]}>{t.grannyGBT}</Text>
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
                />
              <Text
                style={[
                  styles.timestamp,
                  { fontSize: scaled(11) },
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
                <Text style={styles.assistantAvatarText}>👵</Text>
              </View>
              <Text style={[styles.assistantLabel, { fontSize: scaled(12) }]}>{t.grannyGBT}</Text>
            </View>
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <Text style={[styles.typingText, { fontSize: scaled(14) }]}>{t.thinking}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Questions */}
      <View style={styles.quickQuestionsContainer}>
        <Text style={[styles.quickQuestionsLabel, { fontSize: scaled(13) }]}>{t.quickQuestionsLabel}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.quickQuestionsRow}>
            {QUICK_QUESTIONS.map((question, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.quickQuestionButton, { minHeight: touchTarget }]}
                onPress={() => handleQuickQuestion(question)}
              >
                <Text style={[styles.quickQuestionText, { fontSize: scaled(14) }]}>{question}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, { fontSize: scaled(16) }]}
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
              { minHeight: touchTarget, minWidth: touchTarget },
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Text style={[styles.sendButtonText, { fontSize: scaled(20) }]}>➤</Text>
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
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    backgroundColor: COLORS.white,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }, { translateX: -1 }, { translateY: 2 }],
  },
  backArrowLine2: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 12,
    height: 2,
    backgroundColor: COLORS.white,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }, { translateX: -1 }, { translateY: -2 }],
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 24,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  assistantAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 4,
  },
  assistantAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  assistantAvatarText: {
    fontSize: 14,
  },
  assistantLabel: {
    fontWeight: '700',
    color: COLORS.support,
  },
  messageBubble: {
    maxWidth: '88%',
    padding: 14,
    borderRadius: 18,
    marginBottom: 14,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
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
    color: COLORS.support,
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
    fontWeight: '700',
    color: COLORS.support,
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
    color: COLORS.white,
  },
});
