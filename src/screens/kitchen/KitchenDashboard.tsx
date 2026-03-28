import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";

type MealType = "breakfast" | "lunch" | "dinner";
type Status = "pending" | "preparing" | "ready";

interface MealOrder {
  patientId: string;
  patientName: string;
  room: string;
  mealType: MealType;
  mainDish: string;
  side1: string;
  side2: string;
  beverage: string;
  dietaryRestrictions: string[];
  specialInstructions?: string;
  status: Status; 
}

interface ApiOrder {
  order: {
    id: number;
    date: string;
    mealOfDay: string;
    userId: string;
    status: Status;
  };
  meals: Array<{
    id: number;
    name: string;
    description: string;
    allergenInfo?: string;
  }>;
}

//here are the mock orders that we need to switch out for the JSON
// const mockOrders: MealOrder[] = [
//   {
//     patientId: "1",
//     patientName: "Bobby Jack",
//     room: "101A",
//     mealType: "breakfast",
//     mainDish: "Scrambled Eggs (Low Salt)",
//     side1: "Whole Wheat Toast",
//     side2: "Fresh Fruit",
//     beverage: "Sugar-Free Orange Juice",
//     dietaryRestrictions: ["Low Sodium", "Diabetic"],
//     specialInstructions: "No added salt",
//     status: "pending",
//   },
//   {
//     patientId: "2",
//     patientName: "Robert Chen",
//     room: "102B",
//     mealType: "breakfast",
//     mainDish: "Gluten-Free Oatmeal",
//     side1: "Almond Yogurt",
//     side2: "Berries",
//     beverage: "Green Tea",
//     dietaryRestrictions: ["Gluten Free"],
//     status: "preparing",
//   },
//   {
//     patientId: "3",
//     patientName: "James Patterson",
//     room: "104C",
//     mealType: "lunch",
//     mainDish: "Grilled Chicken",
//     side1: "Broccoli",
//     side2: "Brown Rice",
//     beverage: "Water",
//     dietaryRestrictions: ["Heart Healthy"],
//     status: "ready",
//   },
// ];

