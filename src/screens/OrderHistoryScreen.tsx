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
const PERIOD_CONFIG: Record<string, { label: string; color: string }> = {
  Breakfast: { label: 'Breakfast', color: '#92400E' },
  Lunch:     { label: 'Lunch',     color: '#065F46' },
  Dinner:    { label: 'Dinner',    color: '#3730A3' },
  Drinks:    { label: 'Drinks',    color: '#1E40AF' },
  Sides:     { label: 'Sides',     color: '#9D174D' },
};

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  confirmed:              { label: 'Confirmed',   color: '#15803D', bg: '#DCFCE7', icon: 'check-circle' },
  preparing:              { label: 'Preparing',   color: '#B45309', bg: '#FEF3C7', icon: 'clock'        },
  ready:                  { label: 'Ready',       color: '#0369A1', bg: '#E0F2FE', icon: 'check-circle' },
  completed:              { label: 'Completed',   color: '#166534', bg: '#BBF7D0', icon: 'check'        },
  cancelled:              { label: 'Cancelled',   color: '#DC2626', bg: '#FEE2E2', icon: 'x-circle'     },
  substitution_requested: { label: 'Substituted', color: '#C2410C', bg: '#FFEDD5', icon: 'refresh-cw'  },
};

type FilterTab = 'all' | 'active' | 'cancelled';
const PERIOD_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Sides'];

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

  const residentId   = route?.params?.residentId   as string | undefined;
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

  const filtered = recentOrders.filter((o) => {
    const s = (o.status ?? 'confirmed') as string;
    if (tab === 'active')    return s !== 'cancelled';
    if (tab === 'cancelled') return s === 'cancelled';
    return true;
  });

  const countAll       = recentOrders.length;
  const countActive    = recentOrders.filter((o) => (o.status as string) !== 'cancelled').length;
  const countCancelled = recentOrders.filter((o) => (o.status as string) === 'cancelled').length;

  const handleDelete = (order: Order) => {
    Alert.alert('Delete Order', 'Remove this order from your history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeOrder(order.id) },
    ]);
  };

  const TABS: { key: FilterTab; label: string; count: number; color: string }[] = [
    { key: 'all',       label: 'All',       count: countAll,       color: '#717644' },
    { key: 'active',    label: 'Active',    count: countActive,    color: '#15803D' },
    { key: 'cancelled', label: 'Cancelled', count: countCancelled, color: '#DC2626' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { minHeight: touchTarget }]}
        >
          <Feather name="chevron-left" size={22} color="#717644" />
          <Text style={[styles.backText, { fontSize: scaled(15) }]}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { fontSize: scaled(18), color: theme.textPrimary }]}>
            Order History
          </Text>
          <Text style={[styles.headerSub, { fontSize: scaled(12), color: theme.textSecondary }]}>
            {residentName ?? 'Resident'} · Last 30 days
          </Text>
        </View>
        <View style={{ width: 70 }} />
      </View>

      {/* ── Filter Tabs ── */}
      <View style={[styles.tabRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, active && { borderBottomColor: t.color, borderBottomWidth: 2 }]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabLabel, { color: active ? t.color : theme.textSecondary, fontSize: scaled(13) }]}>
                {t.label}
              </Text>
              <View style={[styles.tabBadge, { backgroundColor: active ? t.color : '#E5E7EB' }]}>
                <Text style={[styles.tabBadgeText, { color: active ? '#FFF' : '#6B7280' }]}>{t.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Empty state ── */}
      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconCircle}>
            <Feather name={tab === 'cancelled' ? 'x-circle' : 'rotate-ccw'} size={32} color="#717644" />
          </View>
          <Text style={[styles.emptyTitle, { fontSize: scaled(17), color: theme.textPrimary }]}>
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
            const status      = (order.status ?? 'confirmed') as string;
            const statusCfg   = STATUS_CONFIG[status] ?? STATUS_CONFIG.confirmed;
            const isCancelled = status === 'cancelled';
            const isSubstituted = status === 'substitution_requested';
            const grouped     = groupItemsByPeriod(order.items);
            const placed      = new Date(order.placedAt);
            const dateStr     = placed.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            const timeStr     = placed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <View
                key={order.id}
                style={[
                  styles.card,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  isCancelled   && styles.cardCancelled,
                  isSubstituted && styles.cardSubstituted,
                ]}
              >
                {/* ── Card header row ── */}
                <View style={styles.cardHeader}>
                  {/* Status badge */}
                  <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                    <Feather name={statusCfg.icon as any} size={11} color={statusCfg.color} />
                    <Text style={[styles.statusText, { color: statusCfg.color, fontSize: scaled(11) }]}>
                      {statusCfg.label.toUpperCase()}
                    </Text>
                  </View>

                  {order.backendId != null && (
                    <Text style={[styles.orderIdText, { fontSize: scaled(12), color: theme.textSecondary }]}>
                      #{order.backendId}
                    </Text>
                  )}

                  <View style={{ flex: 1 }} />

                  <Text style={[styles.dateText, { fontSize: scaled(11), color: theme.textSecondary }]}>
                    {dateStr} · {timeStr}
                  </Text>

                  <TouchableOpacity
                    onPress={() => handleDelete(order)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.deleteBtn}
                  >
                    <Feather name="trash-2" size={13} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                {/* ── Alert note ── */}
                {(isSubstituted || isCancelled) && (
                  <View style={[styles.alertRow, { backgroundColor: isCancelled ? '#FEF2F2' : '#FFF7ED' }]}>
                    <Feather name={isCancelled ? 'x-circle' : 'refresh-cw'} size={11} color={statusCfg.color} />
                    <Text style={[styles.alertText, { color: statusCfg.color, fontSize: scaled(12) }]}>
                      {isCancelled ? 'Order was cancelled' : 'Kitchen requested a substitution'}
                    </Text>
                  </View>
                )}

                {/* ── Divider ── */}
                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                {/* ── Items: period label LEFT, name RIGHT ── */}
                <View style={styles.itemsBlock}>
                  {PERIOD_ORDER.filter((p) => grouped[p]).map((period) => {
                    const pColor = PERIOD_CONFIG[period]?.color ?? '#6B7280';
                    return grouped[period].map((item, i) => (
                      <View key={`${period}-${i}`} style={styles.itemRow}>
                        {/* Period label on the left */}
                        <Text style={[styles.periodLabel, { color: pColor, fontSize: scaled(10) }]}>
                          {period.toUpperCase()}
                        </Text>
                        {/* Item name */}
                        <Text
                          style={[
                            styles.itemName,
                            { fontSize: scaled(14), color: isCancelled ? '#9CA3AF' : theme.textPrimary },
                            isCancelled && styles.strikethrough,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        {/* Calories */}
                        <Text style={[styles.itemKcal, { fontSize: scaled(11), color: theme.textSecondary }]}>
                          {item.kcal} kcal
                        </Text>
                      </View>
                    ));
                  })}
                </View>

                {/* ── Nutrition footer ── */}
                {!isCancelled && (
                  <View style={[styles.nutritionRow, { borderTopColor: theme.border }]}>
                    <View style={styles.nutritionPill}>
                      <Text style={[styles.nutritionVal, { color: theme.textPrimary, fontSize: scaled(12) }]}>
                        {order.totalNutrition.calories}
                      </Text>
                      <Text style={[styles.nutritionKey, { color: theme.textSecondary, fontSize: scaled(10) }]}>kcal</Text>
                    </View>
                    <View style={styles.nutritionDot} />
                    <View style={styles.nutritionPill}>
                      <Text style={[styles.nutritionVal, { color: theme.textPrimary, fontSize: scaled(12) }]}>
                        {order.totalNutrition.sodium}mg
                      </Text>
                      <Text style={[styles.nutritionKey, { color: theme.textSecondary, fontSize: scaled(10) }]}>sodium</Text>
                    </View>
                    <View style={styles.nutritionDot} />
                    <View style={styles.nutritionPill}>
                      <Text style={[styles.nutritionVal, { color: theme.textPrimary, fontSize: scaled(12) }]}>
                        {order.totalNutrition.protein}g
                      </Text>
                      <Text style={[styles.nutritionKey, { color: theme.textSecondary, fontSize: scaled(10) }]}>protein</Text>
                    </View>
                  </View>
                )}
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

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 70,
  },
  backText: { color: '#717644', fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontWeight: '800', letterSpacing: -0.2 },
  headerSub: { marginTop: 2 },

  // ── Tabs ──
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
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontWeight: '700' },
  tabBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800' },

  // ── List ──
  list: { padding: 12, paddingBottom: 32, gap: 10 },

  // ── Card ──
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardCancelled: { borderColor: '#FCA5A5', opacity: 0.82 },
  cardSubstituted: { borderColor: '#FDBA74' },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  statusText: { fontWeight: '800', letterSpacing: 0.3 },
  orderIdText: { fontWeight: '600' },
  dateText: { fontWeight: '500' },
  deleteBtn: {
    padding: 5,
    borderRadius: 7,
    backgroundColor: '#FEF2F2',
    marginLeft: 2,
  },

  // ── Alert ──
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 7,
  },
  alertText: { fontWeight: '600' },

  // ── Divider ──
  divider: { height: 1, marginHorizontal: 12 },

  // ── Items ──
  itemsBlock: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  periodLabel: {
    fontWeight: '800',
    letterSpacing: 0.4,
    width: 68,          // fixed width keeps all item names aligned
    textAlign: 'left',
  },
  itemName: {
    flex: 1,
    fontWeight: '500',
  },
  strikethrough: { textDecorationLine: 'line-through' },
  itemKcal: { fontWeight: '500', textAlign: 'right' },

  // ── Nutrition footer ──
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  nutritionPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  nutritionVal: { fontWeight: '700' },
  nutritionKey: { fontWeight: '500' },
  nutritionDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },

  // ── Empty ──
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F4F3EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#E8E6E1',
  },
  emptyTitle: { fontWeight: '700', marginBottom: 6 },
  emptyDesc: { textAlign: 'center', lineHeight: 20 },
});
