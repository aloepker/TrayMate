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
    if (residentId) fetchOrderHistory(residentId);
  }, [residentId]);

  const residentOrders = residentId ? getOrdersForResident(residentId) : orders;

  // ── Status config — olive-toned colours ──────────────────────────────────────
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
        <TouchableOpacity
          style={[styles.settingsButton, { minHeight: touchTarget, minWidth: touchTarget }]}
          onPress={() => navigation.navigate('Settings')}
        >
          <Feather name="settings" size={20} color={COLORS.primary} />
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
              <Feather name="calendar" size={44} color={COLORS.primary} />
            </View>
            <Text style={[styles.emptyTitle, { fontSize: scaled(22) }]}>{t.noUpcoming}</Text>
            <Text style={[styles.emptyText, { fontSize: scaled(15) }]}>{t.noUpcomingDesc}</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('BrowseMealOptions', { residentId, residentName, dietaryRestrictions })}
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
                                  {isActive && (
                                    <Feather name="check" size={9} color="#FFF" />
                                  )}
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
                            <Feather name={statusInfo.featherIcon} size={11} color={statusInfo.color} />
                            <Text style={[styles.statusText, { fontSize: scaled(12), color: statusInfo.color }]}>
                              {statusInfo.label}
                            </Text>
                          </View>
                        </View>
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
                              <Text style={[styles.mealCal, { fontSize: scaled(13) }]}>
                                {item.kcal} kcal
                              </Text>
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
                        <Text style={[styles.completedBadgeText, { fontSize: scaled(12) }]}>{t.completed}</Text>
                      </View>
                      <Text style={[styles.completedTime, { fontSize: scaled(13) }]}>
                        {formatDate(order.placedAt)}
                      </Text>
                    </View>
                    {order.items.map((item, idx) => {
                      const img = getMealImage(item.name);
                      return (
                        <View key={`${item.id}-${idx}`} style={styles.completedRow}>
                          {img ? (
                            <Image source={img} style={styles.completedThumb} />
                          ) : (
                            <View style={styles.completedThumbPlaceholder}>
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
              onPress={() => navigation.navigate('BrowseMealOptions', { residentId, residentName, dietaryRestrictions })}
              activeOpacity={0.8}
            >
              <Feather name="book-open" size={20} color="#FFF" />
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

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 36, paddingTop: 16 },

  // Reminder banner
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
});

export default UpcomingMealsScreen;
