// lib/services/serverProfileService.ts
import "server-only";

import { prisma } from "@/lib/server/prisma";
import {
  protectData,
  unprotectData,
  validatePasswordStrength,
} from "@/lib/security/dataProtection";

// Import the shared interfaces from the client service
import type {
  UserProfile,
  SecuritySettings,
  NotificationSettings,
  UpdateProfileData,
} from "./profileService";

export class ServerProfileService {
  /**
   * Get complete user profile data with decrypted fields
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          student: true,
        },
      });

      if (!user) {
        return null;
      }

      // Decrypt protected student fields
      let decryptedStudentData: any = {};
      if (user.student) {
        const [
          decryptedPhone,
          decryptedState,
          decryptedLga,
          decryptedLastName,
          decryptedFirstName,
          decryptedOtherName,
        ] = await Promise.all([
          unprotectData(user.student.phone, "phone"),
          unprotectData(user.student.state, "location"),
          unprotectData(user.student.lga, "location"),
          unprotectData(user.student.lastName, "name"),
          unprotectData(user.student.firstName, "name"),
          unprotectData(user.student.otherName || "", "name"),
        ]);

        decryptedStudentData = {
          matricNumber: user.student.matricNumber,
          department: user.student.department,
          college: user.student.college,
          course: user.student.course,
          phone: decryptedPhone,
          state: decryptedState,
          lga: decryptedLga,
          dateOfBirth: user.student.dateOfBirth?.toISOString().split("T")[0],
          gender: user.student.gender,
          maritalStatus: user.student.maritalStatus,
          admissionYear: user.student.admissionYear,
          dateEnrolled: user.student.dateEnrolled?.toISOString().split("T")[0],
        };
      }

      return {
        id: user.id,
        name: user.name || "",
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
        loginCount: user.loginCount,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        ...decryptedStudentData,
      };
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  }

  /**
   * Update user profile information
   */
  static async updateProfile(
    userId: string,
    profileData: UpdateProfileData
  ): Promise<boolean> {
    try {
      // Get user to check if they have a student record
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { student: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Prepare user update data
      const userUpdateData: any = {};
      if (profileData.name) {
        userUpdateData.name = profileData.name;
      }

      // Prepare student update data if student exists
      let studentUpdateData: any = {};
      if (user.student) {
        const updateFields: any = {};

        if (profileData.phone) {
          const protectedPhone = await protectData(profileData.phone, "phone");
          updateFields.phone = protectedPhone.encrypted;
          updateFields.phoneSearchHash = protectedPhone.searchHash;
        }

        if (profileData.state) {
          const protectedState = await protectData(
            profileData.state,
            "location"
          );
          updateFields.state = protectedState.encrypted;
        }

        if (profileData.lga) {
          const protectedLga = await protectData(profileData.lga, "location");
          updateFields.lga = protectedLga.encrypted;
        }

        if (profileData.dateOfBirth) {
          updateFields.dateOfBirth = new Date(profileData.dateOfBirth);
        }

        if (profileData.gender) {
          updateFields.gender = profileData.gender;
        }

        if (profileData.maritalStatus) {
          updateFields.maritalStatus = profileData.maritalStatus;
        }

        studentUpdateData = updateFields;
      }

      // Perform updates in transaction
      await prisma.$transaction(async (tx) => {
        // Update user
        if (Object.keys(userUpdateData).length > 0) {
          await tx.user.update({
            where: { id: userId },
            data: userUpdateData,
          });
        }

        // Update student if data exists
        if (user.student && Object.keys(studentUpdateData).length > 0) {
          await tx.student.update({
            where: { id: user.student.id },
            data: studentUpdateData,
          });
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: userId,
          action: "PROFILE_UPDATED",
          resourceType: "USER",
          resourceId: userId,
          details: {
            updatedFields: Object.keys(profileData),
          },
          ipAddress: "profile_service",
          userAgent: "profile_service",
        },
      });

      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw new Error("Failed to update profile");
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string): Promise<{
    totalLogins: number;
    lastLogin: string | null;
    accountAge: number;
    profileCompletion: number;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          loginCount: true,
          lastLoginAt: true,
          createdAt: true,
          name: true,
          student: {
            select: {
              phone: true,
              state: true,
              lga: true,
              dateOfBirth: true,
              gender: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Calculate profile completion
      const profileFields = [
        "name",
        "phone",
        "state",
        "lga",
        "dateOfBirth",
        "gender",
        "preferences", // Add preferences as a completion field
      ];

      let completedFields = 0;

      // Check name
      if (user.name) completedFields++;

      // Check student fields
      if (user.student) {
        if (user.student.phone) completedFields++;
        if (user.student.state) completedFields++;
        if (user.student.lga) completedFields++;
        if (user.student.dateOfBirth) completedFields++;
        if (user.student.gender) completedFields++;
      }

      // Check if user has customized their preferences (not just using defaults)
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      // Consider preferences "completed" if they exist (user has visited settings)
      if (preferences) completedFields++;

      const profileCompletion = Math.round(
        (completedFields / profileFields.length) * 100
      );

      // Calculate account age in days
      const accountAge = Math.floor(
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        totalLogins: user.loginCount,
        lastLogin: user.lastLoginAt?.toISOString() || null,
        accountAge,
        profileCompletion,
      };
    } catch (error) {
      console.error("Error fetching user stats:", error);
      throw new Error("Failed to fetch user statistics");
    }
  }

  /**
   * Get user activity log
   */
  static async getActivityLog(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const activities = await prisma.auditLog.findMany({
        where: {
          userId: userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: Math.min(limit, 100),
        select: {
          id: true,
          action: true,
          resourceType: true,
          details: true,
          createdAt: true,
          ipAddress: true,
        },
      });

      return activities;
    } catch (error) {
      console.error("Error fetching activity log:", error);
      throw new Error("Failed to fetch activity log");
    }
  }

  /**
   * Export user data
   */
  static async exportUserData(userId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          student: true,
          auditLogs: {
            take: 100,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Decrypt sensitive data for export
      let decryptedStudentData: any = {};
      if (user.student) {
        const [
          decryptedPhone,
          decryptedState,
          decryptedLga,
          decryptedLastName,
          decryptedFirstName,
          decryptedOtherName,
        ] = await Promise.all([
          unprotectData(user.student.phone, "phone"),
          unprotectData(user.student.state, "location"),
          unprotectData(user.student.lga, "location"),
          unprotectData(user.student.lastName, "name"),
          unprotectData(user.student.firstName, "name"),
          unprotectData(user.student.otherName || "", "name"),
        ]);

        decryptedStudentData = {
          matricNumber: user.student.matricNumber,
          department: user.student.department,
          college: user.student.college,
          course: user.student.course,
          phone: decryptedPhone,
          state: decryptedState,
          lga: decryptedLga,
          dateOfBirth: user.student.dateOfBirth,
          gender: user.student.gender,
          maritalStatus: user.student.maritalStatus,
          admissionYear: user.student.admissionYear,
          dateEnrolled: user.student.dateEnrolled,
        };
      }

      const exportData = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          lastLoginAt: user.lastLoginAt,
          loginCount: user.loginCount,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        student: decryptedStudentData,
        activity: user.auditLogs,
        exportedAt: new Date().toISOString(),
      };

      // Log the export
      await prisma.auditLog.create({
        data: {
          userId: userId,
          action: "DATA_EXPORT_REQUESTED",
          resourceType: "USER",
          resourceId: userId,
          details: {
            exportType: "user_data",
            exportedAt: new Date().toISOString(),
          },
          ipAddress: "profile_service",
          userAgent: "profile_service",
        },
      });

      return exportData;
    } catch (error) {
      console.error("Error exporting user data:", error);
      throw new Error("Failed to export user data");
    }
  }

  /**
   * Get notification settings
   */
  static async getNotificationSettings(
    userId: string
  ): Promise<NotificationSettings> {
    try {
      // Try to get user preferences from database
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      if (preferences) {
        return {
          emailNotifications: preferences.emailNotifications,
          pushNotifications: preferences.pushNotifications,
          assignmentReminders: preferences.assignmentReminders,
          gradeAlerts: preferences.gradeAlerts,
          lectureReminders: preferences.lectureReminders,
        };
      }

      // If no preferences exist, create default ones and return them
      const defaultPreferences = await prisma.userPreferences.create({
        data: {
          userId: userId,
          emailNotifications: true,
          pushNotifications: true,
          assignmentReminders: true,
          gradeAlerts: true,
          lectureReminders: true,
        },
      });

      return {
        emailNotifications: defaultPreferences.emailNotifications,
        pushNotifications: defaultPreferences.pushNotifications,
        assignmentReminders: defaultPreferences.assignmentReminders,
        gradeAlerts: defaultPreferences.gradeAlerts,
        lectureReminders: defaultPreferences.lectureReminders,
      };
    } catch (error) {
      console.error("Error fetching notification settings:", error);

      // Fallback to default settings if there's an error
      return {
        emailNotifications: true,
        pushNotifications: true,
        assignmentReminders: true,
        gradeAlerts: true,
        lectureReminders: true,
      };
    }
  }

  /**
   * Update notification settings
   */
  static async updateNotificationSettings(
    userId: string,
    settings: NotificationSettings
  ): Promise<boolean> {
    try {
      // Upsert the notification settings (create if doesn't exist, update if it does)
      await prisma.userPreferences.upsert({
        where: { userId },
        update: {
          emailNotifications: settings.emailNotifications,
          pushNotifications: settings.pushNotifications,
          assignmentReminders: settings.assignmentReminders,
          gradeAlerts: settings.gradeAlerts,
          lectureReminders: settings.lectureReminders,
        },
        create: {
          userId: userId,
          emailNotifications: settings.emailNotifications,
          pushNotifications: settings.pushNotifications,
          assignmentReminders: settings.assignmentReminders,
          gradeAlerts: settings.gradeAlerts,
          lectureReminders: settings.lectureReminders,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: userId,
          action: "NOTIFICATION_SETTINGS_UPDATED",
          resourceType: "USER_PREFERENCES" as any,
          resourceId: userId,
          details: JSON.parse(JSON.stringify(settings)),
          ipAddress: "profile_service",
          userAgent: "profile_service",
        },
      });

      console.log(
        `Notification settings updated for user ${userId}:`,
        settings
      );
      return true;
    } catch (error) {
      console.error("Error updating notification settings:", error);
      throw new Error("Failed to update notification settings");
    }
  }

  /**
   * Initialize user preferences if they don't exist
   */
  static async initializeUserPreferences(userId: string): Promise<boolean> {
    try {
      const existingPreferences = await prisma.userPreferences.findUnique({
        where: { userId },
      });

      if (!existingPreferences) {
        await prisma.userPreferences.create({
          data: {
            userId: userId,
            emailNotifications: true,
            pushNotifications: true,
            assignmentReminders: true,
            gradeAlerts: true,
            lectureReminders: true,
          },
        });
        console.log(`Initialized default preferences for user ${userId}`);
      }

      return true;
    } catch (error) {
      console.error("Error initializing user preferences:", error);
      return false;
    }
  }

  /**
   * Reset notification settings to defaults
   */
  static async resetNotificationSettings(userId: string): Promise<boolean> {
    try {
      await prisma.userPreferences.upsert({
        where: { userId },
        update: {
          emailNotifications: true,
          pushNotifications: true,
          assignmentReminders: true,
          gradeAlerts: true,
          lectureReminders: true,
        },
        create: {
          userId: userId,
          emailNotifications: true,
          pushNotifications: true,
          assignmentReminders: true,
          gradeAlerts: true,
          lectureReminders: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: userId,
          action: "NOTIFICATION_SETTINGS_RESET",
          resourceType: "USER_PREFERENCES" as any,
          resourceId: userId,
          ipAddress: "profile_service",
          userAgent: "profile_service",
        },
      });

      console.log(`Notification settings reset to defaults for user ${userId}`);
      return true;
    } catch (error) {
      console.error("Error resetting notification settings:", error);
      throw new Error("Failed to reset notification settings");
    }
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    securitySettings: SecuritySettings
  ): Promise<boolean> {
    try {
      const { currentPassword, newPassword, confirmPassword } =
        securitySettings;

      // Validate new password matches confirmation
      if (newPassword !== confirmPassword) {
        throw new Error("New passwords do not match");
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(
          passwordValidation.errors[0] ||
            "Password does not meet security requirements"
        );
      }

      // Get user with password hash
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true, email: true },
      });

      if (!user || !user.passwordHash) {
        throw new Error("User not found");
      }

      // Verify current password
      const isCurrentPasswordValid = await this.verifyPasswordForAuth(
        currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Hash new password using your security system
      const protectedPassword = await protectData(newPassword, "password");

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: protectedPassword.encrypted },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: userId,
          action: "PASSWORD_RESET",
          resourceType: "USER",
          resourceId: userId,
          details: {
            note: "Password changed via profile settings",
          },
          ipAddress: "profile_service",
          userAgent: "profile_service",
        },
      });

      return true;
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  }

  /**
   * Verify password for authentication
   */
  private static async verifyPasswordForAuth(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    // Import the verifyPassword function dynamically to avoid import chain
    const { verifyPassword } = await import("@/lib/security/dataProtection");
    return verifyPassword(password, hashedPassword);
  }

  /**
   * Request account deletion
   */
  static async requestAccountDeletion(
    userId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: userId,
          action: "ACCOUNT_DELETION_REQUESTED",
          resourceType: "USER",
          resourceId: userId,
          details: {
            reason: reason,
            requestedAt: new Date().toISOString(),
          },
          ipAddress: "profile_service",
          userAgent: "profile_service",
        },
      });

      return true;
    } catch (error) {
      console.error("Error requesting account deletion:", error);
      throw new Error("Failed to request account deletion");
    }
  }
}
