/**
 * MyOverridesScreen
 * ------------------------------------------------------------------
 * Resident-facing list of medical override requests the resident (or a
 * caregiver acting for them) has filed. Shows status at a glance —
 * PENDING / APPROVED / DENIED / EXPIRED / CONSUMED — so the resident
 * knows whether to re-attempt the blocked order.
 *
 * This is the "in-sync" piece: as soon as the admin approves/denies the
 * request from their dashboard, this screen reflects it on next refresh
 * (pull-to-refresh, or the 15s auto-poll while the screen is focused).
 *
 * Route params: { residentId: number, residentName?: string }
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { Alert } from 'react-native';
import {
  listResidentOverridesApi,
  type OverrideRequest,
  type OverrideStatus,
} from '../services/api';
import { MealService } from '../services/localDataService';
import { useCart } from './context/CartContext';
import { useSettings } from './context/SettingsContext';

const COLORS = {
  primary: '#717644',
  surface: '#FFFFFF',
  background: '#FAF9F6',
  border: '#E8E6E1',
  text: '#1A1A1A',
  textMuted: '#5C5C5C',
  danger: '#C53030',
  dangerBg: '#FFF5F5',
  success: '#2D6A4F',
  successBg: '#E8F5EE',
  amber: '#B7791F',
  amberBg: '#FEF6E7',
  grayBg: '#EFEFEF',
};

// STATUS_STYLES built at render time using t.* keys — see inside component

function formatDateTime(iso: string | null | undefined, hour12 = true): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString([], { hour12 });
}

export default function MyOverridesScreen({ navigation, route }: any) {
  const { t, setCurrentResidentId, use24Hour } = useSettings();

  const STATUS_STYLES: Record<OverrideStatus, { label: string; fg: string; bg: string; icon: string }> = {
    PENDING:  { label: t.statusPending,  fg: COLORS.amber,     bg: COLORS.amberBg,   icon: 'clock' },
    APPROVED: { label: t.statusApproved, fg: COLORS.success,   bg: COLORS.successBg, icon: 'check-circle' },
    DENIED:   { label: t.statusDenied,   fg: COLORS.danger,    bg: COLORS.dangerBg,  icon: 'x-circle' },
    EXPIRED:  { label: t.statusExpired,  fg: COLORS.textMuted, bg: COLORS.grayBg,    icon: 'clock' },
    CONSUMED: { label: t.statusUsed,     fg: COLORS.textMuted, bg: COLORS.grayBg,    icon: 'check' },
  };

  const residentId: number | undefined = route?.params?.residentId;
  const residentName: string | undefined = route?.params?.residentName;

  useEffect(() => {
    if (residentId != null) setCurrentResidentId(String(residentId));
  }, [residentId, setCurrentResidentId]);

  const [items, setItems] = useState<OverrideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placingOverrideId, setPlacingOverrideId] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { placeOrder } = useCart();

  /**
   * One-tap reorder for an approved override. Reads the meal IDs off
   * the override record, resolves them through the local meal cache,
   * builds the cart items inline, and places the order directly —
   * skipping the menu navigation + retyping the request that the
   * resident already went through to get this approved.
   */
  const orderApprovedOverride = useCallback(async (r: OverrideRequest) => {
    if (!residentId) return;
    setPlacingOverrideId(r.id);
    try {
      const ids = String(r.mealIds ?? '')
        .split(/[, ]+/)
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (ids.length === 0) {
        Alert.alert('Cannot reorder', 'This approval has no meal information attached.');
        return;
      }
      const meals = await Promise.all(ids.map((id) => MealService.getMealById(id)));
      const cartItems = meals
        .filter((m): m is NonNullable<typeof m> => !!m)
        .map((m) => ({
          id: Number(m.id),
          name: m.name,
          meal_period: m.mealPeriod as any,
          description: m.description,
          kcal: m.nutrition?.calories ?? 0,
          sodium_mg: parseInt(String(m.nutrition?.sodium ?? '0'), 10),
          protein_g: parseInt(String(m.nutrition?.protein ?? '0'), 10),
          tags: m.tags ?? [],
          imageUrl: m.imageUrl,
        }));
      if (cartItems.length === 0) {
        Alert.alert(
          'Meals not found',
          'Could not find the approved meals in the local catalog. Please reorder from the menu.',
        );
        return;
      }
      const period = r.mealOfDay || 'Lunch';
      const result = await placeOrder(String(residentId), period, cartItems as any);
      if (result.order) {
        Alert.alert(
          'Order placed',
          `${cartItems.map((c) => c.name).join(', ')} ordered for ${period}.`,
        );
      } else if (result.conflict) {
        Alert.alert(
          'Already ordered',
          `There's already an order for ${period} today. Open Upcoming Meals to view it.`,
        );
      } else {
        Alert.alert('Could not place order', 'Please try again or order from the menu.');
      }
    } catch (e: any) {
      console.warn('[Overrides] reorder failed', e);
      Alert.alert('Order failed', e?.message ?? 'Network error. Please try again.');
    } finally {
      setPlacingOverrideId(null);
    }
  }, [residentId, placeOrder]);

  const load = useCallback(async () => {
    // Guard: residentId must be a real positive integer. `Number(undefined)`
    // upstream yields NaN, which would otherwise fetch `/overrides/resident/NaN`
    // and surface Spring's raw 404.
    if (residentId == null || !Number.isFinite(residentId) || residentId <= 0) {
      setError('Resident not specified.');
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const list = await listResidentOverridesApi(residentId);
      setItems(list);
    } catch (err: any) {
      console.warn('Failed to load my overrides', err);
      if (err?.status === 404) {
        // No records for this resident yet (or the backend build doesn't
        // know this route — either way, show the empty state rather than
        // a scary "Not Found").
        setItems([]);
      } else if (err?.status === 403) {
        setError("You aren't authorized to view this resident's override history.");
      } else {
        setError(err?.message ?? 'Unable to load your requests.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [residentId]);

  // Poll only while focused. Was useEffect, which left the 15s
  // interval firing forever after the user navigated away — each
  // re-entry stacked another orphan poller on the JS thread. The
  // useFocusEffect version starts polling on focus, tears down the
  // interval on blur, and re-establishes on next focus.
  useFocusEffect(
    useCallback(() => {
      load();
      pollRef.current = setInterval(load, 15000);
      return () => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };
    }, [load]),
  );

  const onRefresh = () => { setRefreshing(true); load(); };

  const pending = items.filter((r) => r.status === 'PENDING').length;
  const approved = items.filter((r) => r.status === 'APPROVED').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Feather name="chevron-left" size={22} color={COLORS.primary} />
            <Text style={styles.backText}>{t.back.replace(/^[←↩⬅]\s*/, '')}</Text>
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title} numberOfLines={1}>{t.overrideRequests}</Text>
            {residentName ? (
              <Text style={styles.subtitle} numberOfLines={1}>{residentName}</Text>
            ) : null}
          </View>
          <View style={styles.backBtn} />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>{t.retry}</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerWrap}>
          <Feather name="inbox" size={36} color={COLORS.textMuted} />
          <Text style={styles.emptyHeader}>{t.noOverrideRequestsYet}</Text>
          <Text style={styles.emptySub}>{t.noOverrideRequestsHint}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {(pending > 0 || approved > 0) && (
            <View style={styles.summaryRow}>
              {pending > 0 && (
                <View style={[styles.summaryPill, { backgroundColor: COLORS.amberBg }]}>
                  <Text style={[styles.summaryPillText, { color: COLORS.amber }]}>
                    {pending} pending
                  </Text>
                </View>
              )}
              {approved > 0 && (
                <View style={[styles.summaryPill, { backgroundColor: COLORS.successBg }]}>
                  <Text style={[styles.summaryPillText, { color: COLORS.success }]}>
                    {approved} approved — ready to re-order
                  </Text>
                </View>
              )}
            </View>
          )}

          {items.map((r) => {
            const s = STATUS_STYLES[r.status] ?? STATUS_STYLES.PENDING;
            return (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                    <Feather name={s.icon as any} size={12} color={s.fg} />
                    <Text style={[styles.statusPillText, { color: s.fg }]}>{s.label}</Text>
                  </View>
                  <Text style={styles.timeText}>{formatDateTime(r.requestedAt, !use24Hour)}</Text>
                </View>

                <View style={styles.metaRow}>
                  {r.mealOfDay ? (
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>{r.mealOfDay}</Text>
                    </View>
                  ) : null}
                  {r.targetDate ? (
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>{r.targetDate}</Text>
                    </View>
                  ) : null}
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>{t.mealIds.replace('{ids}', String(r.mealIds))}</Text>
                  </View>
                </View>

                {r.violationsJson ? (
                  <View style={styles.violationsBox}>
                    <Text style={styles.violationsHeader}>{t.whyFlagged}</Text>
                    <Text style={styles.violationsText}>{r.violationsJson}</Text>
                  </View>
                ) : null}

                {r.status === 'APPROVED' && (
                  <View>
                    <Text style={styles.approvalNote}>
                      Approved{r.decidedByName ? ` by ${r.decidedByName}` : ''}
                      {r.expiresAt ? ` — expires ${formatDateTime(r.expiresAt, !use24Hour)}` : ''}.
                    </Text>
                    <Pressable
                      onPress={() => orderApprovedOverride(r)}
                      disabled={placingOverrideId === r.id}
                      style={({ pressed }) => [
                        styles.reorderBtn,
                        placingOverrideId === r.id && { opacity: 0.5 },
                        pressed && placingOverrideId !== r.id && { opacity: 0.85 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Order this meal now"
                    >
                      {placingOverrideId === r.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Feather name="check-circle" size={15} color="#FFFFFF" />
                      )}
                      <Text style={styles.reorderBtnText}>
                        {placingOverrideId === r.id ? t.placing : t.orderThisMealNow}
                      </Text>
                    </Pressable>
                  </View>
                )}
                {r.status === 'DENIED' && r.decisionReason ? (
                  <Text style={styles.deniedNote}>{t.adminNote.replace('{note}', r.decisionReason)}</Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    // Extra top padding on Android to clear the status bar (iOS handles
    // this via SafeAreaView). 16 below accounts for inset on iPad too.
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 12 : 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 72 },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 15, marginLeft: 2 },
  headerTitleWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 3 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyHeader: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptySub: { color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
  errorText: { color: COLORS.danger, marginBottom: 12, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  summaryPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  summaryPillText: { fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  timeText: { color: COLORS.textMuted, fontSize: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  metaPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F4F3EE' },
  metaPillText: { color: COLORS.text, fontSize: 12 },
  violationsBox: {
    marginTop: 10, padding: 10, borderRadius: 8,
    backgroundColor: COLORS.dangerBg,
    borderLeftWidth: 3, borderLeftColor: COLORS.danger,
  },
  violationsHeader: { color: COLORS.danger, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  violationsText: { color: COLORS.text, fontSize: 13, lineHeight: 18 },
  approvalNote: { color: COLORS.success, fontSize: 13, marginTop: 10, lineHeight: 18 },
  reorderBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: COLORS.success,
  },
  reorderBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  deniedNote: { color: COLORS.textMuted, fontSize: 13, marginTop: 10, lineHeight: 18, fontStyle: 'italic' },
});
