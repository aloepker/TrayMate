import React from 'react';
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
import { useSettings, Language, TextSize } from './context/SettingsContext';

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

const TEXT_SIZES: { key: TextSize; labelKey: 'small' | 'medium' | 'large' | 'extraLarge'; preview: number }[] = [
  { key: 'small', labelKey: 'small', preview: 13 },
  { key: 'medium', labelKey: 'medium', preview: 16 },
  { key: 'large', labelKey: 'large', preview: 20 },
  { key: 'xlarge', labelKey: 'extraLarge', preview: 24 },
];

function SettingsScreen({ navigation }: any) {
  const {
    language: selectedLanguage,
    setLanguage,
    t,
    textSize,
    setTextSize,
    scaled,
    accessibility,
    toggleAccessibility,
    notifications,
    toggleNotification,
    theme,
    getTouchTargetSize,
  } = useSettings();
  const touchTarget = getTouchTargetSize();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { minHeight: touchTarget, justifyContent: 'center' }]}
          accessibilityLabel={accessibility.screenReaderSupport ? t.back : undefined}
          accessibilityRole="button"
        >
          <Text style={[styles.backText, { fontSize: scaled(16), color: theme.accent }]}>{t.back}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scaled(24), color: theme.textPrimary }]}>{t.settings}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================== LANGUAGE ==================== */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { fontSize: scaled(14) }]}>{t.language}</Text>
          <View style={styles.languageGrid}>
            {LANGUAGES.map((lang) => {
              const active = selectedLanguage === lang.name;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.languageCard, active && styles.languageCardActive]}
                  onPress={() => setLanguage(lang.name)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={accessibility.screenReaderSupport ? `${t.language}: ${lang.name}` : undefined}
                >
                  <Text
                    style={[
                      styles.languageText,
                      { fontSize: scaled(17) },
                      active && styles.languageTextActive,
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
            <Text style={styles.sectionIcon}>🔤</Text>
            <Text style={[styles.sectionTitle, { fontSize: scaled(14) }]}>{t.textSize}</Text>
          </View>
          <View style={styles.card}>
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
                    style={[styles.textSizeButton, active && styles.textSizeButtonActive]}
                    onPress={() => setTextSize(size.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.textSizePreview,
                        { fontSize: size.preview },
                        active && styles.textSizePreviewActive,
                      ]}
                    >
                      A
                    </Text>
                    <Text
                      style={[
                        styles.textSizeLabel,
                        active && styles.textSizeLabelActive,
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
            <Text style={styles.sectionIcon}>👁</Text>
            <Text style={[styles.sectionTitle, { fontSize: scaled(14) }]}>{t.accessibility}</Text>
          </View>
          <View style={styles.card}>
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
          <Text style={[styles.sectionLabel, { fontSize: scaled(14) }]}>{t.dietaryRestrictions}</Text>
          <View style={styles.card}>
            <View style={styles.pillContainer}>
              <View style={styles.activePill}><Text style={[styles.activePillText, { fontSize: scaled(13) }]}>Low Sodium</Text></View>
              <View style={styles.activePill}><Text style={[styles.activePillText, { fontSize: scaled(13) }]}>Heart Healthy</Text></View>
              <View style={styles.activePill}><Text style={[styles.activePillText, { fontSize: scaled(13) }]}>No Shellfish</Text></View>
            </View>
            <View style={styles.caregiverNotice}>
              <Text style={styles.caregiverIcon}>🔒</Text>
              <Text style={[styles.caregiverText, { fontSize: scaled(13) }]}>
                {t.managedByCaregiver}
              </Text>
            </View>
          </View>
        </View>

        {/* ==================== NOTIFICATIONS ==================== */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { fontSize: scaled(14) }]}>{t.notifications}</Text>
          <View style={styles.card}>
            <SettingSwitch
              label={t.mealReminders}
              description={t.mealRemindersDesc}
              value={notifications.mealReminders}
              onToggle={() => toggleNotification('mealReminders')}
              fontSize={scaled(16)}
              descFontSize={scaled(13)}
              minHeight={touchTarget}
            />
            <View style={styles.divider} />
            <SettingSwitch
              label={t.orderUpdates}
              description={t.orderUpdatesDesc}
              value={notifications.orderUpdates}
              onToggle={() => toggleNotification('orderUpdates')}
              fontSize={scaled(16)}
              descFontSize={scaled(13)}
              minHeight={touchTarget}
            />
            <View style={styles.divider} />
            <SettingSwitch
              label={t.menuUpdates}
              description={t.menuUpdatesDesc}
              value={notifications.menuUpdates}
              onToggle={() => toggleNotification('menuUpdates')}
              fontSize={scaled(16)}
              descFontSize={scaled(13)}
              minHeight={touchTarget}
            />
          </View>
        </View>

        {/* ==================== QUICK ACTIONS ==================== */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { fontSize: scaled(14) }]}>{t.quickActions}</Text>

          <ActionRow
            icon="☰" bg="#E8DCC8"
            title={t.browseMenus} desc={t.browseMenusDesc}
            fontSize={scaled(16)} descFontSize={scaled(13)}
            minHeight={touchTarget}
            onPress={() => navigation.navigate('BrowseMealOptions')}
          />
          <ActionRow
            icon="⟲" bg="#D8E4D0"
            title={t.orderHistory} desc={t.orderHistoryDesc}
            fontSize={scaled(16)} descFontSize={scaled(13)}
            minHeight={touchTarget}
            onPress={() => navigation.navigate('UpcomingMeals')}
          />
          <ActionRow
            icon="🕐" bg="#F6D7B8"
            title={t.upcomingMeals} desc={t.upcomingMealsDesc}
            fontSize={scaled(16)} descFontSize={scaled(13)}
            minHeight={touchTarget}
            onPress={() => navigation.navigate('UpcomingMeals')}
          />
          <ActionRow
            icon="AI" bg="#E8DCC8" isText
            title={t.aiAssistant} desc={t.aiAssistantDesc}
            fontSize={scaled(16)} descFontSize={scaled(13)}
            minHeight={touchTarget}
            onPress={() => navigation.navigate('AIMealAssistant')}
          />
        </View>

        {/* ==================== ACCOUNT ==================== */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { fontSize: scaled(14) }]}>{t.account}</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.accountRow, { minHeight: touchTarget }]}
              onPress={() => Alert.alert(t.deliveryPrefs, 'Coming soon.')}
              accessibilityRole="button"
            >
              <Text style={[styles.accountLabel, { fontSize: scaled(16), color: theme.textPrimary }]}>{t.deliveryPrefs}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity
              style={[styles.accountRow, { minHeight: touchTarget }]}
              onPress={() => Alert.alert(t.supportHelp, 'Contact your facility staff.')}
              accessibilityRole="button"
            >
              <Text style={[styles.accountLabel, { fontSize: scaled(16), color: theme.textPrimary }]}>{t.supportHelp}</Text>
              <Text style={styles.chevron}>›</Text>
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
}) => (
  <View style={[styles.switchRow, { minHeight }]}>
    <View style={styles.switchTextContainer}>
      <Text style={[styles.switchLabel, { fontSize }]}>{label}</Text>
      <Text style={[styles.switchDescription, { fontSize: descFontSize }]}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: '#E8E4DE', true: '#D4C5A9' }}
      thumbColor={value ? '#717644' : '#FFFFFF'}
    />
  </View>
);

// ---------- Reusable Action Row ----------

const ActionRow = ({
  icon,
  bg,
  title,
  desc,
  onPress,
  fontSize,
  descFontSize,
  isText,
  minHeight,
}: {
  icon: string;
  bg: string;
  title: string;
  desc: string;
  onPress: () => void;
  fontSize: number;
  descFontSize: number;
  isText?: boolean;
  minHeight: number;
}) => (
  <TouchableOpacity style={[styles.actionCard, { minHeight }]} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.actionIcon, { backgroundColor: bg }]}>
      <Text style={[styles.actionIconText, isText && { fontSize: 16, fontWeight: '700' as const }]}>
        {icon}
      </Text>
    </View>
    <View style={styles.actionContent}>
      <Text style={[styles.actionTitle, { fontSize }]}>{title}</Text>
      <Text style={[styles.actionDesc, { fontSize: descFontSize }]}>{desc}</Text>
    </View>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
);

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
    paddingBottom: 16,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    color: '#717644',
    fontWeight: '600',
  },
  headerTitle: {
    fontWeight: '700',
    color: '#4A4A4A',
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
});

export default SettingsScreen;
