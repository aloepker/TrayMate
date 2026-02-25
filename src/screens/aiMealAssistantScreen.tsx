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
import { createGeminiChat, GeminiChatService } from '../services/geminiService';

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
}: {
  text: string;
  isUser: boolean;
  allMeals: ServiceMeal[];
}) => {
  const lines = text.split('\n');
  const mealNames = allMeals.map(m => m.name);

  return (
    <View>
      {lines.map((line, lineIdx) => {
        // Check if this line is a meal card line (starts with number or bullet + bold meal name)
        const mealCardMatch = line.match(
          /^(?:\d+\.\s*|[•]\s*)?\*\*(.+?)\*\*(.*)$/,
        );
        const matchedMeal = mealCardMatch
          ? allMeals.find(
              m =>
                m.name.toLowerCase() === mealCardMatch[1].toLowerCase().trim(),
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
                <Text style={richStyles.mealCardName}>{matchedMeal.name}</Text>
                <Text style={richStyles.mealCardMeta}>
                  {matchedMeal.mealPeriod} · {matchedMeal.timeRange}
                </Text>
                <Text style={richStyles.mealCardNutrition}>
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
                  style={[richStyles.text, isUser && richStyles.textUser]}
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

const QUICK_QUESTIONS = [
  "What's on the menu today?",
  'Recommend a meal',
  'View dietary restrictions',
  'What meals are low sodium?',
];

// ---------- Main Screen ----------
const AIMealAssistantScreen = ({ navigation, route }: any) => {
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

  // Initialize chat service on mount
  useEffect(() => {
    const service = createGeminiChat();
    chatServiceRef.current = service;

    if (service.isConfigured()) {
      service.initialize(residentId);
    }

    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: `Hey! 👋 I'm GrannyGBT, your meal planning assistant. I've got ${residentName}'s dietary profile loaded up — allergies, nutrition goals, the works.\n\nWhat can I help you with?`,
        timestamp: new Date(),
      },
    ]);
  }, [residentId, residentName]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Track whether responses are coming from AI or fallback
  const [aiMode, setAiMode] = useState<'connecting' | 'ai' | 'offline'>('connecting');

  // Minimal fallback for when ALL Gemini models are down
  const generateFallbackResponse = (userMessage: string): string => {
    const lower = userMessage.toLowerCase();
    const menuItems = allMeals.map((m: ServiceMeal) => `• **${m.name}** (${m.mealPeriod}, ${m.timeRange})`).join('\n');

    if (lower.includes('menu') || lower.includes('today') || lower.includes('available')) {
      return `Here's the menu! 📋\n\n${menuItems}\n\nAI is currently offline, but the menu data is still available.`;
    }
    if (lower.includes('recommend') || lower.includes('suggest')) {
      const recs = RecommendationService.getRecommendations(residentId, null, 3);
      const recList = recs.map((r, i) => `${i + 1}. **${r.meal.name}** — ${r.allReasons.join(', ')}`).join('\n');
      return `Top picks for ${residentName}:\n\n${recList}`;
    }
    return `AI is currently offline. 😴\n\nYou can still try:\n• **"menu"** — View today's meals\n• **"recommend"** — See top picks\n\nOr try again in a moment!`;
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
        content: 'Something went wrong — please try again! 😅',
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <View style={styles.backArrow}>
            <View style={styles.backArrowLine1} />
            <View style={styles.backArrowLine2} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>GrannyGBT</Text>
            <View style={[styles.aiBadge, aiMode === 'ai' ? styles.aiBadgeOn : aiMode === 'offline' ? styles.aiBadgeOff : styles.aiBadgeConnecting]}>
              <Text style={styles.aiBadgeText}>
                {aiMode === 'ai' ? '✨ AI' : aiMode === 'offline' ? '💤 Offline' : '⏳'}
              </Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>Meal advisor for {residentName}</Text>
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
                <Text style={styles.assistantLabel}>GrannyGBT</Text>
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
              />
              <Text
                style={[
                  styles.timestamp,
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
              <Text style={styles.assistantLabel}>GrannyGBT</Text>
            </View>
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Questions */}
      <View style={styles.quickQuestionsContainer}>
        <Text style={styles.quickQuestionsLabel}>Quick questions:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.quickQuestionsRow}>
            {QUICK_QUESTIONS.map((question, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickQuestionButton}
                onPress={() => handleQuickQuestion(question)}
              >
                <Text style={styles.quickQuestionText}>{question}</Text>
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
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about meals..."
            placeholderTextColor={COLORS.textLight}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendButtonText}>➤</Text>
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
    fontSize: 14,
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
    fontSize: 12,
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
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 8,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
  },
  typingText: {
    fontSize: 14,
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
    fontSize: 13,
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
    fontSize: 14,
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
    color: COLORS.white,
  },
});
