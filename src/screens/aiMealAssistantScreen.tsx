import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { getDefaultMealsApi, getResidentById as fetchResidentApi } from '../services/api';
import { getMealImage, MEAL_PLACEHOLDER_COLORS } from '../services/mealDisplayService';
import { isMealSafe, SafetyResident } from '../services/mealSafetyService';
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
// Pulls from the shared map in mealDisplayService so soft-bite meals
// (and anything else the kitchen adds) get proper backgrounds/emoji
// without us maintaining a parallel copy that goes stale.
const getMealPlaceholder = (name: string) =>
  MEAL_PLACEHOLDER_COLORS[name] ?? { bg: COLORS.primaryLight, emoji: '🍽' };

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Image with onError fallback to bundled image, then to a caller-
 * supplied final element. Same pattern as MealCardImage in the
 * browse screen — kept inline here to avoid a shared-module
 * refactor for one consumer.
 */
const ChatMealImage: React.FC<{
  remoteUri: string | null;
  localImg: any | null;
  imgStyle: any;
  finalFallback: React.ReactNode;
}> = ({ remoteUri, localImg, imgStyle, finalFallback }) => {
  const [remoteFailed, setRemoteFailed] = useState(false);
  if (remoteUri && !remoteFailed) {
    return (
      <Image
        source={{ uri: remoteUri }}
        style={imgStyle}
        resizeMode="cover"
        onError={() => setRemoteFailed(true)}
      />
    );
  }
  if (localImg) {
    return <Image source={localImg} style={imgStyle} resizeMode="cover" />;
  }
  return <>{finalFallback}</>;
};

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
  orderThisLabel,
}: {
  text: string;
  isUser: boolean;
  allMeals: ServiceMeal[];
  scaled: (base: number) => number;
  language: 'English' | 'Español' | 'Français' | '中文';
  onOrderMeal?: (meal: ServiceMeal) => void;
  orderThisLabel?: string;
}) => {
  const lines = text.split('\n');
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, "'")
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  return (
    <View>
      {lines.map((line, lineIdx) => {
        // Check if this line has a bold meal name that matches a real meal
        const mealCardMatch = line.match(
          /^(.*?)(?:\d+\.\s*|[•-]\s*)?\*\*(.+?)\*\*(.*)$/,
        );
        const requestedMealName = mealCardMatch ? norm(mealCardMatch[2]) : '';
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
          // Same picture chain the menu screen uses: backend imageUrl
          // first, then bundled asset, then emoji placeholder.
          const remoteUri = matchedMeal.imageUrl && matchedMeal.imageUrl.trim().length > 0
            ? matchedMeal.imageUrl.trim()
            : null;
          const localImg = remoteUri ? null : getMealImage(matchedMeal.name);
          // Extract reasoning text after **name** (e.g. " — Free of: Dairy | Low sodium")
          const suffixText = mealCardMatch?.[3]?.replace(/^\s*[—–-]\s*/, '').trim() || '';
          return (
            <TouchableOpacity
              key={lineIdx}
              style={richStyles.mealCard}
              activeOpacity={onOrderMeal ? 0.78 : 1}
              onPress={onOrderMeal ? () => onOrderMeal(matchedMeal) : undefined}
              accessibilityLabel={`${matchedMeal.name}, ${matchedMeal.nutrition.calories} calories${suffixText ? `, ${suffixText}` : ''}. Tap to order this meal.`}
            >
              <View style={[richStyles.mealCardImage, { backgroundColor: ph.bg }]}>
                <ChatMealImage
                  remoteUri={remoteUri}
                  localImg={localImg}
                  imgStyle={richStyles.mealCardRealImage}
                  finalFallback={<Text style={richStyles.mealCardEmoji}>{ph.emoji}</Text>}
                />
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
                      {orderThisLabel ?? 'Order this'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
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
  // ask about the next one coming up. Uses translated strings so the
  // button matches the active language.
  const getMenuNowQuestion = (): string => {
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    if (mins >= 7 * 60 && mins <= 10 * 60) return t.whatsForBreakfast;
    if (mins >= 11 * 60 && mins <= 14 * 60) return t.whatsForLunch;
    if (mins >= 16 * 60 && mins <= 19 * 60) return t.whatsForDinner;
    if (mins < 7 * 60) return t.whatsForBreakfast;
    if (mins < 11 * 60) return t.whatsForLunch;
    if (mins < 16 * 60) return t.whatsForDinner;
    return t.whatsForBreakfastTomorrow;
  };
  const QUICK_QUESTIONS = [
    getMenuNowQuestion(),
    t.recommendAMeal,
    t.viewDietaryRestrictionsPrompt,
    t.whatMealsLowSodium,
  ];

  const injectMealBold = useCallback((raw: string) => {
    if (!raw) return raw;

    const mealNames = (allMeals || [])
      .map(m => ({
        raw: m.name,
        localized: translateMealName(m.name, language),
      }))
      .sort((a, b) => b.localized.length - a.localized.length);

    let out = raw;
    for (const mealName of mealNames) {
      const candidates = Array.from(new Set([mealName.localized, mealName.raw])).filter(Boolean);
      for (const candidate of candidates) {
        const useWordBoundary = /[A-Za-z0-9]/.test(candidate);
        const re = useWordBoundary
          ? new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(candidate)})(?=$|[^\\p{L}\\p{N}])`, 'giu')
          : new RegExp(`(${escapeRegExp(candidate)})`, 'giu');
        out = out.replace(re, (...args) => {
          const offset = args[args.length - 2] as number;
          const full = args[args.length - 1] as string;
          const prefix = useWordBoundary ? (args[1] as string) : '';
          const mealText = useWordBoundary ? (args[2] as string) : (args[1] as string);
          const mealOffset = offset + prefix.length;
          const boldMarkersBefore = (full.slice(0, mealOffset).match(/\*\*/g) || []).length;
          const boldMarkersAfter = (full.slice(mealOffset + mealText.length).match(/\*\*/g) || []).length;
          const insideBold = boldMarkersBefore % 2 === 1 && boldMarkersAfter % 2 === 1;
          const directlyBold =
            full.slice(mealOffset - 2, mealOffset) === '**' &&
            full.slice(mealOffset + mealText.length, mealOffset + mealText.length + 2) === '**';
          if (insideBold || directlyBold) {
            return `${prefix}${mealText}`;
          }
          return `${prefix}**${mealText}**`;
        });
      }
    }
    return out;
  }, [allMeals, language]);

  // Load meals from API on mount
  useEffect(() => {
    MealService.getAllMeals().then(setAllMeals).catch(() => setAllMeals([]));
  }, []);

  // Refresh resident profile from the backend whenever this screen gains
  // focus — same mechanism the browse screen uses. Catches allergies
  // and dietary restrictions added (or new residents) since the local
  // cache was last populated. Updates route.params so the offline
  // fallback picks them up, AND re-initializes Granny BT directly so
  // the AI prompt also sees the fresh profile without a remount.
  useFocusEffect(
    useCallback(() => {
      if (!residentId) return;
      let cancelled = false;
      (async () => {
        try {
          const fresh = await fetchResidentApi(residentId);
          if (cancelled || !fresh) return;
          const incoming = {
            dietaryRestrictions: fresh.dietaryRestrictions ?? [],
            foodAllergies: fresh.foodAllergies ?? [],
            medicalConditions: fresh.medicalConditions ?? [],
          };
          const cur = {
            dietaryRestrictions: (route?.params as any)?.dietaryRestrictions ?? [],
            foodAllergies: (route?.params as any)?.foodAllergies ?? [],
            medicalConditions: (route?.params as any)?.medicalConditions ?? [],
          };
          const eq = (a: string[], b: string[]) =>
            a.length === b.length && a.every((v, i) => v === b[i]);
          const changed =
            !eq(cur.dietaryRestrictions, incoming.dietaryRestrictions) ||
            !eq(cur.foodAllergies, incoming.foodAllergies) ||
            !eq(cur.medicalConditions, incoming.medicalConditions);
          if (changed) {
            navigation.setParams(incoming as any);
          }
          // Re-initialize the AI session with the fresh profile so
          // newly-added allergies show up in the prompt right away.
          const service = chatServiceRef.current;
          if (service && service.isConfigured()) {
            let favoriteMealIds: number[] = [];
            try {
              favoriteMealIds = await getDefaultMealsApi(residentId);
            } catch { /* no-op */ }
            const override = {
              name: residentName,
              dietaryRestrictions: incoming.dietaryRestrictions,
              foodAllergies: incoming.foodAllergies,
              medicalConditions: incoming.medicalConditions,
              favoriteMealIds,
            };
            service.initialize(residentId, language, override, favoriteMealIds).catch(() => {});
          }
        } catch { /* network blip — keep stale params */ }
      })();
      return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [residentId, residentName, language, navigation]),
  );

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

    // Strip restricted meals up-front so neither the menu list nor the
    // recommend list can surface anything unsafe for this resident.
    //
    // Look up the local resident fresh on every message so allergies
    // added through the UI (without re-navigating) are picked up
    // immediately. Falls back to route.params for backend-only
    // residents that aren't in the local cache.
    const localResident = ResidentService.getResidentById(residentId);
    const safetyResident: SafetyResident = localResident
      ? {
          foodAllergies: localResident.dietaryRestrictions
            .filter((r) => r.type === 'allergy')
            .map((r) => r.name),
          dietaryRestrictions: localResident.dietaryRestrictions
            .filter((r) => r.type !== 'allergy')
            .map((r) => r.name),
          medicalConditions: [],
        }
      : {
          foodAllergies,
          dietaryRestrictions,
          medicalConditions,
        };
    const safeAllMeals = allMeals.filter((m) =>
      isMealSafe(
        {
          id: m.id,
          name: m.name,
          description: m.description,
          tags: m.tags,
          allergenInfo: m.allergenInfo,
          ingredients: m.ingredients,
          sodium: m.nutrition?.sodium,
          meal_period: m.mealPeriod,
        },
        safetyResident,
      ),
    );

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
    const filteredMeals = periodFilter ? safeAllMeals.filter((m) => m.mealPeriod === periodFilter) : safeAllMeals;
    const menuItems = filteredMeals
      .map(
        (m: ServiceMeal) =>
          `• **${translateMealName(m.name, language)}** (${translateMealPeriod(m.mealPeriod, language)}, ${translateMealTimeRange(m.timeRange, language)})`,
      )
      .join('\n');

    const isPlaceOrderQuery = lower.includes('place') && lower.includes('order');
    const isDietaryQuery = !isPlaceOrderQuery && (lower.includes('dietary') || lower.includes('restriction') || lower.includes('allergies') || lower.includes('allergy'));
    const isMenuQuery = !isPlaceOrderQuery && !isDietaryQuery && (lower.includes('menu') || lower.includes('today') || lower.includes('available') || lower.includes('breakfast') || lower.includes('lunch') || lower.includes('dinner') || lower.includes(t.whatsOnMenuToday.toLowerCase()));
    const isRecommendQuery = !isPlaceOrderQuery && !isDietaryQuery && (lower.includes('recommend') || lower.includes('suggest') || lower.includes(t.recommendAMeal.toLowerCase()));

    // "Place X order" — pick a safe meal for the requested period and
    // surface it as a tappable card with the inline "Order this" button.
    if (isPlaceOrderQuery) {
      const inferPeriod = (): ServiceMeal['mealPeriod'] => {
        if (periodFilter) return periodFilter;
        const mins = new Date().getHours() * 60 + new Date().getMinutes();
        if (mins >= 7 * 60 && mins <= 10 * 60) return 'Breakfast';
        if (mins >= 11 * 60 && mins <= 14 * 60) return 'Lunch';
        if (mins >= 16 * 60 && mins <= 19 * 60) return 'Dinner';
        return 'Lunch';
      };
      const target = inferPeriod();
      const candidates = safeAllMeals.filter((m) => m.mealPeriod === target);
      if (candidates.length === 0) {
        return `No safe ${target.toLowerCase()} options for ${residentName} right now.`;
      }
      const pick = candidates[0];
      return `For ${target.toLowerCase()}, I'd suggest:\n\n• **${translateMealName(pick.name, language)}** — ${pick.nutrition.calories} cal · ${pick.nutrition.sodium} sodium\n\nTap "Order this" on the card to place the order.`;
    }

    if (isDietaryQuery) {
      const lines: string[] = [];
      if (safetyResident.foodAllergies && safetyResident.foodAllergies.length > 0) {
        lines.push(`**Allergies:** ${safetyResident.foodAllergies.join(', ')}`);
      }
      if (safetyResident.dietaryRestrictions && safetyResident.dietaryRestrictions.length > 0) {
        lines.push(`**Dietary:** ${safetyResident.dietaryRestrictions.join(', ')}`);
      }
      if (safetyResident.medicalConditions && safetyResident.medicalConditions.length > 0) {
        lines.push(`**Medical:** ${safetyResident.medicalConditions.join(', ')}`);
      }
      if (lines.length === 0) {
        return `${residentName} has no allergies or dietary restrictions on file.`;
      }
      return `${residentName}'s profile:\n\n${lines.join('\n')}`;
    }

    if (isMenuQuery) {
      if (filteredMeals.length === 0) {
        const profileNote = (safetyResident.foodAllergies?.length || 0) + (safetyResident.dietaryRestrictions?.length || 0) > 0
          ? ` (avoiding ${[...(safetyResident.foodAllergies ?? []), ...(safetyResident.dietaryRestrictions ?? [])].join(', ')})`
          : '';
        return periodFilter
          ? `No safe ${periodFilter.toLowerCase()} options on the menu right now${profileNote}.`
          : `Menu data isn't available right now — please try again in a moment.`;
      }
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
      // Use the same safety-filtered list as the menu fallback so the
      // two never disagree on what's safe to surface.
      const topMeals = (safeAllMeals.length > 0 ? safeAllMeals : allMeals).slice(0, 3);
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

      responseText = injectMealBold(responseText);

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
                  orderThisLabel={t.orderThis}
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
