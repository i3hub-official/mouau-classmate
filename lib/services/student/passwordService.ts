// lib/services/passwordService.ts
import { prisma } from "@/lib/server/prisma";
import { protectData, unprotectData } from "@/lib/security/dataProtection";
import { generateVerificationToken } from "@/lib/utils/utils";
import { AuditAction, ResourceType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Student } from "@/lib/types/student/index";

export class StudentPasswordService {
  /**
   * Helper method to decrypt student data
   */
  private static async decryptStudentData(student: any): Promise<Student> {
    try {
      return {
        ...student,
        email: await unprotectData(student.email, "email"),
        phone: await unprotectData(student.phone, "phone"),
        firstName: await unprotectData(student.firstName, "name"),
        lastName: await unprotectData(student.lastName, "name"),
        otherName: student.otherName
          ? await unprotectData(student.otherName, "name")
          : null,
        state: await unprotectData(student.state, "location"),
        lga: await unprotectData(student.lga, "location"),
        user: student.user
          ? {
              ...student.user,
              email: await unprotectData(student.user.email, "email"),
            }
          : undefined,
      };
    } catch (error) {
      console.error("Error decrypting student data:", error);
      throw new Error("Failed to decrypt student data");
    }
  }

  /**
   * Authenticate student with matric number and password
   */
  static async authenticateStudent(
    matricNumber: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; student?: Student; error?: string }> {
    try {
      // Find student by matric number
      const student = await prisma.student.findUnique({
        where: { matricNumber },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              passwordHash: true,
              isActive: true,
              accountLocked: true,
              lockedUntil: true,
              failedLoginAttempts: true,
            },
          },
        },
      });

      if (!student) {
        return { success: false, error: "Invalid credentials" };
      }

      // Check if account is active
      if (!student.user.isActive) {
        return { success: false, error: "Account is inactive" };
      }

      // Check if account is locked
      if (
        student.user.accountLocked &&
        student.user.lockedUntil &&
        student.user.lockedUntil > new Date()
      ) {
        return { success: false, error: "Account is temporarily locked" };
      }

      // Verify password
      const isPasswordValid = student.user.passwordHash
        ? await bcrypt.compare(password, student.user.passwordHash)
        : false;

      if (!isPasswordValid) {
        // Increment failed login attempts
        const newFailedAttempts = (student.user.failedLoginAttempts || 0) + 1;
        const shouldLockAccount = newFailedAttempts >= 5;
        const lockedUntil = shouldLockAccount
          ? new Date(Date.now() + 30 * 60 * 1000)
          : null;

        // Update user with new failed attempts and lock status
        await prisma.user.update({
          where: { id: student.user.id },
          data: {
            failedLoginAttempts: newFailedAttempts,
            accountLocked: shouldLockAccount,
            lockedUntil,
            lastFailedLoginAt: new Date(),
          },
        });

        // Log the failed login attempt
        await prisma.auditLog.create({
          data: {
            userId: student.user.id,
            action: AuditAction.USER_LOGIN_FAILED,
            resourceType: ResourceType.USER,
            resourceId: student.user.id,
            details: {
              matricNumber,
              failedAttempts: newFailedAttempts,
              accountLocked: shouldLockAccount,
            },
            ipAddress,
            userAgent,
          },
        });

        return { success: false, error: "Invalid credentials" };
      }

      // Reset failed login attempts on successful login
      await prisma.user.update({
        where: { id: student.user.id },
        data: {
          failedLoginAttempts: 0,
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
        },
      });

      // Log the successful login
      await prisma.auditLog.create({
        data: {
          userId: student.user.id,
          action: AuditAction.USER_LOGGED_IN,
          resourceType: ResourceType.USER,
          resourceId: student.user.id,
          details: {
            matricNumber,
          },
          ipAddress,
          userAgent,
        },
      });

      // Decrypt sensitive data
      const decryptedStudent = await this.decryptStudentData(student);

      return { success: true, student: decryptedStudent as Student };
    } catch (error) {
      console.error("Error authenticating student:", error);
      return { success: false, error: "Authentication failed" };
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      // Find the student by email (using search hash)
      const emailHash = await protectData(email, "email");
      const student = await prisma.student.findFirst({
        where: {
          emailSearchHash: emailHash.searchHash,
        },
        include: {
          user: true,
        },
      });

      if (!student || !student.user) {
        // Don't reveal that the email doesn't exist for security reasons
        return {
          success: true,
          message:
            "If an account with this email exists, a password reset email has been sent.",
        };
      }

      // Check if there's already a recent password reset request
      const recentToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: student.user.id,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          },
        },
      });

      if (recentToken) {
        return {
          success: true,
          message:
            "Password reset email was recently sent. Please check your inbox or try again later.",
        };
      }

      // Generate password reset token
      const resetToken = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          token: resetToken,
          userId: student.user.id,
          expires: expiresAt,
          ipAddress,
          userAgent,
        },
      });

      // Log the password reset request
      await prisma.auditLog.create({
        data: {
          userId: student.user.id,
          action: AuditAction.PASSWORD_RESET_REQUESTED,
          resourceType: ResourceType.USER,
          resourceId: student.user.id,
          ipAddress,
          userAgent,
        },
      });

      return {
        success: true,
        resetToken,
        message: "Password reset email sent successfully.",
      };
    } catch (error) {
      console.error("Error requesting password reset:", error);
      throw error;
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(
    token: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      // Validate password strength
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Find the reset token
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: {
          user: true,
        },
      });

      if (!resetToken) {
        throw new Error("Invalid or expired reset token");
      }

      if (resetToken.used) {
        throw new Error("Reset token has already been used");
      }

      if (resetToken.expires < new Date()) {
        throw new Error("Reset token has expired");
      }

      // Update the user's password
      await prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          passwordHash: hashedPassword,
        },
      });

      // Mark the reset token as used
      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: {
          used: true,
        },
      });

      // Log the password reset
      await prisma.auditLog.create({
        data: {
          userId: resetToken.userId,
          action: AuditAction.PASSWORD_RESET,
          resourceType: ResourceType.USER,
          resourceId: resetToken.userId,
          ipAddress,
          userAgent,
        },
      });

      return {
        success: true,
        message:
          "Password reset successfully. You can now log in with your new password.",
      };
    } catch (error) {
      console.error("Error resetting password:", error);
      throw error;
    }
  }

  /**
   * Change password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      // Get the user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.passwordHash) {
        throw new Error("User not found or password not set");
      }

      // Verify the current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );
      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Check if the new password is the same as the current password
      const isSamePassword = await bcrypt.compare(
        newPassword,
        user.passwordHash
      );
      if (isSamePassword) {
        throw new Error(
          "New password cannot be the same as the current password"
        );
      }

      // Hash the new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update the user's password
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: hashedPassword,
        },
      });

      // Log the password change
      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.PASSWORD_CHANGED,
          resourceType: ResourceType.USER,
          resourceId: userId,
          ipAddress,
          userAgent,
        },
      });

      return {
        success: true,
        message: "Password changed successfully.",
      };
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  }

  /**
   * Verify reset token
   */
  static async verifyResetToken(token: string) {
    try {
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
      });

      if (!resetToken) {
        throw new Error("Invalid reset token");
      }

      if (resetToken.used) {
        throw new Error("Reset token has already been used");
      }

      if (resetToken.expires < new Date()) {
        throw new Error("Reset token has expired");
      }

      return {
        success: true,
        message: "Reset token is valid",
      };
    } catch (error) {
      console.error("Error verifying reset token:", error);
      throw error;
    }
  }
}
