import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
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
import { todayLocalISO, toLocalISODate } from "../services/dateUtils";
import Feather from "react-native-vector-icons/Feather";
import { useCart } from "./context/CartContext";
import { useSettings } from './context/SettingsContext';
import Video from 'react-native-video';

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
  hasMealDescriptionTranslation,
  setCachedMealTranslations,
  setCachedDescriptionTranslations,
} from "../services/mealLocalization";
import {
  translateMealNamesWithGemini,
  translateMealDescriptionsWithGemini,
} from "../services/geminiService";

import { geminiChat, getAIRecommendation } from "../services/geminiService";
import { getUnsafeReason, isMealSafe, SafetyResident } from "../services/mealSafetyService";
import { useClock } from '../context/useClock';
import { setResidentCaregiver, getResidentCaregiver, setResidentCaregivers, getResidentCaregivers } from '../services/storage';
import { Picker } from "@react-native-picker/picker";
import { sendMessage as sendApiMessage, createOverrideApi, getDefaultMealsApi, getResidentById } from '../services/api';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

// MEAL_PLACEHOLDER_COLORS, MEAL_IMAGES, getMealPlaceholder, getMealImage
// → now imported from ../services/mealDisplayService.ts

// ---------- Rich Text Renderer for Chat ----------
const ChatRichText = ({
  text,
  isUser,
  scaled,
  language,
  nutritionLabels,
  allMeals = [],
  onMealTap,
}: {
  text: string;
  isUser: boolean;
  scaled: (base: number) => number;
  language: 'English' | 'Español' | 'Français' | '中文';
  nutritionLabels: { sodium: string; protein: string };
  allMeals?: ServiceMeal[];
  onMealTap?: (meal: ServiceMeal) => void;
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
        // Check if line has a bold meal name that matches a real meal
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
              // allow small formatting differences (hyphens, extra words)
              if (requestedMealName.length >= 4 && (n1.includes(requestedMealName) || n2.includes(requestedMealName))) return true;
              if (n1.length >= 4 && requestedMealName.includes(n1)) return true;
              if (n2.length >= 4 && requestedMealName.includes(n2)) return true;
              return false;
            })
          : null;

        if (matchedMeal && !isUser) {
          const ph = getMealPlaceholder(matchedMeal.name);
          // Same picture chain the regular menu card uses: backend imageUrl
          // first, then bundled image, then emoji placeholder. Keeps chat
          // cards visually identical to the menu list.
          const remoteUri = matchedMeal.imageUrl && matchedMeal.imageUrl.trim().length > 0
            ? matchedMeal.imageUrl.trim()
            : null;
          const localImg = remoteUri ? null : getMealImage(matchedMeal.name);
          const suffixText = mealCardMatch?.[3]?.replace(/^\s*[—–-]\s*/, '').trim() || '';
          return (
            <TouchableOpacity
              key={lineIdx}
              activeOpacity={onMealTap ? 0.75 : 1}
              onPress={onMealTap ? () => onMealTap(matchedMeal) : undefined}
              accessibilityLabel={`${matchedMeal.name}, ${matchedMeal.nutrition.calories} calories${suffixText ? `, ${suffixText}` : ''}. Tap to view details.`}
            >
              <View style={chatRichStyles.mealCard}>
                <View style={[chatRichStyles.mealCardImage, { backgroundColor: ph.bg }]}>
                  <MealCardImage
                    remoteUri={remoteUri}
                    localImg={localImg}
                    imgStyle={chatRichStyles.mealCardRealImage}
                    finalFallback={<Text style={chatRichStyles.mealCardEmoji}>{ph.emoji}</Text>}
                  />
                </View>
                <View style={chatRichStyles.mealCardInfo}>
                  <Text style={[chatRichStyles.mealCardName, { fontSize: scaled(16) }]}>
                    {translateMealName(matchedMeal.name, language)}
                  </Text>
                  <Text style={[chatRichStyles.mealCardMeta, { fontSize: scaled(13) }]}>
                    {translateMealPeriod(matchedMeal.mealPeriod, language)} · {translateMealTimeRange(matchedMeal.timeRange, language)}
                  </Text>
                  <Text style={[chatRichStyles.mealCardNutrition, { fontSize: scaled(12) }]}>
                    {matchedMeal.nutrition.calories} cal · {matchedMeal.nutrition.sodium} {nutritionLabels.sodium} · {matchedMeal.nutrition.protein} {nutritionLabels.protein}
                  </Text>
                  {suffixText !== '' && (
                    <Text style={[chatRichStyles.mealCardReason, { fontSize: scaled(12) }]}>
                      {suffixText}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
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
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mealCardImage: { width: '100%', height: 130, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  mealCardRealImage: { width: '100%', height: 130 },
  mealCardEmoji: { fontSize: 44 },
  mealCardInfo: { padding: 12 },
  mealCardName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 3 },
  mealCardMeta: { fontSize: 13, color: '#6B7280', marginBottom: 3 },
  mealCardNutrition: { fontSize: 12, color: '#b77f3f', fontWeight: '600' },
  mealCardReason: { fontSize: 12, color: '#15803d', fontWeight: '700', marginTop: 5 },
});

// COLORS → imported from ../services/mealDisplayService.ts
// DisplayMeal (aliased as Meal below) → imported from ../services/mealDisplayService.ts
type Meal = DisplayMeal;

type PendingAuto = {
  period: string;
  items: Meal[];
  /** Minutes until this period starts (or ends, if being served now). */
  minsUntil: number;
  /** True when the current device time falls inside this meal's service window. */
  isNow: boolean;
  /** True when this slot's window already passed today, so it's tomorrow's meal. */
  forTomorrow: boolean;
  /** Human-readable service window, e.g. "7:00 AM – 10:00 AM". */
  windowLabel: string;
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
  targetPeriod?: string; // upcoming period this recommendation targets
};


// ---------- Period Tabs ----------
type PeriodOption = {
  key: string;
  value: Meal["meal_period"] | null;
};

// ── Period accent colours (for card left strip) ───────────────────────────────
// `icon` uses Feather names so the period pill shows a small glyph next
// to the label ("☀️ Breakfast", "🌙 Dinner") for quick visual parsing —
// helpful for low-vision residents who pattern-match shapes faster than text.
const PERIOD_ACCENT: Record<string, { color: string; light: string; icon: string }> = {
  Breakfast: { color: '#C47A2A', light: '#FEF3C7', icon: 'sun' },
  Lunch:     { color: '#2D7A52', light: '#DCFCE7', icon: 'coffee' },
  Dinner:    { color: '#4F4FA8', light: '#EEF2FF', icon: 'moon' },
  Drinks:    { color: '#2A6FA8', light: '#E0F2FE', icon: 'droplet' },
  Sides:     { color: '#7A3A6A', light: '#FCE7F3', icon: 'grid' },
  'All Day': { color: '#717644', light: '#F0EFE6', icon: 'clock' },
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
  dinner:    { bg: '#22213A', titleColor: '#E8EAFF', subColor: '#8A8DB0', tabActiveBg: '#7A7DC8', tabActiveText: '#FFF', tabInactiveBg: 'rgba(200,205,240,0.1)', tabInactiveText: '#A8AACC', icon: '🌙', buttonBg: '#3A385A', buttonBorder: 'rgba(232,234,255,0.45)' },
  beverages: { bg: '#F5F9FC', titleColor: '#1A3040', subColor: '#4A6A80', tabActiveBg: '#4A7A9A', tabActiveText: '#FFF', tabInactiveBg: 'rgba(74,122,154,0.07)', tabInactiveText: '#3A607A', icon: '🥤', buttonBg: '#F2F7FA', buttonBorder: 'rgba(74,122,154,0.2)'  },
  desserts:  { bg: '#FCF7FA', titleColor: '#32142A', subColor: '#7A4A68', tabActiveBg: '#8A4A72', tabActiveText: '#FFF', tabInactiveBg: 'rgba(138,74,114,0.07)', tabInactiveText: '#6A3A58', icon: '🍰', buttonBg: '#FAF4F8', buttonBorder: 'rgba(138,74,114,0.2)'  },
  seasonal:  { bg: '#F6FAF6', titleColor: '#1A3020', subColor: '#4A6848', tabActiveBg: '#4A7850', tabActiveText: '#FFF', tabInactiveBg: 'rgba(74,120,80,0.07)',  tabInactiveText: '#3A5840', icon: '🌸', buttonBg: '#F4F9F4', buttonBorder: 'rgba(74,120,80,0.2)'   },
  softBite:  { bg: '#FBFAF6', titleColor: '#2F2418', subColor: '#705C42', tabActiveBg: '#8B6F47', tabActiveText: '#FFF', tabInactiveBg: 'rgba(139,111,71,0.08)', tabInactiveText: '#6B5638', icon: '🥣', buttonBg: '#FFFDF8', buttonBorder: 'rgba(139,111,71,0.22)' },
};

const PERIOD_KEYS: PeriodOption[] = [
  { key: "allDay", value: null },
  { key: "breakfast", value: "Breakfast" },
  { key: "lunch", value: "Lunch" },
  { key: "dinner", value: "Dinner" },
  { key: "beverages", value: "Drinks" },
  { key: "desserts", value: "Sides" },
  { key: "seasonal", value: null },
  { key: "softBite", value: null },
];

/**
 * Pick the tab the user should land on based on the device clock:
 *   - inside Breakfast / Lunch / Dinner window → that tab is open
 *   - between meals or after Dinner closes → "All Day" so the resident
 *     still sees something to order (and after 7 PM the All Day list
 *     includes tomorrow's Breakfast as a pre-order — see loadMenu).
 */
function getInitialPeriodFromClock(): PeriodOption {
  const current = getCurrentMealPeriod(new Date());
  if (current === 'Breakfast') return PERIOD_KEYS[1];
  if (current === 'Lunch')     return PERIOD_KEYS[2];
  if (current === 'Dinner')    return PERIOD_KEYS[3];
  return PERIOD_KEYS[0]; // All Day
}

// ---------- AI Chat Component ----------
const AIAssistantChat = ({
  visible,
  onClose,
  residentName,
  residentId,
  dietaryRestrictions = [],
  foodAllergies = [],
  medicalConditions = [],
  onMealTap,
}: {
  visible: boolean;
  onClose: () => void;
  residentName: string;
  residentId: string;
  dietaryRestrictions?: string[];
  foodAllergies?: string[];
  medicalConditions?: string[];
  onMealTap?: (meal: ServiceMeal) => void;
}) => {
  const { t, scaled, language, use24Hour } = useSettings();
    const [aiAvailable, setAiAvailable] = useState<boolean>(false);
  // Pick a menu question that matches the wall clock — inside a serving
  // window we ask about that period, between meals (or after dinner) we
  // ask about the next one coming up. Avoids "what's on the menu today"
  // when there's nothing left to order today. Uses translated strings
  // so the button matches the active language.
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
        const useWordBoundary = /[A-Za-z0-9]/.test(c);
        const re = useWordBoundary
          ? new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(c)})(?=$|[^\\p{L}\\p{N}])`, 'giu')
          : new RegExp(`(${escapeRegExp(c)})`, 'giu');
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
    if (!visible) return;
    let cancelled = false;
    MealService.getAllMeals()
      .then(meals => { if (!cancelled) setChatMeals(meals); })
      .catch(() => { if (!cancelled) setChatMeals([]); });
    return () => { cancelled = true; };
  }, [visible]);

  // Initialize Gemini chat session when modal opens
  useEffect(() => {
    if (!(visible && geminiChat.isConfigured())) return;
    let cancelled = false;
    const resident = ResidentService.getResidentById(residentId);
    // Pull the resident's usual-order list from the server so Granny BT
    // can personalise recommendations. Fail silent — the rest of the
    // prompt still works without it.
    (async () => {
      let favoriteMealIds: number[] = [];
      try {
        favoriteMealIds = await getDefaultMealsApi(residentId);
      } catch { /* no-op */ }
      if (cancelled) return;
      const override = !resident
        ? { name: residentName, dietaryRestrictions, foodAllergies, medicalConditions, favoriteMealIds }
        : undefined;
      // Optimistic: assume AI is available. Init only builds the
      // system prompt locally — real Gemini calls happen on send,
      // where the model fallback chain handles outages.
      setAiAvailable(true);
      geminiChat.initialize(residentId, language, override, favoriteMealIds)
        .catch((err) => console.warn('[Granny BT] init issue, continuing optimistically:', err?.message ?? err));
    })();
    return () => { cancelled = true; };
  }, [visible, residentId, language, residentName, dietaryRestrictions, foodAllergies, medicalConditions]);

  // Minimal fallback when ALL Gemini models are down
  const generateFallbackResponse = async (userMessage: string): Promise<string> => {
    const lower = userMessage.toLowerCase();
    const allServiceMeals = await MealService.getAllMeals();

    // Strip any meal that's restricted for this resident before we even
    // think about listing or recommending. Same source of truth the
    // regular menu uses, so chat output never lists a meal the resident
    // can't actually order.
    //
    // Look up the local resident fresh on every message so allergies
    // added through the UI (without re-navigating) are picked up
    // immediately. Falls back to props (route.params) for backend-only
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
    const safeAllMeals = allServiceMeals.filter((m) =>
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
    // only the relevant slice (matches Granny BT's time-aware behavior).
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
    const filteredMeals = periodFilter
      ? safeAllMeals.filter((m) => m.mealPeriod === periodFilter)
      : safeAllMeals;
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

    // "Place lunch order" / "Place an order" — pick a single safe meal
    // for the requested (or current) period and return it as a tappable
    // card. The user taps it to open the detail modal where the order
    // is confirmed.
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
        return `No safe ${translateMealPeriod(target, language).toLowerCase()} options for ${residentName} right now.`;
      }
      const pick = candidates[0];
      return `For ${translateMealPeriod(target, language).toLowerCase()}, I'd suggest:\n\n• **${translateMealName(pick.name, language)}** — ${pick.nutrition.calories} cal · ${pick.nutrition.sodium} ${t.sodium.toLowerCase()}\n\nTap the meal to place the order.`;
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
      // two never disagree on what's safe to show.
      const topMeals = (safeAllMeals.length > 0 ? safeAllMeals : allServiceMeals).slice(0, 3);
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
          if (parseInt(String(m.nutrition.sodium)) <= 400) reasons.push(translateMealTag('Low Sodium', language));
          if (parseInt(String(m.nutrition.protein)) >= 20) reasons.push(translateMealTag('High Protein', language));
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
          // Successful send → we're clearly online. Reset any stale
          // offline state from a prior transient failure.
          setAiAvailable(true);
        } catch (apiError) {
          // A single send failure is usually a quota/cooldown blip.
          // Don't flip the badge to "Offline" — Granny's self-heal +
          // model fallback chain will pick up the next send. We only
          // visually mark offline if BUILD-TIME isConfigured() returns
          // false (no API key at all), which is handled in the else
          // branch below.
          console.warn('Gemini send failed, falling back to local response (badge stays online):', apiError);
          responseText = await generateFallbackResponse(userMessage.content);
          responseText = injectMealBold(responseText);
        }
      } else {
        // No API key configured — genuinely offline.
        setAiAvailable(false);
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
            // Same self-heal as handleSend — don't flip badge offline
            // for transient send failures. isConfigured() is the source
            // of truth for the AI/Offline pill.
            console.warn('Gemini quick-question failed, falling back locally:', apiError);
            responseText = await generateFallbackResponse(question);
          }
        } else {
          setAiAvailable(false);
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
                <Text style={[chatStyles.headerTitle, { fontSize: scaled(19) }]}>{t.grannyBT}</Text>
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
                    nutritionLabels={{ sodium: t.sodium.toLowerCase(), protein: t.protein.toLowerCase() }}
                    allMeals={chatMeals}
                    onMealTap={message.role === 'assistant' ? onMealTap : undefined}
                  />
                  <Text style={[
                    chatStyles.timestamp,
                    { fontSize: scaled(10) },
                    message.role === 'user' && chatStyles.userTimestamp,
                  ]}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !use24Hour })}
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
/**
 * Parse "11am", "2:30 pm", "11:30AM", "noon", "midnight" etc. into minutes
 * past midnight. Returns NaN when the string has no recognizable time so
 * callers can fall back to "always available" (better than silently saying
 * a meal is closed because of an unparseable time string).
 */
