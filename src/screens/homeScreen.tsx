import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Modal,
  Pressable,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useCart } from './context/CartContext';
import { useSettings } from './context/SettingsContext';
import { useKitchenMessages } from './context/KitchenMessageContext';
import { translateMealName } from '../services/mealLocalization';
import { ResidentService } from '../services/localDataService';
import { useMealtimeReminder } from '../hooks/useMealtimeReminder';
import MealtimeReminderBanner from './components/MealtimeReminderBanner';
import {
  initNotifications,
  scheduleMealtimeReminders,
  cancelAllMealtimeReminders,
} from '../services/notificationService';

const HomeScreen = ({ navigation, route }: any) => {
  const { orders, getCartCount, getOrdersForResident } = useCart();
  const { t, scaled, language, getTouchTargetSize, theme, setCurrentResidentId } = useSettings();
  const { messages: kitchenMessages, markRead: markKitchenMsgRead } = useKitchenMessages();
  const touchTarget = getTouchTargetSize();
  const [showNotifCenter, setShowNotifCenter] = useState(false);

  // Activate this resident's settings when screen mounts
  useEffect(() => {
    setCurrentResidentId(route?.params?.residentId ?? null);
  }, [route?.params?.residentId, setCurrentResidentId]);

  // Schedule OS-level daily mealtime notifications for this resident.
  // They fire even when the app is closed. Re-runs whenever the active
  // resident changes so the notification body uses their name.
  useEffect(() => {
    let cancelled = false;
    const setup = async () => {
      const name = route?.params?.residentName ?? 'you';
      const granted = await initNotifications();
      if (cancelled) return;
      if (granted && route?.params?.residentId) {
        await scheduleMealtimeReminders(name);
      } else if (!route?.params?.residentId) {
        await cancelAllMealtimeReminders();
      }
    };
    setup();
    return () => {
      cancelled = true;
    };
  }, [route?.params?.residentId, route?.params?.residentName]);

  // Get resident info from navigation params (set by admin dashboard)
  const residentId = route?.params?.residentId as string | undefined;
  const residentName =
    route?.params?.residentName ||
    (residentId && ResidentService.getResidentById(residentId)?.fullName) ||
    'Resident';
  const dietaryRestrictions: string[] = route?.params?.dietaryRestrictions ?? [];

  // Build avatar initials from resident name
  const initials = useMemo(() => {
    const parts = residentName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return residentName.slice(0, 2).toUpperCase();
  }, [residentName]);

  // Only show orders for this specific resident
  const residentOrders = residentId ? getOrdersForResident(residentId) : orders;
  const activeOrders = residentOrders.filter((o) => o.status !== 'completed');
  const cartCount = getCartCount();

  // Kitchen messages directed at this resident (excludes caregiver-only alerts
  // that are only meaningful on the caregiver dashboard). Newest first.
  const residentNotifications = useMemo(() => {
    if (!residentId) return [];
    return kitchenMessages
      .filter(
        (m) =>
          String(m.residentId) === String(residentId) &&
          m.fromRole === 'kitchen' &&
          !m.text.startsWith('[Caregiver Alert]')
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [kitchenMessages, residentId]);

  const unreadResidentMsgs = residentNotifications.filter((m) => !m.read).length;

  const openNotifCenter = () => {
    setShowNotifCenter(true);
    // Mark everything visible as read
    residentNotifications.forEach((m) => { if (!m.read) markKitchenMsgRead(m.id); });
  };

  // Get current time of day for greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t.goodMorning : hour < 17 ? t.goodAfternoon : t.goodEvening;

  // Navigation helper — passes resident info to all child screens
  const navWithResident = (screen: string, extra?: Record<string, any>) => {
    navigation.navigate(screen, {
      residentId,
      residentName,
      dietaryRestrictions,
      ...extra,
    });
  };

  // Mealtime reminder — nudge resident before each meal if not yet ordered
  const { reminder, dismiss: dismissReminder } = useMealtimeReminder(
    residentOrders,
    residentName,
    !!residentId,
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F3EF" />

      {/* Mealtime reminder banner (floats above content) */}
      <MealtimeReminderBanner
        visible={!!reminder}
        title={reminder?.title ?? ''}
        body={reminder?.body ?? ''}
        emoji={reminder?.emoji ?? '🍽️'}
        onPress={() => {
          dismissReminder();
          navWithResident('BrowseMealOptions');
        }}
        onDismiss={dismissReminder}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { fontSize: scaled(16), color: theme.textSecondary }]}>{greeting},</Text>
            <Text style={[styles.userName, { fontSize: scaled(28), color: theme.textPrimary }]}>{residentName}</Text>
            {dietaryRestrictions.length > 0 && (
              <View style={styles.dietaryRow}>
                {dietaryRestrictions.map((tag, i) => (
                  <View key={`diet-${i}`} style={styles.dietaryChip}>
                    <Text style={styles.dietaryChipText}>⚠ {tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            {/* Notification bell — shows count of unread kitchen messages */}
            <TouchableOpacity
              style={[styles.bellButton, { minHeight: touchTarget, minWidth: touchTarget }]}
              onPress={openNotifCenter}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Feather name="bell" size={22} color="#717644" />
              {unreadResidentMsgs > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadResidentMsgs > 9 ? '9+' : unreadResidentMsgs}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.avatarButton, { minHeight: touchTarget, minWidth: touchTarget }]}
              onPress={() => navWithResident('Settings')}
            >
              <Text style={[styles.avatarText, { fontSize: scaled(16) }]}>{initials}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Meals Preview (orders) */}
        {activeOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { fontSize: scaled(18), color: theme.textPrimary }]}>{t.upcomingMeals}</Text>
              <TouchableOpacity
                onPress={() => navWithResident('UpcomingMeals')}
              >
                <Text style={[styles.seeAllText, { fontSize: scaled(14), color: theme.accent }]}>{t.seeAll}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mealsScroll}
            >
              {activeOrders.slice(0, 3).map((order) => {
                const firstItem = order.items[0];
                const statusColor =
                  order.status === 'confirmed'
                    ? '#1d4ed8'
                    : order.status === 'preparing'
                      ? '#b45309'
                      : '#15803d';
                const statusBg =
                  order.status === 'confirmed'
                    ? '#dbeafe'
                    : order.status === 'preparing'
                      ? '#fef3c7'
                      : '#dcfce7';
                return (
                  <TouchableOpacity
                    key={order.id}
                    style={[styles.mealPreviewCard, { backgroundColor: theme.surface }]}
                    onPress={() => navWithResident('UpcomingMeals')}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.mealStatusDot,
                        { backgroundColor: statusColor },
                      ]}
                    />
                    <Text style={[styles.mealPreviewName, { color: theme.textPrimary }]} numberOfLines={1}>
                      {firstItem ? translateMealName(firstItem.name, language) : 'Order'}
                    </Text>
                    {order.items.length > 1 && (
                      <Text style={[styles.mealPreviewExtra, { fontSize: scaled(12), color: theme.textSecondary }]}>
                        +{order.items.length - 1} more
                      </Text>
                    )}
                    <View
                      style={[
                        styles.mealPreviewBadge,
                        { backgroundColor: statusBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.mealPreviewBadgeText,
                          { color: statusColor, fontSize: scaled(11) },
                        ]}
                      >
                        {order.status === 'confirmed' ? t.confirmed : order.status === 'preparing' ? t.preparing : t.ready}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontSize: scaled(18), marginBottom: 14, color: theme.textPrimary }]}>{t.quickActions}</Text>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.surface }]}
            onPress={() => navWithResident('BrowseMealOptions')}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#F6C94E' }]}>
              <Feather name="book-open" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={[styles.actionLabel, { fontSize: scaled(20), color: theme.textPrimary }]}>{t.browseMenu}</Text>
              <Text style={[styles.actionSub, { fontSize: scaled(14), color: theme.textSecondary }]}>12 {t.mealsAvailable}</Text>
            </View>
            <Text style={[styles.actionChevron, { color: theme.textSecondary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.surface }]}
            onPress={() => navWithResident('UpcomingMeals')}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#5AAAEC' }]}>
              <Feather name="calendar" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={[styles.actionLabel, { fontSize: scaled(20), color: theme.textPrimary }]}>{t.upcomingMeals}</Text>
              <Text style={[styles.actionSub, { fontSize: scaled(14), color: theme.textSecondary }]}>
                {activeOrders.length} {activeOrders.length === 1 ? t.activeOrders.split(' ')[0] : t.activeOrders.split(' ').slice(0, -1).join(' ')}
              </Text>
            </View>
            <Text style={[styles.actionChevron, { color: theme.textSecondary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.surface }]}
            onPress={() => navWithResident('AIMealAssistant')}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#A47DE8' }]}>
              <Feather name="message-circle" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={[styles.actionLabel, { fontSize: scaled(20), color: theme.textPrimary }]}>{t.grannyGBT}</Text>
              <Text style={[styles.actionSub, { fontSize: scaled(14), color: theme.textSecondary }]}>{t.aiMealAssistant}</Text>
            </View>
            <Text style={[styles.actionChevron, { color: theme.textSecondary }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.surface }]}
            onPress={() => navWithResident('Cart')}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#4CAF7D' }]}>
              <Feather name="shopping-cart" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={[styles.actionLabel, { fontSize: scaled(20), color: theme.textPrimary }]}>{t.myCart}</Text>
              <Text style={[styles.actionSub, { fontSize: scaled(14), color: theme.textSecondary }]}>
                {cartCount} {cartCount === 1 ? t.itemsReady.split(' ')[0] : t.itemsReady.split(' ').slice(0, -1).join(' ')}
              </Text>
            </View>
            <Text style={[styles.actionChevron, { color: theme.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Notification Center Modal ── */}
      <Modal
        visible={showNotifCenter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotifCenter(false)}
      >
        <Pressable style={styles.notifBackdrop} onPress={() => setShowNotifCenter(false)}>
          <Pressable style={[styles.notifSheet, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.notifHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="bell" size={18} color="#717644" />
                <Text style={[styles.notifTitle, { fontSize: scaled(18), color: theme.textPrimary }]}>Notifications</Text>
              </View>
              <TouchableOpacity onPress={() => setShowNotifCenter(false)} hitSlop={10}>
                <Feather name="x" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
              {residentNotifications.length === 0 ? (
                <View style={styles.notifEmpty}>
                  <Feather name="inbox" size={40} color="#D1D5DB" />
                  <Text style={[styles.notifEmptyText, { color: theme.textSecondary }]}>
                    No messages from the kitchen yet.
                  </Text>
                </View>
              ) : (
                residentNotifications.map((msg) => {
                  const isCancel = /cancelled|⛔/i.test(msg.text);
                  const isSub = /substitution|🔄/i.test(msg.text);
                  const accent = isCancel ? '#DC2626' : isSub ? '#D97706' : '#1d4ed8';
                  const bg = isCancel ? '#FEE2E2' : isSub ? '#FEF3C7' : '#EFF6FF';
                  const icon = isCancel ? 'x-circle' : isSub ? 'refresh-cw' : 'bell';
                  const label = isCancel ? 'Cancelled' : isSub ? 'Substitution' : 'Message';
                  // Strip known prefixes for cleaner display
                  const cleanText = msg.text
                    .replace(/^\[Order #\d+\]\s*/, '')
                    .replace(/^⛔\s*CANCELLED\s*[—-]?\s*/i, '')
                    .replace(/^🔄\s*SUBSTITUTION\s*[·:]?\s*/i, '')
                    .trim();
                  return (
                    <View key={msg.id} style={[styles.notifCard, { backgroundColor: bg, borderColor: accent }]}>
                      <View style={styles.notifCardHeader}>
                        <Feather name={icon as any} size={14} color={accent} />
                        <Text style={[styles.notifCardLabel, { color: accent }]}>{label}</Text>
                        {msg.orderId != null && (
                          <Text style={styles.notifCardOrderId}>Order #{msg.orderId}</Text>
                        )}
                        <Text style={styles.notifCardTime}>
                          {new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          {' · '}
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Text style={[styles.notifCardText, { fontSize: scaled(14), color: theme.textPrimary }]}>
                        {cleanText}
                      </Text>
                      <Text style={[styles.notifCardFrom, { color: theme.textSecondary }]}>
                        From {msg.fromName || 'Kitchen'}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#3A3A3A',
    marginTop: 2,
  },
  dietaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  dietaryChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  dietaryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#717644',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#717644',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Sections
  section: {
    marginBottom: 28,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 14,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#717644',
    marginBottom: 14,
  },

  // Upcoming meals horizontal scroll
  mealsScroll: {
    gap: 12,
  },
  mealPreviewCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  mealStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  mealPreviewName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3A3A3A',
    marginBottom: 4,
  },
  mealPreviewExtra: {
    fontSize: 12,
    color: '#8A8A8A',
    marginBottom: 10,
  },
  mealPreviewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 'auto' as any,
  },
  mealPreviewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  // Quick Actions — full-width, elderly-friendly
  actionCard: {
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  actionIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  actionEmoji: {
    fontSize: 30,
  },
  actionTextBlock: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3A3A3A',
    marginBottom: 4,
  },
  actionSub: {
    fontSize: 14,
    color: '#6A6A6A',
    fontWeight: '500',
  },
  actionChevron: {
    fontSize: 32,
    color: '#B0A898',
    fontWeight: '300',
  },

  // Notification center modal
  notifBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  notifSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  notifTitle: {
    fontWeight: '800',
  },
  notifEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  notifEmptyText: {
    fontSize: 14,
  },
  notifCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 6,
  },
  notifCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  notifCardLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  notifCardOrderId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  notifCardTime: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 'auto' as any,
  },
  notifCardText: {
    fontWeight: '500',
    lineHeight: 20,
    marginTop: 4,
  },
  notifCardFrom: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
});

export default HomeScreen;
