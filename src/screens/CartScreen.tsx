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
import { useCart } from './context/CartContext';
import { useSettings } from './context/SettingsContext';
import {
  translateMealDescription,
  translateMealName,
  translateMealPeriod,
} from '../services/mealLocalization';

const CartScreen = ({ navigation, route }: any) => {
  const { cart: cartItems, removeFromCart, placeOrder, replaceOrder, getTotalNutrition } = useCart();
  const { t, scaled, language, notifications, getTouchTargetSize, theme, setCurrentResidentId } = useSettings();
  const touchTarget = getTouchTargetSize();

  useEffect(() => {
    setCurrentResidentId(route?.params?.residentId ?? null);
  }, [route?.params?.residentId, setCurrentResidentId]);

  const residentId = route?.params?.residentId as string | undefined;
  const residentName = route?.params?.residentName;
  const dietaryRestrictions = route?.params?.dietaryRestrictions;

  const confirmOrder = async () => {
    const { order, conflict } = await placeOrder(residentId);

    if (conflict && conflict.id > 0) {
      Alert.alert(
        'Order Already Exists',
        `You already have a pending ${conflict.mealOfDay} order for ${conflict.date}. Replace it with this cart?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace Order',
            onPress: async () => {
              const replaced = await replaceOrder(conflict.id, residentId || 'unknown');
              if (replaced && notifications.orderUpdates) {
                Alert.alert(t.orderUpdates, t.orderUpdatesDesc);
              }
              navigation.navigate('UpcomingMeals', { residentId, residentName, dietaryRestrictions });
            },
          },
        ]
      );
      return;
    }

    if (order && notifications.orderUpdates) {
      Alert.alert(t.orderUpdates, t.orderUpdatesDesc);
    }
    navigation.navigate('UpcomingMeals', { residentId, residentName, dietaryRestrictions });
  };

  const totals = getTotalNutrition();
  const backLabel = t.backToMenu?.replace(/^[\s←↩⬅]+/, '') || 'Back to Menu';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { minHeight: touchTarget, borderColor: theme.border }]}
        >
          <Feather name="chevron-left" size={18} color={theme.accent} />
          <Text style={[styles.backText, { fontSize: scaled(16), color: theme.accent }]}>{backLabel}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scaled(28), color: theme.textPrimary }]}>{t.yourCart}</Text>
        <Text style={[styles.headerSubtitle, { fontSize: scaled(14), color: theme.textSecondary }]}>
          {cartItems.length} {cartItems.length === 1 ? t.itemsReady?.split(' ')[0] : t.itemsReady}
        </Text>
      </View>

      {cartItems.length === 0 ? (
        /* ── Empty state ── */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Feather name="shopping-bag" size={52} color="#717644" />
          </View>
          <Text style={[styles.emptyTitle, { fontSize: scaled(24) }]}>{t.cartEmpty}</Text>
          <Text style={[styles.emptyText, { fontSize: scaled(16) }]}>{t.cartEmptyDesc}</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="book-open" size={18} color="#FFF" />
            <Text style={[styles.browseButtonText, { fontSize: scaled(16) }]}>{t.browseMenu}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

            {/* ── Cart Items ── */}
            {cartItems.map((item, index) => (
              <View
                key={`${item.id}-${index}`}
                style={[styles.cartCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                {/* Olive left accent stripe */}
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
                    <Feather name="x" size={13} color="#991b1b" />
                    <Text style={[styles.removeButtonText, { fontSize: scaled(13) }]}>{t.remove}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.cartItemDescription, { fontSize: scaled(14), color: theme.textPrimary }]}>
                  {translateMealDescription(item.description, language)}
                </Text>

                {item.specialNote ? (
                  <View style={styles.specialNoteRow}>
                    <Feather name="edit-3" size={13} color="#92400E" />
                    <Text style={[styles.specialNoteText, { fontSize: scaled(13) }]}>{item.specialNote}</Text>
                  </View>
                ) : null}

                <View style={styles.nutritionRow}>
                  <View style={styles.nutritionChip}>
                    <Text style={[styles.nutritionText, { fontSize: scaled(13) }]}>{item.kcal} {t.calories}</Text>
                  </View>
                  <View style={styles.nutritionChip}>
                    <Text style={[styles.nutritionText, { fontSize: scaled(13) }]}>{item.sodium_mg} mg {t.sodium}</Text>
                  </View>
                  <View style={styles.nutritionChip}>
                    <Text style={[styles.nutritionText, { fontSize: scaled(13) }]}>{item.protein_g} g {t.protein}</Text>
                  </View>
                </View>
              </View>
            ))}

            {/* ── Total Nutrition card ── */}
            <View style={styles.totalsCard}>
              <Text style={[styles.totalsTitle, { fontSize: scaled(20) }]}>{t.totalNutrition}</Text>
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

          {/* ── Bottom Action Bar ── */}
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
              <Feather name="check-circle" size={18} color="#FFF" />
              <Text style={[styles.confirmButtonText, { fontSize: scaled(17) }]}>{t.confirmOrder}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backText: { fontWeight: '700' },
  headerTitle: { fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { marginTop: 2, fontWeight: '500' },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0EFE6',
    borderWidth: 1,
    borderColor: '#E2DFD8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontWeight: '700', color: '#111827', textAlign: 'center' },
  emptyText: { color: '#6b7280', textAlign: 'center', lineHeight: 24 },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#717644',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 8,
  },
  browseButtonText: { fontWeight: '700', color: '#ffffff' },

  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },

  // Cart card
  cartCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    borderWidth: 1,
    overflow: 'hidden',
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
    flexWrap: 'wrap',
  },
  cartItemName: { fontWeight: '700', color: '#111827', flex: 1 },
  periodBadge: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: '#EEF2F7',
  },
  periodBadgeText: { fontWeight: '600', color: '#374151' },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },
  removeButtonText: { fontWeight: '600', color: '#991b1b' },
  cartItemDescription: { marginBottom: 12, lineHeight: 20 },
  specialNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  specialNoteText: { flex: 1, color: '#92400E', fontStyle: 'italic' },
  nutritionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nutritionChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  nutritionText: { color: '#111827', fontWeight: '600' },

  // Total nutrition (warm gold card)
  totalsCard: {
    backgroundColor: '#FFF7E2',
    borderRadius: 22,
    padding: 20,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: '#F1D39A',
  },
  totalsTitle: {
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  totalsGrid: { flexDirection: 'row', gap: 10 },
  totalItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1D39A',
  },
  totalValue: { fontWeight: '800', color: '#111827', marginBottom: 2, letterSpacing: -0.6 },
  totalLabel: { fontWeight: '600', color: '#374151', textAlign: 'center' },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  bottomBarInfo: { flex: 1 },
  itemCount: { fontWeight: '700', marginBottom: 1 },
  calorieCount: { fontWeight: '500' },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  confirmButtonText: { fontWeight: '700', color: '#ffffff', letterSpacing: 0.5 },
});

export default CartScreen;
