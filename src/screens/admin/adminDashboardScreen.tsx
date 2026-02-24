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
  TextInput,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Feather from "react-native-vector-icons/Feather";

/**
 * FILE PATHS
 */
import AddResidentModal from "../components/AddResidentModal";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";

import {
  Caregiver,
  Resident,
  KitchenStaff,
  getCaregivers,
  getResidents,
  getKitchenStaff,
  assignResident,
  createCaregiver,
  createKitchenStaff,
  deleteEntity,
} from "../../services/api";

const grandmaLogo = require("../../styles/pictures/grandma.png");

/**
 * Types and Interfaces
 */
interface AdminDashboardProps {
  navigation: any;
}

type DeleteKind = "resident" | "caregiver" | "kitchen";

export default function AdminDashboard({ navigation }: AdminDashboardProps) {
  // ---- Core Data State ----
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [kitchenStaff, setKitchenStaff] = useState<KitchenStaff[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- Add Caregiver Modal State ----
  const [showAddCaregiver, setShowAddCaregiver] = useState(false);
  const [cgName, setCgName] = useState("");
  const [cgEmail, setCgEmail] = useState("");
  const [cgPassword, setCgPassword] = useState("");
  const [savingCaregiver, setSavingCaregiver] = useState(false);

  // ---- Add Kitchen Staff Modal State ----
  const [showAddKitchen, setShowAddKitchen] = useState(false);
  const [ksName, setKsName] = useState("");
  const [ksEmail, setKsEmail] = useState("");
  const [ksPassword, setKsPassword] = useState("");
  const [savingKitchen, setSavingKitchen] = useState(false);

  // ---- Add Resident Modal State ----
  const [showAddResident, setShowAddResident] = useState(false);

  // ---- Edit Resident Modal State ----
  const [showEditResident, setShowEditResident] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [editName, setEditName] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [editDietary, setEditDietary] = useState(""); 
  const [editMedicalNeeds, setEditMedicalNeeds] = useState(""); 

  // ---- Confirm Delete Modal State ----
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    kind: DeleteKind;
    id: string;
  } | null>(null);

  /**
   * Initial Data Fetching
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const [cg, rs, ks] = await Promise.all([
          getCaregivers(),
          getResidents(),
          getKitchenStaff(),
        ]);

        if (!cancelled) {
          setCaregivers(cg);
          setResidents(rs);
          setKitchenStaff(ks);
        }
      } catch (e: any) {
        Alert.alert("Failed to load admin data", e.message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Refresh Logic
   */
  const refreshResidents = async () => {
    try {
      const rs = await getResidents();
      setResidents(rs);
    } catch (e: any) {
      Alert.alert("Failed to refresh residents", e.message);
    }
  };

  const refreshCaregivers = async () => {
    try {
      const cg = await getCaregivers();
      setCaregivers(cg);
    } catch (e: any) {
      Alert.alert("Failed to refresh caregivers", e.message);
    }
  };

  const refreshKitchen = async () => {
    try {
      const ks = await getKitchenStaff();
      setKitchenStaff(ks);
    } catch (e: any) {
      Alert.alert("Failed to refresh kitchen staff", e.message);
    }
  };

  /**
   * Memos for Statistics
   */
  const stats = useMemo(() => {
    const total = residents.length;
    const assigned = residents.filter((r) => r.caregiverId).length;
    return { 
      total, 
      assigned, 
      unassigned: total - assigned 
    };
  }, [residents]);

  const caregiverPatientCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of caregivers) {
      map[c.id] = 0;
    }
    for (const r of residents) {
      if (r.caregiverId) {
        map[r.caregiverId] = (map[r.caregiverId] ?? 0) + 1;
      }
    }
    return map;
  }, [caregivers, residents]);

  /**
   * Handlers
   */
  const onAssign = async (residentId: string, caregiverId: string) => {
    const nextCaregiverId = caregiverId === "none" ? null : caregiverId;
    try {
      await assignResident(residentId, nextCaregiverId);
      setResidents((prev) =>
        prev.map((r) =>
          r.id === residentId ? { ...r, caregiverId: nextCaregiverId } : r
        )
      );
    } catch (e: any) {
      Alert.alert("Assignment failed", e.message);
    }
  };

  const askDeleteResident = (id: string) => {
    setPendingDelete({ kind: "resident", id });
    setConfirmDeleteOpen(true);
  };

  const askDeleteCaregiver = (id: string) => {
    setPendingDelete({ kind: "caregiver", id });
    setConfirmDeleteOpen(true);
  };

  const askDeleteKitchen = (id: string) => {
    setPendingDelete({ kind: "kitchen", id });
    setConfirmDeleteOpen(true);
  };

  const closeConfirmDelete = () => {
    setConfirmDeleteOpen(false);
    setPendingDelete(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      setDeleteLoading(true);
      if (pendingDelete.kind === "resident") {
        await deleteEntity("resident", pendingDelete.id);
        setResidents((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      } else {
        await deleteEntity("user", pendingDelete.id);
        if (pendingDelete.kind === "caregiver") {
          setCaregivers((prev) => prev.filter((c) => c.id !== pendingDelete.id));
        } else {
          setKitchenStaff((prev) => prev.filter((k) => k.id !== pendingDelete.id));
        }
      }
      closeConfirmDelete();
    } catch (e: any) {
      Alert.alert("Delete failed", e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEditResident = (r: Resident) => {
    setEditingResident(r);
    setEditName(r.name ?? "");
    setEditRoom(r.room ?? "");
    setEditDietary((r.dietaryRestrictions ?? []).join(", "));
    setEditMedicalNeeds(""); 
    setShowEditResident(true);
  };

  const submitEditResidentUIOnly = async () => {
    if (!editingResident) return;
    const nextDietary = editDietary
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setResidents((prev) =>
      prev.map((r) =>
        r.id === editingResident.id
          ? { 
              ...r, 
              name: editName.trim(), 
              room: editRoom.trim(), 
              dietaryRestrictions: nextDietary 
            }
          : r
      )
    );
    Alert.alert("Updated (UI only)", "Backend update endpoint isn’t ready yet.");
    setShowEditResident(false);
    setEditingResident(null);
  };

  const submitCaregiver = async () => {
    if (!cgName.trim() || !cgEmail.trim() || !cgPassword) {
      Alert.alert("Missing info", "Please enter name, email, and password.");
      return;
    }
    try {
      setSavingCaregiver(true);
      await createCaregiver({ 
        name: cgName.trim(), 
        email: cgEmail.trim(), 
        password: cgPassword 
      });
      await refreshCaregivers();
      setCgName(""); 
      setCgEmail(""); 
      setCgPassword("");
      setShowAddCaregiver(false);
    } catch (e: any) {
      Alert.alert("Failed to create caregiver", e.message);
    } finally {
      setSavingCaregiver(false);
    }
  };

  const submitKitchenStaff = async () => {
    if (!ksName.trim() || !ksEmail.trim() || !ksPassword) {
      Alert.alert("Missing info", "Please enter name, email, and password.");
      return;
    }
    try {
      setSavingKitchen(true);
      await createKitchenStaff({ 
        name: ksName.trim(), 
        email: ksEmail.trim(), 
        password: ksPassword 
      });
      await refreshKitchen();
      setKsName(""); 
      setKsEmail(""); 
      setKsPassword("");
      setShowAddKitchen(false);
    } catch (e: any) {
      Alert.alert("Failed to create kitchen staff", e.message);
    } finally {
      setSavingKitchen(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar barStyle="dark-content" />
      
      {/* HEADER SECTION */}
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Image 
            source={grandmaLogo} 
            style={styles.logo} 
            resizeMode="contain" 
          />
          <View>
            <Text style={styles.brandTitle}>TrayMate</Text>
            <Text style={styles.brandSub}>Admin Portal</Text>
          </View>
        </View>
        <Pressable 
          style={styles.logoutBtn} 
          onPress={() => navigation.replace("Login")}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#6D6B3B" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.h1}>Patient Assignment Management</Text>
          <Text style={styles.subtitle}>
            Assign residents to caregivers for their shifts.
          </Text>

          {/* STATS ROW */}
          <View style={styles.statsRow}>
            <StatCard 
              icon="👥" 
              label="Total Residents" 
              value={stats.total} 
              border="#D7D0A8" 
              iconBg="#6D6B3B" 
            />
            <StatCard 
              icon="✅" 
              label="Assigned" 
              value={stats.assigned} 
              border="#B9E6C2" 
              iconBg="#0A8F3E" 
            />
            <StatCard 
              icon="🧑‍🤝‍🧑" 
              label="Unassigned" 
              value={stats.unassigned} 
              border="#F2D57E" 
              iconBg="#D87000" 
            />
          </View>

          {/* CAREGIVERS SECTION */}
          <SectionCard title="Available Caregivers">
            <View style={styles.grid}>
              {caregivers.map((c, idx) => (
                <MiniCard
                  key={c.id || c.email || `cg-${idx}`}
                  name={c.name}
                  email={c.email}
                  footer={`${caregiverPatientCounts[c.id] ?? 0} patient(s)`}
                  onDelete={() => askDeleteCaregiver(c.id)}
                />
              ))}
              {!caregivers.length && (
                <Text style={styles.emptyText}>No caregivers found.</Text>
              )}
            </View>
            <Pressable 
              style={styles.outlineBtn} 
              onPress={() => setShowAddCaregiver(true)}
            >
              <View style={styles.btnRow}>
                <Feather name="user-plus" size={16} color="#4A4A4A" />
                <Text style={styles.outlineBtnText}>Add Caregiver</Text>
              </View>
            </Pressable>
          </SectionCard>

          {/* RESIDENTS ASSIGNMENT SECTION */}
          <SectionCard title="Assign Residents to Caregivers">
            {!residents.length && (
              <Text style={styles.emptyText}>No residents found.</Text>
            )}
            {residents.map((r, idx) => (
              <View key={r.id || `res-${idx}`} style={styles.assignRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{r.name}</Text>
                  <Text style={styles.personMeta}>Room {r.room}</Text>
                  <View style={styles.chipRow}>
                    {(r.dietaryRestrictions ?? []).length ? (
                      r.dietaryRestrictions.map((tag, i) => (
                        <View key={`${r.id}-tag-${i}`} style={styles.chip}>
                          <Text style={styles.chipText}>{tag}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.restrictionsMuted}>No restrictions</Text>
                    )}
                  </View>
                </View>

                <View style={styles.rightActions}>
                  <View style={styles.pickerWrap}>
                    <Picker
                      selectedValue={r.caregiverId ?? "none"}
                      onValueChange={(val) => onAssign(r.id, String(val))}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select caregiver" value="none" />
                      {caregivers.map((c, cIdx) => (
                        <Picker.Item 
                          key={c.id || c.email || `cg-opt-${cIdx}`} 
                          label={c.name} 
                          value={c.id} 
                        />
                      ))}
                    </Picker>
                  </View>
                  <Pressable 
                    style={styles.iconBtn} 
                    onPress={() => openEditResident(r)} 
                    hitSlop={10}
                  >
                    <Feather name="edit-2" size={18} color="#6D6B3B" />
                  </Pressable>
                  <Pressable 
                    style={styles.iconBtn} 
                    onPress={() => askDeleteResident(r.id)} 
                    hitSlop={10}
                  >
                    <Feather name="trash-2" size={18} color="#6D6B3B" />
                  </Pressable>
                </View>
              </View>
            ))}
            <Pressable 
              style={styles.outlineBtn} 
              onPress={() => setShowAddResident(true)}
            >
              <View style={styles.btnRow}>
                <Feather name="user-plus" size={16} color="#4A4A4A" />
                <Text style={styles.outlineBtnText}>Add Resident</Text>
              </View>
            </Pressable>
          </SectionCard>

          {/* KITCHEN STAFF SECTION */}
          <SectionCard title="Kitchen Staff">
            <View style={styles.grid}>
              {kitchenStaff.map((k, idx) => (
                <MiniCard
                  key={k.id || k.email || `ks-${idx}`}
                  name={k.name}
                  email={k.email}
                  footer={k.shift ? `Shift: ${k.shift}` : "Kitchen Staff"}
                  onDelete={() => askDeleteKitchen(k.id)}
                />
              ))}
              {!kitchenStaff.length && (
                <Text style={styles.emptyText}>No kitchen staff found.</Text>
              )}
            </View>
            <Pressable 
              style={styles.outlineBtn} 
              onPress={() => setShowAddKitchen(true)}
            >
              <View style={styles.btnRow}>
                <Feather name="user-plus" size={16} color="#4A4A4A" />
                <Text style={styles.outlineBtnText}>Add Kitchen Staff</Text>
              </View>
            </Pressable>
          </SectionCard>
        </ScrollView>
      )}

      {/* EXTERNAL MODALS */}
      <AddResidentModal 
        visible={showAddResident} 
        onClose={() => setShowAddResident(false)} 
        onSuccess={refreshResidents} 
      />
      <ConfirmDeleteModal 
        visible={confirmDeleteOpen} 
        kind={pendingDelete?.kind ?? null} 
        loading={deleteLoading} 
        onCancel={closeConfirmDelete} 
        onConfirm={confirmDelete} 
      />

      {/* EDIT RESIDENT MODAL */}
      <Modal visible={showEditResident} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit Resident</Text>
              <Pressable onPress={() => setShowEditResident(false)} hitSlop={10}>
                <Feather name="x" size={22} color="#111827" />
              </Pressable>
            </View>
            
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput 
              value={editName} 
              onChangeText={setEditName} 
              style={styles.modalInput} 
            />
            
            <Text style={styles.modalLabel}>Room</Text>
            <TextInput 
              value={editRoom} 
              onChangeText={setEditRoom} 
              style={styles.modalInput} 
              autoCapitalize="characters" 
            />
            
            <Text style={styles.modalLabel}>Dietary Restrictions</Text>
            <TextInput 
              value={editDietary} 
              onChangeText={setEditDietary} 
              style={styles.modalInput} 
            />
            
            <Text style={styles.modalLabel}>Medical Needs</Text>
            <TextInput 
              value={editMedicalNeeds} 
              onChangeText={setEditMedicalNeeds} 
              style={styles.modalInput} 
            />
            
            <Pressable 
              style={styles.modalPrimaryBtn} 
              onPress={submitEditResidentUIOnly}
            >
              <Text style={styles.modalPrimaryText}>Update Resident</Text>
            </Pressable>
            <Pressable onPress={() => setShowEditResident(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ADD CAREGIVER MODAL */}
      <Modal visible={showAddCaregiver} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Caregiver</Text>
            
            <Text style={styles.modalLabel}>Full name</Text>
            <TextInput 
              value={cgName} 
              onChangeText={setCgName} 
              style={styles.modalInput} 
            />
            
            <Text style={styles.modalLabel}>Email</Text>
            <TextInput 
              value={cgEmail} 
              onChangeText={setCgEmail} 
              keyboardType="email-address" 
              autoCapitalize="none" 
              style={styles.modalInput} 
            />
            
            <Text style={styles.modalLabel}>Password</Text>
            <TextInput 
              value={cgPassword} 
              onChangeText={setCgPassword} 
              secureTextEntry 
              style={styles.modalInput} 
            />
            
            <Pressable 
              style={styles.modalPrimaryBtn} 
              onPress={submitCaregiver} 
              disabled={savingCaregiver}
            >
              <Text style={styles.modalPrimaryText}>
                {savingCaregiver ? "Adding..." : "Add Caregiver"}
              </Text>
            </Pressable>
            <Pressable onPress={() => setShowAddCaregiver(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ADD KITCHEN STAFF MODAL */}
      <Modal visible={showAddKitchen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Kitchen Staff</Text>
            
            <Text style={styles.modalLabel}>Full name</Text>
            <TextInput 
              value={ksName} 
              onChangeText={setKsName} 
              style={styles.modalInput} 
            />
            
            <Text style={styles.modalLabel}>Email</Text>
            <TextInput 
              value={ksEmail} 
              onChangeText={setKsEmail} 
              keyboardType="email-address" 
              autoCapitalize="none" 
              style={styles.modalInput} 
            />
            
            <Text style={styles.modalLabel}>Password</Text>
            <TextInput 
              value={ksPassword} 
              onChangeText={setKsPassword} 
              secureTextEntry 
              style={styles.modalInput} 
            />
            
            <Pressable 
              style={styles.modalPrimaryBtn} 
              onPress={submitKitchenStaff} 
              disabled={savingKitchen}
            >
              <Text style={styles.modalPrimaryText}>
                {savingKitchen ? "Adding..." : "Add Kitchen Staff"}
              </Text>
            </Pressable>
            <Pressable onPress={() => setShowAddKitchen(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/**
 * --- INTERNAL HELPER COMPONENTS ---
 */

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ marginTop: 14 }}>
        {children}
      </View>
    </View>
  );
}

function StatCard({ icon, label, value, border, iconBg }: { icon: string; label: string; value: number; border: string; iconBg: string }) {
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

function MiniCard({ name, email, footer, onDelete }: { name: string; email: string; footer: string; onDelete?: () => void }) {
  return (
    <View style={styles.miniCard}>
      {onDelete && (
        <Pressable style={styles.cardTrash} onPress={onDelete} hitSlop={10}>
          <Feather name="trash-2" size={16} color="#6D6B3B" />
        </Pressable>
      )}
      <Text style={styles.miniName}>{name}</Text>
      <Text style={styles.miniEmail}>{email}</Text>
      <Text style={styles.miniFooter}>{footer}</Text>
    </View>
  );
}

/**
 * --- STYLESHEET (FULL EXPANDED VERSION) ---
 */

const styles = StyleSheet.create({
  page: { 
    flex: 1, 
    backgroundColor: "#DCD3B8" 
  },
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
    gap: 10 
  },
  logo: { 
    width: 34, 
    height: 34, 
    borderRadius: 6 
  },
  brandTitle: { 
    fontSize: 18, 
    fontWeight: "900", 
    color: "#1C1C1C" 
  },
  brandSub: { 
    fontSize: 12, 
    color: "#6F6F6F", 
    marginTop: 1 
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
    fontSize: 14 
  },
  loadingWrap: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24 
  },
  loadingText: { 
    marginTop: 10, 
    fontSize: 14, 
    color: "#5A5A5A", 
    fontWeight: "700" 
  },
  container: { 
    paddingHorizontal: 20, 
    paddingTop: 18, 
    paddingBottom: 40, 
    width: "100%", 
    maxWidth: 1100, 
    alignSelf: "center" 
  },
  h1: { 
    fontSize: 34, 
    fontWeight: "900", 
    color: "#141414" 
  },
  subtitle: { 
    marginTop: 8, 
    fontSize: 14, 
    color: "#5A5A5A" 
  },
  statsRow: { 
    flexDirection: "row", 
    gap: 18, 
    marginTop: 18, 
    flexWrap: "wrap" 
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
        shadowColor: '#000',
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
    justifyContent: "center" 
  },
  statIconText: { 
    fontSize: 18, 
    color: "#FFFFFF" 
  },
  statLabel: { 
    fontSize: 13, 
    color: "#6A6A6A", 
    fontWeight: "800" 
  },
  statValue: { 
    marginTop: 3, 
    fontSize: 26, 
    fontWeight: "900", 
    color: "#121212" 
  },
  sectionCard: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: 18, 
    padding: 20, 
    marginTop: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
    color: "#1A1A1A" 
  },
  grid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 14 
  },
  miniCard: { 
    flexGrow: 1, 
    flexBasis: 220, 
    backgroundColor: "#F8F8F8", 
    borderRadius: 14, 
    padding: 14, 
    position: "relative" 
  },
  cardTrash: { 
    position: "absolute", 
    top: 10, 
    right: 10, 
    width: 28, 
    height: 28, 
    borderRadius: 10, 
    alignItems: "center", 
    justifyContent: "center", 
    zIndex: 10 
  },
  miniName: { 
    fontSize: 14, 
    fontWeight: "900", 
    color: "#1A1A1A" 
  },
  miniEmail: { 
    marginTop: 4, 
    fontSize: 12, 
    color: "#6A6A6A" 
  },
  miniFooter: { 
    marginTop: 10, 
    fontSize: 12, 
    color: "#7A7A7A", 
    fontWeight: "700" 
  },
  outlineBtn: { 
    marginTop: 14, 
    alignSelf: "flex-start", 
    borderWidth: 1, 
    borderColor: "#B5AE8C", 
    backgroundColor: "#FFFFFF", 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 10 
  },
  btnRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8 
  },
  outlineBtnText: { 
    fontWeight: "900", 
    color: "#4A4A4A" 
  },
  emptyText: { 
    fontSize: 13, 
    color: "#6A6A6A", 
    fontWeight: "700", 
    marginTop: 6 
  },
  assignRow: { 
    backgroundColor: "#F8F8F8", 
    borderRadius: 14, 
    padding: 14, 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 14, 
    marginBottom: 12 
  },
  personName: { 
    fontSize: 14, 
    fontWeight: "900", 
    color: "#1A1A1A" 
  },
  personMeta: { 
    marginTop: 4, 
    fontSize: 12, 
    color: "#6A6A6A" 
  },
  chipRow: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 8, 
    marginTop: 8 
  },
  chip: { 
    backgroundColor: "#F7E7B5", 
    borderRadius: 8, 
    paddingHorizontal: 10, 
    paddingVertical: 6 
  },
  chipText: { 
    fontSize: 12, 
    fontWeight: "800", 
    color: "#7A4B00" 
  },
  restrictionsMuted: { 
    fontSize: 12, 
    color: "#7A7A7A", 
    fontWeight: "700" 
  },
  rightActions: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 10 
  },
  pickerWrap: { 
    width: 180, 
    backgroundColor: "#FFFFFF", 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: "#E3E3E3", 
    overflow: "hidden" 
  },
  picker: { 
    height: 44, 
    width: "100%" 
  },
  iconBtn: { 
    width: 34, 
    height: 34, 
    borderRadius: 10, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  modalBackdrop: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.35)", 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 20 
  },
  modalCard: { 
    width: "100%", 
    maxWidth: 520, 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    padding: 18 
  },
  modalHeaderRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    marginBottom: 6 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: "900", 
    marginBottom: 10 
  },
  modalLabel: { 
    fontSize: 13, 
    fontWeight: "800", 
    marginTop: 10, 
    marginBottom: 6 
  },
  modalInput: { 
    backgroundColor: "#F3F3F3", 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    fontSize: 15 
  },
  modalPrimaryBtn: { 
    marginTop: 16, 
    backgroundColor: "#111827", 
    borderRadius: 12, 
    paddingVertical: 14, 
    alignItems: "center" 
  },
  modalPrimaryText: { 
    color: "#fff", 
    fontWeight: "900" 
  },
  modalCancel: { 
    marginTop: 12, 
    textAlign: "center", 
    fontWeight: "800", 
    color: "#6B7280" 
  },
});