// components/EditResidentModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type ResidentLike = {
  id: string;
  name: string;
  room: string;
  dietaryRestrictions: string[];
};

type Props = {
  visible: boolean;
  resident: ResidentLike | null;
  onClose: () => void;
  onUpdate: (updated: ResidentLike) => Promise<void> | void; // UI update in parent
};

export default function EditResidentModal({
  visible,
  resident,
  onClose,
  onUpdate,
}: Props) {
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [dietary, setDietary] = useState(""); // comma separated

  useEffect(() => {
    if (!resident) return;
    setName(resident.name ?? "");
    setRoom(resident.room ?? "");
    setDietary((resident.dietaryRestrictions ?? []).join(", "));
  }, [resident]);

  const parsedDietary = useMemo(() => {
    return dietary
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [dietary]);

  const submit = async () => {
    if (!resident) return;

    try {
      setSaving(true);

      // Frontend-ready update (optimistic)
      await onUpdate({
        id: resident.id,
        name: name.trim(),
        room: room.trim(),
        dietaryRestrictions: parsedDietary,
      });

      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Resident</Text>
            <Pressable onPress={onClose} disabled={saving}>
              <Text style={styles.closeX}>×</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter resident name"
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Room</Text>
            <TextInput
              value={room}
              onChangeText={setRoom}
              placeholder="Enter room number"
              autoCapitalize="characters"
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Dietary Restrictions</Text>
            <TextInput
              value={dietary}
              onChangeText={setDietary}
              placeholder="Enter dietary restrictions (comma-separated)"
              style={styles.modalInput}
            />

            {/* This field exists in your screenshot, but your current resident model
                doesn't store it. We keep the UI aligned but optional for now. */}
            <Text style={styles.modalLabel}>Medical Needs</Text>
            <TextInput
              placeholder="Enter medical needs (comma-separated)"
              style={styles.modalInput}
            />
          </ScrollView>

          <Pressable style={styles.modalPrimaryBtn} onPress={submit} disabled={saving}>
            {saving ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.modalPrimaryText}>Update Resident</Text>
            )}
          </Pressable>

          <Pressable onPress={onClose} disabled={saving}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
    maxWidth: 520,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    ...Platform.select({
      web: { boxShadow: "0px 10px 30px rgba(0,0,0,0.15)" } as any,
      default: { elevation: 4 },
    }),
  },
 modalCancel: {
  marginTop: 12,
  textAlign: "center",
  fontWeight: "800",
  color: "#6B7280",
},
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  closeX: { fontSize: 26, fontWeight: "900", color: "#111827", marginTop: -6 },

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
});
