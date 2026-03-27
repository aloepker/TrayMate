// src/screens/caregiver/caregiverDashboardScreen.tsx

import React, { useEffect, useMemo, useState } from "react";
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
  TextInput,
  TouchableOpacity,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import {
  Resident,
  KitchenNotification,
  getCaregiverResidents,
  getCaregiverNotifications,
} from "../../services/api";

const grandmaLogo = require("../../styles/pictures/grandma.png");

interface CaregiverDashboardProps {
  navigation: any;
}

export default function CaregiverDashboardScreen({
  navigation,
}: CaregiverDashboardProps) {
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

  // Selected resident for the popup modal
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);

  // Controls resident detail popup
  const [showResidentModal, setShowResidentModal] = useState(false);

  // -----------------------------
  // Initial data load
  // -----------------------------
  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);

        // Role-based caregiver endpoint:
        // returns ONLY residents assigned to the logged-in caregiver
        const residentData = await getCaregiverResidents();

        // Notifications endpoint for caregiver dashboard
        // If backend does not have this ready yet, the catch below prevents the whole page from failing
        let notifData: KitchenNotification[] = [];
        try {
          notifData = await getCaregiverNotifications();
        } catch {
          notifData = [];
        }

        if (!cancelled) {
          setResidents(residentData || []);
          setNotifications(notifData || []);
        }
      } catch (e: any) {
        if (!cancelled) {
          Alert.alert(
            "Failed to load caregiver dashboard",
            e?.message ?? "Request failed."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  // -----------------------------
  // Small stat cards data
  // -----------------------------
  const stats = useMemo(() => {
    return {
      assignedResidents: residents.length,
      activeAlerts: notifications.filter((n) => !n.read).length,
    };
  }, [residents, notifications]);

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

  // -----------------------------
  // Bell icon click:
  // show all notifications for that resident
  // -----------------------------
  const handleNotificationPress = (residentId: string) => {
    const residentNotifications = notificationsByResident[residentId] || [];

    if (!residentNotifications.length) {
      Alert.alert("Notifications", "No updates for this resident yet.");
      return;
    }

    Alert.alert(
      "Resident Updates",
      residentNotifications.map((n) => `• ${n.message}`).join("\n")
    );
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
    });
  };

  return (
    <SafeAreaView style={styles.page}>
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
          {/* Kitchen messages bell */}
          <Pressable
            style={styles.bellBtn}
            onPress={() => { setShowInboxModal(true); markAllRead(); }}
            hitSlop={8}
          >
            <Feather name="bell" size={22} color="#3C3C3C" />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>

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
                  const hasNotifications = residentNotifications.length > 0;

                  return (
                    <Pressable
                      key={resident.id || `resident-${idx}`}
                      style={styles.residentCard}
                      onPress={() => openResidentModal(resident)}
                    >
                      {/* Notification bell at top-right of resident card */}
                      <Pressable
                        style={styles.cardBell}
                        onPress={() => handleNotificationPress(resident.id)}
                        hitSlop={10}
                      >
                        <Feather name="bell" size={18} color="#6D6B3B" />
                        {hasNotifications && <View style={styles.notificationDot} />}
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