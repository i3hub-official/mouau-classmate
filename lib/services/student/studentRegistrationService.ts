// lib/services/student/studentRegistrationService.ts
import { prisma } from "@/lib/server/prisma";
import { StudentRegistrationData } from "@/lib/types/student/index";
import {
  protectData,
  verifyPassword,
  validatePasswordStrength,
} from "@/lib/security/dataProtection";
import { generateVerificationToken } from "@/lib/utils";
import { AuditAction } from "@prisma/client";

export class StudentRegistrationService {
  /**
   * Register a new student
   */
  static async registerStudent(data: StudentRegistrationData) {
    const {
      firstName,
      lastName,
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
      course,
      college,
      admissionYear,
      state,
      lga,
      password,
    } = data;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(
        `Password validation failed: ${passwordValidation.errors.join(", ")}`
      );
    }

    try {
      // Check if matric number already exists
      const existingMatric = await prisma.student.findUnique({
        where: { matricNumber },
      });

      if (existingMatric) {
        throw new Error("Matric number already exists");
      }

      // Check if JAMB registration number already exists
      const existingJamb = await prisma.student.findUnique({
        where: { jambRegNumber },
      });

      if (existingJamb) {
        throw new Error("JAMB registration number already exists");
      }

      // Check if NIN already exists (if provided)
      if (nin) {
        const existingNin = await prisma.student.findUnique({
          where: { nin },
        });

        if (existingNin) {
          throw new Error("NIN already exists");
        }
      }

      // Check if email already exists
      const existingEmail = await prisma.student.findUnique({
        where: { email },
      });

      if (existingEmail) {
        throw new Error("Email already exists");
      }

      // Check if phone already exists
      const existingPhone = await prisma.student.findUnique({
        where: { phone },
      });

      if (existingPhone) {
        throw new Error("Phone number already exists");
      }

      // Hash the password
      const hashedPassword = await protectData(password, "password");

      // Protect sensitive data
      const protectedEmail = await protectData(email, "email");
      const protectedPhone = await protectData(phone, "phone");
      const protectedJambRegNumber = await protectData(jambRegNumber, "nin");
      const protectedNin = nin ? await protectData(nin, "nin") : null;
      const protectedFirstName = await protectData(firstName, "name");
      const protectedLastName = await protectData(lastName, "name");
      const protectedOtherName = otherName
        ? await protectData(otherName, "name")
        : null;
      const protectedState = await protectData(state, "location");
      const protectedLga = await protectData(lga, "location");

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
          jambRegNumber: protectedJambRegNumber.encrypted,
          nin: protectedNin?.encrypted,
          firstName: protectedFirstName.encrypted,
          lastName: protectedLastName.encrypted,
          otherName: protectedOtherName?.encrypted,
          gender,
          dateOfBirth,
          maritalStatus,
          email: protectedEmail.encrypted,
          emailSearchHash: protectedEmail.searchHash,
          phone: protectedPhone.encrypted,
          phoneSearchHash: protectedPhone.searchHash,
          jambRegSearchHash: protectedJambRegNumber.searchHash,
          ninSearchHash: protectedNin?.searchHash,
          department,
          course,
          college,
          admissionYear,
          state: protectedState.encrypted,
          lga: protectedLga.encrypted,
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

      // Log the registration
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

      // Activate the user account
      await prisma.user.update({
        where: { id: verificationToken.identifier },
        data: {
          emailVerified: new Date(),
          isActive: true,
        },
      });

      // Delete the verification token
      await prisma.verificationToken.delete({
        where: { token },
      });

      // Log the verification
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
      // Find the user by email (using search hash)
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

      // Log the resend request
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
