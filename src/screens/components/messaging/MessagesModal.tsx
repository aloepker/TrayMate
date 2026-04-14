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

type SidebarEntry = {
  userId: string;
  name: string;
  role: string;
  preview: string;
  createdAt: string;
  isUnread: boolean;
};

export default function MessagesModal({ visible, onClose }: MessagesModalProps) {
  const [users, setUsers]                   = useState<MessageUser[]>([]); // sidebar: only with history
  const [allStaffUsers, setAllStaffUsers]   = useState<MessageUser[]>([]); // new chat picker: all staff
  const [chats, setChats]                   = useState<ChatPreview[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages]             = useState<Message[]>([]);
  const [messageText, setMessageText]       = useState("");
  const [currentUserId, setCurrentUserId]   = useState<string | null>(null);
  const [loadingInit, setLoadingInit]       = useState(false);
  const [loadingConvo, setLoadingConvo]     = useState(false);
  const [sending, setSending]               = useState(false);
  const [showNewChat, setShowNewChat]       = useState(false);
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
      // Fetch me + full user list + chat previews in parallel
      const [meResult, usersResult, chatsResult] = await Promise.allSettled([
        getMe(),
        getMessageUsers(),
        getChats(),
      ]);

      const myId = meResult.status === "fulfilled" ? String(meResult.value.id) : null;
      setCurrentUserId(myId);

      const chatList: ChatPreview[] =
        chatsResult.status === "fulfilled" && Array.isArray(chatsResult.value)
          ? chatsResult.value
          : [];
      setChats(chatList);

      // ── Build preview map from /messages/chats ────────────────────────────
      const previewMap: Record<string, { preview: string; createdAt: string; isUnread: boolean }> = {};
      chatList.forEach(chat => {
        const isSender = myId !== null && String(chat.senderId) === myId;
        const otherId  = isSender ? String(chat.receiverId) : String(chat.senderId);
        const existing = previewMap[otherId];
        const isNewer  = !existing || new Date(chat.createdAt) > new Date(existing.createdAt);
        if (isNewer) {
          previewMap[otherId] = {
            preview:   chat.content || "",
            createdAt: chat.createdAt,
            isUnread:  !isSender && !chat.isRead,
          };
        }
      });

      // ── Build full user list ──────────────────────────────────────────────
      // /messages/users is the primary source — it includes ALL users the
      // logged-in account has ever exchanged messages with (per backend).
      const allUsers: MessageUser[] =
        usersResult.status === "fulfilled" && Array.isArray(usersResult.value)
          ? usersResult.value.filter(u => u.id !== myId)
          : [];

      // Also pull any users only visible in the chat list (edge case: user
      // deleted from /messages/users but old messages still exist).
      const seenIds = new Set<string>(allUsers.map(u => u.id));
      chatList.forEach(chat => {
        [
          { id: String(chat.senderId),   fullName: chat.senderName   || `User ${chat.senderId}`,   role: "" },
          { id: String(chat.receiverId), fullName: chat.receiverName || `User ${chat.receiverId}`, role: "" },
        ].forEach(c => {
          if (c.id && c.id !== myId && !seenIds.has(c.id)) {
            seenIds.add(c.id);
            allUsers.push(c);
          }
        });
      });

      // Sidebar = ALL users (those with history will show preview; others show
      // "no messages yet"). New Chat picker also uses the same list.
      setUsers(allUsers);
      setAllStaffUsers(allUsers);
      setConversationPreviews(previewMap);

      // For users already in the list but whose preview wasn't in /chats,
      // fetch their conversation to get a preview (catches older messages).
      const uncovered = allUsers.filter(u => !previewMap[u.id]);
      if (uncovered.length > 0 && myId) {
        fetchMissingPreviews(uncovered.slice(0, 20), myId, previewMap);
      }
    } catch (e) {
      console.log("MessagesModal init error:", e);
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
      uncovered.map(async user => {
        try {
          const msgs = await getConversation(user.id);
          if (!Array.isArray(msgs) || msgs.length === 0) return;
          const last = msgs[msgs.length - 1];
          updated[user.id] = {
            preview:   last.content || "",
            createdAt: last.createdAt,
            isUnread:  String(last.senderId) !== myId && !last.isRead,
          };
        } catch { /* skip */ }
      })
    );
    setConversationPreviews(prev => ({ ...prev, ...updated }));
  };

  // ─── Sidebar list ──────────────────────────────────────────────────────────

  const sidebarList = useMemo((): SidebarEntry[] => {
    return users
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
      });
  }, [users, conversationPreviews]);

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
    } catch (e) {
      console.log("Load conversation error:", e);
      setMessages([]);
    } finally {
      setLoadingConvo(false);
    }
  };

  const handleSelectNewChatUser = async (user: MessageUser) => {
    setShowNewChat(false);
    // Add to sidebar history list so they appear after conversation starts
    setUsers(prev => prev.find(u => u.id === user.id) ? prev : [user, ...prev]);
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
    } catch (e) {
      console.log("Send error:", e);
    } finally {
      setSending(false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const formatRole = (role: string) =>
    role ? role.replace("ROLE_", "").replace(/_/g, " ") : "";

  const formatTime = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const isToday =
      date.getDate()     === now.getDate()     &&
      date.getMonth()    === now.getMonth()    &&
      date.getFullYear() === now.getFullYear();
    return isToday
      ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const selectedUser    = [...users, ...allStaffUsers].find(u => u.id === selectedUserId);
  const totalUnread     = Object.values(conversationPreviews).filter(p => p.isUnread).length;

  // New Chat picker: all staff, falling back to history users if staff list is empty
  const newChatUsers    = allStaffUsers.length > 0 ? allStaffUsers : users;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Main modal ── */}
      <Modal visible={visible} transparent animationType="fade">
        <View style={s.backdrop}>
          <View style={s.card}>

            {/* Header */}
            <View style={s.header}>
              <View style={s.headerLeft}>
                <Text style={s.headerTitle}>Messages</Text>
                {totalUnread > 0 && (
                  <View style={s.headerBadge}>
                    <Text style={s.headerBadgeText}>{totalUnread}</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={s.closeBtn}>
                <Feather name="x" size={22} color="#111827" />
              </Pressable>
            </View>

            <View style={s.body}>

              {/* ── Sidebar ── */}
              <View style={s.sidebar}>

                <View style={s.sidebarHeader}>
                  <Text style={s.sidebarTitle}>Conversations</Text>
                  {/* Compose button for any user not yet in sidebar */}
                  <Pressable style={s.composeBtn} onPress={() => setShowNewChat(true)} hitSlop={8}>
                    <Feather name="edit-3" size={15} color="#6D6B3B" />
                  </Pressable>
                </View>

                {loadingInit ? (
                  <View style={s.centerWrap}>
                    <ActivityIndicator size="small" color="#6D6B3B" />
                  </View>
                ) : sidebarList.length === 0 ? (
                  <View style={s.centerWrap}>
                    <Feather name="message-circle" size={28} color="#D1D5DB" />
                    <Text style={s.emptyText}>No conversations yet</Text>
                    <Text style={s.emptySubText}>Tap the pencil to start one</Text>
                  </View>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.chatList}>
                    {sidebarList.map(entry => (
                      <Pressable
                        key={entry.userId}
                        style={[s.chatItem, selectedUserId === entry.userId && s.chatItemActive]}
                        onPress={() => loadConversation(entry.userId)}
                      >
                        {/* Avatar */}
                        <View style={[s.avatar, selectedUserId === entry.userId && s.avatarActive]}>
                          <Text style={[s.avatarText, selectedUserId === entry.userId && s.avatarTextActive]}>
                            {entry.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>

                        {/* Info */}
                        <View style={s.chatItemBody}>
                          <View style={s.chatItemRow}>
                            <Text
                              style={[
                                s.chatName,
                                entry.isUnread && s.chatNameUnread,
                                selectedUserId === entry.userId && s.chatNameActive,
                              ]}
                              numberOfLines={1}
                            >
                              {entry.name}
                            </Text>
                            {!!entry.createdAt && (
                              <Text style={[s.chatTime, selectedUserId === entry.userId && s.chatTimeActive]}>
                                {formatTime(entry.createdAt)}
                              </Text>
                            )}
                          </View>
                          {!!entry.role && (
                            <Text style={[s.chatRole, selectedUserId === entry.userId && s.chatRoleActive]}>
                              {formatRole(entry.role)}
                            </Text>
                          )}
                          {!!entry.preview && (
                            <Text
                              numberOfLines={1}
                              style={[
                                s.chatPreview,
                                entry.isUnread && s.chatPreviewUnread,
                                selectedUserId === entry.userId && s.chatPreviewActive,
                              ]}
                            >
                              {entry.preview}
                            </Text>
                          )}
                        </View>

                        {/* Unread dot */}
                        {entry.isUnread && (
                          <View style={s.unreadDot} />
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* ── Chat panel ── */}
              <View style={s.chatPanel}>
                {!selectedUserId ? (
                  <View style={s.emptyState}>
                    <Feather name="message-circle" size={44} color="#C9CDD4" />
                    <Text style={s.emptyStateTitle}>Select a conversation</Text>
                    <Text style={s.emptyStateSub}>Choose a chat or tap "New Chat" to start one.</Text>
                  </View>
                ) : (
                  <>
                    {/* Chat header */}
                    <View style={s.chatHeader}>
                      <View style={s.avatarSm}>
                        <Text style={s.avatarSmText}>
                          {selectedUser?.fullName.charAt(0).toUpperCase() ?? "?"}
                        </Text>
                      </View>
                      <View>
                        <Text style={s.chatHeaderName}>
                          {selectedUser?.fullName ?? `User ${selectedUserId}`}
                        </Text>
                        <Text style={s.chatHeaderRole}>
                          {formatRole(selectedUser?.role ?? "")}
                        </Text>
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
                          <ActivityIndicator size="small" color="#6D6B3B" />
                        </View>
                      ) : messages.length === 0 ? (
                        <View style={s.emptyMsgs}>
                          <Text style={s.emptyMsgsText}>No messages yet — say hello! 👋</Text>
                        </View>
                      ) : (
                        messages.map(msg => {
                          const isOut = currentUserId !== null && String(msg.senderId) === String(currentUserId);
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
                        value={messageText}
                        onChangeText={setMessageText}
                        placeholder="Type a message..."
                        placeholderTextColor="#9CA3AF"
                        style={s.input}
                        multiline
                      />
                      <Pressable
                        style={[s.sendBtn, (!messageText.trim() || sending) && s.sendBtnDisabled]}
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
              <Text style={s.pickerTitle}>Start New Chat</Text>
              <Pressable onPress={() => setShowNewChat(false)} hitSlop={10}>
                <Feather name="x" size={20} color="#111827" />
              </Pressable>
            </View>

            {loadingInit ? (
              <ActivityIndicator size="small" color="#6D6B3B" style={{ marginVertical: 20 }} />
            ) : newChatUsers.length === 0 ? (
              <Text style={s.pickerEmpty}>No users available</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
                {newChatUsers.map(user => (
                  <Pressable
                    key={user.id}
                    style={s.pickerUser}
                    onPress={() => handleSelectNewChatUser(user)}
                  >
                    <View style={s.pickerAvatar}>
                      <Text style={s.pickerAvatarText}>{user.fullName.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={s.pickerUserName}>{user.fullName}</Text>
                      {!!user.role && (
                        <Text style={s.pickerUserRole}>{formatRole(user.role)}</Text>
                      )}
                    </View>
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
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.32)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "92%",
    maxWidth: 1050,
    height: "82%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },

  // Header
  header:          { height: 68, borderBottomWidth: 1, borderBottomColor: "#ECECEC", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft:      { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle:     { fontSize: 19, fontWeight: "900", color: "#111827" },
  headerBadge:     { backgroundColor: "#DC2626", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  headerBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  closeBtn:        { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  body:    { flex: 1, flexDirection: "row" },

  // Sidebar
  sidebar:      { width: 300, borderRightWidth: 1, borderRightColor: "#ECECEC", backgroundColor: "#FAFAFA", paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 },
  sidebarHeader:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginBottom: 10 },
  sidebarTitle: { fontSize: 13, fontWeight: "900", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 },
  composeBtn:   { width: 30, height: 30, borderRadius: 8, backgroundColor: "#E8E5DC", alignItems: "center", justifyContent: "center" },
  chatList:     { paddingBottom: 10 },

  chatItem:        { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF", borderRadius: 14, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: "#E8E8E8", position: "relative" },
  chatItemActive:  { backgroundColor: "#6D6B3B", borderColor: "#6D6B3B" },
  chatItemBody:    { flex: 1, minWidth: 0 },
  chatItemRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  avatar:          { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E8E5DC", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarActive:    { backgroundColor: "rgba(255,255,255,0.2)" },
  avatarText:      { fontSize: 16, fontWeight: "800", color: "#6D6B3B" },
  avatarTextActive:{ color: "#FFF" },

  chatName:         { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  chatNameUnread:   { fontWeight: "900" },
  chatNameActive:   { color: "#FFF", fontWeight: "900" },
  chatTime:         { fontSize: 11, color: "#9CA3AF", fontWeight: "600", flexShrink: 0 },
  chatTimeActive:   { color: "#EAEAEA" },
  chatRole:         { fontSize: 11, fontWeight: "600", color: "#9CA3AF", marginTop: 1, textTransform: "capitalize" },
  chatRoleActive:   { color: "#EAEAEA" },
  chatPreview:      { marginTop: 3, fontSize: 12, color: "#6B7280" },
  chatPreviewUnread:{ fontWeight: "700", color: "#374151" },
  chatPreviewActive:{ color: "#F0EDE5" },
  unreadDot:        { position: "absolute", top: 10, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: "#DC2626", borderWidth: 2, borderColor: "#FFF" },

  centerWrap:   { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 30, gap: 8 },
  emptyText:    { fontSize: 14, color: "#9CA3AF", fontWeight: "700" },
  emptySubText: { fontSize: 12, color: "#C4C9D4", fontWeight: "600" },

  // Chat panel
  chatPanel:  { flex: 1, backgroundColor: "#FFF" },
  chatHeader: { height: 68, borderBottomWidth: 1, borderBottomColor: "#ECECEC", flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18 },
  avatarSm:     { width: 38, height: 38, borderRadius: 19, backgroundColor: "#6D6B3B22", alignItems: "center", justifyContent: "center" },
  avatarSmText: { fontSize: 16, fontWeight: "800", color: "#6D6B3B" },
  chatHeaderName: { fontSize: 16, fontWeight: "900", color: "#111827" },
  chatHeaderRole: { marginTop: 1, fontSize: 12, color: "#6B7280", fontWeight: "700", textTransform: "capitalize" },

  messagesArea:    { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  bubbleRow:    { marginBottom: 10 },
  bubbleRowOut: { alignItems: "flex-end" },
  bubbleRowIn:  { alignItems: "flex-start" },
  bubble:           { maxWidth: "72%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOut:        { backgroundColor: "#6D6B3B", borderBottomRightRadius: 4 },
  bubbleIn:         { backgroundColor: "#F0F0F0", borderBottomLeftRadius: 4 },
  bubbleText:       { fontSize: 14, lineHeight: 20 },
  bubbleTextOut:    { color: "#FFF" },
  bubbleTextIn:     { color: "#111827" },
  bubbleTime:       { marginTop: 4, fontSize: 10, color: "#9CA3AF", alignSelf: "flex-end" },
  bubbleTimeOut:    { color: "rgba(255,255,255,0.6)" },

  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: "#ECECEC" },
  input:    { flex: 1, minHeight: 46, maxHeight: 110, borderRadius: 24, backgroundColor: "#F3F4F6", paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: "#111827", borderWidth: 1, borderColor: "#E5E7EB" },
  sendBtn:         { width: 46, height: 46, borderRadius: 23, backgroundColor: "#6D6B3B", alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.45 },

  emptyState:     { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyStateTitle:{ marginTop: 14, fontSize: 20, fontWeight: "900", color: "#4B5563" },
  emptyStateSub:  { marginTop: 6, fontSize: 14, color: "#9CA3AF", textAlign: "center" },
  emptyMsgs:      { alignItems: "center", paddingVertical: 40 },
  emptyMsgsText:  { fontSize: 14, color: "#9CA3AF", fontWeight: "700" },

  // New Chat picker
  pickerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 24 },
  pickerCard:     { width: "100%", maxWidth: 420, backgroundColor: "#FFF", borderRadius: 20, padding: 18 },
  pickerHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  pickerTitle:    { fontSize: 17, fontWeight: "900", color: "#111827" },
  pickerEmpty:    { textAlign: "center", color: "#9CA3AF", paddingVertical: 20, fontSize: 14 },
  pickerUser:     { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  pickerAvatar:   { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E8E5DC", alignItems: "center", justifyContent: "center" },
  pickerAvatarText: { fontSize: 16, fontWeight: "800", color: "#6D6B3B" },
  pickerUserName: { fontSize: 14, fontWeight: "800", color: "#111827" },
  pickerUserRole: { marginTop: 2, fontSize: 12, fontWeight: "600", color: "#6B7280", textTransform: "capitalize" },
});
