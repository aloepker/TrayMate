import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';

function SettingsScreen({ navigation }: any) {
  // State for language selection
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // State for dietary restrictions
  const [dietaryRestrictions, setDietaryRestrictions] = useState({
    lowSodium: true,
    heartHealthy: true,
    noShellfish: true,
    vegetarian: false,
    glutenFree: false,
    dairyFree: false,
    lowCarb: false,
    highProtein: false,
  });

  // State for accessibility features
  const [accessibility, setAccessibility] = useState({
    highContrastMode: false,
    largeTouchTargets: true,
    screenReaderSupport: false,
  });

  // State for notification preferences
  const [notifications, setNotifications] = useState({
    mealReminders: true,
    orderUpdates: true,
    menuUpdates: false,
  });

  const toggleDietaryRestriction = (key: keyof typeof dietaryRestrictions) => {
    setDietaryRestrictions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAccessibility = (key: keyof typeof accessibility) => {
    setAccessibility(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'zh', name: '中文' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Language Section */}
        <View style={styles.section}>
          <View style={styles.languageGrid}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageButton,
                  selectedLanguage === lang.name && styles.languageButtonActive,
                ]}
                onPress={() => setSelectedLanguage(lang.name)}
              >
                <Text
                  style={[
                    styles.languageText,
                    selectedLanguage === lang.name && styles.languageTextActive,
                  ]}
                >
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Accessibility Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIcon}>👁</Text>
            <Text style={styles.sectionTitle}>Accessibility</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>High Contrast Mode</Text>
                <Text style={styles.switchDescription}>Increase contrast for better visibility</Text>
              </View>
              <Switch
                value={accessibility.highContrastMode}
                onValueChange={() => toggleAccessibility('highContrastMode')}
                trackColor={{ false: '#E8E4DE', true: '#D4C5A9' }}
                thumbColor={accessibility.highContrastMode ? '#717644' : '#FFFFFF'}
              />
            </View>
            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>Large Touch Targets</Text>
                <Text style={styles.switchDescription}>Make buttons and links easier to tap</Text>
              </View>
              <Switch
                value={accessibility.largeTouchTargets}
                onValueChange={() => toggleAccessibility('largeTouchTargets')}
                trackColor={{ false: '#E8E4DE', true: '#D4C5A9' }}
                thumbColor={accessibility.largeTouchTargets ? '#717644' : '#FFFFFF'}
              />
            </View>
            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>Screen Reader Support</Text>
                <Text style={styles.switchDescription}>Enhanced compatibility with screen readers</Text>
              </View>
              <Switch
                value={accessibility.screenReaderSupport}
                onValueChange={() => toggleAccessibility('screenReaderSupport')}
                trackColor={{ false: '#E8E4DE', true: '#D4C5A9' }}
                thumbColor={accessibility.screenReaderSupport ? '#717644' : '#FFFFFF'}
              />
            </View>
          </View>
        </View>

        {/* Dietary Restrictions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleStandalone}>Dietary Restrictions</Text>
          <View style={styles.card}>
            <View style={styles.pillContainer}>
              {dietaryRestrictions.lowSodium && (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Low Sodium</Text>
                </View>
              )}
              {dietaryRestrictions.heartHealthy && (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Heart Healthy</Text>
                </View>
              )}
              {dietaryRestrictions.noShellfish && (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>No Shellfish</Text>
                </View>
              )}
              {dietaryRestrictions.vegetarian && (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Vegetarian</Text>
                </View>
              )}
              {dietaryRestrictions.glutenFree && (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Gluten Free</Text>
                </View>
              )}
              {dietaryRestrictions.dairyFree && (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Dairy Free</Text>
                </View>
              )}
              {dietaryRestrictions.lowCarb && (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Low Carb</Text>
                </View>
              )}
              {dietaryRestrictions.highProtein && (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>High Protein</Text>
                </View>
              )}
            </View>
            
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit Restrictions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleStandalone}>Quick Actions</Text>
          
          {/* Browse Menus Card */}
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('BrowseMealOptions')}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.iconText}>☰</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Browse Menus</Text>
              <Text style={styles.actionDescription}>View daily specials and seasonal menus</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Order History Card */}
          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIcon, styles.actionIconGreen]}>
              <Text style={styles.iconText}>⟲</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Order History</Text>
              <Text style={styles.actionDescription}>View past meal orders</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Upcoming Meals Card */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('UpcomingMeals')}
          >
            <View style={[styles.actionIcon, styles.actionIconOrange]}>
              <Text style={styles.iconText}>🕐</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Upcoming Meals</Text>
              <Text style={styles.actionDescription}>View confirmed and pending meals</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* AI Meal Assistant Card */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('AIMealAssistant')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E8DCC8' }]}>
              <Text style={styles.iconText}>AI</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>AI Meal Assistant</Text>
              <Text style={styles.actionDescription}>Get personalized meal suggestions</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Dietary Preferences Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleStandalone}>Manage Dietary Preferences</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Low Sodium</Text>
              <Switch
                value={dietaryRestrictions.lowSodium}
                onValueChange={() => toggleDietaryRestriction('lowSodium')}
                trackColor={{ false: '#E8E4DE', true: '#D4C5A9' }}
                thumbColor={dietaryRestrictions.lowSodium ? '#717644' : '#FFFFFF'}
              />
            </View>
            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Heart Healthy</Text>
              <Switch
                value={dietaryRestrictions.heartHealthy}
                onValueChange={() => toggleDietaryRestriction('heartHealthy')}
                trackColor={{ false: '#E8E4DE', true: '#D4C5A9' }}
                thumbColor={dietaryRestrictions.heartHealthy ? '#717644' : '#FFFFFF'}
              />
            </View>
            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>No Shellfish</Text>
              <Switch
                value={dietaryRestrictions.noShellfish}
                onValueChange={() => toggleDietaryRestriction('noShellfish')}
                trackColor={{ false: '#E8E4DE', true: '#D4C5A9' }}
                thumbColor={dietaryRestrictions.noShellfish ? '#717644' : '#FFFFFF'}
              />
            </View>
            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Vegetarian</Text>
              <Switch
                value={dietaryRestrictions.vegetarian}
                onValueChange={() => toggleDietaryRestriction('vegetarian')}
                trackColor={{ false: '#E8E4DE', true: '#D4C5A9' }}
                thumbColor={dietaryRestrictions.vegetarian ? '#717644' : '#FFFFFF'}
              />
            </View>
            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Gluten Free</Text>
              <Switch
                value={dietaryRestrictions.glutenFree}
                onValueChange={() => toggleDietaryRestriction('glutenFree')}
                trackColor={{ false: '#E8E4DE', true: '#D4C5A9' }}
                thumbColor={dietaryRestrictions.glutenFree ? '#717644' : '#FFFFFF'}
              />
            </View>
            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Dairy Free</Text>
              <Switch
                value={dietaryRestrictions.dairyFree}
                onValueChange={() => toggleDietaryRestriction('dairyFree')}
                trackColor={{ false: '#E8E4DE', true: '#D4C5A9' }}
                thumbColor={dietaryRestrictions.dairyFree ? '#717644' : '#FFFFFF'}
              />
            </View>
            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Low Carb</Text>
              <Switch
                value={dietaryRestrictions.lowCarb}
                onValueChange={() => toggleDietaryRestriction('lowCarb')}
                trackColor={{ false: '#E8E4DE', true: '#D4C5A9' }}
                thumbColor={dietaryRestrictions.lowCarb ? '#717644' : '#FFFFFF'}
              />
            </View>
            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>High Protein</Text>
              <Switch
                value={dietaryRestrictions.highProtein}
                onValueChange={() => toggleDietaryRestriction('highProtein')}
                trackColor={{ false: '#E8E4DE', true: '#D4C5A9' }}
                thumbColor={dietaryRestrictions.highProtein ? '#717644' : '#FFFFFF'}
              />
            </View>
          </View>
        </View>

        {/* Notification Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleStandalone}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>Meal Reminders</Text>
                <Text style={styles.switchDescription}>Get notified before meal times</Text>
              </View>
              <Switch
                value={notifications.mealReminders}
                onValueChange={() => toggleNotification('mealReminders')}
                trackColor={{ false: '#E8E4DE', true: '#D4C5A9' }}
                thumbColor={notifications.mealReminders ? '#717644' : '#FFFFFF'}
              />
            </View>
            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>Order Updates</Text>
                <Text style={styles.switchDescription}>Updates on meal confirmations</Text>
              </View>
              <Switch
                value={notifications.orderUpdates}
                onValueChange={() => toggleNotification('orderUpdates')}
                trackColor={{ false: '#E8E4DE', true: '#D4C5A9' }}
                thumbColor={notifications.orderUpdates ? '#717644' : '#FFFFFF'}
              />
            </View>
            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchLabel}>Menu Updates</Text>
                <Text style={styles.switchDescription}>New seasonal items and specials</Text>
              </View>
              <Switch
                value={notifications.menuUpdates}
                onValueChange={() => toggleNotification('menuUpdates')}
                trackColor={{ false: '#E8E4DE', true: '#D4C5A9' }}
                thumbColor={notifications.menuUpdates ? '#717644' : '#FFFFFF'}
              />
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleStandalone}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.accountRow}>
              <Text style={styles.accountLabel}>Edit Resident Information</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity style={styles.accountRow}>
              <Text style={styles.accountLabel}>Delivery Preferences</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity style={styles.accountRow}>
              <Text style={styles.accountLabel}>Support & Help</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <View style={styles.divider} />

            <TouchableOpacity style={styles.accountRow}>
              <Text style={[styles.accountLabel, styles.logoutText]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

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
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: '#717644',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4A4A4A',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  sectionTitleStandalone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8A8A8A',
    marginBottom: 12,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  languageButton: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E8E4DE',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  languageButtonActive: {
    backgroundColor: '#2A2A2A',
    borderColor: '#2A2A2A',
  },
  languageText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  languageTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  activePill: {
    backgroundColor: '#E8DCC8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#717644',
  },
  editButton: {
    backgroundColor: '#F5F3EF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8DCC8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionIconGreen: {
    backgroundColor: '#D8E4D0',
  },
  actionIconOrange: {
    backgroundColor: '#F6D7B8',
  },
  iconText: {
    fontSize: 24,
    color: '#717644',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#8A8A8A',
  },
  chevron: {
    fontSize: 28,
    color: '#cbc2b4',
    fontWeight: '300',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A4A4A',
  },
  switchDescription: {
    fontSize: 13,
    color: '#9A9A9A',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F3EF',
    marginVertical: 8,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  accountLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A4A4A',
  },
  logoutText: {
    color: '#d27028',
  },
});

export default SettingsScreen;