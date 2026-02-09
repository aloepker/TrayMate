import React, { useState, useCallback } from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Alert,
} from "react-native";
import { globalStyles } from "../styles/styles";

// ---------- Types ----------
type Resident = {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  foodAllergies: string;
  roomNumber: string;
};

const MOCK_RESIDENTS: Resident[] = [
  {
    id: "1",
    firstName: "Alice",
    lastName: "Johnson",
    dob: "1942-05-12",
    foodAllergies: "Peanuts, Shellfish",
    roomNumber: "204-A",
  },
  {
    id: "2",
    firstName: "Robert",
    lastName: "Smith",
    dob: "1938-11-20",
    foodAllergies: "None",
    roomNumber: "112-B",
  },
];

const ViewResidentList = ({ navigation }: any) => {
  const [residents, setResidents] = useState<Resident[]>(MOCK_RESIDENTS);

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Delete Resident", `Permanently remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {} },
    ]);
  };

  const renderResident = ({ item }: { item: Resident }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.firstName} {item.lastName}</Text>
        <View style={styles.periodPill}>
          <Text style={styles.periodPillText}>{item.roomNumber}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoValue}>DOB: {item.dob}</Text>
        <Text style={[styles.infoValue, item.foodAllergies !== 'None' && { color: '#B91C1C', fontWeight: '700' }]}>
          Allergies: {item.foodAllergies}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.actionButton, styles.assignBtn]}>
          <Text style={styles.actionBtnText}>Assign Device</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.editBtn]}>
          <Text style={styles.actionBtnText}>Edit Info</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteBtn]}
          onPress={() => handleDelete(item.id, item.firstName)}
        >
          <Text style={styles.actionBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[globalStyles.container, styles.safeArea]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Resident Directory</Text>
        <Text style={styles.subtitle}>Manage resident profiles and device assignments.</Text>
      </View>

      <FlatList
        data={residents}
        keyExtractor={(item) => item.id}
        renderItem={renderResident}
        contentContainerStyle={styles.listContent}
        style={styles.fullWidthList}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    alignItems: 'stretch', // Crucial for tablet landscape
  },
  header: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
  },
  subtitle: {
    marginTop: 6,
    color: "#4B5563",
    fontSize: 15,
  },
  fullWidthList: {
    width: '100%',
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    // MealOptions Shadow Style
    shadowColor: "#1F2937",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  periodPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#E5E7EB", // Matching the meal period pill
  },
  periodPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  infoRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 20,
  },
  infoValue: {
    fontSize: 14,
    color: "#4B5563",
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  // Color Palette Updates
  assignBtn: {
    backgroundColor: "#1F2937", // Dark Slate (Matches TabActive)
  },
  editBtn: {
    backgroundColor: "#10b981", // Emerald Green (Matches Add to Cart)
    shadowColor: "#10b981",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteBtn: {
    backgroundColor: "#E7DED2", // Tan (Matches TabInactive)
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default ViewResidentList;










/*import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
//this is the call for the global styling file
import { globalStyles } from '../styles/styles';

// The 'navigation' prop is automatically passed by the Stack Navigator in App.tsx
const EditResidentList = ({ navigation }: any) => {
  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Back</Text>
      
      <TouchableOpacity 
        style={globalStyles.button}
        onPress={() => navigation.goBack()}
      >
        <Text style={globalStyles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
};


export default EditResidentList;*/