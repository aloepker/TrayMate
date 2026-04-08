import React, { useState, useEffect, useRef } from 'react';
import Feather from 'react-native-vector-icons/Feather';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import type { Order } from './context/CartContext';
import { useCart } from './context/CartContext';
import { useSettings } from './context/SettingsContext';
import { translateMealName, translateMealPeriod } from '../services/mealLocalization';
import { getMealImage, getMealPlaceholder } from '../services/mealDisplayService';

// ── Warm olive palette ────────────────────────────────────────────────────────
const COLORS = {
  primary:      '#717644',
  primaryLight: '#F0EFE6',
  background:   '#F5F3EE',
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
function estimatedReadyTime(placedAt: Date): string {
  const d = new Date(placedAt);
  d.setHours(d.getHours() + 2);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Returns how many minutes until the estimated ready time; negative if past. */
function minutesUntilReady(placedAt: Date): number {
  const ready = new Date(placedAt);
  ready.setHours(ready.getHours() + 2);
  return Math.round((ready.getTime() - Date.now()) / 60000);
}

function UpcomingMealsScreen({ navigation, route }: any) {
  const { orders, getOrdersForResident, fetchOrderHistory, clearAllOrders, removeOrder } = useCart();
  const { t, scaled, language, notifications, getTouchTargetSize, setCurrentResidentId } = useSettings();
  const touchTarget = getTouchTargetSize();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Soft-delete / undo state ───────────────────────────────────────────────
  // pendingDeleteIds: orders visually hidden but not yet deleted from backend
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  // undoBanner: shown for 5s after a soft-delete
  const [undoBanner, setUndoBanner] = useState<{ label: string; onUndo: () => void } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoFadeAnim = useRef(new Animated.Value(0)).current;

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
  const dietaryRestrictions: string[] = route?.params?.dietaryRestrictions ?? [];
  const foodAllergies: string[] = route?.params?.foodAllergies ?? [];

  useEffect(() => {
    setCurrentResidentId(route?.params?.residentId ?? null);
  }, [route?.params?.residentId, setCurrentResidentId]);

  useEffect(() => {
    if (!residentId) return;
    fetchOrderHistory(residentId);
    const unsub = navigation.addListener('focus', () => fetchOrderHistory(residentId));
    return unsub;
  }, [fetchOrderHistory, residentId, navigation]);

  // ── Only show today's orders, excluding soft-deleted ones ─────────────────
  const allResidentOrders = residentId ? getOrdersForResident(residentId) : orders;
  const residentOrders    = allResidentOrders
    .filter((o) => isToday(o.placedAt))
    .filter((o) => !pendingDeleteIds.has(o.id));

  const activeOrders    = residentOrders.filter((o) => o.status !== 'completed');
  const completedOrders = residentOrders.filter((o) => o.status === 'completed');

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
  };

  const statusSteps = [t.confirmed, t.preparing, t.ready, t.completed];

  const toggleExpand = (id: string) =>
    setExpandedId((curr) => (curr === id ? null : id));

  const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { minHeight: touchTarget }]}
        >
          <Feather name="chevron-left" size={22} color={COLORS.primary} />
          <Text style={[styles.backText, { fontSize: scaled(16) }]}>
            {t.back?.replace(/^[\s\u2190\u21A9\u2B05]+/, '') || 'Back'}
          </Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { fontSize: scaled(22) }]}>{t.upcomingMeals}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {residentOrders.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll}>
              <Feather name="trash-2" size={17} color={COLORS.danger} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.settingsButton, { minHeight: touchTarget, minWidth: touchTarget }]}
            onPress={() => navigation.navigate('Settings')}
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
            {/* Meal reminder banner */}
            {notifications.mealReminders && activeOrders.length > 0 && (
              <View style={styles.reminderBanner}>
                <Feather name="bell" size={14} color="#92400E" />
                <Text style={[styles.reminderText, { fontSize: scaled(13) }]}>
                  {t.mealReminders}: {t.mealRemindersDesc}
                </Text>
              </View>
            )}

            {/* ── Active Orders ── */}
            {activeOrders.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, { fontSize: scaled(13) }]}>
                  {t.activeOrdersLabel}
                </Text>

                {activeOrders.map((order) => {
                  const expanded   = expandedId === order.id;
                  const statusInfo = statusConfig[order.status];
                  const minsLeft   = minutesUntilReady(order.placedAt);
                  const estReady   = estimatedReadyTime(order.placedAt);
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
                            <Text style={styles.confirmTitle}>Order Confirmed</Text>
                            <Text style={styles.confirmId}>#{order.backendId ?? order.id.slice(-6).toUpperCase()}</Text>
                          </View>
                        </View>
                        <View style={styles.confirmRight}>
                          <Text style={styles.confirmPlacedLabel}>Placed at</Text>
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
                            Est. ready by {estReady} · Should be ready soon
                          </Text>
                        ) : minsLeft <= 30 ? (
                          <Text style={[styles.reminderRowText, { color: '#b45309' }]}>
                            Ready in ~{minsLeft} min · Est. {estReady}
                          </Text>
                        ) : (
                          <Text style={[styles.reminderRowText, { color: '#b45309' }]}>
                            2-hr reminder · Est. ready by {estReady}
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
                          <TouchableOpacity
                            style={styles.removeOrderBtn}
                            onPress={(e) => { e.stopPropagation?.(); handleRemoveOrder(order.id); }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Feather name="trash-2" size={15} color={COLORS.danger} />
                          </TouchableOpacity>
                          <Feather
                            name={expanded ? 'chevron-down' : 'chevron-right'}
                            size={20}
                            color={COLORS.textMuted}
                          />
                        </View>
                      </View>

                      {/* Meal rows */}
                      {order.items.map((item, idx) => {
                        const img = getMealImage(item.name);
                        const ph  = getMealPlaceholder(item.name);
                        return (
                          <View key={`${item.id}-${idx}`} style={styles.mealRow}>
                            {img ? (
                              <Image source={img} style={styles.mealThumb} />
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
                            <View style={styles.mealCalBadge}>
                              <Text style={[styles.mealCal, { fontSize: scaled(13) }]}>
                                {item.kcal} kcal
                              </Text>
                            </View>
                          </View>
                        );
                      })}

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
                })}
              </>
            )}

            {/* ── Completed Orders ── */}
            {completedOrders.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, { fontSize: scaled(13) }]}>{t.completed}</Text>
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
                      const ph  = getMealPlaceholder(item.name);
                      return (
                        <View key={`${item.id}-${idx}`} style={styles.completedRow}>
                          {img ? (
                            <Image source={img} style={styles.completedThumb} />
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
            <Text style={styles.undoBtnText}>Undo</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
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

  // Reminder banner (notifications setting)
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  reminderText: {
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },

  // Section headers
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
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
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 1,
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
  removeOrderBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
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
});

export default UpcomingMealsScreen;
