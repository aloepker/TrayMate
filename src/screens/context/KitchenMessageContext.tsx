import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// ---------- Types ----------

export type KitchenMessage = {
  id: string;
  residentId: string;
  orderId?: number;
  residentName: string;
  residentRoom: string;
  fromRole: 'caregiver' | 'admin' | 'kitchen';
  fromName: string;
  text: string;
  timestamp: Date;
  read: boolean;
};

type KitchenMessageContextType = {
  messages: KitchenMessage[];
  unreadCount: number;
  sendMessage: (msg: Omit<KitchenMessage, 'id' | 'timestamp' | 'read'>) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
};

const KitchenMessageContext = createContext<KitchenMessageContextType | undefined>(undefined);

export const KitchenMessageProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<KitchenMessage[]>([]);

  const sendMessage = useCallback(
    (msg: Omit<KitchenMessage, 'id' | 'timestamp' | 'read'>) => {
      const parsedOrderId =
        typeof msg.orderId === "number"
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
        id: `msg_${Date.now()}`,
        timestamp: new Date(),
        read: false,
      };
      setMessages(prev => [newMsg, ...prev]);
    },
    [],
  );

  const markAllRead = useCallback(() => {
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  }, []);

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <KitchenMessageContext.Provider value={{ messages, unreadCount, sendMessage, markAllRead, markRead }}>
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
  sendMessage: NOOP_SEND,
  markAllRead: NOOP,
  markRead: NOOP_MARK,
};

export const useKitchenMessages = () => {
  const ctx = useContext(KitchenMessageContext);
  return ctx ?? FALLBACK;
};
