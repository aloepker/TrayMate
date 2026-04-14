import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
  ChatPreview,
  Message,
  MessageUser,
  MessagesModalProps,
} from "./messagingTypes";

const OLIVE      = "#717644";
const OLIVE_BG   = "#F0EEE4";
const SURFACE    = "#FAFAF8";
const BORDER     = "#EDECE8";

type SidebarEntry = {
  userId:    string;
  name:      string;
  role:      string;
  preview:   string;
  createdAt: string;
  isUnread:  boolean;
};

export default function MessagesModal({ visible, onClose }: MessagesModalProps) {
  const [allStaffUsers, setAllStaffUsers]   = useState<MessageUser[]>([]);
  const [historyUsers,  setHistoryUsers]    = useState<MessageUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [messageText,    setMessageText]    = useState("");
  const [currentUserId,  setCurrentUserId]  = useState<string | null>(null);
  const [loadingInit,    setLoadingInit]    = useState(false);
  const [loadingConvo,   setLoadingConvo]   = useState(false);
  const [sending,        setSending]        = useState(false);
  const [showNewChat,    setShowNewChat]    = useState(false);
  const [conversationPreviews, setConversationPreviews] = useState<
    Record<string, { preview: string; createdAt: string; isUnread: boolean }>
  >({});

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

      const myId = meRes.status === "fulfilled" ? String(meRes.value.id) : null;
      setCurrentUserId(myId);

      const chatList: ChatPreview[] =
        chatsRes.status === "fulfilled" && Array.isArray(chatsRes.value)
          ? chatsRes.value : [];

      // Build preview map: keep newest per partner
      const previewMap: Record<string, { preview: string; createdAt: string; isUnread: boolean }> = {};
      chatList.forEach(chat => {
        const isMine  = myId !== null && String(chat.senderId) === myId;
        const other   = isMine ? String(chat.receiverId) : String(chat.senderId);
        const ex      = previewMap[other];
        if (!ex || new Date(chat.createdAt) > new Date(ex.createdAt)) {
          previewMap[other] = {
            preview:   chat.content || "",
            createdAt: chat.createdAt,
            isUnread:  !isMine && !chat.isRead,
          };
        }
      });

      // All staff (for New Chat picker)
      const staff: MessageUser[] =
        usersRes.status === "fulfilled" && Array.isArray(usersRes.value)
          ? usersRes.value.filter(u => u.id !== myId) : [];
      setAllStaffUsers(staff);

      // Sidebar: ONLY users who appear in actual chat history
      const seenIds   = new Set<string>();
      const withHistory: MessageUser[] = [];

      chatList.forEach(chat => {
        [
          { id: String(chat.senderId),   fullName: chat.senderName   || `User ${chat.senderId}`,   role: "" },
          { id: String(chat.receiverId), fullName: chat.receiverName || `User ${chat.receiverId}`, role: "" },
        ].forEach(c => {
          if (c.id === myId || seenIds.has(c.id)) return;
          seenIds.add(c.id);
          // Enrich name/role from staff list if possible
          const enriched = staff.find(u => u.id === c.id);
          withHistory.push(enriched ?? c);
        });
      });

      // Sidebar: ONLY users with actual chat history — no fallback to all staff
      setHistoryUsers(withHistory);
      setConversationPreviews(previewMap);

      // Fetch previews for history users not yet covered by /chats
      const uncovered = withHistory.filter(u => !previewMap[u.id]);
      if (uncovered.length > 0 && myId) {
        fetchMissingPreviews(uncovered.slice(0, 20), myId, previewMap);
      }
    } catch (e) {
      console.warn("MessagesModal init error:", e);
    } finally {
      setLoadingInit(false);
    }
  };

  const fetchMissingPreviews = async (
    uncovered: MessageUser[],
    myId: string,
    existing: Record<string, { preview: string; createdAt: string; isUnread: boolean }>
  ) => {
    const updated = { ...existing };
    await Promise.all(
      uncovered.map(async u => {
        try {
          const msgs = await getConversation(u.id);
          if (!Array.isArray(msgs) || msgs.length === 0) return;
          const last = msgs[msgs.length - 1];
          updated[u.id] = {
            preview:   last.content || "",
            createdAt: last.createdAt,
            isUnread:  String(last.senderId) !== myId && !last.isRead,
          };
        } catch { /* skip */ }
      })
    );
    setConversationPreviews(prev => ({ ...prev, ...updated }));
  };

  // ─── Sidebar list — only history users, sorted newest first ───────────────

  const sidebarList = useMemo((): SidebarEntry[] =>
    historyUsers
      .map(u => {
        const p = conversationPreviews[u.id];
        return {
          userId:    u.id,
          name:      u.fullName,
          role:      u.role,
          preview:   p?.preview   ?? "",
          createdAt: p?.createdAt ?? "",
          isUnread:  p?.isUnread  ?? false,
        };
      })
      .sort((a, b) => {
        if (a.createdAt && b.createdAt)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (a.createdAt) return -1;
        if (b.createdAt) return 1;
        return a.name.localeCompare(b.name);
      }),
  [historyUsers, conversationPreviews]);

  // ─── Load conversation ─────────────────────────────────────────────────────

  const loadConversation = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingConvo(true);
    try {
      const data = await getConversation(userId);
      const msgs = Array.isArray(data) ? data : [];
      setMessages(msgs);
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        setConversationPreviews(prev => ({
          ...prev,
          [userId]: {
            isUnread:  false,
            preview:   last.content   || prev[userId]?.preview   || "",
            createdAt: last.createdAt || prev[userId]?.createdAt || "",
          },
        }));
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
    } catch {
      setMessages([]);
    } finally {
      setLoadingConvo(false);
    }
  };

  const handleSelectNewChatUser = async (user: MessageUser) => {
    setShowNewChat(false);
    // Add to history sidebar so it persists after first message
    setHistoryUsers(prev => prev.find(u => u.id === user.id) ? prev : [user, ...prev]);
    await loadConversation(user.id);
  };

  // ─── Send ──────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!selectedUserId || !messageText.trim()) return;
    const text = messageText.trim();
    setMessageText("");
    setSending(true);
    try {
      await sendMessage(selectedUserId, text);
      const updated = await getConversation(selectedUserId);
      const msgs    = Array.isArray(updated) ? updated : [];
      setMessages(msgs);
      const last = msgs[msgs.length - 1];
      if (last) {
        setConversationPreviews(prev => ({
          ...prev,
          [selectedUserId]: { preview: last.content || text, createdAt: last.createdAt, isUnread: false },
        }));
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const formatRole = (role: string) =>
    role ? role.replace("ROLE_", "").replace(/_/g, " ") : "";

  const formatTime = (value: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const now     = new Date();
    const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return isToday
      ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const selectedUser = [...historyUsers, ...allStaffUsers].find(u => u.id === selectedUserId);
  const totalUnread  = Object.values(conversationPreviews).filter(p => p.isUnread).length;
  const newChatUsers = allStaffUsers.length > 0 ? allStaffUsers : historyUsers;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Main modal ── */}
      <Modal visible={visible} transparent animationType="fade">
        <View style={s.backdrop}>
          <View style={s.card}>

            {/* ── Modal header ── */}
            <View style={s.header}>
              <View style={s.headerLeft}>
                <View style={s.headerIconWrap}>
                  <Feather name="message-square" size={18} color={OLIVE} />
                </View>
                <View>
                  <Text style={s.headerTitle}>Messages</Text>
                  {totalUnread > 0 && (
                    <Text style={s.headerUnread}>{totalUnread} unread</Text>
                  )}
                </View>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={s.closeBtn}>
                <Feather name="x" size={20} color="#6B7280" />
              </Pressable>
            </View>

            <View style={s.body}>

              {/* ── Sidebar ── */}
              <View style={s.sidebar}>

                {/* New Chat CTA */}
                <Pressable style={s.newChatBtn} onPress={() => setShowNewChat(true)}>
                  <Feather name="edit-3" size={14} color="#FFF" />
                  <Text style={s.newChatBtnText}>New Chat</Text>
                </Pressable>

                <Text style={s.sidebarLabel}>CONVERSATIONS</Text>

                {loadingInit ? (
                  <View style={s.center}>
                    <ActivityIndicator color={OLIVE} />
                  </View>
                ) : sidebarList.length === 0 ? (
                  <View style={s.center}>
                    <View style={s.emptyIconWrap}>
                      <Feather name="message-circle" size={28} color={OLIVE} />
                    </View>
                    <Text style={s.emptyTitle}>No chats yet</Text>
                    <Text style={s.emptySub}>Start a new conversation above</Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
                    {sidebarList.map(entry => {
                      const active = selectedUserId === entry.userId;
                      return (
                        <Pressable
                          key={entry.userId}
                          style={[s.chatRow, active && s.chatRowActive]}
                          onPress={() => loadConversation(entry.userId)}
                        >
                          {/* Avatar */}
                          <View style={[s.avatar, active && s.avatarActive]}>
                            <Text style={[s.avatarText, active && s.avatarTextActive]}>
                              {entry.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>

                          {/* Text */}
                          <View style={s.chatRowBody}>
                            <View style={s.chatRowTop}>
                              <Text style={[s.chatName, entry.isUnread && s.chatNameBold, active && s.chatNameActive]} numberOfLines={1}>
                                {entry.name}
                              </Text>
                              {!!entry.createdAt && (
                                <Text style={[s.chatTime, active && s.chatTimeActive]}>
                                  {formatTime(entry.createdAt)}
                                </Text>
                              )}
                            </View>
                            {!!entry.role && (
                              <Text style={[s.chatRole, active && s.chatRoleActive]}>
                                {formatRole(entry.role)}
                              </Text>
                            )}
                            {!!entry.preview && (
                              <Text style={[s.chatPreview, entry.isUnread && s.chatPreviewBold, active && s.chatPreviewActive]} numberOfLines={1}>
                                {entry.preview}
                              </Text>
                            )}
                          </View>

                          {/* Unread pip */}
                          {entry.isUnread && <View style={[s.pip, active && s.pipActive]} />}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* ── Chat panel ── */}
              <View style={s.chatPanel}>
                {!selectedUserId ? (
                  <View style={s.emptyPanel}>
                    <View style={s.emptyPanelIcon}>
                      <Feather name="message-square" size={38} color={OLIVE} />
                    </View>
                    <Text style={s.emptyPanelTitle}>Select a conversation</Text>
                    <Text style={s.emptyPanelSub}>Choose from the list or start a new chat</Text>
                  </View>
                ) : (
                  <>
                    {/* Chat top bar */}
                    <View style={s.chatTopBar}>
                      <View style={s.avatarMd}>
                        <Text style={s.avatarMdText}>
                          {selectedUser?.fullName.charAt(0).toUpperCase() ?? "?"}
                        </Text>
                      </View>
                      <View>
                        <Text style={s.chatTopName}>{selectedUser?.fullName ?? `User ${selectedUserId}`}</Text>
                        {!!selectedUser?.role && (
                          <Text style={s.chatTopRole}>{formatRole(selectedUser.role)}</Text>
                        )}
                      </View>
                    </View>

                    {/* Messages */}
                    <ScrollView
                      ref={scrollRef}
                      style={s.msgArea}
                      contentContainerStyle={s.msgContent}
                      showsVerticalScrollIndicator={false}
                    >
                      {loadingConvo ? (
                        <View style={s.center}><ActivityIndicator color={OLIVE} /></View>
                      ) : messages.length === 0 ? (
                        <View style={s.center}>
                          <Feather name="message-circle" size={28} color="#D1D5DB" />
                          <Text style={s.emptyMsgs}>No messages yet — say hello! 👋</Text>
                        </View>
                      ) : (
                        messages.map(msg => {
                          const isOut = currentUserId !== null && String(msg.senderId) === String(currentUserId);
                          return (
                            <View key={msg.id} style={[s.bubbleRow, isOut ? s.bubbleOut : s.bubbleIn]}>
                              {!isOut && (
                                <View style={s.bubbleAvatar}>
                                  <Text style={s.bubbleAvatarText}>
                                    {selectedUser?.fullName.charAt(0).toUpperCase() ?? "?"}
                                  </Text>
                                </View>
                              )}
                              <View style={[s.bubble, isOut ? s.bubbleSentBg : s.bubbleRecvBg]}>
                                <Text style={[s.bubbleText, isOut ? s.bubbleTextSent : s.bubbleTextRecv]}>
                                  {msg.content}
                                </Text>
                                <Text style={[s.bubbleTimestamp, isOut && s.bubbleTimestampSent]}>
                                  {formatTime(msg.createdAt)}
                                </Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </ScrollView>

                    {/* Input row */}
                    <View style={s.inputRow}>
                      <TextInput
                        value={messageText}
                        onChangeText={setMessageText}
                        placeholder={`Message ${selectedUser?.fullName ?? ""}…`}
                        placeholderTextColor="#9CA3AF"
                        style={s.input}
                        multiline
                      />
                      <Pressable
                        style={[s.sendBtn, (!messageText.trim() || sending) && s.sendBtnOff]}
                        onPress={handleSend}
                        disabled={!messageText.trim() || sending}
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

      {/* ── New Chat picker ── */}
      <Modal visible={showNewChat} transparent animationType="fade">
        <View style={s.pickerBackdrop}>
          <View style={s.pickerCard}>
            <View style={s.pickerHeader}>
              <Text style={s.pickerTitle}>New Conversation</Text>
              <Pressable onPress={() => setShowNewChat(false)} hitSlop={10} style={s.pickerClose}>
                <Feather name="x" size={20} color="#6B7280" />
              </Pressable>
            </View>
            <Text style={s.pickerSub}>Choose who you'd like to message</Text>

            {loadingInit ? (
              <ActivityIndicator color={OLIVE} style={{ marginVertical: 24 }} />
            ) : newChatUsers.length === 0 ? (
              <Text style={s.pickerEmpty}>No users available</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                {newChatUsers.map(user => (
                  <Pressable
                    key={user.id}
                    style={s.pickerRow}
                    onPress={() => handleSelectNewChatUser(user)}
                  >
                    <View style={s.pickerAvatar}>
                      <Text style={s.pickerAvatarText}>{user.fullName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.pickerName}>{user.fullName}</Text>
                      {!!user.role && (
                        <Text style={s.pickerRole}>{formatRole(user.role)}</Text>
                      )}
                    </View>
                    <Feather name="chevron-right" size={16} color="#C4C9D4" />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  // ── Backdrop / card
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center", padding: 16 },
  card:     {
    width: "94%", maxWidth: 1060, height: "84%",
    backgroundColor: "#FFF", borderRadius: 22, overflow: "hidden",
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 18 },
      android: { elevation: 8 },
    }),
  },

  // ── Header
  header:        { height: 64, borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: OLIVE_BG },
  headerLeft:    { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconWrap:{ width: 38, height: 38, borderRadius: 19, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: OLIVE + "30" },
  headerTitle:   { fontSize: 17, fontWeight: "900", color: "#1F2937" },
  headerUnread:  { fontSize: 11, color: OLIVE, fontWeight: "700", marginTop: 1 },
  closeBtn:      { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },

  body: { flex: 1, flexDirection: "row" },

  // ── Sidebar
  sidebar:      { width: 288, borderRightWidth: 1, borderRightColor: BORDER, backgroundColor: SURFACE, paddingHorizontal: 12, paddingTop: 14, paddingBottom: 12 },
  newChatBtn:   { height: 42, borderRadius: 12, backgroundColor: OLIVE, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 },
  newChatBtnText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  sidebarLabel: { fontSize: 11, fontWeight: "800", color: "#9CA3AF", letterSpacing: 0.8, marginBottom: 10, paddingHorizontal: 2 },

  center:       { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 32, gap: 10 },
  emptyIconWrap:{ width: 56, height: 56, borderRadius: 28, backgroundColor: OLIVE_BG, alignItems: "center", justifyContent: "center" },
  emptyTitle:   { fontSize: 14, fontWeight: "800", color: "#6B7280" },
  emptySub:     { fontSize: 12, color: "#C4C9D4", fontWeight: "600", textAlign: "center" },

  // Chat row
  chatRow:      { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 10, marginBottom: 4, position: "relative" },
  chatRowActive:{ backgroundColor: OLIVE },
  chatRowBody:  { flex: 1, minWidth: 0 },
  chatRowTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  avatar:          { width: 42, height: 42, borderRadius: 21, backgroundColor: OLIVE_BG, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarActive:    { backgroundColor: "rgba(255,255,255,0.22)" },
  avatarText:      { fontSize: 16, fontWeight: "900", color: OLIVE },
  avatarTextActive:{ color: "#FFF" },

  chatName:       { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  chatNameBold:   { fontWeight: "900" },
  chatNameActive: { color: "#FFF", fontWeight: "900" },
  chatTime:       { fontSize: 11, color: "#9CA3AF", fontWeight: "600", flexShrink: 0 },
  chatTimeActive: { color: "rgba(255,255,255,0.7)" },
  chatRole:       { fontSize: 11, color: "#9CA3AF", fontWeight: "600", marginTop: 1, textTransform: "capitalize" },
  chatRoleActive: { color: "rgba(255,255,255,0.7)" },
  chatPreview:    { marginTop: 3, fontSize: 12, color: "#9CA3AF" },
  chatPreviewBold:{ color: "#374151", fontWeight: "700" },
  chatPreviewActive: { color: "rgba(255,255,255,0.75)" },

  pip:       { position: "absolute", top: 12, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: "#DC2626", borderWidth: 2, borderColor: SURFACE },
  pipActive: { borderColor: OLIVE },

  // ── Chat panel
  chatPanel:   { flex: 1, backgroundColor: "#FFF" },

  chatTopBar:   { height: 64, borderBottomWidth: 1, borderBottomColor: BORDER, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, backgroundColor: SURFACE },
  avatarMd:     { width: 40, height: 40, borderRadius: 20, backgroundColor: OLIVE_BG, alignItems: "center", justifyContent: "center" },
  avatarMdText: { fontSize: 16, fontWeight: "900", color: OLIVE },
  chatTopName:  { fontSize: 15, fontWeight: "900", color: "#1F2937" },
  chatTopRole:  { marginTop: 1, fontSize: 11, color: "#9CA3AF", fontWeight: "700", textTransform: "capitalize" },

  msgArea:    { flex: 1, backgroundColor: "#F9F8F6" },
  msgContent: { padding: 18, paddingBottom: 10 },

  bubbleRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12, gap: 8 },
  bubbleIn:  { justifyContent: "flex-start" },
  bubbleOut: { justifyContent: "flex-end" },

  bubbleAvatar:     { width: 28, height: 28, borderRadius: 14, backgroundColor: OLIVE_BG, alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 },
  bubbleAvatarText: { fontSize: 11, fontWeight: "900", color: OLIVE },

  bubble:           { maxWidth: "68%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleSentBg:     { backgroundColor: OLIVE, borderBottomRightRadius: 4 },
  bubbleRecvBg:     { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: BORDER },
  bubbleText:       { fontSize: 14, lineHeight: 20 },
  bubbleTextSent:   { color: "#FFF" },
  bubbleTextRecv:   { color: "#1F2937" },
  bubbleTimestamp:  { marginTop: 4, fontSize: 10, color: "#9CA3AF", alignSelf: "flex-end" },
  bubbleTimestampSent: { color: "rgba(255,255,255,0.55)" },

  emptyPanel:     { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, backgroundColor: "#F9F8F6" },
  emptyPanelIcon: { width: 78, height: 78, borderRadius: 39, backgroundColor: OLIVE_BG, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyPanelTitle:{ fontSize: 18, fontWeight: "900", color: "#374151" },
  emptyPanelSub:  { marginTop: 6, fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },
  emptyMsgs:      { marginTop: 10, fontSize: 14, color: "#9CA3AF", fontWeight: "700" },

  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: "#FFF" },
  input:    { flex: 1, minHeight: 46, maxHeight: 110, borderRadius: 24, backgroundColor: "#F3F4F6", paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: "#1F2937", borderWidth: 1, borderColor: "#E5E7EB" },
  sendBtn:    { width: 46, height: 46, borderRadius: 23, backgroundColor: OLIVE, alignItems: "center", justifyContent: "center" },
  sendBtnOff: { opacity: 0.4 },

  // ── New Chat picker
  pickerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  pickerCard:     { width: "100%", maxWidth: 440, backgroundColor: "#FFF", borderRadius: 22, padding: 20 },
  pickerHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  pickerClose:    { width: 32, height: 32, borderRadius: 16, backgroundColor: SURFACE, alignItems: "center", justifyContent: "center" },
  pickerTitle:    { fontSize: 18, fontWeight: "900", color: "#1F2937" },
  pickerSub:      { fontSize: 13, color: "#9CA3AF", marginBottom: 16, fontWeight: "600" },
  pickerEmpty:    { textAlign: "center", color: "#9CA3AF", paddingVertical: 20, fontSize: 14 },
  pickerRow:      { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 12, marginBottom: 8, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  pickerAvatar:   { width: 42, height: 42, borderRadius: 21, backgroundColor: OLIVE_BG, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pickerAvatarText: { fontSize: 16, fontWeight: "900", color: OLIVE },
  pickerName:     { fontSize: 14, fontWeight: "800", color: "#1F2937" },
  pickerRole:     { marginTop: 2, fontSize: 12, fontWeight: "600", color: "#9CA3AF", textTransform: "capitalize" },
});