function parseTimeToMinutes(s: string): number {
  const cleaned = s.trim().toLowerCase().replace(/\s/g, '');
  if (!cleaned) return NaN;
  if (cleaned === 'noon')     return 12 * 60;
  if (cleaned === 'midnight') return 0;
  const isPm = cleaned.includes('pm');
  const isAm = cleaned.includes('am');
  // Match "11", "11:30", "2:00" — capture hours and (optional) minutes
  // *separately* so "11:30am" doesn't get mashed into the int 1130.
  const m = cleaned.match(/^(\d{1,2})(?::(\d{2}))?/);
  if (!m) return NaN;
  let hours = parseInt(m[1], 10);
  const mins = m[2] ? parseInt(m[2], 10) : 0;
  if (isNaN(hours) || isNaN(mins)) return NaN;
  // Normalize to 24h: "12am" → 0, "12pm" → 12, "1pm" → 13, etc.
  if (isPm && hours !== 12) hours += 12;
  if (isAm && hours === 12) hours = 0;
  return hours * 60 + mins;
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
  // Fail-OPEN: if either bound can't be parsed, treat the meal as
  // always available rather than silently locking residents out.
  if (isNaN(start) || isNaN(end)) return true;
  return currentMins >= start && currentMins <= end;
}

/** Start minute of a time-range string, used for sorting */
function timeRangeStartMinutes(timeRange: string): number {
  if (!timeRange) return 0;
  const normalized = timeRange.replace(/[–—]/g, '-');
  const first = normalized.split('-')[0]?.trim() ?? '';
  const parsed = parseTimeToMinutes(first);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Sort meals into three tiers: available now → pre-order for tomorrow →
 * unavailable. Within each tier, sort by serving-window start time.
 * This keeps the breakfast pre-order block together and below any
 * genuinely-available-right-now meals at night.
 */
function sortMealsByAvailability(meals: Meal[], now: Date = new Date()): Meal[] {
  const tierFor = (m: Meal): number => {
    const s = getAvailabilityStatus(m.time_range, m.meal_period, now);
    if (s === 'available') return 0;
    if (s === 'preorder_tomorrow') return 1;
    return 2;
  };
  return [...meals].sort((a, b) => {
    const ta = tierFor(a);
    const tb = tierFor(b);
    if (ta !== tb) return ta - tb;
    return timeRangeStartMinutes(a.time_range) - timeRangeStartMinutes(b.time_range);
  });
}

// ---------- Meal Schedule (iPad device time) ----------
const MEAL_SCHEDULE = [
  { label: 'Breakfast', start: 7 * 60, end: 10 * 60, color: '#D97706', icon: '☀️' },
  { label: 'Lunch',     start: 11 * 60, end: 14 * 60, color: '#4A7A60', icon: '🍽️' },
  { label: 'Dinner',    start: 16 * 60, end: 19 * 60, color: '#5C5FA8', icon: '🌙' },
];

// After 7 PM the breakfast menu opens for PRE-ORDER so residents can set up
// tomorrow morning's tray before bed. Everything in the UI around this window
// must SHOUT "for tomorrow" — residents have confused breakfast-at-night with
// "breakfast is open now". The banner copy and disabled lunch/dinner are how
// we keep that distinction obvious.
/** Format a minute-of-day (0–1439) as a 12-hour clock label, e.g. 420 → "7:00 AM". */
function formatMinOfDay(mins: number): string {
  const m = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
}

const BREAKFAST_PREORDER_START = 19 * 60; // 7:00 PM

/** True from 7:00 PM through midnight on the device clock. */
function isBreakfastPreorderTime(now: Date = new Date()): boolean {
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= BREAKFAST_PREORDER_START;
}

/** Pretty string for the breakfast serving window, used in banner copy. */
const BREAKFAST_WINDOW_LABEL = '7:00 AM – 10:00 AM';

export type MealAvailabilityStatus = 'available' | 'preorder_tomorrow' | 'unavailable';

/** End minute of a time-range string, used to decide today-vs-tomorrow. */
function timeRangeEndMinutes(timeRange: string): number {
  if (!timeRange) return NaN;
  const normalized = timeRange.replace(/[–—]/g, '-');
  const parts = normalized.split('-').map((p) => p.trim());
  if (parts.length < 2) return NaN;
  const end = parseTimeToMinutes(parts[1]);
  return isNaN(end) ? NaN : end;
}

/**
 * Three-state availability — ordering is now flexible (a resident can
 * order ANY meal at ANY time), so this no longer locks anything out; it
 * only tells the UI whether ordering *now* means today or tomorrow:
 *  - available           → served now, or still upcoming later today
 *  - preorder_tomorrow   → this period's window already ended today, so
 *                          ordering now schedules it for tomorrow
 *  - unavailable         → (legacy) effectively unused for time reasons
 *
 * Generalised from the old breakfast-only 7 PM rule to ALL periods so the
 * "for today / for tomorrow" banner reads correctly around dinner time too.
 */
function getAvailabilityStatus(
  timeRange: string,
  period: string | undefined,
  now: Date = new Date(),
): MealAvailabilityStatus {
  if (period === 'Drinks' || period === 'Sides') return 'available';
  if (isWithinTimeRange(timeRange, period, now)) return 'available';
  const endMins = timeRangeEndMinutes(timeRange);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  // Window already finished for today → it's a pre-order for tomorrow.
  if (!isNaN(endMins) && nowMins > endMins) return 'preorder_tomorrow';
  // Window is still ahead of us today → orderable, served later today.
  return 'available';
}

/**
 * Banner plan for the meal-detail sheet. Returns null when the meal is
 * being served right now (or is an all-day drink/side) — in that case no
 * "today / tomorrow" clarification is needed. Otherwise it tells the
 * resident, in plain words, which day this order lands on.
 */
function getServingPlan(
  timeRange: string,
  period: string | undefined,
  now: Date = new Date(),
): { day: 'today' | 'tomorrow'; window: string } | null {
  if (period === 'Drinks' || period === 'Sides') return null;
  if (isWithinTimeRange(timeRange, period, now)) return null;
  const window = (timeRange || '').replace(/[–—]/g, '-').trim();
  const endMins = timeRangeEndMinutes(timeRange);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const isTomorrow = !isNaN(endMins) && nowMins > endMins;
  return { day: isTomorrow ? 'tomorrow' : 'today', window };
}

function getCurrentMealPeriod(now: Date = new Date()): string | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  const found = MEAL_SCHEDULE.find((s) => mins >= s.start && mins <= s.end);
  return found ? found.label : null;
}

/**
 * Returns the current-or-next meal period and how many minutes until it starts/ends.
 * If we're inside a meal period, returns that period with minsRemaining.
 * Otherwise returns the next upcoming one with minsUntil.
 */
function getNextMealPeriod(now: Date = new Date()): { period: typeof MEAL_SCHEDULE[0]; minsUntil: number; isNow: boolean } | null {
  const mins = now.getHours() * 60 + now.getMinutes();
  // Check if we're currently inside a meal period
  const current = MEAL_SCHEDULE.find((s) => mins >= s.start && mins < s.end);
  if (current) return { period: current, minsUntil: current.end - mins, isNow: true };
  // Otherwise next upcoming
  const next = MEAL_SCHEDULE.find((s) => s.start > mins);
  if (next) return { period: next, minsUntil: next.start - mins, isNow: false };
  // After dinner — wrap to tomorrow's breakfast
  const breakfast = MEAL_SCHEDULE[0];
  return { period: breakfast, minsUntil: 24 * 60 - mins + breakfast.start, isNow: false };
}

function formatMinsUntil(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const cleanProfileList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/[,;]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const buildSafetyProfileFromParams = (params: any): SafetyResident => ({
  foodAllergies:       cleanProfileList(params?.foodAllergies),
  dietaryRestrictions: cleanProfileList(params?.dietaryRestrictions),
  medicalConditions:   cleanProfileList(params?.medicalConditions),
});

const hasProfileParamKey = (params: any, key: string): boolean =>
  Boolean(params) && Object.prototype.hasOwnProperty.call(params, key);

const buildSafetyProfileFromLocalResident = (
  resident: Resident | null | undefined,
): SafetyResident | null => {
  if (!resident?.dietaryRestrictions) return null;
  return {
    foodAllergies: resident.dietaryRestrictions
      .filter((rule) => rule.type === 'allergy')
      .map((rule) => rule.name),
    dietaryRestrictions: resident.dietaryRestrictions
      .filter((rule) => rule.type !== 'allergy' && rule.type !== 'medical')
      .map((rule) => rule.name),
    medicalConditions: resident.dietaryRestrictions
      .filter((rule) => rule.type === 'medical')
      .map((rule) => rule.name),
  };
};

const EMPTY_SAFETY_PROFILE: SafetyResident = {
  foodAllergies: [],
  dietaryRestrictions: [],
  medicalConditions: [],
};

const mergeSafetyProfile = (
  params: any,
  fallback: SafetyResident | null | undefined,
): SafetyResident => {
  const routeProfile = buildSafetyProfileFromParams(params);
  const base = fallback ?? EMPTY_SAFETY_PROFILE;
  // UNION the lists from both sources rather than picking one. The
  // bug: when a parent screen forwarded `foodAllergies: []` through
  // route params, the previous "route wins if key present" logic
  // overrode the local resident record (which DID have the allergy),
  // and the auto-suggest filter would happily recommend a dairy meal
  // for a dairy-allergic resident. Unioning means as long as either
  // side knows about the allergy, we treat the meal as unsafe.
  const dedupe = (a: string[] = [], b: string[] = []): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of [...a, ...b]) {
      const norm = String(v ?? '').trim().toLowerCase();
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      out.push(String(v).trim());
    }
    return out;
  };
  return {
    foodAllergies:        dedupe(routeProfile.foodAllergies,        base.foodAllergies),
    dietaryRestrictions:  dedupe(routeProfile.dietaryRestrictions,  base.dietaryRestrictions),
    medicalConditions:    dedupe(routeProfile.medicalConditions,    base.medicalConditions),
  };
};

const normalizeSafetyToken = (value: string): string => value.toLowerCase().trim();

