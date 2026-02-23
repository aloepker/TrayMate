import React, { useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Image,
  ScrollView,
} from "react-native";
import { globalStyles } from "../styles/styles";

// ---------- Types ----------
type MealStatus = "Upcoming" | "Started" | "Cooked";

type FoodItem = {
  id: string;
  name: string;
  imageUrl: string;
};

type MealHistory = {
  id: string;
  type: "Breakfast" | "Lunch" | "Dinner";
  date: string;
  dayOfWeek: string;
  status: MealStatus;
  chefName?: string;
  items: FoodItem[];
};

// ---------- Simulated Database (Mock Data) ----------
const MOCK_HISTORY: MealHistory[] = Array.from({ length: 40 }).map((_, i) => ({
  id: i.toString(),
  type: i % 3 === 0 ? "Breakfast" : i % 3 === 1 ? "Lunch" : "Dinner",
  date: `May ${30 - Math.floor(i / 3)}, 2024`,
  dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i % 7],
  status: i === 0 ? "Upcoming" : i === 1 ? "Started" : "Cooked",
  chefName: i === 0 ? undefined : i === 1 ? "Chef Mario" : "Chef Gordon Ramsay",
  items: [
    { id: "f1", name: "Oatmeal", imageUrl: "https://via.placeholder.com/100" },
    { id: "f2", name: "Toast", imageUrl: "https://via.placeholder.com/100" },
    { id: "f3", name: "Orange Juice", imageUrl: "https://via.placeholder.com/100" },
  ],
}));

const ViewMealHistory = ({ navigation }: any) => {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(MOCK_HISTORY.length / itemsPerPage);
  const currentData = MOCK_HISTORY.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const renderStatusSection = (item: MealHistory) => {
    if (item.status === "Upcoming") {
      return (
        <View style={styles.statusColumn}>
          <Text style={[styles.statusLabel, styles.upcomingLabel]}>Status</Text>
          <Text style={[styles.chefNameText, styles.upcomingLabel]}>Upcoming Meal</Text>
        </View>
      );
    }

    return (
      <View style={styles.statusColumn}>
        <Text style={styles.statusLabel}>
          {item.status === "Started" ? "Started by" : "Cooked by"}
        </Text>
        <Text style={styles.chefNameText}>{item.chefName}</Text>
      </View>
    );
  };

  const renderMealCard = ({ item }: { item: MealHistory }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.8}>
      <View style={styles.cardContent}>
        
        {/* Section 1: Date & Time Stack */}
        <View style={styles.mealMeta}>
          <Text style={styles.dayText}>{item.dayOfWeek}</Text>
          <View style={styles.periodPill}>
            <Text style={styles.periodPillText}>{item.type}</Text>
          </View>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>

        {/* Section 2: Chef/Status Info (Before separator) */}
        {renderStatusSection(item)}

        {/* Section 3: Food Items (After separator) */}
        <View style={styles.foodContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {item.items.map((food) => (
              <View key={food.id} style={styles.foodItemContainer}>
                <Image source={{ uri: food.imageUrl }} style={styles.foodImage} />
                <Text style={styles.foodName}>{food.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[globalStyles.container, styles.safeArea]}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Meal History</Text>
        <Text style={styles.subtitle}>Viewing 10 orders per page</Text>
      </View>

      {currentPage > 0 && (
        <TouchableOpacity style={styles.navArrow} onPress={() => setCurrentPage(currentPage - 1)}>
          <Text style={styles.arrowText}>▲ VIEW NEWER MEALS</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={currentData}
        keyExtractor={(item) => item.id}
        renderItem={renderMealCard}
        style={styles.fullWidthList}
      />

      {currentPage < totalPages - 1 && (
        <TouchableOpacity style={styles.navArrow} onPress={() => setCurrentPage(currentPage + 1)}>
          <Text style={styles.arrowText}>▼ VIEW OLDER MEALS</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    alignItems: 'stretch',
    backgroundColor: "#F9FAFB",
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
  },
  subtitle: {
    color: "#4B5563",
    fontSize: 14,
  },
  fullWidthList: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 16,
    alignSelf: 'stretch',
    shadowColor: "#1F2937",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealMeta: {
    width: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  periodPill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    width: '90%',
    alignItems: 'center',
  },
  periodPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  dateText: {
    marginTop: 4,
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  },
  statusColumn: {
    width: 180,
    paddingHorizontal: 15,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  chefNameText: {
    fontSize: 18, // Larger font for Chef Name
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 2,
  },
  upcomingLabel: {
    color: "#10B981", // Emerald Green
  },
  foodContainer: {
    flex: 1,
    paddingLeft: 15,
  },
  foodItemContainer: {
    alignItems: "center",
    marginRight: 15,
    width: 70,
  },
  foodImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  foodName: {
    marginTop: 4,
    fontSize: 10,
    color: "#374151",
    textAlign: "center",
  },
  navArrow: {
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#E7DED2",
    marginHorizontal: 16,
    borderRadius: 10,
    marginVertical: 4,
  },
  arrowText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: 1,
  },
});

export default ViewMealHistory;