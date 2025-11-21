// lib/services/userService.ts
import { prisma } from "@/lib/server/prisma";
import {
  protectData,
  unprotectData,
  verifyPassword,
  validatePasswordStrength,
} from "@/lib/security/dataProtection";
import { AuditAction } from "@prisma/client";

// Define response types
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  emailVerified: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  student?: {
    id: string;
    matricNumber: string;
    firstName: string;
    surname: string;
    department: string;
  };
  teacher?: {
    id: string;
    teacherId: string;
    firstName: string;
    surname: string;
    department: string;
  };
}

export interface ProfileUpdateResponse {
  success: boolean;
  message: string;
  requiresVerification?: boolean;
}

export interface PasswordChangeResponse {
  success: boolean;
  message: string;
}

export interface AccountDeletionResponse {
  success: boolean;
  message: string;
}

export interface UserPreferences {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  assignmentReminders: boolean;
  gradeAlerts: boolean;
  lectureReminders: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PreferencesResponse {
  success: boolean;
  message: string;
  preferences?: UserPreferences;
}

export class UserService {
  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<UserProfile | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          student: {
            select: {
              id: true,
              matricNumber: true,
              firstName: true,
              surname: true,
              department: true,
            },
          },
          teacher: {
            select: {
              id: true,
              teacherId: true,
              firstName: true,
              surname: true,
              department: true,
            },
          },
        },
      });

      if (!user) return null;

      // Decrypt sensitive data
      const decryptedUser: UserProfile = {
        ...user,
        email: await unprotectData(user.email, "email"),
        student: undefined,
        teacher: undefined,
      };

      // Decrypt student data if exists
      if (user.student) {
        const [firstName, surname] = await Promise.all([
          unprotectData(user.student.firstName, "name"),
          unprotectData(user.student.surname, "name"),
        ]);

        decryptedUser.student = {
          ...user.student,
          firstName,
          surname,
        };
      }

      // Decrypt teacher data if exists
      if (user.teacher) {
        const [firstName, surname] = await Promise.all([
          unprotectData(user.teacher.firstName, "name"),
          unprotectData(user.teacher.surname, "name"),
        ]);

        decryptedUser.teacher = {
          ...user.teacher,
          firstName,
          surname,
        };
      }

      return decryptedUser;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    profileData: {
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    }
  ): Promise<ProfileUpdateResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const updateData: any = {};
      const updatedFields: string[] = [];
      let requiresVerification = false;

      // Update name
      if (profileData.name !== undefined) {
        updateData.name = profileData.name;
        updatedFields.push("name");
      }

      // Update email
      if (profileData.email) {
        // Protect the new email to get search hash for uniqueness check
        const protectedEmail = await protectData(profileData.email, "email");
        
        // Check if email is already in use using search hash
        const existingUser = await prisma.user.findFirst({
          where: {
            student: {
              emailSearchHash: protectedEmail.searchHash
            },
            id: { not: userId },
          },
        });

        if (existingUser) {
          throw new Error("Email is already in use");
        }

        updateData.email = protectedEmail.encrypted;
        updateData.emailVerified = null; // Require re-verification
        updateData.emailVerificationRequired = true;
        updatedFields.push("email");
        requiresVerification = true;

        // Also update student email if user is a student
        if (user.role === 'STUDENT') {
          const student = await prisma.student.findUnique({
            where: { userId },
          });

          if (student) {
            await prisma.student.update({
              where: { userId },
              data: {
                email: protectedEmail.encrypted,
                emailSearchHash: protectedEmail.searchHash,
                updatedAt: new Date(),
              },
            });
          }
        }
      }

      // Update password
      if (profileData.newPassword) {
        if (!profileData.currentPassword) {
          throw new Error("Current password is required to set a new password");
        }

        // Verify current password
        if (!user.passwordHash) {
          throw new Error("No password set for this account");
        }

        const isCurrentPasswordValid = await verifyPassword(
          profileData.currentPassword,
          user.passwordHash
        );

        if (!isCurrentPasswordValid) {
          throw new Error("Current password is incorrect");
        }

        // Validate new password
        const passwordValidation = validatePasswordStrength(
          profileData.newPassword
        );
        if (!passwordValidation.isValid) {
          throw new Error(
            `Password validation failed: ${passwordValidation.errors.join(", ")}`
          );
        }

        // Check if new password is the same as current
        const isSamePassword = await verifyPassword(
          profileData.newPassword,
          user.passwordHash
        );
        if (isSamePassword) {
          throw new Error("New password cannot be the same as current password");
        }

        const hashedPassword = await protectData(
          profileData.newPassword,
          "password"
        );
        updateData.passwordHash = hashedPassword.encrypted;
        updatedFields.push("password");
      }

      // Only update if there are changes
      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
        });

        // Log the update
        await prisma.auditLog.create({
          data: {
            userId,
            action: AuditAction.PROFILE_UPDATED,
            resourceType: "USER",
            resourceId: userId,
            details: {
              updatedFields,
              requiresEmailVerification: requiresVerification,
            },
          },
        });
      }

      return {
        success: true,
        message: requiresVerification 
          ? "Profile updated successfully. Please verify your new email address."
          : "Profile updated successfully",
        requiresVerification,
      };
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }

  /**
   * Change password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<PasswordChangeResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.passwordHash) {
        throw new Error("User not found or no password set");
      }

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(
        currentPassword,
        user.passwordHash
      );
      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Validate new password
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(
          `Password validation failed: ${passwordValidation.errors.join(", ")}`
        );
      }

      // Check if new password is the same as current
      const isSamePassword = await verifyPassword(
        newPassword,
        user.passwordHash
      );
      if (isSamePassword) {
        throw new Error("New password cannot be the same as the current password");
      }

      // Hash new password
      const hashedPassword = await protectData(newPassword, "password");

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: hashedPassword.encrypted,
          updatedAt: new Date(),
        },
      });

      // Log password change
      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.PASSWORD_CHANGED,
          resourceType: "USER",
          resourceId: userId,
          details: {
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        message: "Password changed successfully",
      };
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount(
    userId: string, 
    password: string
  ): Promise<AccountDeletionResponse> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.passwordHash) {
        throw new Error("User not found or no password set");
      }

      // Verify password
      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error("Invalid password");
      }

      // Delete user (this will cascade delete related records)
      await prisma.user.delete({
        where: { id: userId },
      });

      // Log account deletion
      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.ACCOUNT_DELETED,
          resourceType: "USER",
          resourceId: userId,
          details: {
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        message: "Account deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  }

  /**
   * Get user preferences
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences> {
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

      return preferences;
    } catch (error) {
      console.error("Error getting user preferences:", error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(
    userId: string,
    preferences: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      assignmentReminders?: boolean;
      gradeAlerts?: boolean;
      lectureReminders?: boolean;
    }
  ): Promise<PreferencesResponse> {
    try {
      const updatedPreferences = await prisma.userPreferences.upsert({
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

      // Log preferences update
      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.NOTIFICATION_SETTINGS_UPDATED,
          resourceType: "USER",
          resourceId: userId,
          details: {
            updatedFields: Object.keys(preferences),
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        message: "Preferences updated successfully",
        preferences: updatedPreferences,
      };
    } catch (error) {
      console.error("Error updating user preferences:", error);
      throw error;
    }
  }

  /**
   * Verify current password for sensitive operations
   */
  static async verifyCurrentPassword(
    userId: string,
    password: string
  ): Promise<{ isValid: boolean; message?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return { isValid: false, message: "User not found" };
      }

      if (!user.passwordHash) {
        return { isValid: false, message: "No password set for this account" };
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      return { 
        isValid, 
        message: isValid ? undefined : "Invalid password" 
      };
    } catch (error) {
      console.error("Error verifying current password:", error);
      return { isValid: false, message: "Error verifying password" };
    }
  }

  /**
   * Get user activity logs
   */
  static async getUserActivityLogs(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    logs: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            action: true,
            resourceType: true,
            resourceId: true,
            details: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
          },
        }),
        prisma.auditLog.count({ where: { userId } }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        logs,
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
      console.error("Error getting user activity logs:", error);
      throw error;
    }
  }
}