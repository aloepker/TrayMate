/**
 * StaffChatModal — shared kitchen ↔ admin direct-message panel.
 * Accessible from KitchenDashboard and AdminDashboard header.
 * Residents never see this modal.
 */
import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useKitchenMessages, KitchenMessage } from '../context/KitchenMessageContext';

const C = {
  primary:     '#717644',
  primaryLight:'#F0EFE6',
  background:  '#F5F3EE',
  surface:     '#FDFCF9',
  inputBg:     '#EFEDE7',
  border:      '#E2DFD8',
  text:        '#1A1A1A',
  textMuted:   '#5C5C5C',
  danger:      '#C53030',
  warmBorder:  '#DDD0B8',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  senderName: string;
  senderRole: 'kitchen' | 'admin';
}

export default function StaffChatModal({ visible, onClose, senderName, senderRole }: Props) {
  const { messages, staffUnreadCount, sendMessage, markRead } = useKitchenMessages();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  const staffMessages = messages
    .filter(m => m.channel === 'staff')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage({
      residentId: '',
      residentName: '',
      residentRoom: '',
      fromRole: senderRole,
      fromName: senderName || (senderRole === 'kitchen' ? 'Kitchen Staff' : 'Admin'),
      text: trimmed,
      channel: 'staff',
    });
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = ({ item }: { item: KitchenMessage }) => {
    const isMine = item.fromName === senderName && item.fromRole === senderRole;
    if (!item.read) markRead(item.id);
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMine && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.fromRole === 'kitchen' ? '🍳' : '🔑'}
            </Text>
          </View>
        )}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          {!isMine && (
            <Text style={styles.senderLabel}>{item.fromName}</Text>
          )}
          <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{item.text}</Text>
          <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Feather name="message-square" size={20} color={C.primary} />
            <Text style={styles.headerTitle}>Staff Chat</Text>
            {staffUnreadCount > 0 && (
              <View style={styles.unreadPill}>
                <Text style={styles.unreadPillText}>{staffUnreadCount}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={22} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.subHeader}>
          <Feather name="lock" size={11} color={C.textMuted} />
          <Text style={styles.subHeaderText}>Kitchen &amp; Admin only · Not visible to residents</Text>
        </View>

        {/* Messages */}
        {staffMessages.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="message-square" size={40} color={C.border} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyDesc}>Send a message to kitchen or admin staff</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={staffMessages}
            keyExtractor={m => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Compose */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={20}
        >
          <View style={styles.composeRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Message kitchen or admin..."
              placeholderTextColor="#ABABAB"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim()}
            >
              <Feather name="send" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  unreadPill: {
    backgroundColor: C.danger, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
  },
  unreadPillText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  closeBtn: { padding: 6 },

  subHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#FEF3C7', borderBottomWidth: 1, borderBottomColor: '#FDE68A',
  },
  subHeaderText: { fontSize: 11, color: '#92400E', fontWeight: '500' },

  listContent: { padding: 16, gap: 10 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.textMuted },
  emptyDesc: { fontSize: 14, color: C.textMuted, textAlign: 'center' },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 8 },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },

  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16 },

  bubble: {
    maxWidth: '75%', borderRadius: 16, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  bubbleMine: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: C.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },

  senderLabel: { fontSize: 11, fontWeight: '700', color: C.primary, marginBottom: 3 },
  msgText: { fontSize: 14, color: C.text, lineHeight: 20 },
  msgTextMine: { color: '#FFF' },
  msgTime: { fontSize: 10, color: C.textMuted, marginTop: 4 },
  msgTimeMine: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },

  composeRow: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-end',
    padding: 12, backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  input: {
    flex: 1, backgroundColor: C.inputBg, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: C.text, minHeight: 42, maxHeight: 120,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: C.border },
});
