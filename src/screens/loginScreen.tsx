import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useSettings } from './context/SettingsContext';

const Login = ({ navigation }: any) => {
  const { t, scaled, getTouchTargetSize, theme } = useSettings();
  const touchTarget = getTouchTargetSize();
  const residents = [
    { name: 'Bobby Johnson', initials: 'BJ', room: 'Room 104' },
    { name: 'Margaret Lee', initials: 'ML', room: 'Room 211' },
    { name: 'Frank Davis', initials: 'FD', room: 'Room 308' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F3EF" />
      <View style={styles.container}>

        {/* Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🍽</Text>
          </View>
          <Text style={[styles.appName, { fontSize: scaled(38) }]}>TrayMate</Text>
          <Text style={[styles.tagline, { fontSize: scaled(17) }]}>{t.personalMealCompanion}</Text>
        </View>

        {/* Resident selector */}
        <View style={styles.residentSection}>
          <Text style={[styles.selectLabel, { fontSize: scaled(16) }]}>{t.whoAreYou}</Text>
          {residents.map((r) => (
            <TouchableOpacity
              key={r.initials}
              style={[styles.residentCard, { minHeight: touchTarget }]}
              activeOpacity={0.7}
              onPress={() =>
                navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
              }
            >
              <View style={styles.avatar}>
                <Text style={[styles.avatarText, { fontSize: scaled(20) }]}>{r.initials}</Text>
              </View>
              <View style={styles.residentInfo}>
                <Text style={[styles.residentName, { fontSize: scaled(18) }]}>{r.name}</Text>
                <Text style={[styles.residentRoom, { fontSize: scaled(14) }]}>{r.room}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.footer, { fontSize: scaled(13) }]}>Sunrise Senior Living</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },

  // Brand
  brandSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: '#717644',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#717644',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  logoEmoji: {
    fontSize: 44,
  },
  appName: {
    fontSize: 38,
    fontWeight: '800',
    color: '#3A3A3A',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 17,
    color: '#8A8A8A',
    marginTop: 6,
    fontWeight: '500',
  },

  // Resident list
  residentSection: {
    marginBottom: 40,
  },
  selectLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  residentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#717644',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  residentInfo: {
    flex: 1,
  },
  residentName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A3A3A',
    marginBottom: 3,
  },
  residentRoom: {
    fontSize: 14,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 30,
    color: '#cbc2b4',
    fontWeight: '300',
  },

  footer: {
    textAlign: 'center',
    fontSize: 13,
    color: '#B0A898',
    fontWeight: '500',
  },
});

export default Login;
