import React, { useEffect } from 'react';
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
  confirmed:              { label: 'Confirmed',     color: '#717644', bg: '#F4F3EE', icon: 'check-circle' },
  preparing:              { label: 'Preparing',     color: '#B45309', bg: '#FEF3C7', icon: 'clock' },
  ready:                  { label: 'Ready',         color: '#15803D', bg: '#DCFCE7', icon: 'check-circle' },
  completed:              { label: 'Completed',     color: '#166534', bg: '#BBF7D0', icon: 'check-circle' },
  cancelled:              { label: 'Cancelled',     color: '#B91C1C', bg: '#FEE2E2', icon: 'x-circle' },
  substitution_requested: { label: 'Substituted',   color: '#C2410C', bg: '#FFEDD5', icon: 'refresh-cw' },
};

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

const PERIOD_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Sides'];

export default function OrderHistoryScreen({ navigation, route }: any) {
  const { orders, getOrdersForResident, fetchOrderHistory, removeOrder } = useCart();
  const { scaled, theme, getTouchTargetSize } = useSettings();
  const touchTarget = getTouchTargetSize();

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
          <Text style={[styles.headerTitle, { fontSize: scaled(22), color: theme.textPrimary }]}>Order History</Text>
          <Text style={[styles.headerSub, { fontSize: scaled(13), color: theme.textSecondary }]}>Last 30 days</Text>
        </View>
        <View style={{ width: 70 }} />
      </View>

      {recentOrders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconCircle}>
            <Feather name="rotate-ccw" size={40} color="#717644" />
          </View>
          <Text style={[styles.emptyTitle, { fontSize: scaled(20), color: theme.textPrimary }]}>No orders yet</Text>
          <Text style={[styles.emptyDesc, { fontSize: scaled(14), color: theme.textSecondary }]}>
            Orders you place will appear here for 30 days.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {recentOrders.map((order) => {
            const status = (order.status ?? 'confirmed') as string;
            const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.confirmed;
            const isCancelled = status === 'cancelled';
            const isSubstituted = status === 'substitution_requested';
            const dominated = getDominantPeriod(order.items);
            const grouped = groupItemsByPeriod(order.items);
            const placed = new Date(order.placedAt);
            const dateStr = placed.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = placed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <View
                key={order.id}
                style={[
                  styles.card,
                  { backgroundColor: theme.surface, borderColor: isCancelled ? '#FCA5A5' : isSubstituted ? '#FDBA74' : theme.border },
                ]}
              >
                {/* ── Card header row ── */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dateText, { fontSize: scaled(12), color: theme.textSecondary }]}>
                      {dateStr} · {timeStr}
                    </Text>
                    {order.backendId && (
                      <Text style={[styles.orderIdText, { fontSize: scaled(11), color: theme.textSecondary }]}>
                        Order #{order.backendId}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(order)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="trash-2" size={15} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                {/* ── Status badge ── */}
                <View style={styles.badgeRow}>
                  <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                    <Feather name={statusCfg.icon as any} size={12} color={statusCfg.color} />
                    <Text style={[styles.statusText, { color: statusCfg.color, fontSize: scaled(12) }]}>
                      {statusCfg.label}
                    </Text>
                  </View>

                  {/* Substitution note */}
                  {isSubstituted && (
                    <View style={styles.substituteNote}>
                      <Feather name="alert-circle" size={12} color="#C2410C" />
                      <Text style={[styles.substituteText, { fontSize: scaled(11) }]}>
                        Kitchen requested a substitution
                      </Text>
                    </View>
                  )}
                  {isCancelled && (
                    <View style={styles.cancelNote}>
                      <Feather name="x-circle" size={12} color="#B91C1C" />
                      <Text style={[styles.cancelText, { fontSize: scaled(11) }]}>
                        Order was cancelled
                      </Text>
                    </View>
                  )}
                </View>

                {/* ── Items grouped by meal period ── */}
                <View style={styles.itemsWrap}>
                  {PERIOD_ORDER.filter((p) => grouped[p]).map((period) => {
                    const pCfg = PERIOD_CONFIG[period] ?? PERIOD_CONFIG.Lunch;
                    return (
                      <View key={period} style={styles.periodGroup}>
                        {/* Period badge */}
                        <View style={[styles.periodBadge, { backgroundColor: pCfg.bg }]}>
                          <Feather name={pCfg.icon as any} size={11} color={pCfg.color} />
                          <Text style={[styles.periodLabel, { color: pCfg.color, fontSize: scaled(11) }]}>
                            {pCfg.label}
                          </Text>
                        </View>
                        {/* Items under this period */}
                        {grouped[period].map((item, i) => (
                          <View key={i} style={styles.itemRow}>
                            <View style={styles.itemDot} />
                            <Text style={[styles.itemName, { fontSize: scaled(14), color: isCancelled ? '#9CA3AF' : theme.textPrimary }]}>
                              {item.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </View>

                {/* ── Nutrition summary ── */}
                {!isCancelled && (
                  <View style={[styles.nutritionRow, { borderTopColor: theme.border }]}>
                    <Text style={[styles.nutritionItem, { fontSize: scaled(12), color: theme.textSecondary }]}>
                      {order.totalNutrition.calories} kcal
                    </Text>
                    <View style={styles.nutritionDot} />
                    <Text style={[styles.nutritionItem, { fontSize: scaled(12), color: theme.textSecondary }]}>
                      {order.totalNutrition.sodium}mg sodium
                    </Text>
                    <View style={styles.nutritionDot} />
                    <Text style={[styles.nutritionItem, { fontSize: scaled(12), color: theme.textSecondary }]}>
                      {order.totalNutrition.protein}g protein
                    </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
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
  headerTitle: { fontWeight: '700', letterSpacing: -0.3 },
  headerSub: { marginTop: 2 },

  list: { padding: 16, paddingBottom: 32, gap: 14 },

  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  dateText: { fontWeight: '500', marginBottom: 2 },
  orderIdText: { fontWeight: '500' },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    marginLeft: 8,
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusText: { fontWeight: '700' },
  substituteNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEDD5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  substituteText: { color: '#C2410C', fontWeight: '600' },
  cancelNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  cancelText: { color: '#B91C1C', fontWeight: '600' },

  itemsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  periodGroup: { gap: 4 },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  periodLabel: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
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
    backgroundColor: '#D1D5DB',
  },
  itemName: { fontWeight: '500', flex: 1 },

  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  nutritionItem: { fontWeight: '500' },
  nutritionDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#D1D5DB' },

  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F4F3EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E8E6E1',
  },
  emptyTitle: { fontWeight: '700', marginBottom: 8 },
  emptyDesc: { textAlign: 'center', lineHeight: 22 },
});
