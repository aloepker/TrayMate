// components/ConfirmDeleteModal.tsx
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Feather from "react-native-vector-icons/Feather"; //import { Feather } from "@expo/vector-icons";

type EntityKind = "resident" | "caregiver" | "kitchen";

type Props = {
  visible: boolean;
  kind: EntityKind | null; // which type we are deleting
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

function kindLabel(kind: EntityKind) {
  if (kind === "resident") return "resident";
  if (kind === "caregiver") return "caregiver";
  return "kitchen staff member";
}

export default function ConfirmDeleteModal({
  visible,
  kind,
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Confirm Delete</Text>

            <Pressable
              onPress={onCancel}
              disabled={loading}
              hitSlop={10}
              style={({ pressed }) => [styles.xBtn, pressed && styles.pressed]}
            >
              <Feather name="x" size={22} color="#111827" />
            </Pressable>
          </View>

          <Text style={styles.message}>
            Are you sure you want to delete this {kind ? kindLabel(kind) : "item"}?
          </Text>
          <Text style={styles.sub}>
            This action can’t be undone.
          </Text>

          <Pressable
            onPress={onConfirm}
            disabled={loading}
            style={({ pressed }) => [
              styles.dangerBtn,
              pressed && styles.pressed,
              loading && { opacity: 0.8 },
            ]}
          >
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.dangerText}>Delete</Text>
            )}
          </Pressable>

          <Pressable onPress={onCancel} disabled={loading} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: "900", color: "#111827" },

  xBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
  },
  pressed: { opacity: 0.7 },

  message: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  sub: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  dangerBtn: {
    marginTop: 16,
    backgroundColor: "#B91C1C",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  dangerText: { color: "#fff", fontWeight: "900" },

  cancelBtn: { marginTop: 12, alignItems: "center" },
  cancelText: { fontWeight: "800", color: "#6B7280" },
});