import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
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

const mockOrders: MealOrder[] = [
  {
    patientId: "1",
    patientName: "Bobby Jack",
    room: "101A",
    mealType: "breakfast",
    mainDish: "Scrambled Eggs (Low Salt)",
    side1: "Whole Wheat Toast",
    side2: "Fresh Fruit",
    beverage: "Sugar-Free Orange Juice",
    dietaryRestrictions: ["Low Sodium", "Diabetic"],
    specialInstructions: "No added salt",
    status: "pending",
  },
  {
    patientId: "2",
    patientName: "Robert Chen",
    room: "102B",
    mealType: "breakfast",
    mainDish: "Gluten-Free Oatmeal",
    side1: "Almond Yogurt",
    side2: "Berries",
    beverage: "Green Tea",
    dietaryRestrictions: ["Gluten Free"],
    status: "preparing",
  },
  {
    patientId: "3",
    patientName: "James Patterson",
    room: "104C",
    mealType: "lunch",
    mainDish: "Grilled Chicken",
    side1: "Broccoli",
    side2: "Brown Rice",
    beverage: "Water",
    dietaryRestrictions: ["Heart Healthy"],
    status: "ready",
  },
];

const CartScreen: React.FC = () => {
  const [orders, setOrders] = useState(mockOrders);
  const [activeTab, setActiveTab] = useState<MealType>("breakfast");

  const handleStatusChange = (id: string, status: Status) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.patientId === id ? { ...o, status } : o
      )
    );
  };

  const mealOrders = orders.filter((o) => o.mealType === activeTab);

  const counts = {
    total: mealOrders.length,
    pending: mealOrders.filter((o) => o.status === "pending").length,
    preparing: mealOrders.filter((o) => o.status === "preparing").length,
    ready: mealOrders.filter((o) => o.status === "ready").length,
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
        {mealOrders.map((order) => (
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
            )}

            <View style={styles.statusRow}>
              {["pending", "preparing", "ready"].map((status) => (
                <Pressable
                  key={status}
                  style={[
                    styles.statusButton,
                    order.status === status && styles.activeStatus,
                  ]}
                  onPress={() =>
                    handleStatusChange(order.patientId, status as Status)
                  }
                >
                  <Text style={styles.statusText}>
                    {status.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
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

  room: {
    fontWeight: "bold",
    fontSize: 16,
  },

  name: {
    fontSize: 15,
    marginBottom: 8,
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