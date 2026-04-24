/**
 * MealCoverageAlertsScreen
 * ------------------------------------------------------------------
 * Admin + kitchen-facing surface for coverage alerts: residents whose
 * dietary profile rules out every available meal in a given meal period.
 *
 * Each card shows:
 *   - resident name + room
 *   - which meal period has zero safe options (BREAKFAST / LUNCH / DINNER)
 *   - how many meals were considered ("0 of 4 safe")
 *   - how long the alert has been open
 *   - ACKNOWLEDGE button (admin only — kitchen sees the card but can't dismiss)
 *   - "Re-evaluate all" button re-runs the compliance sweep server-side,
 *     which auto-resolves any alert that no longer holds (menu was fixed,
 *     profile was corrected, etc.)
 *
 * Alerts are event-driven on the backend: we auto-create when a profile
 * edit or a kitchen availability toggle removes the last safe option, and
 * auto-resolve when a safe option reappears. This screen is the read
 * surface plus the manual kick if something looks stuck.
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
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
  listCoverageAlertsApi,
  acknowledgeCoverageAlertApi,
  reEvaluateCoverageAlertsApi,
  type MealCoverageAlert,
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
  grayBg: '#EFEFEF',
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

function periodLabel(mealPeriod: string): string {
  return (mealPeriod || '').trim().toUpperCase();
}

export default function MealCoverageAlertsScreen({ navigation }: any) {
  const [items, setItems] = useState<MealCoverageAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reEvaluating, setReEvaluating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await listCoverageAlertsApi();
      setItems(list);
    } catch (err: any) {
      console.warn('Failed to load coverage alerts', err);
      setError(err?.message ?? 'Unable to load alerts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const onAcknowledge = async (id: number) => {
    setBusyId(id);
    try {
      const updated = await acknowledgeCoverageAlertApi(id);
      setItems((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err: any) {
      console.warn('Failed to acknowledge', err);
      if (err?.status === 403) {
        Alert.alert('Not authorized', 'Only administrators can acknowledge coverage alerts.');
      } else {
        Alert.alert('Unable to acknowledge', err?.message ?? 'Please try again.');
      }
    } finally {
      setBusyId(null);
    }
  };

  const onReEvaluate = async () => {
    setReEvaluating(true);
    try {
      const r = await reEvaluateCoverageAlertsApi();
      await load();
      Alert.alert(
        'Re-evaluation complete',
        `Checked ${r.residentsEvaluated} resident${r.residentsEvaluated === 1 ? '' : 's'}. Any alerts that no longer apply were auto-resolved.`,
      );
    } catch (err: any) {
      console.warn('Re-evaluate failed', err);
      if (err?.status === 403) {
        Alert.alert('Not authorized', 'Only administrators can trigger a re-evaluation.');
      } else {
        Alert.alert('Unable to re-evaluate', err?.message ?? 'Please try again.');
      }
    } finally {
      setReEvaluating(false);
    }
  };

  const activeCount = items.filter((a) => a.status === 'ACTIVE').length;
  const acknowledgedCount = items.filter((a) => a.status === 'ACKNOWLEDGED').length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Feather name="chevron-left" size={22} color={COLORS.primary} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Meal Coverage Alerts</Text>
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
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.summaryRow}>
            {activeCount > 0 && (
              <View style={[styles.summaryPill, { backgroundColor: COLORS.dangerBg }]}>
                <Text style={[styles.summaryPillText, { color: COLORS.danger }]}>
                  {activeCount} active
                </Text>
              </View>
            )}
            {acknowledgedCount > 0 && (
              <View style={[styles.summaryPill, { backgroundColor: COLORS.amberBg }]}>
                <Text style={[styles.summaryPillText, { color: COLORS.amber }]}>
                  {acknowledgedCount} acknowledged
                </Text>
              </View>
            )}
            <Pressable
              style={[styles.reEvalBtn, reEvaluating && styles.btnDisabled]}
              onPress={onReEvaluate}
              disabled={reEvaluating}
            >
              {reEvaluating ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Feather name="refresh-cw" size={14} color={COLORS.primary} />
                  <Text style={styles.reEvalText}>Re-evaluate all</Text>
                </>
              )}
            </Pressable>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="check-circle" size={36} color={COLORS.success} />
              <Text style={styles.emptyHeader}>All residents covered</Text>
              <Text style={styles.emptySub}>
                Every resident has at least one safe meal in each meal period.
              </Text>
            </View>
          ) : (
            items.map((a) => {
              const isActive = a.status === 'ACTIVE';
              return (
                <View
                  key={a.id}
                  style={[
                    styles.card,
                    isActive ? styles.cardActive : styles.cardAcked,
                  ]}
                >
                  <View style={styles.cardTopRow}>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isActive ? COLORS.dangerBg : COLORS.amberBg,
                        },
                      ]}
                    >
                      <Feather
                        name={isActive ? 'alert-triangle' : 'eye'}
                        size={12}
                        color={isActive ? COLORS.danger : COLORS.amber}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: isActive ? COLORS.danger : COLORS.amber },
                        ]}
                      >
                        {isActive ? 'ACTIVE' : 'ACKNOWLEDGED'}
                      </Text>
                    </View>
                    <Text style={styles.timeText}>Opened {timeAgo(a.detectedAt)}</Text>
                  </View>

                  <Text style={styles.cardTitle}>
                    {a.residentName || `Resident #${a.residentId}`}
                  </Text>
                  {a.residentRoom ? (
                    <Text style={styles.cardSub}>Room {a.residentRoom}</Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    <View style={[styles.metaPill, { backgroundColor: COLORS.dangerBg }]}>
                      <Text style={[styles.metaPillText, { color: COLORS.danger }]}>
                        {periodLabel(a.mealPeriod)}
                      </Text>
                    </View>
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>
                        0 of {a.totalMealsConsidered} meals safe
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.explainText}>
                    Every {periodLabel(a.mealPeriod).toLowerCase()} item on the menu is
                    blocked by this resident's allergies, conditions, or diet.
                    Either prepare a substitute, adjust the menu, or review the
                    dietary profile.
                  </Text>

                  {a.status === 'ACKNOWLEDGED' && a.acknowledgedByName ? (
                    <Text style={styles.ackedNote}>
                      Acknowledged by {a.acknowledgedByName}
                      {a.acknowledgedAt ? ` — ${timeAgo(a.acknowledgedAt)}` : ''}
                    </Text>
                  ) : null}

                  {isActive && (
                    <View style={styles.actionRow}>
                      <Pressable
                        style={[styles.ackBtn, busyId === a.id && styles.btnDisabled]}
                        onPress={() => onAcknowledge(a.id)}
                        disabled={busyId === a.id}
                      >
                        {busyId === a.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Feather name="check" size={16} color="#fff" />
                            <Text style={styles.ackBtnText}>Acknowledge</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })
          )}
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
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: 24, marginTop: 24 },
  emptyHeader: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptySub: { color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
  errorText: { color: COLORS.danger, marginBottom: 12, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  summaryRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center',
    marginBottom: 4,
  },
  summaryPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  summaryPillText: { fontSize: 12, fontWeight: '700' },
  reEvalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.surface,
    marginLeft: 'auto',
  },
  reEvalText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardActive: { borderLeftWidth: 4, borderLeftColor: COLORS.danger },
  cardAcked: { borderLeftWidth: 4, borderLeftColor: COLORS.amber, opacity: 0.92 },
  cardTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  timeText: { color: COLORS.textMuted, fontSize: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  cardSub: { color: COLORS.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  metaPill: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: '#F4F3EE',
  },
  metaPillText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  explainText: { color: COLORS.text, fontSize: 13, lineHeight: 18, marginTop: 10 },
  ackedNote: { color: COLORS.textMuted, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  ackBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  ackBtnText: { color: '#fff', fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
