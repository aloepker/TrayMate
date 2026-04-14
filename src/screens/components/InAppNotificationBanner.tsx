/**
 * InAppNotificationBanner — slides down from the top when a new message arrives.
 * Auto-dismisses after 4 seconds. Tapping it calls onPress.
 */
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View, Platform } from "react-native";
import Feather from "react-native-vector-icons/Feather";

type Props = {
  visible: boolean;
  senderName: string;
  preview: string;
  onPress: () => void;
  onDismiss: () => void;
};

const AUTO_HIDE_MS = 4000;

export default function InAppNotificationBanner({
  visible,
  senderName,
  preview,
  onPress,
  onDismiss,
}: Props) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      // Auto-hide
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        hide();
      }, AUTO_HIDE_MS);
    } else {
      hide();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const hide = () => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 280,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  if (!visible) return null;

  return (
    <Animated.View style={[s.container, { transform: [{ translateY }] }]}>
      <Pressable style={s.inner} onPress={() => { hide(); onPress(); }}>
        <View style={s.iconWrap}>
          <Feather name="phone-call" size={20} color="#FFFFFF" />
        </View>
        <View style={s.textWrap}>
          <Text style={s.sender} numberOfLines={1}>
            Message from {senderName}
          </Text>
          <Text style={s.preview} numberOfLines={1}>
            {preview}
          </Text>
        </View>
        <Pressable onPress={() => hide()} hitSlop={10} style={s.closeBtn}>
          <Feather name="x" size={16} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 16,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#717644",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textWrap: { flex: 1 },
  sender:   { fontSize: 14, fontWeight: "900", color: "#FFFFFF" },
  preview:  { marginTop: 2, fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "600" },
  closeBtn: { padding: 4, flexShrink: 0 },
});
