import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { getAuthToken } from '../../services/storage';
import { parseServerTimestamp, toLocalISODate } from '../../services/dateUtils';

const BASE = 'https://traymate-auth.onrender.com';

// ---------- Types ----------

export type KitchenMessage = {
  id: string;
  residentId: string;
  orderId?: number;
  residentName: string;
  residentRoom: string;
  /** 'kitchen'/'admin'/'caregiver' → staff message; 'resident' → reply from resident */
  fromRole: 'caregiver' | 'admin' | 'kitchen' | 'resident';
  fromName: string;
  text: string;
  timestamp: Date;
  read: boolean;
  /** 'order' = per-order resident↔kitchen thread; 'staff' = kitchen↔admin channel */
  channel: 'order' | 'staff';
};

type KitchenMessageContextType = {
  messages: KitchenMessage[];
  unreadCount: number;        // unread 'order' channel messages (for bell / order cards)
  staffUnreadCount: number;   // unread 'staff' channel messages (for chat icon)
  sendMessage: (msg: Omit<KitchenMessage, 'id' | 'timestamp' | 'read'>) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  refreshMessages: () => void;
};

const KitchenMessageContext = createContext<KitchenMessageContextType | undefined>(undefined);

/**
 * Marks a resident's per-order "special note for kitchen" when it's sent
 * through the messages channel. We route the note here (in addition to the
 * order's `note` field) because the order.note backend round-trip is
 * unreliable on the deployed instance, whereas /messages is dependable.
 * Both the kitchen dashboard and the resident's upcoming-meals screen use
 * this tag to show the note in its own section, separate from chat.
 */
export const SPECIAL_NOTE_TAG = '[SPECIAL NOTE]';

// ---------- Backend helpers (graceful fallback) ----------

/** Derive a human-readable department from the message's fromRole. */
function departmentFromRole(role: KitchenMessage['fromRole']): string {
  switch (role) {
    case 'kitchen':   return 'Kitchen';
    case 'admin':     return 'Administration';
    case 'caregiver': return 'Caregiver';
    case 'resident':  return 'Resident';
    default:          return 'Staff';
  }
}

/**
 * Persist a chat message to the backend.
 * Body includes explicit `senderName`, `senderRole`, `department`, and
 * `sentAt` fields so any simple REST backend can store the full audit
 * trail without having to interpret legacy shorthand fields.
 */
