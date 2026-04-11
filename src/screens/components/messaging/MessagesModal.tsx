import React, { useEffect, useMemo, useState } from "react";
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

export default function MessagesModal({
  visible,
  onClose,
}: MessagesModalProps) {
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [users, setUsers] = useState<MessageUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const usersById = useMemo(() => {
    const map: Record<string, MessageUser> = {};
    users.forEach((user) => {
      map[String(user.id)] = user;
    });
    return map;
  }, [users]);

  useEffect(() => {
    if (!visible) return;
    loadCurrentUser();
    loadChats();
    loadUsers();
  }, [visible]);

  const loadCurrentUser = async () => {
    try {
      const me = await getMe();
      setCurrentUserId(String(me.id));
    } catch (error) {
      console.log("Failed to get current user:", error);
      setCurrentUserId(null);
    }
  };

  const loadChats = async () => {
    try {
      setLoadingChats(true);
      const data = await getChats();
      setChats(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Failed to load chats:", error);
      setChats([]);
    } finally {
      setLoadingChats(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await getMessageUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Failed to load message users:", error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadConversation = async (otherUserId: string) => {
    try {
      setSelectedUserId(otherUserId);
      setLoadingConversation(true);
      const data = await getConversation(otherUserId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Failed to load conversation:", error);
      setMessages([]);
    } finally {
      setLoadingConversation(false);
    }
  };

  const handleSelectNewChatUser = async (user: MessageUser) => {
    setShowNewChatModal(false);
    await loadConversation(user.id);
    await loadChats();
  };

  const handleSendMessage = async () => {
    if (!selectedUserId || !messageText.trim()) return;

    try {
      setSendingMessage(true);

      await sendMessage(selectedUserId, messageText.trim());
      setMessageText("");

      const updatedConversation = await getConversation(selectedUserId);
      setMessages(Array.isArray(updatedConversation) ? updatedConversation : []);

      const updatedChats = await getChats();
      setChats(Array.isArray(updatedChats) ? updatedChats : []);
    } catch (error) {
      console.log("Failed to send message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const getUserById = (userId: string) => {
    return usersById[String(userId)];
  };

  const getUserDisplayName = (userId: string) => {
    const user = getUserById(userId);
    return user ? user.fullName : `User ${userId}`;
  };

  const formatRole = (role: string) => {
    if (!role) return "";
    return role.replace("ROLE_", "").replaceAll("_", " ");
  };

  const chatList = useMemo(() => {
    return chats.map((chat, index) => {
      const isCurrentUserSender =
        currentUserId !== null &&
        String(chat.senderId) === String(currentUserId);

      const otherUserId = isCurrentUserSender
        ? String(chat.receiverId)
        : String(chat.senderId);

      const otherUserName = isCurrentUserSender
        ? chat.receiverName
        : chat.senderName;

      const otherUser = usersById[otherUserId];

      return {
        key: `${chat.id}-${index}`,
        otherUserId,
        otherUserName,
        otherUserRole: otherUser?.role ?? "",
        preview: chat.content || "No message",
        createdAt: chat.createdAt,
        isRead: chat.isRead,
      };
    });
  }, [chats, currentUserId, usersById]);

  const formatTime = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Messages</Text>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Feather name="x" size={22} color="#111827" />
              </Pressable>
            </View>

            <View style={styles.content}>
              <View style={styles.sidebar}>
                <View style={styles.sidebarTop}>
                  <Text style={styles.sidebarTitle}>Chats</Text>

                  <Pressable
                    style={styles.newChatBtn}
                    onPress={() => setShowNewChatModal(true)}
                  >
                    <Feather name="edit-3" size={14} color="#FFFFFF" />
                    <Text style={styles.newChatBtnText}>New Chat</Text>
                  </Pressable>
                </View>

                {loadingChats ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator size="small" color="#6D6B3B" />
                  </View>
                ) : (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.chatList}
                  >
                    {!chatList.length ? (
                      <Text style={styles.emptySidebarText}>No chats yet</Text>
                    ) : (
                      chatList.map((chat) => (
                        <Pressable
                          key={chat.key}
                          style={[
                            styles.chatItem,
                            selectedUserId === chat.otherUserId &&
                              styles.chatItemActive,
                          ]}
                          onPress={() => loadConversation(chat.otherUserId)}
                        >
                          <View style={styles.chatItemTop}>
                            <Text
                              style={[
                                styles.chatName,
                                selectedUserId === chat.otherUserId &&
                                  styles.chatNameActive,
                              ]}
                              numberOfLines={1}
                            >
                              {chat.otherUserName ?? "Unknown"}
                            </Text>

                            {!!chat.createdAt && (
                              <Text
                                style={[
                                  styles.chatTime,
                                  selectedUserId === chat.otherUserId &&
                                    styles.chatTimeActive,
                                ]}
                              >
                                {formatTime(chat.createdAt)}
                              </Text>
                            )}
                          </View>

                          <Text
                            style={[
                              styles.chatRole,
                              selectedUserId === chat.otherUserId &&
                                styles.chatRoleActive,
                            ]}
                          >
                            {formatRole(chat.otherUserRole)}
                          </Text>

                          <Text
                            numberOfLines={1}
                            style={[
                              styles.chatPreview,
                              selectedUserId === chat.otherUserId &&
                                styles.chatPreviewActive,
                            ]}
                          >
                            {chat.preview}
                          </Text>

                          {!chat.isRead && <View style={styles.unreadDot} />}
                        </Pressable>
                      ))
                    )}
                  </ScrollView>
                )}
              </View>

              <View style={styles.chatPanel}>
                {!selectedUserId ? (
                  <View style={styles.emptyState}>
                    <Feather name="message-square" size={40} color="#B0B7C3" />
                    <Text style={styles.emptyStateTitle}>
                      Select a conversation
                    </Text>
                    <Text style={styles.emptyStateText}>
                      Choose a chat or start a new one.
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.chatHeader}>
                      <Text style={styles.chatHeaderTitle}>
                        {getUserDisplayName(selectedUserId)}
                      </Text>
                      <Text style={styles.chatHeaderSub}>
                        {formatRole(getUserById(selectedUserId)?.role ?? "")}
                      </Text>
                    </View>

                    <ScrollView
                      style={styles.messagesArea}
                      contentContainerStyle={styles.messagesContent}
                      showsVerticalScrollIndicator={false}
                    >
                      {loadingConversation ? (
                        <View style={styles.loadingWrap}>
                          <ActivityIndicator size="small" color="#6D6B3B" />
                        </View>
                      ) : !messages.length ? (
                        <View style={styles.emptyMessagesWrap}>
                          <Text style={styles.emptyMessagesText}>
                            No messages yet. Send the first one to start this conversation.
                          </Text>
                        </View>
                      ) : (
                        messages.map((msg) => {
                          const isOutgoing =
                            currentUserId !== null &&
                            String(msg.senderId) === String(currentUserId);

                          return (
                            <View
                              key={msg.id}
                              style={[
                                styles.messageBubble,
                                isOutgoing
                                  ? styles.messageBubbleOutgoing
                                  : styles.messageBubbleIncoming,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.messageText,
                                  isOutgoing
                                    ? styles.messageTextOutgoing
                                    : styles.messageTextIncoming,
                                ]}
                              >
                                {msg.content}
                              </Text>

                              <Text style={styles.messageTime}>
                                {formatTime(msg.createdAt)}
                              </Text>
                            </View>
                          );
                        })
                      )}
                    </ScrollView>

                    <View style={styles.inputRow}>
                      <TextInput
                        value={messageText}
                        onChangeText={setMessageText}
                        placeholder="Type a message..."
                        placeholderTextColor="#9CA3AF"
                        style={styles.input}
                        multiline
                      />

                      <Pressable
                        style={[
                          styles.sendBtn,
                          (!messageText.trim() || sendingMessage) &&
                            styles.sendBtnDisabled,
                        ]}
                        onPress={handleSendMessage}
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

      <Modal visible={showNewChatModal} transparent animationType="fade">
        <View style={styles.smallModalBackdrop}>
          <View style={styles.smallModalCard}>
            <View style={styles.smallModalHeader}>
              <Text style={styles.smallModalTitle}>Start New Chat</Text>
              <Pressable onPress={() => setShowNewChatModal(false)}>
                <Feather name="x" size={20} color="#111827" />
              </Pressable>
            </View>

            {loadingUsers ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#6D6B3B" />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {users.map((user) => (
                  <Pressable
                    key={user.id}
                    style={styles.userOption}
                    onPress={() => handleSelectNewChatUser(user)}
                  >
                    <Text style={styles.userOptionName}>{user.fullName}</Text>
                    <Text style={styles.userOptionRole}>
                      {formatRole(user.role)}
                    </Text>
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
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  header: {
    height: 68,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#111827",
  },

  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    flex: 1,
    flexDirection: "row",
  },

  sidebar: {
    width: 310,
    borderRightWidth: 1,
    borderRightColor: "#ECECEC",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },

  sidebarTop: {
    marginBottom: 10,
  },

  sidebarTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1F2937",
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  newChatBtn: {
    height: 40,
    borderRadius: 10,
    backgroundColor: "#6D6B3B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  newChatBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  chatList: {
    paddingBottom: 10,
  },

  chatItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    position: "relative",
  },

  chatItemActive: {
    backgroundColor: "#6D6B3B",
    borderColor: "#6D6B3B",
  },

  chatItemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  chatName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  chatNameActive: {
    color: "#FFFFFF",
  },

  chatRole: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },

  chatRoleActive: {
    color: "#EAEAEA",
  },

  chatTime: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "700",
  },

  chatTimeActive: {
    color: "#EAEAEA",
  },

  chatPreview: {
    marginTop: 5,
    fontSize: 12,
    color: "#6B7280",
  },

  chatPreviewActive: {
    color: "#F5F5F5",
  },

  unreadDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#DC2626",
  },

  chatPanel: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  chatHeader: {
    height: 68,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  chatHeaderTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },

  chatHeaderSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  messagesArea: {
    flex: 1,
  },

  messagesContent: {
    padding: 16,
  },

  messageBubble: {
    maxWidth: "72%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },

  messageBubbleOutgoing: {
    alignSelf: "flex-end",
    backgroundColor: "#6D6B3B",
  },

  messageBubbleIncoming: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
  },

  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },

  messageTextOutgoing: {
    color: "#FFFFFF",
  },

  messageTextIncoming: {
    color: "#111827",
  },

  messageTime: {
    marginTop: 6,
    fontSize: 11,
    color: "#9CA3AF",
    alignSelf: "flex-end",
  },

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
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: "#111827",
  },

  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#6D6B3B",
    alignItems: "center",
    justifyContent: "center",
  },

  sendBtnDisabled: {
    opacity: 0.6,
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  emptyStateTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "900",
    color: "#4B5563",
  },

  emptyStateText: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },

  emptyMessagesWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },

  emptyMessagesText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "700",
  },

  emptySidebarText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 18,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },

  smallModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.32)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  smallModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
  },

  smallModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  smallModalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },

  userOption: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  userOptionName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  userOptionRole: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
});