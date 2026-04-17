/**
 * MealtimeReminderBanner — slides down from the top when it's time to remind
 * the resident about an upcoming meal they haven't ordered yet.
 *
 * Tapping it calls onPress (typically navigates to browse meals).
 * Auto-dismisses after 6 seconds.
 */
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View, Platform } from "react-native";
import Feather from "react-native-vector-icons/Feather";

type Props = {
  visible: boolean;
  title: string;
  body: string;
  emoji: string;
  onPress: () => void;
  onDismiss: () => void;
};

const AUTO_HIDE_MS = 6000;

export default function MealtimeReminderBanner({
  visible,
  title,
  body,
  emoji,
  onPress,
  onDismiss,
}: Props) {
  const translateY = useRef(new Animated.Value(-140)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(hide, AUTO_HIDE_MS);
    } else {
      hide();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const hide = () => {
    Animated.timing(translateY, {
      toValue: -140,
      duration: 280,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  if (!visible) return null;

  return (
    <Animated.View style={[s.container, { transform: [{ translateY }] }]}>
      <Pressable
        style={s.inner}
        onPress={() => {
          hide();
          onPress();
        }}
      >
        <View style={s.iconWrap}>
          <Text style={s.emoji}>{emoji}</Text>
        </View>
        <View style={s.textWrap}>
          <Text style={s.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={s.body} numberOfLines={2}>
            {body}
          </Text>
        </View>
        <Pressable onPress={hide} hitSlop={10} style={s.closeBtn}>
          <Feather name="x" size={16} color="rgba(255,255,255,0.8)" />
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
    backgroundColor: "#c2410c", // warm orange to distinguish from message banner
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emoji: { fontSize: 24 },
  textWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: "900", color: "#FFFFFF" },
  body: { marginTop: 3, fontSize: 13, color: "rgba(255,255,255,0.92)", fontWeight: "600", lineHeight: 17 },
  closeBtn: { padding: 4, flexShrink: 0 },
});
