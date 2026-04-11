// src/screens/components/messaging/messagingTypes.ts

export type ChatPreview = {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;  
  receiverName: string;
  content: string;
  createdAt: string;
  isRead: boolean;
};

export type Message = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
};

export type MessageUser = {
  id: string;
  fullName: string;
  role: string;
};

export type MessagesModalProps = {
  visible: boolean;
  onClose: () => void;
};