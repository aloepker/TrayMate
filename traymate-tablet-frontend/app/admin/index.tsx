import { router } from "expo-router";
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
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import AddResidentModal from "../../components/AddResidentModal";

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
} from "../../services/api";

const grandmaLogo = require("../../assets/images/grandma.png");

export default function AdminDashboard() {
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
  
  // Fetch caregivers, residents, and kitchen staff when dashboard loads
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
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Re-fetch residents after adding or updating assignments
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


  // Calculate dashboard statistics (total / assigned / unassigned)
  const stats = useMemo(() => {
    const total = residents.length;
    const assigned = residents.filter((r) => r.caregiverId).length;
    return { total, assigned, unassigned: total - assigned };
  }, [residents]);

  // Track how many residents each caregiver has
  const caregiverPatientCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of caregivers) map[c.id] = 0;
    for (const r of residents) {
      if (r.caregiverId) map[r.caregiverId] = (map[r.caregiverId] ?? 0) + 1;
    }
    return map;
  }, [caregivers, residents]);

  // Assign or unassign a resident to a caregiver
  const onAssign = async (residentId: string, caregiverId: string) => {
    try {
      const updated = await assignResident(
        residentId,
        caregiverId === "none" ? null : caregiverId
      );

      setResidents((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    } catch (e: any) {
      Alert.alert("Assignment failed", e.message);
    }
  };

  const submitCaregiver = async () => {
    if (!cgName.trim() || !cgEmail.trim() || !cgPassword) {
      Alert.alert("Missing info", "Please enter name, email, and password.");
      return;
    }

    try {
      setSavingCaregiver(true);

      const created = await createCaregiver({
        name: cgName.trim(),
        email: cgEmail.trim(),
        password: cgPassword,
      });

     // setCaregivers((prev) => [created, ...prev]);
     await refreshCaregivers();

      // Clear sensitive fields + close
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

      const created = await createKitchenStaff({
        name: ksName.trim(),
        email: ksEmail.trim(),
        password: ksPassword,
      });

      //setKitchenStaff((prev) => [created, ...prev]);
      await refreshKitchen();

      // Clear sensitive fields + close
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
    <View style={styles.page}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <Image source={grandmaLogo} style={styles.logo} resizeMode="contain" />
          <View>
            <Text style={styles.brandTitle}>TrayMate</Text>
            <Text style={styles.brandSub}>Admin Portal</Text>
          </View>
        </View>

    <Pressable    
       style={styles.logoutBtn} 
       onPress={() => {
         router.replace("/"); 
         }} 
     > 
         <Text style={styles.logoutText}>Logout</Text>        
    </Pressable> 

    </View>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.h1}>Patient Assignment Management</Text>
          <Text style={styles.subtitle}>
            Assign residents to caregivers for their shifts.
          </Text>

          {/* Stats */}
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

          {/* Caregivers */}
          <SectionCard title="Available Caregivers">
            <View style={styles.grid}>


              {caregivers.map((c, idx) => (
                <MiniCard
                   key={c.id || c.email || `cg-${idx}`}
                   name={c.name}
                   email={c.email}
                   footer={`${caregiverPatientCounts[c.id] ?? 0} patient(s)`}
              />
   ))}
              

              {!caregivers.length ? (
                <Text style={styles.emptyText}>No caregivers found.</Text>
              ) : null}
            </View>

            <Pressable
              style={styles.outlineBtn}
              onPress={() => setShowAddCaregiver(true)}
            >
              <Text style={styles.outlineBtnText}>＋ Add Caregiver</Text>
            </Pressable>
          </SectionCard>

          {/* Assign Residents */}
          <SectionCard title="Assign Residents to Caregivers">
            {!residents.length ? (
              <Text style={styles.emptyText}>No residents found.</Text>
            ) : null}

            {residents.map((r, idx) => (
             <View key={r.id || `res-${idx}`} style={styles.assignRow}>

                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>{r.name}</Text>
                  <Text style={styles.personMeta}>{r.room}</Text>
                  <Text style={styles.restrictions}>
                    {r.dietaryRestrictions?.length
                      ? r.dietaryRestrictions.join(" • ")
                      : "No restrictions"}
                  </Text>
                </View>

                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={r.caregiverId ?? "none"}
                    onValueChange={(val) => onAssign(r.id, String(val))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select caregiver" value="none" />

                  {caregivers.map((c, idx) => (
                    <Picker.Item
                      key={c.id || c.email || `cg-opt-${idx}`}
                      label={c.name}
                     value={c.id}
                    />
  ))}

                  </Picker>
                </View>
              </View>
            ))}

            <Pressable
              style={styles.outlineBtn}
              onPress={() => setShowAddResident(true)}
            >
              <Text style={styles.outlineBtnText}>＋ Add Resident</Text>
            </Pressable>
          </SectionCard>

          {/* Kitchen Staff */}
          <SectionCard title="Kitchen Staff">
            <View style={styles.grid}>

              {kitchenStaff.map((k, idx) => (
               <MiniCard
                  key={k.id || k.email || `ks-${idx}`}
                  name={k.name}
                  email={k.email}
                 footer="Kitchen Staff"
                />
     ))}

              {!kitchenStaff.length ? (
                <Text style={styles.emptyText}>No kitchen staff found.</Text>
              ) : null}
            </View>

            <Pressable
              style={styles.outlineBtn}
              onPress={() => setShowAddKitchen(true)}
            >
              <Text style={styles.outlineBtnText}>＋ Add Kitchen Staff</Text>
            </Pressable>
          </SectionCard>
        </ScrollView>
      )}

      {/* -------------------- Add Resident Modal (NEW) -------------------- 
        - Only visible when admin clicks "Add Resident"
        - On success, refreshes resident list and closes modal
      */}

      <AddResidentModal
        visible={showAddResident}
        onClose={() => setShowAddResident(false)}
        onSuccess={async () => {
          await refreshResidents();
          setShowAddResident(false);
        }}
      />

      {/* -------------------- Add Caregiver Modal -------------------- */}
      <Modal visible={showAddCaregiver} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Caregiver</Text>

            <Text style={styles.modalLabel}>Full name</Text>
            <TextInput
              value={cgName}
              onChangeText={setCgName}
              placeholder="Enter caregiver name"
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Email</Text>
            <TextInput
              value={cgEmail}
              onChangeText={setCgEmail}
              placeholder="Enter caregiver email"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Password</Text>
            <TextInput
              value={cgPassword}
              onChangeText={setCgPassword}
              placeholder="Create password"
              secureTextEntry
              autoCapitalize="none"
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

            <Pressable
              onPress={() => {
                setCgPassword("");
                setShowAddCaregiver(false);
              }}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ------------------ Add Kitchen Staff Modal ------------------ */}
      <Modal visible={showAddKitchen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Kitchen Staff</Text>

            <Text style={styles.modalLabel}>Full name</Text>
            <TextInput
              value={ksName}
              onChangeText={setKsName}
              placeholder="Enter staff name"
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Email</Text>
            <TextInput
              value={ksEmail}
              onChangeText={setKsEmail}
              placeholder="Enter staff email"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Password</Text>
            <TextInput
              value={ksPassword}
              onChangeText={setKsPassword}
              placeholder="Create password"
              secureTextEntry
              autoCapitalize="none"
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

            <Pressable
              onPress={() => {
                setKsPassword("");
                setShowAddKitchen(false);
              }}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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

function MiniCard({
  name,
  email,
  footer,
}: {
  name: string;
  email: string;
  footer: string;
}) {
  return (
    <View style={styles.miniCard}>
      <Text style={styles.miniName}>{name}</Text>
      <Text style={styles.miniEmail}>{email}</Text>
      <Text style={styles.miniFooter}>{footer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#DCD3B8" },

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
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 34, height: 34, borderRadius: 6 },
  brandTitle: { fontSize: 18, fontWeight: "900", color: "#1C1C1C" },
  brandSub: { fontSize: 12, color: "#6F6F6F", marginTop: 1 },


  logoutBtn: {
  height: 44,               //consistent button height
  minWidth: 110,            //keeps shape nice
  borderWidth: 1,
  borderColor: "#A7A07F",
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 18,
  paddingVertical: 0,       //remove vertical padding
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "center",      
},

logoutText: {
  fontWeight: "800",
  color: "#3C3C3C",
  fontSize: 14,
  lineHeight: 14,           //match font size to stop vertical drift
  textAlign: "center",

  
  includeFontPadding: false,
  textAlignVertical: "center",
},


  loadingWrap: { padding: 24 },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#5A5A5A",
    fontWeight: "700",
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
    maxWidth: 1100,
    alignSelf: "center",
    width: "100%",
  },
  h1: { fontSize: 34, fontWeight: "900", color: "#141414" },
  subtitle: { marginTop: 8, fontSize: 14, color: "#5A5A5A" },

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
      web: { boxShadow: "0px 6px 18px rgba(0,0,0,0.08)" } as any,
      default: { elevation: 3 },
    }),
  },
  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statIconText: { fontSize: 18, color: "#FFFFFF" },
  statLabel: { fontSize: 13, color: "#6A6A6A", fontWeight: "800" },
  statValue: {
    marginTop: 3,
    fontSize: 26,
    fontWeight: "900",
    color: "#121212",
  },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    marginTop: 18,
    ...Platform.select({
      web: { boxShadow: "0px 6px 18px rgba(0,0,0,0.08)" } as any,
      default: { elevation: 2 },
    }),
  },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#1A1A1A" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  miniCard: {
    flexGrow: 1,
    flexBasis: 220,
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    padding: 14,
  },
  miniName: { fontSize: 14, fontWeight: "900", color: "#1A1A1A" },
  miniEmail: { marginTop: 4, fontSize: 12, color: "#6A6A6A" },
  miniFooter: {
    marginTop: 10,
    fontSize: 12,
    color: "#7A7A7A",
    fontWeight: "700",
  },

  outlineBtn: {
    marginTop: 14,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#B5AE8C",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  outlineBtnText: { fontWeight: "900", color: "#4A4A4A" },

  emptyText: {
    fontSize: 13,
    color: "#6A6A6A",
    fontWeight: "700",
    marginTop: 6,
  },

  assignRow: {
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  personName: { fontSize: 14, fontWeight: "900", color: "#1A1A1A" },
  personMeta: { marginTop: 4, fontSize: 12, color: "#6A6A6A" },
  restrictions: {
    marginTop: 4,
    fontSize: 12,
    color: "#7A7A7A",
    fontWeight: "700",
  },

  pickerWrap: {
    width: 240,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E3E3E3",
    overflow: "hidden",
  },
  picker: { height: 44, width: "100%" },

  // ---------- Modal Styles ----------
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", marginBottom: 10 },
  modalLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "#F3F3F3",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  modalPrimaryBtn: {
    marginTop: 16,
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalPrimaryText: { color: "#fff", fontWeight: "900" },
  modalCancel: {
    marginTop: 12,
    textAlign: "center",
    fontWeight: "800",
    color: "#6B7280",
  },
});
