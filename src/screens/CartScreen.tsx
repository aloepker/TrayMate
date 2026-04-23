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
import { ResidentService } from '../services/localDataService';
import { getUnsafeReason } from '../services/mealSafetyService';
import { createOverrideApi } from '../services/api';

const COLORS = {
  primary: '#717644',
  primaryLight: '#F4F3EE',
  surface: '#FFFFFF',
  background: '#FAF9F6',
  border: '#E8E6E1',
  text: '#1A1A1A',
  textMuted: '#5C5C5C',
  accent: '#717644',
  danger: '#C53030',
  dangerBg: '#FFF5F5',
  success: '#2D6A4F',
  warmBg: '#FDF8F0',
  warmBorder: '#E8DCC8',
};

const CartScreen = ({ navigation, route }: any) => {
  const { cart: cartItems, removeFromCart, placeOrder, replaceOrder, getTotalNutrition } = useCart();
  const { t, scaled, language, notifications, getTouchTargetSize, theme, setCurrentResidentId } = useSettings();
  const touchTarget = getTouchTargetSize();

  useEffect(() => {
    setCurrentResidentId(route?.params?.residentId ?? null);
  }, [route?.params?.residentId, setCurrentResidentId]);

  const residentId =
    (route?.params?.residentId as string | undefined) ||
    ResidentService.getDefaultResident().id;
  const residentName =
    route?.params?.residentName ||
    ResidentService.getResidentById(residentId)?.fullName ||
    ResidentService.getDefaultResident().fullName;
  const dietaryRestrictions = route?.params?.dietaryRestrictions ?? [];
  const foodAllergies = route?.params?.foodAllergies ?? [];

  // ── Per-item safety evaluation (also drives the red warning card below) ──
  const residentProfile = { foodAllergies, dietaryRestrictions };
  const cartSafety = cartItems.map((item) => ({
    item,
    reason: getUnsafeReason(item as any, residentProfile),
  }));
  const unsafeEntries = cartSafety.filter((x) => x.reason !== null);
  const hasUnsafe = unsafeEntries.length > 0;

  const removeAllUnsafe = () => {
    // Remove in reverse-index order so earlier indices stay valid as we splice.
    const indices = cartSafety
      .map((x, i) => (x.reason !== null ? i : -1))
      .filter((i) => i >= 0)
      .sort((a, b) => b - a);
    indices.forEach((i) => removeFromCart(i));
  };

  /**
   * File a medical-override request for the current cart and return the
   * user to the dashboard. Admin will review in their Pending Overrides
   * queue; on approval the resident's NEXT attempt at this exact cart +
   * meal period + date will pass compliance.
   */
  const requestOverride = async (violationLines: string) => {
    try {
      const mealIds = cartItems.map((m) => Number(m.id)).filter((n) => !isNaN(n));
      const today = new Date().toISOString().slice(0, 10);
      const ridNum = Number(residentId);
      if (!mealIds.length || isNaN(ridNum)) {
        Alert.alert('Unable to request override', 'Cart or resident is invalid.');
        return;
      }
      await createOverrideApi({
        residentId: ridNum,
        mealIds,
        mealOfDay: undefined, // backend fills in from order context on placement
        targetDate: today,
        reason: `Violations at request:\n${violationLines}`,
      });
      Alert.alert(
        'Override requested',
        `Your request has been sent to the administrator for review. You can re-attempt this order after it's approved.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      console.warn('Failed to create override request', err);
      Alert.alert('Unable to request override', err?.message ?? 'Please try again.');
    }
  };

  const confirmOrder = async () => {
    // Safety gate — block checkout if any cart item is unsafe for this resident.
    if (hasUnsafe) {
      const lines = unsafeEntries
        .map((x) => `• ${x.item.name} — ${x.reason}`)
        .join('\n');
      Alert.alert(
        'Unsafe meals in cart',
        `These items are not safe for ${residentName}:\n\n${lines}\n\nYou can remove the unsafe items, or request a one-time medical override from an administrator.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Request Override',
            onPress: () => requestOverride(lines),
          },
          {
            text: 'Remove unsafe items',
            style: 'destructive',
            onPress: removeAllUnsafe,
          },
        ],
      );
      return;
    }

    try {
      const { order, conflict, complianceBlock } = await placeOrder(residentId);

      // Backend rejected the order because a meal violates the resident's
      // dietary profile and there's no approved override. Offer a one-shot
      // path to request one from the admin.
      if (complianceBlock) {
        const lines = (complianceBlock.meals ?? [])
          .filter((m) => !m.safe)
          .flatMap((m) =>
            (m.violations ?? []).map((v) => `• ${m.mealName} — ${v.reason}`),
          )
          .join('\n');
        Alert.alert(
          'Order blocked by dietary profile',
          `${lines || 'This order violates the resident\'s dietary profile.'}\n\nYou can request a one-time medical override from an administrator.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Request Override',
              onPress: () => requestOverride(lines),
            },
          ],
        );
        return;
      }

      if (conflict && conflict.id > 0) {
        Alert.alert(
          'Order Already Exists',
          `You already have a pending ${conflict.mealOfDay} order for ${conflict.date}. Replace it with this cart?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Replace Order',
              onPress: async () => {
                const replaced = await replaceOrder(conflict.id, residentId);
                if (replaced && notifications.orderUpdates) {
                  Alert.alert(t.orderUpdates, t.orderUpdatesDesc);
                }
                navigation.navigate('UpcomingMeals', { residentId, residentName, dietaryRestrictions, foodAllergies });
              },
            },
          ]
        );
        return;
      }

      if (order && notifications.orderUpdates) {
        Alert.alert(t.orderUpdates, t.orderUpdatesDesc);
      }
      navigation.navigate('UpcomingMeals', { residentId, residentName, dietaryRestrictions, foodAllergies });
    } catch (error) {
      console.warn('Failed to confirm order:', error);
      Alert.alert('Unable to confirm order', 'Please try again.');
    }
  };

  const totals = getTotalNutrition();
  const backLabel = t.backToMenu.replace(/^[\s←↩⬅]+/, '');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { minHeight: touchTarget }]}
        >
          <Feather name="chevron-left" size={22} color={COLORS.primary} />
          <Text style={[styles.backText, { fontSize: scaled(16) }]}>{backLabel}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { fontSize: scaled(26) }]}>{t.yourCart}</Text>
          <Text style={[styles.headerSubtitle, { fontSize: scaled(14) }]}>
            {cartItems.length} {cartItems.length === 1 ? t.itemsReady.split(' ')[0] : t.itemsReady}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Nutrition summary bar — shown when cart has items */}
      {cartItems.length > 0 && (
        <View style={styles.nutritionBar}>
          <View style={styles.nutritionBarItem}>
            <Text style={[styles.nutritionBarValue, { fontSize: scaled(18) }]}>{totals.calories}</Text>
            <Text style={[styles.nutritionBarLabel, { fontSize: scaled(11) }]}>kcal</Text>
          </View>
          <View style={styles.nutritionBarDivider} />
          <View style={styles.nutritionBarItem}>
            <Text style={[styles.nutritionBarValue, { fontSize: scaled(18) }]}>{totals.sodium}<Text style={styles.nutritionBarUnit}>mg</Text></Text>
            <Text style={[styles.nutritionBarLabel, { fontSize: scaled(11) }]}>sodium</Text>
          </View>
          <View style={styles.nutritionBarDivider} />
          <View style={styles.nutritionBarItem}>
            <Text style={[styles.nutritionBarValue, { fontSize: scaled(18) }]}>{totals.protein}<Text style={styles.nutritionBarUnit}>g</Text></Text>
            <Text style={[styles.nutritionBarLabel, { fontSize: scaled(11) }]}>protein</Text>
          </View>
        </View>
      )}

      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Feather name="shopping-bag" size={48} color={COLORS.primary} />
          </View>
          <Text style={[styles.emptyTitle, { fontSize: scaled(22) }]}>{t.cartEmpty}</Text>
          <Text style={[styles.emptyText, { fontSize: scaled(15) }]}>{t.cartEmptyDesc}</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="book-open" size={18} color="#FFFFFF" />
            <Text style={[styles.browseButtonText, { fontSize: scaled(16) }]}>{t.browseMenu}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Safety banner — appears when any cart item is unsafe for the resident */}
            {hasUnsafe && (
              <View style={styles.safetyBanner}>
                <View style={styles.safetyBannerIconWrap}>
                  <Feather name="alert-triangle" size={20} color={COLORS.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.safetyBannerTitle, { fontSize: scaled(15) }]}>
                    {unsafeEntries.length === 1
                      ? '1 unsafe meal in your cart'
                      : `${unsafeEntries.length} unsafe meals in your cart`}
                  </Text>
                  <Text style={[styles.safetyBannerBody, { fontSize: scaled(13) }]}>
                    Remove them to place your order.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.safetyBannerBtn, { minHeight: touchTarget, justifyContent: 'center' }]}
                  onPress={removeAllUnsafe}
                >
                  <Text style={[styles.safetyBannerBtnText, { fontSize: scaled(13) }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}

            {cartItems.map((item, index) => {
              const unsafeReason = cartSafety[index]?.reason ?? null;
              return (
              <View
                key={`${item.id}-${index}`}
                style={[styles.cartCard, unsafeReason && styles.cartCardUnsafe]}
              >
                {/* Per-item unsafe reason strip */}
                {unsafeReason && (
                  <View style={styles.unsafeReasonRow}>
                    <Feather name="alert-triangle" size={13} color={COLORS.danger} />
                    <Text style={[styles.unsafeReasonText, { fontSize: scaled(12) }]}>
                      {unsafeReason}
                    </Text>
                  </View>
                )}
                {/* Row 1: Period badge + remove */}
                <View style={styles.cartCardTopRow}>
                  <View style={styles.periodBadge}>
                    <Text style={[styles.periodBadgeText, { fontSize: scaled(11) }]}>
                      {translateMealPeriod(item.meal_period, language)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.removeButton, { minHeight: touchTarget, justifyContent: 'center' }]}
                    onPress={() => removeFromCart(index)}
                  >
                    <Feather name="x" size={16} color={COLORS.danger} />
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>

                {/* Row 2: Meal name */}
                <Text style={[styles.cartItemName, { fontSize: scaled(20) }]}>
                  {translateMealName(item.name, language)}
                </Text>

                {/* Row 3: Description */}
                <Text style={[styles.cartItemDescription, { fontSize: scaled(14) }]}>
                  {translateMealDescription(item.description, language)}
                </Text>

                {item.specialNote ? (
                  <View style={styles.specialNoteRow}>
                    <Feather name="edit-3" size={13} color="#92400E" />
                    <Text style={[styles.specialNoteText, { fontSize: scaled(13) }]}>{item.specialNote}</Text>
                  </View>
                ) : null}

                {/* Row 4: Nutrition */}
                <View style={styles.nutritionRow}>
                  <View style={styles.nutritionChip}>
                    <Text style={[styles.nutritionText, { fontSize: scaled(13) }]}>{item.kcal} kcal</Text>
                  </View>
                  <View style={styles.nutritionChip}>
                    <Text style={[styles.nutritionText, { fontSize: scaled(13) }]}>{item.sodium_mg}mg sodium</Text>
                  </View>
                  <View style={styles.nutritionChip}>
                    <Text style={[styles.nutritionText, { fontSize: scaled(13) }]}>{item.protein_g}g protein</Text>
                  </View>
                </View>
              </View>
              );
            })}

          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={styles.bottomBar}>
            <View style={styles.bottomBarInfo}>
              <Text style={[styles.itemCount, { fontSize: scaled(16) }]}>
                {cartItems.length} {t.meals}
              </Text>
              <Text style={[styles.calorieCount, { fontSize: scaled(13) }]}>
                {totals.calories} {t.totalCalories}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                { minHeight: touchTarget, justifyContent: 'center' },
                hasUnsafe && styles.confirmButtonDisabled,
              ]}
              onPress={confirmOrder}
            >
              <Feather
                name={hasUnsafe ? 'alert-triangle' : 'check-circle'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={[styles.confirmButtonText, { fontSize: scaled(16) }]}>
                {hasUnsafe ? 'Fix unsafe items' : t.confirmOrder}
              </Text>
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingRight: 8,
  },
  backText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  nutritionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  nutritionBarItem: {
    flex: 1,
    alignItems: 'center',
  },
  nutritionBarValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  nutritionBarUnit: {
    fontSize: 13,
    fontWeight: '600',
  },
  nutritionBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 1,
  },
  nutritionBarDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  cartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Red-tinted card when this item is unsafe for the resident.
  cartCardUnsafe: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
  },
  // Top-of-list red banner summarising unsafe item count.
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.dangerBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  safetyBannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.danger,
  },
  safetyBannerBody: {
    fontSize: 13,
    color: '#7F1D1D',
    marginTop: 2,
    fontWeight: '500',
  },
  safetyBannerBtn: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  safetyBannerBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  // Per-card strip explaining WHY this specific meal is unsafe.
  unsafeReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FECACA',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  unsafeReasonText: {
    flex: 1,
    fontSize: 12,
    color: '#7F1D1D',
    fontWeight: '700',
  },
  cartCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartItemName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  periodBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.dangerBg,
  },
  removeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.danger,
  },
  cartItemDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 12,
    lineHeight: 21,
  },
  specialNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  specialNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontStyle: 'italic',
  },
  nutritionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  nutritionChip: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  nutritionText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  bottomBarInfo: {
    flex: 1,
  },
  itemCount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 1,
  },
  calorieCount: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  // Turns red when any cart item is unsafe — the button still taps, but
  // opens the "remove unsafe items" dialog instead of placing the order.
  confirmButtonDisabled: {
    backgroundColor: COLORS.danger,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default CartScreen;
