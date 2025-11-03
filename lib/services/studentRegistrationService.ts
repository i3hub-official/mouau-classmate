import { prisma } from "@/lib/server/prisma";
import {
  protectData,
  unprotectData,
  hashData,
} from "@/lib/security/dataProtection";
import * as crypto from "crypto";
import { emailService } from "@/lib/services/emailService";
import { nanoid } from "nanoid";

// ===========================================================
// CUSTOM ERRORS
// ===========================================================

export class StudentRegistrationError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = "StudentRegistrationError";
  }
}

export class ValidationError extends StudentRegistrationError {
  constructor(message: string, details?: any) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class StudentAlreadyExistsError extends StudentRegistrationError {
  constructor(message: string, details?: any) {
    super(message, "STUDENT_ALREADY_EXISTS", details);
    this.name = "StudentAlreadyExistsError";
  }
}

// ===========================================================
// INTERFACES
// ===========================================================

export interface StudentVerificationData {
  surname: string;
  firstName: string;
  otherName?: string;
  gender: string;
  jambReg: string;
  photo?: string;
  college: string;
  department: string;
  course: string;
  state: string;
  lga: string;
  maritalStatus: string;
  email: string;
  phone: string;
  userId?: string;
}

export interface RegistrationRequest {
  matricNumber: string;
  jambReg: string;
  studentData: StudentVerificationData;
  password: string;
}

export interface VerificationResult {
  exists: boolean;
  data?: StudentVerificationData;
  requiresManualEntry?: boolean;
}

export interface RegistrationResult {
  user: any;
  student: any;
  requiresVerification: boolean;
  isNewStudent: boolean;
}

// ===========================================================
// VALIDATION UTILITIES
// ===========================================================

class ValidationUtils {
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password: string): {
    isValid: boolean;
    error?: string;
  } {
    if (password.length < 8) {
      return {
        isValid: false,
        error: "Password must be at least 8 characters",
      };
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return {
        isValid: false,
        error: "Password must contain at least one lowercase letter",
      };
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return {
        isValid: false,
        error: "Password must contain at least one uppercase letter",
      };
    }

    if (!/(?=.*\d)/.test(password)) {
      return {
        isValid: false,
        error: "Password must contain at least one number",
      };
    }

    return { isValid: true };
  }

  static validateRequiredFields(
    data: any,
    requiredFields: string[]
  ): { isValid: boolean; missingFields: string[] } {
    const missingFields = requiredFields.filter(
      (field) => !data[field] || data[field].toString().trim() === ""
    );
    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }

  static normalizeGender(gender: string): "MALE" | "FEMALE" | "OTHER" {
    const upperGender = gender.toUpperCase();
    if (
      upperGender === "MALE" ||
      upperGender === "FEMALE" ||
      upperGender === "OTHER"
    ) {
      return upperGender as "MALE" | "FEMALE" | "OTHER";
    }
    return "OTHER";
  }

  static normalizeMaritalStatus(
    status: string
  ): "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" {
    const upperStatus = status.toUpperCase();
    if (
      upperStatus === "SINGLE" ||
      upperStatus === "MARRIED" ||
      upperStatus === "DIVORCED" ||
      upperStatus === "WIDOWED"
    ) {
      return upperStatus as "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
    }
    return "SINGLE";
  }
}

// ===========================================================
// SECURITY UTILITIES
// ===========================================================

class SecurityUtils {
  /**
   * Generate a secure verification code using nanoid
   */
  static generateVerificationCode(length: number = 48): string {
    return nanoid(length);
  }

