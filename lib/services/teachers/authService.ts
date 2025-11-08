import { prisma } from "@/lib/server/prisma";
import { hash, compare } from "bcryptjs";
import { JWTUtils } from "@/lib/server/jwt";
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
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  };
  teacher: {
    id: string;
    employeeId: string;
    department: string;
  };
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
  teacher?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    employeeId: string;
    user: {
      id: string;
      role: string;
      isActive: boolean;
    };
  };
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
   * Generate a search hash for a field
   */
  static generateSearchHash(value: string): string {
    return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
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
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("ENCRYPTION_KEY environment variable is not set.");
    }
    const timestamp = Date.now().toString();
    return crypto
      .createHash("sha256")
      .update(timestamp + encryptionKey)
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
// TEACHER AUTH SERVICE CLASS
// ===========================================================

export class TeacherAuthService {
  /**
   * Verifies if a teacher identified by identifier is already registered.
   */
  static async verifyTeacher(identifier: string): Promise<VerificationResult> {
    if (!identifier || identifier.trim() === "") {
      throw new ValidationError("Identifier is required");
    }

    // Generate search hash for the identifier
    const searchHash = SecurityUtils.generateSearchHash(identifier);

    // Check if teacher is already registered using search hash
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { employeeIdSearchHash: searchHash },
          { emailSearchHash: searchHash },
          { phoneSearchHash: searchHash }
        ],
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
      // Generate search hash for the identifier
      const searchHash = SecurityUtils.generateSearchHash(identifier);
      
