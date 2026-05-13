// components/TabletModeAdminControls.tsx
//
// Two small admin-only pieces:
//   - ResidentTabletModeToggle: per-resident on/off switch for Tablet Mode
//   - TabletPinButton: header button + modal to view / change the staff
//     unlock PIN (default 1234)
//
// Both are deliberately self-contained so they can drop into the admin
// dashboard without threading state through the whole screen.

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";

import {
  getTabletModePin,
  isTabletModeOn,
  setTabletMode,
  setTabletModePin,
} from "../../services/storage";
import {
  getTabletPin as apiGetPin,
  setTabletPin as apiSetPin,
  setResidentTabletMode as apiSetResidentTabletMode,
} from "../../services/api";

// ─────────────────────────────────────────────────────────────
// Per-resident toggle
// ─────────────────────────────────────────────────────────────

/**
 * Compact lock-icon button sized to match the row's edit / delete
 * actions. Tap flips the state with optimistic UI; persisted to the
 * backend and mirrored to local cache. Designed to live in the same
 * top-right action cluster as the other row icons, not as a separate
 * banner.
 */
export function ResidentTabletModeToggle({
  residentId,
  residentName,
}: {
  residentId: string | number;
  residentName?: string;
}) {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isTabletModeOn(residentId).then((v) => {
      if (!cancelled) setOn(v);
    });
    return () => { cancelled = true; };
  }, [residentId]);

  const flip = useCallback(async () => {
    if (busy) return;
    const next = !on;
    setOn(next); // optimistic
    setBusy(true);
    try {
      await apiSetResidentTabletMode(residentId, next);
      await setTabletMode(residentId, next);
    } catch (e: any) {
      try {
        await setTabletMode(residentId, next);
        console.warn("[TabletMode] backend save failed, saved locally only:", e?.message);
      } catch (e2: any) {
        setOn(!next);
        Alert.alert("Couldn't update Tablet Mode", e2?.message ?? e?.message ?? "unknown error");
      }
    } finally {
      setBusy(false);
    }
  }, [busy, on, residentId]);

  const label = on
    ? `Tablet Mode on${residentName ? ` for ${residentName}` : ""}. Tap to unlock the tablet.`
    : `Tablet Mode off${residentName ? ` for ${residentName}` : ""}. Tap to lock the tablet to this resident.`;

  return (
    <Pressable
      onPress={flip}
      hitSlop={6}
      disabled={on === null || busy}
      accessibilityRole="switch"
      accessibilityState={{ checked: on === true }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.lockIconBtn,
        on === true && s.lockIconBtnOn,
        (pressed || busy) && { opacity: 0.7 },
      ]}
    >
      {on === null || busy ? (
        <ActivityIndicator size="small" color="#6D6B3B" />
      ) : (
        <Feather
          name={on ? "lock" : "unlock"}
          size={16}
          color={on ? "#6D6B3B" : "#9A977A"}
        />
      )}
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────
// PIN editor (header button + modal)
// ─────────────────────────────────────────────────────────────

export function TabletPinButton() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Prefer the live value from the backend so the admin sees the
    // PIN that's actually in effect across the facility. Fall back to
    // the locally-cached value if the backend is unreachable.
    (async () => {
      try {
        const remote = await apiGetPin();
        setCurrent(remote);
        setDraft(remote);
        await setTabletModePin(remote); // refresh local cache
      } catch {
        const local = await getTabletModePin();
        setCurrent(local);
        setDraft(local);
      }
    })();
  }, [open]);

  const save = useCallback(async () => {
    if (!/^\d{4,6}$/.test(draft)) {
      Alert.alert("Invalid PIN", "PIN must be 4-6 digits.");
      return;
    }
    setSaving(true);
    try {
      // Push to backend so every tablet in the facility uses the same
      // PIN; mirror to local cache so this device works offline.
      await apiSetPin(draft);
      await setTabletModePin(draft);
      setCurrent(draft);
      Alert.alert("PIN updated", `Tablet Mode PIN is now ${draft}.`);
      setOpen(false);
    } catch (e: any) {
      // Backend unreachable — store locally so this admin's tablet
      // still uses the new PIN. Warn so they know it didn't sync.
      try {
        await setTabletModePin(draft);
        setCurrent(draft);
        Alert.alert(
          "Saved on this device only",
          "Couldn't reach the server, so other tablets still have the old PIN. Try again when you're back online.",
        );
        setOpen(false);
      } catch (e2: any) {
        Alert.alert("Couldn't save PIN", e2?.message ?? e?.message ?? "unknown error");
      }
    } finally {
      setSaving(false);
    }
  }, [draft]);

  return (
    <>
      <Pressable style={s.headerBtn} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Change Tablet Mode PIN">
        <Feather name="key" size={14} color="#6D6B3B" />
        <Text style={s.headerBtnText}>Tablet PIN</Text>
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <View style={s.backdrop}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>Tablet Mode PIN</Text>
                <Text style={s.cardSub}>Staff PIN to unlock a locked resident dashboard</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={12} style={s.closeBtn}>
                <Feather name="x" size={18} color="#6D6B3B" />
              </Pressable>
            </View>

            <Text style={s.fieldLabel}>Current PIN</Text>
            <Text style={s.currentPin}>{current ?? "…"}</Text>

            <Text style={[s.fieldLabel, { marginTop: 14 }]}>New PIN (4-6 digits)</Text>
            <TextInput
              style={s.input}
              value={draft}
              onChangeText={(t) => setDraft(t.replace(/[^0-9]/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="1234"
              placeholderTextColor="#ABABAB"
              secureTextEntry={false}
            />

            <Pressable
              onPress={save}
              disabled={saving || draft === current}
              style={({ pressed }) => [
                s.saveBtn,
                (saving || draft === current) && { opacity: 0.5 },
                pressed && !saving && { opacity: 0.85 },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Feather name="check" size={16} color="#FFF" />
              )}
              <Text style={s.saveBtnText}>{saving ? "Saving…" : "Save PIN"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // compact lock-icon button (sits in the row's action cluster)
  lockIconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#F0E9CC",
    borderWidth: 1, borderColor: "#E5DDB8",
    alignItems: "center", justifyContent: "center",
  },
  lockIconBtnOn: {
    backgroundColor: "#E5DDB8",
    borderColor: "#D9D0A0",
  },

  // header button
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F0E9CC",
    borderWidth: 1,
    borderColor: "#D9D0A0",
  },
  headerBtnText: { fontSize: 12, fontWeight: "700", color: "#6D6B3B" },

  // modal
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FBF7E8",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5DDB8",
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#3F3F1F" },
  cardSub: { fontSize: 12, color: "#6D6B3B", marginTop: 2, fontWeight: "600" },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#F0E9CC",
    alignItems: "center", justifyContent: "center",
  },
  fieldLabel: { fontSize: 11, fontWeight: "800", color: "#888", textTransform: "uppercase", letterSpacing: 0.6 },
  currentPin: {
    fontSize: 24, fontWeight: "800", color: "#3F3F1F",
    letterSpacing: 4, marginTop: 4,
  },
  input: {
    fontSize: 22, fontWeight: "700", color: "#3F3F1F",
    backgroundColor: "#F0E9CC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D9D0A0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
    letterSpacing: 4,
    textAlign: "center",
  },
  saveBtn: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#6D6B3B",
  },
  saveBtnText: { fontSize: 14, fontWeight: "800", color: "#FFF" },
});
