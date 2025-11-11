// lib/services/teacher/emailService.ts
import { prisma } from "@/lib/server/prisma";
import { protectData, unprotectData } from "@/lib/security/dataProtection";
import { AuditAction } from "@prisma/client";

export class TeacherEmailService {
  /**
   * Send verification email to teacher
   */
  static async sendVerificationEmail(email: string, verificationCode: string) {
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
              name: true,
              email: true,
            },
          },
        },
      });

      if (!teacher) {
        throw new Error("Teacher not found");
      }

      // Decrypt email for personalization
      const decryptedEmail = await unprotectData(teacher.user.email, "email");
      const teacherName = await unprotectData(teacher.user.name ?? "", "name");

      // Log the email sending
      await prisma.auditLog.create({
        data: {
          userId: teacher.userId,
          action: "NOTIFICATION_SENT",
          resourceType: "USER",
          resourceId: teacher.userId,
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
      console.log(`Verification email sent to teacher: ${decryptedEmail}`);

      return {
        success: true,
        message: "Verification email sent successfully",
      };
    } catch (error) {
      console.error("Teacher verification email error:", error);
      throw error;
    }
  }

  /**
   * Send password reset email to teacher
   */
  static async sendPasswordResetEmail(email: string, resetToken: string) {
    try {
      // Find teacher by email
      const teacher = await prisma.teacher.findFirst({
        where: {
          user: {
            email: (await protectData(email, "email")).encrypted,
          },
        },
        include: {
          user: true,
        },
      });

      if (!teacher) {
        throw new Error("Teacher not found");
      }

      // Decrypt email for personalization
      const decryptedEmail = await unprotectData(teacher.user.email, "email");

      // Log the email sending
      await prisma.auditLog.create({
        data: {
          userId: teacher.userId,
          action: "NOTIFICATION_SENT",
          resourceType: "USER",
          resourceId: teacher.userId,
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
      console.log(`Password reset email sent to teacher: ${decryptedEmail}`);

      return {
        success: true,
        message: "Password reset email sent successfully",
      };
    } catch (error) {
      console.error("Teacher password reset email error:", error);
      throw error;
    }
  }

  /**
   * Resend verification email to teacher
   */
  static async resendVerificationEmail(email: string) {
    try {
      // Find teacher by email
      const teacher = await prisma.teacher.findFirst({
        where: {
          user: {
            email: (await protectData(email, "email")).encrypted,
          },
        },
        include: {
          user: true,
        },
      });

      if (!teacher) {
        throw new Error("Teacher not found");
      }

      // Decrypt email for personalization
      const decryptedEmail = await unprotectData(teacher.user.email, "email");

      // Log the email sending
      await prisma.auditLog.create({
        data: {
          userId: teacher.userId,
          action: "RESEND_VERIFICATION_REQUESTED",
          resourceType: "USER",
          resourceId: teacher.userId,
          details: {
            type: "email_verification_resend",
            email: decryptedEmail,
          },
          ipAddress: "unknown",
          userAgent: "unknown",
        },
      });

      // In a real implementation, send email here
      console.log(`Verification email resent to teacher: ${decryptedEmail}`);

      return {
        success: true,
        message: "Verification email resent successfully",
      };
    } catch (error) {
      console.error("Teacher resend verification email error:", error);
      throw error;
    }
  }

  /**
   * Verify email code for teacher
   */
  static async verifyEmailCode(
    code: string,
    encodedEmail: string,
    hash: string
  ) {
    try {
      // Find teacher by encrypted email
      const teacher = await prisma.teacher.findFirst({
        where: {
          user: {
            
            email: (await protectData(encodedEmail, "email")).encrypted,
          },
        },
        include: {
          user: true,
        },
      });

      if (!teacher) {
        throw new Error("Teacher not found");
      }

      // Decrypt email for comparison
      const decryptedEmail = await unprotectData(teacher.user.email, "email");

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
        where: { id: teacher.userId },
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
          userId: teacher.userId,
          action: "EMAIL_VERIFIED",
          resourceType: "USER",
          resourceId: teacher.userId,
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
      console.error("Teacher email verification error:", error);
      throw error;
    }
  }
}
