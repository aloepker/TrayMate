//screens/upcomingMealsScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  BackHandler,
} from 'react-native';
import type { Order } from './context/CartContext';
import { useCart } from './context/CartContext';
import { useSettings } from './context/SettingsContext';
import { useKitchenMessages } from './context/KitchenMessageContext';
import { translateMealName, translateMealPeriod } from '../services/mealLocalization';
import { getMealImage, getMealPlaceholder } from '../services/mealDisplayService';
import { MealService } from '../services/localDataService';
import { isMealSafe } from '../services/mealSafetyService';
import { sendMessage as sendApiMessage } from '../services/api';
import { clearAuth, isTabletModeOn } from '../services/storage';
import TabletUnlockModal from './components/TabletUnlockModal';

// ── Warm olive palette ────────────────────────────────────────────────────────
const COLORS = {
  primary:      '#717644',
  primaryLight: '#F0EFE6',
  background:   '#EFE9DC',

  surface:      '#FDFCF9',
  card:         '#FFFFFF',
  border:       '#E2DFD8',
  warmBorder:   '#DDD0B8',
  text:         '#1A1A1A',
  textMuted:    '#5C5C5C',
  accent:       '#f6a72d',
  danger:       '#C53030',
  dangerBg:     '#FFF5F5',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if the given date is today.
 *  Handles backend "YYYY-MM-DD" strings which parse as UTC midnight
 *  and would appear as "yesterday" in local timezones west of UTC.
 */
function isToday(date: Date | string): boolean {
  const raw = typeof date === 'string' ? date : date.toISOString();
  // If it's a bare date string (no time component), compare date parts directly
  const datePart = raw.slice(0, 10); // "YYYY-MM-DD"
  const now = new Date();
  const todayPart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (datePart === todayPart) return true;
  // Fallback: compare using local date fields
  const d = new Date(date);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth()    === now.getMonth()    &&
    d.getDate()     === now.getDate()
  );
}

/** Returns the estimated ready time: placedAt + 2 hours */
function estimatedReadyTime(placedAt: Date, hour12 = true): string {
  const d = new Date(placedAt);
  d.setHours(d.getHours() + 2);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12 });
}

/** Returns how many minutes until the estimated ready time; negative if past. */
function minutesUntilReady(placedAt: Date): number {
  const ready = new Date(placedAt);
  ready.setHours(ready.getHours() + 2);
  return Math.round((ready.getTime() - Date.now()) / 60000);
}

