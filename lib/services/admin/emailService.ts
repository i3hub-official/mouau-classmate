// lib/services/admin/emailService.ts
import { prisma } from "@/lib/server/prisma";
import { protectData, unprotectData } from "@/lib/security/dataProtection";
import { AuditAction } from "@prisma/client";

export class AdminEmailService {
  /**
   * Send verification email to admin
   */
  static async sendVerificationEmail(email: string, verificationCode: string) {
    try {
      // Find admin by email
      const admin = await prisma.user.findFirst({
        where: {
          email: (await protectData(email, "email")).encrypted,
          role: "ADMIN",
        },
      });

      if (!admin) {
        throw new Error("Admin not found");
      }

      // Decrypt email for personalization
      const decryptedEmail = await unprotectData(admin.email, "email");
      const adminName = admin.name || "Administrator";

      // Log the email sending
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: "NOTIFICATION_SENT",
          resourceType: "USER",
          resourceId: admin.id,
          details: {
            type: "email_verification",
            email: decryptedEmail,
            verificationCode,
          },
          ipAddress: "unknown",
          userAgent: "unknown",
        },
      });

      // In a real implementation, send email here
      console.log(`Verification email sent to admin: ${decryptedEmail}`);

      return {
        success: true,
        message: "Verification email sent successfully",
      };
    } catch (error) {
      console.error("Admin verification email error:", error);
      throw error;
    }
  }

  /**
   * Send password reset email to admin
   */
  static async sendPasswordResetEmail(email: string, resetToken: string) {
    try {
      // Find admin by email
      const admin = await prisma.user.findFirst({
        where: {
          email: (await protectData(email, "email")).encrypted,
          role: "ADMIN",
        },
      });

      if (!admin) {
        throw new Error("Admin not found");
      }

      // Decrypt email for personalization
      const decryptedEmail = await unprotectData(admin.email, "email");

      // Log the email sending
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: "NOTIFICATION_SENT",
          resourceType: "USER",
          resourceId: admin.id,
          details: {
            type: "password_reset",
            email: decryptedEmail,
            resetToken,
          },
          ipAddress: "unknown",
          userAgent: "unknown",
        },
      });

      // In a real implementation, send email here
      console.log(`Password reset email sent to admin: ${decryptedEmail}`);

      return {
        success: true,
        message: "Password reset email sent successfully",
      };
    } catch (error) {
      console.error("Admin password reset email error:", error);
      throw error;
    }
  }

  /**
   * Resend verification email to admin
   */
  static async resendVerificationEmail(email: string) {
    try {
      // Find admin by email
      const admin = await prisma.user.findFirst({
        where: {
          email: (await protectData(email, "email")).encrypted,
          role: "ADMIN",
        },
      });

      if (!admin) {
        throw new Error("Admin not found");
      }

      // Decrypt email for personalization
      const decryptedEmail = await unprotectData(admin.email, "email");

      // Log the email sending
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: "RESEND_VERIFICATION_REQUESTED",
          resourceType: "USER",
          resourceId: admin.id,
          details: {
            type: "email_verification_resend",
            email: decryptedEmail,
          },
          ipAddress: "unknown",
          userAgent: "unknown",
        },
      });

      // In a real implementation, send email here
      console.log(`Verification email resent to admin: ${decryptedEmail}`);

      return {
        success: true,
        message: "Verification email resent successfully",
      };
    } catch (error) {
      console.error("Admin resend verification email error:", error);
      throw error;
    }
  }

  /**
   * Verify email code for admin
   */
  static async verifyEmailCode(
    code: string,
    encodedEmail: string,
    hash: string
  ) {
    try {
      // Find admin by encrypted email
      const admin = await prisma.user.findFirst({
        where: {
          email: (await protectData(encodedEmail, "email")).encrypted,
          role: "ADMIN",
        },
      });

      if (!admin) {
        throw new Error("Admin not found");
      }

      // Decrypt email for comparison
      const decryptedEmail = await unprotectData(admin.email, "email");

      // Verify the hash matches
      const { generateSearchHash } = await import(
        "@/lib/security/dataProtection"
      );
      const expectedHash = generateSearchHash(decryptedEmail);

      if (hash !== expectedHash) {
        throw new Error("Invalid verification code");
      }

      // Find and verify the token
      const verificationToken = await prisma.verificationToken.findUnique({
        where: { token: code },
      });

      if (!verificationToken || verificationToken.expires < new Date()) {
        throw new Error("Invalid or expired verification code");
      }

      // Update user email verification status
      await prisma.user.update({
        where: { id: admin.id },
        data: {
          emailVerified: new Date(),
        },
      });

      // Delete the verification token
      await prisma.verificationToken.delete({
        where: { token: verificationToken.token },
      });

      // Log the verification
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: "EMAIL_VERIFIED",
          resourceType: "USER",
          resourceId: admin.id,
          details: {
            email: decryptedEmail,
            verificationCode: code,
          },
          ipAddress: "unknown",
          userAgent: "unknown",
        },
      });

      return {
        success: true,
        data: {
          email: decryptedEmail,
        },
        message: "Email verified successfully",
      };
    } catch (error) {
      console.error("Admin email verification error:", error);
      throw error;
    }
  }
}