  /**
   * Encode email for URL (Base64 URL-safe encoding)
   */
  static encodeEmail(email: string): string {
    return Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  /**
   * Decode email from URL
   */
  static decodeEmail(encodedEmail: string): string {
    // Add back padding if needed
    const padding = "=".repeat((4 - (encodedEmail.length % 4)) % 4);
    const base64 = encodedEmail.replace(/-/g, "+").replace(/_/g, "/") + padding;
    return Buffer.from(base64, "base64").toString("utf-8");
  }

  /**
   * Generate timestamp hash for additional security
   */
  static generateTimestampHash(): string {
    const timestamp = Date.now().toString();
    return crypto
      .createHash("sha256")
      .update(timestamp + process.env.ENCRYPTION_KEY)
      .digest("hex")
      .substring(0, 16);
  }

  /**
   * Create secure verification URL parameters using the manual verification scheme.
   * Parameters: e (encoded email), t (token), h (timestamp hash)
   */
  static createVerificationParams(email: string, code: string): string {
    const e = this.encodeEmail(email);
    const t = code;
    const h = this.generateTimestampHash();
    return `e=${e}&t=${t}&h=${h}`;
  }

  /**
   * Parse verification URL parameters
   */
  static parseVerificationParams(params: URLSearchParams): {
    email: string | null;
    code: string | null;
    hash: string | null;
  } {
    try {
      const encodedEmail = params.get("e");
      const code = params.get("t");
      const hash = params.get("h");

      if (!encodedEmail || !code || !hash) {
        return { email: null, code: null, hash: null };
      }

      const email = this.decodeEmail(encodedEmail);
      return { email, code, hash };
    } catch (error) {
      console.error("Error parsing verification params:", error);
      return { email: null, code: null, hash: null };
    }
  }
}

// ===========================================================
// BASE URL UTILITY
// ===========================================================

class UrlUtils {
  static getBaseUrl(): string {
    // In development, use the private LAN URL
    if (process.env.NODE_ENV === "development") {
      return process.env.NEXT_BASE_URL || "https://192.168.0.105:3002";
    }
    // In production, use the public URL
    return process.env.NEXT_PUBLIC_APP_URL || "https://mouaucm.vercel.app";
  }
}

// ===========================================================
// STUDENT REGISTRATION SERVICE CLASS
// ===========================================================

export class StudentRegistrationService {
  /**
   * Verifies if a student identified by matricNumber or jambRegNumber is already registered.
   */
  static async verifyStudent(identifier: string): Promise<VerificationResult> {
    if (!identifier || identifier.trim() === "") {
      throw new ValidationError("Identifier is required");
    }

    // Check if student is already registered
    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [{ matricNumber: identifier }, { jambRegNumber: identifier }],
      },
      include: {
        user: true,
      },
    });

    if (existingStudent && existingStudent.userId) {
      throw new StudentAlreadyExistsError(
        "Student already registered. Please sign in instead."
      );
    }

    const studentData = await this.loadStudentData(identifier);

    if (studentData) {
      return {
        exists: true,
        data: studentData,
        requiresManualEntry: false,
      };
    }

    return {
      exists: false,
      requiresManualEntry: true,
    };
  }

  /**
   * Load and decrypt existing student data from database record.
   */
  private static async loadStudentData(
    identifier: string
  ): Promise<StudentVerificationData | null> {
    try {
      const studentRecord = await prisma.student.findFirst({
        where: {
          OR: [{ matricNumber: identifier }, { jambRegNumber: identifier }],
        },
      });

      if (!studentRecord) {
        return null;
      }

      // Decrypt protected fields
      const [
        decryptedEmail,
        decryptedPhone,
        decryptedJambReg,
        decryptedNin,
        decryptedSurname,
        decryptedFirstName,
        decryptedOtherName,
        decryptedState,
        decryptedLga,
      ] = await Promise.all([
        unprotectData(studentRecord.email, "email"),
        unprotectData(studentRecord.phone, "phone"),
        unprotectData(studentRecord.jambRegNumber, "nin"),
        unprotectData(studentRecord.nin || "", "nin"),
        unprotectData(studentRecord.lastName, "name"),
        unprotectData(studentRecord.firstName, "name"),
        unprotectData(studentRecord.otherName || "", "name"),
        unprotectData(studentRecord.state, "location"),
        unprotectData(studentRecord.lga, "location"),
      ]);

      return {
        surname: decryptedSurname,
        firstName: decryptedFirstName,
        otherName: decryptedOtherName || undefined,
        gender: studentRecord.gender || "",
        jambReg: decryptedJambReg,
        photo: studentRecord.passportUrl || undefined,
        college: studentRecord.college,
        department: studentRecord.department,
        course: studentRecord.course,
        state: decryptedState,
        lga: decryptedLga,
        maritalStatus: studentRecord.maritalStatus || "",
        email: decryptedEmail,
        phone: decryptedPhone,
        userId: studentRecord.userId,
      };
    } catch (error) {
      console.error("Error loading and decrypting student data:", error);
      return null;
    }
  }

  /**
   * Registers a student by creating a new User and associating it with a new Student record.
   */
  static async registerStudent(
    request: RegistrationRequest
  ): Promise<RegistrationResult> {
    const { matricNumber, jambReg, studentData, password } = request;

    // Validate required fields
    const requiredFields = ["matricNumber", "jambReg", "email"];
    const validation = ValidationUtils.validateRequiredFields(
      { matricNumber, jambReg, email: studentData.email },
      requiredFields
    );

    if (!validation.isValid) {
      throw new ValidationError(
        `Missing required fields: ${validation.missingFields.join(", ")}`
      );
    }

    // Validate password
    const passwordValidation = ValidationUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.error!);
    }

    // Validate email format
    if (!ValidationUtils.validateEmail(studentData.email)) {
      throw new ValidationError("Please provide a valid email address");
    }

    // Normalize gender and marital status
    const normalizedGender = ValidationUtils.normalizeGender(
      studentData.gender
    );
    const normalizedMaritalStatus = ValidationUtils.normalizeMaritalStatus(
      studentData.maritalStatus
    );

    // Protect sensitive data
    const [
      protectedEmail,
      protectedPhone,
      protectedJambReg,
      protectedNin,
      protectedSurname,
      protectedFirstName,
      protectedOtherName,
      protectedState,
      protectedLga,
      hashedPassword,
    ] = await Promise.all([
      protectData(studentData.email, "email"),
      protectData(studentData.phone, "phone"),
      protectData(matricNumber, "nin"),
      protectData(jambReg, "nin"),
      protectData(studentData.surname.toUpperCase(), "name"),
      protectData(studentData.firstName.toUpperCase(), "name"),
      protectData(studentData.otherName?.toUpperCase() || "", "name"),
      protectData(studentData.state, "location"),
      protectData(studentData.lga, "location"),
      hashData(password),
    ]);

    // Check if student already exists
    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [
          { matricNumber: matricNumber },
          { jambRegNumber: jambReg },
          { email: protectedEmail.encrypted }, // Search by encrypted email
          { phone: protectedPhone.encrypted }, // Search by encrypted phone
        ],
      },
    });

    if (existingStudent) {
      throw new StudentAlreadyExistsError(
        "Student already registered with this matric number, JAMB registration, email, or phone"
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: studentData.email,
      },
    });

    if (existingUser) {
      throw new StudentAlreadyExistsError(
        "User already exists with this email"
      );
    }

    let user: any;
    let student: any;

    try {
      // Database transaction
      const result = await prisma.$transaction(
        async (tx) => {
          // Create user
          const newUser = await tx.user.create({
            data: {
              name: `${studentData.surname.toUpperCase()} ${studentData.firstName.toUpperCase()} ${
                studentData.otherName?.toUpperCase() || ""
              }`.trim(),
              email: studentData.email,
              role: "STUDENT",
              isActive: false,
              passwordHash: hashedPassword,
            },
          });

          console.log("👤 User created:", {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
          });

          // Create student record
          const newStudent = await tx.student.create({
            data: {
              matricNumber: matricNumber,
              jambRegNumber: protectedJambReg.encrypted,
              nin: protectedNin.encrypted,
              lastName: protectedSurname.encrypted,
              firstName: protectedFirstName.encrypted,
              otherName: protectedOtherName.encrypted,
              gender: normalizedGender,
              phone: protectedPhone.encrypted,
              passportUrl: studentData.photo,
              email: protectedEmail.encrypted,
              department: studentData.department,
              course: studentData.course,
              college: studentData.college,
              state: protectedState.encrypted,
              lga: protectedLga.encrypted,
              maritalStatus: normalizedMaritalStatus,
              userId: newUser.id,
              emailSearchHash: protectedEmail.searchHash,
              phoneSearchHash: protectedPhone.searchHash,
              jambRegSearchHash: protectedJambReg.searchHash,
              ninSearchHash: protectedNin.searchHash,
            },
          });

          console.log("🎓 Student created:", {
            id: newStudent.id,
            matricNumber: newStudent.matricNumber,
            userId: newStudent.userId,
          });

          // Create account for NextAuth
          await tx.account.create({
            data: {
              userId: newUser.id,
              type: "credentials",
              provider: "credentials",
              providerAccountId: newUser.id,
            },
          });

          return { user: newUser, student: newStudent };
        },
        {
          maxWait: 10000,
          timeout: 10000,
        }
      );

      user = result.user;
      student = result.student;
    } catch (error) {
      console.error("❌ Error during student registration transaction:", error);

      if (error instanceof StudentRegistrationError) {
        throw error;
      }

      if (error instanceof Error && "code" in error && error.code === "P2002") {
        throw new StudentAlreadyExistsError(
          "Student record already exists with this matric number, JAMB registration, email, or phone"
        );
      }

      throw new StudentRegistrationError(
        "Failed to complete student registration"
      );
    }

    // Send verification email **OUTSIDE transaction**
    // This call is placed here to ensure the email is only sent after successful account creation.
    try {
      const verificationToken = await this.sendVerificationEmail(
        studentData.email,
        user.id,
        `${studentData.surname.toUpperCase()}`.trim()
      );

      console.log("✅ Verification email process completed with NEW token");
    } catch (emailError) {
      console.error("❌ Failed to send verification email:", emailError);
    }

    // Create audit log OUTSIDE transaction
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "STUDENT_REGISTERED",
          resourceType: "STUDENT",
          resourceId: student.id,
          details: {
            matricNumber,
            jambReg,
            college: studentData.college,
            department: studentData.department,
            gender: normalizedGender,
            maritalStatus: normalizedMaritalStatus,
            emailSent: true,
            verificationTokenGenerated: true,
          },
          ipAddress: "registration_system",
          userAgent: "student_registration",
        },
      });
    } catch (auditError) {
      console.error("❌ Failed to create audit log:", auditError);
    }

    return {
      user,
      student,
      requiresVerification: true,
      isNewStudent: true,
    };
  }

  /**
   * Generates and stores a verification token and sends verification email.
   * This function ENSURES **only one valid token exists** at any time for the given email.
   */
  static async sendVerificationEmail(
    email: string,
    userId: string,
    name: string
  ): Promise<string> {
    console.log("📧 sendVerificationEmail called with:", {
      email: email || "UNDEFINED",
      userId: userId || "UNDEFINED",
      name: name || "UNDEFINED",
    });

    if (!email || !userId || !name) {
      console.error("❌ Missing required parameters for verification email");
      throw new ValidationError("Email, userId, and name are required");
    }

    if (!ValidationUtils.validateEmail(email)) {
      throw new ValidationError("Invalid email format");
    }

    if (name.trim().length === 0) {
      throw new ValidationError("Name cannot be empty");
    }

    // CRITICAL: Delete existing tokens for this user's email.
    // This prevents duplicate/stale tokens from being valid, ensuring only the
    // latest link sent can be used, solving the duplication issue.
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    console.log("🔒 Deleted any existing verification tokens for:", email);

    // Generate NEW verification code using nanoid (48 chars for high security)
    const verificationCode = SecurityUtils.generateVerificationCode(48);

    console.log("🔐 Generated new verification code using nanoid");

    try {
      // Store NEW verification token
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token: verificationCode,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // Use the new base URL utility
      const baseUrl = UrlUtils.getBaseUrl();

      // Create secure verification URL with encoded parameters (e=email, t=token, h=hash)
      const verificationParams = SecurityUtils.createVerificationParams(
        email,
        verificationCode
      );

      // Verification link suitable for click or manual copy/paste
      const verificationLink = `${baseUrl}/auth/verify-email/verify?${verificationParams}`;

      console.log(`🔗 Preparing secure verification email for ${email}`);
      console.log(`🌐 Using base URL: ${baseUrl}`);
      console.log(
        `🔐 Verification link structure: /auth/verify-email/verify?e=[encoded_email]&t=[code]&h=[hash]`
      );

      const emailSent = await emailService.sendEmail({
        to: email,
        subject: "Verify Your MOUAU ClassMate Account",
        template: "email-verification",
        context: {
          name: name.trim(),
          verificationLink: verificationLink,
          baseUrl: baseUrl,
        },
      });

      if (!emailSent) {
        console.error("❌ Email service failed to send verification email");

        // Clean up the newly created token if email sending fails
        await prisma.verificationToken.deleteMany({
          where: { identifier: email },
        });

        throw new StudentRegistrationError("Failed to send verification email");
      }

      console.log(`✅ Verification email successfully sent to: ${email}`);
      console.log(
        `🔒 Security: Using nanoid code + encoded email + timestamp hash`
      );

      return verificationCode;
    } catch (error) {
      console.error("❌ Error in sendVerificationEmail:", error);

      try {
        // Ensure token is cleaned up on any failure
        await prisma.verificationToken.deleteMany({
          where: { identifier: email },
        });
        console.log(`🧹 Cleaned up verification token for: ${email}`);
      } catch (cleanupError) {
        console.error(
          "❌ Failed to clean up verification token:",
          cleanupError
        );
      }

      if (error instanceof StudentRegistrationError) {
        throw error;
      }

      throw new StudentRegistrationError("Failed to send verification email");
    }
  }

  /**
   * Sends welcome email after successful verification
   */
  static async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    console.log("🎉 sendWelcomeEmail called with:", {
      email: email || "UNDEFINED",
      name: name || "UNDEFINED",
    });

    if (!email || !name) {
      console.error("❌ Missing required parameters for welcome email");
      return false;
    }

    try {
      const baseUrl = UrlUtils.getBaseUrl();
      const loginLink = `${baseUrl}/auth/signin`;

      const emailSent = await emailService.sendEmail({
        to: email,
        subject: "Welcome to MOUAU ClassMate!",
        template: "welcome-student",
        context: {
          name: name.trim(),
          loginLink: loginLink,
        },
      });

      if (emailSent) {
        console.log(`✅ Welcome email sent to: ${email}`);
      } else {
        console.error(`❌ Failed to send welcome email to: ${email}`);
      }

      return emailSent;
    } catch (error) {
      console.error("❌ Error sending welcome email:", error);
      return false;
    }
  }

  /**
   * Verifies an email using the provided code and encoded email
   */
  static async verifyEmail(
    code: string,
    encodedEmail?: string
  ): Promise<{ success: boolean; user: any }> {
    if (!code) {
      throw new ValidationError("Verification code is required");
    }

    try {
      // If encoded email is provided, decode it for additional validation
      let emailFromParam: string | null = null;
      if (encodedEmail) {
        try {
          emailFromParam = SecurityUtils.decodeEmail(encodedEmail);
          console.log("📧 Decoded email from parameter");
        } catch (decodeError) {
          console.error("❌ Failed to decode email parameter:", decodeError);
          throw new ValidationError("Invalid verification link");
        }
      }

      // Find the verification token
      const verificationToken = await prisma.verificationToken.findFirst({
        where: {
          token: code,
          expires: {
            gt: new Date(),
          },
        },
      });

      if (!verificationToken) {
        throw new ValidationError("Invalid or expired verification code");
      }

      // If email was provided in the URL, validate it matches the token
      if (emailFromParam && emailFromParam !== verificationToken.identifier) {
        console.error("❌ Email mismatch: URL email doesn't match token");
        throw new ValidationError("Invalid verification link");
      }

      // Find user by email from token
      const user = await prisma.user.findFirst({
        where: {
          email: verificationToken.identifier,
        },
      });

      if (!user) {
        throw new ValidationError("User not found");
      }

      // Activate user
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: true,
          emailVerified: new Date(),
        },
      });

      // Delete used token
      await prisma.verificationToken.delete({
        where: { token: code },
      });

      console.log("✅ Email verified successfully for:", user.email);

      // Send welcome email
      try {
        await this.sendWelcomeEmail(user.email, user.name || "");
      } catch (welcomeError) {
        console.error("⚠️ Failed to send welcome email:", welcomeError);
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "EMAIL_VERIFIED",
          resourceType: "USER",
          resourceId: user.id,
          ipAddress: "email_verification",
          userAgent: "email_verification",
        },
      });

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error("❌ Error verifying email:", error);

      if (error instanceof StudentRegistrationError) {
        throw error;
      }

      throw new StudentRegistrationError("Failed to verify email");
    }
  }

  /**
   * Sends password reset email
   */
  static async sendPasswordResetEmail(
    email: string,
    name: string
  ): Promise<string> {
    if (!email || !name) {
      throw new ValidationError("Email and name are required");
    }

    // Generate reset code using nanoid (48 chars)
    const resetCode = SecurityUtils.generateVerificationCode(48);

    try {
      const user = await prisma.user.findFirst({ where: { email } });
      if (!user) {
        throw new ValidationError("User not found");
      }

      // Delete all existing reset tokens for the user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      await prisma.passwordResetToken.create({
        data: {
          token: resetCode,
          userId: user.id,
          expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      const baseUrl = UrlUtils.getBaseUrl();

      // Create secure reset URL with encoded parameters (e=email, t=token, h=hash)
      const resetParams = SecurityUtils.createVerificationParams(
        email,
        resetCode
      );
      const resetLink = `${baseUrl}/auth/reset-password?${resetParams}`;

      console.log(
        "🔐 Password reset link structure: /auth/reset-password?e=[encoded_email]&t=[code]&h=[hash]"
      );

      const emailSent = await emailService.sendEmail({
        to: email,
        subject: "Reset Your MOUAU ClassMate Password",
        template: "password-reset",
        context: {
          name: name,
          resetLink: resetLink,
        },
      });

      if (!emailSent) {
        // Clean up the newly created token if email sending fails
        await prisma.passwordResetToken.deleteMany({
          where: { userId: user.id },
        });
        throw new StudentRegistrationError(
          "Failed to send password reset email"
        );
      }

      console.log(`✅ Password reset email sent to: ${email}`);
      console.log(
        `🔒 Security: Using nanoid code + encoded email + timestamp hash`
      );

      return resetCode;
    } catch (error) {
      console.error("Error sending password reset email:", error);

      try {
        const user = await prisma.user.findFirst({ where: { email } });
        if (user) {
          // Clean up tokens on failure
          await prisma.passwordResetToken.deleteMany({
            where: { userId: user.id },
          });
        }
      } catch (cleanupError) {
        console.error("Failed to clean up reset token:", cleanupError);
      }

      throw new StudentRegistrationError("Failed to send password reset email");
    }
  }

  /**
   * Resends verification email
   */
  static async resendVerificationEmail(email: string): Promise<string> {
    console.log("🔄 Resending verification email for:", email);

    if (!email) {
      throw new ValidationError("Email is required");
    }

    if (!ValidationUtils.validateEmail(email)) {
      throw new ValidationError("Invalid email format");
    }

    const user = await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        emailVerified: true,
        auditLogs: {
          where: {
            action: "RESEND_VERIFICATION_REQUESTED",
            createdAt: {
              gte: new Date(Date.now() - 15 * 60 * 1000),
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!user) {
      console.log(
        "⚠️ Resend verification requested for non-existent email:",
        email
      );
      // Return success message even if user doesn't exist to prevent enumeration attacks
      return "email_sent";
    }

    if (user.isActive && user.emailVerified) {
      throw new ValidationError("Email is already verified");
    }

    const recentAttempts = user.auditLogs.length;
    if (recentAttempts >= 3) {
      throw new StudentRegistrationError(
        "Too many verification requests. Please wait 15 minutes before trying again.",
        "RATE_LIMITED"
      );
    }

    return await this.sendVerificationEmail(
      user.email,
      user.id,
      user.name || "Student"
    );
  }

  /**
   * Helper methods
   */
  static async canRegisterStudent(identifier: string): Promise<{
    canRegister: boolean;
    reason?: string;
    existingStudent?: any;
  }> {
    if (!identifier || identifier.trim() === "") {
      return {
        canRegister: false,
        reason: "Identifier is required",
      };
    }

    try {
      const existingStudent = await prisma.student.findFirst({
        where: {
          OR: [{ matricNumber: identifier }, { jambRegNumber: identifier }],
        },
        include: {
          user: true,
        },
      });

      if (existingStudent) {
        return {
          canRegister: false,
          reason: "Student already registered",
          existingStudent,
        };
      }

      return {
        canRegister: true,
      };
    } catch (error) {
      console.error("Error checking student registration eligibility:", error);
      return {
        canRegister: false,
        reason: "System error. Please try again.",
      };
    }
  }

  static async getStudentData(
    identifier: string
  ): Promise<StudentVerificationData | null> {
    if (!identifier || identifier.trim() === "") {
      throw new ValidationError("Identifier is required");
    }

    return this.loadStudentData(identifier);
  }

  static async studentRecordExists(identifier: string): Promise<boolean> {
    if (!identifier || identifier.trim() === "") {
      return false;
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [{ matricNumber: identifier }, { jambRegNumber: identifier }],
      },
    });

    return !!student;
  }
}
