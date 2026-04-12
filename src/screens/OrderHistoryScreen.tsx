import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useCart, Order } from './context/CartContext';
import { useSettings } from './context/SettingsContext';

// ─── Meal period config ────────────────────────────────────────────────────
const PERIOD_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  Breakfast: { label: 'Breakfast', color: '#92400E', bg: '#FEF3C7', icon: 'sunrise' },
  Lunch:     { label: 'Lunch',     color: '#065F46', bg: '#D1FAE5', icon: 'sun' },
  Dinner:    { label: 'Dinner',    color: '#3730A3', bg: '#E0E7FF', icon: 'moon' },
  Drinks:    { label: 'Drinks',    color: '#1E40AF', bg: '#DBEAFE', icon: 'coffee' },
  Sides:     { label: 'Sides',     color: '#9D174D', bg: '#FCE7F3', icon: 'package' },
};

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  confirmed:              { label: 'Confirmed',     color: '#15803D', bg: '#DCFCE7', icon: 'check-circle' },
  preparing:              { label: 'Preparing',     color: '#B45309', bg: '#FEF3C7', icon: 'clock' },
  ready:                  { label: 'Ready',         color: '#0369A1', bg: '#E0F2FE', icon: 'check-circle' },
  completed:              { label: 'Completed',     color: '#166534', bg: '#BBF7D0', icon: 'check' },
  cancelled:              { label: 'Cancelled',     color: '#DC2626', bg: '#FEE2E2', icon: 'x-circle' },
  substitution_requested: { label: 'Substituted',   color: '#C2410C', bg: '#FFEDD5', icon: 'refresh-cw' },
};

type FilterTab = 'all' | 'active' | 'cancelled';

const PERIOD_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Sides'];

