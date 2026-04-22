// src/screens/caregiver/caregiverDashboardScreen.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import {
  Resident,
  KitchenNotification,
  getCaregiverResidents,
  getCaregiverNotifications,
} from "../../services/api";
import { useKitchenMessages } from "../context/KitchenMessageContext";
import MessagesModal from "../components/messaging/MessagesModal";
import { getChats, getMe, sendMessage, searchOrdersApi, deleteOrderApi } from "../../services/api";
import InAppNotificationBanner from "../components/InAppNotificationBanner";
import { getCaregiverResidentList } from "../../services/storage";

const grandmaLogo = require("../../styles/pictures/grandma.png");

// Demo residents shown when backend is unreachable (Render down / offline).
// Same spirit as MOCK_USERS in loginScreen: keep the app usable.
const DEMO_RESIDENTS: Resident[] = [
  {
    id: "demo-1",
    name: "Wendy Arenas",
    room: "204",
    dietaryRestrictions: ["Low sodium"],
    foodAllergies: ["Peanuts"],
    medicalConditions: [],
    medications: [],
    caregiverId: null,
  },
  {
    id: "demo-2",
    name: "Harold Jensen",
    room: "112",
    dietaryRestrictions: ["Diabetic"],
    foodAllergies: [],
    medicalConditions: [],
    medications: [],
    caregiverId: null,
  },
  {
    id: "demo-3",
    name: "Margaret O\u2019Neil",
    room: "307",
    dietaryRestrictions: ["Soft foods"],
    foodAllergies: ["Shellfish"],
    medicalConditions: [],
    medications: [],
    caregiverId: null,
  },
];

interface CaregiverDashboardProps {
  navigation: any;
}