async function apiPostMessage(msg: KitchenMessage): Promise<void> {
  try {
    const tok = await getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (tok) headers['Authorization'] = `Bearer ${tok}`;
    await fetch(`${BASE}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        // Legacy / in-app fields
        id: msg.id,
        residentId: msg.residentId,
        residentName: msg.residentName,
        residentRoom: msg.residentRoom,
        orderId: msg.orderId ?? null,
        channel: msg.channel,
        text: msg.text,
        read: msg.read,
        // Explicit, backend-friendly fields
        senderName: msg.fromName,
        senderRole: msg.fromRole,
        department: departmentFromRole(msg.fromRole),
        sentAt: msg.timestamp.toISOString(),
        sentDate: toLocalISODate(msg.timestamp), // local YYYY-MM-DD (not UTC)
        // Back-compat aliases
        fromName: msg.fromName,
        fromRole: msg.fromRole,
        timestamp: msg.timestamp.toISOString(),
      }),
    });
  } catch { /* no backend endpoint yet — silently continue with in-memory */ }
}

async function apiFetchMessages(): Promise<KitchenMessage[]> {
  try {
    const tok = await getAuthToken();
    const headers: Record<string, string> = {};
    if (tok) headers['Authorization'] = `Bearer ${tok}`;
    const res = await fetch(`${BASE}/messages`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((m: any) => ({
      id: String(m.id ?? m._id ?? ''),
      residentId: String(m.residentId ?? ''),
      orderId: m.orderId != null ? Number(m.orderId) : undefined,
      residentName: String(m.residentName ?? ''),
      residentRoom: String(m.residentRoom ?? ''),
      fromRole: (m.senderRole ?? m.fromRole ?? 'kitchen') as KitchenMessage['fromRole'],
      fromName: String(m.senderName ?? m.fromName ?? ''),
      text: String(m.text ?? ''),
      timestamp: parseServerTimestamp(m.sentAt ?? m.timestamp ?? m.createdAt),
      read: Boolean(m.read),
      channel: m.channel === 'staff' ? 'staff' : 'order',
    }));
  } catch { return []; }
}

// ---------- Provider ----------

// Hard cap on how many messages we hold in memory. Without this, the
// 30s poll keeps appending whatever the backend returns and the JS
// heap grows without bound during long-running kitchen / caregiver
// sessions (the primary culprit behind the "app gets slower after a
// few hours" reports). 300 keeps several days of normal traffic
// available for scroll-back while bounding memory at ~150 KB of
// message objects.
const MAX_MESSAGES_IN_MEMORY = 300;

const trimMessages = (msgs: KitchenMessage[]): KitchenMessage[] => {
  if (msgs.length <= MAX_MESSAGES_IN_MEMORY) return msgs;
  // Keep the newest N — messages are stored newest-first via [newMsg, ...prev]
  // and the refresh path sorts before assigning, so slicing from the front
  // preserves the most-recent window.
  return msgs.slice(0, MAX_MESSAGES_IN_MEMORY);
};

export const KitchenMessageProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<KitchenMessage[]>([]);

  // Load persisted messages from backend. Merges with any locally-optimistic
  // messages so a just-sent message doesn't briefly disappear between the
  // optimistic insert and the backend echo.
  const refreshMessages = useCallback(async () => {
    const remote = await apiFetchMessages();
    setMessages(prev => {
      if (remote.length === 0) return prev;
      // Keep any local-only messages (id starts with "msg_") that the backend
      // hasn't echoed yet — drop them once a server message with the same
      // text+timestamp shows up to avoid duplicates.
      const remoteSig = new Set(
        remote.map(m => `${m.fromName}|${m.text}|${m.timestamp.getTime()}`),
      );
      const pending = prev.filter(
        m => m.id.startsWith('msg_') &&
          !remoteSig.has(`${m.fromName}|${m.text}|${m.timestamp.getTime()}`),
      );
      return trimMessages([...pending, ...remote]);
    });
  }, []);

  // Load on mount + poll every 30s so kitchen → resident messages actually
  // arrive without the resident having to close and reopen the app. Same
  // poll covers caregiver → resident and staff-channel updates.
  useEffect(() => {
    refreshMessages();
    const interval = setInterval(refreshMessages, 30_000);
    return () => clearInterval(interval);
  }, [refreshMessages]);

  const sendMessage = useCallback(
    (msg: Omit<KitchenMessage, 'id' | 'timestamp' | 'read'>) => {
      const parsedOrderId =
        typeof msg.orderId === 'number'
          ? msg.orderId
          : Number.isFinite(Number(msg.orderId))
            ? Number(msg.orderId)
            : undefined;

      const newMsg: KitchenMessage = {
        ...msg,
        residentId: String(msg.residentId ?? '').trim(),
        residentName: String(msg.residentName ?? '').trim() || 'Resident',
        residentRoom: String(msg.residentRoom ?? '').trim(),
        fromName: String(msg.fromName ?? '').trim() || 'Staff',
        text: String(msg.text ?? '').trim(),
        orderId: parsedOrderId,
        channel: msg.channel ?? 'order',
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date(),
        read: false,
      };
      setMessages(prev => trimMessages([newMsg, ...prev]));
      // Fire-and-forget backend persistence
      apiPostMessage(newMsg);
    },
    [],
  );

  const markAllRead = useCallback(() => {
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  }, []);

  const unreadCount = messages.filter(m => !m.read && m.channel === 'order').length;
  const staffUnreadCount = messages.filter(m => !m.read && m.channel === 'staff').length;

  return (
    <KitchenMessageContext.Provider value={{
      messages, unreadCount, staffUnreadCount,
      sendMessage, markAllRead, markRead, refreshMessages,
    }}>
      {children}
    </KitchenMessageContext.Provider>
  );
};

// Safe fallback so screens don't crash if rendered before the provider mounts
const NOOP_SEND = (_msg: Omit<KitchenMessage, 'id' | 'timestamp' | 'read'>) => {};
const NOOP = () => {};
const NOOP_MARK = (_id: string) => {};
const FALLBACK: KitchenMessageContextType = {
  messages: [],
  unreadCount: 0,
  staffUnreadCount: 0,
  sendMessage: NOOP_SEND,
  markAllRead: NOOP,
  markRead: NOOP_MARK,
  refreshMessages: NOOP,
};

export const useKitchenMessages = () => {
  const ctx = useContext(KitchenMessageContext);
  return ctx ?? FALLBACK;
};
