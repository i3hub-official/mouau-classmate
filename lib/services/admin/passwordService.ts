// lib/services/admin/passwordService.ts
import { prisma } from "@/lib/server/prisma";
import {
  protectData,
  verifyPassword,
  validatePasswordStrength,
} from "@/lib/security/dataProtection";
import { AuditAction } from "@prisma/client";

export class AdminPasswordService {
  /**
   * Request password reset for admin
   */
  static async requestPasswordReset(email: string) {
    try {
      // Check if admin exists
      const admin = await prisma.user.findFirst({
        where: {
          email: (await protectData(email, "email")).encrypted,
          role: "ADMIN",
        },
      });

      if (!admin) {
        throw new Error("No admin account found with this email");
      }

      // Check for recent password reset request
      const recentToken = await prisma.passwordResetToken.findFirst({
        where: {
          userId: admin.id,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          },
        },
      });

      if (recentToken) {
        throw new Error(
          "Password reset email was recently sent. Please check your email or try again later."
        );
      }

      // Generate password reset token
      const resetToken = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          token: resetToken,
          userId: admin.id,
          expires: expiresAt,
        },
      });

      // Log the password reset request
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: "PASSWORD_RESET_REQUESTED",
          resourceType: "USER",
          resourceId: admin.id,
          details: {
            email,
            role: "ADMIN",
          },
          ipAddress: "unknown",
          userAgent: "unknown",
        },
      });

      // In a real implementation, send email here
      console.log(`Password reset email sent to admin: ${email}`);

      return {
        success: true,
        message: "Password reset link sent to your email",
        // resetToken, // Only for development/testing
      };
    } catch (error) {
      console.error("Admin password reset request error:", error);
      throw error;
    }
  }

  /**
   * Reset password for admin
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
            role: "ADMIN",
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
      console.error("Admin password reset error:", error);
      throw error;
    }
  }

  /**
   * Verify reset token for admin
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
      console.error("Admin token verification error:", error);
      throw error;
    }
  }

  /**
   * Authenticate admin
   */
  static async authenticateAdmin(email: string, password: string) {
    try {
      // Find admin by email
      const admin = await prisma.user.findFirst({
        where: {
          email: (await protectData(email, "email")).encrypted,
          role: "ADMIN",
        },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          isActive: true,
          emailVerified: true,
          failedLoginAttempts: true,
          lastLoginAt: true,
          loginCount: true,
          role: true,
          name: true,
          accountLocked: true,
          lockedUntil: true,
        },
      });

      if (!admin) {
        throw new Error("Invalid email or password");
      }

      // Check if account is locked
      if (
        admin.accountLocked &&
        admin.lockedUntil &&
        admin.lockedUntil > new Date()
      ) {
        throw new Error(
          "Account is temporarily locked. Please try again later."
        );
      }

      // Verify password
      if (!admin.passwordHash) {
        throw new Error("Invalid email or password");
      }
      const isValidPassword = await verifyPassword(
        password,
        admin.passwordHash
      );

      if (!isValidPassword) {
        // Increment failed attempts
        const failedAttempts = admin.failedLoginAttempts + 1;
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
          where: { id: admin.id },
          data: updateData,
        });

        throw new Error("Invalid email or password");
      }

      // Reset failed attempts on successful login
      if (admin.failedLoginAttempts > 0) {
        await prisma.user.update({
          where: { id: admin.id },
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
        where: { id: admin.id },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
        },
      });

      return {
        success: true,
        user: {
          id: admin.id,
          email: await this.decryptField(admin.email),
          name: admin.name,
          role: admin.role,
          isActive: admin.isActive,
        },
      };
    } catch (error) {
      console.error("Admin authentication error:", error);
      throw error;
    }
  }

  /**
   * Generate secure token
   */
  private static generateSecureToken(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Decrypt field helper
   */
  private static async decryptField(encryptedField: string): Promise<string> {
    try {
      const { unprotectData } = await import("@/lib/security/dataProtection");
      return await unprotectData(encryptedField, "email");
    } catch (error) {
      console.error("Decryption error:", error);
      return "Error decrypting field";
    }
  }
}