const CartScreen: React.FC = () => {
// 2. Initialize with empty array and a loading state
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [activeTab, setActiveTab] = useState<MealType>("breakfast");
  const [loading, setLoading] = useState(true);

  // const handleStatusChange = (id: string, status: Status) => {
  //   setOrders((prev) =>
  //     prev.map((o) =>
  //       o.patientId === id ? { ...o, status } : o
  //     )
  //   );
  // };

  //API Fetch Function
  const fetchOrders = async (meal: MealType) => {
    setLoading(true);

  // Get current date for the API: "2026-03-28"
    const today = new Date().toISOString().split('T')[0];
    // Format meal name: "breakfast" -> "Breakfast"
    const formattedMeal = meal.charAt(0).toUpperCase() + meal.slice(1);

  //const mealOrders = orders.filter((o) => o.mealType === activeTab);

try {
      const url = `https://traymate-auth.onrender.com/mealOrders/search?mealOfDay=${formattedMeal}&date=${today}`;
      const response = await fetch(url);
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error("Error fetching from API:", error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch whenever the tab changes
  useEffect(() => {
    fetchOrders(activeTab);
  }, [activeTab]);

  const handleStatusChange = (id: number, status: Status) => {
    // Optimistic UI update: change it locally first
    setOrders((prev) =>
      prev.map((item) =>
        item.order.id === id ? { ...item, order: { ...item.order, status } } : item
      )
    );
    // TODO: Add a fetch(PATCH) here to update the actual database
  };


// Derived counts based on the new API structure
  const counts = {
    total: orders.length,
    pending: orders.filter((o) => o.order.status === "pending").length,
    preparing: orders.filter((o) => o.order.status === "preparing").length,
    ready: orders.filter((o) => o.order.status === "ready").length,
  };

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Header */}
        <Text style={styles.title}>Kitchen Dashboard</Text>

        {/* Tabs */}
        <View style={styles.tabs}>
          {["breakfast", "lunch", "dinner"].map((type) => (
            <Pressable
              key={type}
              style={[
                styles.tabButton,
                activeTab === type && styles.activeTab,
              ]}
              onPress={() => setActiveTab(type as MealType)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === type && styles.activeTabText,
                ]}
              >
                {type.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <SummaryCard label="Total" value={counts.total} />
          <SummaryCard label="Pending" value={counts.pending} />
          <SummaryCard label="Preparing" value={counts.preparing} />
          <SummaryCard label="Ready" value={counts.ready} />
        </View>

        {/* Orders */}
        {/* {mealOrders.map((order) => (
          <View key={order.patientId} style={styles.card}>
            <Text style={styles.room}>Room {order.room}</Text>
            <Text style={styles.name}>{order.patientName}</Text>

            <Text style={styles.text}>Main: {order.mainDish}</Text>
            <Text style={styles.text}>Side 1: {order.side1}</Text>
            <Text style={styles.text}>Side 2: {order.side2}</Text>
            <Text style={styles.text}>Drink: {order.beverage}</Text>

            {order.specialInstructions && (
              <Text style={styles.special}>
                Special: {order.specialInstructions}
              </Text>
            )} */}

{/* Orders List / Loading Indicator */}
        {loading ? (
          <ActivityIndicator size="large" color="#6D6B3B" style={{ marginTop: 40 }} />
        ) : (
          orders.map((item) => (
            <View key={item.order.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.room}>Order #{item.order.id}</Text>
                <Text style={styles.name}>User: {item.order.userId}</Text>
              </View>

              {/* Loop through meals associated with this order */}
              {item.meals.map((meal) => (
                <View key={meal.id} style={styles.mealItem}>
                  <Text style={styles.text}>• {meal.name}</Text>
                  {meal.allergenInfo && (
                    <Text style={styles.special}>Alert: {meal.allergenInfo}</Text>
                  )}
                </View>
              ))}

              <View style={styles.statusRow}>
                {["pending", "preparing", "ready"].map((status) => (
                  <Pressable
                    key={status}
                    style={[
                      styles.statusButton,
                      item.order.status === status && styles.activeStatus,
                    ]}
                    onPress={() =>
                      handleStatusChange(item.order.id, status as Status)
                    }
                  >
                    <Text style={[
                      styles.statusText,
                      item.order.status === status && { color: "#FFF" }
                    ]}>
                      {status.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        )}

        {/* Empty State */}
        {!loading && orders.length === 0 && (
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>
            No orders found for this meal period.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const SummaryCard = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#DCD3B8" },
  container: { padding: 16 },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  }, 

  tabs: {
    flexDirection: "row",
    marginBottom: 16,
  },

  tabButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#EEE",
    alignItems: "center",
    borderRadius: 10,
    marginHorizontal: 4,
  },

  activeTab: {
    backgroundColor: "#6D6B3B",
  },

  tabText: {
    fontWeight: "600",
  },

  activeTabText: {
    color: "#FFF",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  summaryCard: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 12,
    width: "23%",
    alignItems: "center",
  },

  summaryLabel: {
    fontSize: 12,
    color: "#666",
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
  },

  card: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },

  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 5,
    marginBottom: 10
  },

  room: {
    fontWeight: "bold",
    fontSize: 16,
  },

  name: {
    fontSize: 15,
    marginBottom: 8,
  },

  mealItem: {
    marginVertical: 2
  },

  text: {
    fontSize: 14,
    marginBottom: 2,
  },

  special: {
    marginTop: 6,
    fontStyle: "italic",
    color: "#8B6F00",
  },

  statusRow: {
    flexDirection: "row",
    marginTop: 12,
  },

  statusButton: {
    flex: 1,
    padding: 8,
    marginHorizontal: 4,
    backgroundColor: "#EEE",
    borderRadius: 8,
    alignItems: "center",
  },

  activeStatus: {
    backgroundColor: "#6D6B3B",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
});

export default CartScreen;