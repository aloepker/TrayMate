import React, { useState, useEffect, useCallback } from "react";
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
  Alert,
  Image,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import { useKitchenMessages, KitchenMessage } from "../context/KitchenMessageContext";
import { MealService } from "../../services/localDataService";
import { getMealImage, getMealPlaceholder } from "../../services/mealDisplayService";
import { clearAuth, getAuthToken } from "../../services/storage";
import { getResidents, Resident as ApiResident } from "../../services/api";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  primary:      "#717644",
  primaryLight: "#F0EFE6",
  background:   "#F5F3EE",
  surface:      "#FDFCF9",
  inputBg:      "#EFEDE7",
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
type Status = "pending" | "preparing" | "ready";

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

// ─── Period options ────────────────────────────────────────────────────────────
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

// (Resident lookup now done inside the component via findResident() using live backend data)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTime = (date: Date) => {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

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
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
          keyboardShouldPersistTaps="handled"
        >
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
                    <Text
                      style={[
                        modal.dropdownItemText,
                        period === opt.value && { color: C.primary, fontWeight: "700" },
                      ]}
                    >
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

// ─── Compose Message Modal ─────────────────────────────────────────────────────
interface ComposeModalProps {
  visible: boolean;
  resident: { id: string; name: string; room: string; restrictions: string[] } | null;
  onClose: () => void;
  onSend: (text: string) => void;
}

