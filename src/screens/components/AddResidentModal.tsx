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
//import { getAuthToken } from "@/services/storage"; //to get tokens
import { getAuthToken } from "../../services/storage";

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
import { COMMON_ALLERGENS, COMMON_MEDICAL_CONDITIONS } from "../../services/mealSafetyService";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void; // refresh residents in parent
};

export default function AddResidentModal({ visible, onClose, onSuccess }: Props) {
  const [saving, setSaving] = useState(false);
  // Collapsed-by-default chip pickers for Allergies and Medical Conditions
  // to keep the form short. Tap the header to expand the chip grid.
  const [allergiesOpen, setAllergiesOpen] = useState(false);
  const [medCondsOpen, setMedCondsOpen] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dob: "", // YYYY-MM-DD (backend format)
    gender: "",
    phone: "",
    emergencyContact: "",
    emergencyPhone: "",
    doctor: "",
    doctorPhone: "",
    medicalConditions: [] as string[],
    foodAllergies: [] as string[],
    dietaryRestrictions: "",
    medications: "",
    roomNumber: "",
  });

  // Tracks which required fields are missing
  const [errors, setErrors] = useState<string[]>([]);
  const [showGenderModal, setShowGenderModal] = useState(false);

  // REQUIRED FIELDS (added room)
  const requiredKeys = useMemo(
    () => [
      "firstName",
      "lastName",
      "dob",
      "gender",
      "roomNumber",
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

  // Generic field setter. Accepts strings for text inputs and string[]
  // for multi-select fields like `foodAllergies`.
  const update = (key: keyof typeof form, value: string | string[]) => {
    setForm((p) => ({ ...p, [key]: value as any }));
    if (errors.includes(key)) setErrors((p) => p.filter((x) => x !== key));
  };

  // Coerce any field value to a clean string[] regardless of what's in
  // state. Needed because React Native fast-refresh can preserve the old
  // string-shaped value across hot reloads, and because backend reads may
  // hand us a comma-separated string instead of an array.
  const asStringArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
    if (typeof v === "string") {
      return v.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  // Kept for back-compat with existing call sites using the old name.
  const asAllergenArray = asStringArray;

  // Generic toggle for any chip-based multi-select field on the form.
  // Case-insensitive compare so "Peanuts" and "peanuts" never double-add.
  const toggleChip = (key: "foodAllergies" | "medicalConditions", value: string) => {
    setForm((p) => {
      const current = asStringArray((p as any)[key]);
      const exists = current.some((a) => a.toLowerCase() === value.toLowerCase());
      const next = exists
        ? current.filter((a) => a.toLowerCase() !== value.toLowerCase())
        : [...current, value];
      return { ...p, [key]: next };
    });
    if (errors.includes(key)) {
      setErrors((p) => p.filter((x) => x !== key));
    }
  };

  // Back-compat wrapper for the existing allergen chip.
  const toggleAllergen = (allergen: string) => toggleChip("foodAllergies", allergen);

  // Formats room input as `<digits><optional single letter>` while typing,
  // so the caller can't paste free-form text like "Bob's Room". Keeps up
  // to 4 digits followed by one uppercase A–Z. Anything else is stripped.
  // Examples: "101" → "101", "101a" → "101A", "12 B!" → "12B".
  const formatRoom = (raw: string) => {
    const cleaned = raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
    const match = cleaned.match(/^(\d{0,4})([A-Z]?)/);
    if (!match) return "";
    return `${match[1]}${match[2]}`;
  };

  // Formats date input as YYYY-MM-DD while typing
  const formatDob = (raw: string) => {
    // keep digits only, max 8 digits (YYYYMMDD)
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const yyyy = digits.slice(0, 4);
    const mm = digits.slice(4, 6);
    const dd = digits.slice(6, 8);

    let out = yyyy;
    if (mm.length) out += `-${mm}`;
    if (dd.length) out += `-${dd}`;
    return out;
  };

  const closeAndClear = () => {
    setErrors([]);
    setShowGenderModal(false);
    onClose();
  };

  const resetForm = () => {
    setForm({
      firstName: "",
      middleName: "",
      lastName: "",
      dob: "",
      gender: "",
      phone: "",
      roomNumber: "",
      emergencyContact: "",
      emergencyPhone: "",
      doctor: "",
      doctorPhone: "",
      medicalConditions: [] as string[],
      foodAllergies: [] as string[],
      dietaryRestrictions: "",
      medications: "",
    });
  };

  const submit = async () => {
    // required field validation (handles arrays for multi-select fields)
    const missing = requiredKeys.filter((k) => {
      const v = (form as any)[k];
      if (k === "foodAllergies") return asAllergenArray(v).length === 0;
      if (Array.isArray(v)) return v.length === 0;
      return !String(v ?? "").trim();
    });
    if (missing.length) {
      setErrors(missing);
      // If a collapsed chip picker is the problem, pop it open so the
      // user actually sees the options they need to pick.
      if (missing.includes("foodAllergies")) setAllergiesOpen(true);
      Alert.alert("Missing Fields", "Please fill out the highlighted fields.");
      return;
    }

    // Validate DOB format (YYYY-MM-DD)
    const dobOk = /^\d{4}-\d{2}-\d{2}$/.test(form.dob);
    if (!dobOk) {
      setErrors((p) => Array.from(new Set([...p, "dob"])));
      Alert.alert("Invalid Date", "Date of Birth must be in YYYY-MM-DD format.");
      return;
    }

    // Validate it’s a real date (not 2026-99-99)
    const [yyyy, mm, dd] = form.dob.split("-");
    const y = Number(yyyy),
      m = Number(mm),
      d = Number(dd);
    const dt = new Date(`${form.dob}T00:00:00`);
    const validRealDate =
      dt.getFullYear() === y && dt.getMonth() + 1 === m && dt.getDate() === d;

    if (!validRealDate) {
      setErrors((p) => Array.from(new Set([...p, "dob"])));
      Alert.alert("Invalid Date", "Please enter a real date (YYYY-MM-DD).");
      return;
    }

    // Validate Room format: 1-4 digits, optional single A–Z letter.
    // e.g. "101", "101A", "2045B". Rejects "Room 1", "ABC", "101AB", etc.
    const roomOk = /^\d{1,4}[A-Z]?$/.test(form.roomNumber.trim());
    if (!roomOk) {
      setErrors((p) => Array.from(new Set([...p, "roomNumber"])));
      Alert.alert(
        "Invalid Room",
        "Room must be a number with an optional letter (e.g. 101 or 101A)."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: form.lastName.trim(),
        room: form.roomNumber.trim(), // <-- send room
        // Backend stores foodAllergies as a single TEXT column, so flatten
        // the multi-select array to a comma-separated string. The read-side
        // (`normalizeStringArray` in api.ts) splits it back into an array.
        foodAllergies: asStringArray(form.foodAllergies).join(", "),
        dietaryRestrictions: String(form.dietaryRestrictions ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .join(", "),
        medicalConditions: asStringArray(form.medicalConditions).join(", "),
        // dob already in backend format YYYY-MM-DD
      };

      // const res = await fetch("https://traymate-auth.onrender.com/admin/residents", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json", Accept: "application/json" },
      //   body: JSON.stringify(payload),
      // });

      const token = await getAuthToken();

      const res = await fetch("https://traymate-auth.onrender.com/admin/residents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
        medicalConditions: [] as string[],
        foodAllergies: [] as string[],
        dietaryRestrictions: "",
        medications: "",
        roomNumber: "",
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
                    placeholder="YYYY-MM-DD"
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

              {/* Room (NEW) — digits + optional letter only (e.g. 101, 101A) */}
              <Text style={labelStyle("roomNumber")}>Room*</Text>
              <TextInput
                style={styles.modalInput}
                value={form.roomNumber}
                onChangeText={(v) => update("roomNumber", formatRoom(v))}
                placeholder="e.g., 101A"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={5}
              />

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

              {/* Medical Conditions — collapsed chip picker. Same pattern
                  as Food Allergies above. Names matching getUnsafeReason
                  (e.g. "Hypertension") auto-enforce safety rules. */}
              {(() => {
                const selectedConds = asStringArray(form.medicalConditions);
                const count = selectedConds.length;
                const preview = count
                  ? selectedConds.slice(0, 3).join(", ") + (count > 3 ? `, +${count - 3} more` : "")
                  : "None selected";
                return (
                  <>
                    <Pressable
                      onPress={() => setMedCondsOpen((v) => !v)}
                      style={styles.dropdownHeader}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalLabel}>Medical Conditions</Text>
                        <Text style={styles.dropdownPreview} numberOfLines={1}>
                          {preview}
                        </Text>
                      </View>
                      {count > 0 && (
                        <View style={styles.countBadge}>
                          <Text style={styles.countBadgeText}>{count}</Text>
                        </View>
                      )}
                      <Text style={styles.chevron}>{medCondsOpen ? "▲" : "▼"}</Text>
                    </Pressable>
                    {medCondsOpen && (
                      <>
                        <Text style={styles.chipHint}>Tap all that apply.</Text>
                        <View style={styles.chipWrap}>
                          {COMMON_MEDICAL_CONDITIONS.map((cond) => {
                            const selected = selectedConds.some(
                              (c) => c.toLowerCase() === cond.toLowerCase()
                            );
                            return (
                              <Pressable
                                key={cond}
                                onPress={() => toggleChip("medicalConditions", cond)}
                                style={[styles.chip, selected && styles.chipSelected]}
                              >
                                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                                  {selected ? "✓ " : ""}{cond}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </>
                    )}
                  </>
                );
              })()}

              {/* Food Allergies — collapsed chip picker. Header shows
                  selection count + preview; tap to expand the full grid. */}
              {(() => {
                const selectedAllergies = asStringArray(form.foodAllergies);
                const count = selectedAllergies.length;
                const preview = count
                  ? selectedAllergies.slice(0, 3).join(", ") + (count > 3 ? `, +${count - 3} more` : "")
                  : "None selected";
                return (
                  <>
                    <Pressable
                      onPress={() => setAllergiesOpen((v) => !v)}
                      style={[
                        styles.dropdownHeader,
                        errors.includes("foodAllergies") && styles.dropdownHeaderError,
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={labelStyle("foodAllergies")}>Food Allergies*</Text>
                        <Text style={styles.dropdownPreview} numberOfLines={1}>
                          {preview}
                        </Text>
                      </View>
                      {count > 0 && (
                        <View style={styles.countBadge}>
                          <Text style={styles.countBadgeText}>{count}</Text>
                        </View>
                      )}
                      <Text style={styles.chevron}>{allergiesOpen ? "▲" : "▼"}</Text>
                    </Pressable>
                    {allergiesOpen && (
                      <>
                        <Text style={styles.chipHint}>
                          Tap all that apply. Leave blank only if none confirmed.
                        </Text>
                        <View style={styles.chipWrap}>
                          {COMMON_ALLERGENS.map((allergen) => {
                            const selected = selectedAllergies.some(
                              (a) => a.toLowerCase() === allergen.toLowerCase()
                            );
                            return (
                              <Pressable
                                key={allergen}
                                onPress={() => toggleAllergen(allergen)}
                                style={[styles.chip, selected && styles.chipSelected]}
                              >
                                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                                  {selected ? "✓ " : ""}{allergen}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </>
                    )}
                  </>
                );
              })()}

              <Text style={styles.modalLabel}>Dietary Restrictions</Text>
              <TextInput
                style={styles.modalInput}
                value={String(form.dietaryRestrictions ?? "")}
                onChangeText={(v) => update("dietaryRestrictions", v)}
                placeholder="e.g., Vegetarian, Low Sodium"
              />

              <Text style={styles.modalLabel}>Medications</Text>
              <TextInput
                style={styles.modalInput}
                value={form.medications}
                onChangeText={(v) => update("medications", v)}
                placeholder="e.g., Metformin"
              />
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

  // Collapsible dropdown header for chip pickers.
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F3F3",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
    gap: 10,
  },
  dropdownHeaderError: {
    borderWidth: 1,
    borderColor: "#B91C1C",
  },
  dropdownPreview: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  chevron: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  // Multi-select chip picker for Food Allergies.
  chipHint: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#F3F3F3",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  chipSelected: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
