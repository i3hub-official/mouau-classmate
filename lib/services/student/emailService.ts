// lib/services/student/emailService.ts
import { prisma } from "@/lib/server/prisma";
import { protectData, unprotectData } from "@/lib/security/dataProtection";
import { AuditAction, ResourceType } from "@prisma/client";
import { generateVerificationToken } from "@/lib/utils/utils";

export class StudentEmailService {
  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(studentId: string) {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: true,
        },
      });

      if (!student || !student.user) {
        throw new Error("Student not found");
      }

      // Decrypt email
      const email = await unprotectData(student.email, "email");

      // In a real implementation, you would use an email service like SendGrid, Nodemailer, etc.
      // For now, we'll just log the email that would be sent
      console.log(`Welcome email sent to ${email}`);

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId: student.user.id,
          action: AuditAction.NOTIFICATION_SENT,
          resourceType: ResourceType.USER,
          resourceId: student.user.id,
          details: {
            type: "welcome",
            email,
          },
        },
      });

      return {
        success: true,
        message: "Welcome email sent successfully",
      };
    } catch (error) {
      console.error("Error sending welcome email:", error);
      throw error;
    }
  }

  /**
   * Send email verification email
   */
  static async sendEmailVerificationEmail(userId: string, token: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          student: true,
        },
      });

      if (!user || !user.student) {
        throw new Error("User or student not found");
      }

      // Decrypt email
      const email = await unprotectData(user.student.email, "email");

      // In a real implementation, you would use an email service like SendGrid, Nodemailer, etc.
      // For now, we'll just log the email that would be sent
      console.log(`Email verification sent to ${email} with token ${token}`);

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.NOTIFICATION_SENT,
          resourceType: ResourceType.USER,
          resourceId: userId,
          details: {
            type: "email_verification",
            email,
            token,
          },
        },
      });

      return {
        success: true,
        message: "Email verification sent successfully",
      };
    } catch (error) {
      console.error("Error sending email verification:", error);
      throw error;
    }
  }

  /**
   * Verify email code for student
   */
  static async verifyEmailCode(
    code: string,
    encodedEmail: string,
    hash: string
  ) {
    try {
      // Find student by encrypted email
      const student = await prisma.student.findFirst({
        where: {
          emailSearchHash: hash,
        },
        include: {
          user: true,
        },
      });

      if (!student || !student.user) {
        throw new Error("Student not found");
      }

      // Decrypt email for comparison
      const decryptedEmail = await unprotectData(student.email, "email");

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
        where: { id: student.user.id },
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
          userId: student.user.id,
          action: AuditAction.EMAIL_VERIFIED,
          resourceType: ResourceType.USER,
          resourceId: student.user.id,
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
      console.error("Student email verification error:", error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(userId: string, token: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          student: true,
        },
      });

      if (!user || !user.student) {
        throw new Error("User or student not found");
      }

      // Decrypt email
      const email = await unprotectData(user.student.email, "email");

      // In a real implementation, you would use an email service like SendGrid, Nodemailer, etc.
      // For now, we'll just log the email that would be sent
      console.log(`Password reset sent to ${email} with token ${token}`);

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.NOTIFICATION_SENT,
          resourceType: ResourceType.USER,
          resourceId: userId,
          details: {
            type: "password_reset",
            email,
            token,
          },
        },
      });

      return {
        success: true,
        message: "Password reset email sent successfully",
      };
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  }

  /**
   * Send assignment reminder email
   */
  static async sendAssignmentReminderEmail(
    studentId: string,
    assignmentId: string
  ) {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: true,
        },
      });

      if (!student || !student.user) {
        throw new Error("Student not found");
      }

      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          course: true,
        },
      });

      if (!assignment) {
        throw new Error("Assignment not found");
      }

      // Decrypt email
      const email = await unprotectData(student.email, "email");

      // In a real implementation, you would use an email service like SendGrid, Nodemailer, etc.
      // For now, we'll just log the email that would be sent
      console.log(
        `Assignment reminder sent to ${email} for assignment ${assignment.title}`
      );

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId: student.user.id,
          action: AuditAction.NOTIFICATION_SENT,
          resourceType: ResourceType.ASSIGNMENT,
          resourceId: assignmentId,
          details: {
            type: "assignment_reminder",
            email,
            assignmentTitle: assignment.title,
            courseCode: assignment.course.code,
            dueDate: assignment.dueDate,
          },
        },
      });

      return {
        success: true,
        message: "Assignment reminder sent successfully",
      };
    } catch (error) {
      console.error("Error sending assignment reminder:", error);
      throw error;
    }
  }

  /**
   * Send grade notification email
   */
  static async sendGradeNotificationEmail(
    studentId: string,
    assignmentId: string,
    grade: number
  ) {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: true,
        },
      });

      if (!student || !student.user) {
        throw new Error("Student not found");
      }

      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          course: true,
        },
      });

      if (!assignment) {
        throw new Error("Assignment not found");
      }

      // Decrypt email
      const email = await unprotectData(student.email, "email");

      // In a real implementation, you would use an email service like SendGrid, Nodemailer, etc.
      // For now, we'll just log the email that would be sent
      console.log(
        `Grade notification sent to ${email} for assignment ${assignment.title} with grade ${grade}`
      );

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId: student.user.id,
          action: AuditAction.NOTIFICATION_SENT,
          resourceType: ResourceType.ASSIGNMENT,
          resourceId: assignmentId,
          details: {
            type: "grade_notification",
            email,
            assignmentTitle: assignment.title,
            courseCode: assignment.course.code,
            grade,
          },
        },
      });

      return {
        success: true,
        message: "Grade notification sent successfully",
      };
    } catch (error) {
      console.error("Error sending grade notification:", error);
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(email: string) {
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
        throw new Error("No student account found with this email");
      }

      // Check if there's already a recent verification email sent
      const recentToken = await prisma.verificationToken.findFirst({
        where: {
          identifier: student.user.email,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          },
        },
      });

      if (recentToken) {
        throw new Error(
          "Verification email was recently sent. Please check your inbox or try again later."
        );
      }

      // Generate verification token
      const verificationToken = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.verificationToken.create({
        data: {
          identifier: student.user.email,
          token: verificationToken,
          expires: expiresAt,
        },
      });

      // In a real implementation, you would use an email service like SendGrid, Nodemailer, etc.
      // For now, we'll just log the email that would be sent
      console.log(
        `Verification email resent to ${email} with token ${verificationToken}`
      );

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId: student.user.id,
          action: AuditAction.RESEND_VERIFICATION_REQUESTED,
          resourceType: ResourceType.USER,
          resourceId: student.user.id,
          details: {
            email,
            token: verificationToken,
          },
        },
      });

      return {
        success: true,
        message: "Verification email sent successfully",
      };
    } catch (error) {
      console.error("Error resending verification email:", error);
      throw error;
    }
  }
}