const ComposeMessageModal: React.FC<ComposeModalProps> = ({
  visible, resident, onClose, onSend,
}) => {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) { Alert.alert("Required", "Please type a message first."); return; }
    onSend(text.trim());
    setText("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modal.overlay}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={modal.sheet}>
            {/* Header */}
            <View style={modal.header}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={modal.title}>Message Resident</Text>
                {resident ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={compose.roomPill}>
                      <Feather name="home" size={11} color={C.primary} />
                      <Text style={compose.roomPillText}>{resident.room ? `Room ${resident.room}` : "No room"}</Text>
                    </View>
                    <Text style={compose.recipientName}>{resident.name}</Text>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
                <Feather name="x" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Dietary summary for context */}
            {resident && resident.restrictions.length > 0 && (
              <View style={compose.restrictionSummary}>
                <Feather name="info" size={13} color={C.warning} />
                <Text style={compose.restrictionSummaryText}>
                  Resident notes: {resident.restrictions.join(", ")}
                </Text>
              </View>
            )}

            <Text style={modal.label}>Message</Text>
            <TextInput
              style={[modal.input, { height: 100, textAlignVertical: "top" }]}
              value={text}
              onChangeText={setText}
              placeholder="Type your message to the resident or caregiver..."
              placeholderTextColor="#ABABAB"
              multiline
              autoFocus
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                style={[modal.addBtn, { flex: 1, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border }]}
                onPress={onClose}
              >
                <Text style={[modal.addBtnText, { color: C.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[modal.addBtn, { flex: 2 }]} onPress={handleSend}>
                <Feather name="send" size={16} color="#FFF" />
                <Text style={modal.addBtnText}>Send Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// ─── Inbox Panel Modal ─────────────────────────────────────────────────────────
interface MessagePanelProps {
  visible: boolean;
  onClose: () => void;
  messages: KitchenMessage[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: number;
}

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
                  <Feather
                    name={msg.fromRole === "kitchen" ? "tool" : msg.fromRole === "admin" ? "shield" : "heart"}
                    size={11}
                    color={C.textMuted}
                  />
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

// ─── Seasonal entry ────────────────────────────────────────────────────────────
interface SeasonalEntry {
  id: string;
  name: string;
  description: string;
  period: MealPeriod;
  tag: string;
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
const KitchenDashboardScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { messages, unreadCount, markRead, markAllRead, sendMessage } = useKitchenMessages();

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [activeTab, setActiveTab] = useState<MealPeriod>("Breakfast");
  const [loading, setLoading] = useState(true);

  // Backend residents — used to match order.userId → room + name
  const [backendResidents, setBackendResidents] = useState<ApiResident[]>([]);

  const [seasonalMeals, setSeasonalMeals] = useState<SeasonalEntry[]>([]);
  const [showSeasonalModal, setShowSeasonalModal] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  // Compose message state
  const [composeResident, setComposeResident] = useState<{ id: string; name: string; room: string; restrictions: string[] } | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  // ── Fetch backend residents once on mount ────────────────────────────────
  useEffect(() => {
    getResidents()
      .then(setBackendResidents)
      .catch(() => setBackendResidents([]));
  }, []);

  // ── Match an order's userId to a backend resident ────────────────────────
  const findResident = useCallback((userId: string): ApiResident | undefined => {
    if (!userId) return undefined;
    const lower = userId.toLowerCase();
    // 1. exact id match
    const byId = backendResidents.find((r) => r.id === userId);
    if (byId) return byId;
    // 2. exact name match (backend userId might be fullName)
    const byName = backendResidents.find((r) => r.name.toLowerCase() === lower);
    if (byName) return byName;
    // 3. partial / email prefix match
    const byPartial = backendResidents.find(
      (r) => lower.includes(r.name.toLowerCase().split(" ")[0]) ||
             r.name.toLowerCase().includes(lower),
    );
    return byPartial;
  }, [backendResidents]);

  // ── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await clearAuth();
          navigation?.replace("Login");
        },
      },
    ]);
  };

  // Fetch orders
  const fetchOrders = async (meal: MealPeriod) => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    try {
      const token = await getAuthToken();
      const url = `https://traymate-auth.onrender.com/mealOrders/search?mealOfDay=${meal}&date=${today}`;
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(activeTab); }, [activeTab]);

  const handleStatusChange = (id: number, status: Status) => {
    setOrders((prev) =>
      prev.map((item) =>
        item.order.id === id ? { ...item, order: { ...item.order, status } } : item,
      )
    );
  };

  const openCompose = (userId: string) => {
    const r = findResident(userId);
    setComposeResident(r ? {
      id: r.id,
      name: r.name,
      room: r.room,
      restrictions: [...r.dietaryRestrictions, ...r.foodAllergies],
    } : { id: userId, name: userId, room: "", restrictions: [] });
    setShowCompose(true);
  };

  const handleSendMessage = (text: string) => {
    if (!composeResident) return;
    sendMessage({
      residentId: composeResident.id,
      residentName: composeResident.name,
      residentRoom: composeResident.room,
      fromRole: "kitchen",
      fromName: "Kitchen Staff",
      text,
    });
  };

  const counts = {
    total:     orders.length,
    pending:   orders.filter((o) => o.order.status === "pending").length,
    preparing: orders.filter((o) => o.order.status === "preparing").length,
    ready:     orders.filter((o) => o.order.status === "ready").length,
  };

  const addSeasonalMeal = (meal: Omit<SeasonalEntry, "id">) => {
    setSeasonalMeals((prev) => [...prev, { ...meal, id: `seasonal_${Date.now()}` }]);
  };

  const removeSeasonalMeal = (id: string) => {
    setSeasonalMeals((prev) => prev.filter((m) => m.id !== id));
  };

  const tabSeasonalMeals = seasonalMeals.filter((m) => m.period === activeTab);

  const statusStyle = (st: Status) => {
    if (st === "pending")   return { bg: C.warningBg, text: C.warning, icon: "clock"        as const };
    if (st === "preparing") return { bg: "#FEE2E2",   text: C.danger,  icon: "loader"       as const };
    return                         { bg: C.successBg, text: C.success, icon: "check-circle" as const };
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
          <TouchableOpacity style={s.seasonalBtn} onPress={() => setShowSeasonalModal(true)}>
            <Feather name="plus" size={16} color={C.primary} />
            <Text style={s.seasonalBtnText}>Seasonal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bellBtn} onPress={() => setShowMessages(true)}>
            <Feather name="bell" size={22} color={C.primary} />
            {unreadCount > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Logout */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Feather name="log-out" size={18} color={C.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Tabs ── */}
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
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Summary ── */}
        <View style={s.summaryRow}>
          {[
            { label: "Total",     value: counts.total,     icon: "layers"       as const, color: C.primary },
            { label: "Pending",   value: counts.pending,   icon: "clock"        as const, color: C.warning },
            { label: "Preparing", value: counts.preparing, icon: "loader"       as const, color: C.danger  },
            { label: "Ready",     value: counts.ready,     icon: "check-circle" as const, color: C.success },
          ].map(({ label, value, icon, color }) => (
            <View key={label} style={s.summaryCard}>
              <Feather name={icon} size={18} color={color} />
              <Text style={[s.summaryValue, { color }]}>{value}</Text>
              <Text style={s.summaryLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Seasonal specials ── */}
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
                  {meal.description ? <Text style={s.seasonalDesc}>{meal.description}</Text> : null}
                </View>
                <TouchableOpacity style={s.seasonalRemove} onPress={() => removeSeasonalMeal(meal.id)}>
                  <Feather name="trash-2" size={16} color={C.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── Orders ── */}
        <View style={s.sectionTitleRow}>
          <Feather name="clipboard" size={14} color={C.primary} />
          <Text style={s.sectionTitle}>Orders · {activeTab}</Text>
        </View>

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
            // Use backend residents fetched on mount for accurate room + name
            const resident = findResident(item.order.userId);
            // Combine all dietary info from backend
            const allRestrictions = resident
              ? [...resident.foodAllergies, ...resident.dietaryRestrictions, ...resident.medicalConditions]
                  .filter(Boolean)
              : [];

            return (
              <View key={item.order.id} style={s.card}>

                {/* Olive left accent stripe */}
                <View style={s.cardAccent} />

                {/* ── Card header ── */}
                <View style={s.cardHeader}>
                  <View style={{ flex: 1, gap: 6 }}>

                    {/* Order ID + status pill */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={s.orderId}>Order #{item.order.id}</Text>
                      <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                        <Feather name={st.icon} size={12} color={st.text} />
                        <Text style={[s.statusPillText, { color: st.text }]}>
                          {item.order.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Resident row: room + name from backend */}
                    <View style={s.residentRow}>
                      {resident ? (
                        <>
                          <View style={s.roomBadge}>
                            <Feather name="home" size={12} color={C.primary} />
                            <Text style={s.roomBadgeText}>
                              {resident.room ? `Room ${resident.room}` : "No room"}
                            </Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <Feather name="user" size={13} color={C.textMuted} />
                            <Text style={s.residentName}>{resident.name}</Text>
                          </View>
                        </>
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                          <Feather name="user" size={13} color={C.textMuted} />
                          <Text style={s.userId}>{item.order.userId}</Text>
                        </View>
                      )}
                    </View>

                    {/* Dietary/allergy badges from backend data */}
                    {allRestrictions.length > 0 && (
                      <View style={s.restrictionRow}>
                        {allRestrictions.map((restriction, idx) => {
                          // Classify: food allergies → red, medical → purple, dietary → green
                          const isAllergy = resident && resident.foodAllergies.includes(restriction);
                          const isMedical = resident && resident.medicalConditions.includes(restriction);
                          const bg = isAllergy ? "#FEE2E2" : isMedical ? "#EDE9FE" : "#DCFCE7";
                          const border = isAllergy ? "#FECACA" : isMedical ? "#C4B5FD" : "#86EFAC";
                          const color = isAllergy ? "#991b1b" : isMedical ? "#5B21B6" : "#14532D";
                          const icon: "alert-triangle" | "activity" | "heart" =
                            isAllergy ? "alert-triangle" : isMedical ? "activity" : "heart";
                          return (
                            <View
                              key={idx}
                              style={[s.restrictionBadge, { backgroundColor: bg, borderColor: border }]}
                            >
                              <Feather name={icon} size={10} color={color} />
                              <Text style={[s.restrictionText, { color }]}>
                                {restriction}{isAllergy ? " ⚠" : ""}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>

                {/* ── Meals in this order ── */}
                {item.meals.map((meal) => {
                  // Try local bundled image first, then backend imageUrl, then placeholder
                  const localImg = getMealImage(meal.name);
                  const ph = getMealPlaceholder(meal.name);
                  const hasUri = !localImg && !!(meal as any).imageUrl;
                  return (
                    <View key={meal.id} style={s.mealRow}>
                      {localImg ? (
                        <Image source={localImg} style={s.mealThumb} />
                      ) : hasUri ? (
                        <Image source={{ uri: (meal as any).imageUrl }} style={s.mealThumb} />
                      ) : (
                        <View style={[s.mealThumbPlaceholder, { backgroundColor: ph.bg }]}>
                          <Text style={{ fontSize: 22 }}>{ph.emoji}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={s.mealName}>{meal.name}</Text>
                        {meal.description ? (
                          <Text style={s.mealDesc} numberOfLines={1}>{meal.description}</Text>
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

                {/* ── Action row: status toggles + message ── */}
                <View style={s.actionRow}>
                  {/* Status toggle buttons */}
                  <View style={s.statusRow}>
                    {(["pending", "preparing", "ready"] as Status[]).map((status) => {
                      const active = item.order.status === status;
                      const st2 = statusStyle(status);
                      return (
                        <TouchableOpacity
                          key={status}
                          style={[
                            s.statusBtn,
                            active
                              ? { backgroundColor: C.primary }
                              : { backgroundColor: C.primaryLight, borderColor: C.border },
                          ]}
                          onPress={() => handleStatusChange(item.order.id, status)}
                        >
                          <Feather name={st2.icon} size={12} color={active ? "#FFF" : C.textMuted} />
                          <Text style={[s.statusBtnText, { color: active ? "#FFF" : C.textMuted }]}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Message button */}
                  <TouchableOpacity
                    style={s.msgBtn}
                    onPress={() => openCompose(item.order.userId)}
                  >
                    <Feather name="message-circle" size={16} color={C.primary} />
                  </TouchableOpacity>
                </View>

              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Modals ── */}
      <SeasonalMealModal
        visible={showSeasonalModal}
        onClose={() => setShowSeasonalModal(false)}
        onAdd={addSeasonalMeal}
      />
      <MessagePanel
        visible={showMessages}
        onClose={() => setShowMessages(false)}
        messages={messages}
        markRead={markRead}
        markAllRead={markAllRead}
        unreadCount={unreadCount}
      />
      <ComposeMessageModal
        visible={showCompose}
        resident={composeResident}
        onClose={() => setShowCompose(false)}
        onSend={handleSendMessage}
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
  headerTitle: { fontSize: 22, fontWeight: "700", color: C.text, letterSpacing: -0.3 },
  headerSub:   { fontSize: 13, color: C.textMuted, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
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
  seasonalBtnText: { fontSize: 13, fontWeight: "600", color: C.primary },
  bellBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.surface,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.border,
  },
  bellBadge: {
    position: "absolute", top: 6, right: 6,
    backgroundColor: C.danger,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFF" },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.dangerBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  // Tabs
  tabs: { flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 16 },
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
  tabActive:     { backgroundColor: C.primary, borderColor: C.primary },
  tabText:       { fontSize: 14, fontWeight: "600", color: C.textMuted },
  tabTextActive: { color: "#FFF" },

  // Summary
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
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
  summaryValue: { fontSize: 20, fontWeight: "700" },
  summaryLabel: { fontSize: 11, color: C.textMuted, fontWeight: "500" },

  // Section title
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sectionTitle: {
    fontSize: 13, fontWeight: "700",
    color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5,
  },

  // Seasonal
  seasonalSection: { marginBottom: 20 },
  seasonalCard: {
    backgroundColor: C.surface,
    borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: C.warmBorder,
    flexDirection: "row", alignItems: "center",
  },
  seasonalCardLeft: { flex: 1, gap: 4 },
  seasonalTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  seasonalTagText: { fontSize: 11, fontWeight: "700", color: C.warning },
  seasonalName:   { fontSize: 15, fontWeight: "600", color: C.text },
  seasonalDesc:   { fontSize: 13, color: C.textMuted },
  seasonalRemove: {
    padding: 8, borderRadius: 10,
    backgroundColor: C.dangerBg, marginLeft: 10,
  },

  // Order cards
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: "hidden",
  },
  cardAccent: {
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    width: 4,
    backgroundColor: C.primary,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    opacity: 0.7,
  },
  cardHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  // Resident identity
  residentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  roomBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.primaryLight,
    borderWidth: 1,
    borderColor: C.warmBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  roomBadgeText: { fontSize: 12, fontWeight: "700", color: C.primary },
  residentName:  { fontSize: 13, fontWeight: "600", color: C.text },
  orderId:       { fontSize: 15, fontWeight: "700", color: C.text },
  userId:        { fontSize: 13, color: C.textMuted },

  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusPillText: { fontSize: 11, fontWeight: "700" },

  // Dietary restriction badges
  restrictionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 2,
  },
  restrictionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  restrictionText: { fontSize: 11, fontWeight: "600" },

  // Meal rows
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  mealThumb: { width: 52, height: 52, borderRadius: 12 },
  mealThumbPlaceholder: {
    width: 52, height: 52, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  mealName: { fontSize: 14, fontWeight: "600", color: C.text },
  mealDesc: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  allergenRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  allergenText: { fontSize: 12, color: C.danger, fontWeight: "500" },

  // Action row
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  statusRow: { flex: 1, flexDirection: "row", gap: 6 },
  statusBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBtnText: { fontSize: 12, fontWeight: "600" },
  msgBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.warmBorder,
  },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.primaryLight,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  emptyDesc:  { fontSize: 14, color: C.textMuted, textAlign: "center" },
});

// ─── Modal Styles ──────────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 20,
  },
  title:    { fontSize: 18, fontWeight: "700", color: C.text },
  closeBtn: { padding: 4, marginTop: 2 },
  label: {
    fontSize: 13, fontWeight: "600", color: C.textMuted,
    marginBottom: 6, marginTop: 14,
  },
  input: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.text,
  },
  dropdown: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  dropdownValue: { fontSize: 15, color: C.text, fontWeight: "500" },
  dropdownDot: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
  },
  dropdownList: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, marginTop: 4, overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: C.inputBg,
  },
  dropdownItemActive:  { backgroundColor: C.primaryLight },
  dropdownItemBorder:  { borderBottomWidth: 1, borderBottomColor: C.border },
  dropdownItemText:    { fontSize: 14, color: C.textMuted, fontWeight: "500" },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: C.primary, paddingVertical: 15,
    borderRadius: 14, marginTop: 22,
  },
  addBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
});

// ─── Compose-specific styles ───────────────────────────────────────────────────
const compose = StyleSheet.create({
  roomPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: C.primaryLight, borderWidth: 1, borderColor: C.warmBorder,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20,
  },
  roomPillText:     { fontSize: 12, fontWeight: "700", color: C.primary },
  recipientName:    { fontSize: 13, color: C.textMuted, fontWeight: "500" },
  restrictionSummary: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: C.warningBg, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: "#FDE68A",
    marginBottom: 4,
  },
  restrictionSummaryText: {
    flex: 1, fontSize: 13, color: C.warning, fontWeight: "500",
  },
});

// ─── Message Panel Styles ──────────────────────────────────────────────────────
const msgPanel = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, maxHeight: "75%",
  },
  header: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
    paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title:       { fontSize: 17, fontWeight: "700", color: C.text },
  badge: {
    backgroundColor: C.danger, borderRadius: 10,
    minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText:   { fontSize: 11, fontWeight: "700", color: "#FFF" },
  closeBtn:    { padding: 4 },
  markAllText: { fontSize: 13, fontWeight: "600", color: C.primary },
  empty:       { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText:   { fontSize: 15, color: C.textMuted },
  msgCard: {
    backgroundColor: C.background, borderRadius: 14,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border, gap: 6,
  },
  msgCardUnread: { backgroundColor: "#F0F4E8", borderColor: C.warmBorder },
  msgTop: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
  },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.primaryLight,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.border,
  },
  residentName: { fontSize: 14, fontWeight: "700", color: C.text },
  room:         { fontSize: 12, color: C.textMuted },
  timestamp:    { fontSize: 11, color: C.textMuted },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: C.primary, alignSelf: "flex-end",
  },
  msgText:  { fontSize: 14, color: C.text, lineHeight: 20 },
  fromRow:  { flexDirection: "row", alignItems: "center", gap: 4 },
  fromText: { fontSize: 12, color: C.textMuted, fontStyle: "italic" },
});

export default KitchenDashboardScreen;
