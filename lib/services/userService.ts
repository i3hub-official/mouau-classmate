// lib/services/userService.ts
import { prisma } from "@/lib/server/prisma";
import {
  protectData,
  unprotectData,
  verifyPassword,
  validatePasswordStrength,
} from "@/lib/security/dataProtection";
import { AuditAction } from "@prisma/client";

export class UserService {
  /**
   * Get user by ID
   */
  static async getUserById(id: string) {
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
              employeeId: true,
              firstName: true,
              surname: true,
              department: true,
            },
          },
        },
      });

      if (!user) return null;

      // Decrypt sensitive data
      const decryptedUser = {
        ...user,
        email: await unprotectData(user.email, "email"),
      };

      if (user.student) {
        decryptedUser.student = {
          ...user.student,
          firstName: await unprotectData(user.student.firstName, "name"),
          surname: await unprotectData(user.student.surname, "name"),
        };
      }

      if (user.teacher) {
        decryptedUser.teacher = {
          ...user.teacher,
          firstName: await unprotectData(user.teacher.firstName, "name"),
          surname: await unprotectData(user.teacher.surname, "name"),
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
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const updateData: any = {};

      // Update name
      if (profileData.name) {
        updateData.name = profileData.name;
      }

      // Update email
      if (profileData.email) {
        // Check if email is already in use
        const existingUser = await prisma.user.findFirst({
          where: {
            email: (await protectData(profileData.email, "email")).encrypted,
            id: { not: userId },
          },
        });

        if (existingUser) {
          throw new Error("Email is already in use");
        }

        const protectedEmail = await protectData(profileData.email, "email");
        updateData.email = protectedEmail.encrypted;
        updateData.emailVerified = null; // Require re-verification
        updateData.emailVerificationRequired = true;
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
            `Password validation failed: ${passwordValidation.errors.join(
              ", "
            )}`
          );
        }

        const hashedPassword = await protectData(
          profileData.newPassword,
          "password"
        );
        updateData.passwordHash = hashedPassword.encrypted;
      }

      // Update user
      const updatedUser = await prisma.user.update({
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
          action: "PROFILE_UPDATED",
          resourceType: "USER",
          resourceId: userId,
          details: {
            updatedFields: Object.keys(profileData),
          },
        },
      });

      return {
        success: true,
        message: "Profile updated successfully",
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
  ) {
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
        throw new Error(
          "New password cannot be the same as the current password"
        );
      }

      // Hash new password
      const hashedPassword = await protectData(newPassword, "password");

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: hashedPassword.encrypted,
        },
      });

      // Log password change
      await prisma.auditLog.create({
        data: {
          userId,
          action: "PASSWORD_CHANGED",
          resourceType: "USER",
          resourceId: userId,
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
  static async deleteAccount(userId: string, password: string) {
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
          action: "ACCOUNT_DELETION",
          resourceType: "USER",
          resourceId: userId,
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
  static async getUserPreferences(userId: string) {
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

      // Log preferences update
      await prisma.auditLog.create({
        data: {
          userId,
          action: "NOTIFICATION_SETTINGS_UPDATED",
          resourceType: "USER",
          resourceId: userId,
          details: {
            updatedFields: Object.keys(preferences),
          },
        },
      });

      return {
        success: true,
        message: "Preferences updated successfully",
      };
    } catch (error) {
      console.error("Error updating user preferences:", error);
      throw error;
    }
  }
}
