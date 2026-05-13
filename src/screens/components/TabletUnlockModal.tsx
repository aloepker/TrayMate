// components/TabletUnlockModal.tsx
//
// Numpad-based PIN entry shown when a caregiver / admin wants to
// unlock the kiosk-locked resident dashboard. Triggered by a 5-second
// long-press on the resident's name on the home screen.
//
// Default PIN is 1234; admins can change it in the admin dashboard.
// Three consecutive wrong PINs locks the keypad for 30 seconds.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";

import { getTabletModePin } from "../../services/storage";

const PIN_LENGTH = 4;
const COOLDOWN_MS = 30_000;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function TabletUnlockModal({ visible, onClose, onSuccess }: Props) {
  const [entered, setEntered] = useState<string>("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [verifying, setVerifying] = useState(false);
  const [shake, setShake] = useState(false);

  // Reset state every time the modal opens fresh.
  useEffect(() => {
    if (visible) {
      setEntered("");
      setVerifying(false);
      setShake(false);
    }
  }, [visible]);

  const cooldownRemaining = useMemo(() => {
    return Math.max(0, cooldownUntil - Date.now());
  }, [cooldownUntil, entered]);

  // Tick to refresh cooldown countdown.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const remaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const inCooldown = remaining > 0;

  const submit = useCallback(async (candidate: string) => {
    setVerifying(true);
    try {
      const realPin = await getTabletModePin();
      if (candidate === realPin) {
        setFailedAttempts(0);
        setEntered("");
        onSuccess();
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 300);
        setEntered("");
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        if (next >= 3) {
          setCooldownUntil(Date.now() + COOLDOWN_MS);
          setFailedAttempts(0);
        }
      }
    } finally {
      setVerifying(false);
    }
  }, [failedAttempts, onSuccess]);

  const onDigit = useCallback((d: string) => {
    if (inCooldown || verifying) return;
    setEntered((prev) => {
      if (prev.length >= PIN_LENGTH) return prev;
      const next = prev + d;
      if (next.length === PIN_LENGTH) {
        // Defer the submit so the last dot can render first.
        setTimeout(() => submit(next), 80);
      }
      return next;
    });
  }, [inCooldown, verifying, submit]);

  const onBackspace = useCallback(() => {
    if (inCooldown || verifying) return;
    setEntered((prev) => prev.slice(0, -1));
  }, [inCooldown, verifying]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.card, shake && s.cardShake]}>
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Tablet Mode</Text>
              <Text style={s.subtitle}>Enter staff PIN to unlock</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={s.closeBtn}>
              <Feather name="x" size={18} color="#6D6B3B" />
            </Pressable>
          </View>

          <View style={s.dotsRow}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  s.dot,
                  i < entered.length && s.dotFilled,
                  shake && s.dotError,
                ]}
              />
            ))}
          </View>

          {inCooldown ? (
            <Text style={s.cooldownText}>
              Too many wrong attempts. Try again in {remaining}s
            </Text>
          ) : (
            <Text style={s.hintText}>
              Default PIN is 1234. Ask the administrator if it's been changed.
            </Text>
          )}

          <View style={s.pad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <Pressable
                key={n}
                onPress={() => onDigit(String(n))}
                disabled={inCooldown || verifying}
                style={({ pressed }) => [
                  s.key,
                  (inCooldown || verifying) && { opacity: 0.4 },
                  pressed && !inCooldown && !verifying && s.keyPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Digit ${n}`}
              >
                <Text style={s.keyText}>{n}</Text>
              </Pressable>
            ))}
            <View style={s.key} />
            <Pressable
              onPress={() => onDigit("0")}
              disabled={inCooldown || verifying}
              style={({ pressed }) => [
                s.key,
                (inCooldown || verifying) && { opacity: 0.4 },
                pressed && !inCooldown && !verifying && s.keyPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Digit 0"
            >
              <Text style={s.keyText}>0</Text>
            </Pressable>
            <Pressable
              onPress={onBackspace}
              disabled={inCooldown || verifying || entered.length === 0}
              style={({ pressed }) => [
                s.key,
                (inCooldown || verifying || entered.length === 0) && { opacity: 0.4 },
                pressed && entered.length > 0 && s.keyPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Backspace"
            >
              <Feather name="delete" size={22} color="#3F3F1F" />
            </Pressable>
          </View>

          {verifying && (
            <View style={s.verifying}>
              <ActivityIndicator size="small" color="#6D6B3B" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
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
    padding: 22,
  },
  cardShake: {
    borderColor: "#C0392B",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  title: { fontSize: 19, fontWeight: "800", color: "#3F3F1F" },
  subtitle: { fontSize: 13, color: "#6D6B3B", marginTop: 2, fontWeight: "600" },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#F0E9CC",
    alignItems: "center", justifyContent: "center",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 12,
  },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: "#D9D0A0",
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: "#6D6B3B",
    borderColor: "#6D6B3B",
  },
  dotError: {
    borderColor: "#C0392B",
    backgroundColor: "#C0392B",
  },
  hintText: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginBottom: 18,
  },
  cooldownText: {
    fontSize: 13,
    color: "#C0392B",
    textAlign: "center",
    fontWeight: "700",
    marginBottom: 18,
  },
  pad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  key: {
    width: "31%",
    aspectRatio: 1.5,
    backgroundColor: "#F0E9CC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9D0A0",
    alignItems: "center",
    justifyContent: "center",
  },
  keyPressed: {
    backgroundColor: "#E5DDB8",
  },
  keyText: { fontSize: 24, fontWeight: "700", color: "#3F3F1F" },
  verifying: {
    marginTop: 10,
    alignItems: "center",
  },
});