/** Derive the dominant meal period from order items */
function getDominantPeriod(items: Order['items']): string {
  if (!items || items.length === 0) return 'Lunch';
  const counts: Record<string, number> = {};
  items.forEach((m) => { counts[m.meal_period] = (counts[m.meal_period] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/** Group items by their meal_period for display */
function groupItemsByPeriod(items: Order['items']): Record<string, Order['items']> {
  return items.reduce((acc, item) => {
    const p = item.meal_period;
    if (!acc[p]) acc[p] = [];
    acc[p].push(item);
    return acc;
  }, {} as Record<string, Order['items']>);
}

export default function OrderHistoryScreen({ navigation, route }: any) {
  const { orders, getOrdersForResident, fetchOrderHistory, removeOrder } = useCart();
  const { scaled, theme, getTouchTargetSize } = useSettings();
  const touchTarget = getTouchTargetSize();
  const [tab, setTab] = useState<FilterTab>('all');

  const residentId = route?.params?.residentId as string | undefined;
  const residentName = route?.params?.residentName as string | undefined;

  useEffect(() => {
    if (residentId) fetchOrderHistory(residentId);
  }, [residentId, fetchOrderHistory]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const allOrders = residentId ? getOrdersForResident(residentId) : orders;
  const recentOrders = allOrders
    .filter((o) => new Date(o.placedAt) >= thirtyDaysAgo)
    .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());

  // Filter by tab
  const filtered = recentOrders.filter((o) => {
    const s = o.status ?? 'confirmed';
    if (tab === 'active') return s !== 'cancelled';
    if (tab === 'cancelled') return s === 'cancelled';
    return true;
  });

  // Counts for tab badges
  const countAll = recentOrders.length;
  const countActive = recentOrders.filter((o) => (o.status ?? 'confirmed') !== 'cancelled').length;
  const countCancelled = recentOrders.filter((o) => o.status === 'cancelled').length;

  const handleDelete = (order: Order) => {
    Alert.alert(
      'Delete Order',
      'Remove this order from your history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeOrder(order.id) },
      ],
    );
  };

  const TABS: { key: FilterTab; label: string; count: number; color: string }[] = [
    { key: 'all',       label: 'All',       count: countAll,       color: '#717644' },
    { key: 'active',    label: 'Active',    count: countActive,    color: '#15803D' },
    { key: 'cancelled', label: 'Cancelled', count: countCancelled, color: '#DC2626' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { minHeight: touchTarget }]}
        >
          <Feather name="chevron-left" size={22} color="#717644" />
          <Text style={[styles.backText, { fontSize: scaled(16) }]}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { fontSize: scaled(20), color: theme.textPrimary }]}>Order History</Text>
          <Text style={[styles.headerSub, { fontSize: scaled(12), color: theme.textSecondary }]}>
            Last 30 days · {residentName ?? 'Resident'}
          </Text>
        </View>
        <View style={{ width: 70 }} />
      </View>

      {/* Filter Tabs */}
      <View style={[styles.tabRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, active && { borderBottomColor: t.color, borderBottomWidth: 2 }]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabLabel, { color: active ? t.color : theme.textSecondary, fontSize: scaled(14) }]}>
                {t.label}
              </Text>
              <View style={[styles.tabBadge, { backgroundColor: active ? t.color : '#E5E7EB' }]}>
                <Text style={[styles.tabBadgeText, { color: active ? '#FFF' : '#6B7280' }]}>
                  {t.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconCircle}>
            <Feather name={tab === 'cancelled' ? 'x-circle' : 'rotate-ccw'} size={36} color="#717644" />
          </View>
          <Text style={[styles.emptyTitle, { fontSize: scaled(18), color: theme.textPrimary }]}>
            {tab === 'cancelled' ? 'No cancelled orders' : 'No orders yet'}
          </Text>
          <Text style={[styles.emptyDesc, { fontSize: scaled(13), color: theme.textSecondary }]}>
            {tab === 'cancelled'
              ? 'Cancelled orders will appear here.'
              : 'Orders you place will appear here for 30 days.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.map((order) => {
            const status = (order.status ?? 'confirmed') as string;
            const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.confirmed;
            const isCancelled = status === 'cancelled';
            const isSubstituted = status === 'substitution_requested';
            const grouped = groupItemsByPeriod(order.items);
            const placed = new Date(order.placedAt);
            const dateStr = placed.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            const timeStr = placed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <View
                key={order.id}
                style={[
                  styles.card,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  isCancelled && styles.cardCancelled,
                  isSubstituted && styles.cardSubstituted,
                ]}
              >
                {/* Left accent strip */}
                <View style={[styles.cardStrip, { backgroundColor: statusCfg.color }]} />

                <View style={styles.cardBody}>
                  {/* Top row: status + date + delete */}
                  <View style={styles.cardTop}>
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                      <Feather name={statusCfg.icon as any} size={12} color={statusCfg.color} />
                      <Text style={[styles.statusText, { color: statusCfg.color, fontSize: scaled(12) }]}>
                        {statusCfg.label}
                      </Text>
                    </View>

                    {order.backendId != null && (
                      <View style={styles.orderIdPill}>
                        <Text style={[styles.orderIdText, { fontSize: scaled(11) }]}>#{order.backendId}</Text>
                      </View>
                    )}

                    <View style={{ flex: 1 }} />

                    <Text style={[styles.dateText, { fontSize: scaled(11), color: theme.textSecondary }]}>
                      {dateStr} · {timeStr}
                    </Text>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(order)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="trash-2" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Substitution / cancellation note */}
                  {isSubstituted && (
                    <View style={styles.alertRow}>
                      <Feather name="refresh-cw" size={12} color="#C2410C" />
                      <Text style={[styles.alertText, { color: '#C2410C', fontSize: scaled(12) }]}>
                        Kitchen requested a substitution
                      </Text>
                    </View>
                  )}
                  {isCancelled && (
                    <View style={styles.alertRow}>
                      <Feather name="x-circle" size={12} color="#DC2626" />
                      <Text style={[styles.alertText, { color: '#DC2626', fontSize: scaled(12) }]}>
                        Order was cancelled
                      </Text>
                    </View>
                  )}

                  {/* Items grouped by meal period */}
                  <View style={styles.itemsWrap}>
                    {PERIOD_ORDER.filter((p) => grouped[p]).map((period) => {
                      const pCfg = PERIOD_CONFIG[period] ?? PERIOD_CONFIG.Lunch;
                      return (
                        <View key={period} style={styles.periodGroup}>
                          <View style={[styles.periodBadge, { backgroundColor: pCfg.bg }]}>
                            <Feather name={pCfg.icon as any} size={10} color={pCfg.color} />
                            <Text style={[styles.periodLabel, { color: pCfg.color, fontSize: scaled(11) }]}>
                              {pCfg.label}
                            </Text>
                          </View>
                          {grouped[period].map((item, i) => (
                            <View key={i} style={styles.itemRow}>
                              <View style={[styles.itemDot, { backgroundColor: isCancelled ? '#D1D5DB' : pCfg.color }]} />
                              <Text
                                style={[
                                  styles.itemName,
                                  { fontSize: scaled(14), color: isCancelled ? '#9CA3AF' : theme.textPrimary },
                                  isCancelled && styles.itemStrikethrough,
                                ]}
                              >
                                {item.name}
                              </Text>
                              <Text style={[styles.itemKcal, { fontSize: scaled(11), color: theme.textSecondary }]}>
                                {item.kcal} kcal
                              </Text>
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </View>

                  {/* Nutrition summary (hidden for cancelled) */}
                  {!isCancelled && (
                    <View style={[styles.nutritionRow, { borderTopColor: theme.border }]}>
                      <View style={styles.nutritionItem}>
                        <Text style={[styles.nutritionValue, { color: theme.textPrimary, fontSize: scaled(13) }]}>
                          {order.totalNutrition.calories}
                        </Text>
                        <Text style={[styles.nutritionLabel, { color: theme.textSecondary, fontSize: scaled(10) }]}>
                          kcal
                        </Text>
                      </View>
                      <View style={styles.nutritionDivider} />
                      <View style={styles.nutritionItem}>
                        <Text style={[styles.nutritionValue, { color: theme.textPrimary, fontSize: scaled(13) }]}>
                          {order.totalNutrition.sodium}mg
                        </Text>
                        <Text style={[styles.nutritionLabel, { color: theme.textSecondary, fontSize: scaled(10) }]}>
                          sodium
                        </Text>
                      </View>
                      <View style={styles.nutritionDivider} />
                      <View style={styles.nutritionItem}>
                        <Text style={[styles.nutritionValue, { color: theme.textPrimary, fontSize: scaled(13) }]}>
                          {order.totalNutrition.protein}g
                        </Text>
                        <Text style={[styles.nutritionLabel, { color: theme.textSecondary, fontSize: scaled(10) }]}>
                          protein
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 8,
    width: 70,
  },
  backText: { color: '#717644', fontWeight: '600' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { marginTop: 2 },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontWeight: '700' },
  tabBadge: {
    minWidth: 22,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: { fontSize: 11, fontWeight: '800' },

  // List
  list: { padding: 14, paddingBottom: 32, gap: 12 },

  // Card
  card: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardCancelled: { borderColor: '#FCA5A5', opacity: 0.85 },
  cardSubstituted: { borderColor: '#FDBA74' },
  cardStrip: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  orderIdPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  orderIdText: { fontWeight: '700', color: '#4B5563' },
  dateText: { fontWeight: '500' },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    marginLeft: 4,
  },

  // Alert rows
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  alertText: { fontWeight: '600' },

  // Items
  itemsWrap: { gap: 8 },
  periodGroup: { gap: 4 },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 2,
  },
  periodLabel: { fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
  },
  itemDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  itemName: { fontWeight: '500', flex: 1 },
  itemStrikethrough: { textDecorationLine: 'line-through' },
  itemKcal: { fontWeight: '500' },

  // Nutrition
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  nutritionItem: { alignItems: 'center' },
  nutritionValue: { fontWeight: '700' },
  nutritionLabel: { fontWeight: '500', marginTop: 1 },
  nutritionDivider: { width: 1, height: 24, backgroundColor: '#E5E7EB' },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F4F3EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E8E6E1',
  },
  emptyTitle: { fontWeight: '700', marginBottom: 6 },
  emptyDesc: { textAlign: 'center', lineHeight: 20 },
});
