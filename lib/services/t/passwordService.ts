// lib/services/t/passwordService.ts
import { prisma } from "@/lib/server/prisma";
import {
  protectData,
  verifyPassword,
  validatePasswordStrength,
} from "@/lib/security/dataProtection";
import { AuditAction } from "@prisma/client";
import crypto from "crypto";

export class TeacherPasswordService {
  static generateSecureToken(length = 32): string {
    // Generate cryptographically secure random bytes
    const bytes = crypto.randomBytes(length);

    // Convert to a URL-safe Base64 string (no +, /, or =)
    return bytes.toString("base64url");
  }

  /**
   * Request password reset for teacher
   */
  static async requestPasswordReset(email: string) {
    try {
      // Check if email exists
      const teacher = await prisma.teacher.findFirst({
        where: {
          user: {
            email: (await protectData(email, "email")).encrypted,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
              emailVerified: true,
              failedLoginAttempts: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
        },
      });

      if (!teacher) {
        throw new Error("No account found with this email");
      }

      // Check for recent password reset request
      const existingResetToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: teacher.userId,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          },
        },
      });

      if (existingResetToken) {
        throw new Error(
          "Password reset email was recently sent. Please check your email or try again later."
        );
      }

      // Generate password reset token
      const resetToken = TeacherPasswordService.generateSecureToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          token: resetToken,
          userId: teacher.userId,
          expires: expiresAt,
        },
      });

      // Log the password reset request
      await prisma.auditLog.create({
        data: {
          userId: teacher.userId,
          action: "PASSWORD_RESET_REQUESTED",
          resourceType: "USER",
          resourceId: teacher.userId,
          details: {
            email,
            role: "TEACHER",
          },
          ipAddress: "unknown", // Would be passed from request
          userAgent: "unknown", // Would be passed from request
        },
      });

      // In a real implementation, send email here
      console.log(`Password reset email sent to teacher: ${email}`);

      return {
        success: true,
        message: "Password reset link sent to your email",
        // In production, you wouldn't return the token
        // resetToken, // Only for development/testing
      };
    } catch (error) {
      console.error("Teacher password reset request error:", error);
      throw error;
    }
  }

  /**
   * Reset password for teacher
   */
  static async resetPassword(token: string, newPassword: string) {
    try {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(
          `Password validation failed: ${passwordValidation.errors.join(", ")}`
        );
      }

      // Find the reset token
      const resetTokenData = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
            },
          },
        },
      });

      if (!resetTokenData) {
        throw new Error("Invalid or expired reset token");
      }

      if (resetTokenData.used) {
        throw new Error("Reset token has already been used");
      }

      if (resetTokenData.expires < new Date()) {
        throw new Error("Reset token has expired");
      }

      // Hash the new password
      const hashedPassword = await protectData(newPassword, "password");

      // Update user password
      await prisma.user.update({
        where: { id: resetTokenData.userId },
        data: {
          passwordHash: hashedPassword.encrypted,
        },
      });

      // Mark token as used
      await prisma.passwordResetToken.update({
        where: { id: resetTokenData.id },
        data: { used: true },
      });

      // Log the password reset
      await prisma.auditLog.create({
        data: {
          userId: resetTokenData.userId,
          action: "PASSWORD_RESET",
          resourceType: "USER",
          resourceId: resetTokenData.userId,
          details: {
            role: "TEACHER",
          },
          ipAddress: "unknown",
          userAgent: "unknown",
        },
      });

      return {
        success: true,
        message: "Password reset successfully",
      };
    } catch (error) {
      console.error("Teacher password reset error:", error);
      throw error;
    }
  }

  /**
   * Verify reset token for teacher
   */
  static async verifyResetToken(token: string) {
    try {
      const resetTokenData = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
              role: true,
            },
          },
        },
      });

      if (!resetTokenData) {
        throw new Error("Invalid or expired reset token");
      }

      if (resetTokenData.used) {
        throw new Error("Reset token has already been used");
      }

      if (resetTokenData.expires < new Date()) {
        throw new Error("Reset token has expired");
      }

      return {
        success: true,
        data: {
          email: await this.decryptField(resetTokenData.user.email),
          role: resetTokenData.user.role,
        },
        message: "Token is valid",
      };
    } catch (error) {
      console.error("Teacher token verification error:", error);
      throw error;
    }
  }

  /**
   * Authenticate teacher
   */
  static async authenticateTeacher(email: string, password: string) {
    try {
      // Find teacher by email
      const teacher = await prisma.teacher.findFirst({
        where: {
          user: {
            email: (await protectData(email, "email")).encrypted,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              passwordHash: true,
              isActive: true,
              emailVerified: true,
              failedLoginAttempts: true,
              lastLoginAt: true,
              role: true,
              accountLocked: true,
              lockedUntil: true,
            },
          },
        },
      });

      if (!teacher) {
        throw new Error("Invalid email or password");
      }

      // Check if account is locked
      if (
        teacher.user.accountLocked &&
        teacher.user.lockedUntil &&
        teacher.user.lockedUntil > new Date()
      ) {
        throw new Error(
          "Account is temporarily locked. Please try again later."
        );
      }

      // Verify password
      if (!teacher.user.passwordHash) {
        throw new Error("Password is not set for this user.");
      }
      const isValidPassword = await verifyPassword(
        password,
        teacher.user.passwordHash
      );

      if (!isValidPassword) {
        // Increment failed attempts
        const failedAttempts = teacher.user.failedLoginAttempts + 1;
        const updateData: any = {
          failedLoginAttempts: failedAttempts,
          lastFailedLoginAt: new Date(),
        };

        // Lock account after 5 failed attempts
        if (failedAttempts >= 5) {
          updateData.accountLocked = true;
          updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }

        await prisma.user.update({
          where: { id: teacher.user.id },
          data: updateData,
        });

        throw new Error("Invalid email or password");
      }

      // Reset failed attempts on successful login
      if (teacher.user.failedLoginAttempts > 0) {
        await prisma.user.update({
          where: { id: teacher.user.id },
          data: {
            failedLoginAttempts: 0,
            lastFailedLoginAt: null,
            accountLocked: false,
            lockedUntil: null,
          },
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: teacher.user.id },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
        },
      });

      return {
        success: true,
        user: {
          id: teacher.user.id,
          email: await this.decryptField(teacher.user.email),
          name: teacher.user.name,
          role: teacher.user.role,
          isActive: teacher.user.isActive,
          profile: {
            firstName: await this.decryptField(teacher.firstName),
            surname: await this.decryptField(teacher.surname),
            otherName: await this.decryptField(teacher.otherName),
            email: await this.decryptField(teacher.user.email),
            phone: await this.decryptField(teacher.phone),
            department: teacher.department,
            institution: teacher.institution,
            qualification: teacher.qualification,
            specialization: teacher.specialization,
            teacherId: teacher.teacherId,
          },
        },
      };
    } catch (error) {
      console.error("Teacher authentication error:", error);
      throw error;
    }
  }

  /**
   * Change password for teacher
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    try {
      // Get teacher
      const teacher = await prisma.teacher.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              passwordHash: true,
            },
          },
        },
      });

      if (!teacher) {
        throw new Error("Teacher not found");
      }

      // Get user for password hash
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          passwordHash: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Verify current password
      if (!user.passwordHash) {
        throw new Error("Password is not set for this user.");
      }
      const isValidCurrentPassword = await verifyPassword(
        currentPassword,
        user.passwordHash
      );

      if (!isValidCurrentPassword) {
        throw new Error("Current password is incorrect");
      }

      // Validate new password
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(
          `Password validation failed: ${passwordValidation.errors.join(", ")}`
        );
      }

      // Hash new password
      const hashedNewPassword = await protectData(newPassword, "password");

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: hashedNewPassword.encrypted,
        },
      });

      // Log password change
      await prisma.auditLog.create({
        data: {
          userId,
          action: "PASSWORD_CHANGED",
          resourceType: "USER",
          resourceId: userId,
          details: {
            role: "TEACHER",
          },
          ipAddress: "unknown",
          userAgent: "unknown",
        },
      });

      return {
        success: true,
        message: "Password changed successfully",
      };
    } catch (error) {
      console.error("Teacher password change error:", error);
      throw error;
    }
  }

  /**
   * Decrypt field helper
   */
  private static async decryptField(
    encryptedField: string | null
  ): Promise<string> {
    try {
      if (!encryptedField) return "";
      const { unprotectData } = await import("@/lib/security/dataProtection");
      return await unprotectData(encryptedField, "email");
    } catch (error) {
      console.error("Decryption error:", error);
      return "Error decrypting field";
    }
  }
}
