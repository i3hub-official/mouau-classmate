// lib/services/s/emailService.ts
import { prisma } from "@/lib/server/prisma";
import { protectData, unprotectData } from "@/lib/security/dataProtection";
import { AuditAction, ResourceType } from "@prisma/client";
import { generateVerificationToken } from "@/lib/utils";
import { sendEmail } from "@/lib/config/nodemailer";

export class StudentEmailService {
  /**
   * Get base URL depending on environment.
   * - Development: Prefer local fallback URLs.
   * - Production: Always use the public production base URL.
   */
  private static getBaseUrl(): string {
    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      return (
        process.env.NEXT_PUBLIC_BASE_URL_II || // 1st priority
        process.env.NEXT_PUBLIC_BASE_URL || // 2nd fallback
        "https://10.16.217.13:3002" // final fallback (local dev)
      );
    }

    // PRODUCTION
    return (
      process.env.NEXT_PUBLIC_BASE_URL || // production environment variable
      "https://mouaucm.vercel.app" // final production fallback
    );
  }

  /**
   * Encode user data for URL parameters (base64url encoded)
   */
  private static encodeUserData(userId: string, role: string): string {
    // Create a simple payload object
    const userData = {
      id: userId,
      role: role,
      timestamp: Date.now(),
    };

    // Convert to string and encode for URL safety
    const userDataString = JSON.stringify(userData);
    return Buffer.from(userDataString).toString("base64url");
  }

  /**
   * Decode user data from URL parameters
   */
  static decodeUserData(encodedData: string): {
    id: string;
    role: string;
    timestamp: number;
  } {
    try {
      const decodedString = Buffer.from(encodedData, "base64url").toString(
        "utf-8"
      );
      return JSON.parse(decodedString);
    } catch (error) {
      throw new Error("Invalid user data format");
    }
  }

  /**
   * Encode parameters for verification link
   */
  private static encodeVerificationParams(
    token: string,
    userId: string,
    role: string
  ): string {
    const encodedUser = this.encodeUserData(userId, role);

    // Use URLSearchParams for proper URL encoding
    const params = new URLSearchParams({
      t: token,
      u: encodedUser,
      r: role,
    });

    return params.toString();
  }

  /**
   * Encode parameters for password reset link
   */
  private static encodePasswordResetParams(
    token: string,
    userId: string,
    role: string
  ): string {
    const encodedUser = this.encodeUserData(userId, role);

    // Use URLSearchParams for proper URL encoding
    const params = new URLSearchParams({
      t: token,
      u: encodedUser,
      r: role,
    });

    return params.toString();
  }

  /**
   * Decrypt student data for email templates
   */
  private static async getDecryptedStudentData(student: any) {
    const [
      email,
      firstName,
      surname,
      otherName,
      phone,
      matricNumber,
      jambRegNumber,
      department,
      college,
    ] = await Promise.all([
      unprotectData(student.email, "email"),
      unprotectData(student.firstName, "name"),
      unprotectData(student.surname, "name"),
      student.otherName
        ? unprotectData(student.otherName, "name")
        : Promise.resolve(""),
      unprotectData(student.phone, "phone"),
      student.matricNumber
        ? unprotectData(student.matricNumber, "matric") // ✅ FIXED
        : Promise.resolve(""),
      student.jambRegNumber
        ? unprotectData(student.jambRegNumber, "jamb") // ✅ FIXED
        : Promise.resolve(""),
      Promise.resolve(student.department),
      Promise.resolve(student.college),
    ]);

    return {
      email,
      firstName,
      surname,
      otherName,
      fullName: `${surname} ${firstName}${otherName ? ` ${otherName}` : ""}`,
      phone,
      matricNumber,
      jambRegNumber,
      department,
      college,
    };
  }

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

      // Decrypt all student data
      const decryptedData = await this.getDecryptedStudentData(student);

      // DEBUG: Check what we got
      console.log("=== EMAIL DEBUG ===");
      console.log("Raw student.email:", student.email);
      console.log("Decrypted email:", decryptedData.email);
      console.log("Email type:", typeof decryptedData.email);
      console.log("Email length:", decryptedData.email?.length);

      // Send welcome email using Nodemailer
      await sendEmail(decryptedData.email, "welcome-student", {
        name: decryptedData.fullName,
        firstName: decryptedData.firstName,
        surname: decryptedData.surname,
        otherName: decryptedData.otherName,
        studentId: student.id,
        matricNumber: decryptedData.matricNumber,
        jambRegNumber: decryptedData.jambRegNumber,
        department: decryptedData.department,
        college: decryptedData.college,
        registrationDate: new Date().toLocaleDateString(),
        baseUrl: this.getBaseUrl(),
      });

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId: student.user.id,
          action: AuditAction.NOTIFICATION_SENT,
          resourceType: ResourceType.USER,
          resourceId: student.user.id,
          details: {
            type: "welcome",
            email: decryptedData.email,
            environment: process.env.NODE_ENV,
            baseUrl: this.getBaseUrl(),
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

      // Decrypt all student data
      const decryptedData = await this.getDecryptedStudentData(user.student);

      // Create verification link using new format
      const baseUrl = this.getBaseUrl();
      const queryParams = this.encodeVerificationParams(
        token,
        userId,
        "student"
      );
      const verificationLink = `${baseUrl}/auth/verify/ve?${queryParams}`;

      // Send verification email using Nodemailer
      await sendEmail(decryptedData.email, "email-verification", {
        name: decryptedData.fullName,
        firstName: decryptedData.firstName,
        surname: decryptedData.surname,
        verificationLink,
        token,
        expiryHours: 24,
        baseUrl,
      });

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.NOTIFICATION_SENT,
          resourceType: ResourceType.USER,
          resourceId: userId,
          details: {
            type: "email_verification",
            email: decryptedData.email,
            token,
            userId,
            role: "student",
            verificationLink,
            environment: process.env.NODE_ENV,
            baseUrl,
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
      const { generateSearchableHash } = await import(
        "@/lib/security/dataProtection"
      );
      const expectedHash = await generateSearchableHash(decryptedEmail);

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

      // Send welcome email after verification
      await this.sendWelcomeEmail(student.id);

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
            environment: process.env.NODE_ENV,
            baseUrl: this.getBaseUrl(),
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

      // Decrypt all student data
      const decryptedData = await this.getDecryptedStudentData(user.student);

      // Create reset link using new format - FIXED: pointing to correct password reset route
      const baseUrl = this.getBaseUrl();
      const queryParams = this.encodePasswordResetParams(
        token,
        userId,
        "student"
      );
      const resetLink = `${baseUrl}/auth/reset/password?${queryParams}`;

      // Send password reset email using Nodemailer
      await sendEmail(decryptedData.email, "password-reset", {
        name: decryptedData.fullName,
        firstName: decryptedData.firstName,
        surname: decryptedData.surname,
        resetLink,
        token,
        expiryHours: 1, // Typically password reset links expire in 1 hour
        baseUrl,
      });

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.NOTIFICATION_SENT,
          resourceType: ResourceType.USER,
          resourceId: userId,
          details: {
            type: "password_reset",
            email: decryptedData.email,
            token,
            userId,
            role: "student",
            resetLink,
            environment: process.env.NODE_ENV,
            baseUrl,
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
   * Send password reset confirmation email
   */
  static async sendPasswordResetConfirmation(userId: string) {
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

      // Decrypt all student data
      const decryptedData = await this.getDecryptedStudentData(user.student);

      // Send password reset confirmation email using Nodemailer
      await sendEmail(decryptedData.email, "password-reset-confirmation", {
        name: decryptedData.fullName,
        firstName: decryptedData.firstName,
        surname: decryptedData.surname,
        resetTime: new Date().toLocaleString(),
        ipAddress: "unknown", // You can capture this from the request
        baseUrl: this.getBaseUrl(),
      });

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.NOTIFICATION_SENT,
          resourceType: ResourceType.USER,
          resourceId: userId,
          details: {
            type: "password_reset_confirmation",
            email: decryptedData.email,
            environment: process.env.NODE_ENV,
            baseUrl: this.getBaseUrl(),
          },
        },
      });

      return {
        success: true,
        message: "Password reset confirmation sent successfully",
      };
    } catch (error) {
      console.error("Error sending password reset confirmation:", error);
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

      // Decrypt all student data
      const decryptedData = await this.getDecryptedStudentData(student);

      // Send assignment reminder email
      await sendEmail(decryptedData.email, "assignment-reminder", {
        name: decryptedData.fullName,
        firstName: decryptedData.firstName,
        surname: decryptedData.surname,
        assignmentTitle: assignment.title,
        courseCode: assignment.course.code,
        courseName: assignment.course.title,
        dueDate: assignment.dueDate?.toLocaleDateString(),
        reminderTime: new Date().toLocaleString(),
        baseUrl: this.getBaseUrl(),
      });

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId: student.user.id,
          action: AuditAction.NOTIFICATION_SENT,
          resourceType: ResourceType.ASSIGNMENT,
          resourceId: assignmentId,
          details: {
            type: "assignment_reminder",
            email: decryptedData.email,
            assignmentTitle: assignment.title,
            courseCode: assignment.course.code,
            dueDate: assignment.dueDate,
            environment: process.env.NODE_ENV,
            baseUrl: this.getBaseUrl(),
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

      // Decrypt all student data
      const decryptedData = await this.getDecryptedStudentData(student);

      // Calculate percentage if maxScore is available
      const percentage = assignment.maxScore
        ? ((grade / assignment.maxScore) * 100).toFixed(1)
        : null;

      // Send grade notification
      await sendEmail(decryptedData.email, "grade-notification", {
        name: decryptedData.fullName,
        firstName: decryptedData.firstName,
        surname: decryptedData.surname,
        assignmentTitle: assignment.title,
        courseCode: assignment.course.code,
        courseName: assignment.course.title,
        grade,
        maxScore: assignment.maxScore || 100,
        percentage,
        submissionDate: new Date().toLocaleDateString(),
        baseUrl: this.getBaseUrl(),
      });

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId: student.user.id,
          action: AuditAction.NOTIFICATION_SENT,
          resourceType: ResourceType.ASSIGNMENT,
          resourceId: assignmentId,
          details: {
            type: "grade_notification",
            email: decryptedData.email,
            assignmentTitle: assignment.title,
            courseCode: assignment.course.code,
            grade,
            environment: process.env.NODE_ENV,
            baseUrl: this.getBaseUrl(),
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

      // Decrypt all student data
      const decryptedData = await this.getDecryptedStudentData(student);

      // Create verification link using new format
      const baseUrl = this.getBaseUrl();
      const queryParams = this.encodeVerificationParams(
        verificationToken,
        student.user.id,
        "student"
      );
      const verificationLink = `${baseUrl}/auth/verify/ve?${queryParams}`;

      // Send verification email using Nodemailer
      await sendEmail(decryptedData.email, "email-verification", {
        name: decryptedData.fullName,
        firstName: decryptedData.firstName,
        surname: decryptedData.surname,
        verificationLink,
        token: verificationToken,
        expiryHours: 24,
        baseUrl,
      });

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId: student.user.id,
          action: AuditAction.RESEND_VERIFICATION_REQUESTED,
          resourceType: ResourceType.USER,
          resourceId: student.user.id,
          details: {
            email: decryptedData.email,
            token: verificationToken,
            userId: student.user.id,
            role: "student",
            verificationLink,
            environment: process.env.NODE_ENV,
            baseUrl,
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

  /**
   * Send course enrollment notification email
   */
  static async sendCourseEnrollmentEmail(studentId: string, courseId: string) {
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

      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      // Decrypt all student data
      const decryptedData = await this.getDecryptedStudentData(student);

      // Send course enrollment email
      await sendEmail(decryptedData.email, "course-enrollment", {
        name: decryptedData.fullName,
        firstName: decryptedData.firstName,
        surname: decryptedData.surname,
        courseCode: course.code,
        courseName: course.title,
        enrollmentDate: new Date().toLocaleDateString(),
        academicYear: new Date().getFullYear(),
        baseUrl: this.getBaseUrl(),
      });

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId: student.user.id,
          action: AuditAction.NOTIFICATION_SENT,
          resourceType: ResourceType.COURSE,
          resourceId: courseId,
          details: {
            type: "course_enrollment",
            email: decryptedData.email,
            courseCode: course.code,
            courseName: course.title,
            environment: process.env.NODE_ENV,
            baseUrl: this.getBaseUrl(),
          },
        },
      });

      return {
        success: true,
        message: "Course enrollment notification sent successfully",
      };
    } catch (error) {
      console.error("Error sending course enrollment notification:", error);
      throw error;
    }
  }

  /**
   * Send account suspension notification email
   */
  static async sendAccountSuspensionEmail(
    studentId: string,
    reason: string,
    suspensionEndDate?: Date
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

      // Decrypt all student data
      const decryptedData = await this.getDecryptedStudentData(student);

      // Send account suspension email
      await sendEmail(decryptedData.email, "account-suspension", {
        name: decryptedData.fullName,
        firstName: decryptedData.firstName,
        surname: decryptedData.surname,
        reason,
        suspensionDate: new Date().toLocaleDateString(),
        suspensionEndDate: suspensionEndDate
          ? suspensionEndDate.toLocaleDateString()
          : "Indefinite",
        contactEmail: "support@mouaucm.edu.ng",
        baseUrl: this.getBaseUrl(),
      });

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId: student.user.id,
          action: AuditAction.NOTIFICATION_SENT,
          resourceType: ResourceType.USER,
          resourceId: student.user.id,
          details: {
            type: "account_suspension",
            email: decryptedData.email,
            reason,
            suspensionEndDate,
            environment: process.env.NODE_ENV,
            baseUrl: this.getBaseUrl(),
          },
        },
      });

      return {
        success: true,
        message: "Account suspension notification sent successfully",
      };
    } catch (error) {
      console.error("Error sending account suspension notification:", error);
      throw error;
    }
  }

  /**
   * Send account reactivation notification email
   */
  static async sendAccountReactivationEmail(studentId: string) {
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

      // Decrypt all student data
      const decryptedData = await this.getDecryptedStudentData(student);

      // Send account reactivation email
      await sendEmail(decryptedData.email, "account-reactivation", {
        name: decryptedData.fullName,
        firstName: decryptedData.firstName,
        surname: decryptedData.surname,
        reactivationDate: new Date().toLocaleDateString(),
        baseUrl: this.getBaseUrl(),
      });

      // Log the email sent
      await prisma.auditLog.create({
        data: {
          userId: student.user.id,
          action: AuditAction.NOTIFICATION_SENT,
          resourceType: ResourceType.USER,
          resourceId: student.user.id,
          details: {
            type: "account_reactivation",
            email: decryptedData.email,
            environment: process.env.NODE_ENV,
            baseUrl: this.getBaseUrl(),
          },
        },
      });

      return {
        success: true,
        message: "Account reactivation notification sent successfully",
      };
    } catch (error) {
      console.error("Error sending account reactivation notification:", error);
      throw error;
    }
  }
}
