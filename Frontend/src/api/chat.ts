import { api } from "./client";

export type NotificationItem = {
  id: number;
  application: number | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type UnreadSummary = {
  unread_messages: number;
  unread_notifications: number;
  total: number;
};

export async function getNotifications() {
  const res = await api.get<NotificationItem[]>("/chat/notifications/");
  return res.data;
}

export async function markNotificationsRead() {
  const res = await api.post("/chat/notifications/read/");
  return res.data;
}

export async function getUnreadSummary() {
  const res = await api.get<UnreadSummary>("/chat/unread-summary/");
  return res.data;
}