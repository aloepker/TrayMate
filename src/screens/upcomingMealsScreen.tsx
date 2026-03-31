import React, { useState, useEffect } from 'react';
import Feather from 'react-native-vector-icons/Feather';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useCart } from './context/CartContext';
import type { Order } from './context/CartContext';
import { useSettings } from './context/SettingsContext';
import { translateMealName, translateMealPeriod } from '../services/mealLocalization';
import { getMealImage, getMealPlaceholder } from '../services/mealDisplayService';

<<<<<<< Updated upstream
// ── Warm olive palette (matches browse meals, cart, settings) ─────────────────
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
=======
const COLORS = {
  primary: '#717644',
  primaryLight: '#F4F3EE',
  surface: '#FFFFFF',
  background: '#FAF9F6',
  border: '#E8E6E1',
  text: '#1A1A1A',
  textMuted: '#5C5C5C',
  warmBorder: '#E8DCC8',
>>>>>>> Stashed changes
};

function UpcomingMealsScreen({ navigation, route }: any) {
  const { orders, updateOrderStatus, getOrdersForResident, fetchOrderHistory } = useCart();
  const { t, scaled, language, notifications, getTouchTargetSize, theme, setCurrentResidentId } = useSettings();
  const touchTarget = getTouchTargetSize();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const residentId = route?.params?.residentId as string | undefined;
  const residentName = route?.params?.residentName || 'Resident';
  const dietaryRestrictions: string[] = route?.params?.dietaryRestrictions ?? [];

  useEffect(() => {
    setCurrentResidentId(route?.params?.residentId ?? null);
  }, [route?.params?.residentId, setCurrentResidentId]);

  useEffect(() => {
<<<<<<< Updated upstream
    if (residentId) fetchOrderHistory(residentId);
  }, [residentId]);
=======
    if (residentId) {
      fetchOrderHistory(residentId);
    }
  }, [fetchOrderHistory, residentId]);
>>>>>>> Stashed changes

  const residentOrders = residentId ? getOrdersForResident(residentId) : orders;

  // ── Status config — olive-toned colours ──────────────────────────────────────
  const statusConfig: Record<
    Order['status'],
    { label: string; color: string; bg: string; featherIcon: string; progress: number }
  > = {
    confirmed: {
      label: t.confirmed,
<<<<<<< Updated upstream
      color: COLORS.primary,
      bg:    COLORS.primaryLight,
=======
      color: '#1d4ed8',
      bg: '#dbeafe',
>>>>>>> Stashed changes
      featherIcon: 'check-circle',
      progress: 0.25,
    },
    preparing: {
      label: t.preparing,
      color: '#b45309',
<<<<<<< Updated upstream
      bg:    '#fef3c7',
=======
      bg: '#fef3c7',
>>>>>>> Stashed changes
      featherIcon: 'clock',
      progress: 0.5,
    },
    ready: {
      label: t.ready,
      color: '#15803d',
<<<<<<< Updated upstream
      bg:    '#dcfce7',
=======
      bg: '#dcfce7',
>>>>>>> Stashed changes
      featherIcon: 'check-circle',
      progress: 0.75,
    },
    completed: {
      label: t.completed,
      color: '#166534',
<<<<<<< Updated upstream
      bg:    '#bbf7d0',
=======
      bg: '#bbf7d0',
>>>>>>> Stashed changes
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
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return t.today;
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return t.tomorrow;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const activeOrders    = residentOrders.filter((o) => o.status !== 'completed');
  const completedOrders = residentOrders.filter((o) => o.status === 'completed');
  const backLabel = t.back?.replace(/^[\s\u2190\u21A9\u2B05]+/, '') || 'Back';

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
<<<<<<< Updated upstream
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
=======
        <TouchableOpacity onPress={handleBack} style={[styles.backButton, { minHeight: touchTarget }]}>
          <Feather name="chevron-left" size={22} color={COLORS.primary} />
          <Text style={[styles.backText, { fontSize: scaled(16) }]}>{backLabel}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { fontSize: scaled(24) }]}>{t.upcomingMeals}</Text>
>>>>>>> Stashed changes
        </View>
        <TouchableOpacity
          style={[styles.settingsButton, { minHeight: touchTarget, minWidth: touchTarget }]}
          onPress={() => navigation.navigate('Settings')}
        >
<<<<<<< Updated upstream
          <Feather name="settings" size={20} color={COLORS.primary} />
=======
          <Feather name="settings" size={22} color={COLORS.primary} />
