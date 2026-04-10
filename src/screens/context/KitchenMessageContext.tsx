import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { getAuthToken } from '../../services/storage';

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

// ---------- Backend helpers (graceful fallback) ----------

async function apiPostMessage(msg: KitchenMessage): Promise<void> {
  try {
    const tok = await getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (tok) headers['Authorization'] = `Bearer ${tok}`;
    await fetch(`${BASE}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...msg,
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
      fromRole: m.fromRole ?? 'kitchen',
      fromName: String(m.fromName ?? ''),
      text: String(m.text ?? ''),
      timestamp: new Date(m.timestamp ?? m.createdAt ?? Date.now()),
      read: Boolean(m.read),
      channel: m.channel === 'staff' ? 'staff' : 'order',
    }));
  } catch { return []; }
}

// ---------- Provider ----------

export const KitchenMessageProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<KitchenMessage[]>([]);

  // Load persisted messages from backend on mount
  const refreshMessages = useCallback(async () => {
    const remote = await apiFetchMessages();
    if (remote.length > 0) {
      setMessages(remote);
    }
  }, []);

  useEffect(() => { refreshMessages(); }, [refreshMessages]);

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
      setMessages(prev => [newMsg, ...prev]);
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
