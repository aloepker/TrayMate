//src/screens/components/messaging/MessagesModal.tsx
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
  deleteConversation,
  deleteMessage,
} from "../../../services/api";
import {
  ChatPreview,
  Message,
  MessageUser,
  MessagesModalProps,
} from "./messagingTypes";

const OLIVE = "#717644";
const OLIVE_BG = "#F0EEE4";
const SURFACE = "#FAFAF8";
const BORDER = "#EDECE8";

type SidebarEntry = {
  userId: string;
  name: string;
  role: string;
  preview: string;
  createdAt: string;
  isUnread: boolean;
};

export default function MessagesModal({ visible, onClose }: MessagesModalProps) {
  const [allStaffUsers, setAllStaffUsers] = useState<MessageUser[]>([]);
  const [historyUsers, setHistoryUsers] = useState<MessageUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadingInit, setLoadingInit] = useState(false);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [conversationPreviews, setConversationPreviews] = useState<
    Record<string, { preview: string; createdAt: string; isUnread: boolean }>
  >({});
  const [initError, setInitError] = useState<string | null>(null);
  const [deleteMessageConfirm, setDeleteMessageConfirm] = useState<string | null>(null);
  const [deleteConvoConfirm, setDeleteConvoConfirm] = useState<string | null>(null);
  // User picked via "New Chat" who hasn't yet sent a message. If they
  // navigate away (pick someone else / close modal) without sending, this
  // phantom entry is removed from the sidebar so it doesn't look like a
  // real conversation.
  const [pendingChatUserId, setPendingChatUserId] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      init();
      return;
    }
    // Modal closed: clear any unsent phantom chat so it doesn't reappear
    // as a fake "conversation" the next time the modal opens.
    if (pendingChatUserId) {
      const abandoned = pendingChatUserId;
      setPendingChatUserId(null);
      setHistoryUsers((prev) => prev.filter((u) => u.id !== abandoned));
    }
  }, [visible]);

  const init = async () => {
    setLoadingInit(true);
    setInitError(null);
    try {
      const [meRes, usersRes, chatsRes] = await Promise.allSettled([
        getMe(),
        getMessageUsers(),
        getChats(),
      ]);

      const myId = meRes.status === "fulfilled" ? String(meRes.value.id) : null;
      setCurrentUserId(myId);

      // Surface a real error instead of silently dropping to "No chats yet" —
      // most of the time when the badge says "1" but the sidebar is empty,
      // /messages/chats failed (network blip / cold backend / 401).
      if (chatsRes.status === "rejected") {
        const msg = (chatsRes.reason as any)?.message ?? "Could not load messages";
        setInitError(
          msg === "Network request failed"
            ? "Server unreachable. Tap Retry in a moment — it may be waking up."
            : msg
        );
      }

      const chatList: ChatPreview[] =
        chatsRes.status === "fulfilled" && Array.isArray(chatsRes.value)
          ? chatsRes.value
          : [];

      const previewMap: Record<
        string,
        { preview: string; createdAt: string; isUnread: boolean }
      > = {};

      chatList.forEach((chat) => {
        const isMine = myId !== null && String(chat.senderId) === myId;
        const other = isMine ? String(chat.receiverId) : String(chat.senderId);
        const existing = previewMap[other];

        if (!existing || new Date(chat.createdAt) > new Date(existing.createdAt)) {
          previewMap[other] = {
            preview: chat.content || "",
            createdAt: chat.createdAt,
            isUnread: !isMine && !chat.isRead,
          };
        }
      });

      // Always coerce both sides to string before comparing — getMe returns
      // a string id, but raw user objects from /messages/users may come
      // back as numbers, which would make `u.id !== myId` always true and
      // let the user pick themselves in the New Chat picker (creating a
      // self-message that the badge then can't ever clear).
      const staff: MessageUser[] =
        usersRes.status === "fulfilled" && Array.isArray(usersRes.value)
          ? usersRes.value.filter((u) => String(u.id) !== String(myId))
          : [];
      setAllStaffUsers(staff);

      const seenIds = new Set<string>();
      const withHistory: MessageUser[] = [];

      chatList.forEach((chat) => {
        [
          {
            id: String(chat.senderId),
            fullName: chat.senderName || `User ${chat.senderId}`,
            role: "",
          },
          {
            id: String(chat.receiverId),
            fullName: chat.receiverName || `User ${chat.receiverId}`,
            role: "",
          },
        ].forEach((candidate) => {
          if (candidate.id === myId || seenIds.has(candidate.id)) return;
          seenIds.add(candidate.id);
          const enriched = staff.find((u) => u.id === candidate.id);
          withHistory.push(enriched ?? candidate);
        });
      });

      setHistoryUsers(withHistory);
      setConversationPreviews(previewMap);

      const uncovered = withHistory.filter((u) => !previewMap[u.id]);
      if (uncovered.length > 0 && myId) {
        fetchMissingPreviews(uncovered.slice(0, 20), myId, previewMap);
      }

      // Mark every unread thread as read on the backend by visiting it.
      // Backend's GET /messages/conversation/{id} flips isRead=true for
      // messages the current user received. Without this, the dashboard
      // poll would re-set the badge to its prior value and the red "1"
      // would never go away.
      const unreadPartnerIds = Object.entries(previewMap)
        .filter(([, p]) => p.isUnread)
        .map(([id]) => id);
      if (unreadPartnerIds.length > 0) {
        await Promise.allSettled(unreadPartnerIds.map(id => getConversation(id)));
        // Locally clear isUnread so the modal's own header count drops to 0.
        setConversationPreviews(prev => {
          const next = { ...prev };
          for (const id of unreadPartnerIds) {
            if (next[id]) next[id] = { ...next[id], isUnread: false };
          }
          return next;
        });
      }

    } catch (e: any) {
      console.warn("MessagesModal init error:", e);
      setInitError(e?.message ?? "Could not load messages");
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
      uncovered.map(async (user) => {
        try {
          const msgs = await getConversation(user.id);
          if (!Array.isArray(msgs) || msgs.length === 0) return;
          const last = msgs[msgs.length - 1];
          updated[user.id] = {
            preview: last.content || "",
            createdAt: last.createdAt,
            isUnread: String(last.senderId) !== myId && !last.isRead,
          };
        } catch {
          // skip
        }
      })
    );

    setConversationPreviews((prev) => ({ ...prev, ...updated }));
  };

  const sidebarList = useMemo(
    (): SidebarEntry[] =>
      historyUsers
        .map((u) => {
          const preview = conversationPreviews[u.id];
          return {
            userId: u.id,
            name: u.fullName,
            role: u.role,
            preview: preview?.preview ?? "",
            createdAt: preview?.createdAt ?? "",
            isUnread: preview?.isUnread ?? false,
          };
        })
        .sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          if (a.createdAt) return -1;
          if (b.createdAt) return 1;
          return a.name.localeCompare(b.name);
        }),
    [historyUsers, conversationPreviews]
  );

  const loadConversation = async (userId: string) => {
    // Switching threads: if the previously-picked phantom user was
    // abandoned without sending, drop them from the sidebar.
    dropPendingIfAbandoned(userId);
    setSelectedUserId(userId);
    setLoadingConvo(true);

    try {
      const data = await getConversation(userId);
      const msgs = Array.isArray(data) ? data : [];
      setMessages(msgs);

      if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        setConversationPreviews((prev) => ({
          ...prev,
          [userId]: {
            isUnread: false,
            preview: last.content || prev[userId]?.preview || "",
            createdAt: last.createdAt || prev[userId]?.createdAt || "",
          },
        }));
      } else {
        setConversationPreviews((prev) => ({
          ...prev,
          [userId]: {
            ...prev[userId],
            isUnread: false,
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
    // If we abandoned a previous "new chat" pick, drop them now.
    dropPendingIfAbandoned(user.id);

    const alreadyHasHistory = !!conversationPreviews[user.id]?.createdAt;
    setHistoryUsers((prev) => (prev.find((u) => u.id === user.id) ? prev : [user, ...prev]));
    // Only mark as pending if there's no real history yet — established
    // threads should never disappear.
    if (!alreadyHasHistory) setPendingChatUserId(user.id);
    await loadConversation(user.id);
  };

  // Remove a previously-pending picked user if they were abandoned without
  // sending a message. Called whenever the active conversation changes or
  // the modal closes. Skips if the same user is being re-selected.
  const dropPendingIfAbandoned = (nextSelectedId: string | null) => {
    if (!pendingChatUserId || pendingChatUserId === nextSelectedId) return;
    const abandonedId = pendingChatUserId;
    setPendingChatUserId(null);
    // Only drop them if no real message ever landed for this thread.
    const hasRealHistory = !!conversationPreviews[abandonedId]?.createdAt;
    if (hasRealHistory) return;
    setHistoryUsers((prev) => prev.filter((u) => u.id !== abandonedId));
  };

  const confirmDeleteMessage = (messageId: string) => {
    setDeleteMessageConfirm(messageId);
  };

  const handleDeleteMessage = async () => {
    if (!deleteMessageConfirm || !selectedUserId) return;

    try {
      await deleteMessage(deleteMessageConfirm);

      const remaining = messages.filter((m) => m.id !== deleteMessageConfirm);
      setMessages(remaining);

      const last = remaining[remaining.length - 1];
      setConversationPreviews((prev) => ({
        ...prev,
        [selectedUserId]: {
          preview: last?.content ?? "",
          createdAt: last?.createdAt ?? "",
          isUnread: false,
        },
      }));
    } catch (e: any) {
      console.warn("deleteMessage failed:", e?.message);
    } finally {
      setDeleteMessageConfirm(null);
    }
  };

  const confirmDeleteConversation = (userId: string) => {
    setDeleteConvoConfirm(userId);
  };

  const handleDeleteConversation = async () => {
    if (!deleteConvoConfirm) return;

    try {
      await deleteConversation(deleteConvoConfirm);
      setHistoryUsers((prev) => prev.filter((u) => u.id !== deleteConvoConfirm));
      setConversationPreviews((prev) => {
        const next = { ...prev };
        delete next[deleteConvoConfirm];
        return next;
      });

      if (selectedUserId === deleteConvoConfirm) {
        setSelectedUserId(null);
        setMessages([]);
      }
    } catch (e: any) {
      console.warn("deleteConversation failed:", e?.message);
    } finally {
      setDeleteConvoConfirm(null);
    }
  };

  const handleSend = async () => {
    if (!selectedUserId || !messageText.trim()) return;

    const text = messageText.trim();
    setMessageText("");
    setSending(true);

    try {
      await sendMessage(selectedUserId, text);
      // First message sent — this is now a real conversation, not pending.
      if (pendingChatUserId === selectedUserId) setPendingChatUserId(null);
      const updated = await getConversation(selectedUserId);
      const msgs = Array.isArray(updated) ? updated : [];
      setMessages(msgs);

      const last = msgs[msgs.length - 1];
      if (last) {
        setConversationPreviews((prev) => ({
          ...prev,
          [selectedUserId]: {
            preview: last.content || text,
            createdAt: last.createdAt,
            isUnread: false,
          },
        }));
      }

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const formatRole = (role: string) =>
    role ? role.replace("ROLE_", "").replace(/_/g, " ") : "";

  const formatTime = (value: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    return isToday
      ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const selectedUser = [...historyUsers, ...allStaffUsers].find((u) => u.id === selectedUserId);
  const totalUnread = Object.values(conversationPreviews).filter((p) => p.isUnread).length;
  const newChatUsers = allStaffUsers.length > 0 ? allStaffUsers : historyUsers;

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <View style={s.backdrop}>
          <View style={s.card}>
            <View style={s.header}>
              <View style={s.headerLeft}>
                <View style={s.headerIconWrap}>
                  <Feather name="message-square" size={18} color={OLIVE} />
                </View>
                <View>
                  <Text style={s.headerTitle}>Messages</Text>
                  {totalUnread > 0 && <Text style={s.headerUnread}>{totalUnread} unread</Text>}
                </View>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={s.closeBtn}>
                <Feather name="x" size={20} color="#6B7280" />
              </Pressable>
            </View>

            <View style={s.body}>
              <View style={s.sidebar}>
                <Pressable style={s.newChatBtn} onPress={() => setShowNewChat(true)}>
                  <Feather name="edit-3" size={14} color="#FFF" />
                  <Text style={s.newChatBtnText}>New Chat</Text>
                </Pressable>

                <Text style={s.sidebarLabel}>CONVERSATIONS</Text>

                {loadingInit ? (
                  <View style={s.center}>
                    <ActivityIndicator color={OLIVE} />
                  </View>
                ) : initError ? (
                  <View style={s.center}>
                    <View style={s.emptyIconWrap}>
                      <Feather name="wifi-off" size={26} color="#B45309" />
                    </View>
                    <Text style={s.emptyTitle}>Couldn't load messages</Text>
                    <Text style={s.emptySub}>{initError}</Text>
                    <Pressable style={s.retryBtn} onPress={init}>
                      <Feather name="refresh-cw" size={13} color="#FFF" />
                      <Text style={s.retryBtnText}>Retry</Text>
                    </Pressable>
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
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 12 }}
                  >
                    {sidebarList.map((entry) => {
                      const active = selectedUserId === entry.userId;

                      return (
                        <View key={entry.userId}>
                          <Pressable
                            style={[s.chatRow, active && s.chatRowActive]}
                            onPress={() => loadConversation(entry.userId)}
                          >
                            <View style={[s.avatar, active && s.avatarActive]}>
                              <Text style={[s.avatarText, active && s.avatarTextActive]}>
                                {entry.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>

                            <View style={s.chatRowBody}>
                              <View style={s.chatRowTop}>
                                <Text
                                  style={[
                                    s.chatName,
                                    entry.isUnread && s.chatNameBold,
                                    active && s.chatNameActive,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {entry.name}
                                </Text>

                                <View style={s.chatRowMeta}>
                                  {!!entry.createdAt && (
                                    <Text style={[s.chatTime, active && s.chatTimeActive]}>
                                      {formatTime(entry.createdAt)}
                                    </Text>
                                  )}
                                  <Pressable
                                    onPress={() => confirmDeleteConversation(entry.userId)}
                                    hitSlop={8}
                                    style={s.inlineTrashBtn}
                                  >
                                    <Feather
                                      name="trash-2"
                                      size={12}
                                      color={active ? "rgba(255,255,255,0.65)" : "#9CA3AF"}
                                    />
                                  </Pressable>
                                </View>
                              </View>

                              {!!entry.role && (
                                <Text style={[s.chatRole, active && s.chatRoleActive]}>
                                  {formatRole(entry.role)}
                                </Text>
                              )}

                              {!!entry.preview && (
                                <Text
                                  style={[
                                    s.chatPreview,
                                    entry.isUnread && s.chatPreviewBold,
                                    active && s.chatPreviewActive,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {entry.preview}
                                </Text>
                              )}
                            </View>

                            {entry.isUnread && <View style={[s.pip, active && s.pipActive]} />}
                          </Pressable>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              <View style={s.chatPanel}>
                {!selectedUserId ? (
                  <View style={s.emptyPanel}>
                    <View style={s.emptyPanelIcon}>
                      <Feather name="message-square" size={38} color={OLIVE} />
                    </View>
                    <Text style={s.emptyPanelTitle}>Select a conversation</Text>
                    <Text style={s.emptyPanelSub}>
                      Choose from the list or start a new chat
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={s.chatTopBar}>
                      <View style={s.avatarMd}>
                        <Text style={s.avatarMdText}>
                          {selectedUser?.fullName.charAt(0).toUpperCase() ?? "?"}
                        </Text>
                      </View>
                      <View>
                        <Text style={s.chatTopName}>
                          {selectedUser?.fullName ?? `User ${selectedUserId}`}
                        </Text>
                        {!!selectedUser?.role && (
                          <Text style={s.chatTopRole}>{formatRole(selectedUser.role)}</Text>
                        )}
                      </View>
                    </View>

                    <ScrollView
                      ref={scrollRef}
                      style={s.msgArea}
                      contentContainerStyle={s.msgContent}
                      showsVerticalScrollIndicator={false}
                    >
                      {loadingConvo ? (
                        <View style={s.center}>
                          <ActivityIndicator color={OLIVE} />
                        </View>
                      ) : messages.length === 0 ? (
                        <View style={s.center}>
                          <Feather name="message-circle" size={28} color="#D1D5DB" />
                          <Text style={s.emptyMsgs}>No messages yet - say hello!</Text>
                        </View>
                      ) : (
                        messages.map((msg) => {
                          const isOut =
                            currentUserId !== null &&
                            String(msg.senderId) === String(currentUserId);

                          return (
                            <View
                              key={msg.id}
                              style={[s.bubbleRow, isOut ? s.bubbleOut : s.bubbleIn]}
                            >
                              {!isOut && (
                                <View style={s.bubbleAvatar}>
                                  <Text style={s.bubbleAvatarText}>
                                    {selectedUser?.fullName.charAt(0).toUpperCase() ?? "?"}
                                  </Text>
                                </View>
                              )}

                              <View style={[s.bubble, isOut ? s.bubbleSentBg : s.bubbleRecvBg]}>
                                <Text
                                  style={[
                                    s.bubbleText,
                                    isOut ? s.bubbleTextSent : s.bubbleTextRecv,
                                  ]}
                                >
                                  {msg.content}
                                </Text>

                                <View style={s.bubbleMetaRow}>
                                  {isOut && (
                                    <Pressable
                                      style={s.bubbleDeleteInlineBtn}
                                      onPress={() => confirmDeleteMessage(msg.id)}
                                      hitSlop={8}
                                    >
                                      <Feather
                                        name="trash-2"
                                        size={11}
                                        color="rgba(255,255,255,0.72)"
                                      />
                                    </Pressable>
                                  )}

                                  <Text
                                    style={[
                                      s.bubbleTimestamp,
                                      isOut && s.bubbleTimestampSent,
                                    ]}
                                  >
                                    {formatTime(msg.createdAt)}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </ScrollView>

                    <View style={s.inputRow}>
                      <TextInput
                        value={messageText}
                        onChangeText={setMessageText}
                        placeholder={`Message ${selectedUser?.fullName ?? ""}...`}
                        placeholderTextColor="#9CA3AF"
                        style={s.input}
                        multiline
                      />
                      <Pressable
                        style={[s.sendBtn, (!messageText.trim() || sending) && s.sendBtnOff]}
                        onPress={handleSend}
                        disabled={!messageText.trim() || sending}
                      >
                        {sending ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Feather name="send" size={16} color="#FFF" />
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

      <Modal visible={showNewChat} transparent animationType="fade">
        <View style={s.pickerBackdrop}>
          <View style={s.pickerCard}>
            <View style={s.pickerHeader}>
              <Text style={s.pickerTitle}>New Conversation</Text>
              <Pressable
                onPress={() => setShowNewChat(false)}
                hitSlop={10}
                style={s.pickerClose}
              >
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
                {newChatUsers.map((user) => (
                  <Pressable
                    key={user.id}
                    style={s.pickerRow}
                    onPress={() => handleSelectNewChatUser(user)}
                  >
                    <View style={s.pickerAvatar}>
                      <Text style={s.pickerAvatarText}>
                        {user.fullName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.pickerName}>{user.fullName}</Text>
                      {!!user.role && <Text style={s.pickerRole}>{formatRole(user.role)}</Text>}
                    </View>
                    <Feather name="chevron-right" size={16} color="#C4C9D4" />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteMessageConfirm} transparent animationType="fade">
        <Pressable style={s.confirmBackdrop} onPress={() => setDeleteMessageConfirm(null)}>
          <Pressable style={s.confirmCard} onPress={(e) => e.stopPropagation()}>
            <View style={s.confirmIconWrap}>
              <Feather name="trash-2" size={22} color="#EF4444" />
            </View>
            <Text style={s.confirmTitle}>Delete Message</Text>
            <Text style={s.confirmSub}>
              This message will be permanently deleted for{" "}
              <Text style={s.confirmBold}>both sides</Text>. This cannot be undone.
            </Text>
            <View style={s.confirmBtnRow}>
              <Pressable
                style={s.confirmCancelBtn}
                onPress={() => setDeleteMessageConfirm(null)}
              >
                <Text style={s.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={s.confirmDeleteBtn} onPress={handleDeleteMessage}>
                <Feather name="trash-2" size={14} color="#FFF" />
                <Text style={s.confirmDeleteText}>Delete for Both</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!deleteConvoConfirm} transparent animationType="fade">
        <Pressable style={s.confirmBackdrop} onPress={() => setDeleteConvoConfirm(null)}>
          <Pressable style={s.confirmCard} onPress={(e) => e.stopPropagation()}>
            <View style={s.confirmIconWrap}>
              <Feather name="trash-2" size={22} color="#EF4444" />
            </View>
            <Text style={s.confirmTitle}>Delete Conversation</Text>
            <Text style={s.confirmSub}>
              The entire conversation will be permanently deleted for{" "}
              <Text style={s.confirmBold}>both users</Text>. This cannot be undone.
            </Text>
            <View style={s.confirmBtnRow}>
              <Pressable
                style={s.confirmCancelBtn}
                onPress={() => setDeleteConvoConfirm(null)}
              >
                <Text style={s.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={s.confirmDeleteBtn} onPress={handleDeleteConversation}>
                <Feather name="trash-2" size={14} color="#FFF" />
                <Text style={s.confirmDeleteText}>Delete for Both</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "94%",
    maxWidth: 1060,
    height: "84%",
    backgroundColor: "#FFF",
    borderRadius: 22,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
      android: { elevation: 8 },
    }),
  },

  header: {
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: OLIVE_BG,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: `${OLIVE}30`,
  },
  headerTitle: { fontSize: 17, fontWeight: "900", color: "#1F2937" },
  headerUnread: { fontSize: 11, color: OLIVE, fontWeight: "700", marginTop: 1 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },

  body: { flex: 1, flexDirection: "row" },

  sidebar: {
    width: 288,
    borderRightWidth: 1,
    borderRightColor: BORDER,
    backgroundColor: SURFACE,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
  },
  newChatBtn: {
    height: 42,
    borderRadius: 12,
    backgroundColor: OLIVE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  newChatBtnText: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  sidebarLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: OLIVE_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 14, fontWeight: "800", color: "#6B7280" },
  emptySub: {
    fontSize: 12,
    color: "#C4C9D4",
    fontWeight: "600",
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    backgroundColor: "#B45309",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: { color: "#FFF", fontSize: 12, fontWeight: "800" },

  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    padding: 10,
    marginBottom: 4,
    position: "relative",
  },
  chatRowActive: { backgroundColor: OLIVE },
  chatRowBody: { flex: 1, minWidth: 0 },
  chatRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chatRowMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  inlineTrashBtn: { padding: 2 },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: OLIVE_BG,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarActive: { backgroundColor: "rgba(255,255,255,0.22)" },
  avatarText: { fontSize: 16, fontWeight: "900", color: OLIVE },
  avatarTextActive: { color: "#FFF" },

  chatName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  chatNameBold: { fontWeight: "900" },
  chatNameActive: { color: "#FFF", fontWeight: "900" },
  chatTime: { fontSize: 11, color: "#9CA3AF", fontWeight: "600", flexShrink: 0 },
  chatTimeActive: { color: "rgba(255,255,255,0.7)" },
  chatRole: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
    marginTop: 1,
    textTransform: "capitalize",
  },
  chatRoleActive: { color: "rgba(255,255,255,0.7)" },
  chatPreview: { marginTop: 3, fontSize: 12, color: "#9CA3AF" },
  chatPreviewBold: { color: "#374151", fontWeight: "700" },
  chatPreviewActive: { color: "rgba(255,255,255,0.75)" },

  pip: {
    position: "absolute",
    top: 12,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: SURFACE,
  },
  pipActive: { borderColor: OLIVE },

  chatPanel: { flex: 1, backgroundColor: "#FFF" },

  chatTopBar: {
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    backgroundColor: SURFACE,
  },
  avatarMd: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: OLIVE_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMdText: { fontSize: 16, fontWeight: "900", color: OLIVE },
  chatTopName: { fontSize: 15, fontWeight: "900", color: "#1F2937" },
  chatTopRole: {
    marginTop: 1,
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "700",
    textTransform: "capitalize",
  },

  msgArea: { flex: 1, backgroundColor: "#F9F8F6" },
  msgContent: { padding: 18, paddingBottom: 10 },

  bubbleRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12, gap: 8 },
  bubbleIn: { justifyContent: "flex-start" },
  bubbleOut: { justifyContent: "flex-end" },

  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: OLIVE_BG,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 2,
  },
  bubbleAvatarText: { fontSize: 11, fontWeight: "900", color: OLIVE },

  bubble: {
    maxWidth: "68%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleSentBg: { backgroundColor: OLIVE, borderBottomRightRadius: 4 },
  bubbleRecvBg: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextSent: { color: "#FFF" },
  bubbleTextRecv: { color: "#1F2937" },

  bubbleMetaRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },

  bubbleDeleteInlineBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  bubbleTimestamp: {
    fontSize: 10,
    color: "#9CA3AF",
    alignSelf: "flex-end",
  },
  bubbleTimestampSent: { color: "rgba(255,255,255,0.55)" },

  emptyPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#F9F8F6",
  },
  emptyPanelIcon: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: OLIVE_BG,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyPanelTitle: { fontSize: 18, fontWeight: "900", color: "#374151" },
  emptyPanelSub: {
    marginTop: 6,
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyMsgs: { marginTop: 10, fontSize: 14, color: "#9CA3AF", fontWeight: "700" },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: "#FFF",
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: OLIVE,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnOff: { opacity: 0.4 },

  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pickerCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 20,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  pickerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerTitle: { fontSize: 18, fontWeight: "900", color: "#1F2937" },
  pickerSub: { fontSize: 13, color: "#9CA3AF", marginBottom: 16, fontWeight: "600" },
  pickerEmpty: { textAlign: "center", color: "#9CA3AF", paddingVertical: 20, fontSize: 14 },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  pickerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: OLIVE_BG,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pickerAvatarText: { fontSize: 16, fontWeight: "900", color: OLIVE },
  pickerName: { fontSize: 14, fontWeight: "800", color: "#1F2937" },
  pickerRole: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "capitalize",
  },

  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
      },
      android: { elevation: 10 },
    }),
  },
  confirmIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  confirmSub: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
  },
  confirmBold: { fontWeight: "800", color: "#374151" },
  confirmBtnRow: { flexDirection: "row", gap: 10, width: "100%" },
  confirmCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  confirmCancelText: { fontSize: 14, fontWeight: "700", color: "#374151" },
  confirmDeleteBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  confirmDeleteText: { fontSize: 14, fontWeight: "800", color: "#FFF" },
});
