import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  Alert,
  Image,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import { useKitchenMessages, KitchenMessage } from "../context/KitchenMessageContext";
import { MealService } from "../../services/localDataService";
import { getMealPlaceholder } from "../../services/mealDisplayService";
import { getResidents, Resident as ApiResident } from "../../services/api";
import { clearAuth, getAuthToken, getUserEmail } from "../../services/storage";

// ─── Palette (matches app-wide theme) ─────────────────────────────────────────
const C = {
  primary:      "#717644",
  primaryLight: "#F0EFE6",
  background:   "#F5F3EE",   // warm parchment — page bg
  surface:      "#FDFCF9",   // slightly off-white — cards & sheets
  inputBg:      "#EFEDE7",   // deeper warm — input fields & dropdowns
  border:       "#E2DFD8",
  warmBorder:   "#DDD0B8",
  text:         "#1A1A1A",
  textMuted:    "#5C5C5C",
  accent:       "#f6a72d",
  danger:       "#C53030",
  dangerBg:     "#FFF5F5",
  success:      "#2D6A4F",
  successBg:    "#DCFCE7",
  warning:      "#b45309",
  warningBg:    "#fef3c7",
};

type MealPeriod = "Breakfast" | "Lunch" | "Dinner" | "Sides" | "Drinks";
type Status = "pending" | "preparing" | "ready" | "served";

// ─── Base URL + API helpers ────────────────────────────────────────────────────
const BASE = "https://traymate-auth.onrender.com";

async function apiSetStatusSingle(
  userId: string,
  mealOfDay: string,
  date: string,
  newStatus: Status,
  cook?: string,
  token?: string | null,
) {
  let url = `${BASE}/mealOrders/status/single?userId=${encodeURIComponent(userId)}&mealOfDay=${encodeURIComponent(mealOfDay)}&date=${encodeURIComponent(date)}&newStatus=${encodeURIComponent(newStatus)}`;
  if (cook?.trim()) url += `&cook=${encodeURIComponent(cook.trim())}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { method: "PUT", headers });
  if (!res.ok) throw new Error(`Status ${res.status}`);
}

async function apiSetStatusBulk(
  mealOfDay: string,
  date: string,
  newStatus: Status,
  cook?: string,
  token?: string | null,
) {
  let url = `${BASE}/mealOrders/status/bulk?mealOfDay=${encodeURIComponent(mealOfDay)}&date=${encodeURIComponent(date)}&newStatus=${encodeURIComponent(newStatus)}`;
  if (cook?.trim()) url += `&cook=${encodeURIComponent(cook.trim())}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { method: "PUT", headers });
  if (!res.ok) throw new Error(`Status ${res.status}`);
}

interface ApiOrder {
  order: {
    id: number;
    date: string;
    mealOfDay: string;
    userId: string;
    status: Status | string;
  };
  meals: Array<{
    id: number;
    name: string;
    description: string;
    imageUrl?: string;
    allergenInfo?: string;
  }>;
}

// ─── Period option config ──────────────────────────────────────────────────────
const PERIOD_OPTIONS: {
  value: MealPeriod;
  label: string;
  icon: "sun" | "coffee" | "moon" | "layers" | "droplet";
  color: string;
}[] = [
  { value: "Breakfast", label: "Breakfast", icon: "sun",      color: "#b45309" },
  { value: "Lunch",     label: "Lunch",     icon: "coffee",   color: "#1d4ed8" },
  { value: "Dinner",    label: "Dinner",    icon: "moon",     color: "#7c3aed" },
  { value: "Sides",     label: "Side Dish", icon: "layers",   color: "#15803d" },
  { value: "Drinks",    label: "Drink",     icon: "droplet",  color: "#0e7490" },
];

// ─── Seasonal Meal Modal ───────────────────────────────────────────────────────
interface SeasonalModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (meal: { name: string; description: string; period: MealPeriod; tag: string }) => void;
}

