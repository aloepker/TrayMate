import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// The 'navigation' prop is automatically passed by the Stack Navigator in App.tsx
const HomeScreen = ({ navigation }: any) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resident Management System</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('AddResident')}
      >
        <Text style={styles.buttonText}>Go to Add Resident Form</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, marginBottom: 20 },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8 },
  buttonText: { color: '#white', fontWeight: 'bold' }
});

export default HomeScreen;