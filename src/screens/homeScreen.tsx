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

const HomeScreen = ({ navigation }: any) => {
  const { orders, getCartCount } = useCart();

  const residentName = 'Bobby';
  const activeOrders = orders.filter((o) => o.status !== 'completed');
  const cartCount = getCartCount();

  // Get current time of day for greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F3EF" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{residentName}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.avatarText}>BJ</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Meals Preview */}
        {activeOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Meals</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('UpcomingMeals')}
              >
                <Text style={styles.seeAllText}>See All</Text>
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
                      {firstItem?.name || 'Order'}
                    </Text>
                    {order.items.length > 1 && (
                      <Text style={styles.mealPreviewExtra}>
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
                          { color: statusColor },
                        ]}
                      >
                        {order.status}
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
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('BrowseMealOptions')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.actionEmoji}>🍽</Text>
              </View>
              <Text style={styles.actionLabel}>Browse Menu</Text>
              <Text style={styles.actionSub}>12 meals available</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('UpcomingMeals')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
                <Text style={styles.actionEmoji}>📋</Text>
              </View>
              <Text style={styles.actionLabel}>Upcoming</Text>
              <Text style={styles.actionSub}>
                {activeOrders.length} active order
                {activeOrders.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('AIMealAssistant')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}>
                <Text style={styles.actionEmoji}>👵</Text>
              </View>
              <Text style={styles.actionLabel}>GrannyGBT</Text>
              <Text style={styles.actionSub}>AI meal assistant</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Cart')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
                <Text style={styles.actionEmoji}>🛒</Text>
              </View>
              <Text style={styles.actionLabel}>Cart</Text>
              <Text style={styles.actionSub}>
                {cartCount} item{cartCount !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Management</Text>
          <View style={styles.managementList}>
            <TouchableOpacity
              style={styles.managementRow}
              onPress={() => navigation.navigate('AddResident')}
            >
              <View style={styles.managementIconWrap}>
                <Text style={styles.managementIcon}>👤</Text>
              </View>
              <View style={styles.managementInfo}>
                <Text style={styles.managementLabel}>Add Resident</Text>
                <Text style={styles.managementSub}>Register a new resident</Text>
              </View>
              <Text style={styles.managementChevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.managementRow}
              onPress={() => navigation.navigate('EditResidentList')}
            >
              <View style={styles.managementIconWrap}>
                <Text style={styles.managementIcon}>📝</Text>
              </View>
              <View style={styles.managementInfo}>
                <Text style={styles.managementLabel}>Edit Residents</Text>
                <Text style={styles.managementSub}>
                  Update resident information
                </Text>
              </View>
              <Text style={styles.managementChevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.managementRow}
              onPress={() => navigation.navigate('AddMealOptions')}
            >
              <View style={styles.managementIconWrap}>
                <Text style={styles.managementIcon}>🍳</Text>
              </View>
              <View style={styles.managementInfo}>
                <Text style={styles.managementLabel}>Add Meals</Text>
                <Text style={styles.managementSub}>Add new menu options</Text>
              </View>
              <Text style={styles.managementChevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.managementRow}
              onPress={() => navigation.navigate('Settings')}
            >
              <View style={styles.managementIconWrap}>
                <Text style={styles.managementIcon}>⚙️</Text>
              </View>
              <View style={styles.managementInfo}>
                <Text style={styles.managementLabel}>Settings</Text>
                <Text style={styles.managementSub}>
                  Dietary prefs & accessibility
                </Text>
              </View>
              <Text style={styles.managementChevron}>›</Text>
            </TouchableOpacity>
          </View>
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

  // Quick Actions 2x2 grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  actionCard: {
    width: '47%' as any,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A3A3A',
    marginBottom: 4,
  },
  actionSub: {
    fontSize: 12,
    color: '#8A8A8A',
    fontWeight: '500',
  },

  // Management list
  managementList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  managementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
  },
  managementIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  managementIcon: {
    fontSize: 20,
  },
  managementInfo: {
    flex: 1,
  },
  managementLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3A3A3A',
  },
  managementSub: {
    fontSize: 12,
    color: '#8A8A8A',
    marginTop: 2,
  },
  managementChevron: {
    fontSize: 22,
    color: '#cbc2b4',
    fontWeight: '300',
  },
});

export default HomeScreen;
