/**
 * ResidentChatModal — resident-only chat with their ASSIGNED caregiver(s).
 * - 0 caregivers: shows "No caregiver assigned" empty state
 * - 1 caregiver: goes directly into chat (original behavior)
 * - 2+ caregivers: shows a selection list first, then opens chat with chosen one
 * Backward-compatible: still accepts single assignedCaregiverId/assignedCaregiverName props.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import Feather from "react-native-vector-icons/Feather";
import {
  getConversation,
  sendMessage,
  getMe,
} from "../../../services/api";
import { Message } from "./messagingTypes";

type CaregiverEntry = { caregiverId: string; caregiverName: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Array of caregivers assigned to this resident */
  assignedCaregivers?: CaregiverEntry[];
  /** Backward-compat: single caregiver ID */
  assignedCaregiverId?: string | null;
  /** Backward-compat: single caregiver name */
  assignedCaregiverName?: string | null;
};

const OLIVE       = "#717644";
const OLIVE_LIGHT = "#F0EEE4";

export default function ResidentChatModal({
  visible,
  onClose,
  assignedCaregivers,
  assignedCaregiverId   = null,
  assignedCaregiverName = null,
}: Props) {
  // Derive the effective list of caregivers
  const effectiveCaregivers: CaregiverEntry[] = assignedCaregivers && assignedCaregivers.length > 0
    ? assignedCaregivers
    : (assignedCaregiverId
        ? [{ caregiverId: assignedCaregiverId, caregiverName: assignedCaregiverName ?? "Caregiver" }]
        : []);

  const isMulti = effectiveCaregivers.length > 1;

  // When there's only one caregiver, auto-select it; otherwise null until user picks
  const [selectedCaregiver, setSelectedCaregiver] = useState<CaregiverEntry | null>(
    effectiveCaregivers.length === 1 ? effectiveCaregivers[0] : null
  );

  const [messages,    setMessages]    = useState<Message[]>([]);
  const [myId,        setMyId]        = useState<string | null>(null);
  const [text,        setText]        = useState("");
  const [loadingInit, setLoadingInit] = useState(false);
  const [sending,     setSending]     = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // Re-derive selected caregiver when props change
  useEffect(() => {
    if (effectiveCaregivers.length === 1) {
      setSelectedCaregiver(effectiveCaregivers[0]);
    } else if (effectiveCaregivers.length === 0) {
      setSelectedCaregiver(null);
    }
    // For multi, keep current selection unless it's no longer in the list
  }, [visible]);

  // ─── Init chat when a caregiver is selected ─────────────────────────────────

  useEffect(() => {
    if (!visible || !selectedCaregiver) return;
    initChat(selectedCaregiver.caregiverId);
  }, [visible, selectedCaregiver]);

  const initChat = async (cgId: string) => {
    setLoadingInit(true);
    try {
      const [meRes, msgsRes] = await Promise.allSettled([
        getMe(),
        getConversation(cgId),
      ]);

      if (meRes.status === "fulfilled") setMyId(String(meRes.value.id));

      const msgs = msgsRes.status === "fulfilled" && Array.isArray(msgsRes.value)
        ? msgsRes.value : [];
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
    } catch (e) {
      console.warn("ResidentChatModal init error:", e);
    } finally {
      setLoadingInit(false);
    }
  };

  // ─── Send ──────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!selectedCaregiver || !text.trim()) return;
    const body = text.trim();
    setText("");
    setSending(true);
    try {
      await sendMessage(selectedCaregiver.caregiverId, body);
      const updated = await getConversation(selectedCaregiver.caregiverId);
      setMessages(Array.isArray(updated) ? updated : []);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const formatTime = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const now   = new Date();
    const today =
      d.getDate()     === now.getDate()  &&
      d.getMonth()    === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    return today
      ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handleClose = () => {
    setMessages([]);
    setText("");
    if (!isMulti) {
      // For single caregiver, keep selectedCaregiver so next open auto-loads
    } else {
      setSelectedCaregiver(null);
    }
    onClose();
  };

  const handleBack = () => {
    setMessages([]);
    setText("");
    setSelectedCaregiver(null);
  };

  const cgInitial = selectedCaregiver
    ? selectedCaregiver.caregiverName.charAt(0).toUpperCase()
    : "?";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.backdrop}>
        <View style={s.sheet}>

          {/* ── Header ── */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              {isMulti && selectedCaregiver && (
                <Pressable onPress={handleBack} hitSlop={12} style={s.backBtn}>
                  <Feather name="arrow-left" size={20} color={OLIVE} />
                </Pressable>
              )}
              <View style={s.headerIcon}>
                <Feather name="message-square" size={18} color={OLIVE} />
              </View>
              <View>
                <Text style={s.headerTitle}>Contact Caregiver</Text>
                <Text style={s.headerSub}>
                  {selectedCaregiver
                    ? `Chatting with ${selectedCaregiver.caregiverName}`
                    : "Your care team messages"}
                </Text>
              </View>
            </View>
            <Pressable onPress={handleClose} hitSlop={12} style={s.closeBtn}>
              <Feather name="x" size={22} color="#4B5563" />
            </Pressable>
          </View>

          {/* ── Body ── */}
          {effectiveCaregivers.length === 0 ? (

            /* No caregiver assigned yet */
            <View style={s.unassignedState}>
              <View style={s.unassignedIcon}>
                <Feather name="user-x" size={36} color={OLIVE} />
              </View>
              <Text style={s.unassignedTitle}>No caregiver assigned</Text>
              <Text style={s.unassignedSub}>
                An admin will assign a caregiver to your account.{"\n"}
                Check back soon or ask a staff member for help.
              </Text>
            </View>

          ) : isMulti && !selectedCaregiver ? (

            /* Caregiver selection list */
            <ScrollView style={s.pickerScroll} contentContainerStyle={s.pickerContent}>
              <Text style={s.pickerTitle}>Select a caregiver to message</Text>
              {effectiveCaregivers.map((cg) => (
                <Pressable
                  key={cg.caregiverId}
                  style={s.pickerCard}
                  onPress={() => {
                    setMessages([]);
                    setSelectedCaregiver(cg);
                  }}
                >
                  <View style={s.pickerAvatar}>
                    <Text style={s.pickerAvatarText}>{cg.caregiverName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={s.pickerInfo}>
                    <Text style={s.pickerName}>{cg.caregiverName}</Text>
                    <Text style={s.pickerLabel}>Assigned caregiver</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#9CA3AF" />
                </Pressable>
              ))}
            </ScrollView>

          ) : selectedCaregiver ? (

            <View style={s.chatWrap}>

              {/* Caregiver info bar */}
              <View style={s.cgBar}>
                <View style={s.cgAvatar}>
                  <Text style={s.cgAvatarText}>{cgInitial}</Text>
                </View>
                <View>
                  <Text style={s.cgName}>{selectedCaregiver.caregiverName}</Text>
                  <Text style={s.cgLabel}>Your assigned caregiver</Text>
                </View>
              </View>

              {/* Messages */}
              <ScrollView
                ref={scrollRef}
                style={s.messagesArea}
                contentContainerStyle={s.messagesContent}
                showsVerticalScrollIndicator={false}
              >
                {loadingInit ? (
                  <View style={s.centerWrap}>
                    <ActivityIndicator color={OLIVE} />
                  </View>
                ) : messages.length === 0 ? (
                  <View style={s.emptyMsgs}>
                    <Feather name="message-circle" size={32} color="#D1D5DB" />
                    <Text style={s.emptyMsgsText}>No messages yet — say hello! 👋</Text>
                  </View>
                ) : (
                  messages.map((msg) => {
                    const isOut = myId !== null && String(msg.senderId) === String(myId);
                    return (
                      <View key={msg.id} style={[s.bubbleRow, isOut ? s.bubbleRowOut : s.bubbleRowIn]}>
                        {!isOut && (
                          <View style={s.bubbleAvatar}>
                            <Text style={s.bubbleAvatarText}>{cgInitial}</Text>
                          </View>
                        )}
                        <View style={[s.bubble, isOut ? s.bubbleOut : s.bubbleIn]}>
                          <Text style={[s.bubbleText, isOut ? s.bubbleTextOut : s.bubbleTextIn]}>
                            {msg.content}
                          </Text>
                          <Text style={[s.bubbleTime, isOut && s.bubbleTimeOut]}>
                            {formatTime(msg.createdAt)}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {/* Input */}
              <View style={s.inputRow}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={`Message ${selectedCaregiver.caregiverName}...`}
                  placeholderTextColor="#9CA3AF"
                  style={s.input}
                  multiline
                />
                <Pressable
                  style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={!text.trim() || sending}
                >
                  {sending
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Feather name="send" size={16} color="#FFF" />
                  }
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "75%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },

  // Header
  header:      { height: 70, borderBottomWidth: 1, borderBottomColor: "#E8E5DE", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: OLIVE_LIGHT },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon:  { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: OLIVE + "40" },
  headerTitle: { fontSize: 17, fontWeight: "900", color: "#1F2937" },
  headerSub:   { marginTop: 2, fontSize: 12, color: "#6B7280", fontWeight: "600" },
  closeBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },

  // No caregiver assigned
  unassignedState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 14 },
  unassignedIcon:  { width: 84, height: 84, borderRadius: 42, backgroundColor: OLIVE_LIGHT, alignItems: "center", justifyContent: "center" },
  unassignedTitle: { fontSize: 20, fontWeight: "900", color: "#374151", textAlign: "center" },
  unassignedSub:   { fontSize: 14, color: "#9CA3AF", textAlign: "center", lineHeight: 22 },

  // Caregiver picker list
  pickerScroll:   { flex: 1 },
  pickerContent:  { padding: 20, gap: 12 },
  pickerTitle:    { fontSize: 15, fontWeight: "700", color: "#374151", marginBottom: 4 },
  pickerCard:     { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#FAFAF8", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E8E5DE" },
  pickerAvatar:   { width: 44, height: 44, borderRadius: 22, backgroundColor: OLIVE, alignItems: "center", justifyContent: "center" },
  pickerAvatarText: { fontSize: 18, fontWeight: "900", color: "#FFF" },
  pickerInfo:     { flex: 1 },
  pickerName:     { fontSize: 15, fontWeight: "900", color: "#1F2937" },
  pickerLabel:    { marginTop: 2, fontSize: 12, color: "#6B7280", fontWeight: "600" },

  // Chat wrap
  chatWrap: { flex: 1 },

  // Caregiver info bar
  cgBar:       { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#ECECEC", backgroundColor: "#FAFAF8" },
  cgAvatar:    { width: 44, height: 44, borderRadius: 22, backgroundColor: OLIVE, alignItems: "center", justifyContent: "center" },
  cgAvatarText:{ fontSize: 18, fontWeight: "900", color: "#FFF" },
  cgName:      { fontSize: 15, fontWeight: "900", color: "#1F2937" },
  cgLabel:     { marginTop: 2, fontSize: 12, color: "#6B7280", fontWeight: "600" },

  // Messages
  messagesArea:    { flex: 1, backgroundColor: "#F9F8F6" },
  messagesContent: { padding: 16, paddingBottom: 12 },

  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },

  emptyMsgs:     { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyMsgsText: { fontSize: 14, color: "#9CA3AF", fontWeight: "700" },

  bubbleRow:    { flexDirection: "row", alignItems: "flex-end", marginBottom: 10, gap: 8 },
  bubbleRowOut: { justifyContent: "flex-end" },
  bubbleRowIn:  { justifyContent: "flex-start" },

  bubbleAvatar:     { width: 28, height: 28, borderRadius: 14, backgroundColor: OLIVE_LIGHT, alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 },
  bubbleAvatarText: { fontSize: 12, fontWeight: "800", color: OLIVE },

  bubble:        { maxWidth: "72%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOut:     { backgroundColor: OLIVE, borderBottomRightRadius: 4 },
  bubbleIn:      { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#E5E7EB" },
  bubbleText:    { fontSize: 14, lineHeight: 20 },
  bubbleTextOut: { color: "#FFF" },
  bubbleTextIn:  { color: "#1F2937" },
  bubbleTime:    { marginTop: 4, fontSize: 10, color: "rgba(255,255,255,0.55)", alignSelf: "flex-end" },
  bubbleTimeOut: { color: "rgba(255,255,255,0.55)" },

  // Input
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: "#ECECEC", backgroundColor: "#FFF" },
  input:    { flex: 1, minHeight: 46, maxHeight: 110, borderRadius: 24, backgroundColor: "#F3F4F6", paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: "#1F2937", borderWidth: 1, borderColor: "#E5E7EB" },
  sendBtn:         { width: 46, height: 46, borderRadius: 23, backgroundColor: OLIVE, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.4 },
});