>>>>>>> Stashed changes
        </TouchableOpacity>
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
<<<<<<< Updated upstream
              <Feather name="calendar" size={44} color={COLORS.primary} />
            </View>
            <Text style={[styles.emptyTitle, { fontSize: scaled(22) }]}>{t.noUpcoming}</Text>
            <Text style={[styles.emptyText, { fontSize: scaled(15) }]}>{t.noUpcomingDesc}</Text>
=======
              <Feather name="calendar" size={48} color={COLORS.primary} />
            </View>
            <Text style={[styles.emptyTitle, { fontSize: scaled(22) }]}>{t.noUpcoming}</Text>
            <Text style={[styles.emptyText, { fontSize: scaled(15), lineHeight: scaled(22) }]}>
              {t.noUpcomingDesc}
            </Text>
>>>>>>> Stashed changes
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('BrowseMealOptions', { residentId, residentName, dietaryRestrictions })}
            >
<<<<<<< Updated upstream
              <Feather name="book-open" size={17} color="#FFF" />
=======
              <Feather name="book-open" size={18} color="#FFFFFF" />
>>>>>>> Stashed changes
              <Text style={[styles.browseButtonText, { fontSize: scaled(16) }]}>{t.browseMenu}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Meal reminder banner */}
            {notifications.mealReminders && activeOrders.length > 0 && (
              <View style={styles.reminderBanner}>
<<<<<<< Updated upstream
                <Feather name="bell" size={14} color="#92400E" />
                <Text style={[styles.reminderText, { fontSize: scaled(13) }]}>
                  {t.mealReminders}: {t.mealRemindersDesc}
                </Text>
=======
                <Text style={[styles.reminderText, { fontSize: scaled(13) }]}>{t.mealReminders}: {t.mealRemindersDesc}</Text>
>>>>>>> Stashed changes
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

                  return (
                    <TouchableOpacity
                      key={order.id}
                      style={styles.mealCard}
                      onPress={() => toggleExpand(order.id)}
                      activeOpacity={0.85}
                    >
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
<<<<<<< Updated upstream
                                  {isActive && (
                                    <Feather name="check" size={9} color="#FFF" />
                                  )}
=======
                                  {isActive && <Feather name="check" size={11} color="#FFFFFF" />}
>>>>>>> Stashed changes
                                </View>
                                <Text
                                  style={[
                                    styles.progressStepLabel,
                                    { fontSize: scaled(10) },
<<<<<<< Updated upstream
                                    isCurrent && { color: statusInfo.color, fontWeight: '700' },
=======
                                    isCurrent && styles.progressStepLabelCurrent,
                                    isCurrent && {
                                      color: statusInfo.color,
                                    },
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                            <Feather name={statusInfo.featherIcon} size={11} color={statusInfo.color} />
                            <Text style={[styles.statusText, { fontSize: scaled(12), color: statusInfo.color }]}>
=======
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: statusInfo.bg },
                            ]}
                          >
                            <Feather name={statusInfo.featherIcon} size={12} color={statusInfo.color} />
                            <Text
                              style={[
                                styles.statusText,
                                { fontSize: scaled(12) },
                                { color: statusInfo.color },
                              ]}
                            >
>>>>>>> Stashed changes
                              {statusInfo.label}
                            </Text>
                          </View>
                        </View>
<<<<<<< Updated upstream
                        <Feather
                          name={expanded ? 'chevron-down' : 'chevron-right'}
                          size={20}
                          color={COLORS.textMuted}
                        />
                      </View>

                      {/* Meal rows */}
                      {order.items.map((item, idx) => {
                        const img = getMealImage(item.name);
                        const ph  = getMealPlaceholder(item.name);
                        return (
                          <View key={`${item.id}-${idx}`} style={styles.mealRow}>
                            {img ? (
                              <Image source={img} style={styles.mealThumb} />
=======
                        <Feather name={expanded ? 'chevron-down' : 'chevron-right'} size={22} color={COLORS.textMuted} />
                      </View>

                      {/* Meal items list */}
                      {order.items.map((item, idx) => {
                        const mealImg = getMealImage(item.name);
                        const ph = getMealPlaceholder(item.name);
                        return (
                          <View key={`${item.id}-${idx}`} style={styles.mealRow}>
                            {mealImg ? (
                              <Image source={mealImg} style={styles.mealThumb} />
>>>>>>> Stashed changes
                            ) : (
                              <View style={[styles.mealThumbPlaceholder, { backgroundColor: ph.bg }]}>
                                <Feather name="coffee" size={18} color={COLORS.primary} />
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
<<<<<<< Updated upstream
                              <Text style={[styles.mealCal, { fontSize: scaled(13) }]}>
                                {item.kcal} kcal
                              </Text>
=======
                              <Text style={[styles.mealCal, { fontSize: scaled(13) }]}>{item.kcal} kcal</Text>
>>>>>>> Stashed changes
                            </View>
                          </View>
                        );
                      })}

                      {/* Expanded nutrition — NO advance-status button for residents */}
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
<<<<<<< Updated upstream
                        <Text style={[styles.completedBadgeText, { fontSize: scaled(12) }]}>{t.completed}</Text>
=======
                        <Text style={[styles.completedBadgeText, { fontSize: scaled(12) }]}>
                          {t.completed}
                        </Text>
>>>>>>> Stashed changes
                      </View>
                      <Text style={[styles.completedTime, { fontSize: scaled(13) }]}>
                        {formatDate(order.placedAt)}
                      </Text>
                    </View>
                    {order.items.map((item, idx) => {
<<<<<<< Updated upstream
                      const img = getMealImage(item.name);
                      return (
                        <View key={`${item.id}-${idx}`} style={styles.completedRow}>
                          {img ? (
                            <Image source={img} style={styles.completedThumb} />
                          ) : (
                            <View style={styles.completedThumbPlaceholder}>
=======
                      const mealImg = getMealImage(item.name);
                      const ph = getMealPlaceholder(item.name);
                      return (
                        <View
                          key={`${item.id}-${idx}`}
                          style={styles.completedRow}
                        >
                          {mealImg ? (
                            <Image source={mealImg} style={styles.completedThumb} />
                          ) : (
                            <View style={[styles.completedThumbPlaceholder, { backgroundColor: ph.bg }]}>
>>>>>>> Stashed changes
                              <Feather name="coffee" size={14} color={COLORS.primary} />
                            </View>
                          )}
                          <Text style={[styles.completedMealName, { fontSize: scaled(15) }]}>
                            {translateMealName(item.name, language)}
                          </Text>
                        </View>
                      );
                    })}
<<<<<<< Updated upstream
=======
                    {/* Completion bar */}
>>>>>>> Stashed changes
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
              onPress={() => navigation.navigate('BrowseMealOptions', { residentId, residentName, dietaryRestrictions })}
              activeOpacity={0.8}
            >
<<<<<<< Updated upstream
              <Feather name="book-open" size={20} color="#FFF" />
=======
              <Feather name="book-open" size={18} color="#FFFFFF" />
>>>>>>> Stashed changes
              <Text style={[styles.browseMenuText, { fontSize: scaled(16) }]}>{t.browseMenu}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
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
<<<<<<< Updated upstream
    paddingHorizontal: 16,
    paddingTop: 8,
=======
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
>>>>>>> Stashed changes
    paddingBottom: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    flexDirection: 'row',
<<<<<<< Updated upstream
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

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 36, paddingTop: 16 },

  // Reminder banner
  reminderBanner: {
    flexDirection: 'row',
=======
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 8,
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
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
>>>>>>> Stashed changes
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
<<<<<<< Updated upstream
  reminderText: {
    color: '#92400E',
    fontWeight: '600',
=======
  scrollView: {
>>>>>>> Stashed changes
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
  reminderBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  reminderText: {
    color: '#92400E',
    fontWeight: '600',
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
<<<<<<< Updated upstream
=======
    paddingTop: 80,
    paddingHorizontal: 40,
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
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    backgroundColor: COLORS.primary,
=======
    backgroundColor: '#717644',
>>>>>>> Stashed changes
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
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
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
  progressStepLabelCurrent: {
    fontWeight: '700',
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
<<<<<<< Updated upstream
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '700' },

  // Meal rows
=======
    gap: 10,
    flex: 1,
  },
  orderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Meal rows within an order
>>>>>>> Stashed changes
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
<<<<<<< Updated upstream
  mealThumb: { width: 56, height: 56, borderRadius: 14 },
=======
  mealThumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
>>>>>>> Stashed changes
  mealThumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
<<<<<<< Updated upstream
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
=======
  mealRowInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  mealPeriod: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  mealCal: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  mealCalBadge: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    gap: 5,
=======
    gap: 6,
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
  completedThumb: { width: 38, height: 38, borderRadius: 10 },
  completedThumbPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
=======
  completedThumb: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  completedThumbPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedMealName: {
    fontSize: 15,
    color: COLORS.textMuted,
    flex: 1,
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
  browseMenuText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
=======
  browseMenuText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
>>>>>>> Stashed changes
});

export default UpcomingMealsScreen;
