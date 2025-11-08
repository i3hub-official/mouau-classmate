import { prisma } from "@/lib/server/prisma";
import { hash, compare } from "bcryptjs";
// Removed: import { sign } from "jsonwebtoken";
import { JWTUtils } from "@/lib/server/jwt"; // Added: Import your custom JWT implementation
import {
  protectData,
  unprotectData,
  verifyPassword,
  validatePasswordStrength,
  PasswordSecurity,
} from "@/lib/security/dataProtection";
import { emailService } from "@/lib/services/students/emailService";
import { nanoid } from "nanoid";
import * as crypto from "crypto";

// ===========================================================
// CUSTOM ERRORS
// ===========================================================

export class TeacherRegistrationError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = "TeacherRegistrationError";
  }
}

export class ValidationError extends TeacherRegistrationError {
  constructor(message: string, details?: any) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class TeacherAlreadyExistsError extends TeacherRegistrationError {
  constructor(message: string, details?: any) {
    super(message, "TEACHER_ALREADY_EXISTS", details);
    this.name = "TeacherAlreadyExistsError";
  }
}

export class AuthenticationError extends TeacherRegistrationError {
  constructor(message: string, details?: any) {
    super(message, "AUTHENTICATION_ERROR", details);
    this.name = "AuthenticationError";
  }
}

// ===========================================================
// INTERFACES
// ===========================================================

export interface TeacherVerificationData {
  firstName: string;
  lastName: string;
  otherName?: string;
  gender: string;
  employeeId: string;
  department: string;
  qualification: string;
  specialization: string;
  institution: string;
  experience: string;
  email: string;
  phone: string;
  photo?: string;
  userId?: string;
}

export interface RegistrationRequest {
  employeeId: string;
  teacherData: TeacherVerificationData;
  password: string;
}

export interface VerificationResult {
  exists: boolean;
  data?: TeacherVerificationData;
  requiresManualEntry?: boolean;
}

export interface RegistrationResult {
  user: any;
  teacher: any;
  requiresVerification: boolean;
  isNewTeacher: boolean;
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

export interface TeacherLoginData {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  teacher?: any;
  token?: string;
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
   * Format name fields to sentence case
   */
  static formatNameField(name: string): string {
    if (!name || name.trim() === "") return name;
    return this.toSentenceCase(name.trim());
  }

  /**
   * Format department and qualification to sentence case
   */
  static formatDepartmentQualification(field: string): string {
    if (!field || field.trim() === "") return field;
    return this.toSentenceCase(field.trim());
  }

  /**
   * Format employee ID to uppercase
   */
  static formatUpperCase(field: string): string {
    if (!field || field.trim() === "") return field;
    return field.trim().toUpperCase();
  }

  /**
   * Format gender to uppercase
   */
  static formatGender(field: string): string {
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
    const upperGender = CaseFormattingUtils.formatGender(gender);
    if (
      upperGender === "MALE" ||
      upperGender === "FEMALE" ||
      upperGender === "OTHER"
    ) {
      return upperGender as "MALE" | "FEMALE" | "OTHER";
    }
    return "OTHER";
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
    if (process.env.NODE_ENV === "development") {
      return process.env.NEXT_BASE_URL || "https://192.168.0.105:3002";
    }
    return process.env.NEXT_PUBLIC_APP_URL || "https://mouaucm.vercel.app";
  }
}

// ===========================================================
// TEACHER REGISTRATION SERVICE CLASS
// ===========================================================

export class TeacherAuthService {
  /**
   * Verifies if a teacher identified by employeeId is already registered.
   * Wrapper for TeacherRegistrationService.verifyTeacher
   */
  static async verifyTeacher(identifier: string): Promise<VerificationResult> {
    return TeacherRegistrationService.verifyTeacher(identifier);
  }
}

export class TeacherRegistrationService {
  /**
   * Verifies if a teacher identified by employeeId is already registered.
   */
  static async verifyTeacher(identifier: string): Promise<VerificationResult> {
    if (!identifier || identifier.trim() === "") {
      throw new ValidationError("Employee ID is required");
    }

    // Check if teacher is already registered
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        OR: [{ employeeId: identifier }, { email: identifier }],
      },
      include: {
        user: true,
      },
    });

