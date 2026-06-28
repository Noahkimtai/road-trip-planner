const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export interface Notification {
  id: number;
  notification_type: "trip_reminder" | "trip_shared" | "general";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  trip: number | null;
}

const authHeaders = (): HeadersInit => {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    const res = await fetch(`${API_BASE_URL}/messaging/notifications/`, {
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.results ?? [];
  },

  async markRead(id: number): Promise<void> {
    await fetch(`${API_BASE_URL}/messaging/notifications/${id}/read/`, {
      method: "PATCH",
      headers: authHeaders(),
    });
  },

  async markAllRead(): Promise<void> {
    await fetch(`${API_BASE_URL}/messaging/notifications/mark-all-read/`, {
      method: "POST",
      headers: authHeaders(),
    });
  },
};
