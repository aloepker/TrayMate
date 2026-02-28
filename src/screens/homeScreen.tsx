import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useCart } from './context/CartContext';
import { useSettings } from './context/SettingsContext';
import { translateMealName } from '../services/mealLocalization';

const HomeScreen = ({ navigation }: any) => {
  const { orders, getCartCount } = useCart();
  const { t, scaled, language, getTouchTargetSize, theme } = useSettings();
  const touchTarget = getTouchTargetSize();

  const residentName = 'Bobby';
  const activeOrders = orders.filter((o) => o.status !== 'completed');
  const cartCount = getCartCount();

  // Get current time of day for greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t.goodMorning : hour < 17 ? t.goodAfternoon : t.goodEvening;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F3EF" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { fontSize: scaled(16) }]}>{greeting},</Text>
            <Text style={[styles.userName, { fontSize: scaled(28) }]}>{residentName}</Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarButton, { minHeight: touchTarget, minWidth: touchTarget }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={[styles.avatarText, { fontSize: scaled(16) }]}>BJ</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Meals Preview */}
        {activeOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { fontSize: scaled(18) }]}>{t.upcomingMeals}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('UpcomingMeals')}
              >
                <Text style={[styles.seeAllText, { fontSize: scaled(14) }]}>{t.seeAll}</Text>
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
                    style={styles.mealPreviewCard}
                    onPress={() => navigation.navigate('UpcomingMeals')}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.mealStatusDot,
                        { backgroundColor: statusColor },
                      ]}
                    />
                    <Text style={styles.mealPreviewName} numberOfLines={1}>
                      {firstItem ? translateMealName(firstItem.name, language) : 'Order'}
                    </Text>
                    {order.items.length > 1 && (
                      <Text style={[styles.mealPreviewExtra, { fontSize: scaled(12) }]}>
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
          <Text style={[styles.sectionTitle, { fontSize: scaled(18), marginBottom: 14 }]}>{t.quickActions}</Text>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#FFF8E7' }]}
            onPress={() => navigation.navigate('BrowseMealOptions')}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#F6C94E' }]}>
              <Text style={styles.actionEmoji}>🍽</Text>
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={[styles.actionLabel, { fontSize: scaled(20) }]}>{t.browseMenu}</Text>
              <Text style={[styles.actionSub, { fontSize: scaled(14) }]}>12 {t.mealsAvailable}</Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#EBF5FF' }]}
            onPress={() => navigation.navigate('UpcomingMeals')}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#5AAAEC' }]}>
              <Text style={styles.actionEmoji}>📋</Text>
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={[styles.actionLabel, { fontSize: scaled(20) }]}>{t.upcomingMeals}</Text>
              <Text style={[styles.actionSub, { fontSize: scaled(14) }]}>
                {activeOrders.length} {activeOrders.length === 1 ? t.activeOrders.split(' ')[0] : t.activeOrders.split(' ').slice(0, -1).join(' ')}
              </Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#F3EDFF' }]}
            onPress={() => navigation.navigate('AIMealAssistant')}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#A47DE8' }]}>
              <Text style={styles.actionEmoji}>👵</Text>
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={[styles.actionLabel, { fontSize: scaled(20) }]}>{t.grannyGBT}</Text>
              <Text style={[styles.actionSub, { fontSize: scaled(14) }]}>{t.aiMealAssistant}</Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#EDFBF1' }]}
            onPress={() => navigation.navigate('Cart')}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#4CAF7D' }]}>
              <Text style={styles.actionEmoji}>🛒</Text>
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={[styles.actionLabel, { fontSize: scaled(20) }]}>{t.myCart}</Text>
              <Text style={[styles.actionSub, { fontSize: scaled(14) }]}>
                {cartCount} {cartCount === 1 ? t.itemsReady.split(' ')[0] : t.itemsReady.split(' ').slice(0, -1).join(' ')}
              </Text>
            </View>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    alignItems: 'center',
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
});

export default HomeScreen;
