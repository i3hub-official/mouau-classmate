// lib/services/profileService.ts
import { prisma } from "@/lib/server/prisma";
import { StudentRegistrationService } from "@/lib/services/studentRegistrationService";
import {
  protectData,
  unprotectData,
  verifyPassword,
  validatePasswordStrength,
} from "@/lib/security/dataProtection";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  matricNumber?: string;
  department?: string;
  college?: string;
  course?: string;
  phone?: string;
  state?: string;
  lga?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  admissionYear?: number;
  dateEnrolled?: string;
  isActive: boolean;
  emailVerified?: Date;
  lastLoginAt?: Date;
  loginCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  assignmentReminders: boolean;
  gradeAlerts: boolean;
  lectureReminders: boolean;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  state?: string;
  lga?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
}

export class ProfileService {
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
   * Change user password with security validation
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
      const isCurrentPasswordValid =
        await StudentRegistrationService.verifyPasswordForAuth(
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
   * Get notification settings for user
   */
  static async getNotificationSettings(
    userId: string
  ): Promise<NotificationSettings> {
    try {
      // For now, return default settings since we don't have a dedicated table
      // In a real implementation, you'd fetch from a user_preferences table
      return {
        emailNotifications: true,
        pushNotifications: true,
        assignmentReminders: true,
        gradeAlerts: true,
        lectureReminders: true,
      };
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      return this.getDefaultNotificationSettings();
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
      // In a real implementation, you'd save to a user_preferences table
      // For now, we'll simulate success and log the settings
      console.log("Notification settings updated for user:", userId, settings);

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: userId,
          action: "NOTIFICATION_SETTINGS_UPDATED",
          resourceType: "USER",
          resourceId: userId,
          details: JSON.parse(JSON.stringify(settings)),
          ipAddress: "profile_service",
          userAgent: "profile_service",
        },
      });

      return true;
    } catch (error) {
      console.error("Error updating notification settings:", error);
      return false;
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
      return [];
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string): Promise<{
    totalLogins: number;
    lastLogin: Date | null;
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
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Calculate profile completion (simplified)
      const profile = await this.getProfile(userId);
      let completionScore = 0;
      if (profile) {
        const fields = [
          "name",
          "email",
          "phone",
          "state",
          "lga",
          "dateOfBirth",
        ];
        const completedFields = fields.filter(
          (field) => profile[field as keyof UserProfile]
        );
        completionScore = Math.round(
          (completedFields.length / fields.length) * 100
        );
      }

      return {
        totalLogins: user.loginCount,
        lastLogin: user.lastLoginAt,
        accountAge: Math.floor(
          (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
        profileCompletion: completionScore,
      };
    } catch (error) {
      console.error("Error fetching user stats:", error);
      throw new Error("Failed to fetch user statistics");
    }
  }

  /**
   * Request account deletion
   */
  static async requestAccountDeletion(
    userId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      // In a real implementation, this would create a deletion request
      // that admins would need to approve, or schedule deletion after a grace period

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
      return false;
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
   * Default notification settings
   */
  private static getDefaultNotificationSettings(): NotificationSettings {
    return {
      emailNotifications: true,
      pushNotifications: true,
      assignmentReminders: true,
      gradeAlerts: true,
      lectureReminders: true,
    };
  }
}
