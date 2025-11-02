import { prisma } from "@/lib/server/prisma";
import {
  protectData,
  unprotectData,
  hashData,
} from "@/lib/security/dataProtection";
import * as crypto from "crypto";
import { emailService } from "@/lib/services/emailService";

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

    // Add more password strength checks as needed
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

      // Decrypt protected fields (excluding gender and maritalStatus)
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
        gender: studentRecord.gender || "", // Not encrypted
        jambReg: decryptedJambReg,
        photo: studentRecord.passportUrl || undefined,
        college: studentRecord.college,
        department: studentRecord.department,
        course: studentRecord.course,
        state: decryptedState,
        lga: decryptedLga,
        maritalStatus: studentRecord.maritalStatus || "", // Not encrypted
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

    // Normalize gender and marital status to uppercase
    const normalizedGender = ValidationUtils.normalizeGender(
      studentData.gender
    );
    const normalizedMaritalStatus = ValidationUtils.normalizeMaritalStatus(
      studentData.maritalStatus
    );

    // Protect sensitive data (excluding gender and maritalStatus)
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

    // Check if student already exists with any unique identifier
    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [
          { matricNumber: matricNumber },
          { jambRegNumber: jambReg },
          { email: studentData.email },
          { phone: studentData.phone },
        ],
      },
    });

    if (existingStudent) {
      throw new StudentAlreadyExistsError(
        "Student already registered with this matric number, JAMB registration, email, or phone"
      );
    }

    // Check if user already exists with this email
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
      // Use transaction with increased timeout for database operations only
      const result = await prisma.$transaction(
        async (tx) => {
          // Create user
          const newUser = await tx.user.create({
            data: {
              name: `${studentData.surname} ${studentData.firstName}`.trim(),
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

          // Create new student record with required userId
          const newStudent = await tx.student.create({
            data: {
              matricNumber: matricNumber,
              jambRegNumber: protectedJambReg.encrypted,
              nin: protectedNin.encrypted,
              firstName: protectedFirstName.encrypted,
              lastName: protectedSurname.encrypted,
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

          // Create account (for NextAuth)
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
          // Increase transaction timeout to 10 seconds
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

      // Handle Prisma unique constraint errors
      if (error instanceof Error && "code" in error && error.code === "P2002") {
        throw new StudentAlreadyExistsError(
          "Student record already exists with this matric number, JAMB registration, email, or phone"
        );
      }

      throw new StudentRegistrationError(
        "Failed to complete student registration"
      );
    }

    // Send verification email OUTSIDE the transaction
    try {
      const verificationToken = await this.sendVerificationEmail(
        studentData.email,
        user.id,
        `${studentData.firstName} ${studentData.surname}`.trim()
      );

      console.log("✅ Verification email process completed with NEW token");
    } catch (emailError) {
      console.error("❌ Failed to send verification email:", emailError);
      // Don't throw here - the user is already created, just log the error
      // The user can request a new verification email later
    }

    // Create audit log OUTSIDE the transaction
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
      // Don't throw - audit log failure shouldn't break registration
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
   * Uses secure approach without sensitive data in URL parameters.
   */
  static async sendVerificationEmail(
    email: string,
    userId: string,
    name: string
  ): Promise<string> {
    // Enhanced validation with detailed logging
    console.log("📧 sendVerificationEmail called with:", {
      email: email || "UNDEFINED",
      userId: userId || "UNDEFINED",
      name: name || "UNDEFINED",
    });

    if (!email || !userId || !name) {
      console.error("❌ Missing required parameters for verification email:", {
        email: email ? "PRESENT" : "MISSING",
        userId: userId ? "PRESENT" : "MISSING",
        name: name ? "PRESENT" : "MISSING",
      });
      throw new ValidationError("Email, userId, and name are required");
    }

    // Validate email format
    if (!ValidationUtils.validateEmail(email)) {
      throw new ValidationError("Invalid email format");
    }

    // Validate name is not just whitespace
    if (name.trim().length === 0) {
      throw new ValidationError("Name cannot be empty");
    }

    // SECURITY FIX: Always delete any existing tokens for this email first
    // This prevents token reuse and ensures only one valid token exists at a time
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    console.log("🔒 Deleted any existing verification tokens for:", email);

    // Generate NEW verification token (never reuse)
    const verificationToken = crypto.randomBytes(32).toString("hex");

    console.log("🔐 Generated new verification token for security");

    try {
      // Store NEW verification token in database
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token: verificationToken,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // SECURITY FIX: Use base URL without token in parameters
      const baseUrl = (
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3002"
      ).replace(/\/$/, "");

      console.log(`🔗 Preparing secure verification email for ${email}`);

      // Use the updated email template with form submission
      const emailSent = await emailService.sendEmail({
        to: email,
        subject: "Verify Your MOUAU ClassMate Account",
        template: "email-verification",
        context: {
          name: name.trim(),
          baseUrl: baseUrl,
          verificationToken: verificationToken, // For form submission
          // Note: No verificationLink with token in URL to avoid threat detection
        },
      });

      if (!emailSent) {
        console.error(
          "❌ Email service failed to send verification email to:",
          email
        );

        // Clean up the token if email sending fails
        await prisma.verificationToken.deleteMany({
          where: { identifier: email },
        });

        throw new StudentRegistrationError("Failed to send verification email");
      }

      console.log(`✅ Verification email successfully sent to: ${email}`);
      console.log(`📝 Email details:`, {
        recipient: email,
        name: name,
        userId: userId,
        token: "NEW_TOKEN_GENERATED", // Don't log actual token
        method: "SECURE_FORM_SUBMISSION", // Indicates no URL parameters used
      });

      return verificationToken;
    } catch (error) {
      console.error("❌ Error in sendVerificationEmail:", error);

      // Ensure cleanup on any error
      try {
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

      // Re-throw the original error
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
      console.error("❌ Missing required parameters for welcome email:", {
        email: email ? "PRESENT" : "MISSING",
        name: name ? "PRESENT" : "MISSING",
      });
      return false;
    }

    try {
      // Fix: Use fallback for NEXT_PUBLIC_BASE_URL
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3002";
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
        console.log(`📝 Welcome email details:`, {
          recipient: email,
          name: name,
        });
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
   * Verifies an email using the provided token, activates the user, and sends welcome email.
   */
  static async verifyEmail(
    token: string
  ): Promise<{ success: boolean; user: any }> {
    if (!token) {
      throw new ValidationError("Verification token is required");
    }

    try {
      const verificationToken = await prisma.verificationToken.findFirst({
        where: {
          token,
          expires: {
            gt: new Date(),
          },
        },
      });

      if (!verificationToken) {
        throw new ValidationError("Invalid or expired verification token");
      }

      // Find user by email
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
        where: { token },
      });

      // Send welcome email (don't throw error if this fails)
      try {
        await this.sendWelcomeEmail(user.email, user.name || "");
      } catch (welcomeError) {
        console.error(
          "⚠️ Failed to send welcome email, but user is verified:",
          welcomeError
        );
        // Don't throw - user is already verified
      }

      // Create audit log for email verification
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
   * Helper method to check if a student can be registered.
   * @param identifier - The matric number or JAMB registration number.
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

  /**
   * Method to get student data by identifier (for admin purposes).
   * @param identifier - The matric number or JAMB registration number.
   */
  static async getStudentData(
    identifier: string
  ): Promise<StudentVerificationData | null> {
    if (!identifier || identifier.trim() === "") {
      throw new ValidationError("Identifier is required");
    }

    return this.loadStudentData(identifier);
  }

  /**
   * Method to check if student record exists.
   * @param identifier - The matric number or JAMB registration number.
   */
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

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    try {
      // Find user first
      const user = await prisma.user.findFirst({ where: { email } });
      if (!user) {
        throw new ValidationError("User not found");
      }

      // Delete any existing reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Store NEW reset token in database
      await prisma.passwordResetToken.create({
        data: {
          token: resetToken,
          userId: user.id,
          expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      // Fix: Use fallback for NEXT_PUBLIC_BASE_URL
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3002";
      const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}`;

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
        // Clean up token if email fails
        await prisma.passwordResetToken.deleteMany({
          where: { userId: user.id },
        });
        throw new StudentRegistrationError(
          "Failed to send password reset email"
        );
      }

      console.log(`✅ Password reset email sent to: ${email}`);

      return resetToken;
    } catch (error) {
      console.error("Error sending password reset email:", error);

      // Clean up the token if email sending fails
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
   * Resends verification email for existing users
   */
  static async resendVerificationEmail(email: string): Promise<string> {
    if (!email) {
      throw new ValidationError("Email is required");
    }

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      throw new ValidationError("User not found");
    }

    if (user.isActive && user.emailVerified) {
      throw new ValidationError("Email is already verified");
    }

    // Use the same secure method to send verification email
    return await this.sendVerificationEmail(
      user.email,
      user.id,
      user.name || "Student"
    );
  }
}
