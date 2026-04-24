import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Switch,
  Platform,
  PermissionsAndroid,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import { launchImageLibrary } from "react-native-image-picker";
import { useKitchenMessages, KitchenMessage } from "../context/KitchenMessageContext";
import { getMealPlaceholder, getMealImage } from "../../services/mealDisplayService";
import { getResidents, getResidentById, Resident as ApiResident, getChats, createMeal, updateMeal, deleteMeal, getAllMenuMeals, setMealAvailability, listCoverageAlertsApi, type MealCoverageAlert } from "../../services/api";
import MessagesModal from "../components/messaging/MessagesModal";
import { clearAuth, getAuthToken, getUserEmail } from "../../services/storage";
import {
  hasMealNameTranslation,
  hasMealDescriptionTranslation,
  setCachedMealTranslations,
  setCachedDescriptionTranslations,
} from "../../services/mealLocalization";
import {
  translateMealNamesWithGemini,
  translateMealDescriptionsWithGemini,
} from "../../services/geminiService";

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

const formatLocalDate = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

const COVERAGE_ALERT_PERIODS = ["Breakfast", "Lunch", "Dinner"] as const;

function getPeriodColor(period: string): string {
  const norm = normalizePeriod(period);
  const map: Record<string, string> = {
    Breakfast: "#b45309", Lunch: "#1d4ed8", Dinner: "#7c3aed",
    Sides: "#15803d", Drinks: "#0e7490", "All Day": "#6D6B3B",
  };
  return map[norm] || C.textMuted;
}

/** Pick an image from gallery — handles permissions on both iOS & Android */
async function pickImage(onPicked: (uri: string) => void) {
  // Android 13+ needs READ_MEDIA_IMAGES, older needs READ_EXTERNAL_STORAGE
  if (Platform.OS === "android") {
    try {
      const permission =
        Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const granted = await PermissionsAndroid.request(permission, {
        title: "Photo Access",
        message: "TrayMate needs access to your photos to add meal images.",
        buttonPositive: "Allow",
      });
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert("Permission Denied", "Allow photo access in Settings to upload meal images.");
        return;
      }
    } catch {
      // Some Android versions don't need explicit permission — proceed anyway
    }
  }

  launchImageLibrary(
    { mediaType: "photo", quality: 0.7, includeBase64: false, maxWidth: 800, maxHeight: 600 },
    (res) => {
      if (res.didCancel || res.errorCode) return;
      const asset = res.assets?.[0];
      if (asset?.uri) onPicked(asset.uri);
    },
  );
}

/** Normalize raw DB mealperiod strings to match app's period categories */
function normalizePeriod(raw: string | null | undefined): string {
  const v = (raw ?? "").trim().toLowerCase();
  if (v.includes("drink") || v.includes("beverage")) return "Drinks";
  if (v.includes("side")) return "Sides";
  if (v.includes("breakfast")) return "Breakfast";
  // "Lunch, Dinner" → "Lunch" (matches resident browse behavior)
  if (v.includes("lunch")) return "Lunch";
  if (v.includes("dinner")) return "Dinner";
  return "All Day";
}

// ─── Seasonal Meal Modal (expanded with nutrition + dietary fields) ────────────
interface SeasonalModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (meal: {
    name: string; description: string; period: MealPeriod; tag: string;
    calories?: number; sodium?: number; protein?: number;
    imageUrl?: string; seasonal: boolean;
  }) => void;
}

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free",
  "Low Sodium", "Low Sugar", "Nut-Free", "Halal",
];

