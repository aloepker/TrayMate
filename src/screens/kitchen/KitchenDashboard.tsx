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
import StaffChatModal from "../components/StaffChatModal";
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
type Status = "pending" | "preparing" | "ready" | "served" | "cancelled" | "substitution_requested";

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
    note?: string;
    specialInstructions?: string;
  };
  meals: Array<{
    id: number;
    name: string;
    description: string;
    imageUrl?: string;
    allergenInfo?: string;
  }>;
}

// ─── Period accent colours (pill badge per meal row) ──────────────────────────
const PERIOD_ACCENT: Record<string, { color: string; light: string; icon: string }> = {
  Breakfast: { color: "#b45309", light: "#FEF3C7", icon: "sun"     },
  Lunch:     { color: "#1d4ed8", light: "#DBEAFE", icon: "coffee"  },
  Dinner:    { color: "#7c3aed", light: "#EDE9FE", icon: "moon"    },
  Sides:     { color: "#15803d", light: "#DCFCE7", icon: "layers"  },
  Drinks:    { color: "#0e7490", light: "#CFFAFE", icon: "droplet" },
};

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

// ─── Seasonal Meal Modal (expanded with nutrition + dietary fields) ────────────
interface SeasonalModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (meal: { name: string; description: string; period: MealPeriod; tag: string }) => void;
}

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free",
  "Low Sodium", "Low Sugar", "Nut-Free", "Halal",
];

