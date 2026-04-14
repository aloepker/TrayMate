import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useSettings, Language, TextSize } from './context/SettingsContext';

import { ResidentService } from '../services/localDataService';
import { sendMessage } from '../services/api';
import { setResidentCaregiver, getResidentCaregiver, setResidentCaregivers, getResidentCaregivers } from '../services/storage';
import ResidentChatModal from './components/messaging/ResidentChatModal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PAD = 20;
const GAP = 12;
const LANG_W = (SCREEN_WIDTH - PAD * 2 - GAP) / 2;

const LANGUAGES: { code: string; name: Language }[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'zh', name: '中文' },
];

const TEXT_SIZES: { key: TextSize; labelKey: 'large' | 'extraLarge' | 'xxlarge'; preview: number }[] = [
  { key: 'large', labelKey: 'large', preview: 20 },
  { key: 'xlarge', labelKey: 'extraLarge', preview: 24 },
  { key: 'xxlarge', labelKey: 'xxlarge', preview: 28 },
];

function SettingsScreen({ navigation, route }: any) {
  const {
    language: selectedLanguage,
    setLanguage,
    t,
    textSize,
    setTextSize,
    scaled,
    accessibility,
    toggleAccessibility,
    theme,
    getTouchTargetSize,
    setCurrentResidentId,
  } = useSettings();
  const touchTarget = getTouchTargetSize();
  const hc = accessibility.highContrastMode;



  // Activate this resident's settings when screen mounts
  useEffect(() => {
    const residentId = route?.params?.residentId ?? null;
    setCurrentResidentId(residentId);
  }, [route?.params?.residentId, setCurrentResidentId]);

  // Derive resident info and dietary restrictions
  const residentId = route?.params?.residentId as string | undefined;
  const localResident = residentId ? ResidentService.getResidentById(residentId) : null;
  const residentName: string =
    localResident?.fullName ?? route?.params?.residentName ?? '';

  // Merge local CSV restrictions + backend dietaryRestrictions + foodAllergies params
  const dietaryPills: string[] = localResident
    ? localResident.dietaryRestrictions.map(r => r.name)
    : [
        ...(Array.isArray(route?.params?.dietaryRestrictions) ? route.params.dietaryRestrictions as string[] : []),
        ...(Array.isArray(route?.params?.foodAllergies)       ? route.params.foodAllergies       as string[] : []),
      ].filter((v, i, arr) => v && arr.indexOf(v) === i); // dedupe

  // Assigned caregiver — passed via route params; persisted to/from storage
  const [caregiverId,   setCaregiverId]   = useState<string | null>(route?.params?.caregiverId   ?? null);
  const [caregiverName, setCaregiverName] = useState<string | null>(route?.params?.caregiverName ?? null);
  const [assignedCaregivers, setAssignedCaregivers] = useState<Array<{ caregiverId: string; caregiverName: string }>>([]);

  useEffect(() => {
    if (!residentId) return;
    const paramCgId          = route?.params?.caregiverId       as string | null ?? null;
    const paramCgName        = route?.params?.caregiverName     as string | null ?? null;
    const paramAllCaregivers = route?.params?.assignedCaregivers as Array<{ caregiverId: string; caregiverName: string }> | undefined;

    if (paramAllCaregivers && paramAllCaregivers.length > 0) {
      // Full array passed directly — use immediately, persist for future
      setAssignedCaregivers(paramAllCaregivers);
      setCaregiverId(paramAllCaregivers[0].caregiverId);
      setCaregiverName(paramAllCaregivers[0].caregiverName);
      setResidentCaregivers(residentId, paramAllCaregivers);
    } else if (paramCgId && paramCgName) {
      setCaregiverId(paramCgId);
      setCaregiverName(paramCgName);
      setResidentCaregiver(residentId, paramCgId, paramCgName);
      // Read the full array from plural storage (may have been set by admin dashboard)
      getResidentCaregivers(residentId).then((stored) => {
        setAssignedCaregivers(stored.length > 0 ? stored : [{ caregiverId: paramCgId, caregiverName: paramCgName }]);
      });
    } else {
      // Try plural storage first, then singular
      getResidentCaregivers(residentId).then((stored) => {
        if (stored.length > 0) {
          setAssignedCaregivers(stored);
          setCaregiverId(stored[0].caregiverId);
          setCaregiverName(stored[0].caregiverName);
        } else {
          getResidentCaregiver(residentId).then((single) => {
            if (single) {
              setCaregiverId(single.caregiverId);
              setCaregiverName(single.caregiverName);
              setAssignedCaregivers([single]);
            }
          });
        }
      });
    }
  }, [residentId, route?.params?.caregiverId, route?.params?.caregiverName, route?.params?.assignedCaregivers]);

  const [sendingMsg, setSendingMsg] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);

  const contactCaregiver = useCallback(() => {
    if (!caregiverId) return;
    const name = residentName || 'a resident';
    const cg   = caregiverName ?? 'Caregiver';
    Alert.alert(
      `Message ${cg}`,
      `Send a message about ${name}'s care.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I need assistance',
          onPress: async () => {
            setSendingMsg(true);
            try {
              await sendMessage(caregiverId, `Hi, ${name} needs assistance. Please check in when possible.`);
              Alert.alert('Sent ✓', `${cg} has been notified.`);
            } catch { Alert.alert('Failed to send', 'Please ask staff directly.'); }
            finally { setSendingMsg(false); }
          },
        },
        {
          text: 'Question about my meal',
          onPress: async () => {
            setSendingMsg(true);
            try {
              await sendMessage(caregiverId, `Hi, ${name} has a question about their meal. Please follow up when available.`);
              Alert.alert('Sent ✓', `${cg} has been notified.`);
            } catch { Alert.alert('Failed to send', 'Please ask staff directly.'); }
            finally { setSendingMsg(false); }
          },
        },
        {
          text: 'Dietary concern',
          onPress: async () => {
            setSendingMsg(true);
            try {
              await sendMessage(caregiverId, `Hi, ${name} has a dietary concern about their current meal selection. Please review when available.`);
              Alert.alert('Sent ✓', `${cg} has been notified.`);
            } catch { Alert.alert('Failed to send', 'Please ask staff directly.'); }
            finally { setSendingMsg(false); }
          },
        },
      ]
    );
  }, [caregiverId, caregiverName, residentName]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { minHeight: touchTarget, justifyContent: 'center' }]}
          accessibilityLabel={accessibility.screenReaderSupport ? t.back : undefined}
          accessibilityRole="button"
        >
          <Feather name="chevron-left" size={22} color={theme.accent} />
          <Text style={[styles.backText, { fontSize: scaled(16), color: theme.accent }]}>{t.back.replace(/^[←↩⬅]\s*/, '')}</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { fontSize: scaled(22), color: theme.textPrimary }]}>{t.settings}</Text>
          {residentName ? (
            <Text style={[styles.headerSubtitle, { fontSize: scaled(13), color: theme.textSecondary }]}>{residentName}</Text>
          ) : null}
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================== LANGUAGE ==================== */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { fontSize: scaled(14), color: theme.textSecondary }]}>{t.language}</Text>
          <View style={styles.languageGrid}>
            {LANGUAGES.map((lang) => {
              const active = selectedLanguage === lang.name;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageCard,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    active && { backgroundColor: hc ? theme.accent : '#2A2A2A', borderColor: hc ? theme.accent : '#2A2A2A' },
                  ]}
                  onPress={() => setLanguage(lang.name)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={accessibility.screenReaderSupport ? `${t.language}: ${lang.name}` : undefined}
                >
                  <Text
                    style={[
                      styles.languageText,
                      { fontSize: scaled(17), color: theme.textPrimary },
                      active && { color: hc ? '#000000' : '#FFFFFF' },
                    ]}
                  >
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ==================== TEXT SIZE ==================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="type" size={16} color={theme.textSecondary} />
            <Text style={[styles.sectionTitle, { fontSize: scaled(14), color: theme.textSecondary }]}>{t.textSize}</Text>
          </View>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            {/* Preview text */}
            <Text style={[styles.previewText, { fontSize: scaled(16), color: theme.textPrimary }]}>
              Aa — {t.textSize}
            </Text>
            {/* Size buttons */}
            <View style={styles.textSizeRow}>
              {TEXT_SIZES.map((size) => {
                const active = textSize === size.key;
                return (
                  <TouchableOpacity
                    key={size.key}
                    style={[
                      styles.textSizeButton,
                      { backgroundColor: theme.surface, borderColor: 'transparent' },
                      active && {
                        backgroundColor: hc ? theme.accent : '#E8DCC8',
                        borderColor: hc ? theme.accent : '#717644',
                      },
                    ]}
                    onPress={() => setTextSize(size.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.textSizePreview,
                        { fontSize: size.preview, color: theme.textSecondary },
                        active && { color: hc ? '#000000' : '#717644' },
                      ]}
                    >
                      A
                    </Text>
                    <Text
                      style={[
                        styles.textSizeLabel,
                        { color: theme.textSecondary },
                        active && { color: hc ? '#000000' : '#717644' },
                      ]}
                    >
                      {t[size.labelKey]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ==================== ACCESSIBILITY ==================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Feather name="eye" size={16} color={theme.textSecondary} />
            <Text style={[styles.sectionTitle, { fontSize: scaled(14), color: theme.textSecondary }]}>{t.accessibility}</Text>
          </View>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <SettingSwitch
              label={t.highContrast}
              description={t.highContrastDesc}
              value={accessibility.highContrastMode}
              onToggle={() => toggleAccessibility('highContrastMode')}
              fontSize={scaled(16)}
              descFontSize={scaled(13)}
              minHeight={touchTarget}
            />
            <View style={styles.divider} />
            <SettingSwitch
              label={t.largeTouchTargets}
              description={t.largeTouchTargetsDesc}
              value={accessibility.largeTouchTargets}
              onToggle={() => toggleAccessibility('largeTouchTargets')}
              fontSize={scaled(16)}
              descFontSize={scaled(13)}
              minHeight={touchTarget}
            />
            <View style={styles.divider} />
            <SettingSwitch
              label={t.screenReader}
              description={t.screenReaderDesc}
              value={accessibility.screenReaderSupport}
              onToggle={() => toggleAccessibility('screenReaderSupport')}
              fontSize={scaled(16)}
              descFontSize={scaled(13)}
              minHeight={touchTarget}
            />
          </View>
        </View>

        {/* ==================== DIETARY (Read-Only) ==================== */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { fontSize: scaled(14), color: theme.textSecondary }]}>{t.dietaryRestrictions}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <View style={styles.pillContainer}>
              {dietaryPills.length > 0 ? (
                dietaryPills.map((pill, i) => (
                  <View key={i} style={[styles.activePill, hc && { backgroundColor: theme.accent }]}>
                    <Text style={[styles.activePillText, { fontSize: scaled(13) }, hc && { color: '#000000' }]}>{pill}</Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.noPillsText, { fontSize: scaled(13), color: theme.textSecondary }]}>None recorded</Text>
              )}
            </View>
          </View>
        </View>

        {/* ==================== QUICK ACTIONS ==================== */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { fontSize: scaled(14), color: theme.textSecondary }]}>{t.quickActions}</Text>

          <ActionRow
            featherIcon="book-open" bg="#E8DCC8"
            title={t.browseMenus} desc={t.browseMenusDesc}
            fontSize={scaled(16)} descFontSize={scaled(13)}
            minHeight={touchTarget}
            onPress={() => navigation.navigate('BrowseMealOptions', {
              residentId, residentName,
              dietaryRestrictions: route?.params?.dietaryRestrictions ?? [],
              foodAllergies: route?.params?.foodAllergies ?? [],
              caregiverId, caregiverName,
            })}
          />
          <ActionRow
            featherIcon="rotate-ccw" bg="#D8E4D0"
            title={t.orderHistory} desc={t.orderHistoryDesc}
            fontSize={scaled(16)} descFontSize={scaled(13)}
            minHeight={touchTarget}
            onPress={() => navigation.navigate('OrderHistory', { residentId, residentName })}
          />

          <ActionRow
            featherIcon="calendar" bg="#F6D7B8"
            title={t.upcomingMeals} desc={t.upcomingMealsDesc}
            fontSize={scaled(16)} descFontSize={scaled(13)}
            minHeight={touchTarget}
            onPress={() => navigation.navigate('UpcomingMeals')}
          />
          <ActionRow
            featherIcon="message-circle" bg="#E8DCC8"
            title={t.aiAssistant} desc={t.aiAssistantDesc}
            fontSize={scaled(16)} descFontSize={scaled(13)}
            minHeight={touchTarget}
            onPress={() => navigation.navigate('AIMealAssistant')}
          />
        </View>

        {/* ==================== ACCOUNT ==================== */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { fontSize: scaled(14), color: theme.textSecondary }]}>{t.account}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>

            {/* Contact Caregiver — always visible */}
            <TouchableOpacity
              style={[styles.accountRow, { minHeight: touchTarget }]}
              onPress={() => setShowMessagesModal(true)}
              accessibilityRole="button"
            >
              <View style={styles.caregiverContactLeft}>
                <View style={[styles.caregiverAvatar, { backgroundColor: '#717644' }]}>
                  <Feather name="message-square" size={16} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={[styles.accountLabel, { fontSize: scaled(15), color: theme.textPrimary }]}>
                    {caregiverName ? `Contact ${caregiverName}` : 'Contact Caregiver'}
                  </Text>
                  <Text style={[styles.caregiverSubtitle, { fontSize: scaled(12), color: theme.textSecondary }]}>
                    {caregiverName ? 'Send a message to your caregiver' : 'Message your care team'}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity
              style={[styles.accountRow, { minHeight: touchTarget }]}
              onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
              accessibilityRole="button"
            >
              <Text style={[styles.accountLabel, { fontSize: scaled(16), color: theme.danger }]}>{t.logOut}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <ResidentChatModal
        visible={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
        assignedCaregivers={assignedCaregivers}
        assignedCaregiverId={caregiverId}
        assignedCaregiverName={caregiverName}
      />
    </View>
  );
}

// ---------- Reusable Switch Row ----------

const SettingSwitch = ({
  label,
  description,
  value,
  onToggle,
  fontSize,
  descFontSize,
  minHeight,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  fontSize: number;
  descFontSize: number;
  minHeight: number;
}) => {
  const { theme } = useSettings();
  return (
    <View style={[styles.switchRow, { minHeight }]}>
      <View style={styles.switchTextContainer}>
        <Text style={[styles.switchLabel, { fontSize, color: theme.textPrimary }]}>{label}</Text>
        <Text style={[styles.switchDescription, { fontSize: descFontSize, color: theme.textSecondary }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.border, true: theme.accent }}
        thumbColor={value ? (theme.background === '#111111' ? '#000000' : '#FFFFFF') : theme.surface}
        ios_backgroundColor={theme.border}
      />
    </View>
  );
};

// ---------- Reusable Action Row ----------

const ActionRow = ({
  featherIcon,
  bg,
  title,
  desc,
  onPress,
  fontSize,
  descFontSize,
  minHeight,
  rightIcon = 'chevron-right',
}: {
  featherIcon: string;
  bg: string;
  title: string;
  desc: string;
  onPress: () => void;
  fontSize: number;
  descFontSize: number;
  minHeight: number;
  rightIcon?: string;
}) => {
  const { theme } = useSettings();
  return (
    <TouchableOpacity style={[styles.actionCard, { minHeight, backgroundColor: theme.surface }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.actionIcon, { backgroundColor: bg }]}>
        <Feather name={featherIcon} size={20} color="#717644" />
      </View>
      <View style={styles.actionContent}>
        <Text style={[styles.actionTitle, { fontSize, color: theme.textPrimary }]}>{title}</Text>
        <Text style={[styles.actionDesc, { fontSize: descFontSize, color: theme.textSecondary }]}>{desc}</Text>
      </View>
      <Feather name={rightIcon} size={20} color={theme.textSecondary} />
    </TouchableOpacity>
  );
};

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E4DE',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    color: '#717644',
    fontWeight: '600',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontWeight: '700',
    color: '#4A4A4A',
  },
  headerSubtitle: {
    color: '#8A8A8A',
    marginTop: 2,
  },
  placeholder: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PAD,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontWeight: '600',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Language Grid
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: GAP,
  },
  languageCard: {
    width: LANG_W,
    backgroundColor: '#FFFFFF',
    paddingVertical: 22,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E8E4DE',
  },
  languageCardActive: {
    backgroundColor: '#2A2A2A',
    borderColor: '#2A2A2A',
  },
  languageText: {
    fontWeight: '600',
    color: '#4A4A4A',
  },
  languageTextActive: {
    color: '#FFFFFF',
  },
  // Text Size
  previewText: {
    color: '#4A4A4A',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  textSizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  textSizeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5F3EF',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  textSizeButtonActive: {
    backgroundColor: '#E8DCC8',
    borderColor: '#717644',
  },
  textSizePreview: {
    fontWeight: '700',
    color: '#8A8A8A',
    marginBottom: 4,
  },
  textSizePreviewActive: {
    color: '#717644',
  },
  textSizeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  textSizeLabelActive: {
    color: '#717644',
  },
  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  // Dietary Pills (read-only)
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  activePill: {
    backgroundColor: '#E8DCC8',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  activePillText: {
    fontWeight: '600',
    color: '#717644',
  },
  caregiverNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF9F0',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  caregiverIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  caregiverText: {
    flex: 1,
    color: '#8A7A5A',
    lineHeight: 20,
  },
  noPillsText: {
    fontStyle: 'italic',
    marginBottom: 4,
  },
  // Action Cards
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionIconText: {
    fontSize: 22,
    color: '#717644',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 2,
  },
  actionDesc: {
    color: '#8A8A8A',
  },
  chevron: {
    fontSize: 26,
    color: '#cbc2b4',
    fontWeight: '300',
  },
  // Switch Rows
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontWeight: '500',
    color: '#4A4A4A',
  },
  switchDescription: {
    color: '#9A9A9A',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0EDE8',
    marginVertical: 6,
  },
  // Account
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  accountLabel: {
    fontWeight: '500',
    color: '#4A4A4A',
  },
  caregiverContactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  caregiverAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8DCC8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caregiverAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#717644',
  },
  caregiverSubtitle: {
    marginTop: 1,
  },

  // Order history
  noHistoryText: {
    padding: 16,
    textAlign: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  historyDate: {
    fontWeight: '500',
    marginBottom: 4,
  },
  historyMeal: {
    fontWeight: '600',
    lineHeight: 20,
  },
  historyOrderId: {
    marginTop: 2,
  },
  historyDeleteBtn: {
    padding: 6,
    marginLeft: 8,
    marginTop: 2,
  },
});

export default SettingsScreen;
