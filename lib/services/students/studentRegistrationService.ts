import { prisma } from "@/lib/server/prisma";
import {
  protectData,
  unprotectData,
  hashData,
  verifyPassword,
  validatePasswordStrength,
  PasswordSecurity,
} from "@/lib/security/dataProtection";
import * as crypto from "crypto";
import { emailService } from "@/lib/services/students/emailService";
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

export class AuthenticationError extends StudentRegistrationError {
  constructor(message: string, details?: any) {
    super(message, "AUTHENTICATION_ERROR", details);
    this.name = "AuthenticationError";
  }
}

function maskEmail(email: string) {
  if (!email || !email.includes("@")) return "unknown";

  const [user, domain] = email.split("@");
  const maskedUser =
    user.length <= 2
      ? user[0] + "*"
      : user[0] + "*".repeat(Math.max(1, user.length - 2)) + user.slice(-1);

  const domainParts = domain.split(".");
  const maskedDomain =
    domainParts[0].length > 2
      ? domainParts[0][0] +
        "*".repeat(domainParts[0].length - 2) +
        domainParts[0].slice(-1)
      : domainParts[0][0] + "*";

  return `${maskedUser}@${maskedDomain}.${domainParts.slice(1).join(".")}`;
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

export interface PasswordResetResult {
  success: boolean;
  message: string;
  token?: string;
}

export interface TokenVerificationResult {
  success: boolean;
  message: string;
  data?: {
    email: string;
    name: string;
  };
}

// ===========================================================
// CASE FORMATTING UTILITIES
// ===========================================================

class CaseFormattingUtils {
  /**
   * Convert string to sentence case (first letter uppercase, rest lowercase)
   */
  static toSentenceCase(str: string): string {
    if (!str || str.trim() === "") return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Format name fields (surname, firstName, otherName) to sentence case
   */
  static formatNameField(name: string): string {
    if (!name || name.trim() === "") return name;
    return this.toSentenceCase(name.trim());
  }

  /**
   * Format department and course to sentence case
   */
  static formatDepartmentCourse(field: string): string {
    if (!field || field.trim() === "") return field;
    return this.toSentenceCase(field.trim());
  }

  /**
   * Format college and matric number to uppercase
   */
  static formatUpperCase(field: string): string {
    if (!field || field.trim() === "") return field;
    return field.trim().toUpperCase();
  }

  /**
   * Format gender and marital status to uppercase
   */
  static formatGenderStatus(field: string): string {
    if (!field || field.trim() === "") return field;
    return field.trim().toUpperCase();
  }
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
    // Use the enhanced password strength validation from dataProtection
    const result = validatePasswordStrength(password);
    return {
      isValid: result.isValid,
      error: result.errors.length > 0 ? result.errors[0] : undefined,
    };
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
    const upperGender = CaseFormattingUtils.formatGenderStatus(gender);
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
    const upperStatus = CaseFormattingUtils.formatGenderStatus(status);
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
   * Create verification URL parameters
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

  /**
   * Validate timestamp hash
   */
  static validateTimestampHash(hash: string): boolean {
    try {
      const expectedHash = this.generateTimestampHash();
      return hash === expectedHash;
    } catch (error) {
      return false;
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
  public static async loadStudentData(
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

      // Decrypt protected fields using the new dataProtection system
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

      // Apply case formatting to the decrypted data
      return {
        surname: CaseFormattingUtils.formatNameField(decryptedSurname),
        firstName: CaseFormattingUtils.formatNameField(decryptedFirstName),
        otherName: decryptedOtherName
          ? CaseFormattingUtils.formatNameField(decryptedOtherName)
          : undefined,
        gender: studentRecord.gender || "",
        jambReg: decryptedJambReg,
        photo: studentRecord.passportUrl || undefined,
        college: CaseFormattingUtils.formatUpperCase(studentRecord.college),
        department: CaseFormattingUtils.formatDepartmentCourse(
          studentRecord.department
        ),
        course: CaseFormattingUtils.formatDepartmentCourse(
          studentRecord.course
        ),
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

    // Validate password using enhanced validation
    const passwordValidation = ValidationUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(passwordValidation.error!);
    }

    // Validate email format
    if (!ValidationUtils.validateEmail(studentData.email)) {
      throw new ValidationError("Please provide a valid email address");
    }

    // Apply case formatting to the student data
    const formattedStudentData = {
      ...studentData,
      surname: CaseFormattingUtils.formatNameField(studentData.surname),
      firstName: CaseFormattingUtils.formatNameField(studentData.firstName),
      otherName: studentData.otherName
        ? CaseFormattingUtils.formatNameField(studentData.otherName)
        : undefined,
      gender: CaseFormattingUtils.formatGenderStatus(studentData.gender),
      college: CaseFormattingUtils.formatUpperCase(studentData.college),
      department: CaseFormattingUtils.formatDepartmentCourse(
        studentData.department
      ),
      course: CaseFormattingUtils.formatDepartmentCourse(studentData.course),
      maritalStatus: CaseFormattingUtils.formatGenderStatus(
        studentData.maritalStatus
      ),
    };

    // Normalize gender and marital status
    const normalizedGender = ValidationUtils.normalizeGender(
      formattedStudentData.gender
    );
    const normalizedMaritalStatus = ValidationUtils.normalizeMaritalStatus(
      formattedStudentData.maritalStatus
    );

    // Protect sensitive data using the new dataProtection system
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
      protectData(formattedStudentData.email, "email"),
      protectData(formattedStudentData.phone, "phone"),
      protectData(matricNumber, "nin"),
      protectData(jambReg, "nin"),
      protectData(formattedStudentData.surname, "name"),
      protectData(formattedStudentData.firstName, "name"),
      protectData(formattedStudentData.otherName || "", "name"),
      protectData(formattedStudentData.state, "location"),
      protectData(formattedStudentData.lga, "location"),
      protectData(password, "password"), // Use the new password protection tier
    ]);

    // Check if student already exists
    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [
          { matricNumber: matricNumber },
          { jambRegNumber: jambReg },
          { email: formattedStudentData.email },
          { phone: formattedStudentData.phone },
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
        email: formattedStudentData.email,
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
          // Create user with formatted name
          const newUser = await tx.user.create({
            data: {
              name: `${formattedStudentData.surname} ${
                formattedStudentData.firstName
              } ${formattedStudentData.otherName || ""}`.trim(),
              email: formattedStudentData.email,
              role: "STUDENT",
              isActive: false,
              passwordHash: hashedPassword.encrypted, // Use the encrypted password from dataProtection
              failedLoginAttempts: 0,
              accountLocked: false,
              loginCount: 0,
            },
          });

          // Create student record
          const newStudent = await tx.student.create({
            data: {
              matricNumber: CaseFormattingUtils.formatUpperCase(matricNumber),
              jambRegNumber: protectedJambReg.encrypted,
              nin: protectedNin.encrypted,
              lastName: protectedSurname.encrypted,
              firstName: protectedFirstName.encrypted,
              otherName: protectedOtherName.encrypted,
              gender: normalizedGender,
              phone: protectedPhone.encrypted,
              passportUrl: formattedStudentData.photo,
              email: protectedEmail.encrypted,
              department: formattedStudentData.department,
              course: formattedStudentData.course,
              college: formattedStudentData.college,
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

    // Send verification email OUTSIDE transaction - ONLY ONCE
    try {
      const verificationToken = await this.sendVerificationEmail(
        formattedStudentData.email,
        user.id,
        formattedStudentData.surname
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
            college: formattedStudentData.college,
            department: formattedStudentData.department,
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
   * Modified to prevent duplicate emails by checking for existing tokens.
   */
  static async sendVerificationEmail(
    email: string,
    userId: string,
    name: string
  ): Promise<string> {
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

    // Check if there's already a recent verification token (within 5 minutes)
    const existingToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        },
      },
    });

    if (existingToken) {
      return existingToken.token;
    }

    // Delete any older tokens for security
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: email,
        createdAt: {
          lt: new Date(Date.now() - 5 * 60 * 1000), // Older than 5 minutes
        },
      },
    });

    // Generate NEW verification code using nanoid (48 chars for high security)
    const verificationCode = SecurityUtils.generateVerificationCode(48);

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

      // Create secure verification URL with encoded parameters
      const verificationParams = SecurityUtils.createVerificationParams(
        email,
        verificationCode
      );
      const verificationLink = `${baseUrl}/auth/verify-email/verify?${verificationParams}`;

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

        await prisma.verificationToken.deleteMany({
          where: { identifier: email },
        });

        throw new StudentRegistrationError("Failed to send verification email");
      }

      return verificationCode;
    } catch (error) {
      console.error("❌ Error in sendVerificationEmail:", error);

      try {
        await prisma.verificationToken.deleteMany({
          where: { identifier: email },
        });
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

      // Delete existing reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Create new reset token
      await prisma.passwordResetToken.create({
        data: {
          token: resetCode,
          userId: user.id,
          expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      const baseUrl = UrlUtils.getBaseUrl();

      // Create secure reset URL with encoded parameters
      const resetParams = SecurityUtils.createVerificationParams(
        email,
        resetCode
      );
      const resetLink = `${baseUrl}/auth/reset-password?${resetParams}`;

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
        await prisma.passwordResetToken.deleteMany({
          where: { userId: user.id },
        });
        throw new StudentRegistrationError(
          "Failed to send password reset email"
        );
      }

      return resetCode;
    } catch (error) {
      console.error("Error sending password reset email:", error);

      try {
        const user = await prisma.user.findFirst({ where: { email } });
        if (user) {
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
   * Sends password reset confirmation email
   */
  static async sendPasswordResetConfirmationEmail(
    email: string,
    name: string
  ): Promise<boolean> {
    if (!email || !name) {
      console.error(
        "❌ Missing required parameters for password reset confirmation email"
      );
      return false;
    }

    try {
      const baseUrl = UrlUtils.getBaseUrl();
      const loginLink = `${baseUrl}/auth/signin`;

      const emailSent = await emailService.sendEmail({
        to: email,
        subject: "Your MOUAU ClassMate Password Has Been Reset",
        template: "password-reset-confirmation",
        context: {
          name: name.trim(),
          loginLink: loginLink,
          timestamp: new Date().toLocaleString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          }),
        },
      });

      return emailSent;
    } catch (error) {
      console.error(
        "❌ Error sending password reset confirmation email:",
        error
      );
      return false;
    }
  }

  /**
   * Verify password reset token
   */
  static async verifyPasswordResetToken(
    token: string,
    encodedEmail?: string
  ): Promise<TokenVerificationResult> {
    if (!token) {
      throw new ValidationError("Reset token is required");
    }

    try {
      // Decode email if provided
      let email: string | null = null;
      if (encodedEmail) {
        try {
          email = SecurityUtils.decodeEmail(encodedEmail);
        } catch (decodeError) {
          return {
            success: false,
            message: "Invalid reset link",
          };
        }
      }

      // Find the reset token
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          token: token,
          expires: {
            gt: new Date(),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              isActive: true,
            },
          },
        },
      });

      if (!resetToken) {
        return {
          success: false,
          message: "Invalid or expired reset token",
        };
      }

      // Validate email match if provided
      if (email && email !== resetToken.user.email) {
        return {
          success: false,
          message: "Email does not match reset token",
        };
      }

      if (!resetToken.user.isActive) {
        return {
          success: false,
          message: "Account is not active",
        };
      }

      return {
        success: true,
        message: "Token is valid",
        data: {
          email: resetToken.user.email,
          name: resetToken.user.name || "Student",
        },
      };
    } catch (error) {
      console.error("Token verification error:", error);
      return {
        success: false,
        message: "Failed to verify reset token",
      };
    }
  }

  /**
   * Reset password using token
   */
  static async resetPasswordWithToken(
    token: string,
    encodedEmail: string,
    password: string,
    confirmPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate required fields
      if (!token || !password || !confirmPassword) {
        throw new ValidationError(
          "Token, password, and confirm password are required"
        );
      }

      // Validate password match
      if (password !== confirmPassword) {
        throw new ValidationError("Passwords do not match");
      }

      // Validate password strength
      const passwordValidation = ValidationUtils.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new ValidationError(passwordValidation.error!);
      }

      // Decode email
      let email: string;
      try {
        email = SecurityUtils.decodeEmail(encodedEmail);
      } catch (decodeError) {
        throw new ValidationError("Invalid reset link");
      }

      // Verify reset token
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          token: token,
          expires: {
            gt: new Date(),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              isActive: true,
              passwordHash: true,
            },
          },
        },
      });

      if (!resetToken) {
        throw new ValidationError("Invalid or expired reset token");
      }

      // Validate email match
      if (email !== resetToken.user.email) {
        throw new ValidationError("Email does not match reset token");
      }

      if (!resetToken.user.isActive) {
        throw new ValidationError("Account is not active");
      }

      // Check if new password is same as old password
      if (!resetToken.user.passwordHash) {
        throw new ValidationError("User does not have a password set");
      }
      const isSamePassword = await this.verifyPasswordForAuth(
        password,
        resetToken.user.passwordHash
      );

      if (isSamePassword) {
        throw new ValidationError(
          "New password cannot be the same as current password"
        );
      }

      // Hash new password
      const protectedPassword = await protectData(password, "password");

      // Update user password
      await prisma.$transaction(async (tx) => {
        // Update password
        await tx.user.update({
          where: { id: resetToken.user.id },
          data: {
            passwordHash: protectedPassword.encrypted,
            updatedAt: new Date(),
          },
        });

        // Delete used reset token
        await tx.passwordResetToken.delete({
          where: { token: token },
        });

        // Delete all other reset tokens for this user
        await tx.passwordResetToken.deleteMany({
          where: { userId: resetToken.user.id },
        });
      });

      // Send confirmation email
      try {
        await this.sendPasswordResetConfirmationEmail(
          resetToken.user.email,
          resetToken.user.name || "Student"
        );
      } catch (emailError) {
        console.error(
          "Failed to send password reset confirmation email:",
          emailError
        );
      }

      return {
        success: true,
        message: "Password has been reset successfully",
      };
    } catch (error) {
      console.error("Password reset error:", error);

      if (error instanceof StudentRegistrationError) {
        throw error;
      }

      throw new StudentRegistrationError("Failed to reset password");
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(
    email: string
  ): Promise<PasswordResetResult> {
    try {
      if (!email) {
        throw new ValidationError("Email address is required");
      }

      // Validate email format
      if (!ValidationUtils.validateEmail(email)) {
        throw new ValidationError("Please provide a valid email address");
      }

      // Check if user exists
      const user = await prisma.user.findFirst({
        where: { email },
        select: { id: true, email: true, name: true, isActive: true },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        console.log(
          `Password reset requested for non-existent email: ${email}`
        );
        return {
          success: true,
          message:
            "If an account with that email exists, a password reset link has been sent",
        };
      }

      if (!user.isActive) {
        throw new ValidationError(
          "Please verify your email address before resetting your password"
        );
      }

      // Send password reset email
      const resetToken = await this.sendPasswordResetEmail(
        email,
        user.name || "Student"
      );

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "PASSWORD_RESET_REQUESTED",
          resourceType: "USER",
          resourceId: user.id,
          ipAddress: "password_reset_system",
          userAgent: "password_reset",
        },
      });

      return {
        success: true,
        message: "Password reset link has been sent to your email",
        token: resetToken,
      };
    } catch (error) {
      console.error("Password reset request error:", error);

      if (error instanceof StudentRegistrationError) {
        throw error;
      }

      throw new StudentRegistrationError(
        "Failed to process password reset request"
      );
    }
  }

  /**
   * Resends verification email
   */
  static async resendVerificationEmail(email: string): Promise<string> {
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

    // Create audit log for resend request
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "RESEND_VERIFICATION_REQUESTED",
        resourceType: "USER",
        resourceId: user.id,
        ipAddress: "email_verification",
        userAgent: "email_verification",
      },
    });

    return await this.sendVerificationEmail(
      user.email,
      user.id,
      user.name || "Student"
    );
  }

  /**
   * Verify password for authentication (used by auth system)
   */
  static async verifyPasswordForAuth(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return verifyPassword(password, hashedPassword);
  }

  /**
   * Check if password needs rehashing
   */
  static async needsPasswordRehash(hashedPassword: string): Promise<boolean> {
    return PasswordSecurity.needsRehash(hashedPassword);
  }

  /**
   * Generate a secure password
   */
  static generateSecurePassword(length: number = 16): string {
    return PasswordSecurity.generateSecurePassword(length);
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
