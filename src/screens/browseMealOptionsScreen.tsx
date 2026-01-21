import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "react-native";

// global styling file (from your teammate setup)
import { globalStyles } from "../styles/styles";

// ---------- Mock Data (no backend needed) ----------
type Meal = {
  id: number;
  name: string;
  meal_period: "Breakfast" | "Lunch" | "Dinner";
  description: string;
  kcal: number;
  sodium_mg: number;
  protein_g: number;
  tags?: string[];
};

type Recommendation = {
  meal_name: string;
  reason: string;
};

const MOCK_MEALS: Meal[] = [
  {
    id: 1,
    name: "Oatmeal Bowl",
    meal_period: "Breakfast",
    description: "Oatmeal with berries and honey.",
    kcal: 350,
    sodium_mg: 120,
    protein_g: 12,
    tags: ["Vegetarian"],
  },
  {
    id: 2,
    name: "Grilled Chicken",
    meal_period: "Lunch",
    description: "Herb grilled chicken with steamed vegetables.",
    kcal: 600,
    sodium_mg: 500,
    protein_g: 40,
    tags: ["High Protein", "Low Carb"],
  },
  {
    id: 3,
    name: "Salmon Plate",
    meal_period: "Dinner",
    description: "Baked salmon with rice and greens.",
    kcal: 520,
    sodium_mg: 430,
    protein_g: 35,
    tags: ["Omega-3"],
  },
];

const MOCK_RECOMMENDATION: Recommendation = {
  meal_name: "Grilled Chicken",
  reason: "High protein and balanced calories for today.",
};

// ---------- Period Tabs ----------
type PeriodOption = {
  label: string;
  value: Meal["meal_period"] | null;
};

const PERIODS: PeriodOption[] = [
  { label: "All Day", value: null },
  { label: "Breakfast", value: "Breakfast" },
  { label: "Lunch", value: "Lunch" },
  { label: "Dinner", value: "Dinner" },
];

// The 'navigation' prop is automatically passed by the Stack Navigator in App.tsx
const MealOptions = ({ navigation }: any) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(PERIODS[0]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  const [menuLoading, setMenuLoading] = useState<boolean>(true);
  const [recLoading, setRecLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Mock "fetch menu"
  const loadMenu = useCallback(async (period: PeriodOption["value"]) => {
    setMenuLoading(true);
    setError("");

    // simulate network delay
    setTimeout(() => {
      const filtered =
        period === null ? MOCK_MEALS : MOCK_MEALS.filter((m) => m.meal_period === period);

      setMeals(filtered);
      setMenuLoading(false);
    }, 400);
  }, []);

  // Mock "fetch recommendation"
  const loadRecommendation = useCallback(async () => {
    setRecLoading(true);
    setError("");

    setTimeout(() => {
      setRecommendation(MOCK_RECOMMENDATION);
      setRecLoading(false);
    }, 400);
  }, []);

  useEffect(() => {
    loadMenu(selectedPeriod.value);
  }, [loadMenu, selectedPeriod.value]);

  useEffect(() => {
    loadRecommendation();
  }, [loadRecommendation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    // run both "fetches"
    await Promise.all([loadMenu(selectedPeriod.value), loadRecommendation()]);

    // add tiny delay so pull-to-refresh feels normal
    setTimeout(() => setRefreshing(false), 250);
  }, [loadMenu, loadRecommendation, selectedPeriod.value]);

  const renderMeal = ({ item }: { item: Meal }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={styles.periodPill}>
          <Text style={styles.periodPillText}>{item.meal_period}</Text>
        </View>
      </View>

      <Text style={styles.cardDescription}>{item.description}</Text>

      <View style={styles.nutritionRow}>
        <Text style={styles.nutritionText}>{item.kcal} kcal</Text>
        <Text style={styles.nutritionText}>{item.sodium_mg} mg sodium</Text>
        <Text style={styles.nutritionText}>{item.protein_g} g protein</Text>
      </View>

      {item.tags?.length ? (
        <View style={styles.tagRow}>
          {item.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  const listHeader = (
    <View style={styles.header}>
      <Text style={styles.title}>TrayMate Menu</Text>
      <Text style={styles.subtitle}>Browse meals and see today's AI recommendation.</Text>

      <View style={styles.tabs}>
        {PERIODS.map((period) => {
          const isActive = period.label === selectedPeriod.label;
          return (
            <TouchableOpacity
              key={period.label}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.recCard}>
        <Text style={styles.recTitle}>RECOMMENDED FOR YOU</Text>
        {recLoading ? (
          <ActivityIndicator color="#1F2937" />
        ) : recommendation ? (
          <>
            <Text style={styles.recMeal}>{recommendation.meal_name}</Text>
            <Text style={styles.recReason}>{recommendation.reason}</Text>
          </>
        ) : (
          <Text style={styles.recReason}>No recommendation available.</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[globalStyles.container, styles.safeArea]}>
      <StatusBar barStyle="dark-content" />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {menuLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#1F2937" />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      ) : (
        <FlatList
          data={meals}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMeal}
          contentContainerStyle={styles.listContent}
          style={styles.flatList}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={<Text style={styles.emptyText}>No meals found.</Text>}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
    </SafeAreaView>
  );
};

export default MealOptions;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    alignItems: 'stretch',
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
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#E7DED2",
  },
  tabActive: {
    backgroundColor: "#1F2937",
  },
  tabText: {
    color: "#1F2937",
    fontWeight: "600",
    fontSize: 14,
  },
  tabTextActive: {
    color: "#F9FAFB",
  },
  recCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFF8E6",
    borderWidth: 1,
    borderColor: "#F4E2C4",
  },
  recTitle: {
    fontSize: 12,
    color: "#92400E",
    letterSpacing: 0.5,
    fontWeight: "700",
  },
  recMeal: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  recReason: {
    marginTop: 4,
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 24,
  },
  flatList: {
    width: '100%',
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
    gap: 8,
  },
  cardTitle: {
    flex: 1,
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
  cardDescription: {
    marginTop: 6,
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 20,
  },
  nutritionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  nutritionText: {
    fontSize: 13,
    color: "#6B7280",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  tagText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#4B5563",
  },
  emptyText: {
    marginTop: 16,
    marginHorizontal: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  errorText: {
    flex: 1,
    color: "#991B1B",
    fontWeight: "600",
  },
  retryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#991B1B",
  },
  retryText: {
    color: "#F9FAFB",
    fontWeight: "600",
  },
});