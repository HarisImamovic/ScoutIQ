import client from "./client";

export interface NotificationItem {
  id: string;
  icon_type: "star" | "file" | "profile";
  title: string;
  body: string;
  action_data: Record<string, string> | null;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  getNotifications: (): Promise<NotificationItem[]> =>
    client.get("/notifications").then((r) => r.data),

  markAllRead: (): Promise<void> =>
    client.post("/notifications/read").then(() => undefined),

  clearNotifications: (): Promise<void> =>
    client.delete("/notifications").then(() => undefined),

  updateHighlightStatus: (highlightId: string, status: "approved" | "rejected"): Promise<void> =>
    client.put(`/highlights/${highlightId}/status`, { status }).then(() => undefined),
};
