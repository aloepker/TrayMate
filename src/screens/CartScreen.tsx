import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useCart } from './context/CartContext';
import { globalStyles } from '../styles/styles';

const CartScreen = ({ navigation }: any) => {
  // Use the cart context
  const { cart: cartItems, removeFromCart, placeOrder, getTotalNutrition } = useCart();

  const confirmOrder = () => {
    // Save order and clear cart
    placeOrder();
    // Navigate to upcoming meals
    navigation.navigate('UpcomingMeals');
  };

  const totals = getTotalNutrition();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back to Menu</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Add meals from the menu to get started</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.browseButtonText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Cart Items */}
            {cartItems.map((item, index) => (
              <View key={`${item.id}-${index}`} style={styles.cartCard}>
                <View style={styles.cartCardHeader}>
                  <View style={styles.cartCardInfo}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <View style={styles.periodBadge}>
                      <Text style={styles.periodBadgeText}>{item.meal_period}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFromCart(index)}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.cartItemDescription}>{item.description}</Text>

                <View style={styles.nutritionRow}>
                  <Text style={styles.nutritionText}>{item.kcal} kcal</Text>
                  <Text style={styles.nutritionText}>{item.sodium_mg} mg sodium</Text>
                  <Text style={styles.nutritionText}>{item.protein_g} g protein</Text>
                </View>
              </View>
            ))}

            {/* Total Nutrition */}
            <View style={styles.totalsCard}>
              <Text style={styles.totalsTitle}>Total Nutrition</Text>
              <View style={styles.totalsGrid}>
                <View style={styles.totalItem}>
                  <Text style={styles.totalValue}>{totals.calories}</Text>
                  <Text style={styles.totalLabel}>Total Calories</Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={styles.totalValue}>{totals.sodium}mg</Text>
                  <Text style={styles.totalLabel}>Total Sodium</Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={styles.totalValue}>{totals.protein}g</Text>
                  <Text style={styles.totalLabel}>Total Protein</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={styles.bottomBar}>
            <View style={styles.bottomBarInfo}>
              <Text style={styles.itemCount}>{cartItems.length} meal{cartItems.length !== 1 ? 's' : ''}</Text>
              <Text style={styles.calorieCount}>{totals.calories} total kcal</Text>
            </View>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={confirmOrder}
            >
              <Text style={styles.confirmButtonText}>Confirm Order</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  cartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cartCardInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartItemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  periodBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991b1b',
  },
  cartItemDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 10,
    lineHeight: 20,
  },
  nutritionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  totalsCard: {
    backgroundColor: '#FFF8E6',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#F4E2C4',
  },
  totalsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 16,
    textAlign: 'center',
  },
  totalsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  totalItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F4E2C4',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 16,
  },
  bottomBarInfo: {
    flex: 1,
  },
  itemCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  calorieCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  browseButton: {
    backgroundColor: '#1F2937',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default CartScreen;