const getMealSugarG = (meal: Meal): number | null => {
  const raw = (meal as any).sugar_g ?? (meal as any).sugarG ?? (meal as any).sugar;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const parsed = parseInt(raw.replace(/[^\d]/g, ''), 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
};

function autoOrderMedicalFitScore(meal: Meal, profile: SafetyResident): number {
  const conditions = [
    ...(profile.medicalConditions ?? []),
    ...(profile.dietaryRestrictions ?? []),
  ].map(normalizeSafetyToken);
  const has = (needle: string) => conditions.some((condition) => condition.includes(needle));
  let score = 0;

  if (
    has('hypertension') ||
    has('high blood pressure') ||
    has('heart disease') ||
    has('kidney disease') ||
    has('low sodium') ||
    has('low-sodium')
  ) {
    score += Math.max(0, 600 - (meal.sodium_mg ?? 0));
  }

  if (has('diabetes') || has('diabetic')) {
    const sugar = getMealSugarG(meal);
    if (sugar != null) score += Math.max(0, 25 - sugar) * 12;
  }

  score += Math.min(meal.protein_g ?? 0, 40);
  return score;
}

function pickAutoOrderMeal(
  candidates: Meal[],
  frequency: Map<string, number>,
  profile: SafetyResident,
): Meal | null {
  const safeCandidates = candidates
    .filter((meal) => meal.isAvailable !== false)
    // Exclude bundle-only meals — they don't exist on the backend,
    // so placing them would result in the order coming back missing
    // those items. Better to suggest something the backend can
    // actually persist.
    .filter((meal) => !(meal as any)._local)
    .filter((meal) => isMealSafe(meal as any, profile));

  safeCandidates.sort((a, b) => {
    const historyDelta =
      (frequency.get(b.name.toLowerCase()) ?? 0) -
      (frequency.get(a.name.toLowerCase()) ?? 0);
    if (historyDelta !== 0) return historyDelta;

    const medicalDelta =
      autoOrderMedicalFitScore(b, profile) -
      autoOrderMedicalFitScore(a, profile);
    if (medicalDelta !== 0) return medicalDelta;

    return a.name.localeCompare(b.name);
  });

  return safeCandidates[0] ?? null;
}

const orderDateKey = (value: unknown): string | null => {
  if (!value) return null;
  // Use LOCAL date — otherwise an order placed at 6:30 PM PDT shows up
  // as the NEXT day's key and "do they have an order today?" lookups
  // miss it.
  if (value instanceof Date) return toLocalISODate(value);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : toLocalISODate(parsed);
};

function hasOrderForPeriodOnDate(ordersForResident: any[], period: string, dateKey: string): boolean {
  return ordersForResident.some((order) => {
    const date = orderDateKey(order?.date ?? order?.placedAt);
    if (date !== dateKey) return false;
    if (String(order?.mealOfDay ?? '') === period) return true;
    return (order?.items ?? []).some((item: any) => item?.meal_period === period);
  });
}

function buildPendingAutoOrder(
  suggestion: {
    period: string;
    meal: Meal;
    drink?: Meal;
    dessert?: Meal;
    minsUntil?: number;
    isNow?: boolean;
    forTomorrow?: boolean;
    windowLabel?: string;
  },
): PendingAuto {
  return {
    period: suggestion.period,
    items: [suggestion.meal, suggestion.drink, suggestion.dessert].filter(Boolean) as Meal[],
    minsUntil: suggestion.minsUntil ?? 0,
    isNow: suggestion.isNow ?? false,
    forTomorrow: suggestion.forTomorrow ?? false,
    windowLabel: suggestion.windowLabel ?? '',
  };
}

/**
 * Image with graceful fallback chain:
 *   remote URL → bundled require() → caller-supplied final fallback
 * Falls back automatically when the remote URL 404s. Used in the meal
 * card grid, detail modal, and chat rich cards so we never show an
 * empty coloured rectangle when a Wikipedia/Pexels link goes stale.
 */
const MealCardImage: React.FC<{
  remoteUri: string | null;
  localImg: any | null;
  imgStyle: any;
  /** Rendered if both remote and bundled images are missing/failed.
   *  Defaults to the grandma sentinel image. */
  finalFallback?: React.ReactNode;
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
  if (finalFallback !== undefined) return <>{finalFallback}</>;
  return (
    <Image
      source={require('../styles/pictures/grandma.png')}
      style={{ width: 60, height: 60, opacity: 0.3 }}
      resizeMode="contain"
    />
  );
};

// ---------- Main Component ----------
const BrowseMealOptionsScreen = ({ navigation, route }: any) => {
  const { t, scaled, language, getTouchTargetSize, theme, setCurrentResidentId, use24Hour } = useSettings();
  const touchTarget = getTouchTargetSize();
  // --- all hooks at the top, unconditionally, in fixed order ---
  const { currentTime } = useClock();
  const { addToCart, clearCart, getCartCount, orders, getOrdersForResident, fetchOrderHistory, placeOrder } = useCart();

  // Default tab follows the tablet clock: during a serving window the
  // resident lands directly on Breakfast / Lunch / Dinner; between meals
  // or after the kitchen closes they land on "All Day" (which includes
  // tomorrow-breakfast pre-order after 7 PM — see loadMenu below).
  // If the caller passed an `initialPeriod` route param (e.g. the
  // Upcoming Meals "Order Breakfast" card), honor it instead of the
  // clock-based default so the resident lands on the matching tab.
  const initialPeriodFromRoute: PeriodOption | null = (() => {
    const requested = route?.params?.initialPeriod;
    if (!requested) return null;
    const match = PERIOD_KEYS.find(
      (p) =>
        p.key.toLowerCase() === String(requested).toLowerCase()
        || p.value?.toLowerCase() === String(requested).toLowerCase(),
    );
    return match ?? null;
  })();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(
    initialPeriodFromRoute ?? getInitialPeriodFromClock(),
  );
  // True when the user has tapped a tab themselves; suppresses clock-driven auto-advance.
  // Pre-seed it when the route forced a period so the focus effect doesn't
  // immediately overwrite it back to "current meal of day".
  const userPickedRef = useRef<boolean>(!!initialPeriodFromRoute);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [_rawServiceMeals, setRawServiceMeals] = useState<ServiceMeal[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [showMealDetail, setShowMealDetail] = useState(false);
  const [specialNote, setSpecialNote] = useState('');
  const [recPeriodMeals, setRecPeriodMeals] = useState<Meal[]>([]); // meals for the recommended period
  const [availableDrinks, setAvailableDrinks] = useState<Meal[]>([]);
  const [selectedDrink, setSelectedDrink] = useState<Meal | null>(null);
  const [availableSides, setAvailableSides] = useState<Meal[]>([]);
  const [selectedSide, setSelectedSide] = useState<Meal | null>(null);
  const [menuLoading, setMenuLoading] = useState<boolean>(true);
  const [recLoading, setRecLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showBrowseSupport, setShowBrowseSupport] = useState(false);
  const [openHelpSection, setOpenHelpSection] = useState<string | null>(null);
  const [autoSuggest, setAutoSuggest] = useState<{ period: string; minsUntil: number; isNow: boolean; meal: Meal; drink?: Meal; dessert?: Meal } | null>(null);
  const [autoOrderMeals, setAutoOrderMeals] = useState<Meal[]>([]);
  const [autoSuggestDismissed, setAutoSuggestDismissed] = useState(false);
  // Tracks whether the resident manually placed via the auto-suggest banner —
  // used to suppress the banner re-rendering after they've placed once this
  // period (since `autoSuggestDismissed` already does this, this is mostly
  // legacy but harmless to keep for the manual Place Order button below).
  const [, setAutoPlaced] = useState(false);
  // Pending auto-order surfaced as a notification bell (top-right of header)
  // for the resident to approve or deny directly.
  const [pendingAutoOrder, setPendingAutoOrder] = useState<PendingAuto | null>(null);
  // Same shape, but one entry per non-ordered meal period (B / L / D).
  // Powers the horizontal swipe in the big auto-order modal so a
  // caregiver/resident can flip between today's remaining suggestions
  // without closing and reopening the bell.
  const [allPendingAutoOrders, setAllPendingAutoOrders] = useState<PendingAuto[]>([]);
  const [autoOrderSlideIdx, setAutoOrderSlideIdx] = useState(0);
  // Default to an approximate width so the very first paint of the
  // FlatList has non-zero slide width; onLayout corrects it within a
  // frame to match the actual modal inner width.
  const [autoOrderSlideWidth, setAutoOrderSlideWidth] = useState(
    Math.min(Dimensions.get('window').width - 48, 672),
  );
  const autoOrderListRef = useRef<FlatList<any>>(null);
  const [showAutoOrderPanel, setShowAutoOrderPanel] = useState(false);
  // True only while an on-demand auto-order suggestion is being built (the
  // resident tapped the suggest button). Drives the spinner on that button.
  const [autoOrderLoading, setAutoOrderLoading] = useState(false);
  // Detail sheet — scroll ref + note input position for keyboard avoidance
  const detailScrollRef = useRef<ScrollView>(null);
  const [noteInputY, setNoteInputY] = useState(0);
  // Session-level recommendation cache: period → recommendation result.
  // Prevents calling Gemini on every tab switch for the same meal period.
  // Keyed by "<residentId>:<targetPeriod>" so switching residents busts the cache.
  const recCacheRef = useRef<Map<string, any>>(new Map());
  // Guards the auto-suggest AI calls. Tracks the last composite key used
  // to trigger Gemini: "<residentId>:<currentPeriodKey>:<safetyProfileKey>".
  // When that key is unchanged the effect skips the AI and lets the
  // history-based fallback handle the pick — no extra quota burned on
  // a mere Breakfast→Lunch tab switch.
  const autoSuggestAIKeyRef = useRef<string>("");

  // Re-pick the correct tab every time the screen comes into focus
  // (handles the case where the screen stayed mounted in the
  // background while time passed). If the caller asked for a
  // specific period via route param, honor that instead of the clock.
  useFocusEffect(
    useCallback(() => {
      if (initialPeriodFromRoute) {
        userPickedRef.current = true;
        setSelectedPeriod(initialPeriodFromRoute);
        return;
      }
      userPickedRef.current = false;
      setSelectedPeriod(getInitialPeriodFromClock());
    // We deliberately re-evaluate this every focus so a fresh
    // navigation with a new `initialPeriod` jumps to the new tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route?.params?.initialPeriod]),
  );

  // ── Refresh resident profile on focus ──────────────────────────
  // Pulls the latest restrictions from the backend so admin edits
  // (new allergy, condition, etc.) flow through to the auto-suggest
  // and AI without requiring the user to log out and back in. Stores
  // them back into navigation params so all the existing read sites
  // (route?.params?.foodAllergies etc.) pick up the new values.
  useFocusEffect(
    useCallback(() => {
      // Read residentId directly from params — this hook runs before
      // the local `residentId` const is declared further down.
      const ridFromParams = (route?.params as any)?.residentId as string | undefined;
      if (!ridFromParams) return;
      let cancelled = false;
      (async () => {
        try {
          const fresh = await getResidentById(ridFromParams);
          if (cancelled || !fresh) return;
          // Only update if something actually changed to avoid pointless re-renders
          const current = {
            dietary: cleanProfileList((route?.params as any)?.dietaryRestrictions),
            allergies: cleanProfileList((route?.params as any)?.foodAllergies),
            medical: cleanProfileList((route?.params as any)?.medicalConditions),
          };
          const incoming = {
            dietary: cleanProfileList(fresh.dietaryRestrictions),
            allergies: cleanProfileList(fresh.foodAllergies),
            medical: cleanProfileList(fresh.medicalConditions),
          };
          const eq = (a: string[], b: string[]) =>
            a.length === b.length && a.every((v, i) => v === b[i]);
          if (
            eq(current.dietary, incoming.dietary) &&
            eq(current.allergies, incoming.allergies) &&
            eq(current.medical, incoming.medical)
          ) {
            return;
          }
          navigation.setParams({
            dietaryRestrictions: incoming.dietary,
            foodAllergies:       incoming.allergies,
            medicalConditions:   incoming.medical,
          } as any);
          // Reset auto-suggest gate so the bell can re-evaluate against
          // the new restrictions (e.g. a previously-suggested meal that
          // is now flagged should be re-checked).
          setAutoSuggestDismissed(false);
          setAutoSuggest(null);
          setPendingAutoOrder(null);
          setShowAutoOrderPanel(false);
        } catch { /* network blip — keep stale params */ }
      })();
      return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [(route?.params as any)?.residentId, navigation]),
  );

  // Auto-advance the tab when a new meal period starts while the screen is open,
  // but only if the user hasn't manually chosen a different tab this visit.
  useEffect(() => {
    if (userPickedRef.current) return;
    setSelectedPeriod(getInitialPeriodFromClock());
  }, [currentTime.getHours()]);

  // derived (not hooks)
  const pt = PERIOD_THEMES[selectedPeriod.key] ?? PERIOD_THEMES.allDay;
  const activePeriod = getCurrentMealPeriod(currentTime);

  // Activate this resident's settings when screen mounts
  useEffect(() => {
    const rid = route?.params?.residentId;
    if (rid) setCurrentResidentId(String(rid));
  }, [route?.params?.residentId, setCurrentResidentId]);

  // Get resident name from route params or use localDataService
  const residentId = route?.params?.residentId as string | undefined;
  const localResidentRecord = residentId ? ResidentService.getResidentById(residentId) : null;
  const residentName =
    localResidentRecord?.fullName ||
    route?.params?.residentName ||
    ResidentService.getDefaultResident().fullName;
  const residentSafetyProfile = mergeSafetyProfile(
    route?.params,
    buildSafetyProfileFromLocalResident(localResidentRecord),
  );
  const residentSafetyProfileKey = JSON.stringify(residentSafetyProfile);

  useEffect(() => {
    setAutoSuggest(null);
    setPendingAutoOrder(null);
    setShowAutoOrderPanel(false);
    setAutoSuggestDismissed(false);
  }, [residentId]);

  // Navigate to cart screen with resident context. Pass the active tab's
  // meal period so drinks/sides-only orders land under the right meal —
  // CartContext.deriveMealOfDay can't distinguish "I'm pre-ordering for
  // breakfast" from "it's noon and I want a coffee" without this hint.
  // 'allDay' means no specific tab → CartContext falls back to the clock.
  const goToCart = () => {
    const tabPeriod = selectedPeriod?.key === 'allDay' ? undefined : selectedPeriod?.value;
    navigation.navigate('Cart', {
      residentId,
      residentName,
      dietaryRestrictions: route?.params?.dietaryRestrictions ?? [],
      mealPeriod: tabPeriod,
    });
  };

  // Caregiver chat
  const [caregiverId,   setCaregiverId]   = useState<string | null>(route?.params?.caregiverId   as string | null ?? null);
  const [caregiverName, setCaregiverName] = useState<string | null>(route?.params?.caregiverName as string | null ?? null);
  const [assignedCaregivers, setAssignedCaregivers] = useState<Array<{ caregiverId: string; caregiverName: string }>>([]);
  const [sendingCgMsg, setSendingCgMsg] = useState(false);

  // Persist caregiver info to storage when provided via params; load from storage as fallback
  useEffect(() => {
    if (!residentId) return;
    const paramCgId       = route?.params?.caregiverId       as string | null ?? null;
    const paramCgName     = route?.params?.caregiverName     as string | null ?? null;
    const paramAllCaregivers = route?.params?.assignedCaregivers as Array<{ caregiverId: string; caregiverName: string }> | undefined;

    if (paramAllCaregivers && paramAllCaregivers.length > 0) {
      // Admin passed the full array directly — use it immediately (no storage timing issue)
      setAssignedCaregivers(paramAllCaregivers);
      setCaregiverId(paramAllCaregivers[0].caregiverId);
      setCaregiverName(paramAllCaregivers[0].caregiverName);
      // Persist so future navigations without params still work
      setResidentCaregivers(residentId, paramAllCaregivers);
    } else if (paramCgId && paramCgName) {
      setCaregiverId(paramCgId);
      setCaregiverName(paramCgName);
      setResidentCaregiver(residentId, paramCgId, paramCgName);
      // Load the FULL stored array; only append param caregiver if missing
      getResidentCaregivers(residentId).then((stored) => {
        const alreadyIn = stored.some((c) => c.caregiverId === paramCgId);
        const updated   = alreadyIn
          ? stored
          : [...stored, { caregiverId: paramCgId, caregiverName: paramCgName }];
        setAssignedCaregivers(updated.length > 0 ? updated : [{ caregiverId: paramCgId, caregiverName: paramCgName }]);
      });
    } else {
      // No params — try plural storage first, then singular storage
      getResidentCaregivers(residentId).then((stored) => {
        if (stored.length > 0) {
          setAssignedCaregivers(stored);
          setCaregiverId(stored[0].caregiverId);
          setCaregiverName(stored[0].caregiverName);
        } else {
          getResidentCaregiver(residentId).then((single) => {
            if (single) {
              setCaregiverId(single.caregiverId);
              setCaregiverName(single.caregiverName);
              setAssignedCaregivers([single]);
            }
          });
        }
      });
    }
  }, [residentId, route?.params?.caregiverId, route?.params?.caregiverName, route?.params?.assignedCaregivers]);

  // Navigate to settings with resident context
  const goToSettings = () => {
    navigation.navigate('Settings', {
      residentId,
      residentName,
      dietaryRestrictions: route?.params?.dietaryRestrictions ?? [],
      foodAllergies: route?.params?.foodAllergies ?? [],
      caregiverId:        route?.params?.caregiverId        ?? null,
      caregiverName:      route?.params?.caregiverName      ?? null,
      assignedCaregivers: assignedCaregivers.length > 0 ? assignedCaregivers : undefined,
    });
  };

  const HELP_SECTIONS = [
  { id: 'placeOrder',    icon: 'shopping-cart',  title: t.howToPlaceOrder,    description: t.howToPlaceOrderDesc,    video: require('../styles/videos/place-order-walkthrough.mp4') },
  { id: 'upcomingMeals', icon: 'calendar',       title: t.howToCheckUpcoming, description: t.howToCheckUpcomingDesc, video: require('../styles/videos/upcoming-walkthrough.mp4') },
  { id: 'cancelMeal',    icon: 'x-circle',       title: t.howToCancelMeal,    description: t.howToCancelMealDesc,    video: require('../styles/videos/delete-walkthrough.mp4') },
  { id: 'grannyBT',      icon: 'message-circle', title: t.howToUseGrannyBT,   description: t.howToUseGrannyBTDesc,   video: require('../styles/videos/ai-walkthrough.mp4') },
];

  const loadAutoOrderCandidates = useCallback(async () => {
    try {
      const periodMealSets = await Promise.all(
        MEAL_SCHEDULE.map(async (period) => {
          const serviceMeals = await MealService.getMealsByPeriod(period.label as any);
          return serviceMeals
            .filter((meal) => meal.mealPeriod !== "Drinks" && meal.mealPeriod !== "Sides")
            .map((serviceMeal) => {
              const mapped = mapServiceMeal(serviceMeal);
              return {
                ...mapped,
                meal_period:
                  serviceMeal.mealPeriod === "All Day"
                    ? (period.label as Meal["meal_period"])
                    : mapped.meal_period,
              };
            });
        }),
      );

      const byMealAndPeriod = new Map<string, Meal>();
      periodMealSets.flat().forEach((meal) => {
        byMealAndPeriod.set(`${meal.id}:${meal.meal_period}`, meal);
      });
      setAutoOrderMeals(Array.from(byMealAndPeriod.values()));
    } catch (e) {
      console.warn("Failed to load auto-order candidates:", e);
    }
  }, []);

  // Fetch meals from API (async)
  const loadMenu = useCallback(async (period: PeriodOption["value"], periodKey?: string) => {
    setMenuLoading(true);
    setError("");

    try {
      // Special tabs fetch by tag/flag; period tabs fetch by meal period.
      let serviceMeals = periodKey === 'seasonal'
        ? await MealService.getSeasonalMeals()
        : periodKey === 'softBite'
          ? await MealService.getMealsByTag('Soft Bite')
          : await MealService.getMealsByPeriod(period);

      // After-kitchen-close behaviour: when the resident lands on the
      // "All Day" tab past 7 PM (Breakfast pre-order window), pull in
      // Breakfast meals too so they can pre-order tomorrow's tray
      // without flipping tabs. Each meal's own time-range still drives
      // the "Pre-order tomorrow" pill; we just expand the candidate set.
      if (periodKey === 'allDay' && isBreakfastPreorderTime(currentTime)) {
        try {
          const breakfastMeals = await MealService.getMealsByPeriod('Breakfast');
          // De-dupe by id (in case the backend already tags some breakfast
          // meals with mealperiod="All Day").
          const seenIds = new Set(serviceMeals.map((m) => m.id));
          for (const bm of breakfastMeals) {
            if (!seenIds.has(bm.id)) serviceMeals.push(bm);
          }
        } catch (e) {
          console.warn('Failed to merge breakfast pre-order into All Day:', e);
        }
      }

      // Filter out meals that are unsafe for this resident — SAME safety source
      // of truth that drives the cart gate and Granny BT recommendation.
      // Works for both local and backend residents by building a SafetyResident.
      const resId = residentId || ResidentService.getDefaultResident().id;
      const resident = ResidentService.getResidentById(resId);

      // Do not display the restricted meals
      // Build resident safety profile
      const safetyResident = mergeSafetyProfile(
        route?.params,
        buildSafetyProfileFromLocalResident(resident),
      );

      // Only keep SAFE meals for this resident
      const safeServiceMeals = serviceMeals.filter((meal) =>
        isMealSafe(
          {
            id: meal.id,
            name: meal.name,
            description: meal.description,
            tags: meal.tags,
            allergenInfo: meal.allergenInfo,
            ingredients: meal.ingredients,
            sodium: meal.nutrition?.sodium,
            sugar: meal.nutrition?.sugar,
            meal_period: meal.mealPeriod,
          },
          safetyResident,
        ),
      );

      // mapServiceMeal imported from mealDisplayService.ts
      const mapped: Meal[] = safeServiceMeals.map(mapServiceMeal);

      // Pre-load drinks and sides for the add-on pickers in meal detail modal
      const drinkServiceMeals = await MealService.getMealsByPeriod("Drinks");
      setAvailableDrinks(drinkServiceMeals.map(mapServiceMeal));
      const sidesServiceMeals = await MealService.getMealsByPeriod("Sides");
      setAvailableSides(sidesServiceMeals.map(mapServiceMeal));

      //Display safe meals only
      setRawServiceMeals(safeServiceMeals);
      setMeals(mapped);
      setMenuLoading(false);

      // Translate any API/kitchen meals not in the static lookup table.
      // We translate names and descriptions in parallel so residents who
      // switch languages see the whole card in their language, not just
      // the title.
      const unknownNames = Array.from(new Set(
        mapped.map(m => m.name).filter(n => !hasMealNameTranslation(n))
      ));
      const unknownDescriptions = Array.from(new Set(
        mapped
          .map(m => m.description)
          .filter((d): d is string => !!d && !hasMealDescriptionTranslation(d))
      ));

      const jobs: Promise<void>[] = [];
      if (unknownNames.length > 0) {
        jobs.push(
          translateMealNamesWithGemini(unknownNames).then(results => {
            if (Object.keys(results).length > 0) setCachedMealTranslations(results);
          }),
        );
      }
      if (unknownDescriptions.length > 0) {
        jobs.push(
          translateMealDescriptionsWithGemini(unknownDescriptions).then(results => {
            if (Object.keys(results).length > 0) setCachedDescriptionTranslations(results);
          }),
        );
      }
      if (jobs.length > 0) {
        Promise.all(jobs).then(() => {
          // Trigger a re-render with a fresh reference so translated text shows
          setMeals(prev => [...prev]);
        });
      }
    } catch {
      setError("Failed to load meals");
      setMenuLoading(false);
    }
  }, [residentId]);

  // Fetch recommendation — targets the CURRENT meal period if we're in one,
  // otherwise the next upcoming period so the suggestion is always actionable.
  //
  // Pipeline (same for local AND backend residents):
  //   1. Pull meals for the current/next meal period.
  //   2. Run them through the canonical safety filter (mealSafetyService).
  //   3. Ask Gemini to pick ONE from the safe candidates (AI recommendation).
  //   4. Fall back to the legacy rule-based picker if Gemini is unreachable
  //      OR hallucinates a meal not in the candidate list.
  const loadRecommendation = useCallback(async () => {
    setRecLoading(true);
    setError("");

    try {
      const resId = residentId || ResidentService.getDefaultResident().id;
      const localResident = ResidentService.getResidentById(resId);

      // Prefer current period (meal is available right now); fall back to next
      const currentPeriod = getCurrentMealPeriod(new Date());
      const nextPeriod    = getNextMealPeriod(new Date());
      const targetPeriod  = currentPeriod ?? nextPeriod?.period.label ?? selectedPeriod.value;

      // ── Step 1: pull meals for the target period ──
      const periodMeals = await MealService.getMealsByPeriod(targetPeriod as any);
      setRecPeriodMeals(periodMeals.map(mapServiceMeal));

      // ── Step 2: build a SafetyResident (unified shape for both paths) ──
      // Route params win when present because they are refreshed from the
      // backend on focus; local data fills gaps for bundled residents.
      const residentName = localResident?.fullName ?? route?.params?.residentName ?? 'Resident';
      const safetyResident = mergeSafetyProfile(
        route?.params,
        buildSafetyProfileFromLocalResident(localResident),
      );

      // Browse list shows ALL meals (with red restriction badges), but the AI
      // recommendation picks from SAFE meals only — never suggest something
      // unsafe even though it's visible in the list.
      const safetyInputs = periodMeals.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        tags: m.tags,
        allergenInfo: m.allergenInfo,
        ingredients: m.ingredients,
        sodium: m.nutrition?.sodium,
        sugar: m.nutrition?.sugar,
        meal_period: m.mealPeriod,
      }));
      const safeIds = new Set(
        safetyInputs
          .filter((sm) => isMealSafe(sm, safetyResident))
          .map((sm) => String(sm.id)),
      );
      const safeMeals = periodMeals.filter((m) => safeIds.has(String(m.id)));

      // No options at all — give the UI a clear "nothing available" state.
      if (safeMeals.length === 0) {
        setRecommendation(null);
        setRecLoading(false);
        return;
      }

      // ── Step 4: ask Gemini to pick ONE from the safe candidates ──
      // Check session cache first — avoids re-calling Gemini when the user
      // just taps back to a tab they already visited this session.
      const cacheKey = `${residentId ?? 'default'}:${targetPeriod}`;
      const cached = recCacheRef.current.get(cacheKey);
      if (cached !== undefined) {
        setRecommendation(cached ? { ...cached, targetPeriod: targetPeriod ?? undefined } : null);
        setRecLoading(false);
        return;
      }

      const aiCandidates = safeMeals.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        ingredients: m.ingredients,
        allergens: m.allergenInfo,
        calories: m.nutrition?.calories,
        sodium: m.nutrition?.sodium,
        protein: m.nutrition?.protein,
        tags: m.tags,
        meal_period: m.mealPeriod,
        time_range: m.timeRange,
      }));

      const aiRec = await getAIRecommendation(
        {
          name: residentName,
          foodAllergies: safetyResident.foodAllergies,
          dietaryRestrictions: safetyResident.dietaryRestrictions,
          medicalConditions: safetyResident.medicalConditions,
        },
        aiCandidates,
        targetPeriod ?? null,
      );

      let rec: any;
      if (aiRec) {
        rec = aiRec;
      } else {
        // ── Step 5: fallback — legacy rule-based picker on SAFE meals only ──
        // Reuses RecommendationService so the card still renders something
        // sensible when Gemini is offline or quota-exhausted.
        if (localResident) {
          rec = await RecommendationService.getTopRecommendation(resId, targetPeriod as any);
        } else {
          const virtualResident: Resident = {
            id: resId,
            firstName: residentName.split(' ')[0],
            lastName: '',
            fullName: residentName,
            email: '',
            phone: '',
            roomNumber: '',
            role: 'resident',
            dietaryRestrictions: [
              ...safetyResident.foodAllergies!.map((name) => ({
                type: 'allergy' as const,
                name,
                severity: 'moderate' as const,
              })),
              ...safetyResident.dietaryRestrictions!.map((name) => ({
                type: 'preference' as const,
                name,
                severity: 'moderate' as const,
              })),
            ],
            nutritionGoals: { dailyCalories: 1800, maxSodium: 2000, minProtein: 45, maxCholesterol: 250, maxSugar: 40 },
            dislikedIngredients: [],
            favoriteMealIds: [],
            isActive: true,
          };
          rec = await RecommendationService.getTopRecommendationForResident(virtualResident, targetPeriod as any);
        }
      }

      if (rec) {
        const recName = String(rec.meal_name ?? '').trim().toLowerCase();
        const inSafeSet = safeMeals.some((meal) => meal.name.trim().toLowerCase() === recName);
        if (!inSafeSet) rec = null;
      }

      // Final guard: if both Gemini and the rule-based fallback came up empty
      // but we DO have safe meals, pick the first one so the card isn't dead.
      // Ensures "No recommendation available" only shows when there's truly
      // nothing on the menu for this period.
      if (!rec && safeMeals.length > 0) {
        const top = safeMeals[0];
        rec = {
          meal_name: top.name,
          reason: `A safe option from today's ${targetPeriod?.toLowerCase() ?? 'menu'} — we recommend the`,
          dietary_restrictions: [
            ...(safetyResident.foodAllergies ?? []),
            ...(safetyResident.dietaryRestrictions ?? []),
          ],
        };
      }

      // Store in session cache so repeat tab visits skip Gemini
      recCacheRef.current.set(cacheKey, rec ?? null);
      setRecommendation(rec ? { ...rec, targetPeriod: targetPeriod ?? undefined } : null);
      setRecLoading(false);
    } catch (err) {
      console.warn('loadRecommendation failed:', err);
      setRecommendation(null);
      setRecLoading(false);
    }
  }, [residentId, selectedPeriod.value, route?.params]);

  // Pre-load drinks, sides, and backend order history once on mount.
  // Each .then sets state, which causes a React warning + memory hold
  // if the screen unmounts before the promise resolves. With this
  // screen being re-entered repeatedly during ordering flows, the
  // orphaned setStates were the most likely contributor to the
  // "slows down with more navigation" memory leak.
  useEffect(() => {
    let cancelled = false;
    loadAutoOrderCandidates();
    MealService.getMealsByPeriod("Drinks")
      .then(d => { if (!cancelled) setAvailableDrinks(d.map(mapServiceMeal)); })
      .catch(() => {});
    MealService.getMealsByPeriod("Sides")
      .then(s => { if (!cancelled) setAvailableSides(s.map(mapServiceMeal)); })
      .catch(() => {});
    if (residentId) fetchOrderHistory(residentId);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the menu grid when the component mounts or the period changes.
  // NOTE: the AI recommendation is intentionally NOT loaded here — it now
  // runs only when the resident taps "Recommend a meal" on the bottom card,
  // so switching tabs / re-entering the screen never burns Gemini quota.
  useEffect(() => {
    loadMenu(selectedPeriod.value, selectedPeriod.key);
  }, [selectedPeriod, loadMenu]);

  // Derived value that ONLY changes when the resident crosses a meal-
  // period boundary (e.g. 10am→11am brings them out of breakfast and
  // into lunch). The clock provider ticks every 60s, but most ticks
  // don't change the period, so this memo returns the same string and
  // any effect using it as a dep does NOT re-run. This is the lever
  // we use to stop the AI auto-suggest from firing every minute and
  // burning the Gemini quota.
  const currentPeriodKey = useMemo(() => {
    const mins = currentTime.getHours() * 60 + currentTime.getMinutes();
    for (let i = 0; i < MEAL_SCHEDULE.length; i++) {
      const p = MEAL_SCHEDULE[i];
      if (mins < p.end) return `${i}:${p.label}`;
    }
    return `wrap:${MEAL_SCHEDULE[0].label}`;
  }, [currentTime]);

  // Auto-suggest next upcoming meal — AI-driven, past-order-aware, safety-failsafed.
  //
  // Pick flow per period:
  //   1. Hard-filter candidates with isMealSafe(profile)  ← failsafe layer 1
  //      (AI literally cannot see allergens-conflicting meals)
  //   2. Sort by past-order frequency so AI sees "what they usually pick" first
  //   3. Ask AI to pick — adapts to live profile (allergies, dietary, medical)
  //   4. Re-check isMealSafe on AI's chosen meal              ← failsafe layer 2
  //      (defense in depth: profile mutation mid-call, stale cache, etc)
  //   5. If AI returns null OR unsafe-on-recheck, fall back to history
  //      score (also safety-filtered) so the user still sees SOMETHING.
  //
  // No matter how many times the resident's profile changes, the AI gets a
  // fresh-safety-filtered list every time the safety profile key changes
  // (key is in the deps array → effect re-runs → candidates rebuilt).
  // On-demand auto-order suggestion builder. Runs ONLY when the resident
  // taps the suggest button — never on mount, tab switch, or the per-minute
  // clock tick — so Gemini quota is spent strictly on explicit user intent.
  // Returns the built suggestions (and also stores them in state for the
  // panel + bottom banner to render).
  const generateAutoOrderSuggestions = useCallback(async (): Promise<PendingAuto[]> => {
    const candidateMeals = autoOrderMeals.length > 0 ? autoOrderMeals : meals;
    if (candidateMeals.length === 0) return [];

    const resOrders = residentId ? getOrdersForResident(residentId) : orders;
    const today = todayLocalISO(); // local YYYY-MM-DD, not UTC

    const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const startIdx = (() => {
      // Current period if we're inside one, otherwise the next one.
      for (let i = 0; i < MEAL_SCHEDULE.length; i++) {
        const s = MEAL_SCHEDULE[i];
        if (nowMins < s.end) return i;
      }
      // After dinner — wrap to tomorrow's breakfast.
      return 0;
    })();

    const allPastItems = resOrders.flatMap((o) => o.items);

    // Use the centralised safety service so the auto-suggest filter
    // matches what the menu cards and cart gate show. This is a hard
    // filter: the bell should never recommend a meal that conflicts with
    // allergies or medical conditions.
    const isSafeForResident = (m: Meal): boolean =>
      isMealSafe(m as any, residentSafetyProfile);

    // Helper: count frequency of each item name in history for a given period
    const getFrequencyRanked = (period: string): Map<string, number> => {
      const freq = new Map<string, number>();
      for (const item of allPastItems) {
        if (item.meal_period === period) {
          const key = item.name.toLowerCase();
          freq.set(key, (freq.get(key) ?? 0) + 1);
        }
      }
      return freq;
    };

    // Resident profile for AI — pulls live allergies/dietary/medical from
    // the SAME merged safety profile our isMealSafe() filter uses. This
    // guarantees AI sees the EXACT constraints we enforce — no drift
    // between "what AI considers" and "what we'd reject as unsafe".
    const aiResident = {
      name: residentName,
      foodAllergies: residentSafetyProfile.foodAllergies ?? [],
      dietaryRestrictions: residentSafetyProfile.dietaryRestrictions ?? [],
      medicalConditions: residentSafetyProfile.medicalConditions ?? [],
    };

    // Convert a Meal → the trimmed shape Gemini expects.
    const toAICandidate = (m: Meal) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      ingredients: (m as any).ingredients,
      allergens: (m as any).allergens,
      calories: m.kcal,
      sodium: m.sodium_mg,
      protein: m.protein_g,
      tags: m.tags,
      meal_period: m.meal_period,
      time_range: m.time_range,
    });

    // Pick the main meal for a period, with AI in the lead and a
    // history-based fallback. Both paths go through isMealSafe — there
    // is no path where an unsafe meal can win.
    const pickMainMeal = async (periodLabel: string, mealFreq: Map<string, number>): Promise<Meal | null> => {
      // Step 1 — safety filter (FAILSAFE LAYER 1)
      const safe = candidateMeals
        .filter((m) => m.meal_period === periodLabel)
        .filter((m) => m.isAvailable !== false)
        .filter((m) => !(m as any)._local)
        .filter(isSafeForResident);
      if (safe.length === 0) return null;

      // Step 2 — sort by past-order frequency so AI sees usual favourites first
      const historyRanked = [...safe].sort(
        (a, b) =>
          (mealFreq.get(b.name.toLowerCase()) ?? 0) -
          (mealFreq.get(a.name.toLowerCase()) ?? 0),
      );

      // Step 3 — ask the AI (returns null if Gemini unreachable / over-quota).
      try {
        const aiPick = await getAIRecommendation(
          aiResident,
          historyRanked.map(toAICandidate),
          periodLabel,
        );
        if (aiPick?.meal_name) {
          const picked = historyRanked.find(
            (m) => m.name.toLowerCase() === aiPick.meal_name.toLowerCase(),
          );
          // Step 4 — re-verify safety on AI's actual returned meal (FAILSAFE LAYER 2)
          if (picked && isSafeForResident(picked)) {
            return picked;
          }
        }
      } catch {
        /* swallow — fall through to history pick */
      }

      // Step 5 — history-based fallback (safety-filtered internally)
      return pickAutoOrderMeal(safe, mealFreq, residentSafetyProfile);
    };

    // Build a suggestion for any given meal period. Returns null when
    // there isn't a safe main dish for that period.
    const buildSuggestionFor = async (slot: { period: typeof MEAL_SCHEDULE[0]; minsUntil: number; isNow: boolean; forTomorrow: boolean }) => {
      const periodLabel = slot.period.label;
      const mealFreq = getFrequencyRanked(periodLabel);
      const mainMeal = await pickMainMeal(periodLabel, mealFreq);
      if (!mainMeal) return null;
      // Drinks/sides stay history-driven — they're low-stakes and we want
      // to spare the AI quota for the main meal (which is the one whose
      // pick actually changes a resident's day).
      const suggestDrink = pickAutoOrderMeal(
        availableDrinks.filter(isSafeForResident),
        getFrequencyRanked('Drinks'),
        residentSafetyProfile,
      ) ?? undefined;
      const suggestDessert = pickAutoOrderMeal(
        availableSides.filter(isSafeForResident),
        getFrequencyRanked('Sides'),
        residentSafetyProfile,
      ) ?? undefined;
      return {
        period: periodLabel,
        minsUntil: slot.minsUntil,
        isNow: slot.isNow,
        forTomorrow: slot.forTomorrow,
        windowLabel: `${formatMinOfDay(slot.period.start)} – ${formatMinOfDay(slot.period.end)}`,
        meal: mainMeal,
        drink: suggestDrink,
        dessert: suggestDessert,
      };
    };

    // Walk Breakfast → Lunch → Dinner starting from the current/next
    // period. Skip any with an existing order. Build a suggestion for
    // every remaining period — the modal shows them all as swipeable
    // slides, while the bottom auto-suggest panel keeps using the
    // closest-in-time one.
    const slots: { period: typeof MEAL_SCHEDULE[0]; minsUntil: number; isNow: boolean; forTomorrow: boolean }[] = [];
    for (let offset = 0; offset < MEAL_SCHEDULE.length; offset++) {
      const idx = (startIdx + offset) % MEAL_SCHEDULE.length;
      const period = MEAL_SCHEDULE[idx];
      if (hasOrderForPeriodOnDate(resOrders, period.label, today)) continue;
      const isNow = nowMins >= period.start && nowMins < period.end;
      const minsUntil = isNow
        ? period.end - nowMins
        : (period.start > nowMins
            ? period.start - nowMins
            : 24 * 60 - nowMins + period.start);
      // The window has already started/passed today (and we're not inside it),
      // so the next time this meal is served is tomorrow.
      const forTomorrow = !isNow && period.start <= nowMins;
      slots.push({ period, minsUntil, isNow, forTomorrow });
    }

    // AI service caches per (resident + period + candidate IDs), so tapping
    // the suggest button again within the cache window re-uses the picks
    // instead of making fresh Gemini calls.
    const built = await Promise.all(slots.map(buildSuggestionFor));
    const allSuggestions = built.filter((s): s is NonNullable<typeof s> => s !== null);

    if (allSuggestions.length === 0) {
      setAutoSuggest(null);
      setPendingAutoOrder(null);
      setAllPendingAutoOrders([]);
      return [];
    }
    const closest = allSuggestions[0]!;
    setAutoSuggest(closest);
    const list = allSuggestions.map((s) => buildPendingAutoOrder(s as any));
    if (residentId) {
      setPendingAutoOrder(list[0] ?? null);
      setAllPendingAutoOrders(list);
    }
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals, autoOrderMeals, orders, residentId, getOrdersForResident, availableDrinks, availableSides, residentSafetyProfile, residentSafetyProfileKey, currentTime, residentName]);

  // Tap handler for the header suggest button: build a fresh suggestion on
  // demand, then open the panel. Resets the per-session "dismissed" flag so
  // a previously dismissed suggestion can be re-requested explicitly.
  const handleRequestAutoOrder = useCallback(async () => {
    if (autoOrderLoading) return;
    setAutoSuggestDismissed(false);
    setAutoOrderLoading(true);
    try {
      const list = await generateAutoOrderSuggestions();
      if (list.length > 0) {
        setAutoOrderSlideIdx(0);
        setShowAutoOrderPanel(true);
      } else {
        Alert.alert(
          t.suggestedAutoOrder,
          t.noRecommendation,
        );
      }
    } finally {
      setAutoOrderLoading(false);
    }
  }, [autoOrderLoading, generateAutoOrderSuggestions, t.suggestedAutoOrder, t.noRecommendation]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMenu(selectedPeriod.value, selectedPeriod.key);
    await loadAutoOrderCandidates();
    await loadRecommendation();
    setRefreshing(false);
  }, [selectedPeriod.value, selectedPeriod.key, loadMenu, loadAutoOrderCandidates, loadRecommendation]);

  // Open meal detail modal
  const openMealDetail = (meal: Meal) => {
    setSelectedMeal(meal);
    setSpecialNote('');
    setSelectedDrink(null);
    setSelectedSide(null);
    setShowMealDetail(true);
  };

  // ── Pending auto-order: resident confirm / deny handlers ─────────
  // Confirm places the order through the same cart + placeOrder pipeline
  // used everywhere else. Deny dismisses this suggestion for the session.
  const handleApprovePendingAuto = async () => {
    if (!pendingAutoOrder) return;
    const { period, items } = pendingAutoOrder;
    const itemNames = items.map((i) => i.name).join(', ');
    const unsafe = items
      .map((item) => ({ item, reason: getMealUnsafeReason(item) }))
      .find((entry) => entry.reason);
    if (unsafe) {
      setAutoSuggest(null);
      setPendingAutoOrder(null);
      setShowAutoOrderPanel(false);
      Alert.alert(
        'Recommendation changed',
        `${unsafe.item.name} is no longer safe for this resident: ${unsafe.reason}. Please choose another meal or request an override.`,
      );
      return;
    }
    try {
      // Build items inline and hand them directly to placeOrder. We
      // deliberately do NOT call addToCart here — within a single
      // event handler React hasn't re-rendered yet, so placeOrder's
      // closure-captured `cart` would still be empty and we'd get a
      // false "Order Failed" while the cart updates land seconds
      // later (leaving phantom items visible in the cart).
      const orderItems = items.map((item) => ({
        id: Number(item.id),
        name: item.name,
        meal_period: item.meal_period as any,
        description: item.description,
        kcal: item.kcal,
        sodium_mg: item.sodium_mg,
        protein_g: item.protein_g,
        tags: item.tags,
      }));
      clearCart();
      const result = await placeOrder(residentId, period, orderItems as any);
      // Distinguish the two common no-order outcomes:
      //   - conflict      → resident already has an order for this period
      //   - complianceBlock → backend safety rule fired
      // both return order: null, but each deserves its own message.
      if (!result.order && result.conflict) {
        // Stale suggestion — the resident already ordered for this
        // period (probably via another path or in another tab). Clear
        // the bell so it re-evaluates against the fresh order list.
        setAutoSuggest(null);
        setPendingAutoOrder(null);
        setShowAutoOrderPanel(false);
        try { if (residentId) await fetchOrderHistory(residentId); } catch {}
        Alert.alert(
          'Already ordered',
          `There's already a ${period} order on file for today. Open Upcoming Meals to view or change it.`,
        );
        return;
      }
      if (!result.order && result.complianceBlock) {
        setAutoSuggest(null);
        setPendingAutoOrder(null);
        setShowAutoOrderPanel(false);
        const firstReason = (result.complianceBlock as any)?.violations?.[0]?.reason
          ?? 'A dietary rule blocked this meal.';
        Alert.alert('Restricted', firstReason);
        return;
      }
      if (result.order) {
        setAutoSuggestDismissed(true);
        setAutoSuggest(null);
        setPendingAutoOrder(null);
        setShowAutoOrderPanel(false);

        const rName = residentName || 'A resident';
        const rRoom = (route?.params as any)?.roomNumber || '';
        const msgBody = `Auto-order confirmed for ${rName}${rRoom ? ` (Room ${rRoom})` : ''} — ${period}: ${itemNames}.`;
        for (const cg of assignedCaregivers) {
          try { await sendApiMessage(cg.caregiverId, msgBody); } catch {}
        }
        Alert.alert('Order Placed', `${period}: ${itemNames}`, [{ text: 'OK' }]);
      } else {
        // Backend rejected — keep the bell visible so the resident can retry.
        Alert.alert('Order Failed', 'The order could not be placed. Please try again or order manually.');
      }
    } catch (e: any) {
      console.warn('[AutoOrder] placeOrder failed:', e?.message ?? e);
      Alert.alert('Order Failed', e?.message ?? 'Network error. Please try again.');
    }
  };

  const handleDenyPendingAuto = () => {
    // Dismiss the modal but keep the bell + pending suggestion alive
    // so the resident can reopen it later. The suggestion clears
    // automatically once the meal period ends or an order is placed.
    setShowAutoOrderPanel(false);
  };

  // Check if a meal conflicts with the resident's dietary profile
  // Resident safety profile pulled from the navigation params that the
  // login/home flow attaches. The centralised safety service consumes
  // these arrays directly — keeping logic out of this file.
  /** Centralised safety check — returns a human reason or null. */
  const getMealUnsafeReason = (meal: Meal | null | undefined): string | null => {
    if (!meal) return null;
    return getUnsafeReason(meal as any, residentSafetyProfile);
  };

  /**
   * Combined "why this add-on can't be picked" check for the drink/side
   * pickers. Returns a human-readable reason (or null if selectable).
   * Two independent gates, in priority order:
   *   1. Kitchen "hide" feature — isAvailable === false → unavailable today.
   *   2. Resident dietary/allergy conflict (via getMealUnsafeReason).
   * Both render the item RED + 🚫 and block selection at the source.
   */
  const getAddonBlockReason = (
    meal: (Meal & { isAvailable?: boolean }) | null | undefined,
  ): string | null => {
    if (!meal) return null;
    if ((meal as any).isAvailable === false) return "Unavailable — hidden by the kitchen";
    return getMealUnsafeReason(meal);
  };

  const addSuggestedItemToCart = (item: Meal): boolean => {
    const unsafeReason = getMealUnsafeReason(item);
    if (unsafeReason) {
      setAutoSuggest(null);
      setPendingAutoOrder(null);
      setShowAutoOrderPanel(false);
      Alert.alert(
        'Recommendation changed',
        `${item.name} is no longer safe for this resident: ${unsafeReason}. Please choose another meal or request an override.`,
      );
      return false;
    }

    addToCart({
      id: Number(item.id),
      name: item.name,
      meal_period: item.meal_period as any,
      description: item.description,
      kcal: item.kcal,
      sodium_mg: item.sodium_mg,
      protein_g: item.protein_g,
      tags: item.tags,
    });
    return true;
  };

  /**
   * Open a medical override request directly from the menu when the resident
   * (or their caregiver) believes a flagged meal should be allowed. Posts to
   * /overrides which surfaces in admin's Pending Overrides queue and on the
   * resident's "My Overrides" screen.
   */
  const requestOverrideForMeal = async (meal: Meal, reason: string) => {
    try {
      const ridNum = Number(residentId);
      const mealIdNum = Number(meal.id);
      if (isNaN(ridNum) || isNaN(mealIdNum)) {
        Alert.alert('Unable to request override', 'Resident or meal could not be identified.');
        return;
      }
      await createOverrideApi({
        residentId: ridNum,
        mealIds:    [mealIdNum],
        mealOfDay:  meal.meal_period,
        targetDate: todayLocalISO(),
        reason:     `Requested from menu — ${meal.name}: ${reason}`,
      });
      Alert.alert(
        'Override requested',
        `Your request for ${meal.name} has been sent to an administrator. You'll be able to order this meal once it's approved.`,
        [{ text: 'OK' }],
      );
    } catch (err: any) {
      console.warn('Failed to create override request from menu', err);
      if (err?.status === 403) {
        Alert.alert(
          'Not authorized',
          "You can only request overrides for residents you're assigned to. Ask an administrator for help.",
        );
      } else if (err?.status === 409) {
        Alert.alert(
          'Already requested',
          "There's already a pending override for this meal. An administrator will review it shortly.",
        );
      } else {
        Alert.alert('Could not request override', err?.message ?? 'Please try again.');
      }
    }
  };

  // Add meal (and optional drink/side) to cart from detail modal.
  // STRICT: if the resident's profile bans this meal, we refuse to add.
  // There is no "Order Anyway" escape hatch — the kitchen substitute
  // flow is the right tool for an intentional override.
  const handleAddToCartFromModal = () => {
    if (!selectedMeal) return;

    // Check the main meal AND any attached drink/side — all must be safe.
    const mainReason  = getMealUnsafeReason(selectedMeal);
    const drinkReason = getMealUnsafeReason(selectedDrink);
    const sideReason  = getMealUnsafeReason(selectedSide);
    const firstUnsafe =
      (mainReason  && { label: selectedMeal.name,  reason: mainReason })  ||
      (drinkReason && { label: selectedDrink!.name, reason: drinkReason }) ||
      (sideReason  && { label: selectedSide!.name,  reason: sideReason });

    if (firstUnsafe) {
      // Restricted — offer override request instead of hard-blocking
      Alert.alert(
        'Restricted meal',
        `${firstUnsafe.label} is flagged: ${firstUnsafe.reason}.\n\nYou can request a medical override and an administrator will review it. Once approved, the order will go through.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Request Override',
            onPress: () => {
              setShowMealDetail(false);
              requestOverrideForMeal(selectedMeal!, firstUnsafe.reason);
            },
          },
        ],
      );
      return;
    }

    // If this period's window has already passed today, this order is a
    // pre-order for tomorrow — prepend a clear "[FOR TOMORROW'S <PERIOD>]"
    // tag so the kitchen sorts it to the right tray run the next day.
    // Resident's typed note is kept verbatim after the tag.
    const isPreorderAdd = getAvailabilityStatus(
      selectedMeal.time_range,
      selectedMeal.meal_period,
      currentTime,
    ) === 'preorder_tomorrow';
    const trimmedNote = specialNote.trim();
    const periodTag = (selectedMeal.meal_period || 'MEAL').toUpperCase();
    const finalNote = isPreorderAdd
      ? `[FOR TOMORROW'S ${periodTag}]${trimmedNote ? ' ' + trimmedNote : ''}`
      : (trimmedNote || undefined);

    addToCart({ ...selectedMeal, id: parseInt(selectedMeal.id), specialNote: finalNote });
    if (selectedDrink) addToCart({ ...selectedDrink, id: parseInt(selectedDrink.id) });
    if (selectedSide)  addToCart({ ...selectedSide,  id: parseInt(selectedSide.id)  });
    setShowMealDetail(false);
  };

  // Render individual meal item for FlatList
  const renderMeal = ({ item }: { item: Meal }) => {
    const ph = getMealPlaceholder(item.name);
    // Backend imageUrl is the single source of truth. If empty, show the
    // grandma placeholder — no bundled-asset fallback per product call.
    const remoteUri = item.imageUrl && item.imageUrl.trim().length > 0
      ? item.imageUrl.trim()
      : null;
    // Fall back to a bundled image (keyed by name) when the backend hasn't
    // shipped a URL — covers the offline / fallback-data path where every
    // meal has imageUrl="".
    const localImg = remoteUri ? null : getMealImage(item.name);
    // Time windows are informational only — residents can order any
    // meal at any time. The time pill still shows below the title so
    // they know when it will be served, but it no longer blocks
    // ordering. The only hard gate left is the kitchen-disable toggle.
    const kitchenEnabled = item.isAvailable !== false;
    const status = getAvailabilityStatus(item.time_range, item.meal_period, currentTime);
    const isPreorder = status === 'preorder_tomorrow';
    const available = kitchenEnabled;
    const accent = PERIOD_ACCENT[item.meal_period] ?? PERIOD_ACCENT['All Day'];
    // Centralised safety gate — card is disabled & marked when the resident's
    // profile bans this meal (allergies / dietary / medical rules).
    const unsafeReason = getMealUnsafeReason(item);
    const isUnsafe = unsafeReason !== null;
    // Restricted meals are still tappable — tap opens the override request flow
    const canTap = available;
    // Build a one-line description for screen readers so the entire card
    // reads as a single coherent option instead of fragmented children.
    const a11yLabel = (() => {
      const parts: string[] = [item.name];
      if (isUnsafe) parts.push(`unsafe: ${unsafeReason}`);
      else if (!kitchenEnabled) parts.push("not available today");
      // Time windows no longer gate ordering, so we don't announce a
      // serving window in the label — anything kitchen-enabled is
      // orderable right now.
      return parts.join(", ");
    })();
    const a11yHint = isUnsafe
      ? "Tapping will offer to request a medical override"
      : available
        ? "Opens meal details"
        : undefined;
    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
          !available && styles.cardUnavailable,
          isUnsafe && styles.cardUnsafe,
        ]}
        activeOpacity={canTap ? 0.7 : 1}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint={a11yHint}
        accessibilityState={{ disabled: !available && !isUnsafe }}
        onPress={() => {
          if (!available) return;
          if (isUnsafe) {
            // Offer the medical-override path right from the menu so
            // residents/caregivers don't have to discover it via the cart.
            // Approved overrides surface in admin's Pending Overrides queue
            // and the resident's "My Overrides" list (poll every 15s).
            Alert.alert(
              'Not safe for this resident',
              `${item.name} is blocked: ${unsafeReason}.\n\nIf you believe this meal should be allowed, you can request a medical override. An administrator will review it.`,
              [
                { text: 'Choose another meal', style: 'cancel' },
                {
                  text: 'Request override',
                  onPress: () => requestOverrideForMeal(item, unsafeReason ?? 'Unknown'),
                },
              ],
            );
            return;
          }
          openMealDetail(item);
        }}
        disabled={!available}
      >
        {!available && (
          <View style={styles.unavailableOverlay}>
            <Feather name={kitchenEnabled ? "clock" : "slash"} size={15} color="#717644" />
            <Text style={[styles.unavailableText, { fontSize: scaled(14) }]}>
              {kitchenEnabled ? `${t.notAvailable} · ${translateMealTimeRange(item.time_range, language)}` : t.notAvailableToday}
            </Text>
          </View>
        )}
        {/* Pre-order chip removed — residents now order any meal at
            any time, so the late-evening "Tomorrow's Breakfast" badge
            no longer reflects a real distinction. */}
        {isUnsafe && available && (
          <View style={styles.unsafeChip}>
            <Feather name="alert-triangle" size={11} color="#FFFFFF" />
            <Text style={[styles.unsafeChipText, { fontSize: scaled(11) }]} numberOfLines={1}>
              {t.restricted}
            </Text>
          </View>
        )}
        <View style={[styles.mealImageContainer, { backgroundColor: ph.bg }]}>
          <MealCardImage
            remoteUri={remoteUri}
            localImg={localImg}
            imgStyle={styles.mealRealImage}
          />
          {/* Light frost over image for unavailable meals — image stays visible */}
          {!available && (
            <View style={styles.imageFrost} />
          )}
        </View>
        {/* Coloured left accent strip */}
        <View style={[styles.periodStrip, { backgroundColor: accent.color }]} />
        <View style={[styles.cardContent, { backgroundColor: theme.surface }]}>
          {/*
            Period pill ("Breakfast" / "Lunch" / "Dinner") — sits above the
            meal title as the section label. Sized for elderly eyes and
            honors the accessibility scale via scaled().
          */}
          <View style={[styles.periodPill, { backgroundColor: accent.light, borderColor: accent.color }]}>
            <Feather
              name={(PERIOD_ACCENT[item.meal_period]?.icon as any) ?? 'circle'}
              size={13}
              color={accent.color}
            />
            <Text style={[styles.periodPillText, { fontSize: scaled(14), color: accent.color }]}>
              {translateMealPeriod(item.meal_period, language)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[styles.cardTitle, { fontSize: scaled(20), color: theme.textPrimary }]}>
              {translateMealName(item.name, language)}
            </Text>
            {isUnsafe && (
              <View style={styles.restrictionBadge}>
                <Feather name="alert-triangle" size={11} color="#DC2626" />
                <Text style={[styles.restrictionBadgeText, { fontSize: scaled(11) }]}>{t.restricted}</Text>
              </View>
            )}
          </View>
          <View style={[styles.timeBadge, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}>
            <Text style={[styles.timeBadgeText, { fontSize: scaled(14), color: theme.accent }]}>
              {translateMealTimeRange(item.time_range, language)}
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
              {t.sodium}: {item.sodium_mg}mg
            </Text>
            <Text style={[styles.nutritionItem, { fontSize: scaled(13), color: theme.textSecondary }]}>
              {t.protein}: {item.protein_g}g
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
          style={[styles.backButton, { minHeight: touchTarget }]}
        >      
{/*        <TouchableOpacity
          onPress={() => {
            // Always log out — iPads stay in resident rooms, so back
            // means "end this session", never "return to admin".
            Alert.alert(
              'Log Out?',
              'This will end the current session. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Log Out',
                  style: 'destructive',
                },
              ],
            );
          }}
          style={[styles.backButton, { backgroundColor: pt.buttonBg, borderColor: pt.buttonBorder }]}
        > */}
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
            <Feather name="calendar" size={26} color={pt.titleColor} />
          </TouchableOpacity>
          {/* Auto-order suggestion button. Always available — tapping it is
              what triggers the AI pick (it no longer runs on load/tab switch).
              Shows a spinner while the suggestion is being built. */}
          <TouchableOpacity
            style={[
              styles.headerActionBtn,
              { backgroundColor: pt.buttonBg, borderColor: '#DC2626', borderWidth: 1.5 },
            ]}
            onPress={handleRequestAutoOrder}
            disabled={autoOrderLoading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t.suggestedAutoOrder}
          >
            {autoOrderLoading ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Feather name="zap" size={26} color="#DC2626" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: pt.buttonBg, borderColor: pt.buttonBorder, borderWidth: 1.5 }]}
            onPress={() => setShowBrowseSupport(true)}
            activeOpacity={0.85}
          >
            <Feather name="help-circle" size={26} color={pt.titleColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: pt.buttonBg, borderColor: pt.buttonBorder, borderWidth: 1.5 }]}
            onPress={goToSettings}
            activeOpacity={0.85}
          >
            <Feather name="settings" size={26} color={pt.titleColor} />
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
              onPress={() => { userPickedRef.current = true; setSelectedPeriod(period); }}
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

  const formatRecommendationLead = (reason: string, targetPeriod?: string): string => {
    const periodText = targetPeriod ? translateMealPeriod(targetPeriod, language) : t.meals.toLowerCase();
    const withPeriod = (template: string) => template.replace('{period}', periodText);
    const cleaned = (reason || '').trim();

    if (/^Only safe option in the current/i.test(cleaned)) {
      return withPeriod(t.recommendationOnlySafeOption);
    }
    if (/^A safe option from today's/i.test(cleaned)) {
      return withPeriod(t.recommendationSafeOptionToday);
    }
    if (/^A great fit for your profile/i.test(cleaned)) {
      return t.recommendationGreatFit;
    }

    // Legacy fallback reasons are generated in English. When the resident
    // language is not English, prefer a fully localized lead instead of a
    // mixed-language sentence around the translated meal name.
    return language === 'English' ? cleaned : t.recommendationGreatFit;
  };

  const formatAvailableAt = (timeText: string): string =>
    t.availableAt.replace('{time}', timeText);

  const listFooter = (
    <View style={styles.bottomCard}>
      {/* Grandma avatar */}
      <View style={styles.bottomCardAvatar}>
        <Image source={require('../styles/pictures/grandma.png')} style={{ width: 52, height: 52 }} resizeMode="contain" />
      </View>

      <View style={{ flex: 1, gap: 10 }}>
        {/* Recommendation row */}
        <View>
          <Text style={[styles.bottomCardLabel, { fontSize: scaled(13) }]}>
            {t.grannyBT} · {residentName}
          </Text>
          {recLoading ? (
            <ActivityIndicator color="#4A5C2A" size="small" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
          ) : recommendation ? (
            (() => {
              // Find the recommended meal — search the period-specific cache first,
              // then fall back to the currently displayed meals list
              const allSearchable = [...recPeriodMeals, ...meals];
              const recMeal = allSearchable.find(
                (m) => m.name === recommendation.meal_name || translateMealName(m.name, language) === recommendation.meal_name
              );
              // Use the target period's schedule for availability check
              const targetSched = recommendation.targetPeriod
                ? MEAL_SCHEDULE.find((s) => s.label === recommendation.targetPeriod)
                : recMeal
                  ? MEAL_SCHEDULE.find((s) => s.label === recMeal.meal_period)
                  : null;
              const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
              const isServing = targetSched
                ? nowMins >= targetSched.start && nowMins <= targetSched.end
                : true;
              const availableTimeText = targetSched
                ? recMeal?.time_range
                  ? translateMealTimeRange(recMeal.time_range, language)
                  : (() => {
                      // Convert minute-of-day → "7am" / "4pm" / "12pm".
                      // Previously the start hour was never 12h-converted, so
                      // Dinner (16-19) printed as "16am – 7pm".
                      const fmt = (totalMin: number): string => {
                        const h24 = Math.floor(totalMin / 60);
                        const m = totalMin % 60;
                        const period = h24 >= 12 ? 'pm' : 'am';
                        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
                        return m === 0
                          ? `${h12}${period}`
                          : `${h12}:${String(m).padStart(2, '0')}${period}`;
                      };
                      return `${fmt(targetSched.start)} – ${fmt(targetSched.end)}`;
                    })()
                : '';
              return (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => { if (recMeal) openMealDetail(recMeal); }}
                  style={styles.bottomCardRecRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bottomCardRecText, { fontSize: scaled(17), lineHeight: scaled(24) }]}>
                      {formatRecommendationLead(recommendation.reason, recommendation.targetPeriod)}{' '}
                      <Text style={styles.bottomCardMealName}>
                        {translateMealName(recommendation.meal_name, language)}
                      </Text>
                    </Text>
                    {isServing ? (
                      <Text style={[styles.bottomCardAvailBadge, { fontSize: scaled(13), color: '#4A7A60' }]}>
                        ✓ {t.availableNow}
                      </Text>
                    ) : targetSched ? (
                      <Text style={[styles.bottomCardAvailBadge, { fontSize: scaled(13) }]}>
                        {t.notServingNow} · {formatAvailableAt(availableTimeText)}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.bottomCardOrderBtn}>
                    <Feather name="plus" size={18} color="#FFF" />
                    <Text style={[styles.bottomCardOrderBtnText, { fontSize: scaled(17) }]}>{t.order}</Text>
                  </View>
                </TouchableOpacity>
              );
            })()
          ) : (
            // No recommendation loaded yet — show a button that fetches one on
            // demand (the AI no longer runs automatically on load/tab switch).
            <TouchableOpacity
              style={styles.bottomCardRecBtn}
              onPress={loadRecommendation}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t.recommendAMeal}
            >
              <Feather name="zap" size={18} color="#FFF" />
              <Text style={[styles.bottomCardRecBtnText, { fontSize: scaled(16) }]}>{t.recommendAMeal}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Auto-suggest rows — main meal + optional drink + dessert */}
        {autoSuggest && !autoSuggestDismissed && (
          <>
            <View style={styles.bottomCardDivider} />
            {/* Header row. No dismiss X here — the suggestion is
                meant to stay visible until the meal period ends or the
                resident actually places the order. The panel still
                auto-clears after a successful placeOrder upstream. */}
            <View style={styles.bottomCardSuggestHeader}>
              <Feather name="clock" size={16} color="#4A5C2A" />
              <Text style={[styles.bottomCardSuggestTitle, { fontSize: scaled(14) }]}>
                {autoSuggest.isNow
                  ? `Current meal: ${autoSuggest.period} — ${formatMinsUntil(autoSuggest.minsUntil)} left`
                  : `Next meal: ${autoSuggest.period} in ${formatMinsUntil(autoSuggest.minsUntil)}`}
                {' — safe pick from past orders'}
              </Text>
            </View>
            {/* Main meal row */}
            <View style={styles.bottomCardSuggestRow}>
              <Text style={[styles.bottomCardSuggestText, { fontSize: scaled(17), lineHeight: scaled(24), flex: 1 }]}>
                <Text style={styles.bottomCardSuggestLabel}>Meal: </Text>
                <Text style={styles.bottomCardMealName}>{translateMealName(autoSuggest.meal.name, language)}</Text>
              </Text>
              <TouchableOpacity
                style={styles.bottomCardSuggestConfirm}
                onPress={() => {
                  const m = autoSuggest.meal;
                  addSuggestedItemToCart(m);
                }}
              >
                <Text style={[styles.bottomCardSuggestConfirmText, { fontSize: scaled(16) }]}>Add</Text>
              </TouchableOpacity>
            </View>
            {/* Drink row */}
            {autoSuggest.drink && (
              <View style={styles.bottomCardSuggestRow}>
                <Text style={[styles.bottomCardSuggestText, { fontSize: scaled(17), lineHeight: scaled(24), flex: 1 }]}>
                  <Text style={styles.bottomCardSuggestLabel}>Drink: </Text>
                  <Text style={styles.bottomCardMealName}>{translateMealName(autoSuggest.drink.name, language)}</Text>
                </Text>
                <TouchableOpacity
                style={styles.bottomCardSuggestConfirm}
                onPress={() => {
                  const d = autoSuggest.drink!;
                    addSuggestedItemToCart(d);
                  }}
                >
                  <Text style={[styles.bottomCardSuggestConfirmText, { fontSize: scaled(16) }]}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Dessert row */}
            {autoSuggest.dessert && (
              <View style={styles.bottomCardSuggestRow}>
                <Text style={[styles.bottomCardSuggestText, { fontSize: scaled(17), lineHeight: scaled(24), flex: 1 }]}>
                  <Text style={styles.bottomCardSuggestLabel}>Side: </Text>
                  <Text style={styles.bottomCardMealName}>{translateMealName(autoSuggest.dessert.name, language)}</Text>
                </Text>
                <TouchableOpacity
                style={styles.bottomCardSuggestConfirm}
                onPress={() => {
                  const s = autoSuggest.dessert!;
                    addSuggestedItemToCart(s);
                  }}
                >
                  <Text style={[styles.bottomCardSuggestConfirmText, { fontSize: scaled(16) }]}>Add</Text>
                </TouchableOpacity>
              </View>
            )}
            {/* Place All button */}
            <TouchableOpacity
              style={styles.bottomCardPlaceAllBtn}
              onPress={async () => {
                if (!autoSuggest || !residentId) return;
                const items = [autoSuggest.meal, autoSuggest.drink, autoSuggest.dessert].filter(Boolean) as Meal[];
                const unsafe = items
                  .map((item) => ({ item, reason: getMealUnsafeReason(item) }))
                  .find((entry) => entry.reason);
                if (unsafe) {
                  setAutoSuggest(null);
                  setPendingAutoOrder(null);
                  setShowAutoOrderPanel(false);
                  Alert.alert(
                    'Recommendation changed',
                    `${unsafe.item.name} is no longer safe for this resident: ${unsafe.reason}. Please choose another meal or request an override.`,
                  );
                  return;
                }
                clearCart();
                for (const item of items) {
                  addToCart({ id: Number(item.id), name: item.name, meal_period: item.meal_period as any, description: item.description, kcal: item.kcal, sodium_mg: item.sodium_mg, protein_g: item.protein_g, tags: item.tags });
                }
                await new Promise<void>(r => setTimeout(r, 100));
                const result = await placeOrder(residentId, autoSuggest.period);
                if (result.order) {
                  setAutoPlaced(true);
                  setAutoSuggestDismissed(true);
                  setAutoSuggest(null);
                  // Notify caregiver
                  const rName = residentName || 'A resident';
                  const rRoom = route?.params?.roomNumber || '';
                  const itemNames = items.map(i => i.name).join(', ');
                  for (const cg of assignedCaregivers) {
                    try {
                      await sendApiMessage(cg.caregiverId,
                        `${rName}${rRoom ? ` (Room ${rRoom})` : ''} placed an order — ${autoSuggest.period}: ${itemNames}.`
                      );
                    } catch {}
                  }
                  Alert.alert(t.orderPlaced, `${autoSuggest.period}: ${itemNames}`);
                }
              }}
            >
              <Feather name="check-circle" size={20} color="#FFF" />
              <Text style={[styles.bottomCardPlaceAllText, { fontSize: scaled(18) }]}>{t.placeOrder}</Text>
            </TouchableOpacity>
            {/* Dismiss all */}
            <TouchableOpacity
              style={styles.bottomCardSuggestDismiss}
              onPress={() => { setAutoSuggestDismissed(true); setAutoSuggest(null); }}
            >
              <Text style={[styles.bottomCardSuggestDismissText, { fontSize: scaled(14) }]}>{t.dismissAll}</Text>
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
            <Text style={[styles.retryText, { fontSize: scaled(14) }]}>{t.retry}</Text>
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
          keyExtractor={(item) => `${item.id}-${item.name}`}
          renderItem={renderMeal}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { fontSize: scaled(15) }]}>{t.noMealsForPeriod}</Text>
          }
          refreshing={refreshing}
          onRefresh={onRefresh}
          // Memory-leak mitigations for the menu list — the dominant
          // image-heavy view in the app. Without these, every meal
          // image stays mounted forever after first render, accumulating
          // across the session as the user scrolls / re-enters the
          // screen many times.
          removeClippedSubviews={true}
          maxToRenderPerBatch={6}
          initialNumToRender={8}
          windowSize={5}
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
                <Text style={[styles.detailSheetLabel, { fontSize: scaled(15) }]}>{t.customizeOrder}</Text>
                <TouchableOpacity
                  style={styles.detailCloseButton}
                  onPress={() => setShowMealDetail(false)}
                  activeOpacity={0.8}
                >
                  <Feather name="x" size={20} color={COLORS.textMid} />
                </TouchableOpacity>
              </View>
              <ScrollView
                ref={detailScrollRef}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.detailScrollContent}
              >
            {selectedMeal && (() => {
              const ph = getMealPlaceholder(selectedMeal.name);
              // Backend imageUrl only — empty => grandma placeholder.
              const detailRemoteUri = selectedMeal.imageUrl && selectedMeal.imageUrl.trim().length > 0
                ? selectedMeal.imageUrl.trim()
                : null;
              const detailLocalImg = detailRemoteUri ? null : getMealImage(selectedMeal.name);
              // Flexible ordering: tell the resident which day this order
              // lands on. Null when the meal is being served right now.
              const servingPlan = getServingPlan(
                selectedMeal.time_range,
                selectedMeal.meal_period,
                currentTime,
              );
              const periodWord = (selectedMeal.meal_period || 'meal').toLowerCase();
              return (
                <>
                  {/* Image */}
                  <View style={[styles.detailImageWrap, { backgroundColor: ph.bg }]}>
                    <MealCardImage
                      remoteUri={detailRemoteUri}
                      localImg={detailLocalImg}
                      imgStyle={styles.detailRealImage}
                    />
                  </View>
                  {/* Info */}
                  <View style={styles.detailBody}>
                    {/*
                      Serving-day explainer — the first thing the resident
                      sees inside the detail sheet. Ordering is flexible
                      (any meal, any time), so this banner removes all doubt
                      about WHICH DAY the tray lands on. Amber = tomorrow,
                      green = later today. Hidden when the meal is being
                      served right now (no clarification needed).
                    */}
                    {servingPlan && (
                      <View style={[
                        styles.preorderBanner,
                        servingPlan.day === 'today' && styles.servingTodayBanner,
                      ]}>
                        <View style={[
                          styles.preorderBannerIconWrap,
                          servingPlan.day === 'today' && styles.servingTodayIconWrap,
                        ]}>
                          <Feather
                            name={servingPlan.day === 'tomorrow' ? 'sunrise' : 'clock'}
                            size={18}
                            color="#FFFFFF"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[
                            styles.preorderBannerTitle,
                            servingPlan.day === 'today' && styles.servingTodayTitle,
                            { fontSize: scaled(14) },
                          ]}>
                            {servingPlan.day === 'tomorrow'
                              ? `Pre-order for tomorrow`
                              : `Served later today`}
                          </Text>
                          <Text style={[
                            styles.preorderBannerBody,
                            servingPlan.day === 'today' && styles.servingTodayBody,
                            { fontSize: scaled(13) },
                          ]}>
                            {`This ${periodWord} will be served ${servingPlan.window} ${servingPlan.day}.`}
                          </Text>
                        </View>
                      </View>
                    )}
                    <Text style={[styles.detailTitle, { fontSize: scaled(22) }]}>{translateMealName(selectedMeal.name, language)}</Text>
                    <Text style={[styles.detailDesc, { fontSize: scaled(15) }]}>{translateMealDescription(selectedMeal.description, language)}</Text>
                    <View style={styles.detailNutrRow}>
                      <Text style={[styles.detailNutr, { fontSize: scaled(14) }]}>{selectedMeal.kcal} kcal</Text>
                      <Text style={[styles.detailNutr, { fontSize: scaled(14) }]}>{t.sodium}: {selectedMeal.sodium_mg}mg</Text>
                      <Text style={[styles.detailNutr, { fontSize: scaled(14) }]}>{t.protein}: {selectedMeal.protein_g}g</Text>
                    </View>

                    {/* Special Note */}
                    <View
                      onLayout={(e) => setNoteInputY(e.nativeEvent.layout.y)}
                    >
                      <Text style={[styles.detailSectionLabel, { fontSize: scaled(15) }]}>{t.specialNoteForKitchen}</Text>
                      <TextInput
                        style={styles.detailNoteInput}
                        placeholder={t.specialNotePlaceholder}
                        placeholderTextColor="#9CA3AF"
                        value={specialNote}
                        onChangeText={setSpecialNote}
                        multiline
                        maxLength={200}
                        onFocus={() => {
                          // Scroll so the note input sits comfortably above the keyboard.
                          // Delay slightly so the keyboard has started opening first.
                          setTimeout(() => {
                            detailScrollRef.current?.scrollTo({
                              y: Math.max(0, noteInputY - 80),
                              animated: true,
                            });
                          }, 150);
                        }}
                      />
                    </View>

                    {/* Add-on pickers: Drink & Side — horizontal row */}
                    {selectedMeal.meal_period !== 'Drinks' && selectedMeal.meal_period !== 'Sides' && (availableDrinks.length > 0 || availableSides.length > 0) && (
                      <>
                        <View style={styles.addonRow}>
                          {/* Drink picker */}
                          {availableDrinks.length > 0 && (
                            <View style={styles.addonCol}>
                              <Text style={[styles.detailSectionLabel, { fontSize: scaled(14) }]}>
                                {t.addADrink}
                              </Text>
                              <View style={styles.drinkPickerWrap}>
                                <Picker
                                  selectedValue={selectedDrink?.id ?? '__none__'}
                                  onValueChange={(val) => {
                                    if (val === '__none__') {
                                      setSelectedDrink(null);
                                      return;
                                    }
                                    const found = availableDrinks.find(d => d.id === val);
                                    if (!found) { setSelectedDrink(null); return; }
                                    // Block selection of restricted OR kitchen-hidden
                                    // drinks at the source rather than waiting until
                                    // the resident hits "Add to cart". The dropdown
                                    // also marks them 🚫 + red below — this is the
                                    // safety net.
                                    const reason = getAddonBlockReason(found);
                                    if (reason) {
                                      Alert.alert(
                                        'Unavailable drink',
                                        `${found.name}: ${reason}. Pick a different drink, or skip the drink.`,
                                      );
                                      setSelectedDrink(null);
                                      return;
                                    }
                                    setSelectedDrink(found);
                                  }}
                                  style={styles.drinkPicker}
                                  itemStyle={styles.drinkPickerItem}
                                >
                                  <Picker.Item label={t.noDrinkOption} value="__none__" />
                                  {availableDrinks.map(drink => {
                                    const reason = getAddonBlockReason(drink);
                                    const prefix = reason ? '🚫 ' : '';
                                    const suffix = reason ? '' : `  ·  ${drink.kcal} kcal`;
                                    return (
                                      <Picker.Item
                                        key={drink.id}
                                        label={`${prefix}${translateMealName(drink.name, language)}${suffix}`}
                                        value={drink.id}
                                        // Red label for restricted items. On Android
                                        // the stock picker honors this for both the
                                        // dropdown list and the collapsed selected
                                        // row, so the danger reads at a glance.
                                        color={reason ? '#C53030' : undefined}
                                      />
                                    );
                                  })}
                                </Picker>
                              </View>
                              {selectedDrink && (
                                <View style={styles.drinkSelectedRow}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={[styles.drinkSelectedName, { fontSize: scaled(13) }]}>
                                      {translateMealName(selectedDrink.name, language)}
                                    </Text>
                                    <Text style={[styles.drinkSelectedMeta, { fontSize: scaled(11) }]}>
                                      {selectedDrink.kcal} kcal · {selectedDrink.sodium_mg}mg {t.sodium}
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
                                {t.addASide}
                              </Text>
                              <View style={styles.drinkPickerWrap}>
                                <Picker
                                  selectedValue={selectedSide?.id ?? '__none__'}
                                  onValueChange={(val) => {
                                    if (val === '__none__') {
                                      setSelectedSide(null);
                                      return;
                                    }
                                    const found = availableSides.find(s => s.id === val);
                                    if (!found) { setSelectedSide(null); return; }
                                    const reason = getAddonBlockReason(found);
                                    if (reason) {
                                      Alert.alert(
                                        'Unavailable side',
                                        `${found.name}: ${reason}. Pick a different side, or skip the side.`,
                                      );
                                      setSelectedSide(null);
                                      return;
                                    }
                                    setSelectedSide(found);
                                  }}
                                  style={styles.drinkPicker}
                                  itemStyle={styles.drinkPickerItem}
                                >
                                  <Picker.Item label={t.noSideOption} value="__none__" />
                                  {availableSides.map(side => {
                                    const reason = getAddonBlockReason(side);
                                    const prefix = reason ? '🚫 ' : '';
                                    const suffix = reason ? '' : `  ·  ${side.kcal} kcal`;
                                    return (
                                      <Picker.Item
                                        key={side.id}
                                        label={`${prefix}${translateMealName(side.name, language)}${suffix}`}
                                        value={side.id}
                                        color={reason ? '#C53030' : undefined}
                                      />
                                    );
                                  })}
                                </Picker>
                              </View>
                              {selectedSide && (
                                <View style={styles.drinkSelectedRow}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={[styles.drinkSelectedName, { fontSize: scaled(13) }]}>
                                      {translateMealName(selectedSide.name, language)}
                                    </Text>
                                    <Text style={[styles.drinkSelectedMeta, { fontSize: scaled(11) }]}>
                                      {selectedSide.kcal} kcal · {selectedSide.sodium_mg}mg {t.sodium}
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
                {(() => {
                  const detailUnsafeReason = getMealUnsafeReason(selectedMeal);
                  if (detailUnsafeReason) {
                    return (
                      <>
                        <View style={styles.detailRestrictionBanner}>
                          <Feather name="alert-triangle" size={15} color="#DC2626" />
                          <Text style={[styles.detailRestrictionText, { fontSize: scaled(13) }]}>
                            {t.restricted}: {detailUnsafeReason}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.detailOverrideBtn}
                          onPress={handleAddToCartFromModal}
                          activeOpacity={0.85}
                        >
                          <Feather name="shield" size={16} color="#FFFFFF" />
                          <Text style={[styles.detailAddBtnText, { fontSize: scaled(16) }]}>
                            Request Override
                          </Text>
                        </TouchableOpacity>
                      </>
                    );
                  }
                  return (
                    <TouchableOpacity style={styles.detailAddBtn} onPress={handleAddToCartFromModal} activeOpacity={0.85}>
                      <Text style={[styles.detailAddBtnText, { fontSize: scaled(17) }]}>
                        {selectedDrink || selectedSide
                          ? `${t.addToCart} + ${[selectedDrink, selectedSide].filter(Boolean).map((m) => translateMealName((m as Meal).name, language)).join(' + ')}`
                          : t.addToCart}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}
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
        dietaryRestrictions={route?.params?.dietaryRestrictions ?? []}
        foodAllergies={route?.params?.foodAllergies ?? []}
        medicalConditions={route?.params?.medicalConditions ?? []}
        onMealTap={(serviceMeal) => {
          setShowAIChat(false);
          openMealDetail(mapServiceMeal(serviceMeal));
        }}
      />

      {/* Pending Auto-Order Panel — opens from the bell in the header */}
      <Modal
        visible={showAutoOrderPanel && !!pendingAutoOrder}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAutoOrderPanel(false)}
      >
        <View style={styles.autoOrderBackdrop}>
          <View style={styles.autoOrderCard}>
            {(() => {
              // Slides drive everything: title, items, place-order target.
              const slides = allPendingAutoOrders.length > 0
                ? allPendingAutoOrders
                : (pendingAutoOrder ? [pendingAutoOrder] : []);
              const activeIdx = Math.min(autoOrderSlideIdx, Math.max(0, slides.length - 1));
              const activeSlide = slides[activeIdx];
              return (
                <>
                  <View style={styles.autoOrderHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.autoOrderTitle, { fontSize: scaled(22) }]}>
                        {t.suggestedAutoOrder}
                      </Text>
                      <Text style={[styles.autoOrderSub, { fontSize: scaled(14) }]}>
                        {t.autoOrderConfirmSub.replace(
                          '{period}',
                          activeSlide?.period
                            ? translateMealPeriod(activeSlide.period, language).toLowerCase()
                            : '',
                        )}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowAutoOrderPanel(false)} hitSlop={10}>
                      <Feather name="x" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                  </View>

                  {/* Timing banner — makes it unmistakable whether this is for
                      the next few hours TODAY or for TOMORROW's tray. */}
                  {activeSlide && (() => {
                    const periodLower = translateMealPeriod(activeSlide.period, language).toLowerCase();
                    const headline = (activeSlide.forTomorrow ? t.autoOrderForTomorrow : t.autoOrderForToday)
                      .replace('{period}', periodLower);
                    const subline = activeSlide.isNow
                      ? t.autoOrderServingNow
                      : t.autoOrderServedWindow.replace('{window}', activeSlide.windowLabel);
                    const tomorrow = activeSlide.forTomorrow;
                    return (
                      <View
                        style={[
                          styles.autoOrderTimingBanner,
                          tomorrow ? styles.autoOrderTimingTomorrow : styles.autoOrderTimingToday,
                        ]}
                        accessibilityRole="text"
                        accessibilityLabel={`${headline}. ${subline}`}
                      >
                        <Feather
                          name={tomorrow ? 'sunrise' : 'clock'}
                          size={scaled(16)}
                          color={tomorrow ? '#5C5FA8' : '#B45309'}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[
                            styles.autoOrderTimingHeadline,
                            { fontSize: scaled(14), color: tomorrow ? '#3F3F8A' : '#92400E' },
                          ]}>
                            {headline}
                          </Text>
                          <Text style={[
                            styles.autoOrderTimingSub,
                            { fontSize: scaled(12), color: tomorrow ? '#5C5FA8' : '#B45309' },
                          ]}>
                            {subline}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Period tabs — also serve as swipe indicators. Tap
                      jumps the FlatList to that slide. */}
                  {slides.length > 1 && (
                    <View style={styles.autoOrderTabRow}>
                      {slides.map((s, i) => {
                        const active = i === activeIdx;
                        return (
                          <TouchableOpacity
                            key={`${s.period}-${i}`}
                            style={[styles.autoOrderTab, active && styles.autoOrderTabActive]}
                            onPress={() => {
                              setAutoOrderSlideIdx(i);
                              autoOrderListRef.current?.scrollToIndex({ index: i, animated: true });
                            }}
                          >
                            <Text style={[
                              styles.autoOrderTabText,
                              { fontSize: scaled(13) },
                              active && styles.autoOrderTabTextActive,
                            ]}>
                              {translateMealPeriod(s.period, language)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Horizontal swipeable slides — one per remaining period. */}
                  <View
                    onLayout={(e) => setAutoOrderSlideWidth(e.nativeEvent.layout.width)}
                    style={{ marginBottom: 8, flexShrink: 1 }}
                  >
                  <FlatList
                    ref={autoOrderListRef}
                    data={slides}
                    keyExtractor={(s, i) => `${s.period}-${i}`}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                      const w = e.nativeEvent.layoutMeasurement.width;
                      if (w > 0) {
                        const idx = Math.round(e.nativeEvent.contentOffset.x / w);
                        setAutoOrderSlideIdx(idx);
                      }
                    }}
                    renderItem={({ item: slide }: { item: PendingAuto }) => (
                      <View style={[styles.autoOrderSlide, { width: autoOrderSlideWidth || undefined }]}>
                        <ScrollView contentContainerStyle={{ paddingBottom: 4 }}>
                          {slide.items.map((item) => {
                            const remoteUri = item.imageUrl && item.imageUrl.trim().length > 0 ? item.imageUrl.trim() : null;
                            const localImg = remoteUri ? null : getMealImage(item.name);
                            return (
                              <View key={String(item.id)} style={styles.autoOrderItem}>
                                <View style={styles.autoOrderItemImg}>
                                  <MealCardImage
                                    remoteUri={remoteUri}
                                    localImg={localImg}
                                    imgStyle={{ width: '100%', height: '100%' }}
                                    finalFallback={
                                      <Image
                                        source={require('../styles/pictures/grandma.png')}
                                        style={{ width: 40, height: 40, opacity: 0.3 }}
                                        resizeMode="contain"
                                      />
                                    }
                                  />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.autoOrderItemName, { fontSize: scaled(16) }]} numberOfLines={1}>
                                    {translateMealName(item.name, language)}
                                  </Text>
                                  {item.description ? (
                                    <Text style={[styles.autoOrderItemDesc, { fontSize: scaled(13) }]} numberOfLines={2}>
                                      {translateMealDescription(item.description, language)}
                                    </Text>
                                  ) : null}
                                </View>
                              </View>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  />
                  </View>

                  <Text style={[styles.autoOrderApprovalNote, { fontSize: scaled(12) }]}>
                    {t.autoOrderApprovalNote}
                  </Text>

                  <View style={styles.autoOrderActions}>
                    <TouchableOpacity
                      style={[styles.autoOrderBtn, styles.autoOrderBtnDeny]}
                      onPress={handleDenyPendingAuto}
                      activeOpacity={0.85}
                    >
                      <Feather name="x-circle" size={18} color="#DC2626" />
                      <Text style={[styles.autoOrderBtnDenyText, { fontSize: scaled(15) }]}>{t.dismiss}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.autoOrderBtn, styles.autoOrderBtnApprove]}
                      onPress={() => {
                        // Place the slide the user is currently looking at,
                        // not whatever was first in the list.
                        if (activeSlide) setPendingAutoOrder(activeSlide);
                        handleApprovePendingAuto();
                      }}
                      activeOpacity={0.85}
                    >
                      <Feather name="check-circle" size={18} color="#FFFFFF" />
                      <Text style={[styles.autoOrderBtnApproveText, { fontSize: scaled(15) }]}>{t.placeOrder}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Browse Support Modal */}
      <Modal visible={showBrowseSupport} transparent animationType="fade" onRequestClose={() => setShowBrowseSupport(false)}>
        <View style={styles.supportBackdrop}>
          <View style={styles.supportCard}>
            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={styles.supportCardHeader}>
              <Text style={[styles.supportCardTitle, { fontSize: scaled(20) }]}>{t.needHelp}</Text>
              <TouchableOpacity onPress={() => setShowBrowseSupport(false)} hitSlop={10}>
                <Feather name="x" size={22} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.supportCardSub, { fontSize: scaled(14) }]}>{t.contactCareTeamHint}</Text>

            <View style={styles.scheduleCardBlock}>
              <Text style={[styles.scheduleCardTitle, { fontSize: scaled(16) }]}>{t.kitchenHours}</Text>
              <Text style={[styles.scheduleKitchenNote, { fontSize: scaled(13) }]}>{t.kitchenOpenDaily}</Text>
              {MEAL_SCHEDULE.map((s) => {
                const isActive = activePeriod === s.label;
                return (
                  <View key={s.label} style={[styles.scheduleCardRow, isActive && styles.scheduleCardRowActive]}>
                    <Text style={[styles.scheduleCardIcon, { fontSize: scaled(20) }]}>{s.icon}</Text>
                    <Text style={[styles.scheduleCardLabel, { fontSize: scaled(15) }, isActive && styles.scheduleCardLabelActive]}>
                      {translateMealPeriod(s.label as any, language)}
                    </Text>
                    <Text style={[styles.scheduleCardTime, { fontSize: scaled(14) }, isActive && styles.scheduleCardLabelActive]}>
                      {s.label === 'Breakfast' ? '7:00 am – 10:00 am' : s.label === 'Lunch' ? '11:00 am – 2:00 pm' : '4:00 pm – 7:00 pm'}
                    </Text>
                    {isActive && <View style={styles.scheduleActiveDot} />}
                  </View>
                );
              })}
              {/* <Text style={[styles.scheduleKitchenNote, { fontSize: scaled(13) }]}>Kitchen open 7 am – 7 pm daily</Text> */}
            </View>
            <ScrollView>

  <Text style={[styles.helpTopicsTitle, { fontSize: scaled(16) }]}>
    {t.whatWouldYouLikeHelpWith}
  </Text>

  {HELP_SECTIONS.map((section) => {
  const isOpen = openHelpSection === section.id;

  return (
    <View key={section.id} style={styles.helpAccordionCard}>

      <TouchableOpacity
        style={styles.helpAccordionHeader}
        activeOpacity={0.85}
        onPress={() =>
          setOpenHelpSection((prev) =>
            prev === section.id ? null : section.id
          )
        }
      >

        {/* LEFT SIDE */}
        <View style={styles.helpAccordionLeft}>

          <View style={styles.helpIconCircle}>
            <Feather
              name={section.icon as any}
              size={20}
              color="#4A7A60"
            />
          </View>

          <Text
            style={[
              styles.helpAccordionTitle,
              { fontSize: scaled(15) },
            ]}
          >
            {section.title}
          </Text>

        </View>

        {/* RIGHT SIDE */}
        <Feather
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={22}
          color="#6B7280"
        />

      </TouchableOpacity>

      {isOpen && (
        <View style={styles.helpAccordionBody}>
          <Text
            style={[
              styles.helpAccordionDescription,
              { fontSize: scaled(14) },
            ]}
          >
            {section.description}
          </Text>
          {section.video && (
            <Video
              source={section.video}
              style={styles.helpVideo}
              resizeMode="cover"
              paused={false}
              repeat={true}
              controls={true}
              muted={false}
              onLoad={() => console.log('Video loaded')}
              onError={(error) => console.log('Video error:', error)}
            />
          )}
        </View>
      )}

    </View>
  );
})}

</ScrollView>

            <TouchableOpacity style={styles.supportCloseBtn} onPress={() => setShowBrowseSupport(false)}>
              <Text style={[styles.supportCloseBtnText, { fontSize: scaled(15) }]}>{t.close}</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default BrowseMealOptionsScreen;

// ---------- Styles ----------
const styles = StyleSheet.create({
  helpVideo: {
  width: '100%',
  height: 420,
  borderRadius: 14,
  backgroundColor: '#111827',
  marginTop: 14,
},
  helpTopicsTitle: {
  fontWeight: '800',
  color: '#1F2937',
  marginTop: 16,
  marginBottom: 8,
  textAlign: 'center',
},

helpAccordionCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  overflow: 'hidden',
  marginBottom: 12,
},

helpAccordionHeader: {
  minHeight: 64,
  paddingHorizontal: 16,
  paddingVertical: 14,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},

helpAccordionTitleRow: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
  gap: 12,
},

helpIconCircle: {
  width: 42,
  height: 42,
  borderRadius: 21,
  backgroundColor: '#EEF7F1',
  alignItems: 'center',
  justifyContent: 'center',
},

helpAccordionTitle: {
  flex: 1,
  fontWeight: '800',
  color: '#1F2937',
},

helpAccordionBody: {
  paddingHorizontal: 16,
  paddingBottom: 16,
},

helpAccordionDescription: {
  color: '#6B7280',
  lineHeight: 21,
},
helpAccordionLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
},
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
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  // ── Pending auto-order panel (opens from the bell) ─────────────
  autoOrderBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  autoOrderCard: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden', // keep buttons/content from spilling past the rounded corners
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  autoOrderTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  autoOrderTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#E2DFD8',
    backgroundColor: '#F5F3EE',
    alignItems: 'center',
  },
  autoOrderTabActive: {
    backgroundColor: '#717644',
    borderColor: '#717644',
  },
  autoOrderTabText: {
    fontWeight: '700',
    color: '#6D6B3B',
  },
  autoOrderTabTextActive: {
    color: '#FFFFFF',
  },
  autoOrderSlide: {
    width: 672, // matches autoOrderCard inner width at maxWidth (720 - 48 padding)
    maxWidth: '100%',
    minHeight: 140, // keep a single-item slide from looking cramped, without forcing overflow
    paddingHorizontal: 0,
  },
  // ── Timing banner (today vs tomorrow) ──────────────────────────
  autoOrderTimingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  autoOrderTimingToday: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  autoOrderTimingTomorrow: {
    backgroundColor: '#EEF0FB',
    borderColor: '#D6D9F2',
  },
  autoOrderTimingHeadline: {
    fontWeight: '700',
  },
  autoOrderTimingSub: {
    fontWeight: '500',
    marginTop: 1,
  },
  autoOrderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  autoOrderTitle: {
    fontWeight: '800',
    color: '#1A1A1A',
  },
  autoOrderSub: {
    color: '#5C5C5C',
    marginTop: 4,
  },
  autoOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  autoOrderItemImg: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoOrderItemName: {
    fontWeight: '700',
    color: '#1A1A1A',
  },
  autoOrderItemDesc: {
    color: '#6B7280',
    marginTop: 2,
  },
  autoOrderApprovalNote: {
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 14,
    marginBottom: 14,
    textAlign: 'center',
  },
  autoOrderActions: {
    flexDirection: 'row',
    gap: 10,
  },
  autoOrderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  autoOrderBtnDeny: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  autoOrderBtnDenyText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  autoOrderBtnApprove: {
    backgroundColor: '#717644',
  },
  autoOrderBtnApproveText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    right: 20,
    bottom: 26,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.20,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 9,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
  },
  floatingGrannyImage: {
    // Keep the image at ~65% of the button diameter — same visual ratio as
    // the original 38/58 design. Larger than this makes the square image's
    // corners poke past the circular border and the art looks clipped.
    width: 50,
    height: 50,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  periodPillText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  restrictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginBottom: 4,
  },
  restrictionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
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
    gap: 6,
    backgroundColor: '#4A5C2A',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  bottomCardOrderBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 17,
  },
  bottomCardAvailBadge: {
    color: '#B45309',
    marginTop: 5,
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
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  // Base sizes below are fallbacks — authoritative size is the inline
  // `scaled(…)` in the render, so accessibility scaling is honored.
  bottomCardSuggestConfirmText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  bottomCardPlaceAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4A5C2A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 8,
  },
  bottomCardPlaceAllText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 18,
  },
  bottomCardRecBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: '#4A5C2A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  bottomCardRecBtnText: {
    color: '#FFF',
    fontWeight: '800',
  },
  bottomCardSuggestDismiss: {
    alignSelf: 'center',
    paddingVertical: 4,
    marginTop: 2,
  },
  bottomCardSuggestDismissText: {
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
  cardUnavailable: {
    borderColor: '#DDD0B8',
    borderStyle: 'dashed',
  },
  // Red border for restricted meals — clearly visible alert.
  cardUnsafe: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  // Solid red pill chip — top-right corner of image, bold and clear.
  unsafeChip: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  unsafeChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
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
  // Compact pill — same footprint/shape as the "Not available" chip so the
  // visual grammar stays consistent. Amber color distinguishes it: the
  // dull olive chip means "you can't order this", the amber chip means
  // "you CAN order this, but it arrives tomorrow morning".
  preorderOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D97706',
    borderWidth: 1,
    borderColor: '#B45309',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  preorderOverlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Larger banner at the top of the meal detail modal — same amber, more
  // text so it stands as its own section explaining the pre-order concept.
  preorderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF7ED',
    borderColor: '#D97706',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  preorderBannerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Base sizes here are a fallback — the inline fontSize via scaled() in the
  // render is the authoritative size so accessibility scaling is honored.
  preorderBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9A3412',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  preorderBannerBody: {
    fontSize: 13,
    lineHeight: 17,
    color: '#7C2D12',
  },
  // "Served later today" variant of the banner — green to read as
  // "good to go today", visually distinct from the amber "tomorrow".
  servingTodayBanner: {
    backgroundColor: '#ECFDF5',
    borderColor: '#4A7A60',
  },
  servingTodayIconWrap: {
    backgroundColor: '#4A7A60',
  },
  servingTodayTitle: {
    color: '#1F4736',
  },
  servingTodayBody: {
    color: '#2F5D49',
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
    paddingBottom: 380, // extra room so the note input can scroll above the keyboard
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
  detailRestrictionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  detailRestrictionText: {
    flex: 1,
    color: '#DC2626',
    fontWeight: '600',
  },
  detailOverrideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: '#DC2626',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
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
    maxWidth: 1080,
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
    fontSize: 17,
    fontWeight: '800',
    color: '#4A4A4A',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    alignSelf: 'center',
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
    width: 90,
  },
  scheduleCardLabelActive: {
    color: '#1D4ED8',
  },
  scheduleCardTime: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    textAlign: 'right',
  },
  scheduleActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  scheduleKitchenNote: {
    fontSize: 13,
    color: '#5e636c',
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