      const teacherRecord = await prisma.teacher.findFirst({
        where: {
          OR: [
            { employeeIdSearchHash: searchHash },
            { emailSearchHash: searchHash },
            { phoneSearchHash: searchHash }
          ],
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

    // Format employee ID
    const formattedEmployeeId = CaseFormattingUtils.formatUpperCase(employeeId);

    // Protect sensitive data
    const [
      protectedEmail,
      protectedPhone,
      protectedEmployeeId,
      protectedFirstName,
      protectedLastName,
      protectedOtherName,
    ] = await Promise.all([
      protectData(formattedTeacherData.email, "email"),
      protectData(formattedTeacherData.phone, "phone"),
      protectData(formattedEmployeeId, "nin"),
      protectData(formattedTeacherData.firstName, "name"),
      protectData(formattedTeacherData.lastName, "name"),
      protectData(formattedTeacherData.otherName || "", "name"),
    ]);

    // Hash password using bcrypt
    const passwordHash = await hash(password, 12);

    // Generate search hashes
    const emailSearchHash = SecurityUtils.generateSearchHash(formattedTeacherData.email);
    const phoneSearchHash = SecurityUtils.generateSearchHash(formattedTeacherData.phone);
    const employeeIdSearchHash = SecurityUtils.generateSearchHash(formattedEmployeeId);

    // Check if teacher already exists using search hashes
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { employeeIdSearchHash: employeeIdSearchHash },
          { emailSearchHash: emailSearchHash },
          { phoneSearchHash: phoneSearchHash },
        ],
      },
    });

    if (existingTeacher) {
      throw new TeacherAlreadyExistsError(
        "Teacher already registered with this employee ID, email, or phone"
      );
    }

    // Check if user already exists using email search hash
    const existingUser = await prisma.user.findFirst({
      where: {
        email: formattedTeacherData.email.toLowerCase().trim(),
      },
    });

    if (existingUser) {
      throw new TeacherAlreadyExistsError(
        "User already exists with this email"
      );
    }

    let user: any;
    let teacher: any;
    let emailSent = false;

    try {
      // Database transaction
      const result = await prisma.$transaction(
        async (tx) => {
          // Create user with formatted name
          const newUser = await tx.user.create({
            data: {
              name: `${formattedTeacherData.firstName} ${formattedTeacherData.lastName}`.trim(),
              email: formattedTeacherData.email.toLowerCase().trim(),
              role: "TEACHER",
              isActive: false, // Requires admin approval
              passwordHash: passwordHash, // Use bcrypt hash directly
              failedLoginAttempts: 0,
              accountLocked: false,
              loginCount: 0,
            },
          });

          // Create teacher record
          const newTeacher = await tx.teacher.create({
            data: {
              employeeId: formattedEmployeeId,
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
              emailSearchHash: emailSearchHash,
              phoneSearchHash: phoneSearchHash,
              employeeIdSearchHash: employeeIdSearchHash,
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
      await this.sendVerificationEmail(
        formattedTeacherData.email,
        user.id,
        formattedTeacherData.firstName
      );
      emailSent = true;
      console.log("✅ Verification email process completed");
    } catch (emailError) {
      console.error("❌ Failed to send verification email:", emailError);
      
      // Mark user as needing email verification
      try {
        // If you want to track email verification status, add a valid field to your User model in Prisma schema (e.g., emailVerificationRequired)
        // For now, just update a known field or skip this update if no such field exists
        // Example: Uncomment and use if you have 'emailVerificationRequired' in your schema
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerificationRequired: true },
        });

        // If no such field exists, you can safely remove this update
      } catch (updateError) {
        console.error("❌ Failed to mark user for email verification:", updateError);
      }
    }

    // Create audit log OUTSIDE transaction
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "TEACHER_REGISTERED",
          resourceType: "TEACHER",
          resourceId: teacher.id,
          details: {
            employeeId: formattedEmployeeId,
            department: formattedTeacherData.department,
            qualification: formattedTeacherData.qualification,
            gender: normalizedGender,
            emailSent: emailSent,
          },
          ipAddress: "registration_system",
          userAgent: "teacher_registration",
        },
      });
    } catch (auditError) {
      console.error("❌ Failed to create audit log:", auditError);
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      teacher: {
        id: teacher.id,
        employeeId: teacher.employeeId,
        department: teacher.department,
      },
      requiresVerification: true,
      isNewTeacher: true,
    };
  }

  /**
   * Teacher login
   */
  static async login(loginData: TeacherLoginData): Promise<AuthResponse> {
    try {
      // Generate email search hash for lookup
      const emailSearchHash = SecurityUtils.generateSearchHash(loginData.email);
      
      // Find teacher with user relation using email search hash
      const teacher = await prisma.teacher.findFirst({
        where: { emailSearchHash: emailSearchHash },
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

      // Decrypt email to verify it matches (prevents hash collision issues)
      const decryptedEmail = await unprotectData(teacher.email, "email");
      if (decryptedEmail.toLowerCase() !== loginData.email.toLowerCase().trim()) {
        await this.recordFailedLogin(loginData.email, loginData.ipAddress, teacher.user.id);
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

      // Verify password using bcrypt
      const isValidPassword = await compare(loginData.password, teacher.user.passwordHash!);

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

      // Decrypt teacher data for response
      const decryptedFirstName = await unprotectData(teacher.firstName, "name");
      const decryptedLastName = await unprotectData(teacher.lastName, "name");

      // Generate JWT token
      const token = await JWTUtils.generateAuthToken({
        userId: teacher.user.id,
        email: decryptedEmail,
        schoolId: teacher.id,
        role: "TEACHER",
        schoolNumber: teacher.employeeId,
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
          firstName: decryptedFirstName,
          lastName: decryptedLastName,
          email: decryptedEmail,
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


  static async getCurrentUser() {
  try {
    // Get the token from cookies or local storage
    // This implementation assumes you're storing the JWT in a cookie named 'auth-token'
    // You might need to adjust this based on your actual token storage strategy
    
    // For client-side usage:
    const token = this.getTokenFromStorage();
    
    if (!token) {
      return null;
    }
    
    // Verify the token
    const decodedToken = await JWTUtils.verifyAuthToken(token);
    
    if (!decodedToken || !decodedToken.userId) {
      return null;
    }
    
    // Fetch the user from the database
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
      },
    });
    
    if (!user || !user.isActive) {
      return null;
    }
    
    // If the user is a teacher, fetch teacher-specific data
    if (user.role === "TEACHER") {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          employeeId: true,
          department: true,
        },
      });
      
      return {
        ...user,
        teacherId: teacher?.id,
        employeeId: teacher?.employeeId,
        department: teacher?.department,
      };
    }
    
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Get token from storage (client-side)
 */
private static getTokenFromStorage(): string | null {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    return null;
  }
  
  // Try to get token from localStorage
  let token = localStorage.getItem("auth-token");
  
  // If not in localStorage, try cookies
  if (!token) {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "auth-token") {
        token = value;
        break;
      }
    }
  }
  
  return token;
}

/**
 * Clear authentication token (for logout)
 */
static clearAuthToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  
  // Remove from localStorage
  localStorage.removeItem("auth-token");
  
  // Remove from cookies
  document.cookie = "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
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

    // Generate verification code using nanoid
    const verificationCode = SecurityUtils.generateVerificationCode(48);

    try {
      // Store verification token
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token: verificationCode,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // Use the base URL utility
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
    // Use bcrypt's compare function to securely check the password
    return compare(password, hashedPassword);
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
        reason: "Identifier is required",
      };
    }

    try {
      // Generate search hash for the identifier
      const searchHash = SecurityUtils.generateSearchHash(identifier);
      
      const existingTeacher = await prisma.teacher.findFirst({
        where: {
          OR: [
            { employeeIdSearchHash: searchHash },
            { emailSearchHash: searchHash },
            { phoneSearchHash: searchHash }
          ],
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
      throw new ValidationError("Identifier is required");
    }

    return this.loadTeacherData(identifier);
  }

  static async teacherRecordExists(identifier: string): Promise<boolean> {
    if (!identifier || identifier.trim() === "") {
      return false;
    }

    // Generate search hash for the identifier
    const searchHash = SecurityUtils.generateSearchHash(identifier);
    
    const teacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { employeeIdSearchHash: searchHash },
          { emailSearchHash: searchHash },
          { phoneSearchHash: searchHash }
        ],
      },
    });

    return !!teacher;
  }
}

