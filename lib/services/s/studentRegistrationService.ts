// File: lib/services/s/studentRegistrationService.ts

import { prisma } from "@/lib/server/prisma";
import { StudentRegistrationData } from "@/lib/types/s/index";
import {
  protectData,
  verifyPassword,
  validatePasswordStrength,
  generateSearchHash,
} from "@/lib/security/dataProtection";
import { generateVerificationToken } from "@/lib/utils";

export class StudentRegistrationService {
  /**
   * Register a new student
   */
  static async registerStudent(data: StudentRegistrationData) {
    const {
      firstName,
      surname,
      otherName,
      gender,
      dateOfBirth,
      maritalStatus,
      email,
      phone,
      matricNumber,
      jambRegNumber,
      nin,
      department,
      college,
      admissionYear,
      state,
      lga,
      password,
    } = data;

    // Validate required fields
    if (!email || email.trim() === "") {
      throw new Error("Email is required");
    }
    if (!phone || phone.trim() === "") {
      throw new Error("Phone number is required");
    }
    if (!password) {
      throw new Error("Password is required");
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(
        `Password validation failed: ${passwordValidation.errors.join(", ")}`
      );
    }

    try {
      // Protect all data first (do this once)
      const hashedPassword = await protectData(password, "password");
      const protectedEmail = await protectData(email.trim(), "email");
      const protectedPhone = await protectData(phone.trim(), "phone");
      const protectedJambRegNumber = jambRegNumber
        ? await protectData(jambRegNumber.trim(), "nin")
        : null;
      const protectedNin = nin ? await protectData(nin.trim(), "nin") : null;
      const protectedFirstName = await protectData(firstName.trim(), "name");
      const protectedSurname = await protectData(surname.trim(), "name");
      const protectedOtherName = otherName
        ? await protectData(otherName.trim(), "name")
        : null;
      const protectedState = state
        ? await protectData(state.trim(), "location")
        : null;
      const protectedLga = lga
        ? await protectData(lga.trim(), "location")
        : null;

      // Extract search hashes
      const emailSearchHash = protectedEmail.searchHash!;
      const phoneSearchHash = protectedPhone.searchHash!;
      const ninSearchHash = protectedNin?.searchHash || "";
      const jambSearchHash = protectedJambRegNumber?.searchHash || "";

      // Check if matric number already exists
      const existingMatric = await prisma.student.findUnique({
        where: { matricNumber },
      });

      if (existingMatric) {
        throw new Error("Matric number already exists");
      }

      // Check if email already exists in User table (deterministic encryption)
      const existingUser = await prisma.user.findFirst({
        where: { email: protectedEmail.encrypted },
      });

      if (existingUser) {
        throw new Error("Email already exists");
      }

      // Check if email already exists using search hash in Student table
      const existingStudent = await prisma.student.findFirst({
        where: { emailSearchHash },
      });

      if (existingStudent) {
        throw new Error("Email already exists");
      }

      // Check if phone already exists using search hash
      const existingPhone = await prisma.student.findFirst({
        where: { phoneSearchHash },
      });

      if (existingPhone) {
        throw new Error("Phone number already exists");
      }

      // Check if JAMB registration number already exists (only if provided)
      if (jambRegNumber && jambSearchHash) {
        const existingJamb = await prisma.student.findFirst({
          where: { jambRegSearchHash: jambSearchHash },
        });

        if (existingJamb) {
          throw new Error("JAMB registration number already exists");
        }
      }

      // Check if NIN already exists (if provided)
      if (nin && ninSearchHash) {
        const existingNin = await prisma.student.findFirst({
          where: { ninSearchHash },
        });

        if (existingNin) {
          throw new Error("NIN already exists");
        }
      }

      // Debug logs (optional, remove in production)
      if (process.env.NODE_ENV === "development") {
        console.log("=== PROTECTED DATA DEBUG ===");
        console.log("Email encrypted:", protectedEmail.encrypted);
        console.log("Email search hash:", emailSearchHash);
        console.log("Phone search hash:", phoneSearchHash);
        console.log("JAMB search hash:", jambSearchHash);
        console.log("NIN search hash:", ninSearchHash);
        console.log("=== END DEBUG ===");
      }

      // Create user account
      const user = await prisma.user.create({
        data: {
          email: protectedEmail.encrypted,
          emailVerificationRequired: true,
          role: "STUDENT",
          passwordHash: hashedPassword.encrypted,
          isActive: false, // Will be activated after email verification
        },
      });

      // Create student profile
      const student = await prisma.student.create({
        data: {
          userId: user.id,
          matricNumber,
          jambRegNumber: protectedJambRegNumber?.encrypted || "",
          nin: protectedNin?.encrypted || "",
          firstName: protectedFirstName.encrypted,
          surname: protectedSurname.encrypted,
          otherName: protectedOtherName?.encrypted || "",
          gender,
          dateOfBirth,
          maritalStatus,
          email: protectedEmail.encrypted,
          emailSearchHash,
          phone: protectedPhone.encrypted,
          phoneSearchHash,
          jambRegSearchHash: jambSearchHash,
          ninSearchHash,
          department,
          college,
          admissionYear,
          state: protectedState?.encrypted || "",
          lga: protectedLga?.encrypted || "",
        },
      });

      // Generate email verification token
      const verificationToken = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.verificationToken.create({
        data: {
          identifier: user.id,
          token: verificationToken,
          expires: expiresAt,
        },
      });

      // Log registration
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "STUDENT_REGISTERED",
          resourceType: "STUDENT",
          resourceId: student.id,
          details: {
            matricNumber,
            department,
            college,
          },
        },
      });

      return {
        success: true,
        userId: user.id,
        studentId: student.id,
        verificationToken,
        message:
          "Student registered successfully. Please check your email for verification.",
      };
    } catch (error) {
      console.error("Student registration error:", error);
      throw error;
    }
  }

  /**
   * Verify student email
   */
  static async verifyEmail(token: string) {
    try {
      const verificationToken = await prisma.verificationToken.findUnique({
        where: { token },
      });

      if (!verificationToken) {
        throw new Error("Invalid verification token");
      }

      if (verificationToken.expires < new Date()) {
        throw new Error("Verification token has expired");
      }

      // Activate user account
      await prisma.user.update({
        where: { id: verificationToken.identifier },
        data: {
          emailVerified: new Date(),
          isActive: true,
        },
      });

      // Delete verification token
      await prisma.verificationToken.delete({
        where: { token },
      });

      // Log verification
      await prisma.auditLog.create({
        data: {
          userId: verificationToken.identifier,
          action: "EMAIL_VERIFIED",
          resourceType: "USER",
          resourceId: verificationToken.identifier,
        },
      });

      return {
        success: true,
        message: "Email verified successfully. You can now log in.",
      };
    } catch (error) {
      console.error("Email verification error:", error);
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerification(email: string) {
    try {
      // Protect email to get search hash
      const protectedEmail = await protectData(email.trim(), "email");
      const emailSearchHash = protectedEmail.searchHash!;

      // Find user by email using search hash
      const student = await prisma.student.findFirst({
        where: {
          emailSearchHash,
        },
        include: {
          user: true,
        },
      });

      if (!student || !student.user) {
        throw new Error("No account found with this email");
      }

      if (student.user.emailVerified) {
        throw new Error("Email is already verified");
      }

      // Check if there's already a recent verification request
      const recentToken = await prisma.verificationToken.findFirst({
        where: {
          identifier: student.user.id,
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

      // Generate new verification token
      const verificationToken = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.verificationToken.create({
        data: {
          identifier: student.user.id,
          token: verificationToken,
          expires: expiresAt,
        },
      });

      // Log resend request
      await prisma.auditLog.create({
        data: {
          userId: student.user.id,
          action: "RESEND_VERIFICATION_REQUESTED",
          resourceType: "USER",
          resourceId: student.user.id,
        },
      });

      return {
        success: true,
        verificationToken,
        message: "Verification email sent successfully.",
      };
    } catch (error) {
      console.error("Resend verification error:", error);
      throw error;
    }
  }

  /**
   * Verify password for authentication
   */
  static async verifyPasswordForAuth(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    try {
      return await verifyPassword(password, hashedPassword);
    } catch (error) {
      console.error("Password verification error:", error);
      return false;
    }
  }
}
