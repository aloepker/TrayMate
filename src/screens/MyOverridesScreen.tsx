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
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
  listResidentOverridesApi,
  type OverrideRequest,
  type OverrideStatus,
} from '../services/api';

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

const STATUS_STYLES: Record<OverrideStatus, { label: string; fg: string; bg: string; icon: string }> = {
  PENDING:  { label: 'Pending',   fg: COLORS.amber,   bg: COLORS.amberBg,   icon: 'clock' },
  APPROVED: { label: 'Approved',  fg: COLORS.success, bg: COLORS.successBg, icon: 'check-circle' },
  DENIED:   { label: 'Denied',    fg: COLORS.danger,  bg: COLORS.dangerBg,  icon: 'x-circle' },
  EXPIRED:  { label: 'Expired',   fg: COLORS.textMuted, bg: COLORS.grayBg,  icon: 'clock' },
  CONSUMED: { label: 'Used',      fg: COLORS.textMuted, bg: COLORS.grayBg,  icon: 'check' },
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function MyOverridesScreen({ navigation, route }: any) {
  const residentId: number | undefined = route?.params?.residentId;
  const residentName: string | undefined = route?.params?.residentName;

  const [items, setItems] = useState<OverrideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (residentId == null) {
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
      setError(err?.message ?? 'Unable to load your requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [residentId]);

  useEffect(() => {
    load();
    // Light polling every 15s so approved/denied changes show up without
    // the user having to pull-to-refresh. Cleared on unmount.
    pollRef.current = setInterval(load, 15000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const pending = items.filter((r) => r.status === 'PENDING').length;
  const approved = items.filter((r) => r.status === 'APPROVED').length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="chevron-left" size={22} color={COLORS.primary} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.title}>Override Requests</Text>
          {residentName ? <Text style={styles.subtitle}>{residentName}</Text> : null}
        </View>
        <View style={{ width: 64 }} />
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerWrap}>
          <Feather name="inbox" size={36} color={COLORS.textMuted} />
          <Text style={styles.emptyHeader}>No override requests yet</Text>
          <Text style={styles.emptySub}>
            When a cart is blocked by the dietary profile you can ask the administrator for a one-time override. It will show up here.
          </Text>
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
                  <Text style={styles.timeText}>{formatDateTime(r.requestedAt)}</Text>
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
                    <Text style={styles.metaPillText}>Meal IDs {r.mealIds}</Text>
                  </View>
                </View>

                {r.violationsJson ? (
                  <View style={styles.violationsBox}>
                    <Text style={styles.violationsHeader}>Why this was flagged</Text>
                    <Text style={styles.violationsText}>{r.violationsJson}</Text>
                  </View>
                ) : null}

                {r.status === 'APPROVED' && (
                  <Text style={styles.approvalNote}>
                    Approved{r.decidedByName ? ` by ${r.decidedByName}` : ''}
                    {r.expiresAt ? ` — expires ${formatDateTime(r.expiresAt)}` : ''}.
                    Place the same order again to use this approval.
                  </Text>
                )}
                {r.status === 'DENIED' && r.decisionReason ? (
                  <Text style={styles.deniedNote}>Admin note: {r.decisionReason}</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 64 },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
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
  deniedNote: { color: COLORS.textMuted, fontSize: 13, marginTop: 10, lineHeight: 18, fontStyle: 'italic' },
});
