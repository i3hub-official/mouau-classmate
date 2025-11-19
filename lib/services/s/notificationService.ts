// lib/services/notificationService.ts
import { prisma } from "@/lib/server/prisma";
import { Notification, NotificationPreferences } from "@/lib/types/s/index";
import { NotificationType } from "@prisma/client";

export class StudentNotificationService {
  /**
   * Get notifications for a student
   */
  static async getStudentNotifications(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.notification.count({ where: { userId } }),
      ]);

      return {
        notifications: notifications as Notification[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting student notifications:", error);
      throw error;
    }
  }

  /**
   * Get unread notifications for a student
   */
  static async getUnreadNotifications(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where: {
            userId,
            isRead: false,
          },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.notification.count({
          where: {
            userId,
            isRead: false,
          },
        }),
      ]);

      return {
        notifications: notifications as Notification[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting unread notifications:", error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId, // Ensure user can only mark their own notifications
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      if (notification.count === 0) {
        throw new Error(
          "Notification not found or you don't have permission to mark it as read"
        );
      }

      return {
        success: true,
        message: "Notification marked as read",
      };
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllNotificationsAsRead(userId: string) {
    try {
      await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return {
        success: true,
        message: "All notifications marked as read",
      };
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId, // Ensure user can only delete their own notifications
        },
      });

      if (notification.count === 0) {
        throw new Error(
          "Notification not found or you don't have permission to delete it"
        );
      }

      return {
        success: true,
        message: "Notification deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }

  /**
   * Create notification
   */
  static async createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = NotificationType.INFO,
    actionUrl?: string,
    priority: number = 1
  ) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          actionUrl,
          priority,
        },
      });

      return {
        success: true,
        notification: notification as Notification,
        message: "Notification created successfully",
      };
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  static async getNotificationPreferences(
    userId: string
  ): Promise<NotificationPreferences> {
    try {
      let preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      // If preferences don't exist, create default preferences
      if (!preferences) {
        preferences = await prisma.userPreferences.create({
          data: {
            userId,
            emailNotifications: true,
            pushNotifications: true,
            assignmentReminders: true,
            gradeAlerts: true,
            lectureReminders: true,
          },
        });
      }

      return {
        emailNotifications: preferences.emailNotifications,
        pushNotifications: preferences.pushNotifications,
        assignmentReminders: preferences.assignmentReminders,
        gradeAlerts: preferences.gradeAlerts,
        lectureReminders: preferences.lectureReminders,
      };
    } catch (error) {
      console.error("Error getting notification preferences:", error);
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ) {
    try {
      await prisma.userPreferences.upsert({
        where: { userId },
        update: {
          ...preferences,
          updatedAt: new Date(),
        },
        create: {
          userId,
          emailNotifications: preferences.emailNotifications ?? true,
          pushNotifications: preferences.pushNotifications ?? true,
          assignmentReminders: preferences.assignmentReminders ?? true,
          gradeAlerts: preferences.gradeAlerts ?? true,
          lectureReminders: preferences.lectureReminders ?? true,
        },
      });

      return {
        success: true,
        message: "Notification preferences updated successfully",
      };
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      throw error;
    }
  }

  /**
   * Get notification count
   */
  static async getNotificationCount(userId: string) {
    try {
      const [total, unread] = await Promise.all([
        prisma.notification.count({ where: { userId } }),
        prisma.notification.count({
          where: {
            userId,
            isRead: false,
          },
        }),
      ]);

      return {
        total,
        unread,
        byType: {} as Record<string, number>, // Could be implemented if needed
      };
    } catch (error) {
      console.error("Error getting notification count:", error);
      throw error;
    }
  }
}
