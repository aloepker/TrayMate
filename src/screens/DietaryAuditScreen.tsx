// DietaryAuditScreen.tsx
//
// Read-only timeline of every change made to a resident's dietary profile
// (allergies, dietary restrictions, medical conditions, medications). Reached from Settings →
// Quick Actions → "Dietary History". Backed by GET /residents/:id/dietary-audit.
//
// Styling mirrors OrderHistoryScreen (same header / tab / card language) so
// the two screens read as siblings under Quick Actions.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useSettings } from './context/SettingsContext';
import { getDietaryAuditLog, DietaryAuditEntry } from '../services/api';

type FilterTab = 'all' | 'foodAllergies' | 'dietaryRestrictions' | 'medicalConditions' | 'medications';

// Human-readable labels + color for each tracked field.
const FIELD_CONFIG: Record<string, { label: string; short: string; color: string; bg: string; icon: string }> = {
  foodAllergies:       { label: 'Food Allergies',      short: 'Allergies',   color: '#B45309', bg: '#FEF3C7', icon: 'alert-triangle' },
  medicalConditions:   { label: 'Medical Conditions',  short: 'Conditions',  color: '#1D4ED8', bg: '#DBEAFE', icon: 'heart' },
  medications:         { label: 'Medications',         short: 'Meds',        color: '#6D28D9', bg: '#EDE9FE', icon: 'activity' },
  dietaryRestrictions: { label: 'Dietary Restrictions', short: 'Dietary',    color: '#047857', bg: '#D1FAE5', icon: 'coffee' },
};

const ROLE_LABEL: Record<string, string> = {
  ROLE_ADMIN:          'Admin',
  ROLE_CAREGIVER:      'Caregiver',
  ROLE_KITCHEN_STAFF:  'Kitchen Staff',
  ROLE_KITCHEN:        'Kitchen',
  ROLE_MEDICAL:        'Medical',
};

// Split a comma-separated list into trimmed items; "" / null → [].
const parseList = (s?: string | null): string[] =>
  (s ?? '').split(',').map((v) => v.trim()).filter(Boolean);

// Diff two stringified lists — returns {added, removed}.
const diffLists = (oldVal?: string | null, newVal?: string | null) => {
  const oldSet = new Set(parseList(oldVal));
  const newSet = new Set(parseList(newVal));
  const added   = [...newSet].filter((v) => !oldSet.has(v));
  const removed = [...oldSet].filter((v) => !newSet.has(v));
  return { added, removed };
};

