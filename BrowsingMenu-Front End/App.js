import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE_URL, fetchMenu, fetchRecommendation } from "./src/api";

const PERIODS = [
  { label: "All Day", value: null },
  { label: "Breakfast", value: "Breakfast" },
  { label: "Lunch", value: "Lunch" },
  { label: "Dinner", value: "Dinner" },
];

const RESIDENT_ID = 1;

export default function App() {
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0]);
  const [meals, setMeals] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [menuLoading, setMenuLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const showBaseUrlWarning = useMemo(
    () => API_BASE_URL.includes("<"),
    []
  );

  const loadMenu = useCallback(async (period) => {
    setMenuLoading(true);
    setError("");
    try {
      const data = await fetchMenu(RESIDENT_ID, period);
      setMeals(data.meals || []);
    } catch (err) {
      setError(err.message || "Failed to load menu.");
    } finally {
      setMenuLoading(false);
    }
  }, []);

  const loadRecommendation = useCallback(async () => {
    setRecLoading(true);
    setError("");
    try {
      const data = await fetchRecommendation(RESIDENT_ID);
      setRecommendation(data);
    } catch (err) {
      setError(err.message || "Failed to load recommendation.");
    } finally {
      setRecLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu(selectedPeriod.value);
  }, [loadMenu, selectedPeriod]);

  useEffect(() => {
    loadRecommendation();
  }, [loadRecommendation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadMenu(selectedPeriod.value),
      loadRecommendation(),
    ]);
    setRefreshing(false);
  }, [loadMenu, loadRecommendation, selectedPeriod]);

  const renderMeal = ({ item }) => (
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
      <Text style={styles.subtitle}>
        Browse meals and see today's AI recommendation.
      </Text>
      {showBaseUrlWarning ? (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Update API base URL: {API_BASE_URL}
          </Text>
        </View>
      ) : null}
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
        <Text style={styles.recTitle}>Recommended for you</Text>
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
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
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
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No meals found.</Text>
          }
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F2EA",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
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
  warning: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
  },
  warningText: {
    color: "#92400E",
    fontSize: 13,
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "#E7DED2",
  },
  tabActive: {
    backgroundColor: "#1F2937",
  },
  tabText: {
    color: "#1F2937",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#F9FAFB",
  },
  recCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFF8E6",
    borderWidth: 1,
    borderColor: "#F4E2C4",
  },
  recTitle: {
    fontSize: 14,
    color: "#92400E",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  recMeal: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  recReason: {
    marginTop: 6,
    color: "#4B5563",
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#1F2937",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
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
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  periodPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  cardDescription: {
    marginTop: 8,
    color: "#4B5563",
    fontSize: 14,
  },
  nutritionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  nutritionText: {
    fontSize: 12,
    color: "#6B7280",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  tagText: {
    fontSize: 12,
    color: "#374151",
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