const SeasonalMealModal: React.FC<SeasonalModalProps> = ({ visible, onClose, onAdd }) => {
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod]           = useState<MealPeriod>("Breakfast");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Nutrition
  const [calories, setCalories]   = useState("");
  const [sodium, setSodium]       = useState("");
  const [protein, setProtein]     = useState("");
  // Dietary restrictions (multi-select)
  const [dietary, setDietary]     = useState<string[]>([]);
  // Photo URL
  const [photoUrl, setPhotoUrl]   = useState("");
  // Seasonal toggle
  const [isSeasonal, setIsSeasonal] = useState(false);

  const toggleDietary = (item: string) =>
    setDietary((prev) => prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item]);

  const handleAdd = () => {
    if (!name.trim()) { Alert.alert("Required", "Please enter a meal name."); return; }
    // Build tag from dietary selections + seasonal
    const parts = [...dietary];
    if (isSeasonal) parts.unshift("Seasonal");
    const allTags = parts.filter(Boolean).join(", ");
    onAdd({
      name: name.trim(), description: description.trim(), period, tag: allTags,
      calories: calories ? Number(calories) : undefined,
      sodium: sodium ? Number(sodium) : undefined,
      protein: protein ? Number(protein) : undefined,
      imageUrl: photoUrl.trim() || undefined,
      seasonal: isSeasonal,
    });
    // Reset all fields
    setName(""); setDescription(""); setPeriod("Breakfast");
    setCalories(""); setSodium(""); setProtein("");
    setDietary([]); setPhotoUrl(""); setDropdownOpen(false);
    setIsSeasonal(false);
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

            {/* ── Seasonal toggle ── */}
            <View style={modal.seasonalToggleRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <View style={[modal.dropdownDot, { backgroundColor: "#c2410c22" }]}>
                  <Feather name="star" size={15} color="#c2410c" />
                </View>
                <View>
                  <Text style={modal.seasonalToggleLabel}>Seasonal Meal</Text>
                  <Text style={modal.seasonalToggleSub}>Mark as a limited-time seasonal special</Text>
                </View>
              </View>
              <Switch
                value={isSeasonal}
                onValueChange={setIsSeasonal}
                trackColor={{ false: C.border, true: "#c2410c88" }}
                thumbColor={isSeasonal ? "#c2410c" : "#FFFFFF"}
              />
            </View>

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

            {/* ── Photo ── */}
            <Text style={modal.sectionLabel}>PHOTO</Text>
            {photoUrl.trim() ? (
              <View style={{ marginBottom: 14 }}>
                <Image source={{ uri: photoUrl.trim() }} style={modal.photoPreview} resizeMode="cover" />
                <TouchableOpacity
                  style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 14, width: 28, height: 28, alignItems: "center", justifyContent: "center" }}
                  onPress={() => setPhotoUrl("")}
                >
                  <Feather name="x" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={modal.photoPickerBtn}
                activeOpacity={0.7}
                onPress={() => pickImage((uri) => setPhotoUrl(uri))}
              >
                <View style={modal.photoPickerIcon}>
                  <Feather name="camera" size={26} color={C.primary} />
                </View>
                <Text style={modal.photoPickerTitle}>Tap to add a photo</Text>
                <Text style={modal.photoPickerSub}>Choose from your gallery</Text>
              </TouchableOpacity>
            )}

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
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <View style={msgPanel.avatar}>
                      <Feather name="user" size={14} color={C.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={msgPanel.residentName}>{msg.residentName}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {msg.residentRoom ? (
                          <Text style={msgPanel.room}>Room {msg.residentRoom}</Text>
                        ) : null}
                        {/* Extract order id from tag prefix if orderId field missing */}
                        {(() => {
                          const taggedId = msg.orderId ?? (msg.text.match(/^\[Order #(\d+)\]/)?.[1]);
                          if (!taggedId) return null;
                          return <Text style={msgPanel.orderIdPill}>Order #{taggedId}</Text>;
                        })()}
                      </View>
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


// ─── Tutorial / Guide Modal ────────────────────────────────────────────────────
const TUTORIAL_STEPS = [
  {
    id: "orders",
    icon: "clipboard",
    color: "#6B8E23",
    title: "Orders & Status",
    bullets: [
      "Summary cards at top show today's totals. Tap **Preparing**, **Ready**, or **Delivered** on each order to update it.",
    ],
  },
  {
    id: "menu",
    icon: "edit-3",
    color: "#2E86AB",
    title: "Add & Edit Meals",
    bullets: [
      "**Add Meal** creates a new item. **Manage Menu** lets you edit or delete existing ones. Toggle **Seasonal** for limited-time items.",
    ],
  },
  {
    id: "messages",
    icon: "message-circle",
    color: "#7B68EE",
    title: "Messages",
    bullets: [
      "**Messages** opens resident conversations. A **red dot** means unread. You can also reply directly from any order card.",
    ],
  },
];

const renderBoldText = (text: string, baseColor: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={{ fontSize: 16, color: baseColor, lineHeight: 23, flex: 1 }}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <Text key={i} style={{ fontWeight: "800", color: C.text }}>{part.slice(2, -2)}</Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
};

const SupportModal: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  const toggleStep = (id: string) => {
    setExpandedStep(expandedStep === id ? null : id);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={support.overlay}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }} keyboardShouldPersistTaps="handled">
          <View style={support.sheet}>
            <View style={support.header}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Feather name="book-open" size={20} color={C.primary} />
                <Text style={support.title}>Kitchen Guide</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={support.closeBtn}>
                <Feather name="x" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={support.subtitle}>
              Learn how to use the kitchen dashboard:
            </Text>

            {TUTORIAL_STEPS.map((step) => {
              const isOpen = expandedStep === step.id;
              return (
                <TouchableOpacity
                  key={step.id}
                  style={[support.templateCard, isOpen && { borderColor: step.color, borderWidth: 2 }]}
                  onPress={() => toggleStep(step.id)}
                  activeOpacity={0.75}
                >
                  <View style={[support.templateIcon, { backgroundColor: step.color + "20" }]}>
                    <Feather name={step.icon as any} size={22} color={step.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={support.templateTitle}>{step.title}</Text>
                      <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={C.textMuted} />
                    </View>
                    {isOpen && (
                      <View style={{ marginTop: 12 }}>
                        {step.bullets.map((b, i) => (
                          <View key={i} style={{ flexDirection: "row", marginBottom: 10, paddingRight: 8 }}>
                            <Text style={{ fontSize: 16, color: step.color, marginRight: 8, marginTop: 2 }}>{"\u2022"}</Text>
                            {renderBoldText(b, C.text)}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
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
  title: { fontSize: 22, fontWeight: "800", color: C.text },
  subtitle: { fontSize: 16, color: C.textMuted, marginBottom: 16 },
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
  templateTitle: { fontSize: 18, fontWeight: "700", color: C.text, marginBottom: 2 },
  templateDesc: { fontSize: 14, color: C.textMuted, lineHeight: 19 },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
const KitchenDashboardScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { messages, unreadCount, markRead, markAllRead, sendMessage } = useKitchenMessages();

  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [backendResidents, setBackendResidents] = useState<ApiResident[]>([]);

  const [seasonalMeals, setSeasonalMeals] = useState<SeasonalEntry[]>([]);
  const [showSeasonalModal, setShowSeasonalModal] = useState(false);
  const [showMessages, setShowMessages] = useState(false);    // kept for per-order inbox modal
  const [showSupport, setShowSupport] = useState(false);
  // Manage menu state
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [menuMeals, setMenuMeals] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuFilter, setMenuFilter] = useState<string>("All");
  // Edit meal state
  const [editingMeal, setEditingMeal] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPeriod, setEditPeriod] = useState<MealPeriod>("Breakfast");
  const [editCalories, setEditCalories] = useState("");
  const [editSodium, setEditSodium] = useState("");
  const [editProtein, setEditProtein] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editSeasonal, setEditSeasonal] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editAvailable, setEditAvailable] = useState(true);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [msgUnread, setMsgUnread] = useState(0);
  const [coverageAlerts, setCoverageAlerts] = useState<MealCoverageAlert[]>([]);

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

  // ── check for unread backend messages ──
  useEffect(() => {
    const checkUnread = async () => {
      try {
        const chats = await getChats();
        if (!Array.isArray(chats)) return;
        const me = await import("../../services/api").then(m => m.getMe());
        const myId = String(me.id);
        const count = chats.filter(c => !c.isRead && String(c.receiverId) === myId).length;
        setMsgUnread(count);
      } catch { /* ignore */ }
    };
    checkUnread();
    const iv = setInterval(checkUnread, 30000);
    return () => clearInterval(iv);
  }, []);

  const loadCoverageAlerts = useCallback(async () => {
    try {
      const alerts = await listCoverageAlertsApi();
      if (!Array.isArray(alerts)) {
        setCoverageAlerts([]);
        return;
      }
      const sorted = [...alerts].sort((a, b) => {
        const rank = (status: MealCoverageAlert["status"]) =>
          status === "ACTIVE" ? 0 : status === "ACKNOWLEDGED" ? 1 : 2;
        const byStatus = rank(a.status) - rank(b.status);
        if (byStatus !== 0) return byStatus;
        return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
      });
      setCoverageAlerts(sorted);
    } catch {
      setCoverageAlerts([]);
    }
  }, []);

  useEffect(() => {
    loadCoverageAlerts();
    const iv = setInterval(loadCoverageAlerts, 30000);
    return () => clearInterval(iv);
  }, [loadCoverageAlerts]);

  // ── STRICT resident lookup ──
  // Only match by backend user id. Previously we fell back to name / room,
  // which caused orders to show the WRONG resident's room number (false
  // positives where userId "20" matched a resident whose room was "20").
  // The backend is the source of truth — if the id isn't in the cache we
  // hydrate it on-demand below, and never guess.
  const findResident = useCallback((userId: string): ApiResident | undefined => {
    if (!userId) return undefined;
    const uid = String(userId).trim();
    return backendResidents.find((r) => String(r.id).trim() === uid);
  }, [backendResidents]);

  // ── on-demand hydration: fetch any resident referenced by an order
  // that isn't in the cache yet. Runs whenever orders or the cache changes.
  // Prevents "Resident unknown" flashes after a new resident is added in
  // admin but before the full list refresh runs.
  const hydratingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const known = new Set(backendResidents.map((r) => String(r.id).trim()));
    const missing = Array.from(
      new Set(
        orders
          .map((o) => String(o.order.userId ?? "").trim())
          .filter((uid) => uid && !known.has(uid) && !hydratingRef.current.has(uid)),
      ),
    );
    if (missing.length === 0) return;

    missing.forEach((uid) => hydratingRef.current.add(uid));
    (async () => {
      const fetched: ApiResident[] = [];
      for (const uid of missing) {
        try {
          const r = await getResidentById(uid);
          if (r) fetched.push(r);
        } catch { /* silently skip — will retry next orders refresh */ }
        hydratingRef.current.delete(uid);
      }
      if (fetched.length > 0) {
        setBackendResidents((prev) => {
          const byId = new Map(prev.map((r) => [String(r.id), r] as const));
          fetched.forEach((r) => byId.set(String(r.id), r));
          return Array.from(byId.values());
        });
      }
    })();
  }, [orders, backendResidents]);

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
    const today = formatLocalDate();
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
      setOrders(
        results
          .flat()
          .filter((item) => String(item?.order?.status ?? '').toLowerCase() !== 'cancelled')
      );
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
      const today = formatLocalDate();
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
          const today = formatLocalDate();
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

  const addSeasonalMeal = async (meal: Omit<SeasonalEntry, "id"> & {
    calories?: number; sodium?: number; protein?: number;
    imageUrl?: string; seasonal: boolean;
  }) => {
    // Determine mealtype from period
    const mealTypeMap: Record<string, string> = {
      Breakfast: "B", Lunch: "L", Dinner: "D", Sides: "Side", Drinks: "Beverage",
    };
    const timeRangeMap: Record<string, string> = {
      Breakfast: "7am - 10am", Lunch: "11am - 2pm", Dinner: "4pm - 7pm",
      Sides: "All Day", Drinks: "All Day",
    };

    try {
      const result = await createMeal({
        name: meal.name,
        description: meal.description,
        mealperiod: meal.period,
        mealtype: mealTypeMap[meal.period] || "L",
        calories: meal.calories,
        sodium: meal.sodium,
        protein: meal.protein,
        tags: meal.tag,
        available: true,
        seasonal: meal.seasonal,
        imageUrl: meal.imageUrl,
      });

      // Add to local state with backend ID
      const newId = result?.id ? String(result.id) : `meal_${Date.now()}`;
      setSeasonalMeals((prev) => [...prev, { ...meal, id: newId }]);
      Alert.alert("Meal Added", `"${meal.name}" has been added to the menu.`);
    } catch (e: any) {
      // Still add locally even if backend fails
      setSeasonalMeals((prev) => [...prev, { ...meal, id: `local_${Date.now()}` }]);
      Alert.alert("Added Locally", `"${meal.name}" was added locally but may not have saved to the database: ${e.message}`);
    }

    // Fire-and-forget: translate
    (async () => {
      try {
        const toTranslateNames: string[] = [];
        const toTranslateDescs: string[] = [];
        if (meal.name && !hasMealNameTranslation(meal.name)) {
          toTranslateNames.push(meal.name);
        }
        if (meal.description && !hasMealDescriptionTranslation(meal.description)) {
          toTranslateDescs.push(meal.description);
        }
        const [nameResults, descResults] = await Promise.all([
          toTranslateNames.length > 0
            ? translateMealNamesWithGemini(toTranslateNames)
            : Promise.resolve({}),
          toTranslateDescs.length > 0
            ? translateMealDescriptionsWithGemini(toTranslateDescs)
            : Promise.resolve({}),
        ]);
        if (Object.keys(nameResults).length > 0) setCachedMealTranslations(nameResults);
        if (Object.keys(descResults).length > 0) setCachedDescriptionTranslations(descResults);
      } catch { /* silent — translation is best-effort */ }
    })();
  };

  const removeSeasonalMeal = (id: string) => {
    setSeasonalMeals((prev) => prev.filter((m) => m.id !== id));
  };

  // Show all seasonal meals (no longer filtered by tab)
  const tabSeasonalMeals = seasonalMeals;

  // ── Manage Menu (load all meals from DB) ──
  const loadMenuMeals = async () => {
    setMenuLoading(true);
    try {
      const meals = await getAllMenuMeals();
      setMenuMeals(meals);
    } catch (e: any) {
      Alert.alert("Error", "Could not load menu: " + e.message);
    } finally {
      setMenuLoading(false);
    }
  };

  const handleDeleteMeal = (meal: any) => {
    Alert.alert(
      "Remove Meal",
      `Are you sure you want to remove "${meal.name}" from the menu?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMeal(Number(meal.id));
              setMenuMeals((prev) => prev.filter((m) => m.id !== meal.id));
              Alert.alert("Removed", `"${meal.name}" has been removed from the menu.`);
            } catch (e: any) {
              Alert.alert("Error", "Could not remove meal: " + e.message);
            }
          },
        },
      ]
    );
  };

  const openEditMeal = (meal: any) => {
    setEditingMeal(meal);
    setEditName(meal.name || "");
    setEditDesc(meal.description || "");
    const normalized = normalizePeriod(meal.mealperiod || meal.mealPeriod);
    const validPeriods: MealPeriod[] = ["Breakfast", "Lunch", "Dinner", "Sides", "Drinks"];
    setEditPeriod(validPeriods.includes(normalized as MealPeriod) ? normalized as MealPeriod : "Breakfast");
    setEditCalories(meal.calories ? String(meal.calories) : "");
    setEditSodium(meal.sodium ? String(meal.sodium) : "");
    setEditProtein(meal.protein ? String(meal.protein) : "");
    setEditTags(typeof meal.tags === "string" ? meal.tags : "");
    setEditSeasonal(Boolean(meal.seasonal || meal.isSeasonal));
    setEditImageUrl(meal.imageUrl || "");
    setEditAvailable(meal.available !== false);
  };

  const handleSaveEdit = async () => {
    if (!editingMeal) return;
    if (!editName.trim()) { Alert.alert("Required", "Meal name is required."); return; }
    try {
      await updateMeal(Number(editingMeal.id), {
        name: editName.trim(),
        description: editDesc.trim(),
        mealperiod: editPeriod,
        calories: editCalories ? Number(editCalories) : undefined,
        sodium: editSodium ? Number(editSodium) : undefined,
        protein: editProtein ? Number(editProtein) : undefined,
        tags: editTags.trim(),
        seasonal: editSeasonal,
        available: editAvailable,
        imageUrl: editImageUrl.trim(),
      });
      // Update local state
      setMenuMeals((prev) => prev.map((m) =>
        m.id === editingMeal.id
          ? { ...m, name: editName.trim(), description: editDesc.trim(), mealperiod: editPeriod, calories: editCalories ? Number(editCalories) : m.calories, sodium: editSodium ? Number(editSodium) : m.sodium, protein: editProtein ? Number(editProtein) : m.protein, tags: editTags.trim(), seasonal: editSeasonal, available: editAvailable, imageUrl: editImageUrl.trim() }
          : m
      ));
      setEditingMeal(null);
      Alert.alert("Saved", `"${editName.trim()}" has been updated.`);
    } catch (e: any) {
      Alert.alert("Error", "Could not update meal: " + e.message);
    }
  };

  // Inline quick-toggle for a meal's `available` flag. Optimistically flips
  // local state so the UI feels instant, then persists to the backend via
  // PUT /admin/menu/:id. Because residents' browseMealOptionsScreen filters
  // meals with `isAvailable !== false`, a successful persist here will hide
  // the meal on every resident's menu on their next fetch.
  const [togglingMealIds, setTogglingMealIds] = useState<Set<string | number>>(new Set());
  const handleToggleMealAvailability = async (meal: any) => {
    const id = meal.id;
    if (togglingMealIds.has(id)) return;
    const nextAvailable = meal.available === false; // flip
    // Optimistic update
    setMenuMeals((prev) => prev.map((m) => (m.id === id ? { ...m, available: nextAvailable } : m)));
    setTogglingMealIds((prev) => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });
    try {
      // Use the kitchen-scoped endpoint so ROLE_KITCHEN_STAFF doesn't 403
      // on the admin-only /admin/menu/:id PUT route.
      await setMealAvailability(Number(id), nextAvailable);
      loadCoverageAlerts();
    } catch (e: any) {
      // Revert on failure
      setMenuMeals((prev) => prev.map((m) => (m.id === id ? { ...m, available: !nextAvailable } : m)));
      Alert.alert("Error", "Could not update availability: " + (e?.message ?? "unknown"));
    } finally {
      setTogglingMealIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  };

  const filteredMenuMeals = menuFilter === "All"
    ? menuMeals
    : menuMeals.filter((m) => normalizePeriod(m.mealperiod || m.mealPeriod) === menuFilter);

  const coverageAlertsByPeriod = useMemo(() => {
    const grouped: Record<string, MealCoverageAlert[]> = Object.fromEntries(
      COVERAGE_ALERT_PERIODS.map((period) => [period, [] as MealCoverageAlert[]]),
    );
    for (const alert of coverageAlerts) {
      const period = alert.mealPeriod?.trim() || "";
      if (!grouped[period]) grouped[period] = [];
      grouped[period].push(alert);
    }
    return grouped;
  }, [coverageAlerts]);

  // ── send message to resident (per-order) ──
  const handleSendReply = (orderId: number) => {
    if (!replyText.trim()) return;
    const item = orders.find((o) => o.order.id === orderId);
    if (!item) return;
    const resident = findResident(item.order.userId);
    const roomStr = resident?.room ? ` (Room ${resident.room})` : "";
    // Prefer the resident record ID so caregiver filtering matches reliably.
    const ridForMsg = String(resident?.id ?? item.order.userId);
    // Safe display name — never leak raw userId into user-facing strings.
    const safeName = resident?.name?.trim() || "Resident";
    const safeRoom = resident?.room?.trim() || "—";
    const trimmed = replyText.trim();
    const isSubstitution = /^substitution/i.test(trimmed);
    const kitchenName = loggedInEmail ?? "Kitchen Staff";

    // Primary message to resident (also visible to caregiver via shared context)
    sendMessage({
      residentId: ridForMsg,
      residentName: safeName,
      residentRoom: resident?.room ?? "",
      orderId,
      fromRole: "kitchen",
      fromName: kitchenName,
      text: `[Order #${orderId}] ${isSubstitution ? '🔄 SUBSTITUTION · ' : ''}${trimmed}`,
      channel: 'order',
    });

    // Extra caregiver-facing alert for substitutions so the bell icon
    // pulses on the caregiver dashboard
    if (isSubstitution) {
      sendMessage({
        residentId: ridForMsg,
        residentName: safeName,
        residentRoom: resident?.room ?? "",
        orderId,
        fromRole: "kitchen",
        fromName: `Kitchen · ${kitchenName}`,
        text: `[Caregiver Alert] Substitution requested for Order #${orderId} (${safeName}, Room ${safeRoom}) at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${trimmed.replace(/^substitution[:\s]*/i, '').trim()}`,
        channel: 'order',
      });
    }

    Alert.alert("Sent", `Message sent for ${safeName}${roomStr} · Order #${orderId}.`);
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
          <TouchableOpacity style={[s.headerLabelBtn, { backgroundColor: "#E8F5E9", borderColor: "#81C784" }]} onPress={() => setShowSeasonalModal(true)}>
            <Feather name="plus-circle" size={18} color="#2E7D32" />
            <Text style={[s.headerLabelBtnText, { color: "#2E7D32" }]}>Add Meal</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.headerLabelBtn, { backgroundColor: C.primaryLight, borderColor: "#B5AE8C" }]} onPress={() => { setShowManageMenu(true); loadMenuMeals(); }}>
            <Feather name="book-open" size={18} color={C.primary} />
            <Text style={s.headerLabelBtnText}>Menu</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.headerLabelBtn, { backgroundColor: "#E3F2FD", borderColor: "#90CAF9" }]} onPress={() => setShowMessagesModal(true)}>
            <Feather name="message-square" size={18} color="#1565C0" />
            <Text style={[s.headerLabelBtnText, { color: "#1565C0" }]}>Messages</Text>
            {msgUnread > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeText}>{msgUnread > 9 ? "9+" : msgUnread}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[s.headerLabelBtn, { backgroundColor: "#FFF3E0", borderColor: "#FFB74D" }]} onPress={() => setShowSupport(true)}>
            <Feather name="book-open" size={18} color="#E65100" />
            <Text style={[s.headerLabelBtnText, { color: "#E65100" }]}>Guide</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.headerLabelBtn, s.logoutBtn]} onPress={handleLogout}>
            <Feather name="log-out" size={18} color={C.danger} />
            <Text style={[s.headerLabelBtnText, { color: C.danger }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary Cards ── */}
        <View style={s.summaryRow}>
          {[
            { label: "Total",     value: counts.total,     icon: "layers"        as const, color: C.primary  },
            { label: "Pending",   value: counts.pending,   icon: "clock"         as const, color: C.warning  },
            { label: "Preparing", value: counts.preparing, icon: "loader"        as const, color: C.danger   },
            { label: "Ready",     value: counts.ready,     icon: "check-circle"  as const, color: C.success  },
            { label: "Served",    value: counts.served,    icon: "check-square"  as const, color: "#0369A1"  },
          ].map(({ label, value, icon, color }) => (
            <View key={label} style={s.summaryCard}>
              <Feather name={icon} size={20} color={color} />
              <Text style={[s.summaryValue, { color }]}>{value}</Text>
              <Text style={s.summaryLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {coverageAlerts.length > 0 && (
          <View style={s.coverageBanner}>
            <View style={s.coverageBannerHeader}>
              <View style={s.coverageBannerTitleRow}>
                <View style={s.coverageBannerIcon}>
                  <Feather name="alert-triangle" size={18} color={C.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.coverageBannerTitle}>Meal coverage alerts</Text>
                  <Text style={s.coverageBannerSub}>
                    These residents currently have no safe meal in at least one served period.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.coverageBannerCta}
                onPress={() => navigation?.navigate("MealCoverageAlerts")}
              >
                <Text style={s.coverageBannerCtaText}>Open list</Text>
                <Feather name="chevron-right" size={15} color={C.warning} />
              </TouchableOpacity>
            </View>

            {COVERAGE_ALERT_PERIODS
              .filter((period) => (coverageAlertsByPeriod[period] ?? []).length > 0)
              .map((period) => {
                const alerts = coverageAlertsByPeriod[period] ?? [];
                const accent = PERIOD_ACCENT[period] ?? PERIOD_ACCENT.Breakfast;
                return (
                  <View key={period} style={s.coverageGroup}>
                    <View style={s.coverageGroupHeader}>
                      <View style={[s.coverageGroupPill, { backgroundColor: accent.light, borderColor: accent.color }]}>
                        <Feather name={accent.icon as any} size={12} color={accent.color} />
                        <Text style={[s.coverageGroupPillText, { color: accent.color }]}>{period}</Text>
                      </View>
                      <Text style={s.coverageGroupCount}>
                        {alerts.length} resident{alerts.length === 1 ? "" : "s"}
                      </Text>
                    </View>

                    <View style={s.coverageResidentRow}>
                      {alerts.map((alert) => {
                        const isActive = alert.status === "ACTIVE";
                        const residentLabel = alert.residentName || `Resident #${alert.residentId}`;
                        const roomLabel = alert.residentRoom ? `Room ${alert.residentRoom}` : "Room unknown";
                        return (
                          <View
                            key={alert.id}
                            style={[
                              s.coverageResidentChip,
                              isActive ? s.coverageResidentChipActive : s.coverageResidentChipAcked,
                            ]}
                          >
                            <Feather
                              name={isActive ? "alert-circle" : "eye"}
                              size={12}
                              color={isActive ? C.danger : C.warning}
                            />
                            <Text
                              style={[
                                s.coverageResidentText,
                                isActive ? s.coverageResidentTextActive : s.coverageResidentTextAcked,
                              ]}
                            >
                              {residentLabel}
                            </Text>
                            <Text style={s.coverageResidentRoom}>{roomLabel}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
          </View>
        )}

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
            const residentDisplayName = resident?.name?.trim() || "";
            const roomDisplay = resident?.room?.trim() || "—";
            const initials  = (resident?.name ?? "?").slice(0, 2).toUpperCase();
            const orderPeriod = item.order.mealOfDay || "Breakfast";
            const pa = PERIOD_ACCENT[orderPeriod] ?? PERIOD_ACCENT["Breakfast"];
            const rawOrderNote = item.order.note || item.order.specialInstructions || "";
            // Pre-order marker — set by the resident browse screen when ordering
            // breakfast after 7 PM the previous evening. Kitchen needs to queue
            // these for the NEXT morning's tray run, not today's batch.
            const isPreorderForTomorrow = /\[FOR TOMORROW'S BREAKFAST\]/i.test(rawOrderNote);
            // Strip the tag from the displayed note so it's not duplicated
            // (the banner above the note already conveys the meaning).
            const orderNote = rawOrderNote.replace(/\[FOR TOMORROW'S BREAKFAST\]\s*/i, "").trim();
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
                  {/* Prominent ROOM badge — source of truth is backend admin
                      roster, never the raw order userId. */}
                  <View style={[s.roomBadge, { backgroundColor: pa.light, borderColor: pa.color }]}>
                    <Text style={[s.roomBadgeLabel, { color: pa.color }]}>ROOM</Text>
                    <Text
                      style={[
                        s.roomBadgeNumber,
                        { color: pa.color },
                        roomDisplay === "—" && s.roomBadgeNumberPending,
                      ]}
                      numberOfLines={1}
                    >
                      {roomDisplay}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    {/* Resident name — only rendered once hydrated */}
                    {residentDisplayName ? (
                      <Text style={s.residentName} numberOfLines={1}>
                        {residentDisplayName}
                      </Text>
                    ) : null}
                    {/* Order # + period pill */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <View style={s.orderIdPill}>
                        <Feather name="hash" size={10} color={C.textMuted} />
                        <Text style={s.orderIdPillText}>Order {item.order.id}</Text>
                      </View>
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

                {/* ── "For tomorrow" banner (breakfast pre-orders placed the night before) ── */}
                {isPreorderForTomorrow && (
                  <View style={s.preorderBanner}>
                    <Feather name="sunrise" size={18} color="#FFFFFF" />
                    <Text style={s.preorderBannerText} numberOfLines={2}>
                      PRE-ORDER FOR TOMORROW&apos;S BREAKFAST · Serve 7:00–10:00 AM
                    </Text>
                  </View>
                )}

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
                              // Prefer the resident record ID so caregiver's
                              // `messages.filter(m => m.residentId === r.id)`
                              // reliably surfaces this alert.
                              const ridForMsg = String(resident?.id ?? item.order.userId);
                              const kitchenName = loggedInEmail ?? 'Kitchen Staff';
                              // 1) Notify resident (shown on their upcoming-meals screen)
                              sendMessage({
                                residentId: ridForMsg,
                                residentName: resident?.name?.trim() || 'Resident',
                                residentRoom: resident?.room ?? '',
                                orderId: item.order.id,
                                fromRole: 'kitchen',
                                fromName: kitchenName,
                                text: `[Order #${item.order.id}] ⛔ CANCELLED — Your ${orderPeriod.toLowerCase()} order has been cancelled by the kitchen. Please contact staff if you need assistance.`,
                                channel: 'order',
                              });
                              // 2) Caregiver-facing notification in the same
                              // channel. The caregiver dashboard groups
                              // kitchen messages by residentId, so a second
                              // explicit "FYI caregiver" entry surfaces
                              // prominently on their bell icon.
                              sendMessage({
                                residentId: ridForMsg,
                                residentName: resident?.name?.trim() || 'Resident',
                                residentRoom: resident?.room ?? '',
                                orderId: item.order.id,
                                fromRole: 'kitchen',
                                fromName: `Kitchen · ${kitchenName}`,
                                text: `[Caregiver Alert] Order #${item.order.id} for ${resident?.name?.trim() || 'resident'} (Room ${resident?.room?.trim() || '—'}) was CANCELLED by the kitchen at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
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

      {/* ── Backend Messages Modal ── */}
      <MessagesModal
        visible={showMessagesModal}
        onClose={() => { setShowMessagesModal(false); setMsgUnread(0); }}
      />

      {/* ── Manage Menu (Full-screen) ── */}
      <Modal visible={showManageMenu} animationType="slide">
        <SafeAreaView style={manageMenu.page}>
          {/* Header */}
          <View style={manageMenu.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Feather name="book-open" size={22} color={C.primary} />
              <Text style={manageMenu.title}>Menu</Text>
              <View style={manageMenu.countBadge}>
                <Text style={manageMenu.countBadgeText}>{filteredMenuMeals.length}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <TouchableOpacity onPress={loadMenuMeals} style={manageMenu.refreshBtn}>
                <Feather name="refresh-cw" size={16} color={C.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowManageMenu(false); setEditingMeal(null); }} style={manageMenu.closeBtn}>
                <Feather name="x" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Period filter tabs */}
          <View style={manageMenu.tabBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, alignItems: "center" }}>
              {[
                { key: "All", label: "All", icon: "grid" as const, color: C.primary },
                ...PERIOD_OPTIONS.map(o => ({ key: o.value, label: o.label, icon: o.icon, color: o.color })),
              ].map(({ key, label, icon, color }) => {
                const active = menuFilter === key;
                const count = key === "All" ? menuMeals.length : menuMeals.filter(m => normalizePeriod(m.mealperiod || m.mealPeriod) === key).length;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      manageMenu.tab,
                      { borderColor: color + "60", backgroundColor: color + "08" },
                      active && { backgroundColor: color + "20", borderColor: color, borderWidth: 2 },
                    ]}
                    onPress={() => setMenuFilter(key)}
                  >
                    <Feather name={icon} size={14} color={active ? color : color} />
                    <Text style={[manageMenu.tabText, { color }, active && { fontWeight: "800" }]}>{label}</Text>
                    <View style={[manageMenu.tabCount, { backgroundColor: color + "18" }, active && { backgroundColor: color + "30" }]}>
                      <Text style={[manageMenu.tabCountText, { color }]}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Meal list or Edit form */}
          {editingMeal ? (
            /* ── Edit Meal Form ── */
            <>
            <View style={manageMenu.editHeader}>
              <TouchableOpacity onPress={() => setEditingMeal(null)} style={manageMenu.backBtn}>
                <Feather name="arrow-left" size={20} color={C.primary} />
              </TouchableOpacity>
              <Text style={manageMenu.editTitle}>Edit Meal</Text>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

              <Text style={manageMenu.label}>Meal Name *</Text>
              <TextInput style={manageMenu.input} value={editName} onChangeText={setEditName} placeholder="Meal name" placeholderTextColor="#ABABAB" />

              <Text style={manageMenu.label}>Description</Text>
              <TextInput style={[manageMenu.input, { height: 80, textAlignVertical: "top" }]} value={editDesc} onChangeText={setEditDesc} placeholder="Description" placeholderTextColor="#ABABAB" multiline />

              <Text style={manageMenu.label}>Meal Period</Text>
              <View style={manageMenu.periodRow}>
                {PERIOD_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[manageMenu.periodChip, editPeriod === opt.value && { backgroundColor: opt.color + "20", borderColor: opt.color }]}
                    onPress={() => setEditPeriod(opt.value)}
                  >
                    <Feather name={opt.icon} size={13} color={editPeriod === opt.value ? opt.color : C.textMuted} />
                    <Text style={[manageMenu.periodChipText, editPeriod === opt.value && { color: opt.color, fontWeight: "700" }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={manageMenu.sectionLabel}>NUTRITION</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={manageMenu.label}>Calories</Text>
                  <TextInput style={manageMenu.input} value={editCalories} onChangeText={setEditCalories} placeholder="e.g. 320" placeholderTextColor="#ABABAB" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={manageMenu.label}>Sodium (mg)</Text>
                  <TextInput style={manageMenu.input} value={editSodium} onChangeText={setEditSodium} placeholder="e.g. 540" placeholderTextColor="#ABABAB" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={manageMenu.label}>Protein (g)</Text>
                  <TextInput style={manageMenu.input} value={editProtein} onChangeText={setEditProtein} placeholder="e.g. 22" placeholderTextColor="#ABABAB" keyboardType="numeric" />
                </View>
              </View>

              <Text style={manageMenu.label}>Tags</Text>
              <TextInput style={manageMenu.input} value={editTags} onChangeText={setEditTags} placeholder="e.g. Vegetarian, Low Sodium" placeholderTextColor="#ABABAB" />

              <Text style={manageMenu.label}>Photo</Text>
              {editImageUrl.trim() ? (
                <View style={{ marginBottom: 14 }}>
                  <Image source={{ uri: editImageUrl.trim() }} style={{ width: "100%", height: 160, borderRadius: 14, backgroundColor: C.inputBg }} resizeMode="cover" />
                  <TouchableOpacity
                    style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 14, width: 28, height: 28, alignItems: "center", justifyContent: "center" }}
                    onPress={() => setEditImageUrl("")}
                  >
                    <Feather name="x" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={{ borderWidth: 2, borderColor: C.border, borderStyle: "dashed", borderRadius: 14, paddingVertical: 24, alignItems: "center", marginBottom: 14, backgroundColor: C.inputBg }}
                  activeOpacity={0.7}
                  onPress={() => pickImage((uri) => setEditImageUrl(uri))}
                >
                  <Feather name="camera" size={24} color={C.primary} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: C.text, marginTop: 6 }}>Tap to add photo</Text>
                </TouchableOpacity>
              )}

              <View style={manageMenu.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={manageMenu.toggleLabel}>Seasonal</Text>
                  <Text style={manageMenu.toggleSub}>Limited-time special</Text>
                </View>
                <Switch value={editSeasonal} onValueChange={setEditSeasonal} trackColor={{ false: C.border, true: "#c2410c88" }} thumbColor={editSeasonal ? "#c2410c" : "#FFF"} />
              </View>

              <View style={manageMenu.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={manageMenu.toggleLabel}>Available</Text>
                  <Text style={manageMenu.toggleSub}>Show on resident menu</Text>
                </View>
                <Switch value={editAvailable} onValueChange={setEditAvailable} trackColor={{ false: C.border, true: C.primary + "88" }} thumbColor={editAvailable ? C.primary : "#FFF"} />
              </View>

              <TouchableOpacity style={manageMenu.saveBtn} onPress={handleSaveEdit}>
                <Feather name="check" size={18} color="#FFF" />
                <Text style={manageMenu.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
            </>
          ) : menuLoading ? (
            <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 60 }} />
          ) : filteredMenuMeals.length === 0 ? (
            <View style={manageMenu.empty}>
              <Feather name="inbox" size={40} color={C.border} />
              <Text style={manageMenu.emptyText}>
                {menuFilter === "All" ? "No meals in the database" : `No ${menuFilter} meals`}
              </Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              {filteredMenuMeals.map((meal) => {
                const rawPeriod = meal.mealperiod || meal.mealPeriod || "";
                const period = normalizePeriod(rawPeriod);
                const pColor = getPeriodColor(period);
                const localImg = getMealImage(meal.name);
                const imgUrl = meal.imageUrl?.trim();
                const placeholder = getMealPlaceholder(meal.name);
                return (
                  <TouchableOpacity key={meal.id} style={manageMenu.mealRow} onPress={() => openEditMeal(meal)} activeOpacity={0.7}>
                    {/* Image */}
                    {localImg ? (
                      <Image source={localImg} style={manageMenu.mealImg} resizeMode="cover" />
                    ) : imgUrl ? (
                      <Image source={{ uri: imgUrl }} style={manageMenu.mealImg} resizeMode="cover" />
                    ) : (
                      <View style={[manageMenu.mealImgPlaceholder, { backgroundColor: placeholder.bg }]}>
                        <Text style={{ fontSize: 28 }}>{placeholder.emoji}</Text>
                      </View>
                    )}

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={manageMenu.mealName}>{meal.name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                        <View style={[manageMenu.periodPill, { backgroundColor: pColor + "20", borderColor: pColor + "40" }]}>
                          <Text style={[manageMenu.periodPillText, { color: pColor }]}>{period}</Text>
                        </View>
                        {(meal.seasonal || meal.isSeasonal) && (
                          <View style={manageMenu.seasonalBadge}>
                            <Feather name="star" size={10} color="#c2410c" />
                            <Text style={manageMenu.seasonalBadgeText}>Seasonal</Text>
                          </View>
                        )}
                        {meal.available === false && (
                          <View style={manageMenu.unavailBadge}>
                            <Text style={manageMenu.unavailBadgeText}>Hidden</Text>
                          </View>
                        )}
                      </View>
                      {meal.description ? (
                        <Text style={manageMenu.mealDesc} numberOfLines={2}>{meal.description}</Text>
                      ) : null}
                      <View style={{ flexDirection: "row", gap: 10, marginTop: 6, alignItems: "center" }}>
                        {(meal.calories != null && meal.calories > 0) && (
                          <View style={manageMenu.calBadge}>
                            <Feather name="zap" size={11} color="#b45309" />
                            <Text style={manageMenu.calBadgeText}>{meal.calories} cal</Text>
                          </View>
                        )}
                        {meal.tags ? (
                          <Text style={manageMenu.mealStat} numberOfLines={1}>{typeof meal.tags === "string" ? meal.tags : ""}</Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Action buttons — availability toggle + edit + delete.
                        All three share the 40x40 rounded-square shape so they
                        read as a single cohesive control column. */}
                    <View style={manageMenu.actionCol}>
                      <TouchableOpacity
                        style={[
                          manageMenu.availBtn,
                          meal.available === false && manageMenu.availBtnOff,
                          togglingMealIds.has(meal.id) && { opacity: 0.6 },
                        ]}
                        onPress={() => handleToggleMealAvailability(meal)}
                        activeOpacity={0.7}
                        accessibilityLabel={meal.available === false ? "Make meal available" : "Hide meal from residents"}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: meal.available !== false }}
                      >
                        <Feather
                          name={meal.available === false ? "eye-off" : "eye"}
                          size={16}
                          color={meal.available === false ? C.textMuted : C.primary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity style={manageMenu.editBtn} onPress={() => openEditMeal(meal)}>
                        <Feather name="edit-2" size={16} color={C.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={manageMenu.deleteBtn} onPress={() => handleDeleteMeal(meal)}>
                        <Feather name="trash-2" size={16} color={C.danger} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

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
    fontSize: 15,
    color: C.textMuted,
    marginTop: 3,
    fontWeight: "500",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLabelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(113,118,68,0.22)",
    shadowColor: "#717644",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    position: "relative" as const,
  },
  headerLabelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.primary,
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
    top: -4,
    right: -4,
    backgroundColor: C.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  bellBadgeText: {
    fontSize: 10,
    fontWeight: "800",
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
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  summaryLabel: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: "600",
  },

  coverageBanner: {
    backgroundColor: "#FFF9ED",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F6D78B",
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  coverageBannerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  coverageBannerTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  coverageBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  coverageBannerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
  },
  coverageBannerSub: {
    fontSize: 13,
    lineHeight: 18,
    color: "#7C5A12",
    marginTop: 3,
  },
  coverageBannerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#FFF3D6",
    borderWidth: 1,
    borderColor: "#F0C86B",
  },
  coverageBannerCtaText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.warning,
  },
  coverageGroup: {
    gap: 10,
  },
  coverageGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  coverageGroupPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  coverageGroupPillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  coverageGroupCount: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textMuted,
  },
  coverageResidentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  coverageResidentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  coverageResidentChipActive: {
    backgroundColor: C.dangerBg,
    borderColor: "#F7B5B5",
  },
  coverageResidentChipAcked: {
    backgroundColor: "#FFF3D6",
    borderColor: "#F0C86B",
  },
  coverageResidentText: {
    fontSize: 13,
    fontWeight: "700",
  },
  coverageResidentTextActive: {
    color: "#8B1E1E",
  },
  coverageResidentTextAcked: {
    color: "#8A5A00",
  },
  coverageResidentRoom: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "600",
  },

  // Section title
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
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
  // Prominent ROOM badge — labelled, rectangular, easy to read from a few feet
  // away at the cook's station. Color comes from the meal-period accent.
  roomBadge: {
    minWidth: 56,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  roomBadgeLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    opacity: 0.85,
  },
  roomBadgeNumber: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
    marginTop: 1,
  },
  roomBadgeNumberPending: {
    fontSize: 16,
    opacity: 0.6,
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
  // Clean bordered chip for the order number so it reads as a distinct
  // piece of info, not a stray caption.
  orderIdPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  orderIdPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 0.3,
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
  // Loud amber banner on orders pre-placed the night before — kitchen queues
  // these for tomorrow morning's tray run, NOT today's.
  preorderBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#D97706",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
  },
  preorderBannerText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
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
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
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
    fontSize: 16,
    color: C.text,
    fontWeight: "600",
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
    fontSize: 15,
    color: C.textMuted,
    fontWeight: "500",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.primary,
    paddingVertical: 17,
    borderRadius: 16,
    marginTop: 26,
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  addBtnText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFF",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 10,
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
    gap: 5,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.inputBg,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipText: {
    fontSize: 14,
    color: C.textMuted,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#FFF",
    fontWeight: "700",
  },
  seasonalToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 16,
  },
  seasonalToggleLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
  },
  seasonalToggleSub: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 1,
  },
  photoPreview: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    backgroundColor: C.inputBg,
  },
  photoPickerBtn: {
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: C.inputBg,
  },
  photoPickerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  photoPickerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 3,
  },
  photoPickerSub: {
    fontSize: 13,
    color: C.textMuted,
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
    fontWeight: "600",
  },
  orderIdPill: {
    fontSize: 11,
    fontWeight: "700",
    color: C.primary,
    backgroundColor: C.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.warmBorder,
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

// ─── Manage Menu Styles ───────────────────────────────────────────────────────
const manageMenu = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: C.text,
  },
  countBadge: {
    backgroundColor: C.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontSize: 15,
    fontWeight: "800",
    color: C.primary,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  // Tabs
  tabBar: {
    backgroundColor: C.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
    marginRight: 8,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textMuted,
  },
  tabCount: {
    backgroundColor: C.inputBg,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  tabCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textMuted,
  },
  // Meal list
  mealImg: {
    width: 80,
    height: 80,
    borderRadius: 14,
    marginRight: 14,
  },
  mealImgPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 14,
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: C.textMuted,
    fontWeight: "600",
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  mealName: {
    fontSize: 19,
    fontWeight: "800",
    color: C.text,
  },
  mealDesc: {
    fontSize: 15,
    color: C.textMuted,
    marginTop: 5,
    lineHeight: 21,
  },
  mealStat: {
    fontSize: 14,
    color: C.textMuted,
    fontWeight: "600",
  },
  periodPill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  periodPillText: {
    fontSize: 13,
    fontWeight: "800",
  },
  calBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF8E1",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  calBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b45309",
  },
  seasonalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#c2410c15",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  seasonalBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#c2410c",
  },
  unavailBadge: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unavailBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.danger,
  },
  // Vertical action stack on each meal row. Tight gap so the three 40x40
  // squares read as one control.
  actionCol: {
    alignItems: "center",
    gap: 6,
    marginLeft: 4,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D8D5C0",
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.dangerBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  // Availability quick-toggle — matches editBtn sizing so it blends with the
  // rest of the action column. Green-ish (primaryLight) when available,
  // neutral muted when hidden.
  availBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D8D5C0",
  },
  availBtnOff: {
    backgroundColor: C.inputBg,
    borderColor: C.border,
  },
  // Edit form
  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  editTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 6,
    marginTop: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.text,
  },
  periodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  periodChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  periodChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textMuted,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.inputBg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 14,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
  },
  toggleSub: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 1,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.primary,
    paddingVertical: 17,
    borderRadius: 16,
    marginTop: 26,
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFF",
  },
});

export default KitchenDashboardScreen;