export default function DietaryAuditScreen({ navigation, route }: any) {
  const { scaled, theme, getTouchTargetSize } = useSettings();
  const touchTarget = getTouchTargetSize();

  const residentId   = route?.params?.residentId   as string | number | undefined;
  const residentName = route?.params?.residentName as string | undefined;

  const [entries, setEntries] = useState<DietaryAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<FilterTab>('all');

  const loadHistory = useCallback(async () => {
    if (!residentId) {
      setLoading(false);
      setLoadError('No resident specified.');
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getDietaryAuditLog(residentId);
      // Backend already sorts newest-first, but re-sort to be safe.
      data.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
      setEntries(data);
    } catch (e: any) {
      // 404 → no audit entries yet (or stale backend that doesn't know the
      // route). Either way, the empty state reads much better than a raw
      // "Not Found" banner.
      if (e?.status === 404) {
        setEntries([]);
      } else {
        const msg = e?.message === 'Network request failed'
          ? 'Server unreachable. It may be waking up — tap Retry in a moment.'
          : e?.message ?? 'Could not load dietary history.';
        setLoadError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [residentId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const filtered = entries.filter((e) => tab === 'all' || e.fieldName === tab);

  const count = (field: FilterTab) =>
    field === 'all' ? entries.length : entries.filter((e) => e.fieldName === field).length;

  const TABS: { key: FilterTab; label: string; color: string }[] = [
    { key: 'all',               label: 'All',        color: '#717644' },
    { key: 'foodAllergies',     label: 'Allergies',  color: FIELD_CONFIG.foodAllergies.color },
    { key: 'dietaryRestrictions', label: 'Dietary',  color: FIELD_CONFIG.dietaryRestrictions.color },
    { key: 'medicalConditions', label: 'Conditions', color: FIELD_CONFIG.medicalConditions.color },
    { key: 'medications',       label: 'Meds',       color: FIELD_CONFIG.medications.color },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.surface} />
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { minHeight: touchTarget }]}
          >
            <Feather name="chevron-left" size={22} color="#717644" />
            <Text style={[styles.backText, { fontSize: scaled(15) }]}>Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text
              style={[styles.headerTitle, { fontSize: scaled(20), color: theme.textPrimary }]}
              numberOfLines={1}
            >
              Dietary History
            </Text>
            <Text
              style={[styles.headerSub, { fontSize: scaled(13), color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {residentName ?? 'Resident'} · audit log
            </Text>
          </View>
          <View style={{ width: 72 }} />
        </View>
      </View>

      {/* ── Filter tabs ── */}
      <View style={[styles.tabRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const c      = count(t.key);
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, active && { borderBottomColor: t.color, borderBottomWidth: 2 }]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabLabel, { color: active ? t.color : theme.textSecondary, fontSize: scaled(13) }]}>
                {t.label}
              </Text>
              <View style={[styles.tabBadge, { backgroundColor: active ? t.color : '#E5E7EB' }]}>
                <Text style={[styles.tabBadgeText, { color: active ? '#FFF' : '#6B7280' }]}>{c}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Retry banner on load failure ── */}
      {loadError && (
        <View style={styles.errorBanner}>
          <Feather name="wifi-off" size={18} color="#B45309" />
          <Text style={styles.errorBannerText}>{loadError}</Text>
          <TouchableOpacity style={styles.errorBannerBtn} onPress={loadHistory}>
            <Text style={styles.errorBannerBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Body ── */}
      {loading ? (
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="large" color="#717644" />
          <Text style={[styles.emptyDesc, { fontSize: scaled(13), color: theme.textSecondary, marginTop: 12 }]}>
            Loading dietary history…
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconCircle}>
            <Feather name="file-text" size={32} color="#717644" />
          </View>
          <Text style={[styles.emptyTitle, { fontSize: scaled(17), color: theme.textPrimary }]}>
            No changes recorded
          </Text>
          <Text style={[styles.emptyDesc, { fontSize: scaled(13), color: theme.textSecondary }]}>
            {tab === 'all'
              ? 'Once this resident\u2019s allergies, dietary restrictions, conditions, or medications are edited, every change will be listed here.'
              : 'No changes recorded for this category yet.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.map((e) => {
            const cfg       = FIELD_CONFIG[e.fieldName] ?? FIELD_CONFIG.foodAllergies;
            const { added, removed } = diffLists(e.oldValue, e.newValue);
            const when      = new Date(e.changedAt);
            const dateStr   = when.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr   = when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const actorRole = e.changedByRole ? (ROLE_LABEL[e.changedByRole] ?? e.changedByRole) : 'System';
            const actorName = e.changedByName ?? 'System';
            const isInitial = (e.oldValue ?? '').trim() === '' && added.length > 0 && removed.length === 0;

            return (
              <View key={e.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {/* Field pill row */}
                <View style={styles.cardHeader}>
                  <View style={[styles.fieldPill, { backgroundColor: cfg.bg }]}>
                    <Feather name={cfg.icon as any} size={13} color={cfg.color} />
                    <Text style={[styles.fieldPillText, { color: cfg.color, fontSize: scaled(12) }]}>
                      {cfg.label}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <Text style={[styles.timeText, { color: theme.textSecondary, fontSize: scaled(11) }]}>
                    {dateStr} · {timeStr}
                  </Text>
                </View>

                {/* Diff body */}
                <View style={styles.cardBody}>
                  {isInitial ? (
                    <Text style={[styles.summaryText, { color: theme.textPrimary, fontSize: scaled(13) }]}>
                      <Text style={styles.bold}>Initial value set:</Text> {added.join(', ')}
                    </Text>
                  ) : (
                    <>
                      {added.length > 0 && (
                        <View style={styles.diffRow}>
                          <View style={[styles.diffBadge, { backgroundColor: '#DCFCE7' }]}>
                            <Feather name="plus" size={11} color="#15803D" />
                            <Text style={[styles.diffBadgeText, { color: '#15803D' }]}>Added</Text>
                          </View>
                          <Text style={[styles.diffValues, { color: theme.textPrimary, fontSize: scaled(13) }]}>
                            {added.join(', ')}
                          </Text>
                        </View>
                      )}
                      {removed.length > 0 && (
                        <View style={styles.diffRow}>
                          <View style={[styles.diffBadge, { backgroundColor: '#FEE2E2' }]}>
                            <Feather name="minus" size={11} color="#DC2626" />
                            <Text style={[styles.diffBadgeText, { color: '#DC2626' }]}>Removed</Text>
                          </View>
                          <Text style={[styles.diffValues, styles.strike, { color: theme.textSecondary, fontSize: scaled(13) }]}>
                            {removed.join(', ')}
                          </Text>
                        </View>
                      )}
                      {added.length === 0 && removed.length === 0 && (
                        <Text style={[styles.summaryText, { color: theme.textSecondary, fontSize: scaled(12), fontStyle: 'italic' }]}>
                          Value cleared.
                        </Text>
                      )}
                    </>
                  )}
                </View>

                {/* Actor footer */}
                <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                  <Feather name="user" size={12} color={theme.textSecondary} />
                  <Text style={[styles.actorText, { color: theme.textSecondary, fontSize: scaled(12) }]}>
                    {actorName} · {actorRole}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ──
  header: {
    paddingHorizontal: 16,
    // Extra top padding on Android to clear the status bar (iOS handles
    // this via SafeAreaView). 16 below accounts for inset on iPad too.
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 12 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 72 },
  backText: { color: '#717644', fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { fontWeight: '800', letterSpacing: -0.2 },
  headerSub: { marginTop: 3 },

  // ── Tabs ──
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontWeight: '700' },
  tabBadge: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800' },

  // ── Empty state ──
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#F0F1DC',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontWeight: '700' },
  emptyDesc: { textAlign: 'center' },

  // ── List + cards ──
  list: { padding: 12, paddingBottom: 32, gap: 10 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  fieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  fieldPillText: { fontWeight: '700' },
  timeText: { fontWeight: '500' },

  cardBody: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  summaryText: {},
  bold: { fontWeight: '700' },

  diffRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  diffBadgeText: { fontSize: 11, fontWeight: '700' },
  diffValues: { flex: 1, lineHeight: 18 },
  strike: { textDecorationLine: 'line-through' },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actorText: { fontWeight: '600' },

  // ── Error banner ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderColor: '#F2D57E',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 8,
  },
  errorBannerText: { flex: 1, color: '#92400E', fontWeight: '600' },
  errorBannerBtn: {
    backgroundColor: '#B45309',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  errorBannerBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
});
