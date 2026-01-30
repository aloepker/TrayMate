/**
 * AddResidentModal
 *
 * Admin-only modal used to create a new resident.
 * Handles:
 * - Resident form input
 * - Validation of required fields
 * - Submitting resident data to backend
 * - Closing modal on success
 */


import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void; // refresh residents in parent
};

export default function AddResidentModal({ visible, onClose, onSuccess }: Props) {
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "", // MM/DD/YYYY
    gender: "",
    phone: "",
    emergencyContact: "",
    emergencyPhone: "",
    doctor: "",
    doctorPhone: "",
    medicalConditions: "",
    foodAllergies: "",
    medications: "",
    room: "",
  });

  // Tracks which required fields are missing
  const [errors, setErrors] = useState<string[]>([]);
  const [showGenderModal, setShowGenderModal] = useState(false);

  const requiredKeys = useMemo(
    () => [
      "firstName",
      "lastName",
      "dob",
      "gender",
      "emergencyContact",
      "emergencyPhone",
      "doctor",
      "doctorPhone",
      "foodAllergies",
    ],
    []
  );

  const labelStyle = (key: string) => [
    styles.modalLabel,
    errors.includes(key) && { color: "#B91C1C" },
  ];


  const update = (key: keyof typeof form, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors.includes(key)) setErrors((p) => p.filter((x) => x !== key));
  };

   // Formats date input as MM/DD/YYYY while typing
  const formatDob = (raw: string) => {
    // keep digits only, max 8 digits (MMDDYYYY)
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const mm = digits.slice(0, 2);
    const dd = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);

    let out = mm;
    if (dd.length) out += `/${dd}`;
    if (yyyy.length) out += `/${yyyy}`;
    return out;
  };

  const closeAndClear = () => {
    setErrors([]);
    setShowGenderModal(false);
    onClose();
  };

  const submit = async () => {
    const missing = requiredKeys.filter((k) => !String((form as any)[k]).trim());
    if (missing.length) {
      setErrors(missing);
      Alert.alert("Missing Fields", "Please fill out the highlighted fields.");
      return;
    }

    // Validate DOB format
    const dobOk = /^\d{2}\/\d{2}\/\d{4}$/.test(form.dob);
    if (!dobOk) {
      setErrors((p) => Array.from(new Set([...p, "dob"])));
      Alert.alert("Invalid Date", "Date of Birth must be in MM/DD/YYYY format.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      };

      const res = await fetch("https://traymate-auth.onrender.com/admin/residents", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();

      if (!res.ok) {
        Alert.alert("Server Error", `Status ${res.status}: ${text || "Unknown error"}`);
        return;
      }

      Alert.alert("Success", "Resident added.");
      await onSuccess();

      // Clear fields after success
      setForm({
        firstName: "",
        middleName: "",
        lastName: "",
        dob: "",
        gender: "",
        phone: "",
        emergencyContact: "",
        emergencyPhone: "",
        doctor: "",
        doctorPhone: "",
        medicalConditions: "",
        foodAllergies: "",
        medications: "",
        room: "",
      });

      closeAndClear();
    } catch (e: any) {
      Alert.alert("Network Error", e?.message || "Request failed.");
    } finally {
      setSaving(false);
    }
  };

  // -------------------- UI --------------------

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Resident</Text>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              {/* Names row */}
              <View style={styles.row}>
                <View style={[styles.col, { flex: 2 }]}>
                  <Text style={labelStyle("firstName")}>First Name*</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={form.firstName}
                    onChangeText={(v) => update("firstName", v)}
                    placeholder="John"
                  />
                </View>

                <View style={[styles.col, { flex: 1 }]}>
                  <Text style={styles.modalLabel}>M.I.</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={form.middleName}
                    onChangeText={(v) => update("middleName", v)}
                    placeholder="B."
                  />
                </View>

                <View style={[styles.col, { flex: 2 }]}>
                  <Text style={labelStyle("lastName")}>Last Name*</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={form.lastName}
                    onChangeText={(v) => update("lastName", v)}
                    placeholder="Doe"
                  />
                </View>
              </View>

              {/* DOB + Gender */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={labelStyle("dob")}>Date of Birth*</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={form.dob}
                    onChangeText={(v) => update("dob", formatDob(v))}
                    placeholder="MM/DD/YYYY"
                    keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                    maxLength={10}
                  />
                </View>

                <View style={styles.col}>
                  <Text style={labelStyle("gender")}>Gender*</Text>
                  <Pressable style={styles.modalInput} onPress={() => setShowGenderModal(true)}>
                    <Text style={{ color: form.gender ? "#111" : "#9CA3AF", marginTop: 2 }}>
                      {form.gender || "Select..."}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Phone */}
              <Text style={styles.modalLabel}>Phone</Text>
              <TextInput
                style={styles.modalInput}
                value={form.phone}
                onChangeText={(v) => update("phone", v)}
                placeholder="(555) 123-4567"
                keyboardType="phone-pad"
              />

              {/* Emergency */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={labelStyle("emergencyContact")}>Emergency Contact*</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={form.emergencyContact}
                    onChangeText={(v) => update("emergencyContact", v)}
                    placeholder="Jane Doe"
                  />
                </View>
                <View style={styles.col}>
                  <Text style={labelStyle("emergencyPhone")}>Emergency Phone*</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={form.emergencyPhone}
                    onChangeText={(v) => update("emergencyPhone", v)}
                    placeholder="(555) 000-0000"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Doctor */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={labelStyle("doctor")}>Doctor*</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={form.doctor}
                    onChangeText={(v) => update("doctor", v)}
                    placeholder="Dr. Smith"
                  />
                </View>
                <View style={styles.col}>
                  <Text style={labelStyle("doctorPhone")}>Doctor Phone*</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={form.doctorPhone}
                    onChangeText={(v) => update("doctorPhone", v)}
                    placeholder="(555) 111-2222"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Medical notes */}
              <Text style={styles.modalLabel}>Medical Conditions</Text>
              <TextInput
                style={[styles.modalInput, { height: 90, textAlignVertical: "top" }]}
                value={form.medicalConditions}
                onChangeText={(v) => update("medicalConditions", v)}
                multiline
                placeholder="e.g., Diabetes, High blood pressure"
              />

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={labelStyle("foodAllergies")}>Food Allergies*</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={form.foodAllergies}
                    onChangeText={(v) => update("foodAllergies", v)}
                    placeholder="e.g., Peanuts"
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.modalLabel}>Medications</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={form.medications}
                    onChangeText={(v) => update("medications", v)}
                    placeholder="e.g., Metformin"
                  />
                </View>
              </View>
            </ScrollView>

            <Pressable style={styles.modalPrimaryBtn} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator /> : <Text style={styles.modalPrimaryText}>Add Resident</Text>}
            </Pressable>

            <Pressable onPress={closeAndClear} disabled={saving}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Gender picker mini-modal */}
      <Modal visible={showGenderModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxWidth: 420 }]}>
            <Text style={styles.modalTitle}>Select Gender</Text>

            {["Male", "Female", "Other"].map((g) => (
              <Pressable
                key={g}
                style={styles.genderOption}
                onPress={() => {
                  update("gender", g);
                  setShowGenderModal(false);
                }}
              >
                <Text style={{ fontWeight: "800", textAlign: "center" }}>{g}</Text>
              </Pressable>
            ))}

            <Pressable onPress={() => setShowGenderModal(false)}>
              <Text style={[styles.modalCancel, { marginTop: 10 }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 720,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
    color: "#111827",
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 6,
    color: "#111827",
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

  row: { flexDirection: "row", gap: 12, marginTop: 4 },
  col: { flex: 1 },

  genderOption: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F3F3",
    marginTop: 10,
  },
});