function UpcomingMealsScreen({ navigation, route }: any) {
  const { orders, getOrdersForResident, fetchOrderHistory, clearAllOrders, removeOrder, replaceOrder } = useCart();
  const { t, scaled, language, notifications, getTouchTargetSize, setCurrentResidentId, use24Hour } = useSettings();
  const { messages: kitchenMessages, markRead: markKitchenMsgRead, sendMessage: sendKitchenMessage } = useKitchenMessages();
  const touchTarget = getTouchTargetSize();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Resident → Kitchen compose state ──────────────────────────────────────
  const [replyingToOrder, setReplyingToOrder] = useState<string | null>(null); // local order id
  const [residentReplyText, setResidentReplyText] = useState('');

  // ── Soft-delete / undo state ───────────────────────────────────────────────
  // pendingDeleteIds: orders visually hidden but not yet deleted from backend
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  // undoBanner: shown for 5s after a soft-delete
  const [undoBanner, setUndoBanner] = useState<{ label: string; onUndo: () => void } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoFadeAnim = useRef(new Animated.Value(0)).current;
  const [tabletLocked, setTabletLocked] = useState(false);
  const [showUnlockForLogout, setShowUnlockForLogout] = useState(false);

  const showUndoBanner = (label: string, onUndo: () => void) => {
    // Clear any existing timer
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoBanner({ label, onUndo });
    // Fade in
    Animated.timing(undoFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    // Auto-dismiss after 5 s
    undoTimer.current = setTimeout(() => {
      Animated.timing(undoFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setUndoBanner(null);
      });
    }, 5000);
  };

  const dismissUndoBanner = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    Animated.timing(undoFadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setUndoBanner(null);
    });
  };

  // Cleanup timer on unmount
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const residentId        = route?.params?.residentId as string | undefined;
  const residentName      = route?.params?.residentName || 'Resident';
  const residentRoom      = (route?.params?.roomNumber ?? route?.params?.room) as string | undefined;

  useEffect(() => {
    if (!residentId) return;
    let cancelled = false;
    isTabletModeOn(residentId).then((v) => { if (!cancelled) setTabletLocked(v); });
    return () => { cancelled = true; };
  }, [residentId]);

  const performLogout = useCallback(async () => {
    try { await clearAuth(); } catch { /* proceed regardless */ }
    navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = (): boolean => {
        if (tabletLocked) {
          setShowUnlockForLogout(true);
          return true;
        }
        Alert.alert(
          'Log Out?',
          'This will end the current session. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Log Out',
              style: 'destructive',
              onPress: performLogout,
            },
          ],
        );
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [tabletLocked, performLogout]),
  );

  const handleSendResidentMessage = (order: any) => {
    if (!residentReplyText.trim()) return;
    const backendId = order.backendId;
    const tag = backendId ? `[Order #${backendId}] ` : '';
    sendKitchenMessage({
      residentId: residentId ?? '',
      residentName,
      residentRoom: residentRoom ?? '',
      // Carry the explicit order ID so kitchen UI can show it as a pill
      // without having to parse the [Order #N] text tag.
      orderId: backendId,
      fromRole: 'resident',
      fromName: residentName,
      text: `${tag}${residentReplyText.trim()}`,
      channel: 'order',
    });
    setResidentReplyText('');
    setReplyingToOrder(null);
  };
  const dietaryRestrictions: string[] = route?.params?.dietaryRestrictions ?? [];
  const foodAllergies: string[] = route?.params?.foodAllergies ?? [];

  useEffect(() => {
    const rid = route?.params?.residentId;
    if (rid) setCurrentResidentId(String(rid));
  }, [route?.params?.residentId, setCurrentResidentId]);

  useEffect(() => {
    if (!residentId) return;
    fetchOrderHistory(residentId);
    const unsub = navigation.addListener('focus', () => fetchOrderHistory(residentId));
    // Poll every 15s so kitchen-side status changes (preparing → ready →
    // completed → cancelled) show up without a manual refresh.
    const poll = setInterval(() => fetchOrderHistory(residentId), 15000);
    return () => { unsub(); clearInterval(poll); };
  }, [fetchOrderHistory, residentId, navigation]);

  // ── Only show today's orders, excluding soft-deleted ones ─────────────────
  const allResidentOrders = residentId ? getOrdersForResident(residentId) : orders;
  const residentOrders    = allResidentOrders
    .filter((o) => isToday(o.placedAt))
    .filter((o) => !pendingDeleteIds.has(o.id));

  const activeOrders    = residentOrders.filter((o) => o.status !== 'completed');
  const completedOrders = residentOrders.filter((o) => o.status === 'completed');

  // Three fixed buckets shown even when empty so the resident can see
  // at a glance which meals they still need to pick. Matches the
  // facility's serving cadence — one tray per period per day.
  const MEAL_BUCKETS: Array<{ key: string; label: string; serves: string; orderCta: string }> = [
    { key: 'Breakfast', label: translateMealPeriod('Breakfast', language), serves: t.breakfastServed, orderCta: t.orderBreakfastCta },
    { key: 'Lunch',     label: translateMealPeriod('Lunch', language),     serves: t.lunchServed,     orderCta: t.orderLunchCta },
    { key: 'Dinner',    label: translateMealPeriod('Dinner', language),    serves: t.dinnerServed,    orderCta: t.orderDinnerCta },
  ];
  const matchesPeriod = (order: Order, period: string): boolean => {
    const mod = (order.mealOfDay ?? '').toLowerCase();
    return mod === period.toLowerCase()
        || (period === 'Breakfast' && mod === 'b')
        || (period === 'Lunch'     && mod === 'l')
        || (period === 'Dinner'    && mod === 'd');
  };
  // An order only belongs in a B/L/D bucket if it actually contains a
  // main meal for that period. A standalone drink or side order would
  // otherwise occupy the breakfast slot and visually hide that the
  // resident still hasn't picked a real meal.
  const hasMainMealFor = (order: Order, period: string): boolean => {
    if (!order.items || order.items.length === 0) return false;
    return order.items.some((it) => {
      const p = String((it as any).meal_period ?? '').toLowerCase();
      return p === period.toLowerCase() || p === 'all day';
    });
  };
  // True only when every item in the order is a drink, side, or dessert.
  // Empty-item orders (not yet hydrated) are treated as main orders so
  // they still appear somewhere rather than disappearing.
  const isAddOnOnly = (order: Order): boolean => {
    if (!order.items || order.items.length === 0) return false;
    return order.items.every((it) => {
      const p = String((it as any).meal_period ?? '').toLowerCase();
      return p === 'drinks' || p === 'sides' || p === 'dessert' || p === 'desserts';
    });
  };
  // Standalone drink/side orders shown in their own section — not mixed
  // into the Breakfast/Lunch/Dinner buckets.
  const addOnActiveOrders = activeOrders.filter(isAddOnOnly);
  // Cache of safe alternative meals per period, refreshed when the
  // resident's safety profile changes. Used by the substitution-swap
  // dropdown so we can offer 3-5 alternatives that are guaranteed
  // safe for this resident.
  const [periodAlternatives, setPeriodAlternatives] = useState<Record<string, any[]>>({});
  const safetyProfileRef = {
    foodAllergies: foodAllergies ?? [],
    dietaryRestrictions: dietaryRestrictions ?? [],
    medicalConditions: (route?.params?.medicalConditions ?? []) as string[],
  };
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, any[]> = {};
      for (const period of ['Breakfast', 'Lunch', 'Dinner'] as const) {
        try {
          const all = await MealService.getMealsByPeriod(period);
          next[period] = all
            .filter((m) => !(m as any)._local) // backend-known only
            .filter((m) => isMealSafe(m as any, safetyProfileRef))
            .slice(0, 6);
        } catch {
          next[period] = [];
        }
      }
      if (!cancelled) setPeriodAlternatives(next);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentId, foodAllergies?.join('|'), dietaryRestrictions?.join('|')]);

  // Notify the resident's caregivers (and admin) that a substitution
  // was actioned. Best-effort: failures are logged, never block the UI.
  const notifyCaregiversOfSwap = async (oldName: string, newName: string, period: string) => {
    const assignedCaregivers = (route?.params?.assignedCaregivers ?? []) as Array<{ caregiverId: string; caregiverName: string }>;
    const room = (route?.params as any)?.roomNumber || '';
    const body = `${residentName}${room ? ` (Room ${room})` : ''} swapped ${oldName} → ${newName} for ${period} after a kitchen substitution.`;
    for (const cg of assignedCaregivers) {
      try { await sendApiMessage(cg.caregiverId, body); } catch (e) { console.warn('[Swap] notify caregiver failed', e); }
    }
  };

  // Send a kitchen message so the kitchen sees the swap immediately
  // on their dashboard (the existing message channel — same path the
  // resident already uses for "message kitchen").
  const handleAcceptSubstitution = async (order: Order, replacement: any) => {
    if (!order.backendId) {
      Alert.alert('Cannot swap', 'This order is local-only and cannot be replaced yet.');
      return;
    }
    const period = order.mealOfDay || 'Lunch';
    const oldName = order.items?.[0]?.name ?? 'previous meal';
    const cartItem = {
      id: Number(replacement.id),
      name: replacement.name,
      meal_period: replacement.mealPeriod as any,
      description: replacement.description,
      kcal: replacement.nutrition?.calories ?? 0,
      sodium_mg: parseInt(String(replacement.nutrition?.sodium ?? '0'), 10),
      protein_g: parseInt(String(replacement.nutrition?.protein ?? '0'), 10),
      tags: replacement.tags ?? [],
      imageUrl: replacement.imageUrl,
    };
    const result = await replaceOrder(order.backendId, residentId!, period, [cartItem as any]);
    if (!result) {
      Alert.alert('Swap failed', 'Could not replace the order. Please try again or contact the kitchen.');
      return;
    }
    try {
      const room = (route?.params as any)?.roomNumber || '';
      sendKitchenMessage({
        residentId: String(residentId ?? ''),
        orderId: order.backendId,
        residentName: String(residentName ?? ''),
        residentRoom: String(room),
        fromRole: 'resident',
        fromName: String(residentName ?? 'Resident'),
        text: `Swapped ${oldName} → ${replacement.name} after kitchen substitution.`,
        channel: 'order',
      });
    } catch (e) { console.warn('[Swap] kitchen message failed', e); }
    notifyCaregiversOfSwap(oldName, replacement.name, period);
    Alert.alert('Swap accepted', `Switched to ${replacement.name} for ${period}.`);
  };

  const bucketedActiveOrders = MEAL_BUCKETS.map((b) => {
    // Prefer an order that has a main item for this period. Never fall
    // back to a drinks/sides-only order — those live in the separate
    // Drinks & Sides section so the resident can see the bucket is still
    // open for a real meal selection.
    const withMain = activeOrders.find(
      (o) => matchesPeriod(o, b.key) && hasMainMealFor(o, b.key),
    );
    const anyMatch = withMain
      ?? activeOrders.find((o) => matchesPeriod(o, b.key) && !isAddOnOnly(o))
      ?? null;
    return { ...b, order: anyMatch };
  });

  // ── Status config ─────────────────────────────────────────────────────────
  const statusConfig: Record<
    Order['status'],
    { label: string; color: string; bg: string; featherIcon: string; progress: number }
  > = {
    confirmed: {
      label: t.confirmed,
      color: COLORS.primary,
      bg:    COLORS.primaryLight,
      featherIcon: 'check-circle',
      progress: 0.25,
    },
    preparing: {
      label: t.preparing,
      color: '#b45309',
      bg:    '#fef3c7',
      featherIcon: 'clock',
      progress: 0.5,
    },
    ready: {
      label: t.ready,
      color: '#15803d',
      bg:    '#dcfce7',
      featherIcon: 'check-circle',
      progress: 0.75,
    },
    completed: {
      label: t.completed,
      color: '#166534',
      bg:    '#bbf7d0',
      featherIcon: 'check-circle',
      progress: 1.0,
    },
    cancelled: {
      label: t.statusCancelled,
      color: '#dc2626',
      bg:    '#fee2e2',
      featherIcon: 'x-circle',
      progress: 0,
    },
    substitution_requested: {
      label: t.statusSubstituted,
      color: '#7c3aed',
      bg:    '#ede9fe',
      featherIcon: 'refresh-cw',
      progress: 0.25,
    },
  };

  const statusSteps = [t.confirmed, t.preparing, t.ready, t.completed];

  const toggleExpand = (id: string) =>
    setExpandedId((curr) => (curr === id ? null : id));

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: !use24Hour });

  const formatDate = (date: Date) => {
    const d   = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return t.today;
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return t.tomorrow;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Soft-delete a single order — hides it instantly, confirms with backend after 5s
  const handleRemoveOrder = (orderId: string) => {
    // Mark as pending-delete (visually hidden)
    setPendingDeleteIds((prev) => new Set(prev).add(orderId));

    showUndoBanner('Order removed', () => {
      // Undo → restore
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      dismissUndoBanner();
    });

    // After 5s, actually delete
    setTimeout(() => {
      setPendingDeleteIds((prev) => {
        if (!prev.has(orderId)) return prev; // already undone
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      removeOrder(orderId);
    }, 5000);
  };

  // Clear All — confirm first, then soft-delete with 10s undo window
  const handleClearAll = () => {
    Alert.alert(
      'Clear All Orders',
      "Remove all of today's orders for this resident?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // Save the current order IDs so undo can restore
            const idsToDelete = residentOrders.map((o) => o.id);
            idsToDelete.forEach((id) =>
              setPendingDeleteIds((prev) => new Set(prev).add(id))
            );

            showUndoBanner(`${idsToDelete.length} orders removed`, () => {
              // Undo → restore all
              setPendingDeleteIds((prev) => {
                const next = new Set(prev);
                idsToDelete.forEach((id) => next.delete(id));
                return next;
              });
              dismissUndoBanner();
            });

            // After 10s, actually delete
            setTimeout(() => {
              setPendingDeleteIds((prev) => {
                const next = new Set(prev);
                idsToDelete.forEach((id) => next.delete(id));
                return next;
              });
              clearAllOrders(residentId);
            }, 10000);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        {/*
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { minHeight: touchTarget }]}
        >
          <Feather name="chevron-left" size={22} color={COLORS.primary} />
          <Text style={[styles.backText, { fontSize: scaled(16) }]}>
            {t.back?.replace(/^[\s\u2190\u21A9\u2B05]+/, '') || 'Back'}
          </Text>
        </TouchableOpacity>
        */}

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { fontSize: scaled(22) }]}>{t.upcomingMeals}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
  {/*        {residentOrders.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll}>
              <Feather name="trash-2" size={17} color={COLORS.danger} />
            </TouchableOpacity>
          )} */}
          <TouchableOpacity
            style={[styles.settingsButton, { minHeight: touchTarget, minWidth: touchTarget }]}
            onPress={() => navigation.navigate('Settings', {
              residentId,
              residentName,
              dietaryRestrictions,
              foodAllergies,
              caregiverId:        route?.params?.caregiverId        ?? null,
              caregiverName:      route?.params?.caregiverName      ?? null,
              assignedCaregivers: route?.params?.assignedCaregivers ?? undefined,
            })}
          >
            <Feather name="settings" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {residentOrders.length === 0 ? (
          /* ── Empty state ── */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Feather name="calendar" size={44} color={COLORS.primary} />
            </View>
            <Text style={[styles.emptyTitle, { fontSize: scaled(22) }]}>{t.noUpcoming}</Text>
            <Text style={[styles.emptyText, { fontSize: scaled(15) }]}>{t.noUpcomingDesc}</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('BrowseMealOptions', { residentId, residentName, dietaryRestrictions, foodAllergies })}
            >
              <Feather name="book-open" size={17} color="#FFF" />
              <Text style={[styles.browseButtonText, { fontSize: scaled(16) }]}>{t.browseMenu}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Active Orders, grouped by meal period ──
                Always render all three sections so the resident sees
                at a glance which trays still need a pick. The card
                body for filled buckets is the existing detailed card;
                empty buckets show a one-tap "Order now" placeholder. */}
            {bucketedActiveOrders.map((bucket) => {
              if (!bucket.order) {
                return (
                  <View key={`bucket-${bucket.key}`} style={{ marginBottom: 12 }}>
                    <Text style={[styles.sectionHeader, { fontSize: scaled(18) }]}>
                      {bucket.label}
                    </Text>
                    <TouchableOpacity
                      style={[styles.mealCard, { paddingVertical: 18, alignItems: 'center' }]}
                      onPress={() => navigation.navigate('BrowseMealOptions', { residentId, residentName, dietaryRestrictions, foodAllergies, initialPeriod: bucket.key })}
                      activeOpacity={0.85}
                    >
                      <Feather name="plus-circle" size={22} color={COLORS.primary} />
                      <Text style={[{ fontSize: scaled(15), color: COLORS.primary, fontWeight: '700', marginTop: 6 }]}>
                        {bucket.orderCta}
                      </Text>
                      <Text style={[{ fontSize: scaled(12), color: '#6B7280', marginTop: 2 }]}>
                        {bucket.serves}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }
              const order = bucket.order;
              const needsAttention = order.status === 'cancelled' || order.status === 'substitution_requested';
              return (
                <View key={`bucket-${bucket.key}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.sectionHeader, { fontSize: scaled(18), marginBottom: 0 }]}>
                      {bucket.label}
                    </Text>
                    {needsAttention && (
                      <View style={{
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: order.status === 'cancelled' ? '#DC2626' : '#C2410C',
                      }} />
                    )}
                  </View>
                  {/* Substitution banner — only shown when the kitchen
                      flagged this order. Lets the resident pick a
                      different safe meal in one tap instead of having
                      to navigate back to the menu, rebuild the cart,
                      and re-place from scratch. */}
                  {order.status === 'substitution_requested' && (
                    <View style={{
                      backgroundColor: '#FEF3C7',
                      borderColor: '#C2410C',
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 10,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Feather name="refresh-cw" size={16} color="#C2410C" />
                        <Text style={{ fontSize: scaled(14), fontWeight: '800', color: '#7C2D12' }}>
                          {t.kitchenSuggestedSwap}
                        </Text>
                      </View>
                      <Text style={{ fontSize: scaled(12), color: '#7C2D12', marginBottom: 10 }}>
                        {t.pickAReplacement}
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {(periodAlternatives[bucket.key] ?? []).map((alt: any) => (
                          <TouchableOpacity
                            key={String(alt.id)}
                            onPress={() => handleAcceptSubstitution(order, alt)}
                            style={{
                              backgroundColor: '#FFFFFF',
                              borderColor: '#C2410C',
                              borderWidth: 1,
                              borderRadius: 14,
                              paddingVertical: 8,
                              paddingHorizontal: 12,
                              marginRight: 8,
                              maxWidth: 220,
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Replace with ${alt.name}`}
                          >
                            <Text style={{ fontSize: scaled(13), fontWeight: '700', color: '#7C2D12' }} numberOfLines={1}>
                              {translateMealName(alt.name, language)}
                            </Text>
                            <Text style={{ fontSize: scaled(11), color: '#9C4221' }} numberOfLines={1}>
                              {alt.nutrition?.calories ?? '?'} kcal
                            </Text>
                          </TouchableOpacity>
                        ))}
                        {(periodAlternatives[bucket.key] ?? []).length === 0 && (
                          <Text style={{ fontSize: scaled(12), color: '#9C4221', fontStyle: 'italic' }}>
                            {t.loadingSafeOptions}
                          </Text>
                        )}
                      </ScrollView>
                    </View>
                  )}
                  {(() => {
                  const expanded   = expandedId === order.id;
                  const statusInfo = statusConfig[order.status];
                  const minsLeft   = minutesUntilReady(order.placedAt);
                  const estReady   = estimatedReadyTime(order.placedAt, !use24Hour);
                  const isOverdue  = minsLeft <= 0;

                  return (
                    <TouchableOpacity
                      key={order.id}
                      style={styles.mealCard}
                      onPress={() => toggleExpand(order.id)}
                      activeOpacity={0.85}
                    >
                      {/* ── Order Confirmation Banner ── */}
                      <View style={styles.confirmationBanner}>
                        <View style={styles.confirmationLeft}>
                          <View style={styles.confirmIcon}>
                            <Feather name="check" size={13} color="#FFF" />
                          </View>
                          <View>
                            <Text style={styles.confirmTitle}>{t.orderConfirmed}</Text>
                            {/* Order #ID dropped — residents track orders by the
                                meal/time, not by a backend integer. Room number
                                kept because staff sometimes ask "what's your room
                                number?" and it's handy to glance at. */}
                            {residentRoom ? (
                              <Text style={styles.confirmRoom}>{t.room} {residentRoom}</Text>
                            ) : null}
                          </View>
                        </View>
                        <View style={styles.confirmRight}>
                          <Text style={styles.confirmPlacedLabel}>{t.placedAt}</Text>
                          <Text style={styles.confirmPlacedTime}>{formatTime(order.placedAt)}</Text>
                        </View>
                      </View>

                      {/* ── 2-Hour Reminder ── */}
                      <View style={[styles.reminderRow, isOverdue ? styles.reminderRowReady : styles.reminderRowPending]}>
                        <Feather
                          name={isOverdue ? 'check-circle' : 'clock'}
                          size={14}
                          color={isOverdue ? '#15803d' : '#b45309'}
                        />
                        {isOverdue ? (
                          <Text style={[styles.reminderRowText, { color: '#15803d' }]}>
                            {t.estReadyBy.replace('{time}', estReady)} · {t.shouldBeReadySoon}
                          </Text>
                        ) : minsLeft <= 30 ? (
                          <Text style={[styles.reminderRowText, { color: '#b45309' }]}>
                            {t.readyInAbout.replace('{min}', String(minsLeft)).replace('{time}', estReady)}
                          </Text>
                        ) : (
                          <Text style={[styles.reminderRowText, { color: '#b45309' }]}>
                            {t.twoHourReminder.replace('{time}', estReady)}
                          </Text>
                        )}
                      </View>

                      {/* Progress track */}
                      <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${statusInfo.progress * 100}%`, backgroundColor: statusInfo.color },
                            ]}
                          />
                        </View>
                        <View style={styles.progressSteps}>
                          {statusSteps.map((step, i) => {
                            const stepProgress = (i + 1) / statusSteps.length;
                            const isActive  = statusInfo.progress >= stepProgress;
                            const isCurrent = step === statusInfo.label;
                            return (
                              <View key={step} style={styles.progressStep}>
                                <View
                                  style={[
                                    styles.progressDot,
                                    isActive && { backgroundColor: statusInfo.color, borderColor: statusInfo.color },
                                    isCurrent && styles.progressDotCurrent,
                                  ]}
                                >
                                  {isActive && <Feather name="check" size={9} color="#FFF" />}
                                </View>
                                <Text
                                  style={[
                                    styles.progressStepLabel,
                                    { fontSize: scaled(10) },
                                    isCurrent && { color: statusInfo.color, fontWeight: '700' },
                                  ]}
                                >
                                  {step}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      {/* Order meta row */}
                      <View style={styles.mealHeader}>
                        <View style={styles.mealInfo}>
                          <Text style={[styles.orderLabel, { fontSize: scaled(13) }]}>
                            {formatDate(order.placedAt)} · {formatTime(order.placedAt)}
                          </Text>
                          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                            <Feather name={statusInfo.featherIcon as any} size={11} color={statusInfo.color} />
                            <Text style={[styles.statusText, { fontSize: scaled(12), color: statusInfo.color }]}>
                              {statusInfo.label}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {/* Cancelled orders get a "Reorder" shortcut
                              so the resident can jump straight to the
                              menu pre-filtered to this meal's period
                              without typing the order again. */}
                          {order.status === 'cancelled' && (
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation?.();
                                navigation.navigate('BrowseMealOptions', {
                                  residentId,
                                  residentName,
                                  dietaryRestrictions,
                                  foodAllergies,
                                  initialPeriod: bucket.key,
                                });
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 5,
                                paddingVertical: 7,
                                paddingHorizontal: 12,
                                borderRadius: 999,
                                backgroundColor: COLORS.primary,
                              }}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              accessibilityRole="button"
                              accessibilityLabel={`Reorder from ${bucket.label} menu`}
                            >
                              <Feather name="refresh-cw" size={13} color="#FFF" />
                              <Text style={{ fontSize: scaled(12), fontWeight: '800', color: '#FFF' }}>
                                {t.reorder}
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={styles.removeOrderBtn}
                            onPress={(e) => { e.stopPropagation?.(); handleRemoveOrder(order.id); }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityRole="button"
                            accessibilityLabel={t.cancelOrder}
                          >
                            <Feather name="x" size={16} color={COLORS.danger} />
                            <Text style={[styles.removeOrderBtnText, { fontSize: scaled(13) }]}>
                              {t.cancelOrder}
                            </Text>
                          </TouchableOpacity>
                          <Feather
                            name={expanded ? 'chevron-down' : 'chevron-right'}
                            size={28}
                            color={COLORS.textMuted}
                          />
                        </View>
                      </View>

                      {/* Meal rows */}
                      {order.items.map((item, idx) => {
                        const img = getMealImage(item.name);
                        const remoteUri = (item as any).imageUrl?.trim?.() || null;
                        const ph  = getMealPlaceholder(item.name);
                        return (
                          <View key={`${item.id}-${idx}`} style={styles.mealRow}>
                            {img ? (
                              <Image source={img} style={styles.mealThumb} />
                            ) : remoteUri ? (
                              <Image source={{ uri: remoteUri }} style={styles.mealThumb} />
                            ) : (
                              <View style={[styles.mealThumbPlaceholder, { backgroundColor: ph.bg }]}>
                                <Text style={{ fontSize: 22 }}>{ph.emoji}</Text>
                              </View>
                            )}
                            <View style={styles.mealRowInfo}>
                              <Text style={[styles.mealName, { fontSize: scaled(18) }]}>
                                {translateMealName(item.name, language)}
                              </Text>
                              {/* Period label is redundant for main meals — the
                                  bucket header ("Lunch") already says when it's
                                  for. We only show the label for add-ons
                                  (Drinks/Sides/Dessert) so the resident knows
                                  which item is the actual entrée vs. the side. */}
                              {(() => {
                                const p = String(item.meal_period ?? '').toLowerCase();
                                const isAddOn = p === 'drinks' || p === 'sides' || p === 'dessert' || p === 'desserts';
                                if (!isAddOn) return null;
                                return (
                                  <Text style={[styles.mealPeriod, { fontSize: scaled(13) }]}>
                                    {translateMealPeriod(item.meal_period, language)}
                                  </Text>
                                );
                              })()}
                            </View>
                            <View style={styles.mealCalBadge}>
                              <Text style={[styles.mealCal, { fontSize: scaled(13) }]}>
                                {item.kcal} kcal
                              </Text>
                            </View>
                          </View>
                        );
                      })}

                      {/* ── Kitchen Messages for this order ── */}
                      {(() => {
                        const backendId = order.backendId;
                        const orderTag = backendId ? `[Order #${backendId}]` : null;
                        const orderMsgs = kitchenMessages.filter(
                          (m) =>
                            String(m.residentId) === String(residentId) &&
                            (orderTag
                              ? m.text.startsWith(orderTag)
                              : !m.text.match(/^\[Order #\d+\]/))
                        );
                        if (orderMsgs.length === 0) return null;
                        return (
                          <View style={styles.kitchenMsgSection}>
                            <View style={styles.kitchenMsgHeader}>
                              <Feather name="message-square" size={13} color="#4A5C2A" />
                              <Text style={[styles.kitchenMsgTitle, { fontSize: scaled(11) }]}>
                                {t.messageFromKitchen}
                              </Text>
                            </View>
                            {orderMsgs.map((msg) => {
                              // Strip the [Order #N] prefix before showing to resident
                              const cleanText = orderTag
                                ? msg.text.replace(orderTag, '').trim()
                                : msg.text;
                              if (!msg.read) markKitchenMsgRead(msg.id);
                              return (
                                <View key={msg.id} style={styles.kitchenMsgBubble}>
                                  <Text style={[styles.kitchenMsgText, { fontSize: scaled(13) }]}>
                                    {cleanText}
                                  </Text>
                                  <Text style={[styles.kitchenMsgTime, { fontSize: scaled(10) }]}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !use24Hour })}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        );
                      })()}

                      {/* ── Resident → Kitchen compose ── */}
                      <View style={styles.residentComposeSection}>
                        {replyingToOrder === order.id ? (
                          <View style={styles.residentComposeRow}>
                            <TextInput
                              style={styles.residentComposeInput}
                              value={residentReplyText}
                              onChangeText={setResidentReplyText}
                              placeholder="Message to kitchen..."
                              placeholderTextColor="#ABABAB"
                              multiline
                              autoFocus
                            />
                            <TouchableOpacity
                              style={styles.residentSendBtn}
                              onPress={() => handleSendResidentMessage(order)}
                            >
                              <Feather name="send" size={14} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.residentCancelBtn}
                              onPress={() => { setReplyingToOrder(null); setResidentReplyText(''); }}
                            >
                              <Feather name="x" size={14} color={COLORS.textMuted} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.residentComposeToggle}
                            onPress={() => { setReplyingToOrder(order.id); setResidentReplyText(''); }}
                            accessibilityRole="button"
                            accessibilityLabel={t.messageKitchen}
                          >
                            <Feather name="message-circle" size={18} color={COLORS.primary} />
                            <Text style={[styles.residentComposeToggleText, { fontSize: scaled(16) }]}>
                              {t.messageKitchen}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Expanded nutrition */}
                      {expanded && (
                        <View style={styles.expandedSection}>
                          <View style={styles.divider} />
                          <Text style={[styles.nutritionTitle, { fontSize: scaled(12) }]}>
                            {t.orderNutrition}
                          </Text>
                          <View style={styles.nutritionGrid}>
                            {[
                              { label: t.calories, value: String(order.totalNutrition.calories) },
                              { label: t.sodium,   value: `${order.totalNutrition.sodium}mg`   },
                              { label: t.protein,  value: `${order.totalNutrition.protein}g`   },
                            ].map(({ label, value }) => (
                              <View key={label} style={styles.nutritionItem}>
                                <Text style={[styles.nutritionValue, { fontSize: scaled(16) }]}>{value}</Text>
                                <Text style={[styles.nutritionLabel, { fontSize: scaled(11) }]}>{label}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                  })()}
                </View>
              );
            })}

            {/* ── Drinks & Sides (standalone add-on orders) ── */}
            {addOnActiveOrders.length > 0 && (
              <View style={{ marginTop: 4, marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Text style={[styles.sectionHeader, { fontSize: scaled(18), marginBottom: 0 }]}>
                    {t.drinksAndSides}
                  </Text>
                </View>
                {addOnActiveOrders.map((order) => {
                  const statusInfo = statusConfig[order.status];
                  return (
                    <View key={order.id} style={[styles.mealCard, { marginBottom: 12 }]}>
                      {/* Status pill + time */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 5,
                          backgroundColor: statusInfo?.bg ?? '#F3F4F6',
                          borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10,
                        }}>
                          <Feather
                            name={(statusInfo?.featherIcon ?? 'circle') as any}
                            size={12}
                            color={statusInfo?.color ?? '#374151'}
                          />
                          <Text style={{ fontSize: scaled(12), fontWeight: '700', color: statusInfo?.color ?? '#374151' }}>
                            {statusInfo?.label ?? order.status}
                          </Text>
                        </View>
                        <Text style={{ fontSize: scaled(12), color: '#9CA3AF' }}>
                          {formatTime(order.placedAt)}
                        </Text>
                      </View>

                      {/* Item rows */}
                      {order.items.map((item, idx) => {
                        const img = getMealImage(item.name);
                        const remoteUri = (item as any).imageUrl?.trim?.() || null;
                        const ph = getMealPlaceholder(item.name);
                        return (
                          <View key={`${item.id}-${idx}`} style={styles.mealRow}>
                            {img ? (
                              <Image source={img} style={styles.mealThumb} />
                            ) : remoteUri ? (
                              <Image source={{ uri: remoteUri }} style={styles.mealThumb} />
                            ) : (
                              <View style={[styles.mealThumbPlaceholder, { backgroundColor: ph.bg }]}>
                                <Text style={{ fontSize: 22 }}>{ph.emoji}</Text>
                              </View>
                            )}
                            <View style={styles.mealRowInfo}>
                              <Text style={[styles.mealName, { fontSize: scaled(16) }]}>
                                {translateMealName(item.name, language)}
                              </Text>
                              <Text style={[styles.mealPeriod, { fontSize: scaled(13) }]}>
                                {translateMealPeriod(item.meal_period, language)}
                              </Text>
                            </View>
                            {item.kcal ? (
                              <View style={styles.mealCalBadge}>
                                <Text style={[styles.mealCal, { fontSize: scaled(13) }]}>{item.kcal} kcal</Text>
                              </View>
                            ) : null}
                          </View>
                        );
                      })}

                      {/* Remove button */}
                      <TouchableOpacity
                        style={{ alignSelf: 'flex-end', marginTop: 8, padding: 4 }}
                        onPress={() => handleRemoveOrder(order.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel="Remove order"
                      >
                        <Feather name="trash-2" size={15} color={COLORS.danger} />
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {/* CTA to add more drinks/sides */}
                <TouchableOpacity
                  style={[styles.mealCard, { paddingVertical: 14, alignItems: 'center', backgroundColor: '#F0FDF4', borderColor: COLORS.primaryLight }]}
                  onPress={() => navigation.navigate('BrowseMealOptions', { residentId, residentName, dietaryRestrictions, foodAllergies, initialPeriod: 'Drinks' })}
                  activeOpacity={0.85}
                >
                  <Feather name="plus-circle" size={20} color={COLORS.primary} />
                  <Text style={[{ fontSize: scaled(14), color: COLORS.primary, fontWeight: '700', marginTop: 4 }]}>
                    {t.orderDrinksCta}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Completed Orders ── */}
            {completedOrders.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, { fontSize: scaled(18) }]}>{t.completed}</Text>
                {completedOrders.map((order) => (
                  <View key={order.id} style={styles.completedCard}>
                    <View style={styles.completedHeader}>
                      <View style={styles.completedBadge}>
                        <Feather name="check-circle" size={12} color="#166534" />
                        <Text style={[styles.completedBadgeText, { fontSize: scaled(12) }]}>{t.completed}</Text>
                      </View>
                      <Text style={[styles.completedTime, { fontSize: scaled(13) }]}>
                        {formatDate(order.placedAt)}
                      </Text>
                    </View>
                    {order.items.map((item, idx) => {
                      const img = getMealImage(item.name);
                      const remoteUri = (item as any).imageUrl?.trim?.() || null;
                      const ph  = getMealPlaceholder(item.name);
                      return (
                        <View key={`${item.id}-${idx}`} style={styles.completedRow}>
                          {img ? (
                            <Image source={img} style={styles.completedThumb} />
                          ) : remoteUri ? (
                            <Image source={{ uri: remoteUri }} style={styles.completedThumb} />
                          ) : (
                            <View style={[styles.completedThumbPlaceholder, { backgroundColor: ph.bg }]}>
                              <Feather name="coffee" size={14} color={COLORS.primary} />
                            </View>
                          )}
                          <Text style={[styles.completedMealName, { fontSize: scaled(15) }]}>
                            {translateMealName(item.name, language)}
                          </Text>
                        </View>
                      );
                    })}
                    <View style={styles.completionBar}>
                      <View style={styles.completionFill} />
                    </View>
                    <Text style={[styles.completionText, { fontSize: scaled(13) }]}>
                      {t.mealCompleted}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* Browse Menu CTA */}
            <TouchableOpacity
              style={styles.browseMenuBtn}
              onPress={() => navigation.navigate('BrowseMealOptions', { residentId, residentName, dietaryRestrictions, foodAllergies })}
              activeOpacity={0.8}
            >
              <Feather name="book-open" size={20} color="#FFF" />
              <Text style={[styles.browseMenuText, { fontSize: scaled(16) }]}>{t.browseMenu}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ── Undo Banner ────────────────────────────────────────────────────── */}
      {undoBanner && (
        <Animated.View style={[styles.undoBanner, { opacity: undoFadeAnim }]}>
          <Feather name="trash-2" size={16} color="#FFF" />
          <Text style={styles.undoBannerText}>{undoBanner.label}</Text>
          <TouchableOpacity style={styles.undoBtn} onPress={undoBanner.onUndo}>
            <Text style={styles.undoBtnText}>{t.undo}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      <TabletUnlockModal
        visible={showUnlockForLogout}
        onClose={() => setShowUnlockForLogout(false)}
        onSuccess={() => { setShowUnlockForLogout(false); performLogout(); }}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 50,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
    paddingVertical: 6,
  },
  backText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 36, paddingTop: 16 },

  // Section headers — title case + larger + darker so they're
  // legible at arm's length on a tablet for elderly residents.
  // ALL-CAPS was a real readability hit (no word-shape cue).
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
    marginTop: 6,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 72,
    paddingHorizontal: 36,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },

  // Active order cards
  mealCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  // Order confirmation banner (top of each active card)
  confirmationBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.warmBorder,
  },
  confirmationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confirmIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  confirmId: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 1,
  },
  confirmRoom: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  confirmRight: {
    alignItems: 'flex-end',
  },
  confirmPlacedLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  confirmPlacedTime: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },

  // 2-hour reminder row
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  reminderRowPending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  reminderRowReady: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  reminderRowText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  // Progress bar
  progressContainer: { marginBottom: 14 },
  progressTrack: {
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressSteps: { flexDirection: 'row', justifyContent: 'space-between' },
  progressStep: { alignItems: 'center', flex: 1 },
  progressDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.border,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressDotCurrent: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
  },
  progressStepLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Order meta row
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  orderLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  // Was a 32x32 icon-only tap target. Replaced with an explicit
  // "✕ Cancel order" pill so elderly users know what they're tapping —
  // a lone red trash icon reads as ambiguous/scary, especially when
  // it's their only visible action on the order.
  removeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  removeOrderBtnText: {
    color: COLORS.danger,
    fontWeight: '700',
  },

  // Meal rows
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  mealThumb: { width: 56, height: 56, borderRadius: 14 },
  mealThumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealRowInfo: { flex: 1 },
  mealName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  mealPeriod: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  mealCalBadge: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.warmBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mealCal: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // Expanded nutrition
  expandedSection: { marginTop: 10 },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 14 },
  nutritionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  nutritionGrid: { flexDirection: 'row', gap: 8 },
  nutritionItem: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nutritionValue: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  nutritionLabel: { fontSize: 11, fontWeight: '500', color: COLORS.textMuted, textAlign: 'center' },

  // Completed cards
  completedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    opacity: 0.88,
  },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  completedBadgeText: { fontSize: 12, fontWeight: '700', color: '#166534' },
  completedTime: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
  },
  completedThumb: { width: 38, height: 38, borderRadius: 10 },
  completedThumbPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedMealName: { fontSize: 15, color: COLORS.textMuted, flex: 1 },
  completionBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 12,
  },
  completionFill: { width: '100%', height: '100%', backgroundColor: '#22c55e', borderRadius: 3 },
  completionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    textAlign: 'center',
    marginTop: 8,
  },

  // Browse menu CTA
  browseMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 20,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  browseMenuText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // Undo banner
  undoBanner: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  undoBannerText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  undoBtn: {
    backgroundColor: '#4A7A60',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  undoBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Resident → Kitchen compose
  residentComposeSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  residentComposeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  residentComposeInput: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.text,
    minHeight: 40,
    maxHeight: 90,
  },
  residentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  residentCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Promoted from a small inline link to an explicit pill button.
  // "Message Kitchen" is a key support affordance — residents who
  // can't see it just don't reach out when something's wrong.
  residentComposeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.warmBorder,
  },
  residentComposeToggleText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Kitchen messages on order card
  kitchenMsgSection: {
    marginTop: 10,
    marginBottom: 2,
    borderTopWidth: 1,
    borderTopColor: '#E2DFD8',
    paddingTop: 10,
  },
  kitchenMsgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  kitchenMsgTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A5C2A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kitchenMsgBubble: {
    backgroundColor: '#F0EFE6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#DDD0B8',
  },
  kitchenMsgText: {
    color: '#1A1A1A',
    fontWeight: '500',
    lineHeight: 18,
  },
  kitchenMsgTime: {
    color: '#5C5C5C',
    marginTop: 4,
  },
});

export default UpcomingMealsScreen;
