import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// ─── Types ────────────────────────────────────────────────────────────────────

type SidebarEntry = {
  userId: string;
  name: string;
  role: string;
  preview: string;
  createdAt: string;
  isUnread: boolean;
};

export default function MessagesModal({ visible, onClose }: MessagesModalProps) {
  const [users, setUsers] = useState<MessageUser[]>([]);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [loadingInit, setLoadingInit] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Track per-user last message so we can show previews for received messages too
  const [conversationPreviews, setConversationPreviews] = useState<
    Record<string, { preview: string; createdAt: string; isUnread: boolean }>
  >({});

  const scrollRef = useRef<ScrollView>(null);

  // ─── Load on open ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!visible) return;
    init();
  }, [visible]);

  const init = async () => {
    setLoadingInit(true);
    try {
      const [me, rawUsers, rawChats] = await Promise.all([
        getMe(),
        getMessageUsers(),
        getChats(),
      ]);

      const myId = String(me.id);
      setCurrentUserId(myId);

      const userList = Array.isArray(rawUsers) ? rawUsers : [];
      const chatList = Array.isArray(rawChats) ? rawChats : [];

      setUsers(userList);
      setChats(chatList);

      // Build preview map from chats endpoint (covers sent messages)
      const previewMap: Record<string, { preview: string; createdAt: string; isUnread: boolean }> = {};

      chatList.forEach(chat => {
        const isSender = String(chat.senderId) === myId;
        const otherId = isSender ? String(chat.receiverId) : String(chat.senderId);
        const existing = previewMap[otherId];
        const isNewer = !existing || new Date(chat.createdAt) > new Date(existing.createdAt);
        if (isNewer) {
          previewMap[otherId] = {
            preview: chat.content || "",
            createdAt: chat.createdAt,
            isUnread: !isSender && !chat.isRead, // red dot only when WE are receiver
          };
        }
      });

      setConversationPreviews(previewMap);

      // Eagerly fetch conversations for users NOT yet covered by chats
      // (catches messages received but not returned by /chats endpoint)
      const uncovered = userList.filter(u => !previewMap[u.id]);
      if (uncovered.length > 0) {
        fetchMissingPreviews(uncovered, myId, previewMap);
      }
    } catch (e) {
      console.log("MessagesModal init error:", e);
    } finally {
      setLoadingInit(false);
    }
  };

  const fetchMissingPreviews = async (
    uncoveredUsers: MessageUser[],
    myId: string,
    existing: Record<string, { preview: string; createdAt: string; isUnread: boolean }>
  ) => {
    const updated = { ...existing };
    // Fetch in parallel, cap at 10 users to avoid hammering the server
    const batch = uncoveredUsers.slice(0, 10);
    await Promise.all(
      batch.map(async user => {
        try {
          const msgs = await getConversation(user.id);
          if (!Array.isArray(msgs) || msgs.length === 0) return;
          const last = msgs[msgs.length - 1];
          updated[user.id] = {
            preview: last.content || "",
            createdAt: last.createdAt,
            isUnread: String(last.senderId) !== myId && !last.isRead,
          };
        } catch { /* skip */ }
      })
    );
    setConversationPreviews(prev => ({ ...prev, ...updated }));
  };

  // ─── Sidebar list (iMessage-style: all users, sorted by recency) ───────────

  const sidebarList = useMemo((): SidebarEntry[] => {
    return users
      .map(user => {
        const p = conversationPreviews[user.id];
        return {
          userId: user.id,
          name: user.fullName,
          role: user.role,
          preview: p?.preview ?? "",
          createdAt: p?.createdAt ?? "",
          isUnread: p?.isUnread ?? false,
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
    setLoadingConversation(true);
    try {
      const data = await getConversation(userId);
      const msgs = Array.isArray(data) ? data : [];
      setMessages(msgs);
      // Mark as read in local preview state
      if (msgs.length > 0) {
        setConversationPreviews(prev => ({
          ...prev,
          [userId]: {
            ...prev[userId],
            isUnread: false,
            preview: msgs[msgs.length - 1].content || prev[userId]?.preview || "",
            createdAt: msgs[msgs.length - 1].createdAt || prev[userId]?.createdAt || "",
          },
        }));
      }
    } catch (e) {
      console.log("Load conversation error:", e);
      setMessages([]);
    } finally {
      setLoadingConversation(false);
    }
  };

  // ─── Send message ──────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!selectedUserId || !messageText.trim()) return;
    const text = messageText.trim();
    setMessageText("");
    setSendingMessage(true);
    try {
      await sendMessage(selectedUserId, text);
      const updated = await getConversation(selectedUserId);
      const msgs = Array.isArray(updated) ? updated : [];
      setMessages(msgs);
      // Update sidebar preview
      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        setConversationPreviews(prev => ({
          ...prev,
          [selectedUserId]: {
            preview: last.content || text,
            createdAt: last.createdAt,
            isUnread: false,
          },
        }));
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.log("Send error:", e);
    } finally {
      setSendingMessage(false);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const formatRole = (role: string) => {
    if (!role) return "";
    return role.replace("ROLE_", "").replace(/_/g, " ");
  };

  const formatTime = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const selectedUser = users.find(u => u.id === selectedUserId);
  const totalUnread = Object.values(conversationPreviews).filter(p => p.isUnread).length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Messages</Text>
              {totalUnread > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{totalUnread}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Feather name="x" size={22} color="#111827" />
            </Pressable>
          </View>

          <View style={styles.content}>

            {/* Sidebar */}
            <View style={styles.sidebar}>
              <Text style={styles.sidebarTitle}>Chats</Text>

              {loadingInit ? (
                <View style={styles.centerWrap}>
                  <ActivityIndicator size="small" color="#6D6B3B" />
                </View>
              ) : sidebarList.length === 0 ? (
                <View style={styles.centerWrap}>
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.chatList}>
                  {sidebarList.map(entry => (
                    <Pressable
                      key={entry.userId}
                      style={[
                        styles.chatItem,
                        selectedUserId === entry.userId && styles.chatItemActive,
                      ]}
                      onPress={() => loadConversation(entry.userId)}
                    >
                      {/* Avatar circle */}
                      <View style={[
                        styles.avatar,
                        selectedUserId === entry.userId && styles.avatarActive,
                      ]}>
                        <Text style={[
                          styles.avatarText,
                          selectedUserId === entry.userId && styles.avatarTextActive,
                        ]}>
                          {entry.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      {/* Name + preview */}
                      <View style={styles.chatItemBody}>
                        <View style={styles.chatItemTop}>
                          <Text
                            style={[
                              styles.chatName,
                              entry.isUnread && styles.chatNameUnread,
                              selectedUserId === entry.userId && styles.chatNameActive,
                            ]}
                            numberOfLines={1}
                          >
                            {entry.name}
                          </Text>
                          {!!entry.createdAt && (
                            <Text style={[
                              styles.chatTime,
                              selectedUserId === entry.userId && styles.chatTimeActive,
                            ]}>
                              {formatTime(entry.createdAt)}
                            </Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.chatRole,
                            selectedUserId === entry.userId && styles.chatRoleActive,
                          ]}
                        >
                          {formatRole(entry.role)}
                        </Text>
                        {!!entry.preview && (
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.chatPreview,
                              entry.isUnread && styles.chatPreviewUnread,
                              selectedUserId === entry.userId && styles.chatPreviewActive,
                            ]}
                          >
                            {entry.preview}
                          </Text>
                        )}
                      </View>

                      {/* Unread red dot */}
                      {entry.isUnread && <View style={styles.unreadDot} />}
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Chat panel */}
            <View style={styles.chatPanel}>
              {!selectedUserId ? (
                <View style={styles.emptyState}>
                  <Feather name="message-circle" size={44} color="#C9CDD4" />
                  <Text style={styles.emptyStateTitle}>Select a conversation</Text>
                  <Text style={styles.emptyStateText}>
                    Choose someone from the left to start chatting.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Chat header */}
                  <View style={styles.chatHeader}>
                    <View style={[styles.avatarSm, { backgroundColor: "#6D6B3B22" }]}>
                      <Text style={[styles.avatarTextSm, { color: "#6D6B3B" }]}>
                        {selectedUser?.fullName.charAt(0).toUpperCase() ?? "?"}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.chatHeaderTitle}>
                        {selectedUser?.fullName ?? `User ${selectedUserId}`}
                      </Text>
                      <Text style={styles.chatHeaderSub}>
                        {formatRole(selectedUser?.role ?? "")}
                      </Text>
                    </View>
                  </View>

                  {/* Messages */}
                  <ScrollView
                    ref={scrollRef}
                    style={styles.messagesArea}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
                  >
                    {loadingConversation ? (
                      <View style={styles.centerWrap}>
                        <ActivityIndicator size="small" color="#6D6B3B" />
                      </View>
                    ) : messages.length === 0 ? (
                      <View style={styles.emptyMessagesWrap}>
                        <Text style={styles.emptyMessagesText}>
                          No messages yet — say hello!
                        </Text>
                      </View>
                    ) : (
                      messages.map(msg => {
                        const isOut = currentUserId !== null && String(msg.senderId) === String(currentUserId);
                        return (
                          <View
                            key={msg.id}
                            style={[
                              styles.bubbleRow,
                              isOut ? styles.bubbleRowOut : styles.bubbleRowIn,
                            ]}
                          >
                            <View style={[styles.bubble, isOut ? styles.bubbleOut : styles.bubbleIn]}>
                              <Text style={[styles.bubbleText, isOut ? styles.bubbleTextOut : styles.bubbleTextIn]}>
                                {msg.content}
                              </Text>
                              <Text style={[styles.bubbleTime, isOut && styles.bubbleTimeOut]}>
                                {formatTime(msg.createdAt)}
                              </Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>

                  {/* Input row */}
                  <View style={styles.inputRow}>
                    <TextInput
                      value={messageText}
                      onChangeText={setMessageText}
                      placeholder="Type a message..."
                      placeholderTextColor="#9CA3AF"
                      style={styles.input}
                      multiline
                      onSubmitEditing={handleSend}
                    />
                    <Pressable
                      style={[styles.sendBtn, (!messageText.trim() || sendingMessage) && styles.sendBtnDisabled]}
                      onPress={handleSend}
                      disabled={!messageText.trim() || sendingMessage}
                    >
                      {sendingMessage ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Feather name="send" size={16} color="#FFFFFF" />
                      )}
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.32)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "92%",
    maxWidth: 1050,
    height: "82%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },

  // Header
  header: {
    height: 68,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 19, fontWeight: "900", color: "#111827" },
  headerBadge: {
    backgroundColor: "#DC2626",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  headerBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  closeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  // Layout
  content: { flex: 1, flexDirection: "row" },

  // Sidebar
  sidebar: {
    width: 300,
    borderRightWidth: 1,
    borderRightColor: "#ECECEC",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 10,
  },
  sidebarTitle: { fontSize: 15, fontWeight: "900", color: "#1F2937", marginBottom: 10, paddingHorizontal: 4 },
  chatList: { paddingBottom: 10 },

  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    position: "relative",
  },
  chatItemActive: { backgroundColor: "#6D6B3B", borderColor: "#6D6B3B" },
  chatItemBody: { flex: 1, minWidth: 0 },
  chatItemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8E5DC",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  avatarText: { fontSize: 16, fontWeight: "800", color: "#6D6B3B" },
  avatarTextActive: { color: "#FFFFFF" },

  chatName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  chatNameUnread: { fontWeight: "900" },
  chatNameActive: { color: "#FFFFFF", fontWeight: "900" },

  chatTime: { fontSize: 11, color: "#9CA3AF", fontWeight: "600", flexShrink: 0 },
  chatTimeActive: { color: "#EAEAEA" },

  chatRole: { fontSize: 11, fontWeight: "600", color: "#9CA3AF", marginTop: 1 },
  chatRoleActive: { color: "#EAEAEA" },

  chatPreview: { marginTop: 3, fontSize: 12, color: "#6B7280" },
  chatPreviewUnread: { fontWeight: "700", color: "#374151" },
  chatPreviewActive: { color: "#F0EDE5" },

  unreadDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24 },
  emptyText: { fontSize: 13, color: "#9CA3AF", fontWeight: "700" },

  // Chat panel
  chatPanel: { flex: 1, backgroundColor: "#FFFFFF" },

  chatHeader: {
    height: 68,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
  },
  avatarSm: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarTextSm: { fontSize: 16, fontWeight: "800" },
  chatHeaderTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },
  chatHeaderSub: { marginTop: 1, fontSize: 12, color: "#6B7280", fontWeight: "700", textTransform: "capitalize" },

  messagesArea: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },

  bubbleRow: { marginBottom: 10 },
  bubbleRowOut: { alignItems: "flex-end" },
  bubbleRowIn: { alignItems: "flex-start" },
  bubble: { maxWidth: "72%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOut: { backgroundColor: "#6D6B3B", borderBottomRightRadius: 4 },
  bubbleIn: { backgroundColor: "#F0F0F0", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextOut: { color: "#FFFFFF" },
  bubbleTextIn: { color: "#111827" },
  bubbleTime: { marginTop: 4, fontSize: 10, color: "#9CA3AF", alignSelf: "flex-end" },
  bubbleTimeOut: { color: "rgba(255,255,255,0.65)" },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#ECECEC",
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#6D6B3B",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.5 },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyStateTitle: { marginTop: 14, fontSize: 20, fontWeight: "900", color: "#4B5563" },
  emptyStateText: { marginTop: 6, fontSize: 14, color: "#9CA3AF", textAlign: "center" },

  emptyMessagesWrap: { alignItems: "center", paddingVertical: 40 },
  emptyMessagesText: { fontSize: 14, color: "#9CA3AF", fontWeight: "700" },
});