const SeasonalMealModal: React.FC<SeasonalModalProps> = ({ visible, onClose, onAdd }) => {
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod]           = useState<MealPeriod>("Breakfast");
  const [tag, setTag]                 = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Nutrition
  const [calories, setCalories]   = useState("");
  const [sodium, setSodium]       = useState("");
  const [protein, setProtein]     = useState("");
  // Dietary restrictions (multi-select)
  const [dietary, setDietary]     = useState<string[]>([]);
  // Photo URL
  const [photoUrl, setPhotoUrl]   = useState("");

  const toggleDietary = (item: string) =>
    setDietary((prev) => prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item]);

  const handleAdd = () => {
    if (!name.trim()) { Alert.alert("Required", "Please enter a meal name."); return; }
    // Build tag from explicit tag + dietary selections
    const allTags = [tag.trim(), ...dietary].filter(Boolean).join(", ");
    onAdd({ name: name.trim(), description: description.trim(), period, tag: allTags });
    // Reset all fields
    setName(""); setDescription(""); setPeriod("Breakfast"); setTag("");
    setCalories(""); setSodium(""); setProtein("");
    setDietary([]); setPhotoUrl(""); setDropdownOpen(false);
    onClose();
  };

  const selected = PERIOD_OPTIONS.find((o) => o.value === period)!;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modal.overlay}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }} keyboardShouldPersistTaps="handled">
          <View style={modal.sheet}>
            <View style={modal.header}>
              <Text style={modal.title}>Add Meal to Menu</Text>
              <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
                <Feather name="x" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {/* ── Basic info ── */}
            <Text style={modal.sectionLabel}>BASIC INFO</Text>

            <Text style={modal.label}>Meal Name *</Text>
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
              placeholder="Short description of the meal"
              placeholderTextColor="#ABABAB"
              multiline
            />

            {/* ── Meal period dropdown ── */}
            <Text style={modal.label}>Meal Period</Text>
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

            {/* ── Nutrition ── */}
            <Text style={modal.sectionLabel}>NUTRITION</Text>
            <View style={modal.nutritionRow}>
              <View style={{ flex: 1 }}>
                <Text style={modal.label}>Calories</Text>
                <TextInput
                  style={modal.input}
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="e.g. 320"
                  placeholderTextColor="#ABABAB"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modal.label}>Sodium (mg)</Text>
                <TextInput
                  style={modal.input}
                  value={sodium}
                  onChangeText={setSodium}
                  placeholder="e.g. 540"
                  placeholderTextColor="#ABABAB"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modal.label}>Protein (g)</Text>
                <TextInput
                  style={modal.input}
                  value={protein}
                  onChangeText={setProtein}
                  placeholder="e.g. 22"
                  placeholderTextColor="#ABABAB"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* ── Dietary restrictions ── */}
            <Text style={modal.sectionLabel}>DIETARY RESTRICTIONS</Text>
            <View style={modal.chipRow}>
              {DIETARY_OPTIONS.map((item) => {
                const active = dietary.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    style={[modal.chip, active && modal.chipActive]}
                    onPress={() => toggleDietary(item)}
                  >
                    {active && <Feather name="check" size={11} color="#FFF" />}
                    <Text style={[modal.chipText, active && modal.chipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Photo URL ── */}
            <Text style={modal.sectionLabel}>PHOTO</Text>
            <Text style={modal.label}>Image URL (optional)</Text>
            <TextInput
              style={modal.input}
              value={photoUrl}
              onChangeText={setPhotoUrl}
              placeholder="https://example.com/meal.jpg"
              placeholderTextColor="#ABABAB"
              autoCapitalize="none"
              keyboardType="url"
            />
            {photoUrl.trim() ? (
              <Image
                source={{ uri: photoUrl.trim() }}
                style={modal.photoPreview}
                resizeMode="cover"
              />
            ) : null}

            {/* ── Tag ── */}
            <Text style={modal.label}>Additional Tag (optional)</Text>
            <TextInput
              style={modal.input}
              value={tag}
              onChangeText={setTag}
              placeholder="e.g. Chef's Special, Limited Time"
              placeholderTextColor="#ABABAB"
            />

            <TouchableOpacity style={modal.addBtn} onPress={handleAdd}>
              <Feather name="plus-circle" size={18} color="#FFF" />
              <Text style={modal.addBtnText}>Add Meal to Menu</Text>
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


// ─── Support Modal ─────────────────────────────────────────────────────────────
const SUPPORT_TEMPLATES = [
  {
    id: "equipment",
    icon: "tool",
    title: "Equipment Issue",
    description: "Report a broken or malfunctioning piece of kitchen equipment.",
    template: "🔧 Equipment Issue\n\nEquipment: \nLocation: \nIssue Description: \nUrgency: [ ] Low  [ ] Medium  [ ] High",
  },
  {
    id: "supply",
    icon: "package",
    title: "Supply Request",
    description: "Request ingredients, supplies, or restock items.",
    template: "📦 Supply Request\n\nItem(s) Needed: \nQuantity: \nNeeded By: \nNotes: ",
  },
  {
    id: "allergy",
    icon: "alert-triangle",
    title: "Allergy Concern",
    description: "Report an allergy concern or cross-contamination risk.",
    template: "⚠️ Allergy Concern\n\nResident Name: \nAllergen: \nDescription: \nAction Taken: ",
  },
  {
    id: "special",
    icon: "star",
    title: "Special Diet Request",
    description: "Submit a special dietary modification for a resident.",
    template: "🍽️ Special Diet Request\n\nResident Name: \nRoom #: \nDietary Need: \nMeal Affected: \nNotes: ",
  },
  {
    id: "feedback",
    icon: "message-square",
    title: "General Feedback",
    description: "Share feedback or a suggestion with the kitchen team.",
    template: "💬 General Feedback\n\nSubject: \nDetails: \nSubmitted by: ",
  },
];

const SupportModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const template = SUPPORT_TEMPLATES.find((t) => t.id === selectedTemplate);

  const handleSelectTemplate = (id: string) => {
    const tmpl = SUPPORT_TEMPLATES.find((t) => t.id === id)!;
    setSelectedTemplate(id);
    setMessage(tmpl.template);
  };

  const handleSend = () => {
    Alert.alert("Submitted", "Your support request has been sent to the admin team.");
    setSelectedTemplate(null);
    setMessage("");
    onClose();
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    setMessage("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={support.overlay}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }} keyboardShouldPersistTaps="handled">
          <View style={support.sheet}>
            <View style={support.header}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Feather name="help-circle" size={20} color={C.primary} />
                <Text style={support.title}>
                  {selectedTemplate ? template?.title : "Support Center"}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={support.closeBtn}>
                <Feather name="x" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {!selectedTemplate ? (
              <>
                <Text style={support.subtitle}>
                  Select a request type to get started:
                </Text>
                {SUPPORT_TEMPLATES.map((tmpl) => (
                  <TouchableOpacity
                    key={tmpl.id}
                    style={support.templateCard}
                    onPress={() => handleSelectTemplate(tmpl.id)}
                    activeOpacity={0.75}
                  >
                    <View style={support.templateIcon}>
                      <Feather name={tmpl.icon as any} size={20} color={C.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={support.templateTitle}>{tmpl.title}</Text>
                      <Text style={support.templateDesc}>{tmpl.description}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={support.backRow}
                  onPress={() => { setSelectedTemplate(null); setMessage(""); }}
                >
                  <Feather name="chevron-left" size={16} color={C.primary} />
                  <Text style={support.backText}>All Templates</Text>
                </TouchableOpacity>
                <Text style={support.templateDescLarge}>{template?.description}</Text>
                <Text style={support.label}>Message</Text>
                <TextInput
                  style={support.messageInput}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  placeholderTextColor="#ABABAB"
                />
                <TouchableOpacity style={support.sendBtn} onPress={handleSend}>
                  <Feather name="send" size={17} color="#FFF" />
                  <Text style={support.sendBtnText}>Submit Request</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const support = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    minHeight: 360,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  title: { fontSize: 19, fontWeight: "800", color: C.text },
  subtitle: { fontSize: 14, color: C.textMuted, marginBottom: 16 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.inputBg, alignItems: "center", justifyContent: "center",
  },
  templateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.inputBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  templateIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: C.primaryLight, alignItems: "center", justifyContent: "center",
  },
  templateTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 2 },
  templateDesc: { fontSize: 12, color: C.textMuted, lineHeight: 17 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
  backText: { fontSize: 14, color: C.primary, fontWeight: "600" },
  templateDescLarge: { fontSize: 14, color: C.textMuted, marginBottom: 16, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: "700", color: C.text, marginBottom: 8 },
  messageInput: {
    backgroundColor: C.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    fontSize: 14,
    color: C.text,
    minHeight: 180,
    textAlignVertical: "top",
    lineHeight: 22,
    marginBottom: 16,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
  },
  sendBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
const KitchenDashboardScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { messages, unreadCount, staffUnreadCount, markRead, markAllRead, sendMessage } = useKitchenMessages();

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [backendResidents, setBackendResidents] = useState<ApiResident[]>([]);

  const [seasonalMeals, setSeasonalMeals] = useState<SeasonalEntry[]>([]);
  const [showSeasonalModal, setShowSeasonalModal] = useState(false);
  const [showStaffChat, setShowStaffChat] = useState(false);   // replaces showMessages bell
  const [showMessages, setShowMessages] = useState(false);    // kept for per-order inbox modal
  const [showSupport, setShowSupport] = useState(false);

  // Per-order messaging
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  // ── load token + email + residents on mount ──
  useEffect(() => {
    (async () => {
      const [t, email] = await Promise.all([getAuthToken(), getUserEmail()]);
      setToken(t);
      setLoggedInEmail(email);
      // Try fetching residents — admin endpoint first, then direct fetch
      try {
        const res = await getResidents();
        if (res && res.length > 0) { setBackendResidents(res); return; }
      } catch { /* admin endpoint failed, try direct */ }
      try {
        const tok = t || await getAuthToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (tok) headers["Authorization"] = `Bearer ${tok}`;
        const resp = await fetch(`${BASE}/admin/residents`, { headers });
        if (resp.ok) {
          const data = await resp.json();
          const list = Array.isArray(data) ? data : (data?.content ?? data?.data ?? []);
          // Helper: extract string values from arrays that may contain objects
          const toStrings = (arr: any): string[] => {
            if (!arr) return [];
            if (typeof arr === 'string') return arr.split(',').map((s: string) => s.trim()).filter(Boolean);
            if (!Array.isArray(arr)) return [];
            return arr
              .map((v: any) => (typeof v === 'object' && v !== null ? (v.name ?? v.label ?? v.value ?? '') : String(v ?? '')))
              .filter(Boolean);
          };
          setBackendResidents(list.map((r: any) => ({
            id: String(r.id),
            name: String(r.fullName ?? r.name ?? [r.firstName, r.lastName].filter(Boolean).join(" ") ?? ""),
            room: String(r.roomNumber ?? r.room ?? ""),
            dietaryRestrictions: toStrings(r.dietaryRestrictions),
            medicalConditions: toStrings(r.medicalConditions),
            foodAllergies: toStrings(r.foodAllergies),
            medications: toStrings(r.medications),
          })));
        }
      } catch { /* silently ignore */ }
    })();
  }, []);

  // ── match a userId to a resident ──
  const findResident = useCallback((userId: string): ApiResident | undefined => {
    if (!userId) return undefined;
    const uid = String(userId).trim();
    // exact id match (string comparison)
    const exact = backendResidents.find((r) => String(r.id).trim() === uid);
    if (exact) return exact;
    // by name (exact)
    const byName = backendResidents.find((r) => r.name.toLowerCase() === uid.toLowerCase());
    if (byName) return byName;
    // by name (partial)
    const partial = backendResidents.find((r) => r.name.toLowerCase().includes(uid.toLowerCase()));
    if (partial) return partial;
    // by room number
    return backendResidents.find((r) => String(r.room).trim() === uid);
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

  // ── fetch ALL orders for today (every meal period) ──
  const fetchAllOrders = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    try {
      const tok = token || await getAuthToken();
      const headers: Record<string, string> = {};
      if (tok) headers["Authorization"] = `Bearer ${tok}`;
      const periods: MealPeriod[] = ["Breakfast", "Lunch", "Dinner", "Sides", "Drinks"];
      const fetches = periods.map(async (meal) => {
        try {
          const url = `${BASE}/mealOrders/search?mealOfDay=${meal}&date=${today}`;
          const response = await fetch(url, { headers });
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        } catch { return []; }
      });
      const results = await Promise.all(fetches);
      setOrders(results.flat());
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

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
      await apiSetStatusSingle(item.order.userId, item.order.mealOfDay, today, status, cookName, tok);
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

  // ── bulk status update (applies per-period for each period that has orders) ──
  const handleBulkStatus = (status: Status) => {
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    Alert.alert(`Mark All as ${label}?`, `This will update all today's orders to "${label}".`, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: async () => {
        const prevOrders = orders;
        setOrders((prev) => prev.map((o) => ({ ...o, order: { ...o.order, status } })));
        try {
          const today = new Date().toISOString().split("T")[0];
          const tok = token || await getAuthToken();
          const cook = status === "preparing" ? (loggedInEmail ?? undefined) : undefined;
          // Call bulk for each period that has orders
          const periods = [...new Set(orders.map((o) => o.order.mealOfDay))];
          await Promise.all(periods.map((p) => apiSetStatusBulk(p, today, status, cook, tok)));
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

  // Show all seasonal meals (no longer filtered by tab)
  const tabSeasonalMeals = seasonalMeals;

  // ── send message to resident (per-order) ──
  const handleSendReply = (orderId: number) => {
    if (!replyText.trim()) return;
    const item = orders.find((o) => o.order.id === orderId);
    if (!item) return;
    const resident = findResident(item.order.userId);
    const roomStr = resident?.room ? ` (Room ${resident.room})` : "";
    // Push into KitchenMessage context so caregiver can see it
    sendMessage({
      residentId: item.order.userId,
      residentName: resident?.name ?? item.order.userId,
      residentRoom: resident?.room ?? "",
      fromRole: "kitchen",
      fromName: loggedInEmail ?? "Kitchen Staff",
      text: `[Order #${orderId}] ${replyText.trim()}`,
      channel: 'order',
    });
    Alert.alert("Sent", `Message sent for ${resident?.name ?? item.order.userId}${roomStr}'s order #${orderId}.`);
    setReplyText("");
    setReplyingTo(null);
  };

  // Status chip styling
  const statusStyle = (s: Status | string) => {
    if (s === "pending")                return { bg: C.warningBg,  text: C.warning,  icon: "clock"         as const };
    if (s === "preparing")              return { bg: "#FEE2E2",    text: C.danger,   icon: "loader"        as const };
    if (s === "ready")                  return { bg: C.successBg,  text: C.success,  icon: "check-circle"  as const };
    if (s === "served")                 return { bg: "#E0F2FE",    text: "#0369A1",  icon: "check-square"  as const };
    if (s === "cancelled")              return { bg: "#F3F4F6",    text: "#6B7280",  icon: "x-circle"      as const };
    if (s === "substitution_requested") return { bg: "#FEF3C7",    text: C.warning,  icon: "refresh-cw"    as const };
    return                                     { bg: C.surface,    text: C.textMuted, icon: "help-circle"  as const };
  };

  return (
    <SafeAreaView style={s.page}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Kitchen</Text>
          <Text style={s.headerSub}>
            {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
          </Text>
        </View>
        <View style={s.headerRight}>
          {/* Seasonal meal button */}
          <TouchableOpacity style={s.headerIconBtn} onPress={() => setShowSeasonalModal(true)}>
            <Feather name="plus-circle" size={20} color={C.primary} />
          </TouchableOpacity>

          {/* Staff chat icon (replaces bell) */}
          <TouchableOpacity style={s.headerIconBtn} onPress={() => setShowStaffChat(true)}>
            <Feather name="message-square" size={20} color={C.primary} />
            {staffUnreadCount > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeText}>
                  {staffUnreadCount > 9 ? "9+" : staffUnreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Support */}
          <TouchableOpacity style={s.headerIconBtn} onPress={() => setShowSupport(true)}>
            <Feather name="help-circle" size={20} color={C.primary} />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity style={[s.headerIconBtn, s.logoutBtn]} onPress={handleLogout}>
            <Feather name="log-out" size={20} color={C.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
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

        {/* ── Seasonal Meals ── */}
        {tabSeasonalMeals.length > 0 && (
          <View style={s.seasonalSection}>
            <View style={s.sectionTitleRow}>
              <Feather name="star" size={14} color={C.accent} />
              <Text style={s.sectionTitle}>Seasonal Specials</Text>
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

        {/* ── Orders — All Periods ── */}
        <View style={s.sectionTitleRow}>
          <Feather name="clipboard" size={14} color={C.primary} />
          <Text style={s.sectionTitle}>Today's Orders</Text>
          {!loading && orders.length > 0 && (
            <TouchableOpacity onPress={fetchAllOrders} style={{ marginLeft: "auto" }}>
              <Feather name="refresh-cw" size={16} color={C.primary} />
            </TouchableOpacity>
          )}
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
            <Text style={s.emptyDesc}>No orders for today.</Text>
          </View>
        ) : (
          orders.map((item) => {
            const st = statusStyle(item.order.status);
            const resident = findResident(item.order.userId);
            const allergies = resident?.foodAllergies ?? [];
            const dietary   = resident?.dietaryRestrictions ?? [];
            const medical   = resident?.medicalConditions ?? [];
            const initials  = (resident?.name ?? item.order.userId).slice(0, 2).toUpperCase();
            const orderPeriod = item.order.mealOfDay || "Breakfast";
            const pa = PERIOD_ACCENT[orderPeriod] ?? PERIOD_ACCENT["Breakfast"];
            const orderNote = item.order.note || item.order.specialInstructions || "";
            const isReplying = replyingTo === item.order.id;

            // Per-order messages: match by order ID tag in text (e.g. "[Order #123]")
            // Falls back to all resident messages if no tag prefix found
            const orderTag = `[Order #${item.order.id}]`;
            const orderMessages = messages.filter(
              (m) => m.residentId === item.order.userId &&
                     (m.text.startsWith(orderTag) || !m.text.match(/^\[Order #\d+\]/))
            );
            const unreadOrderMsgs = orderMessages.filter((m) => !m.read).length;

            return (
              <View key={item.order.id} style={s.card}>
                {/* ── Period indicator strip on left ── */}
                <View style={[s.cardPeriodStrip, { backgroundColor: pa.color }]} />

                {/* ── Top row: room + resident + period + status ── */}
                <View style={s.cardTop}>
                  {/* Room number avatar (prominent) */}
                  <View style={[s.residentAvatar, { backgroundColor: pa.light }]}>
                    <Feather name="home" size={12} color={pa.color} />
                    <Text style={[s.residentInitials, { color: pa.color, fontSize: 13 }]}>
                      {resident?.room ?? "—"}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    {/* Resident name + room label */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={s.residentName}>{resident?.name ?? item.order.userId}</Text>
                      {resident?.room ? (
                        <Text style={s.roomLabel}>Room {resident.room}</Text>
                      ) : null}
                    </View>
                    {/* Order # + period pill */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Text style={s.orderId}>Order #{item.order.id}</Text>
                      <View style={[s.periodPill, { backgroundColor: pa.light, borderColor: pa.color }]}>
                        <Feather name={pa.icon as any} size={9} color={pa.color} />
                        <Text style={[s.periodPillText, { color: pa.color }]}>{orderPeriod}</Text>
                      </View>
                    </View>
                  </View>
                  {/* Per-order notification bell */}
                  <TouchableOpacity
                    style={[s.orderBellBtn, unreadOrderMsgs > 0 && s.orderBellBtnActive]}
                    onPress={() => {
                      if (orderMessages.length === 0) {
                        Alert.alert("No Messages", `No messages for order #${item.order.id}`);
                      } else {
                        Alert.alert(
                          `Messages · Order #${item.order.id}`,
                          orderMessages.map((m) => `${m.fromRole === "kitchen" ? "🍳" : "👤"} ${m.fromName}: ${m.text}`).join("\n\n")
                        );
                        // Mark messages for this resident as read
                        orderMessages.forEach((m) => { if (!m.read) markRead(m.id); });
                      }
                    }}
                  >
                    <Feather name="bell" size={15} color={unreadOrderMsgs > 0 ? C.danger : C.textMuted} />
                    {unreadOrderMsgs > 0 && (
                      <View style={s.orderBellDot}>
                        <Text style={s.orderBellDotText}>{unreadOrderMsgs}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {/* Status pill */}
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

                {/* ── Resident note (if provided with order) ── */}
                {orderNote !== "" && (
                  <View style={s.noteRow}>
                    <Feather name="message-circle" size={13} color="#92400E" />
                    <Text style={s.noteText}>{orderNote}</Text>
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
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={s.mealName}>{meal.name}</Text>
                          <View style={[s.periodPill, { backgroundColor: pa.light, borderColor: pa.color }]}>
                            <Feather name={pa.icon as any} size={9} color={pa.color} />
                            <Text style={[s.periodPillText, { color: pa.color }]}>{orderPeriod}</Text>
                          </View>
                        </View>
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

                {/* ── Cancel / Substitution actions ── */}
                <View style={s.orderActionsRow}>
                  <TouchableOpacity
                    style={[s.orderActionBtn, { borderColor: C.danger }]}
                    onPress={() =>
                      Alert.alert(
                        'Cancel Order',
                        `Cancel Order #${item.order.id} for ${resident?.name ?? 'resident'}?`,
                        [
                          { text: 'No', style: 'cancel' },
                          {
                            text: 'Yes, Cancel',
                            style: 'destructive',
                            onPress: () => {
                              handleStatusChange(item.order.id, 'cancelled');
                              sendMessage({
                                residentId: item.order.userId,
                                residentName: resident?.name ?? item.order.userId,
                                residentRoom: resident?.room ?? '',
                                fromRole: 'kitchen',
                                fromName: loggedInEmail ?? 'Kitchen Staff',
                                text: `[Order #${item.order.id}] Your order has been cancelled by the kitchen. Please contact staff for assistance.`,
                                channel: 'order',
                              });
                            },
                          },
                        ],
                      )
                    }
                  >
                    <Feather name="x-circle" size={13} color={C.danger} />
                    <Text style={[s.orderActionText, { color: C.danger }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.orderActionBtn, { borderColor: C.warning }]}
                    onPress={() => {
                      setReplyingTo(item.order.id);
                      setReplyText('Substitution available: ');
                    }}
                  >
                    <Feather name="refresh-cw" size={13} color={C.warning} />
                    <Text style={[s.orderActionText, { color: C.warning }]}>Substitution</Text>
                  </TouchableOpacity>
                </View>

                {/* ── Resident messages sent to kitchen for this order ── */}
                {(() => {
                  const orderTag = `[Order #${item.order.id}]`;
                  const residentMsgs = messages.filter(
                    m => m.residentId === item.order.userId &&
                         m.fromRole === 'resident' &&
                         m.channel === 'order' &&
                         m.text.startsWith(orderTag)
                  );
                  if (residentMsgs.length === 0) return null;
                  return (
                    <View style={s.residentMsgSection}>
                      <View style={s.residentMsgHeader}>
                        <Feather name="user" size={11} color="#1d4ed8" />
                        <Text style={s.residentMsgLabel}>Resident messages</Text>
                      </View>
                      {residentMsgs.map(msg => {
                        const clean = msg.text.replace(orderTag, '').trim();
                        if (!msg.read) markRead(msg.id);
                        return (
                          <View key={msg.id} style={s.residentMsgBubble}>
                            <Text style={s.residentMsgText}>{clean}</Text>
                            <Text style={s.residentMsgMeta}>
                              {msg.fromName} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                })()}

                {/* ── Sent kitchen messages for this order — shown inline ── */}
                {orderMessages.length > 0 && (
                  <View style={s.inlineMsgSection}>
                    <View style={s.inlineMsgHeader}>
                      <Feather name="message-square" size={11} color={C.primary} />
                      <Text style={s.inlineMsgLabel}>Messages sent</Text>
                    </View>
                    {orderMessages.map((msg) => {
                      const orderTag = `[Order #${item.order.id}]`;
                      const cleanText = msg.text.startsWith(orderTag)
                        ? msg.text.replace(orderTag, '').trim()
                        : msg.text;
                      return (
                        <View key={msg.id} style={s.inlineMsgBubble}>
                          <Text style={s.inlineMsgText}>{cleanText}</Text>
                          <Text style={s.inlineMsgMeta}>
                            {msg.fromName} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* ── Message / reply to resident ── */}
                <View style={s.replySection}>
                  {isReplying ? (
                    <View style={s.replyInputRow}>
                      <TextInput
                        style={s.replyInput}
                        value={replyText}
                        onChangeText={setReplyText}
                        placeholder="e.g. Missing ingredient, substitute available..."
                        placeholderTextColor="#ABABAB"
                        multiline
                      />
                      <View style={{ gap: 6 }}>
                        <TouchableOpacity style={s.replySendBtn} onPress={() => handleSendReply(item.order.id)}>
                          <Feather name="send" size={14} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={s.replyCancelBtn} onPress={() => { setReplyingTo(null); setReplyText(""); }}>
                          <Feather name="x" size={14} color={C.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={s.replyToggleBtn}
                      onPress={() => { setReplyingTo(item.order.id); setReplyText(""); }}
                    >
                      <Feather name="message-square" size={14} color={C.primary} />
                      <Text style={s.replyToggleText}>Message Resident</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Staff Chat Modal ── */}
      <StaffChatModal
        visible={showStaffChat}
        onClose={() => setShowStaffChat(false)}
        senderName={loggedInEmail ?? 'Kitchen Staff'}
        senderRole="kitchen"
      />

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

      {/* ── Support Modal ── */}
      <SupportModal
        visible={showSupport}
        onClose={() => setShowSupport(false)}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
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
  headerIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(113,118,68,0.22)",
    shadowColor: "#717644",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bellBadge: {
    position: "absolute",
    top: 7,
    right: 7,
    backgroundColor: C.danger,
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFF",
  },
  logoutBtn: {
    borderColor: "rgba(197,48,48,0.25)",
    backgroundColor: C.dangerBg,
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
    paddingLeft: 22,   // extra left padding for the accent strip
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    overflow: "hidden",
    position: "relative",
  },
  cardPeriodStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    zIndex: 2,
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
  roomLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textMuted,
    backgroundColor: C.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  orderBellBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 6,
  },
  orderBellBtnActive: {
    backgroundColor: C.dangerBg,
    borderColor: "#FECACA",
  },
  orderBellDot: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  orderBellDotText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "800",
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
  periodPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 5,
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  periodPillText: {
    fontSize: 10,
    fontWeight: "700",
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

  // Note row (resident note / special instructions)
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    fontWeight: "500",
    lineHeight: 19,
    fontStyle: "italic",
  },

  // Reply / message per order
  replySection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
  },
  replyToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  replyToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.primary,
  },
  replyInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  replyInput: {
    flex: 1,
    backgroundColor: C.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: C.text,
    minHeight: 42,
    maxHeight: 100,
    textAlignVertical: "top",
  },
  replySendBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  replyCancelBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.inputBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },

  // Cancel / Substitution action row
  orderActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  orderActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: C.surface,
  },
  orderActionText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Resident → Kitchen messages on card
  residentMsgSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
    gap: 6,
  },
  residentMsgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  residentMsgLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  residentMsgBubble: {
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  residentMsgText: {
    fontSize: 13,
    color: '#1e3a8a',
    fontWeight: '500',
    lineHeight: 18,
  },
  residentMsgMeta: {
    fontSize: 10,
    color: '#3b82f6',
    marginTop: 4,
  },

  // Inline message thread on card
  inlineMsgSection: {
    marginTop: 10,
    marginBottom: 4,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
    gap: 6,
  },
  inlineMsgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  inlineMsgLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inlineMsgBubble: {
    backgroundColor: C.primaryLight,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#DDD0B8',
  },
  inlineMsgText: {
    fontSize: 13,
    color: C.text,
    fontWeight: '500',
    lineHeight: 18,
  },
  inlineMsgMeta: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 4,
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 8,
  },
  nutritionRow: {
    flexDirection: "row",
    gap: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.inputBg,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipText: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#FFF",
    fontWeight: "700",
  },
  photoPreview: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: C.inputBg,
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
