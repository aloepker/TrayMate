/**
 * ResidentChatModal — resident-only chat interface.
 * Residents can ONLY message caregivers (ROLE_CAREGIVER).
 * Uses a dedicated bell/care icon to distinguish from staff messaging.
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
  getChats,
  getConversation,
  sendMessage,
  getMessageUsers,
  getMe,
} from "../../../services/api";
import { ChatPreview, Message, MessageUser } from "./messagingTypes";

type Props = {
  visible: boolean;
  onClose: () => void;
};

type CaregiverEntry = {
  id: string;
  name: string;
  preview: string;
  previewAt: string;
  isUnread: boolean;
};

const OLIVE = "#717644";
const OLIVE_LIGHT = "#F0EEE4";

export default function ResidentChatModal({ visible, onClose }: Props) {
  const [caregivers, setCaregivers]   = useState<CaregiverEntry[]>([]);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [myId, setMyId]               = useState<string | null>(null);
  const [text, setText]               = useState("");
  const [loadingInit, setLoadingInit] = useState(false);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const [sending, setSending]         = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // ─── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!visible) return;
    init();
  }, [visible]);

  const init = async () => {
    setLoadingInit(true);
    try {
      const [meRes, usersRes, chatsRes] = await Promise.allSettled([
        getMe(),
        getMessageUsers(),
        getChats(),
      ]);

      const me = meRes.status === "fulfilled" ? String(meRes.value.id) : null;
      setMyId(me);

      // Only keep caregivers
      const allUsers: MessageUser[] =
        usersRes.status === "fulfilled" ? usersRes.value : [];
      const cgUsers = allUsers.filter(
        (u) => u.role === "ROLE_CAREGIVER" && u.id !== me
      );

      // Build preview map from chat history
      const chatList: ChatPreview[] =
        chatsRes.status === "fulfilled" && Array.isArray(chatsRes.value)
          ? chatsRes.value
          : [];

      const previewMap: Record<string, { preview: string; at: string; unread: boolean }> = {};
      chatList.forEach((chat) => {
        const isMine = me !== null && String(chat.senderId) === me;
        const other  = isMine ? String(chat.receiverId) : String(chat.senderId);
        const ex     = previewMap[other];
        if (!ex || new Date(chat.createdAt) > new Date(ex.at)) {
          previewMap[other] = {
            preview: chat.content || "",
            at:      chat.createdAt,
            unread:  !isMine && !chat.isRead,
          };
        }
      });

      // Build caregiver entries — include ones with history even if not in user list
      const seenIds = new Set<string>();
      const entries: CaregiverEntry[] = [];

      cgUsers.forEach((u) => {
        seenIds.add(u.id);
        const p = previewMap[u.id];
        entries.push({ id: u.id, name: u.fullName, preview: p?.preview ?? "", previewAt: p?.at ?? "", isUnread: p?.unread ?? false });
      });

      // Caregivers only in chat history (no longer in user list but chatted before)
      chatList.forEach((chat) => {
        const candidates = [
          { id: String(chat.senderId),   name: chat.senderName   || `User ${chat.senderId}` },
          { id: String(chat.receiverId), name: chat.receiverName || `User ${chat.receiverId}` },
        ];
        candidates.forEach((c) => {
          if (c.id === me || seenIds.has(c.id)) return;
          const p = previewMap[c.id];
          if (!p) return; // no actual history with this user
          seenIds.add(c.id);
          entries.push({ id: c.id, name: c.name, preview: p.preview, previewAt: p.at, isUnread: p.unread });
        });
      });

      // Sort: most recent first
      entries.sort((a, b) => {
        if (a.previewAt && b.previewAt) return new Date(b.previewAt).getTime() - new Date(a.previewAt).getTime();
        if (a.previewAt) return -1;
        if (b.previewAt) return 1;
        return a.name.localeCompare(b.name);
      });

      setCaregivers(entries);

      // Auto-select the most recent conversation
      if (entries.length > 0 && !selectedId) {
        loadConversation(entries[0].id, me);
      }
    } catch (e) {
      console.warn("ResidentChatModal init error:", e);
    } finally {
      setLoadingInit(false);
    }
  };

  // ─── Load conversation ─────────────────────────────────────────────────────

  const loadConversation = async (userId: string, overrideMyId?: string | null) => {
    setSelectedId(userId);
    setLoadingConvo(true);
    try {
      const data = await getConversation(userId);
      const msgs = Array.isArray(data) ? data : [];
      setMessages(msgs);
      // Mark as read in preview
      setCaregivers((prev) =>
        prev.map((cg) => (cg.id === userId ? { ...cg, isUnread: false } : cg))
      );
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
    } catch {
      setMessages([]);
    } finally {
      setLoadingConvo(false);
    }
  };

  // ─── Send ──────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!selectedId || !text.trim()) return;
    const body = text.trim();
    setText("");
    setSending(true);
    try {
      await sendMessage(selectedId, body);
      const updated = await getConversation(selectedId);
      const msgs    = Array.isArray(updated) ? updated : [];
      setMessages(msgs);
      const last = msgs[msgs.length - 1];
      if (last) {
        setCaregivers((prev) =>
          prev.map((cg) =>
            cg.id === selectedId
              ? { ...cg, preview: last.content || body, previewAt: last.createdAt, isUnread: false }
              : cg
          )
        );
      }
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
    const now = new Date();
    const today =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    return today
      ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const selectedCg = caregivers.find((cg) => cg.id === selectedId);
  const totalUnread = caregivers.filter((cg) => cg.isUnread).length;

  const handleClose = () => {
    setSelectedId(null);
    setMessages([]);
    onClose();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.backdrop}>
        <View style={s.sheet}>

          {/* ── Header ── */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.headerIcon}>
                <Feather name="phone-call" size={18} color={OLIVE} />
              </View>
              <View>
                <Text style={s.headerTitle}>Contact Caregiver</Text>
                <Text style={s.headerSub}>
                  {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? "s" : ""}` : "Send a message to your care team"}
                </Text>
              </View>
            </View>
            <Pressable onPress={handleClose} hitSlop={10} style={s.closeBtn}>
              <Feather name="x" size={22} color="#4B5563" />
            </Pressable>
          </View>

          <View style={s.body}>

            {/* ── Caregiver list (left panel) ── */}
            <View style={s.sidebar}>
              {loadingInit ? (
                <View style={s.centerWrap}>
                  <ActivityIndicator color={OLIVE} />
                </View>
              ) : caregivers.length === 0 ? (
                <View style={s.centerWrap}>
                  <Feather name="user-x" size={32} color="#D1D5DB" />
                  <Text style={s.emptyTitle}>No caregivers</Text>
                  <Text style={s.emptySub}>No caregiver is assigned yet</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {caregivers.map((cg) => {
                    const active = cg.id === selectedId;
                    return (
                      <Pressable
                        key={cg.id}
                        style={[s.cgItem, active && s.cgItemActive]}
                        onPress={() => loadConversation(cg.id)}
                      >
                        <View style={[s.avatar, active && s.avatarActive]}>
                          <Text style={[s.avatarText, active && s.avatarTextActive]}>
                            {cg.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={s.cgInfo}>
                          <View style={s.cgRow}>
                            <Text style={[s.cgName, active && s.cgNameActive]} numberOfLines={1}>
                              {cg.name}
                            </Text>
                            {!!cg.previewAt && (
                              <Text style={[s.cgTime, active && s.cgTimeActive]}>
                                {formatTime(cg.previewAt)}
                              </Text>
                            )}
                          </View>
                          <Text style={[s.cgRole, active && s.cgRoleActive]}>Caregiver</Text>
                          {!!cg.preview && (
                            <Text style={[s.cgPreview, active && s.cgPreviewActive]} numberOfLines={1}>
                              {cg.preview}
                            </Text>
                          )}
                        </View>
                        {cg.isUnread && <View style={s.unreadDot} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* ── Chat panel ── */}
            <View style={s.chatPanel}>
              {!selectedId ? (
                <View style={s.emptyState}>
                  <View style={s.emptyIconCircle}>
                    <Feather name="phone-call" size={36} color={OLIVE} />
                  </View>
                  <Text style={s.emptyStateTitle}>Select a caregiver</Text>
                  <Text style={s.emptyStateSub}>Choose someone from the list to start a conversation</Text>
                </View>
              ) : (
                <>
                  {/* Chat header */}
                  <View style={s.chatHeader}>
                    <View style={s.avatarSm}>
                      <Text style={s.avatarSmText}>
                        {selectedCg?.name.charAt(0).toUpperCase() ?? "?"}
                      </Text>
                    </View>
                    <View>
                      <Text style={s.chatHeaderName}>{selectedCg?.name ?? "Caregiver"}</Text>
                      <Text style={s.chatHeaderRole}>Your Caregiver</Text>
                    </View>
                  </View>

                  {/* Messages */}
                  <ScrollView
                    ref={scrollRef}
                    style={s.messagesArea}
                    contentContainerStyle={s.messagesContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {loadingConvo ? (
                      <View style={s.centerWrap}>
                        <ActivityIndicator color={OLIVE} />
                      </View>
                    ) : messages.length === 0 ? (
                      <View style={s.emptyMsgs}>
                        <Feather name="message-circle" size={28} color="#D1D5DB" />
                        <Text style={s.emptyMsgsText}>No messages yet — say hello!</Text>
                      </View>
                    ) : (
                      messages.map((msg) => {
                        const isOut = myId !== null && String(msg.senderId) === String(myId);
                        return (
                          <View key={msg.id} style={[s.bubbleRow, isOut ? s.bubbleRowOut : s.bubbleRowIn]}>
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
                      placeholder="Message your caregiver..."
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
                </>
              )}
            </View>
          </View>
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
    height: "78%",
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
  header:      { height: 72, borderBottomWidth: 1, borderBottomColor: "#ECECEC", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: OLIVE_LIGHT },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon:  { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: OLIVE + "40" },
  headerTitle: { fontSize: 17, fontWeight: "900", color: "#1F2937" },
  headerSub:   { marginTop: 2, fontSize: 12, color: "#6B7280", fontWeight: "600" },
  closeBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },

  body: { flex: 1, flexDirection: "row" },

  // Sidebar
  sidebar: { width: 260, borderRightWidth: 1, borderRightColor: "#ECECEC", backgroundColor: "#FAFAF8", paddingHorizontal: 8, paddingTop: 10, paddingBottom: 8 },

  cgItem:       { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 10, marginBottom: 6, position: "relative", backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E8E5DE" },
  cgItemActive: { backgroundColor: OLIVE, borderColor: OLIVE },
  cgInfo:       { flex: 1, minWidth: 0 },
  cgRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cgName:       { flex: 1, fontSize: 14, fontWeight: "800", color: "#1F2937" },
  cgNameActive: { color: "#FFF" },
  cgTime:       { fontSize: 11, color: "#9CA3AF", fontWeight: "600", flexShrink: 0 },
  cgTimeActive: { color: "rgba(255,255,255,0.75)" },
  cgRole:       { fontSize: 11, color: "#9CA3AF", fontWeight: "600", marginTop: 1 },
  cgRoleActive: { color: "rgba(255,255,255,0.75)" },
  cgPreview:    { marginTop: 3, fontSize: 12, color: "#6B7280" },
  cgPreviewActive: { color: "#F0EDE5" },
  unreadDot:    { position: "absolute", top: 8, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: "#DC2626", borderWidth: 2, borderColor: "#FFF" },

  avatar:          { width: 40, height: 40, borderRadius: 20, backgroundColor: OLIVE_LIGHT, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarActive:    { backgroundColor: "rgba(255,255,255,0.2)" },
  avatarText:      { fontSize: 16, fontWeight: "800", color: OLIVE },
  avatarTextActive:{ color: "#FFF" },

  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 40 },
  emptyTitle: { fontSize: 14, fontWeight: "800", color: "#9CA3AF" },
  emptySub:   { fontSize: 12, color: "#C4C9D4", fontWeight: "600", textAlign: "center" },

  // Chat panel
  chatPanel:  { flex: 1 },
  chatHeader: { height: 68, borderBottomWidth: 1, borderBottomColor: "#ECECEC", flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, backgroundColor: "#FAFAF8" },
  avatarSm:     { width: 38, height: 38, borderRadius: 19, backgroundColor: OLIVE_LIGHT, alignItems: "center", justifyContent: "center" },
  avatarSmText: { fontSize: 16, fontWeight: "800", color: OLIVE },
  chatHeaderName: { fontSize: 15, fontWeight: "900", color: "#1F2937" },
  chatHeaderRole: { marginTop: 1, fontSize: 12, color: "#6B7280", fontWeight: "700" },

  messagesArea:    { flex: 1, backgroundColor: "#F9F8F6" },
  messagesContent: { padding: 16, paddingBottom: 8 },

  bubbleRow:    { marginBottom: 10 },
  bubbleRowOut: { alignItems: "flex-end" },
  bubbleRowIn:  { alignItems: "flex-start" },
  bubble:        { maxWidth: "72%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOut:     { backgroundColor: OLIVE, borderBottomRightRadius: 4 },
  bubbleIn:      { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#E5E7EB" },
  bubbleText:    { fontSize: 14, lineHeight: 20 },
  bubbleTextOut: { color: "#FFF" },
  bubbleTextIn:  { color: "#1F2937" },
  bubbleTime:    { marginTop: 4, fontSize: 10, color: "#9CA3AF", alignSelf: "flex-end" },
  bubbleTimeOut: { color: "rgba(255,255,255,0.6)" },

  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: "#ECECEC", backgroundColor: "#FFF" },
  input:    { flex: 1, minHeight: 46, maxHeight: 110, borderRadius: 24, backgroundColor: "#F3F4F6", paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: "#1F2937", borderWidth: 1, borderColor: "#E5E7EB" },
  sendBtn:         { width: 46, height: 46, borderRadius: 23, backgroundColor: OLIVE, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.4 },

  emptyState:      { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, backgroundColor: "#F9F8F6" },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: OLIVE_LIGHT, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyStateTitle: { fontSize: 18, fontWeight: "900", color: "#374151" },
  emptyStateSub:   { marginTop: 6, fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },
  emptyMsgs:       { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyMsgsText:   { fontSize: 14, color: "#9CA3AF", fontWeight: "700" },
});
