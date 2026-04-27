/**
 * PendingOverridesScreen
 * ------------------------------------------------------------------
 * Admin-only queue of medical override requests waiting for a decision.
 * Each card shows:
 *   - resident id + the requester's name/role
 *   - the exact meal period / date / meal ids the request covers
 *   - a plain-text snapshot of the violations at request time (so the
 *     admin sees WHY it was flagged)
 *   - optional free-text reason from the requester
 * plus Approve / Deny buttons. Approving sets a 24-hour TTL on the
 * override; the next matching order from the resident consumes it.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
  listPendingOverridesApi,
  approveOverrideApi,
  denyOverrideApi,
  type OverrideRequest,
} from '../../services/api';

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
};

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const secs = Math.max(0, Math.round((now - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export default function PendingOverridesScreen({ navigation }: any) {
  const [items, setItems] = useState<OverrideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await listPendingOverridesApi();
      setItems(list);
    } catch (err: any) {
      console.warn('Failed to load overrides', err);
      // 404 is the empty state — either no pending overrides exist yet,
      // or the deployed backend predates this endpoint. Either way, the
      // empty card reads much better than a "Not Found" / Retry banner.
      if (err?.status === 404) {
        setItems([]);
      } else if (err?.status === 403) {
        setError("You don't have permission to view override requests.");
      } else {
        const msg = err?.message === 'Network request failed'
          ? 'Server unreachable. It may be waking up — tap Retry in a moment.'
          : err?.message ?? 'Unable to load requests.';
        setError(msg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const decide = async (id: number, verb: 'approve' | 'deny') => {
    setBusyId(id);
    try {
      if (verb === 'approve') {
        await approveOverrideApi(id);
      } else {
        await denyOverrideApi(id);
      }
      // Drop the item locally for instant feedback; list will refresh on pull.
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      console.warn(`Failed to ${verb} override`, err);
      if (err?.status === 403) {
        Alert.alert(
          'Not authorized',
          err?.message?.includes('yourself')
            ? "You can't approve or deny an override you filed yourself — another admin has to do it."
            : 'Only administrators can decide override requests.',
        );
      } else {
        Alert.alert(`Unable to ${verb}`, err?.message ?? 'Please try again.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeny = (id: number) => {
    Alert.alert(
      'Deny override?',
      'The resident will be told their request was declined. You can add a reason in a future version.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deny', style: 'destructive', onPress: () => decide(id, 'deny') },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Feather name="chevron-left" size={22} color={COLORS.primary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.title} numberOfLines={1}>Pending Overrides</Text>
          </View>
          <View style={{ width: 72 }} />
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
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerWrap}>
          <Feather name="check-circle" size={36} color={COLORS.success} />
          <Text style={styles.emptyHeader}>All caught up</Text>
          <Text style={styles.emptySub}>No pending override requests.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {items.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.pillAmber}>
                  <Feather name="clock" size={12} color={COLORS.amber} />
                  <Text style={styles.pillAmberText}>PENDING</Text>
                </View>
                <Text style={styles.timeText}>{timeAgo(r.requestedAt)}</Text>
              </View>

              <Text style={styles.cardTitle}>Resident #{r.residentId}</Text>
              <Text style={styles.cardSub}>
                Requested by {r.requestedByName || 'Unknown'}
                {r.requestedByRole ? ` (${r.requestedByRole.replace(/^ROLE_/, '')})` : ''}
              </Text>

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
                  <Text style={styles.violationsHeader}>Violations at request time</Text>
                  <Text style={styles.violationsText}>{r.violationsJson}</Text>
                </View>
              ) : null}

              {r.reason ? (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonHeader}>Reason given</Text>
                  <Text style={styles.reasonText}>{r.reason}</Text>
                </View>
              ) : null}

              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.denyBtn, busyId === r.id && styles.btnDisabled]}
                  onPress={() => confirmDeny(r.id)}
                  disabled={busyId === r.id}
                >
                  <Feather name="x" size={16} color={COLORS.danger} />
                  <Text style={styles.denyBtnText}>Deny</Text>
                </Pressable>
                <Pressable
                  style={[styles.approveBtn, busyId === r.id && styles.btnDisabled]}
                  onPress={() => decide(r.id, 'approve')}
                  disabled={busyId === r.id}
                >
                  {busyId === r.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather name="check" size={16} color="#fff" />
                      <Text style={styles.approveBtnText}>Approve (24h)</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: 16,
    // Clear the Android status bar; iOS gets the inset via SafeAreaView.
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 12 : 16,
    paddingBottom: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 44,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 72 },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyHeader: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptySub: { color: COLORS.textMuted, marginTop: 4 },
  errorText: { color: COLORS.danger, marginBottom: 12, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pillAmber: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: COLORS.amberBg,
  },
  pillAmberText: { color: COLORS.amber, fontSize: 11, fontWeight: '700' },
  timeText: { color: COLORS.textMuted, fontSize: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  cardSub: { color: COLORS.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  metaPill: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: '#F4F3EE',
  },
  metaPillText: { color: COLORS.text, fontSize: 12 },
  violationsBox: {
    marginTop: 12, padding: 10, borderRadius: 8,
    backgroundColor: COLORS.dangerBg,
    borderLeftWidth: 3, borderLeftColor: COLORS.danger,
  },
  violationsHeader: { color: COLORS.danger, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  violationsText: { color: COLORS.text, fontSize: 13, lineHeight: 18 },
  reasonBox: {
    marginTop: 8, padding: 10, borderRadius: 8,
    backgroundColor: '#F4F3EE',
  },
  reasonHeader: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  reasonText: { color: COLORS.text, fontSize: 13, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  denyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.danger, backgroundColor: COLORS.dangerBg,
  },
  denyBtnText: { color: COLORS.danger, fontWeight: '600' },
  approveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 8,
    backgroundColor: COLORS.success,
  },
  approveBtnText: { color: '#fff', fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
