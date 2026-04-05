import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// ---------- Types ----------

export type KitchenMessage = {
  id: string;
  residentId: string;
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
      const newMsg: KitchenMessage = {
        ...msg,
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

export const useKitchenMessages = () => {
  const ctx = useContext(KitchenMessageContext);
  if (!ctx) throw new Error('useKitchenMessages must be used within KitchenMessageProvider');
  return ctx;
};