export default function CaregiverDashboardScreen({
  navigation,
}: CaregiverDashboardProps) {
  // Kitchen messages from context (sent by kitchen staff per order)
  const { messages: kitchenMessages, unreadCount: kitchenUnread } = useKitchenMessages();

  // Backend messages modal
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [msgUnread, setMsgUnread] = useState(0);

  // In-app notification banner state
  const [bannerVisible,    setBannerVisible]    = useState(false);
  const [bannerSender,     setBannerSender]     = useState("");
  const [bannerPreview,    setBannerPreview]    = useState("");

  // Track last-seen unread count so we only fire banner on genuinely new messages
  const lastUnreadRef = useRef<number | null>(null);

  useEffect(() => {
    let myIdCache: string | null = null;

    const checkUnread = async () => {
      try {
        const chats = await getChats();
        if (!Array.isArray(chats)) return;

        if (!myIdCache) {
          const me = await getMe();
          myIdCache = String(me.id);
        }

        // Only count messages where I am the receiver and they are unread
        const unreadChats = chats.filter(
          c => !c.isRead && String(c.receiverId) === myIdCache
        );
        const count = unreadChats.length;
        setMsgUnread(count);

        // Show banner if unread count has increased since last poll
        if (lastUnreadRef.current !== null && count > lastUnreadRef.current) {
          const newest = unreadChats.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          if (newest) {
            const content = newest.content || "";
            const isAutoOrder = content.includes("Auto-order placed") || content.includes("placed an order");

            if (isAutoOrder) {
              // Show accept/deny alert for auto-placed orders
              Alert.alert(
                "New Order",
                `${newest.senderName || "A resident"}: ${content}`,
                [
                  {
                    text: "Deny",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        // Reply to resident that order was denied
                        await sendMessage(newest.senderId, "Your auto-placed order has been reviewed and cancelled by your caregiver. Please place a new order manually.");
                        Alert.alert("Order Denied", "The resident has been notified.");
                      } catch { /* ignore */ }
                    },
                  },
                  {
                    text: "Accept",
                    style: "default",
                    onPress: async () => {
                      try {
                        await sendMessage(newest.senderId, "Your order has been confirmed by your caregiver!");
                        Alert.alert("Order Accepted", "The resident has been notified.");
                      } catch { /* ignore */ }
                    },
                  },
                ]
              );
            } else {
              setBannerSender(newest.senderName || "A resident");
              setBannerPreview(content || "Sent you a message");
              setBannerVisible(true);
            }
          }
        }

        lastUnreadRef.current = count;
      } catch { /* ignore */ }
    };

    checkUnread();
    const iv = setInterval(checkUnread, 10000); // poll every 10s
    return () => clearInterval(iv);
  }, []);

  // -----------------------------
  // Main screen state
  // -----------------------------

  // Residents assigned to the logged-in caregiver
  const [residents, setResidents] = useState<Resident[]>([]);

  // Notifications related to the caregiver's assigned residents
  const [notifications, setNotifications] = useState<KitchenNotification[]>([]);


  // Inbox (view messages) modal state

  // Loading spinner for initial page fetch
  const [loading, setLoading] = useState(true);

  // Inline retry banner shown when backend is unreachable (Render cold start)
  const [loadError, setLoadError] = useState<string | null>(null);

  // True when we're rendering DEMO_RESIDENTS because the backend is down
  const [isDemo, setIsDemo] = useState(false);

  // Selected resident for the popup modal
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);

  // Controls resident detail popup
  const [showResidentModal, setShowResidentModal] = useState(false);

  // -----------------------------
  // Initial data load
  //   - Auto-retries the backend once on "Network request failed" (Render
  //     free tier sleeps after 15 min of idle; first request after wake
  //     fails immediately while the server boots — a short delay lets it
  //     come up, then the retry usually succeeds).
  //   - Surfaces a Retry button (inline banner + alert) when backend is
  //     unreachable, instead of silently leaving the user with an empty
  //     dashboard.
  // -----------------------------
  const loadDashboard = React.useCallback(async () => {
    const isNetErr = (err: any) => err?.message === "Network request failed";

    // Retry wrapper: up to 3 attempts with 4s / 8s backoff for cold-start /
    // slow Render wake-up. Total worst case ~12s before we give up and
    // drop into demo mode.
    const callWithRetry = async <T,>(fn: () => Promise<T>): Promise<T> => {
      const delays = [4000, 8000];
      let lastErr: any;
      for (let i = 0; i <= delays.length; i++) {
        try {
          return await fn();
        } catch (e: any) {
          lastErr = e;
          if (!isNetErr(e) || i === delays.length) break;
          await new Promise((r) => setTimeout(r, delays[i]));
        }
      }
      throw lastErr;
    };

    try {
      setLoading(true);
      setLoadError(null);
      setIsDemo(false);

      // Get my ID for storage lookups
      let myId: string | null = null;
      try {
        const me = await callWithRetry(() => getMe());
        myId = String(me.id);
      } catch (e) {
        console.warn("[CaregiverDashboard] getMe failed:", e);
      }

      // Fetch from all sources in parallel (each with cold-start retry)
      const [backendResult, storedResult, notifResult] = await Promise.allSettled([
        callWithRetry(() => getCaregiverResidents()),
        myId ? getCaregiverResidentList(myId) : Promise.resolve([]),
        callWithRetry(() => getCaregiverNotifications()),
      ]);

      const backendList: Resident[] =
        backendResult.status === "fulfilled" ? backendResult.value ?? [] : [];

      console.log("[CaregiverDashboard] Backend returned", backendList.length, "residents");

      // Merge storage residents with backend list (dedup by id)
      const storedList =
        storedResult.status === "fulfilled" ? storedResult.value : [];
      const mergedMap = new Map<string, Resident>();
      for (const r of backendList) mergedMap.set(r.id, r);
      for (const s of storedList) {
        if (!mergedMap.has(s.id)) {
          mergedMap.set(s.id, {
            id: s.id,
            name: s.name,
            room: s.room,
            dietaryRestrictions: s.dietaryRestrictions,
            foodAllergies: s.foodAllergies,
            medicalConditions: [],
            medications: [],
            caregiverId: myId,
          });
        }
      }

      const notifData: KitchenNotification[] =
        notifResult.status === "fulfilled" ? notifResult.value ?? [] : [];

      // If the backend-residents call failed with a network error AND we
      // have nothing from storage to fall back on, drop into demo mode so
      // the dashboard is still usable while the server is down.
      const backendFailedNet =
        backendResult.status === "rejected" && isNetErr(backendResult.reason);
      if (backendFailedNet && mergedMap.size === 0) {
        setResidents(DEMO_RESIDENTS);
        setNotifications([]);
        setIsDemo(true);
        setLoadError("Server unreachable — showing demo residents. Tap Retry to try again.");
      } else {
        setResidents([...mergedMap.values()]);
        setNotifications(notifData);
      }
    } catch (e: any) {
      console.warn("[CaregiverDashboard] loadDashboard error:", e);
      if (isNetErr(e)) {
        setResidents(DEMO_RESIDENTS);
        setNotifications([]);
        setIsDemo(true);
        setLoadError("Server unreachable — showing demo residents. Tap Retry to try again.");
      } else {
        setLoadError(e?.message ?? "Request failed.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // -----------------------------
  // Small stat cards data
  // -----------------------------
  const stats = useMemo(() => {
    return {
      assignedResidents: residents.length,
      activeAlerts: notifications.filter((n) => !n.read).length + kitchenUnread,
    };
  }, [residents, notifications, kitchenUnread]);

  // -----------------------------
  // Group notifications by residentId
  // This makes it easy to:
  // - show a red dot on the bell
  // - show notifications only for that resident
  // -----------------------------
  const notificationsByResident = useMemo(() => {
    const map: Record<string, KitchenNotification[]> = {};

    for (const notif of notifications) {
      const residentId = String(notif.residentId);
      if (!map[residentId]) {
        map[residentId] = [];
      }
      map[residentId].push(notif);
    }

    return map;
  }, [notifications]);

  // -----------------------------
  // Open resident details popup
  // -----------------------------
  const openResidentModal = (resident: Resident) => {
    setSelectedResident(resident);
    setShowResidentModal(true);
  };

  const closeResidentModal = () => {
    setShowResidentModal(false);
    setSelectedResident(null);
  };

  // Kitchen messages grouped by resident
  const kitchenMessagesByResident = useMemo(() => {
    const map: Record<string, typeof kitchenMessages> = {};
    for (const msg of kitchenMessages) {
      const residentId = String(msg.residentId ?? "").trim();
      if (!residentId) continue;
      if (!map[residentId]) map[residentId] = [];
      map[residentId].push(msg);
    }
    return map;
  }, [kitchenMessages]);

  // -----------------------------
  // Bell icon click:
  // show all notifications + kitchen messages for that resident
  // -----------------------------
  const handleNotificationPress = (residentId: string) => {
    const residentNotifications = notificationsByResident[residentId] || [];
    const residentKitchenMsgs = kitchenMessagesByResident[residentId] || [];

    const allLines = [
      ...residentNotifications.map((n) => `• ${n.message}`),
      ...residentKitchenMsgs.map((m) => `🍳 Kitchen${m.orderId != null ? ` · Order #${m.orderId}` : ""}: ${m.text}`),
    ];

    if (!allLines.length) {
      Alert.alert("Notifications", "No updates for this resident yet.");
      return;
    }

    Alert.alert("Resident Updates", allLines.join("\n"));
  };

  // -----------------------------
  // Browse meals for selected resident
  // Uses your actual route name from App.tsx:
  // "BrowseMealOptions"
  // -----------------------------
  const handleBrowseMeals = (resident: Resident) => {
    closeResidentModal();

    navigation.navigate("BrowseMealOptions", {
      residentId: resident.id,
      residentName: resident.name,
      dietaryRestrictions: resident.dietaryRestrictions ?? [],
      foodAllergies: resident.foodAllergies ?? [],
    });
  };

  return (
    <SafeAreaView style={styles.page}>
      {/* In-app notification banner — fires when resident sends a new message */}
      <InAppNotificationBanner
        visible={bannerVisible}
        senderName={bannerSender}
        preview={bannerPreview}
        onPress={() => { setShowMessagesModal(true); setMsgUnread(0); }}
        onDismiss={() => setBannerVisible(false)}
      />
      <StatusBar barStyle="dark-content" />

      {/* -----------------------------
          Header / top bar
         ----------------------------- */}
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Image source={grandmaLogo} style={styles.logo} resizeMode="contain" />
          <View>
            <Text style={styles.brandTitle}>TrayMate</Text>
            <Text style={styles.brandSub}>Caregiver Portal</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          {/* Backend messages */}
          <Pressable style={styles.chatIconBtn} onPress={() => setShowMessagesModal(true)}>
            <Feather name="message-square" size={16} color="#6D6B3B" />
            <Text style={styles.chatIconBtnText}>Messages</Text>
            {msgUnread > 0 && (
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>
                  {msgUnread > 9 ? "9+" : msgUnread}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Kitchen messages bell */}
          {kitchenUnread > 0 && (
            <View style={styles.kitchenAlertBadge}>
              <Feather name="bell" size={16} color="#DC2626" />
              <View style={styles.kitchenAlertCount}>
                <Text style={styles.kitchenAlertCountText}>
                  {kitchenUnread > 9 ? "9+" : kitchenUnread}
                </Text>
              </View>
            </View>
          )}
          <Pressable
            style={styles.logoutBtn}
            onPress={() => navigation.replace("Login")}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      {/* -----------------------------
          Loading state
         ----------------------------- */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#6D6B3B" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {/* Inline retry banner — backend unreachable (e.g. Render cold start) */}
          {loadError && (
            <View style={styles.errorBanner}>
              <Feather name="wifi-off" size={18} color="#B45309" />
              <Text style={styles.errorBannerText}>{loadError}</Text>
              <Pressable style={styles.errorBannerBtn} onPress={() => loadDashboard()}>
                <Text style={styles.errorBannerBtnText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* Page intro */}
          <Text style={styles.h1}>My Assigned Residents</Text>
          <Text style={styles.subtitle}>
            Review resident details, check food-related needs, and open meal
            ordering for assigned residents.
          </Text>

          {/* -----------------------------
              Stats row
             ----------------------------- */}
          <View style={styles.statsRow}>
            <StatCard
              icon="👥"
              label="Assigned Residents"
              value={stats.assignedResidents}
              border="#D7D0A8"
              iconBg="#6D6B3B"
            />
            <StatCard
              icon="🔔"
              label="Active Alerts"
              value={stats.activeAlerts}
              border="#F2D57E"
              iconBg="#D87000"
            />
          </View>

          {/* -----------------------------
              Residents section
             ----------------------------- */}
          <SectionCard title="Resident Overview">
            {!residents.length ? (
              <Text style={styles.emptyText}>
                No residents are currently assigned to this caregiver.
              </Text>
            ) : (
              <View style={styles.grid}>
                {residents.map((resident, idx) => {
                  const residentNotifications =
                    notificationsByResident[resident.id] || [];
                  const residentKitchenMsgs =
                    kitchenMessagesByResident[resident.id] || [];
                  const unreadKitchen = residentKitchenMsgs.filter((m) => !m.read).length;
                  const hasNotifications = residentNotifications.length > 0 || residentKitchenMsgs.length > 0;
                  const hasUrgent = unreadKitchen > 0;

                  return (
                    <Pressable
                      key={resident.id || `resident-${idx}`}
                      style={styles.residentCard}
                      onPress={() => openResidentModal(resident)}
                    >
                      {/* Notification bell at top-right of resident card */}
                      <Pressable
                        style={[
                          styles.cardBell,
                          hasUrgent && styles.cardBellUrgent,
                        ]}
                        onPress={() => handleNotificationPress(resident.id)}
                        hitSlop={10}
                      >
                        <Feather name="bell" size={18} color={hasUrgent ? "#DC2626" : "#6D6B3B"} />
                        {hasNotifications && <View style={[styles.notificationDot, hasUrgent && styles.notificationDotUrgent]} />}
                      </Pressable>

                      {/* Room badge */}
                      <View style={styles.roomBadge}>
                        <Text style={styles.roomLabel}>Room</Text>
                        <Text style={styles.roomValue}>
                          {resident.room || "--"}
                        </Text>
                      </View>

                      {/* Resident main info */}
                      <View style={styles.residentContent}>
                        <View style={styles.residentNameRow}>
                          <Feather name="user" size={16} color="#1A1A1A" />
                          <Text style={styles.residentName}>{resident.name}</Text>
                        </View>

                        {/* Dietary restrictions preview */}
                        <Text style={styles.infoLabel}>Dietary Restrictions</Text>
                        <View style={styles.chipRow}>
                          {(resident.dietaryRestrictions ?? []).length ? (
                            resident.dietaryRestrictions.map((item, i) => (
                              <View key={`${resident.id}-diet-${i}`} style={styles.dietChip}>
                                <Text style={styles.dietChipText}>{item}</Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.mutedText}>None listed</Text>
                          )}
                        </View>

                        {/* Food allergies preview */}
                        <Text style={styles.infoLabel}>Food Allergies</Text>
                        <View style={styles.chipRow}>
                          {(resident.foodAllergies ?? []).length ? (
                            resident.foodAllergies.map((item, i) => (
                              <View key={`${resident.id}-allergy-${i}`} style={styles.allergyChip}>
                                <Text style={styles.allergyChipText}>{item}</Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.mutedText}>None listed</Text>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </SectionCard>
        </ScrollView>
      )}

      {/* -----------------------------
          Resident detail popup modal
          Uses the REAL resident fields collected in AddResidentModal:
          - dietaryRestrictions
          - medicalConditions
          - foodAllergies
          - medications
         ----------------------------- */}
      <Modal visible={showResidentModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.detailModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {selectedResident?.name ?? "Resident"}
                </Text>
                <Text style={styles.modalSubTitle}>
                  Room {selectedResident?.room ?? "--"}
                </Text>
              </View>

              <Pressable onPress={closeResidentModal} hitSlop={10}>
                <Feather name="x" size={22} color="#111827" />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: 420 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Dietary Restrictions */}
              <Text style={styles.detailSectionTitle}>Dietary Restrictions</Text>
              <View style={styles.chipRow}>
                {(selectedResident?.dietaryRestrictions ?? []).length ? (
                  selectedResident!.dietaryRestrictions.map((item, i) => (
                    <View key={`modal-diet-${i}`} style={styles.dietChip}>
                      <Text style={styles.dietChipText}>{item}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.mutedText}>None listed</Text>
                )}
              </View>

              {/* Medical Conditions */}
              <Text style={styles.detailSectionTitle}>Medical Conditions</Text>
              <View style={styles.chipRow}>
                {(selectedResident?.medicalConditions ?? []).length ? (
                  selectedResident!.medicalConditions.map((item, i) => (
                    <View key={`modal-medical-${i}`} style={styles.medicalChip}>
                      <Text style={styles.medicalChipText}>{item}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.mutedText}>None listed</Text>
                )}
              </View>

              {/* Food Allergies */}
              <Text style={styles.detailSectionTitle}>Food Allergies</Text>
              <View style={styles.chipRow}>
                {(selectedResident?.foodAllergies ?? []).length ? (
                  selectedResident!.foodAllergies.map((item, i) => (
                    <View key={`modal-allergy-${i}`} style={styles.allergyChip}>
                      <Text style={styles.allergyChipText}>{item}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.mutedText}>None listed</Text>
                )}
              </View>

              {/* Medications */}
              <Text style={styles.detailSectionTitle}>Medications</Text>
              <View style={styles.chipRow}>
                {(selectedResident?.medications ?? []).length ? (
                  selectedResident!.medications.map((item, i) => (
                    <View key={`modal-medication-${i}`} style={styles.medicationChip}>
                      <Text style={styles.medicationChipText}>{item}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.mutedText}>None listed</Text>
                )}
              </View>
            </ScrollView>

            {/* Action buttons */}
            {selectedResident && (
              <>
                <Pressable
                  style={styles.modalPrimaryBtn}
                  onPress={() => handleBrowseMeals(selectedResident)}
                >
                  <View style={styles.modalBtnRow}>
                    <Feather name="shopping-cart" size={16} color="#FFFFFF" />
                    <Text style={styles.modalPrimaryText}>
                      Browse Meals & Place Order
                    </Text>
                  </View>
                </Pressable>

              </>
            )}

            <Pressable onPress={closeResidentModal}>
              <Text style={styles.modalCancel}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Backend Messages Modal */}
      <MessagesModal
        visible={showMessagesModal}
        onClose={() => { setShowMessagesModal(false); setMsgUnread(0); }}
      />

    </SafeAreaView>
  );
}

/* -----------------------------
   Small reusable section card
----------------------------- */
function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ marginTop: 14 }}>{children}</View>
    </View>
  );
}

/* -----------------------------
   Small reusable stat card
----------------------------- */
function StatCard({
  icon,
  label,
  value,
  border,
  iconBg,
}: {
  icon: string;
  label: string;
  value: number;
  border: string;
  iconBg: string;
}) {
  return (
    <View style={[styles.statCard, { borderColor: border }]}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Text style={styles.statIconText}>{icon}</Text>
      </View>
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#DCD3B8",
  },

  // Header
  topBar: {
    height: 74,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E7E2D6",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 6,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1C1C1C",
  },
  brandSub: {
    fontSize: 12,
    color: "#6F6F6F",
    marginTop: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E53935',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  chatIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F0EEE4',
    borderWidth: 1.5,
    borderColor: '#6D6B3B30',
  },
  chatIconBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D6B3B',
  },
  chatBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  chatBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  kitchenAlertBadge: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  kitchenAlertCount: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  kitchenAlertCountText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
  },
  logoutBtn: {
    height: 44,
    minWidth: 110,
    borderWidth: 1,
    borderColor: "#A7A07F",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontWeight: "800",
    color: "#3C3C3C",
    fontSize: 14,
  },

  // Loading
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#5A5A5A",
    fontWeight: "700",
  },

  // Network error banner (Render cold start, etc.)
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF3C7",
    borderColor: "#F2D57E",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    color: "#78350F",
    fontSize: 13,
    fontWeight: "600",
  },
  errorBannerBtn: {
    backgroundColor: "#B45309",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  errorBannerBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  // Main content
  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 1100,
    alignSelf: "center",
  },
  h1: {
    fontSize: 34,
    fontWeight: "900",
    color: "#141414",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#5A5A5A",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 18,
    flexWrap: "wrap",
  },
  statCard: {
    minWidth: 280,
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statIconText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 13,
    color: "#6A6A6A",
    fontWeight: "800",
  },
  statValue: {
    marginTop: 3,
    fontSize: 26,
    fontWeight: "900",
    color: "#121212",
  },

  // Section card
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginTop: 18,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1A1A1A",
  },

  // Residents grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  residentCard: {
    flexGrow: 1,
    flexBasis: 320,
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 16,
    position: "relative",
    flexDirection: "row",
    gap: 14,
  },
  cardBell: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  notificationDot: {
    position: "absolute",
    top: 4,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#DC2626",
  },
  notificationDotUrgent: {
    width: 12,
    height: 12,
    top: 2,
    right: 3,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  cardBellUrgent: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  // Room pill
  roomBadge: {
    width: 76,
    height: 76,
    borderRadius: 16,
    backgroundColor: "#6D6B3B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  roomLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  roomValue: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  // Resident content
  residentContent: {
    flex: 1,
    paddingRight: 28,
  },
  residentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  residentName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1A1A1A",
  },
  infoLabel: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  mutedText: {
    fontSize: 12,
    color: "#7A7A7A",
    fontWeight: "700",
  },

  // Chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  dietChip: {
    backgroundColor: "#F7E7B5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dietChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#7A4B00",
  },

  medicalChip: {
    backgroundColor: "#D9EBFF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  medicalChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1D4ED8",
  },

  allergyChip: {
    backgroundColor: "#FDE2E2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  allergyChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B91C1C",
  },

  medicationChip: {
    backgroundColor: "#E9E1FF",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  medicationChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6D28D9",
  },

  emptyText: {
    fontSize: 13,
    color: "#6A6A6A",
    fontWeight: "700",
    marginTop: 6,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  detailModalCard: {
    width: "100%",
    maxWidth: 720,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
  modalSubTitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginTop: 14,
    marginBottom: 8,
  },
  modalPrimaryBtn: {
    marginTop: 18,
    backgroundColor: "#6D6B3B",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  modalCancel: {
    marginTop: 12,
    textAlign: "center",
    fontWeight: "800",
    color: "#6B7280",
  },
  modalKitchenBtn: {
    marginTop: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  modalKitchenText: {
    color: '#D87000',
    fontWeight: '700',
    fontSize: 15,
  },
  // Compose modal
  composeSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  composeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  composeResident: {
    fontSize: 14,
    color: '#6A6A6A',
    fontWeight: '600',
    marginBottom: 14,
  },
  composeInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1A1A',
    backgroundColor: '#F9FAFB',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  composeSendBtn: {
    backgroundColor: '#6D6B3B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  composeSendText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  composeCancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  composeCancelText: {
    fontSize: 14,
    color: '#8A8A8A',
    fontWeight: '600',
  },
  // Inbox modal
  inboxCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    width: '92%',
    maxWidth: 500,
    alignItems: 'stretch',
  },
  inboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  inboxEmpty: {
    textAlign: 'center',
    color: '#9CA3AF',
    paddingVertical: 20,
    fontSize: 15,
  },
  inboxItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#6D6B3B',
  },
  inboxItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  inboxResident: {
    fontWeight: '800',
    color: '#111827',
    fontSize: 14,
  },
  inboxTime: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  inboxMessage: {
    color: '#374151',
    fontSize: 14,
    marginBottom: 4,
  },
  inboxFrom: {
    color: '#9CA3AF',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
