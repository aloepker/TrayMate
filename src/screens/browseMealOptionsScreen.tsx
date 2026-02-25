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
} from "react-native";
import { StatusBar } from "react-native";
import { useCart } from "./context/CartContext";

// global styling file (from your teammate setup)
import { globalStyles } from "../styles/styles";

// Importing services from the local data layer
import {
  MealService,
  ResidentService,
  RecommendationService,
} from "../services/localDataService";


const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
type BrowseMeal = {
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


// Quick questions for AI Assistant
const QUICK_QUESTIONS = [
  "What's on the menu today?",
  "Recommend a meal",
  "View dietary restrictions",
  "Place lunch order",
];

// ---------- Period Tabs ----------
type PeriodOption = {
  label: string;
  value: BrowseMeal["meal_period"] | null;
};

const PERIODS: PeriodOption[] = [
  { label: "All Day", value: null },
  { label: "Breakfast", value: "Breakfast" },
  { label: "Lunch", value: "Lunch" },
  { label: "Dinner", value: "Dinner" },
];

// ---------- AI Chat Component ----------
const AIAssistantChat = ({ 
  visible, 
  onClose, 
  residentName,
  meals,
  recommendation 
}: { 
  visible: boolean; 
  onClose: () => void;
  residentName: string;
  meals: BrowseMeal[];
  recommendation: Recommendation | null;
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your TrayMate AI assistant for ${residentName}. I'm here to help you with meal selections, dietary questions, or any concerns about their food. How can I assist you today?`,
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
  }, [visible]);

  const generateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('menu') || lowerMessage.includes('today')) {
      const menuItems = meals.map(m => `• ${m.name} (${m.meal_period})`).join('\n');
      return `Here's what's available today:\n\n${menuItems}\n\nWould you like me to recommend something based on ${residentName}'s dietary needs?`;
    }
    
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
      if (recommendation) {
        return `Based on ${residentName}'s dietary restrictions (${recommendation.dietary_restrictions.join(', ')}), I recommend the **${recommendation.meal_name}**. It's low in sodium and heart-healthy, which aligns perfectly with their needs.`;
      }
      return `I'd recommend the Herb Baked Chicken - it's low sodium and heart healthy, perfect for ${residentName}'s dietary needs.`;
    }
    
    if (lowerMessage.includes('dietary') || lowerMessage.includes('restriction')) {
      return `${residentName}'s current dietary restrictions are:\n\n• Low Sodium\n• Heart Healthy\n• No Shellfish\n\nAll meal recommendations take these into account. Would you like to update these restrictions?`;
    }
    
    if (lowerMessage.includes('order') || lowerMessage.includes('place')) {
      return `I can help you place an order! Which meal would you like to order for ${residentName}?\n\nFor lunch today, I'd suggest the Herb Baked Chicken or Garden Vegetable Medley based on their dietary needs.`;
    }
    
    if (lowerMessage.includes('allerg')) {
      return `${residentName} has the following dietary considerations:\n\n• No Shellfish (allergy)\n• Low Sodium (medical)\n• Heart Healthy (preference)\n\nI always filter meal suggestions to avoid any allergens.`;
    }
    
    if (lowerMessage.includes('calorie') || lowerMessage.includes('nutrition')) {
      return `Here's the nutritional info for today's recommended meals:\n\n• Herb Baked Chicken: 420 cal, 380mg sodium, 45g protein\n• Garden Vegetable Medley: 180 cal, 240mg sodium, 6g protein\n\nBoth are within ${residentName}'s dietary guidelines.`;
    }
    
    return `I'd be happy to help with that! I can assist you with:\n\n• Viewing today's menu\n• Meal recommendations\n• Dietary restrictions\n• Placing orders\n• Nutritional information\n\nWhat would you like to know?`;
  };

  const handleSend = () => {
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

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAIResponse(userMessage.content),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 500);
  };

  const handleQuickQuestion = (question: string) => {
    setInputText(question);
    setTimeout(() => handleSend(), 100);
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
              <Text style={chatStyles.headerIconText}>🤖</Text>
            </View>
            <View style={chatStyles.headerText}>
              <Text style={chatStyles.headerTitle}>TrayMate AI Assistant</Text>
              <Text style={chatStyles.headerSubtitle}>{residentName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={chatStyles.closeButton}>
              <Text style={chatStyles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView 
            ref={scrollViewRef}
            style={chatStyles.messagesContainer}
            contentContainerStyle={chatStyles.messagesContent}
          >
            {messages.map((message) => (
              <View 
                key={message.id} 
                style={[
                  chatStyles.messageBubble,
                  message.role === 'user' ? chatStyles.userBubble : chatStyles.assistantBubble
                ]}
              >
                <Text style={[
                  chatStyles.messageText,
                  message.role === 'user' && chatStyles.userMessageText
                ]}>
                  {message.content}
                </Text>
                <Text style={[
                  chatStyles.timestamp,
                  message.role === 'user' && chatStyles.userTimestamp
                ]}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
            {isTyping && (
              <View style={[chatStyles.messageBubble, chatStyles.assistantBubble]}>
                <Text style={chatStyles.typingText}>Typing...</Text>
              </View>
            )}
          </ScrollView>

          {/* Quick Questions */}
          <View style={chatStyles.quickQuestionsContainer}>
            <Text style={chatStyles.quickQuestionsLabel}>Quick questions:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={chatStyles.quickQuestionsRow}>
                {QUICK_QUESTIONS.map((question, index) => (
                  <TouchableOpacity
                    key={index}
                    style={chatStyles.quickQuestionButton}
                    onPress={() => handleQuickQuestion(question)}
                  >
                    <Text style={chatStyles.quickQuestionText}>{question}</Text>
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
                style={chatStyles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
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
                <Text style={chatStyles.sendButtonText}>➤</Text>
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
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(PERIODS[0]);
  const [meals, setMeals] = useState<BrowseMeal[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);

  // Use the cart context
  const { cart, addToCart, getCartCount } = useCart();

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

    setTimeout(async () => {
      try {
        // Pull from localDataService
        // const serviceMeals = MealService.getMealsByPeriod(period);
        const serviceMeals = await MealService.getMealsByPeriod(period);

        // Map service Meal -> screen Meal shape
    const mapped: BrowseMeal[] = serviceMeals.map((m) => ({
      id: String(m.id),
      name: m.name,
      meal_period: (m.mealPeriod === "All Day" ? "Lunch" : m.mealPeriod),
      description: m.description,
      time_range: m.timeRange,
      kcal: m.nutrition.calories,
      sodium_mg: parseInt(String(m.nutrition.sodium).replace(/[^\d]/g, "") || "0", 10),
      protein_g: parseInt(String(m.nutrition.protein).replace(/[^\d]/g, "") || "0", 10),
      tags: m.tags ?? [],
    }));

        setMeals(mapped);
        setMenuLoading(false);
      } catch (e) {
        setError("Failed to load meals");
        setMenuLoading(false);
      }
    }, 200);
  }, []);

  // Local "fetch recommendation" (CSV-backed)
  const loadRecommendation = useCallback(async () => {
    setRecLoading(true);
    setError("");

    setTimeout(async () => {
    try {
      const resId = (route?.params?.residentId as string | undefined) || ResidentService.getDefaultResident().id;
      const rec = await RecommendationService.getTopRecommendation(resId, selectedPeriod.value);
      setRecommendation(rec);
      setRecLoading(false);
    } catch (e) {
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
    setTimeout(() => setRefreshing(false), 250);
  }, [loadMenu, loadRecommendation, selectedPeriod.value]);

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

const renderMeal = ({ item }: { item: BrowseMeal }) => (
  <TouchableOpacity 
    style={styles.card}
    activeOpacity={0.7}
    onPress={() => addToCart(item as any)}
  >
      <Text style={styles.cardTitle}>{item.name}</Text>
      
      <View style={styles.timeBadge}>
        <Text style={styles.timeBadgeText}>
          {item.meal_period} • {item.time_range}
        </Text>
      </View>

      <Text style={styles.cardDescription}>{item.description}</Text>

      {item.tags?.length ? (
        <View style={styles.tagRow}>
          {item.tags.map((tag) => {
            const tagStyle = getTagStyle(tag);
            return (
              <View 
                key={tag} 
                style={[styles.tag, { backgroundColor: tagStyle.bg }]}
              >
                <Text style={[styles.tagText, { color: tagStyle.text }]}>{tag}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </TouchableOpacity>
  );

  const listHeader = (
    <View style={styles.header}>
      {/* Back Button & Title */}
      <View style={styles.titleRow}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Available Menus</Text>
          <Text style={styles.subtitle}>Ordering for {residentName}</Text>
        </View>
        {/* AI Chat Button */}
        <TouchableOpacity 
          style={styles.aiButton}
          onPress={() => setShowAIChat(true)}
        >
          <Text style={styles.aiButtonText}>🤖</Text>
        </TouchableOpacity>
      </View>

      {/* Period Tabs */}
      <View style={styles.tabs}>
        {PERIODS.map((period) => {
          const isActive = period.label === selectedPeriod.label;
          return (
            <TouchableOpacity
              key={period.label}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {period.label}
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
        <Text style={styles.aiRecommendationIconText}>AI</Text>
      </View>
      <View style={styles.aiRecommendationContent}>
        <Text style={styles.aiRecommendationTitle}>
          AI Recommendation for {residentName}
        </Text>
        {recLoading ? (
          <ActivityIndicator color="#2563EB" size="small" />
        ) : recommendation ? (
          <Text style={styles.aiRecommendationText}>
            {recommendation.reason}{' '}
            <Text style={styles.aiRecommendationHighlight}>
              {recommendation.meal_name}
            </Text>.
          </Text>
        ) : (
          <Text style={styles.aiRecommendationText}>
            No recommendation available.
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Cart Badge */}
      {getCartCount() > 0 && (
        <TouchableOpacity style={styles.cartBadge} onPress={goToCart}>
          <Text style={styles.cartBadgeText}>🛒 {getCartCount()}</Text>
        </TouchableOpacity>
      )}

      {/* Error Banner */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Main Content */}
      {menuLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#1F2937" />
          <Text style={styles.loadingText}>Loading menu...</Text>
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
            <Text style={styles.emptyText}>No meals found for this period.</Text>
          }
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

      {/* AI Assistant Chat Modal */}
      <AIAssistantChat
        visible={showAIChat}
        onClose={() => setShowAIChat(false)}
        residentName={residentName}
        meals={meals}
        recommendation={recommendation}
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
    alignItems: 'flex-start',
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
  backButtonText: {
    fontSize: 22,
    color: COLORS.textMid,
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
  aiButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  aiButtonText: {
    fontSize: 22,
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
    padding: 18,
    marginTop: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.support,
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
    marginBottom: 12,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
  // Cart Badge
  cartBadge: {
    position: 'absolute',
    top: 72,
    right: 20,
    zIndex: 1000,
    backgroundColor: COLORS.secondary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cartBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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