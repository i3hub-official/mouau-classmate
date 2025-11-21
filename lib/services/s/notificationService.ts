// lib/services/notificationService.ts
import { prisma } from "@/lib/server/prisma";
import { NotificationType } from "@prisma/client";
import {
  Notification,
  NotificationPreferences,
  NotificationResponse,
  NotificationCount,
  CreateNotificationData,
} from "@/lib/types/s";


export class StudentNotificationService {
  /**
   * Get notifications for a student
   */
  static async getStudentNotifications(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<NotificationResponse> {
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

      const totalPages = Math.ceil(total / limit);

      return {
        notifications: notifications as Notification[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
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
  ): Promise<NotificationResponse> {
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

      const totalPages = Math.ceil(total / limit);

      return {
        notifications: notifications as Notification[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
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
  static async markNotificationAsRead(
    notificationId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
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
  static async markAllNotificationsAsRead(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
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
  static async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<{ success: boolean; message: string }> {
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
    data: CreateNotificationData
  ): Promise<{
    success: boolean;
    notification: Notification;
    message: string;
  }> {
    try {
      const {
        title,
        message,
        type = NotificationType.INFO,
        actionUrl,
        priority = 1,
      } = data;

      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          actionUrl,
          priority,
          isRead: false,
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
   * Create multiple notifications for multiple users
   */
  static async createBulkNotifications(
    userIds: string[],
    data: CreateNotificationData
  ): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const {
        title,
        message,
        type = NotificationType.INFO,
        actionUrl,
        priority = 1,
      } = data;

      const notifications = userIds.map((userId) => ({
        userId,
        title,
        message,
        type,
        actionUrl,
        priority,
        isRead: false,
        createdAt: new Date(),
      }));

      const result = await prisma.notification.createMany({
        data: notifications,
      });

      return {
        success: true,
        count: result.count,
        message: `Notifications created for ${result.count} users`,
      };
    } catch (error) {
      console.error("Error creating bulk notifications:", error);
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
  ): Promise<{ success: boolean; message: string }> {
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
  static async getNotificationCount(
    userId: string
  ): Promise<NotificationCount> {
    try {
      const [total, unread, typeCounts] = await Promise.all([
        prisma.notification.count({ where: { userId } }),
        prisma.notification.count({
          where: {
            userId,
            isRead: false,
          },
        }),
        prisma.notification.groupBy({
          by: ["type"],
          where: { userId },
          _count: {
            _all: true,
          },
        }),
      ]);

      // Convert type counts to record
      const byType = typeCounts.reduce((acc, item) => {
        acc[item.type] = item._count._all;
        return acc;
      }, {} as Record<NotificationType, number>);

      return {
        total,
        unread,
        byType,
      };
    } catch (error) {
      console.error("Error getting notification count:", error);
      throw error;
    }
  }

  /**
   * Get notifications by type
   */
  static async getNotificationsByType(
    userId: string,
    type: NotificationType,
    page: number = 1,
    limit: number = 10
  ): Promise<NotificationResponse> {
    try {
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where: {
            userId,
            type,
          },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.notification.count({
          where: {
            userId,
            type,
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        notifications: notifications as Notification[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error("Error getting notifications by type:", error);
      throw error;
    }
  }

  /**
   * Clear all notifications for a user
   */
  static async clearAllNotifications(
    userId: string
  ): Promise<{ success: boolean; message: string; deletedCount: number }> {
    try {
      const result = await prisma.notification.deleteMany({
        where: { userId },
      });

      return {
        success: true,
        message: `All notifications cleared successfully`,
        deletedCount: result.count,
      };
    } catch (error) {
      console.error("Error clearing all notifications:", error);
      throw error;
    }
  }

  /**
   * Get recent notifications (last 7 days)
   */
  static async getRecentNotifications(
    userId: string,
    days: number = 7,
    limit: number = 20
  ): Promise<Notification[]> {
    try {
      const date = new Date();
      date.setDate(date.getDate() - days);

      const notifications = await prisma.notification.findMany({
        where: {
          userId,
          createdAt: {
            gte: date,
          },
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      return notifications as Notification[];
    } catch (error) {
      console.error("Error getting recent notifications:", error);
      throw error;
    }
  }

  /**
   * Send assignment reminder notification
   */
  static async sendAssignmentReminder(
    userId: string,
    assignmentTitle: string,
    dueDate: Date,
    courseCode: string,
    actionUrl?: string
  ): Promise<{
    success: boolean;
    notification: Notification;
    message: string;
  }> {
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    let message = "";
    if (daysUntilDue === 0) {
      message = `Assignment "${assignmentTitle}" for ${courseCode} is due today!`;
    } else if (daysUntilDue === 1) {
      message = `Assignment "${assignmentTitle}" for ${courseCode} is due tomorrow!`;
    } else {
      message = `Assignment "${assignmentTitle}" for ${courseCode} is due in ${daysUntilDue} days`;
    }

    return this.createNotification(userId, {
      title: "Assignment Reminder",
      message,
      type: NotificationType.REMINDER,
      actionUrl,
      priority: daysUntilDue <= 1 ? 3 : 2, // Higher priority for closer due dates
    });
  }

  /**
   * Send grade alert notification
   */
  static async sendGradeAlert(
    userId: string,
    assignmentTitle: string,
    score: number,
    courseCode: string,
    actionUrl?: string
  ): Promise<{
    success: boolean;
    notification: Notification;
    message: string;
  }> {
    const message = `Your grade for "${assignmentTitle}" in ${courseCode} has been posted: ${score}%`;

    return this.createNotification(userId, {
      title: "Grade Posted",
      message,
      type: NotificationType.GRADE,
      actionUrl,
      priority: 2,
    });
  }
}