const SeasonalMealModal: React.FC<SeasonalModalProps> = ({ visible, onClose, onAdd }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod] = useState<MealPeriod>("Breakfast");
  const [tag, setTag] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleAdd = () => {
    if (!name.trim()) { Alert.alert("Required", "Please enter a meal name."); return; }
    onAdd({ name: name.trim(), description: description.trim(), period, tag: tag.trim() });
    setName(""); setDescription(""); setPeriod("Breakfast"); setTag(""); setDropdownOpen(false);
    onClose();
  };

  const selected = PERIOD_OPTIONS.find((o) => o.value === period)!;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modal.overlay}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }} keyboardShouldPersistTaps="handled">
          <View style={modal.sheet}>
            <View style={modal.header}>
              <Text style={modal.title}>Add Seasonal Item</Text>
              <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
                <Feather name="x" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={modal.label}>Name *</Text>
            <TextInput
              style={modal.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Spring Berry Parfait"
              placeholderTextColor="#ABABAB"
            />

            <Text style={modal.label}>Description</Text>
            <TextInput
              style={[modal.input, { height: 72, textAlignVertical: "top" }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Short description of the seasonal item"
              placeholderTextColor="#ABABAB"
              multiline
            />

            {/* ── Category dropdown ── */}
            <Text style={modal.label}>Category</Text>
            <TouchableOpacity
              style={modal.dropdown}
              onPress={() => setDropdownOpen((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[modal.dropdownDot, { backgroundColor: selected.color + "22" }]}>
                  <Feather name={selected.icon} size={15} color={selected.color} />
                </View>
                <Text style={modal.dropdownValue}>{selected.label}</Text>
              </View>
              <Feather
                name={dropdownOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={C.textMuted}
              />
            </TouchableOpacity>

            {dropdownOpen && (
              <View style={modal.dropdownList}>
                {PERIOD_OPTIONS.map((opt, idx) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      modal.dropdownItem,
                      period === opt.value && modal.dropdownItemActive,
                      idx < PERIOD_OPTIONS.length - 1 && modal.dropdownItemBorder,
                    ]}
                    onPress={() => { setPeriod(opt.value); setDropdownOpen(false); }}
                  >
                    <View style={[modal.dropdownDot, { backgroundColor: opt.color + "22" }]}>
                      <Feather name={opt.icon} size={15} color={opt.color} />
                    </View>
                    <Text style={[modal.dropdownItemText, period === opt.value && { color: C.primary, fontWeight: "700" }]}>
                      {opt.label}
                    </Text>
                    {period === opt.value && (
                      <Feather name="check" size={16} color={C.primary} style={{ marginLeft: "auto" }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={modal.label}>Tag (optional)</Text>
            <TextInput
              style={modal.input}
              value={tag}
              onChangeText={setTag}
              placeholder="e.g. Spring Special, Limited Time"
              placeholderTextColor="#ABABAB"
            />

            <TouchableOpacity style={modal.addBtn} onPress={handleAdd}>
              <Feather name="plus-circle" size={18} color="#FFF" />
              <Text style={modal.addBtnText}>Add Seasonal Item</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// ─── Message Panel ─────────────────────────────────────────────────────────────
interface MessagePanelProps {
  visible: boolean;
  onClose: () => void;
  messages: KitchenMessage[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: number;
}

const formatTime = (date: Date) => {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const MessagePanel: React.FC<MessagePanelProps> = ({
  visible, onClose, messages, markRead, markAllRead, unreadCount,
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={msgPanel.overlay}>
      <View style={msgPanel.sheet}>
        <View style={msgPanel.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Feather name="bell" size={20} color={C.primary} />
            <Text style={msgPanel.title}>Resident Messages</Text>
            {unreadCount > 0 && (
              <View style={msgPanel.badge}>
                <Text style={msgPanel.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllRead}>
                <Text style={msgPanel.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={msgPanel.closeBtn}>
              <Feather name="x" size={22} color={C.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {messages.length === 0 ? (
          <View style={msgPanel.empty}>
            <Feather name="inbox" size={40} color={C.border} />
            <Text style={msgPanel.emptyText}>No messages yet</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {messages.map((msg) => (
              <TouchableOpacity
                key={msg.id}
                style={[msgPanel.msgCard, !msg.read && msgPanel.msgCardUnread]}
                onPress={() => markRead(msg.id)}
                activeOpacity={0.8}
              >
                <View style={msgPanel.msgTop}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={msgPanel.avatar}>
                      <Feather name="user" size={14} color={C.primary} />
                    </View>
                    <View>
                      <Text style={msgPanel.residentName}>{msg.residentName}</Text>
                      {msg.residentRoom ? (
                        <Text style={msgPanel.room}>Room {msg.residentRoom}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={msgPanel.timestamp}>{formatTime(msg.timestamp)}</Text>
                    {!msg.read && <View style={msgPanel.unreadDot} />}
                  </View>
                </View>
                <Text style={msgPanel.msgText}>{msg.text}</Text>
                <View style={msgPanel.fromRow}>
                  <Feather name={msg.fromRole === "admin" ? "shield" : "heart"} size={11} color={C.textMuted} />
                  <Text style={msgPanel.fromText}>from {msg.fromName} · {msg.fromRole}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  </Modal>
);

// ─── Seasonal Meal added locally ───────────────────────────────────────────────
interface SeasonalEntry {
  id: string;
  name: string;
  description: string;
  period: MealPeriod;
  tag: string;
}


// ─── Main Screen ───────────────────────────────────────────────────────────────
const KitchenDashboardScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { messages, unreadCount, markRead, markAllRead } = useKitchenMessages();

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [activeTab, setActiveTab] = useState<MealPeriod>("Breakfast");
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [backendResidents, setBackendResidents] = useState<ApiResident[]>([]);

  const [seasonalMeals, setSeasonalMeals] = useState<SeasonalEntry[]>([]);
  const [showSeasonalModal, setShowSeasonalModal] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  // ── load token + email + residents on mount ──
  useEffect(() => {
    (async () => {
      const [t, email] = await Promise.all([getAuthToken(), getUserEmail()]);
      setToken(t);
      setLoggedInEmail(email);
      try {
        const res = await getResidents();
        setBackendResidents(res);
      } catch { /* silently ignore */ }
    })();
  }, []);

  // ── match a userId to a resident ──
  const findResident = useCallback((userId: string): ApiResident | undefined => {
    if (!userId) return undefined;
    const exact = backendResidents.find((r) => r.id === userId);
    if (exact) return exact;
    const byName = backendResidents.find((r) => r.name.toLowerCase() === userId.toLowerCase());
    if (byName) return byName;
    return backendResidents.find((r) => r.name.toLowerCase().includes(userId.toLowerCase()));
  }, [backendResidents]);

  // ── logout ──
  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: async () => {
        await clearAuth();
        navigation?.replace("Login");
      }},
    ]);
  };

  // ── fetch orders from backend ──
  const fetchOrders = async (meal: MealPeriod) => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    try {
      const tok = token || await getAuthToken();
      const headers: Record<string, string> = {};
      if (tok) headers["Authorization"] = `Bearer ${tok}`;
      const url = `${BASE}/mealOrders/search?mealOfDay=${meal}&date=${today}`;
      const response = await fetch(url, { headers });
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(activeTab); }, [activeTab]);

  // ── apply a status change to a single order ──
  const applyStatusChange = async (orderId: number, status: Status, cookName?: string) => {
    const item = orders.find((o) => o.order.id === orderId);
    if (!item) return;
    const prevStatus = item.order.status;
    // optimistic update
    setOrders((prev) =>
      prev.map((o) => o.order.id === orderId ? { ...o, order: { ...o.order, status } } : o)
    );
    try {
      const today = new Date().toISOString().split("T")[0];
      const tok = token || await getAuthToken();
      await apiSetStatusSingle(item.order.userId, activeTab, today, status, cookName, tok);
    } catch {
      // rollback on error
      setOrders((prev) =>
        prev.map((o) => o.order.id === orderId ? { ...o, order: { ...o.order, status: prevStatus } } : o)
      );
      Alert.alert("Error", "Could not update order status. Please try again.");
    }
  };

  const handleStatusChange = (orderId: number, status: Status) => {
    // Pass the logged-in email automatically as cook when setting "preparing"
    const cook = status === "preparing" ? (loggedInEmail ?? undefined) : undefined;
    applyStatusChange(orderId, status, cook);
  };

  // ── bulk status update ──
  const handleBulkStatus = (status: Status) => {
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    Alert.alert(`Mark All as ${label}?`, `This will update all ${activeTab} orders to "${label}".`, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: async () => {
        const prevOrders = orders;
        setOrders((prev) => prev.map((o) => ({ ...o, order: { ...o.order, status } })));
        try {
          const today = new Date().toISOString().split("T")[0];
          const tok = token || await getAuthToken();
          const cook = status === "preparing" ? (loggedInEmail ?? undefined) : undefined;
          await apiSetStatusBulk(activeTab, today, status, cook, tok);
        } catch {
          setOrders(prevOrders);
          Alert.alert("Error", "Could not update all orders. Please try again.");
        }
      }},
    ]);
  };

  const counts = {
    total:     orders.length,
    pending:   orders.filter((o) => o.order.status === "pending").length,
    preparing: orders.filter((o) => o.order.status === "preparing").length,
    ready:     orders.filter((o) => o.order.status === "ready").length,
    served:    orders.filter((o) => o.order.status === "served").length,
  };

  const addSeasonalMeal = (meal: Omit<SeasonalEntry, "id">) => {
    setSeasonalMeals((prev) => [
      ...prev,
      { ...meal, id: `seasonal_${Date.now()}` },
    ]);
  };

  const removeSeasonalMeal = (id: string) => {
    setSeasonalMeals((prev) => prev.filter((m) => m.id !== id));
  };

  const tabSeasonalMeals = seasonalMeals.filter((m) => m.period === activeTab);

  // Status chip styling
  const statusStyle = (s: Status | string) => {
    if (s === "pending")   return { bg: C.warningBg,  text: C.warning,  icon: "clock"         as const };
    if (s === "preparing") return { bg: "#FEE2E2",    text: C.danger,   icon: "loader"        as const };
    if (s === "ready")     return { bg: C.successBg,  text: C.success,  icon: "check-circle"  as const };
    if (s === "served")    return { bg: "#E0F2FE",    text: "#0369A1",  icon: "check-square"  as const };
    return                        { bg: C.surface,    text: C.textMuted, icon: "help-circle"  as const };
  };

  return (
    <SafeAreaView style={s.page}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Kitchen Dashboard</Text>
          <Text style={s.headerSub}>
            {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
          </Text>
        </View>
        <View style={s.headerRight}>
          {/* Seasonal meal button */}
          <TouchableOpacity
            style={s.seasonalBtn}
            onPress={() => setShowSeasonalModal(true)}
          >
            <Feather name="plus" size={16} color={C.primary} />
            <Text style={s.seasonalBtnText}>Seasonal</Text>
          </TouchableOpacity>

          {/* Messages bell */}
          <TouchableOpacity
            style={s.bellBtn}
            onPress={() => setShowMessages(true)}
          >
            <Feather name="bell" size={22} color={C.primary} />
            {unreadCount > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Feather name="log-out" size={18} color={C.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Meal Period Tabs ── */}
        <View style={s.tabs}>
          {(["Breakfast", "Lunch", "Dinner"] as MealPeriod[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[s.tab, activeTab === tab && s.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Feather
                name={tab === "Breakfast" ? "sun" : tab === "Lunch" ? "coffee" : "moon"}
                size={15}
                color={activeTab === tab ? "#FFF" : C.textMuted}
              />
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Summary Cards ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { label: "Total",     value: counts.total,     icon: "layers"        as const, color: C.primary  },
              { label: "Pending",   value: counts.pending,   icon: "clock"         as const, color: C.warning  },
              { label: "Preparing", value: counts.preparing, icon: "loader"        as const, color: C.danger   },
              { label: "Ready",     value: counts.ready,     icon: "check-circle"  as const, color: C.success  },
              { label: "Served",    value: counts.served,    icon: "check-square"  as const, color: "#0369A1"  },
            ].map(({ label, value, icon, color }) => (
              <View key={label} style={[s.summaryCard, { minWidth: 72 }]}>
                <Feather name={icon} size={18} color={color} />
                <Text style={[s.summaryValue, { color }]}>{value}</Text>
                <Text style={s.summaryLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* ── Seasonal Meals for this period ── */}
        {tabSeasonalMeals.length > 0 && (
          <View style={s.seasonalSection}>
            <View style={s.sectionTitleRow}>
              <Feather name="star" size={14} color={C.accent} />
              <Text style={s.sectionTitle}>Seasonal Specials · {activeTab}</Text>
            </View>
            {tabSeasonalMeals.map((meal) => (
              <View key={meal.id} style={s.seasonalCard}>
                <View style={s.seasonalCardLeft}>
                  <View style={s.seasonalTag}>
                    <Feather name="star" size={11} color={C.accent} />
                    <Text style={s.seasonalTagText}>{meal.tag || "Seasonal"}</Text>
                  </View>
                  <Text style={s.seasonalName}>{meal.name}</Text>
                  {meal.description ? (
                    <Text style={s.seasonalDesc}>{meal.description}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={s.seasonalRemove}
                  onPress={() => removeSeasonalMeal(meal.id)}
                >
                  <Feather name="trash-2" size={16} color={C.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── Orders List ── */}
        <View style={s.sectionTitleRow}>
          <Feather name="clipboard" size={14} color={C.primary} />
          <Text style={s.sectionTitle}>Orders · {activeTab}</Text>
        </View>

        {/* ── Bulk Actions ── */}
        {orders.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["pending", "preparing", "ready", "served"] as Status[]).map((status) => {
                const st = statusStyle(status);
                return (
                  <TouchableOpacity
                    key={status}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: st.bg, borderWidth: 1, borderColor: st.bg }}
                    onPress={() => handleBulkStatus(status)}
                  >
                    <Feather name={st.icon} size={13} color={st.text} />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: st.text }}>
                      All → {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
        ) : orders.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <Feather name="clipboard" size={36} color={C.primary} />
            </View>
            <Text style={s.emptyTitle}>No orders yet</Text>
            <Text style={s.emptyDesc}>No {activeTab.toLowerCase()} orders for today.</Text>
          </View>
        ) : (
          orders.map((item) => {
            const st = statusStyle(item.order.status);
            const resident = findResident(item.order.userId);
            const allergies = resident?.foodAllergies ?? [];
            const dietary   = resident?.dietaryRestrictions ?? [];
            const medical   = resident?.medicalConditions ?? [];
            const initials  = (resident?.name ?? item.order.userId).slice(0, 2).toUpperCase();

            return (
              <View key={item.order.id} style={s.card}>

                {/* ── Top row: avatar + resident info + status pill ── */}
                <View style={s.cardTop}>
                  <View style={s.residentAvatar}>
                    <Text style={s.residentInitials}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.residentName}>{resident?.name ?? item.order.userId}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Text style={s.orderId}>#{item.order.id}</Text>
                      {resident?.room ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Feather name="home" size={11} color={C.textMuted} />
                          <Text style={s.roomText}>Room {resident.room}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                    <Feather name={st.icon} size={12} color={st.text} />
                    <Text style={[s.statusPillText, { color: st.text }]}>
                      {String(item.order.status).toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* ── Dietary / allergy / medical badges ── */}
                {(allergies.length > 0 || dietary.length > 0 || medical.length > 0) && (
                  <View style={s.badgeRow}>
                    {allergies.map((a, i) => (
                      <View key={`a${i}`} style={[s.badge, { backgroundColor: C.dangerBg }]}>
                        <Feather name="alert-triangle" size={9} color={C.danger} />
                        <Text style={[s.badgeText, { color: C.danger }]}>{a}</Text>
                      </View>
                    ))}
                    {dietary.map((d, i) => (
                      <View key={`d${i}`} style={[s.badge, { backgroundColor: C.successBg }]}>
                        <Feather name="leaf" size={9} color={C.success} />
                        <Text style={[s.badgeText, { color: C.success }]}>{d}</Text>
                      </View>
                    ))}
                    {medical.map((m, i) => (
                      <View key={`m${i}`} style={[s.badge, { backgroundColor: "#F3E8FF" }]}>
                        <Feather name="activity" size={9} color="#7c3aed" />
                        <Text style={[s.badgeText, { color: "#7c3aed" }]}>{m}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* ── Divider ── */}
                <View style={s.divider} />

                {/* ── Meals ── */}
                {item.meals.map((meal, idx) => {
                  const ph = getMealPlaceholder(meal.name);
                  return (
                    <View key={meal.id} style={[s.mealRow, idx > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                      {meal.imageUrl ? (
                        <Image source={{ uri: meal.imageUrl }} style={s.mealThumb} />
                      ) : (
                        <View style={[s.mealThumbPlaceholder, { backgroundColor: ph.bg }]}>
                          <Text style={{ fontSize: 24 }}>{ph.emoji}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={s.mealName}>{meal.name}</Text>
                        {meal.description ? (
                          <Text style={s.mealDesc} numberOfLines={2}>{meal.description}</Text>
                        ) : null}
                        {meal.allergenInfo ? (
                          <View style={s.allergenRow}>
                            <Feather name="alert-triangle" size={11} color={C.danger} />
                            <Text style={s.allergenText}>{meal.allergenInfo}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}

                {/* ── Status buttons — 2×2 grid ── */}
                <View style={s.statusGrid}>
                  {(["pending", "preparing", "ready", "served"] as Status[]).map((status) => {
                    const active = item.order.status === status;
                    const st2 = statusStyle(status);
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[
                          s.statusBtn,
                          active
                            ? { backgroundColor: st2.text, borderColor: st2.text }
                            : { backgroundColor: C.surface, borderColor: C.border },
                        ]}
                        onPress={() => handleStatusChange(item.order.id, status)}
                      >
                        <Feather name={st2.icon} size={13} color={active ? "#FFF" : C.textMuted} />
                        <Text style={[s.statusBtnText, { color: active ? "#FFF" : C.textMuted }]}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Seasonal Meal Modal ── */}
      <SeasonalMealModal
        visible={showSeasonalModal}
        onClose={() => setShowSeasonalModal(false)}
        onAdd={addSeasonalMeal}
      />

      {/* ── Message Panel ── */}
      <MessagePanel
        visible={showMessages}
        onClose={() => setShowMessages(false)}
        messages={messages}
        markRead={markRead}
        markAllRead={markAllRead}
        unreadCount={unreadCount}
      />

    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: 16, paddingBottom: 36, paddingTop: 8 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  seasonalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.warmBorder,
  },
  seasonalBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.primary,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  bellBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: C.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFF",
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.dangerBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textMuted,
  },
  tabTextActive: {
    color: "#FFF",
  },

  // Summary
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  summaryLabel: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: "500",
  },

  // Section title
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Seasonal section
  seasonalSection: {
    marginBottom: 20,
  },
  seasonalCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.warmBorder,
    flexDirection: "row",
    alignItems: "center",
  },
  seasonalCardLeft: { flex: 1, gap: 4 },
  seasonalTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  seasonalTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.warning,
  },
  seasonalName: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
  },
  seasonalDesc: {
    fontSize: 13,
    color: C.textMuted,
  },
  seasonalRemove: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: C.dangerBg,
    marginLeft: 10,
  },

  // Order cards
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  // Card top row
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  residentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primaryLight,
    borderWidth: 1.5,
    borderColor: C.warmBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  residentInitials: {
    fontSize: 15,
    fontWeight: "800",
    color: C.primary,
  },
  residentName: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
  },
  orderId: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textMuted,
  },
  roomText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "500",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Badge row (dietary/allergy/medical)
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 12,
  },

  // Meal row within a card
  mealRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
  },
  mealThumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
  },
  mealThumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  mealName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
  },
  mealDesc: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 17,
  },
  allergenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  allergenText: {
    fontSize: 12,
    color: C.danger,
    fontWeight: "600",
  },

  // Status 2×2 grid
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  statusBtn: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 10,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
  },
  emptyDesc: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: "center",
  },
});

// ─── Modal Styles ──────────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
  },
  closeBtn: {
    padding: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textMuted,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dropdownValue: {
    fontSize: 15,
    color: C.text,
    fontWeight: "500",
  },
  dropdownDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownList: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    marginTop: 4,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: C.inputBg,
  },
  dropdownItemActive: {
    backgroundColor: C.primaryLight,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dropdownItemText: {
    fontSize: 14,
    color: C.textMuted,
    fontWeight: "500",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.primary,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 22,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
  },
});

// ─── Message Panel Styles ──────────────────────────────────────────────────────
const msgPanel = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: "75%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: C.text,
  },
  badge: {
    backgroundColor: C.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
  },
  closeBtn: { padding: 4 },
  markAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.primary,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    color: C.textMuted,
  },
  msgCard: {
    backgroundColor: C.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  msgCardUnread: {
    backgroundColor: "#F0F4E8",
    borderColor: C.warmBorder,
  },
  msgTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  residentName: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
  },
  room: {
    fontSize: 12,
    color: C.textMuted,
  },
  timestamp: {
    fontSize: 11,
    color: C.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
    alignSelf: "flex-end",
  },
  msgText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
  },
  fromRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fromText: {
    fontSize: 12,
    color: C.textMuted,
    fontStyle: "italic",
  },
});

export default KitchenDashboardScreen;
