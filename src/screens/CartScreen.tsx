import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useCart } from './context/CartContext';
import { useSettings } from './context/SettingsContext';
import {
  translateMealDescription,
  translateMealName,
  translateMealPeriod,
} from '../services/mealLocalization';

const CartScreen = ({ navigation }: any) => {
  // Use the cart context
  const { cart: cartItems, removeFromCart, placeOrder, getTotalNutrition } = useCart();
  const { t, scaled, language, notifications, getTouchTargetSize, theme } = useSettings();
  const touchTarget = getTouchTargetSize();

  const confirmOrder = () => {
    // Save order and clear cart
    const placed = placeOrder();
    if (placed && notifications.orderUpdates) {
      Alert.alert(t.orderUpdates, t.orderUpdatesDesc);
    }
    // Navigate to upcoming meals
    navigation.navigate('UpcomingMeals');
  };

  const totals = getTotalNutrition();
  const backLabel = t.backToMenu.replace(/^[\s←↩⬅]+/, '');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { minHeight: touchTarget, borderColor: theme.border }]}
        >
          <View style={[styles.backIconBubble, { backgroundColor: `${theme.accent}22` }]}>
            <Text style={[styles.backIcon, { color: theme.accent }]}>←</Text>
          </View>
          <Text style={[styles.backText, { fontSize: scaled(16), color: theme.accent }]}>{backLabel}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scaled(28), color: theme.textPrimary }]}>{t.yourCart}</Text>
        <Text style={[styles.headerSubtitle, { fontSize: scaled(14), color: theme.textSecondary }]}>
          {cartItems.length} {cartItems.length === 1 ? t.itemsReady.split(' ')[0] : t.itemsReady}
        </Text>
      </View>

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={[styles.emptyTitle, { fontSize: scaled(24) }]}>{t.cartEmpty}</Text>
          <Text style={[styles.emptyText, { fontSize: scaled(16) }]}>{t.cartEmptyDesc}</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.browseButtonText, { fontSize: scaled(16) }]}>{t.browseMenu}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Cart Items */}
            {cartItems.map((item, index) => (
              <View
                key={`${item.id}-${index}`}
                style={[styles.cartCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={[styles.cardAccent, { backgroundColor: theme.accent }]} />
                <View style={styles.cartCardHeader}>
                  <View style={styles.cartCardInfo}>
                    <Text style={[styles.cartItemName, { fontSize: scaled(18) }]}>
                      {translateMealName(item.name, language)}
                    </Text>
                    <View style={styles.periodBadge}>
                      <Text style={[styles.periodBadgeText, { fontSize: scaled(11) }]}>
                        {translateMealPeriod(item.meal_period, language)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.removeButton, { minHeight: touchTarget, justifyContent: 'center' }]}
                    onPress={() => removeFromCart(index)}
                  >
                    <Text style={[styles.removeButtonText, { fontSize: scaled(13) }]}>✕ {t.remove}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.cartItemDescription, { fontSize: scaled(14), color: theme.textSecondary }]}>
                  {translateMealDescription(item.description, language)}
                </Text>

                <View style={styles.nutritionRow}>
                  <View style={styles.nutritionChip}>
                    <Text style={[styles.nutritionText, { fontSize: scaled(13) }]}>🔥 {item.kcal} {t.calories}</Text>
                  </View>
                  <View style={styles.nutritionChip}>
                    <Text style={[styles.nutritionText, { fontSize: scaled(13) }]}>🧂 {item.sodium_mg} mg {t.sodium}</Text>
                  </View>
                  <View style={styles.nutritionChip}>
                    <Text style={[styles.nutritionText, { fontSize: scaled(13) }]}>💪 {item.protein_g} g {t.protein}</Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Total Nutrition */}
            <View style={styles.totalsCard}>
              <Text style={[styles.totalsTitle, { fontSize: scaled(20) }]}>✨ {t.totalNutrition}</Text>
              <View style={styles.totalsGrid}>
                <View style={styles.totalItem}>
                  <Text style={[styles.totalValue, { fontSize: scaled(34) }]}>{totals.calories}</Text>
                  <Text style={[styles.totalLabel, { fontSize: scaled(13) }]}>{t.totalCalories}</Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={[styles.totalValue, { fontSize: scaled(34) }]}>{totals.sodium}mg</Text>
                  <Text style={[styles.totalLabel, { fontSize: scaled(13) }]}>{t.totalSodium}</Text>
                </View>
                <View style={styles.totalItem}>
                  <Text style={[styles.totalValue, { fontSize: scaled(34) }]}>{totals.protein}g</Text>
                  <Text style={[styles.totalLabel, { fontSize: scaled(13) }]}>{t.totalProtein}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <View style={styles.bottomBarInfo}>
              <Text style={[styles.itemCount, { color: theme.textPrimary, fontSize: scaled(18) }]}>
                {cartItems.length} {t.meals}
              </Text>
              <Text style={[styles.calorieCount, { color: theme.textSecondary, fontSize: scaled(14) }]}>
                {totals.calories} {t.totalCalories}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.confirmButton, { minHeight: touchTarget, justifyContent: 'center', backgroundColor: theme.success }]}
              onPress={confirmOrder}
            >
              <Text style={[styles.confirmButtonText, { fontSize: scaled(17) }]}>{t.confirmOrder}</Text>
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
    paddingBottom: 18,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backIconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 14,
    fontWeight: '700',
  },
  backText: {
    fontSize: 16,
    color: '#717644',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  cartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    opacity: 0.9,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#EEF2F7',
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  removeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991b1b',
  },
  cartItemDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  nutritionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nutritionChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  nutritionText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  totalsCard: {
    backgroundColor: '#FFF7E2',
    borderRadius: 22,
    padding: 20,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: '#F1D39A',
  },
  totalsTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  totalsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  totalItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1D39A',
  },
  totalValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
    letterSpacing: -0.6,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  bottomBarInfo: {
    flex: 1,
  },
  itemCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 1,
  },
  calorieCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 14,
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
});

export default CartScreen;
