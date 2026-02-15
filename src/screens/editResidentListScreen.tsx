// KitchenMealPrepList.tsx
// Full screen showing how many meals need to be prepared

import React, { useState } from "react";
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
type MealPrepItem = {
  id: string;
  mealName: string;
  mealPeriod: string;
  quantityNeeded: number;
  dietaryNotes?: string;
  prepared?: boolean;
};

// ---------- Practice Data (Mock DB Data) ----------
const MOCK_MEAL_PREP: MealPrepItem[] = [
  {
    id: "1",
    mealName: "Scrambled Eggs & Toast",
    mealPeriod: "Breakfast",
    quantityNeeded: 32,
    dietaryNotes: "5 Gluten Free Toast",
  },
  {
    id: "2",
    mealName: "Oatmeal with Fruit",
    mealPeriod: "Breakfast",
    quantityNeeded: 21,
    dietaryNotes: "4 Sugar Free",
  },
  {
    id: "3",
    mealName: "Turkey Sandwich",
    mealPeriod: "Lunch",
    quantityNeeded: 26,
    dietaryNotes: "6 Low Sodium",
  },
  {
    id: "4",
    mealName: "Grilled Chicken Salad",
    mealPeriod: "Lunch",
    quantityNeeded: 18,
    dietaryNotes: "3 Dairy Free Dressing",
  },
  {
    id: "5",
    mealName: "Vegetable Stir Fry",
    mealPeriod: "Dinner",
    quantityNeeded: 24,
    dietaryNotes: "All Vegan",
  },
  {
    id: "6",
    mealName: "Beef Meatloaf",
    mealPeriod: "Dinner",
    quantityNeeded: 17,
    dietaryNotes: "2 Pureed",
  },
  {
    id: "7",
    mealName: "Baked Salmon",
    mealPeriod: "Dinner",
    quantityNeeded: 14,
    dietaryNotes: "Low Sodium",
  },
  {
    id: "8",
    mealName: "Mashed Potatoes",
    mealPeriod: "Dinner",
    quantityNeeded: 40,
    dietaryNotes: "5 Dairy Free",
  },
];

const KitchenMealPrepList = () => {
  const [mealPrep, setMealPrep] = useState<MealPrepItem[]>(MOCK_MEAL_PREP);

  const togglePrepared = (id: string) => {
    setMealPrep((prev) =>
      prev.map((meal) =>
        meal.id === id ? { ...meal, prepared: !meal.prepared } : meal
      )
    );
  };

  const confirmMarkPrepared = (id: string, name: string) => {
    Alert.alert(
      "Update Prep Status",
      `Mark "${name}" as prepared?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => togglePrepared(id),
        },
      ]
    );
  };

  const renderMeal = ({ item }: { item: MealPrepItem }) => (
    <View
      style={[
        styles.card,
        item.prepared && { backgroundColor: "#ECFDF5" },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.mealName}</Text>
        <View style={styles.periodPill}>
          <Text style={styles.periodPillText}>{item.mealPeriod}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.quantityText}>
          Quantity Needed: {item.quantityNeeded}
        </Text>

        {item.dietaryNotes && (
          <Text style={styles.infoValue}>
            Notes: {item.dietaryNotes}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.completeBtn,
          item.prepared && { backgroundColor: "#6B7280" },
        ]}
        onPress={() => confirmMarkPrepared(item.id, item.mealName)}
      >
        <Text style={styles.actionBtnText}>
          {item.prepared ? "Prepared ✓" : "Mark as Prepared"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[globalStyles.container, styles.safeArea]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Kitchen Prep Board</Text>
        <Text style={styles.subtitle}>
          Meal quantities required for upcoming service periods.
        </Text>
      </View>

      <FlatList
        data={mealPrep}
        keyExtractor={(item) => item.id}
        renderItem={renderMeal}
        contentContainerStyle={styles.listContent}
        style={styles.fullWidthList}
      />
    </SafeAreaView>
  );
};

// ---------- Styles ----------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: "100%",
    alignItems: "stretch",
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
    width: "100%",
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
    backgroundColor: "#E5E7EB",
  },
  periodPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  infoRow: {
    marginTop: 10,
    gap: 6,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  infoValue: {
    fontSize: 14,
    color: "#4B5563",
  },
  completeBtn: {
    marginTop: 14,
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default KitchenMealPrepList;