    if (existingTeacher && existingTeacher.userId) {
      throw new TeacherAlreadyExistsError(
        "Teacher already registered. Please sign in instead."
      );
    }

    const teacherData = await this.loadTeacherData(identifier);

    if (teacherData) {
      return {
        exists: true,
        data: teacherData,
        requiresManualEntry: false,
      };
    }

    return {
      exists: false,
      requiresManualEntry: true,
    };
  }

  /**
   * Load and decrypt existing teacher data from database record.
   */
  public static async loadTeacherData(
    identifier: string
  ): Promise<TeacherVerificationData | null> {
    try {
      const teacherRecord = await prisma.teacher.findFirst({
        where: {
          OR: [{ employeeId: identifier }, { email: identifier }],
        },
      });

      if (!teacherRecord) {
        return null;
      }

      // Decrypt protected fields
      const [
        decryptedEmail,
        decryptedPhone,
        decryptedEmployeeId,
        decryptedFirstName,
        decryptedLastName,
        decryptedOtherName,
      ] = await Promise.all([
        unprotectData(teacherRecord.email, "email"),
        unprotectData(teacherRecord.phone, "phone"),
        unprotectData(teacherRecord.employeeId, "nin"),
        unprotectData(teacherRecord.firstName, "name"),
        unprotectData(teacherRecord.lastName, "name"),
        unprotectData(teacherRecord.otherName || "", "name"),
      ]);

      // Apply case formatting to the decrypted data
      return {
        firstName: CaseFormattingUtils.formatNameField(decryptedFirstName),
        lastName: CaseFormattingUtils.formatNameField(decryptedLastName),
        otherName: decryptedOtherName
          ? CaseFormattingUtils.formatNameField(decryptedOtherName)
          : undefined,
        gender: teacherRecord.gender || "",
        employeeId: decryptedEmployeeId,
        department: teacherRecord.department,
        qualification: teacherRecord.qualification || "",
        specialization: teacherRecord.specialization || "",
        institution: teacherRecord.institution || "",
        experience: teacherRecord.experience || "",
        photo: teacherRecord.photo || undefined,
        email: decryptedEmail,
        phone: decryptedPhone,
        userId: teacherRecord.userId,
      };
    } catch (error) {
      console.error("Error loading and decrypting teacher data:", error);
      return null;
    }
  }

  /**
   * Registers a teacher by creating a new User and associating it with a new Teacher record.
   */
  static async registerTeacher(
    request: RegistrationRequest
  ): Promise<RegistrationResult> {
    const { employeeId, teacherData, password } = request;

    // Validate required fields
    const requiredFields = ["employeeId", "email"];
    const validation = ValidationUtils.validateRequiredFields(
      { employeeId, email: teacherData.email },
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
    if (!ValidationUtils.validateEmail(teacherData.email)) {
      throw new ValidationError("Please provide a valid email address");
    }

    // Apply case formatting to the teacher data
    const formattedTeacherData = {
      ...teacherData,
      firstName: CaseFormattingUtils.formatNameField(teacherData.firstName),
      lastName: CaseFormattingUtils.formatNameField(teacherData.lastName),
      otherName: teacherData.otherName
        ? CaseFormattingUtils.formatNameField(teacherData.otherName)
        : undefined,
      gender: CaseFormattingUtils.formatGender(teacherData.gender),
      department: CaseFormattingUtils.formatDepartmentQualification(
        teacherData.department
      ),
      qualification: CaseFormattingUtils.formatDepartmentQualification(
        teacherData.qualification
      ),
      specialization: CaseFormattingUtils.formatDepartmentQualification(
        teacherData.specialization
      ),
    };

    // Normalize gender
    const normalizedGender = ValidationUtils.normalizeGender(
      formattedTeacherData.gender
    );

    // Protect sensitive data
    const [
      protectedEmail,
      protectedPhone,
      protectedEmployeeId,
      protectedFirstName,
      protectedLastName,
      protectedOtherName,
      hashedPassword,
    ] = await Promise.all([
      protectData(formattedTeacherData.email, "email"),
      protectData(formattedTeacherData.phone, "phone"),
      protectData(employeeId, "nin"),
      protectData(formattedTeacherData.firstName, "name"),
      protectData(formattedTeacherData.lastName, "name"),
      protectData(formattedTeacherData.otherName || "", "name"),
      protectData(password, "password"),
    ]);

    // Check if teacher already exists
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { employeeId: employeeId },
          { email: formattedTeacherData.email },
          { phone: formattedTeacherData.phone },
        ],
      },
    });

    if (existingTeacher) {
      throw new TeacherAlreadyExistsError(
        "Teacher already registered with this employee ID, email, or phone"
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: formattedTeacherData.email,
      },
    });

    if (existingUser) {
      throw new TeacherAlreadyExistsError(
        "User already exists with this email"
      );
    }

    let user: any;
    let teacher: any;

    try {
      // Database transaction
      const result = await prisma.$transaction(
        async (tx) => {
          // Create user with formatted name
          const newUser = await tx.user.create({
            data: {
              name: `${formattedTeacherData.firstName} ${formattedTeacherData.lastName}`.trim(),
              email: formattedTeacherData.email,
              role: "TEACHER",
              isActive: false, // Requires admin approval
              passwordHash: hashedPassword.encrypted,
              failedLoginAttempts: 0,
              accountLocked: false,
              loginCount: 0,
            },
          });

          // Create teacher record
          const newTeacher = await tx.teacher.create({
            data: {
              employeeId: CaseFormattingUtils.formatUpperCase(employeeId),
              firstName: protectedFirstName.encrypted,
              lastName: protectedLastName.encrypted,
              otherName: protectedOtherName.encrypted,
              gender: normalizedGender,
              phone: protectedPhone.encrypted,
              email: protectedEmail.encrypted,
              department: formattedTeacherData.department,
              qualification: formattedTeacherData.qualification,
              specialization: formattedTeacherData.specialization,
              institution: formattedTeacherData.institution,
              experience: formattedTeacherData.experience,
              photo: formattedTeacherData.photo,
              userId: newUser.id,
              emailSearchHash: protectedEmail.searchHash,
              phoneSearchHash: protectedPhone.searchHash,
              employeeIdSearchHash: protectedEmployeeId.searchHash,
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

          return { user: newUser, teacher: newTeacher };
        },
        {
          maxWait: 10000,
          timeout: 10000,
        }
      );

      user = result.user;
      teacher = result.teacher;
    } catch (error) {
      console.error("❌ Error during teacher registration transaction:", error);

      if (error instanceof TeacherRegistrationError) {
        throw error;
      }

      if (error instanceof Error && "code" in error && error.code === "P2002") {
        throw new TeacherAlreadyExistsError(
          "Teacher record already exists with this employee ID, email, or phone"
        );
      }

      throw new TeacherRegistrationError(
        "Failed to complete teacher registration"
      );
    }

    // Send verification email OUTSIDE transaction
    try {
      const verificationToken = await this.sendVerificationEmail(
        formattedTeacherData.email,
        user.id,
        formattedTeacherData.firstName
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
          action: "LECTURE_CREATED",
          resourceType: "TEACHER",
          resourceId: teacher.id,
          details: {
            employeeId,
            department: formattedTeacherData.department,
            qualification: formattedTeacherData.qualification,
            gender: normalizedGender,
            emailSent: true,
            verificationTokenGenerated: true,
          },
          ipAddress: "registration_system",
          userAgent: "teacher_registration",
        },
      });
    } catch (auditError) {
      console.error("❌ Failed to create audit log:", auditError);
    }

    return {
      user,
      teacher,
      requiresVerification: true,
      isNewTeacher: true,
    };
  }

  /**
   * Teacher login
   */
  static async login(loginData: TeacherLoginData): Promise<AuthResponse> {
    try {
      // Find teacher with user relation
      const teacher = await prisma.teacher.findUnique({
        where: { email: loginData.email },
        include: {
          user: true,
        },
      });

      if (!teacher) {
        await this.recordFailedLogin(loginData.email, loginData.ipAddress);
        return {
          success: false,
          message: "Invalid email or password",
        };
      }

      // Check if account is active
      if (!teacher.user.isActive) {
        return {
          success: false,
          message: "Account pending approval. Please contact administrator.",
        };
      }

      // Check if account is locked
      if (
        teacher.user.accountLocked &&
        teacher.user.lockedUntil !== null &&
        teacher.user.lockedUntil > new Date()
      ) {
        return {
          success: false,
          message: "Account temporarily locked due to multiple failed attempts",
        };
      }

      // Verify password
      const isValidPassword = await this.verifyPasswordForAuth(
        loginData.password,
        teacher.user.passwordHash!
      );

      if (!isValidPassword) {
        await this.recordFailedLogin(
          loginData.email,
          loginData.ipAddress,
          teacher.user.id
        );
        return {
          success: false,
          message: "Invalid email or password",
        };
      }

      // Reset failed login attempts on successful login
      await prisma.user.update({
        where: { id: teacher.user.id },
        data: {
          failedLoginAttempts: 0,
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
          accountLocked: false,
          lockedUntil: null,
        },
      });

      // Replace jsonwebtoken with custom JWT implementation
      const token = await JWTUtils.generateAuthToken({
        userId: teacher.user.id,
        email: teacher.email,
        schoolId: teacher.id, // Using teacher.id as schoolId since there's no explicit schoolId in the teacher model
        role: "TEACHER",
        schoolNumber: teacher.employeeId, // Using employeeId as schoolNumber
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: teacher.user.id,
          action: "USER_LOGGED_IN",
          resourceType: "TEACHER",
          resourceId: teacher.id,
          ipAddress: loginData.ipAddress,
          userAgent: loginData.userAgent,
          details: {
            type: "teacher_login",
            employeeId: teacher.employeeId,
          },
        },
      });

      return {
        success: true,
        message: "Login successful",
        teacher: {
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          email: teacher.email,
          department: teacher.department,
          employeeId: teacher.employeeId,
          user: {
            id: teacher.user.id,
            role: teacher.user.role,
            isActive: teacher.user.isActive,
          },
        },
        token,
      };
    } catch (error) {
      console.error("Teacher login error:", error);
      return {
        success: false,
        message: "Login failed. Please try again.",
      };
    }
  }

  /**
   * Record failed login attempt
   */
  private static async recordFailedLogin(
    email: string,
    ipAddress?: string,
    userId?: string
  ) {
    try {
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (user) {
          const failedAttempts = user.failedLoginAttempts + 1;
          let accountLocked = user.accountLocked;
          let lockedUntil = user.lockedUntil;

          // Lock account after 5 failed attempts for 30 minutes
          if (failedAttempts >= 5) {
            accountLocked = true;
            lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
          }

          await prisma.user.update({
            where: { id: userId },
            data: {
              failedLoginAttempts: failedAttempts,
              lastFailedLoginAt: new Date(),
              accountLocked,
              lockedUntil,
            },
          });

          // Create security event for multiple failed attempts
          if (failedAttempts >= 3) {
            await prisma.securityEvent.create({
              data: {
                userId,
                eventType: "multiple_failed_attempts",
                severity: failedAttempts >= 5 ? "high" : "medium",
                description: `Multiple failed login attempts (${failedAttempts})`,
                ipAddress,
                metadata: {
                  email,
                  failedAttempts,
                  timestamp: new Date().toISOString(),
                },
              },
            });
          }
        }
      }

      // Audit log for failed login
      await prisma.auditLog.create({
        data: {
          userId: userId || null,
          action: "USER_LOGIN_FAILED",
          resourceType: "USER",
          ipAddress,
          details: {
            email,
            reason: "invalid_credentials",
          },
        },
      });
    } catch (error) {
      console.error("Error recording failed login:", error);
    }
  }

  /**
   * Teacher logout
   */
  static async logout(
    userId: string,
    sessionToken?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Invalidate session if token provided
      if (sessionToken) {
        await prisma.session.deleteMany({
          where: {
            sessionToken,
            userId,
          },
        });
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: "USER_LOGGED_OUT",
          resourceType: "TEACHER",
          details: {
            type: "teacher_logout",
            sessionInvalidated: !!sessionToken,
          },
        },
      });

      return {
        success: true,
        message: "Logout successful",
      };
    } catch (error) {
      console.error("Teacher logout error:", error);
      return {
        success: false,
        message: "Logout failed",
      };
    }
  }

  /**
   * Get teacher by ID
   */
  static async getTeacherById(teacherId: string) {
    return await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        instructedCourses: {
          include: {
            enrollments: {
              include: {
                student: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        email: true,
                        isActive: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        createdCourses: true,
        assignments: {
          include: {
            course: true,
            submissions: {
              include: {
                student: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get teacher by user ID
   */
  static async getTeacherByUserId(userId: string) {
    return await prisma.teacher.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
      },
    });
  }

  /**
   * Generates and stores a verification token and sends verification email.
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

    // Generate NEW verification code using nanoid
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
        subject: "Verify Your MOUAU ClassMate Teacher Account",
        template: "email-verification",
        context: {
          name: name.trim(),
          verificationLink: verificationLink,
          baseUrl: baseUrl,
          userType: "teacher",
        },
      });

      if (!emailSent) {
        console.error("❌ Email service failed to send verification email");

        await prisma.verificationToken.deleteMany({
          where: { identifier: email },
        });

        throw new TeacherRegistrationError("Failed to send verification email");
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

      if (error instanceof TeacherRegistrationError) {
        throw error;
      }

      throw new TeacherRegistrationError("Failed to send verification email");
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
        subject: "Welcome to MOUAU ClassMate - Teacher Portal!",
        template: "welcome-teacher",
        context: {
          name: name.trim(),
          loginLink: loginLink,
          userType: "teacher",
        },
      });

      return emailSent;
    } catch (error) {
      console.error("❌ Error sending welcome email:", error);
      return false;
    }
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
  static async canRegisterTeacher(identifier: string): Promise<{
    canRegister: boolean;
    reason?: string;
    existingTeacher?: any;
  }> {
    if (!identifier || identifier.trim() === "") {
      return {
        canRegister: false,
        reason: "Employee ID is required",
      };
    }

    try {
      const existingTeacher = await prisma.teacher.findFirst({
        where: {
          OR: [{ employeeId: identifier }, { email: identifier }],
        },
        include: {
          user: true,
        },
      });

      if (existingTeacher) {
        return {
          canRegister: false,
          reason: "Teacher already registered",
          existingTeacher,
        };
      }

      return {
        canRegister: true,
      };
    } catch (error) {
      console.error("Error checking teacher registration eligibility:", error);
      return {
        canRegister: false,
        reason: "System error. Please try again.",
      };
    }
  }

  static async getTeacherData(
    identifier: string
  ): Promise<TeacherVerificationData | null> {
    if (!identifier || identifier.trim() === "") {
      throw new ValidationError("Employee ID is required");
    }

    return this.loadTeacherData(identifier);
  }

  static async teacherRecordExists(identifier: string): Promise<boolean> {
    if (!identifier || identifier.trim() === "") {
      return false;
    }

    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [{ employeeId: identifier }, { email: identifier }],
      },
    });

    return !!teacher;
  }
}
