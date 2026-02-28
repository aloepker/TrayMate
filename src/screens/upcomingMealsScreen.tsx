import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useCart } from './context/CartContext';
import type { Order } from './context/CartContext';
import { useSettings } from './context/SettingsContext';
import { translateMealName, translateMealPeriod } from '../services/mealLocalization';

// Emoji placeholders for meals (same as browse screen)
const MEAL_EMOJIS: Record<string, string> = {
  'Banana-Chocolate Pancakes': '🥞',
  'Broccoli-Cheddar Quiche': '🥧',
  'Caesar Salad with Chicken': '🥗',
  'Citrus Butter Salmon': '🐟',
  'Chicken Bruschetta': '🍗',
  'Breakfast Banana Split': '🍌',
  'Herb Baked Chicken': '🍗',
  'Garden Vegetable Medley': '🥦',
  'Strawberry Belgian Waffle': '🧇',
  'Spring Menu Special': '🌸',
  'Grilled Salmon Fillet': '🐟',
  'Oatmeal Bowl': '🥣',
};

function UpcomingMealsScreen({ navigation }: any) {
  const { orders, updateOrderStatus } = useCart();
  const { t, scaled, language, notifications, getTouchTargetSize, theme } = useSettings();
  const touchTarget = getTouchTargetSize();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const statusConfig: Record<
    Order['status'],
    { label: string; color: string; bg: string; icon: string; progress: number }
  > = {
    confirmed: {
      label: t.confirmed,
      color: '#1d4ed8',
      bg: '#dbeafe',
      icon: '✓',
      progress: 0.25,
    },
    preparing: {
      label: t.preparing,
      color: '#b45309',
      bg: '#fef3c7',
      icon: '🍳',
      progress: 0.5,
    },
    ready: {
      label: t.ready,
      color: '#15803d',
      bg: '#dcfce7',
      icon: '✓',
      progress: 0.75,
    },
    completed: {
      label: t.completed,
      color: '#166534',
      bg: '#bbf7d0',
      icon: '✓',
      progress: 1.0,
    },
  };

  const statusSteps = [t.confirmed, t.preparing, t.ready, t.completed];

  const toggleExpand = (id: string) => {
    setExpandedId((curr) => (curr === id ? null : id));
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return t.today;
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return t.tomorrow;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Cycle to next status for demo
  const advanceStatus = (order: Order) => {
    const statusOrder: Order['status'][] = [
      'confirmed',
      'preparing',
      'ready',
      'completed',
    ];
    const currentIndex = statusOrder.indexOf(order.status);
    if (currentIndex < statusOrder.length - 1) {
      const nextStatus = statusOrder[currentIndex + 1];
      updateOrderStatus(order.id, nextStatus);
      if (notifications.orderUpdates) {
        Alert.alert(t.orderUpdates, `${t.upcomingMeals}: ${statusConfig[nextStatus].label}`);
      }
    }
  };

  const activeOrders = orders.filter((o) => o.status !== 'completed');
  const completedOrders = orders.filter((o) => o.status === 'completed');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={[styles.backButton, { minHeight: touchTarget, minWidth: touchTarget }]}>
          <View style={styles.backArrow}>
            <View style={styles.backArrowLine1} />
            <View style={styles.backArrowLine2} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scaled(24) }]}>{t.upcomingMeals}</Text>
        <TouchableOpacity
          style={[styles.settingsButton, { minHeight: touchTarget, minWidth: touchTarget }]}
          onPress={handleSettings}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyTitle, { fontSize: scaled(22) }]}>{t.noUpcoming}</Text>
            <Text style={[styles.emptyText, { fontSize: scaled(15), lineHeight: scaled(22) }]}>
              {t.noUpcomingDesc}
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('BrowseMealOptions')}
            >
              <Text style={[styles.browseButtonText, { fontSize: scaled(16) }]}>{t.browseMenu}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {notifications.mealReminders && activeOrders.length > 0 && (
              <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <Text style={{ color: '#92400E', fontWeight: '600', fontSize: scaled(13) }}>{t.mealReminders}: {t.mealRemindersDesc}</Text>
              </View>
            )}
            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, { fontSize: scaled(16) }]}>{t.activeOrdersLabel}</Text>
                {activeOrders.map((order) => {
                  const expanded = expandedId === order.id;
                  const statusInfo = statusConfig[order.status];

                  return (
                    <TouchableOpacity
                      key={order.id}
                      style={styles.mealCard}
                      onPress={() => toggleExpand(order.id)}
                      activeOpacity={0.8}
                    >
                      {/* Status progress bar */}
                      <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${statusInfo.progress * 100}%`,
                                backgroundColor: statusInfo.color,
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.progressSteps}>
                          {statusSteps.map((step, i) => {
                            const stepProgress = (i + 1) / statusSteps.length;
                            const isActive =
                              statusInfo.progress >= stepProgress;
                            const isCurrent = step === statusInfo.label;
                            return (
                              <View key={step} style={styles.progressStep}>
                                <View
                                  style={[
                                    styles.progressDot,
                                    isActive && {
                                      backgroundColor: statusInfo.color,
                                      borderColor: statusInfo.color,
                                    },
                                    isCurrent && styles.progressDotCurrent,
                                  ]}
                                >
                                  {isActive && (
                                    <Text style={styles.progressDotCheck}>
                                      ✓
                                    </Text>
                                  )}
                                </View>
                                <Text
                                  style={[
                                    styles.progressStepLabel,
                                    { fontSize: scaled(10) },
                                    isCurrent && {
                                      color: statusInfo.color,
                                      fontWeight: '700',
                                    },
                                  ]}
                                >
                                  {step}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      {/* Order header */}
                      <View style={styles.mealHeader}>
                        <View style={styles.mealInfo}>
                          <Text style={[styles.orderLabel, { fontSize: scaled(14) }]}>
                            {formatDate(order.placedAt)} ·{' '}
                            {formatTime(order.placedAt)}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: statusInfo.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                { fontSize: scaled(12) },
                                { color: statusInfo.color },
                              ]}
                            >
                              {statusInfo.icon} {statusInfo.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.chevron, { fontSize: scaled(24) }]}>
                          {expanded ? '‹' : '›'}
                        </Text>
                      </View>

                      {/* Meal items list */}
                      {order.items.map((item, idx) => (
                        <View key={`${item.id}-${idx}`} style={styles.mealRow}>
                          <Text style={styles.mealEmoji}>
                            {MEAL_EMOJIS[item.name] || '🍽'}
                          </Text>
                          <View style={styles.mealRowInfo}>
                            <Text style={[styles.mealName, { fontSize: scaled(16) }]}>
                              {translateMealName(item.name, language)}
                            </Text>
                            <Text style={[styles.mealPeriod, { fontSize: scaled(13) }]}>
                              {translateMealPeriod(item.meal_period, language)}
                            </Text>
                          </View>
                          <Text style={[styles.mealCal, { fontSize: scaled(14) }]}>{item.kcal} {t.calories}</Text>
                        </View>
                      ))}

                      {/* Expanded details */}
                      {expanded && (
                        <View style={styles.expandedSection}>
                          <View style={styles.divider} />

                          {/* Nutrition summary */}
                          <View style={styles.nutritionSection}>
                            <Text style={[styles.nutritionTitle, { fontSize: scaled(13) }]}>
                              {t.orderNutrition}
                            </Text>
                            <View style={styles.nutritionGrid}>
                              <View style={styles.nutritionItem}>
                                <Text style={[styles.nutritionValue, { fontSize: scaled(16) }]}>
                                  {order.totalNutrition.calories}
                                </Text>
                                <Text style={[styles.nutritionLabel, { fontSize: scaled(11) }]}>
                                  {t.calories}
                                </Text>
                              </View>
                              <View style={styles.nutritionItem}>
                                <Text style={[styles.nutritionValue, { fontSize: scaled(16) }]}>
                                  {order.totalNutrition.sodium}mg
                                </Text>
                                <Text style={[styles.nutritionLabel, { fontSize: scaled(11) }]}>
                                  {t.sodium}
                                </Text>
                              </View>
                              <View style={styles.nutritionItem}>
                                <Text style={[styles.nutritionValue, { fontSize: scaled(16) }]}>
                                  {order.totalNutrition.protein}g
                                </Text>
                                <Text style={[styles.nutritionLabel, { fontSize: scaled(11) }]}>
                                  {t.protein}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Action button to advance status (for demo) */}
                          {order.status !== 'completed' && (
                            <TouchableOpacity
                              style={[
                                styles.advanceButton,
                                { backgroundColor: statusInfo.color },
                              ]}
                              onPress={() => advanceStatus(order)}
                            >
                              <Text style={[styles.advanceButtonText, { fontSize: scaled(15) }]}>
                                {order.status === 'confirmed'
                                  ? t.startPreparing
                                  : order.status === 'preparing'
                                    ? t.markReady
                                    : t.markCompleted}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {/* Completed Orders */}
            {completedOrders.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, { fontSize: scaled(16) }]}>{t.completed}</Text>
                {completedOrders.map((order) => (
                  <View key={order.id} style={styles.completedCard}>
                    <View style={styles.completedHeader}>
                      <View style={styles.completedBadge}>
                        <Text style={[styles.completedBadgeText, { fontSize: scaled(12) }]}>
                          ✓ {t.completed}
                        </Text>
                      </View>
                      <Text style={[styles.completedTime, { fontSize: scaled(13) }]}>
                        {formatDate(order.placedAt)}
                      </Text>
                    </View>
                    {order.items.map((item, idx) => (
                      <View
                        key={`${item.id}-${idx}`}
                        style={styles.completedRow}
                      >
                        <Text style={styles.mealEmoji}>
                          {MEAL_EMOJIS[item.name] || '🍽'}
                        </Text>
                        <Text style={[styles.completedMealName, { fontSize: scaled(15) }]}>
                          {translateMealName(item.name, language)}
                        </Text>
                      </View>
                    ))}
                    {/* Completion bar */}
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  backArrow: {
    width: 12,
    height: 12,
    marginLeft: 3,
  },
  backArrowLine1: {
    position: 'absolute',
    width: 10,
    height: 2,
    backgroundColor: '#717644',
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }, { translateX: 1 }, { translateY: 3 }],
  },
  backArrowLine2: {
    position: 'absolute',
    width: 10,
    height: 2,
    backgroundColor: '#717644',
    borderRadius: 1,
    transform: [{ rotate: '45deg' }, { translateX: 1 }, { translateY: 7 }],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4A4A4A',
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  settingsIcon: {
    fontSize: 24,
    color: '#717644',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  // Section headers
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8A8A8A',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  browseButton: {
    backgroundColor: '#717644',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Meal cards (active)
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  // Progress bar
  progressContainer: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E8E4DE',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E8E4DE',
    borderWidth: 2,
    borderColor: '#E8E4DE',
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
  progressDotCheck: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  progressStepLabel: {
    fontSize: 10,
    color: '#8A8A8A',
    fontWeight: '500',
  },

  // Order header
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  orderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 24,
    color: '#cbc2b4',
    fontWeight: '300',
  },

  // Meal rows within an order
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  mealEmoji: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  mealRowInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  mealPeriod: {
    fontSize: 13,
    color: '#8A8A8A',
    marginTop: 2,
  },
  mealCal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A8A8A',
  },

  // Expanded section
  expandedSection: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E4DE',
    marginBottom: 16,
  },

  // Nutrition grid
  nutritionSection: {
    marginBottom: 16,
  },
  nutritionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  nutritionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  nutritionItem: {
    flex: 1,
    backgroundColor: '#F5F3EF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E4DE',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 2,
  },
  nutritionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8A8A8A',
    textAlign: 'center',
  },

  // Advance status button (demo)
  advanceButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  advanceButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Completed orders
  completedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E4DE',
    opacity: 0.85,
  },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  completedBadge: {
    backgroundColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  completedTime: {
    fontSize: 13,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  completedMealName: {
    fontSize: 15,
    color: '#6A6A6A',
    flex: 1,
  },
  completionBar: {
    height: 8,
    backgroundColor: '#E8E4DE',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 12,
  },
  completionFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  completionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default UpcomingMealsScreen;
