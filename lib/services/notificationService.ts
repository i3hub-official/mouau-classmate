// lib/services/notificationService.ts
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  isRead: boolean;
  actionUrl?: string;
  createdAt: Date;
  readAt?: Date;
  priority: number; // 1=low, 2=medium, 3=high
}

export class NotificationService {
  /**
   * Get notifications for current user
   */
  static async getNotifications(limit: number = 10): Promise<Notification[]> {
    try {
      const response = await fetch(`/api/notifications?limit=${limit}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch notifications: ${response.statusText}`
        );
      }

      const data = await response.json();

      // Parse dates
      return data.map((notification: any) => ({
        ...notification,
        createdAt: new Date(notification.createdAt),
        readAt: notification.readAt ? new Date(notification.readAt) : undefined,
      }));
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `/api/notifications/${notificationId}/read`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<boolean> {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(): Promise<number> {
    try {
      const response = await fetch("/api/notifications/unread-count", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch unread count: ${response.statusText}`);
      }

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error("Error fetching unread count:", error);
      return 0;
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Error deleting notification:", error);
      return false;
    }
  }

  /**
   * Get notification icon based on type
   */
  static getNotificationIcon(type: string) {
    switch (type) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      case "info":
      default:
        return "ℹ️";
    }
  }

  /**
   * Get notification color classes based on type
   */
  static getNotificationColor(type: string) {
    switch (type) {
      case "success":
        return "text-green-600 bg-green-50 border-green-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      case "info":
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  }

  /**
   * Format notification time
   */
  static formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  private static getMockNotifications(): Notification[] {
    return [
      {
        id: "1",
        title: "Welcome to MOUAU ClassMate!",
        message:
          "Your account has been successfully activated. Start exploring your courses.",
        type: "success",
        isRead: false,
        actionUrl: "/dashboard",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        priority: 1,
      },
      {
        id: "2",
        title: "New Assignment Available",
        message:
          "Introduction to Computer Science assignment is now available. Due in 7 days.",
        type: "info",
        isRead: false,
        actionUrl: "/assignments",
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        priority: 2,
      },
      {
        id: "3",
        title: "Grade Posted",
        message:
          "Your Mathematics assignment has been graded. Check your grades page for details.",
        type: "success",
        isRead: true,
        actionUrl: "/grades",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        readAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        priority: 2,
      },
      {
        id: "4",
        title: "Lecture Reminder",
        message:
          "Physics lecture starts in 30 minutes. Don't forget to attend!",
        type: "warning",
        isRead: true,
        actionUrl: "/schedule",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        readAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        priority: 3,
      },
    ];
  }
}
