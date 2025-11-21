// lib/services/profileService.ts
import { prisma } from "@/lib/server/prisma";
import {
  protectData,
  unprotectData,
  verifyPassword,
  validatePasswordStrength,
} from "@/lib/security/dataProtection";
import { AuditAction } from "@prisma/client";
import {
  StudentProfile,
  ProfileUpdateData,
  ProfileResponse,
  EmailUpdateResponse,
  AccountActionResponse,
} from "@/lib/types/s/index";

// Define the missing types and interfaces

export class StudentProfileService {
  /**
   * Get student profile
   */
  static async getStudentProfile(
    userId: string
  ): Promise<StudentProfile | null> {
    try {
      const student = await prisma.student.findUnique({
        where: { userId },
        select: {
          id: true,
          matricNumber: true,
          firstName: true,
          surname: true,
          otherName: true,
          email: true,
          phone: true,
          passportUrl: true,
          department: true,
          course: true,
          college: true,
          admissionYear: true,
          gender: true,
          dateOfBirth: true,
          state: true,
          lga: true,
          isActive: true,
          dateEnrolled: true,
          createdAt: true,
          user: {
            select: {
              role: true,
              createdAt: true,
            },
          },
        },
      });

      if (!student) return null;

      // Decrypt sensitive data using new protection tiers
      const [
        decryptedEmail,
        decryptedPhone,
        decryptedFirstName,
        decryptedSurname,
        decryptedOtherName,
        decryptedState,
        decryptedLga,
      ] = await Promise.all([
        unprotectData(student.email, "email"),
        unprotectData(student.phone, "phone"),
        unprotectData(student.firstName, "name"),
        unprotectData(student.surname, "name"),
        student.otherName
          ? unprotectData(student.otherName, "name")
          : Promise.resolve(null),
        student.state
          ? unprotectData(student.state, "location")
          : Promise.resolve(""),
        student.lga
          ? unprotectData(student.lga, "location")
          : Promise.resolve(""),
      ]);

      const fullName = this.formatFullName(
        decryptedSurname,
        decryptedFirstName,
        decryptedOtherName
      );

      const profile: StudentProfile = {
        id: student.id,
        matricNumber: student.matricNumber,
        fullName,
        firstName: decryptedFirstName,
        surname: decryptedSurname,
        otherName: decryptedOtherName,
        email: decryptedEmail,
        phone: decryptedPhone,
        passportUrl: student.passportUrl,
        department: student.department,
        course: student.course,
        college: student.college,
        admissionYear: student.admissionYear,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        state: decryptedState,
        lga: decryptedLga,
        isActive: student.isActive,
        role: "STUDENT",
        createdAt: student.createdAt,
      };

      return profile;
    } catch (error) {
      console.error("Error getting student profile:", error);
      throw error;
    }
  }

  /**
   * Format full name from components
   */
  private static formatFullName(
    surname: string,
    firstName: string,
    otherName: string | null
  ): string {
    let fullName = `${surname} ${firstName}`;
    if (otherName) {
      fullName += ` ${otherName}`;
    }
    return fullName;
  }

  /**
   * Update student profile
   */
  static async updateStudentProfile(
    userId: string,
    profileData: ProfileUpdateData
  ): Promise<ProfileResponse> {
    try {
      // Get the current student data
      const currentStudent = await prisma.student.findUnique({
        where: { userId },
      });

      if (!currentStudent) {
        throw new Error("Student not found");
      }

      // Prepare update data
      const updateData: any = { updatedAt: new Date() };

      // Update fields if provided using new protection tiers
      if (profileData.firstName) {
        updateData.firstName = (
          await protectData(profileData.firstName, "name")
        ).encrypted;
      }

      if (profileData.surname) {
        updateData.surname = (
          await protectData(profileData.surname, "name")
        ).encrypted;
      }

      if (profileData.otherName !== undefined) {
        updateData.otherName = profileData.otherName
          ? (await protectData(profileData.otherName, "name")).encrypted
          : null;
      }

      if (profileData.phone) {
        const protectedPhone = await protectData(profileData.phone, "phone");
        updateData.phone = protectedPhone.encrypted;
        updateData.phoneSearchHash = protectedPhone.searchHash;
      }

      if (profileData.passportUrl !== undefined) {
        updateData.passportUrl = profileData.passportUrl;
      }

      if (profileData.state) {
        updateData.state = (
          await protectData(profileData.state, "location")
        ).encrypted;
      }

      if (profileData.lga) {
        updateData.lga = (
          await protectData(profileData.lga, "location")
        ).encrypted;
      }

      // Update the student profile
      const updatedStudent = await prisma.student.update({
        where: { userId },
        data: updateData,
        select: {
          id: true,
          matricNumber: true,
          firstName: true,
          surname: true,
          otherName: true,
          email: true,
          phone: true,
          passportUrl: true,
          department: true,
          course: true,
          college: true,
          admissionYear: true,
          gender: true,
          dateOfBirth: true,
          state: true,
          lga: true,
          isActive: true,
          dateEnrolled: true,
          createdAt: true,
          user: {
            select: {
              role: true,
              createdAt: true,
            },
          },
        },
      });

      // Decrypt sensitive data for response using new protection tiers
      const [
        decryptedEmail,
        decryptedPhone,
        decryptedFirstName,
        decryptedSurname,
        decryptedOtherName,
        decryptedState,
        decryptedLga,
      ] = await Promise.all([
        unprotectData(updatedStudent.email, "email"),
        unprotectData(updatedStudent.phone, "phone"),
        unprotectData(updatedStudent.firstName, "name"),
        unprotectData(updatedStudent.surname, "name"),
        updatedStudent.otherName
          ? unprotectData(updatedStudent.otherName, "name")
          : Promise.resolve(null),
        updatedStudent.state
          ? unprotectData(updatedStudent.state, "location")
          : Promise.resolve(""),
        updatedStudent.lga
          ? unprotectData(updatedStudent.lga, "location")
          : Promise.resolve(""),
      ]);

      const fullName = this.formatFullName(
        decryptedSurname,
        decryptedFirstName,
        decryptedOtherName
      );

      const profile: StudentProfile = {
        id: updatedStudent.id,
        matricNumber: updatedStudent.matricNumber,
        fullName,
        firstName: decryptedFirstName,
        surname: decryptedSurname,
        otherName: decryptedOtherName,
        email: decryptedEmail,
        phone: decryptedPhone,
        passportUrl: updatedStudent.passportUrl,
        department: updatedStudent.department,
        course: updatedStudent.course,
        college: updatedStudent.college,
        admissionYear: updatedStudent.admissionYear,
        gender: updatedStudent.gender,
        dateOfBirth: updatedStudent.dateOfBirth,
        state: decryptedState,
        lga: decryptedLga,
        isActive: updatedStudent.isActive,
        role: "STUDENT",
        createdAt: updatedStudent.createdAt,
      };

      // Log the profile update
      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.PROFILE_UPDATED,
          resourceType: "USER",
          resourceId: userId,
          details: {
            updatedFields: Object.keys(profileData),
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        profile,
        message: "Profile updated successfully",
      };
    } catch (error) {
      console.error("Error updating student profile:", error);
      throw error;
    }
  }

  /**
   * Update student email
   */
  static async updateStudentEmail(
    userId: string,
    newEmail: string,
    password: string
  ): Promise<EmailUpdateResponse> {
    try {
      // Get the user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          student: true,
        },
      });

      if (!user || !user.student) {
        throw new Error("Student not found");
      }

      // Verify the password using the new verifyPassword function
      if (!user.passwordHash) {
        throw new Error("Password not set");
      }

      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error("Invalid password");
      }

      // Check if the new email is already in use using the new protection tier
      const protectedNewEmail = await protectData(newEmail, "email");

      const existingStudent = await prisma.student.findFirst({
        where: {
          emailSearchHash: protectedNewEmail.searchHash,
          id: { not: user.student.id },
        },
      });

      if (existingStudent) {
        throw new Error("Email is already in use");
      }

      // Update the student email
      await prisma.student.update({
        where: { id: user.student.id },
        data: {
          email: protectedNewEmail.encrypted,
          emailSearchHash: protectedNewEmail.searchHash,
          updatedAt: new Date(),
        },
      });

      // Update the user email
      await prisma.user.update({
        where: { id: userId },
        data: {
          email: protectedNewEmail.encrypted,
          emailVerified: null, // Require email verification again
          emailVerificationRequired: true,
          updatedAt: new Date(),
        },
      });

      // Generate email verification token
      const { generateVerificationToken } = await import("@/lib/utils");
      const verificationToken = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.verificationToken.create({
        data: {
          identifier: userId,
          token: verificationToken,
          expires: expiresAt,
        },
      });

      // Log the email update
      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.EMAIL_UPDATED,
          resourceType: "USER",
          resourceId: userId,
          details: {
            oldEmail: user.email,
            newEmail: protectedNewEmail.encrypted,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        verificationToken,
        message:
          "Email updated successfully. Please check your new email for verification.",
      };
    } catch (error) {
      console.error("Error updating student email:", error);
      throw error;
    }
  }

  /**
   * Change student password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<AccountActionResponse> {
    try {
      // Get the user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Verify the current password using the new verifyPassword function
      if (!user.passwordHash) {
        throw new Error("Password not set");
      }

      const isCurrentPasswordValid = await verifyPassword(
        currentPassword,
        user.passwordHash
      );
      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Validate new password strength using the new validation function
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(
          `Password validation failed: ${passwordValidation.errors.join(", ")}`
        );
      }

      // Hash the new password using the new protection tier
      const protectedPassword = await protectData(newPassword, "password");

      // Update the password
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: protectedPassword.encrypted,
          updatedAt: new Date(),
        },
      });

      // Log the password change
      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.PASSWORD_CHANGED,
          resourceType: "USER",
          resourceId: userId,
          details: {
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        message: "Password changed successfully",
      };
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  }

  /**
   * Deactivate student account
   */
  static async deactivateStudentAccount(
    userId: string,
    password: string
  ): Promise<AccountActionResponse> {
    try {
      // Get the user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Verify the password using the new verifyPassword function
      if (!user.passwordHash) {
        throw new Error("Password not set");
      }

      const isPasswordValid = await verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error("Invalid password");
      }

      // Deactivate the user account
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Also deactivate the student profile
      await prisma.student.update({
        where: { userId },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });

      // Log the account deactivation
      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.ACCOUNT_DEACTIVATED,
          resourceType: "USER",
          resourceId: userId,
          details: {
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        message: "Account deactivated successfully",
      };
    } catch (error) {
      console.error("Error deactivating student account:", error);
      throw error;
    }
  }

  /**
   * Reactivate student account
   */
  static async reactivateStudentAccount(
    userId: string
  ): Promise<AccountActionResponse> {
    try {
      // Reactivate the user account
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: true,
          updatedAt: new Date(),
        },
      });

      // Also reactivate the student profile
      await prisma.student.update({
        where: { userId },
        data: {
          isActive: true,
          updatedAt: new Date(),
        },
      });

      // Log the account reactivation
      await prisma.auditLog.create({
        data: {
          userId,
          action: AuditAction.ACCOUNT_REACTIVATED,
          resourceType: "USER",
          resourceId: userId,
          details: {
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        message: "Account reactivated successfully",
      };
    } catch (error) {
      console.error("Error reactivating student account:", error);
      throw error;
    }
  }

  /**
   * Get profile completion status
   */
  static async getProfileCompletion(userId: string): Promise<{
    completed: boolean;
    completionPercentage: number;
    missingFields: string[];
  }> {
    try {
      const student = await prisma.student.findUnique({
        where: { userId },
        select: {
          firstName: true,
          surname: true,
          phone: true,
          passportUrl: true,
          state: true,
          lga: true,
          dateOfBirth: true,
          gender: true,
        },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      const requiredFields = [
        { key: "firstName", value: student.firstName },
        { key: "surname", value: student.surname },
        { key: "phone", value: student.phone },
        { key: "passportUrl", value: student.passportUrl },
        { key: "state", value: student.state },
        { key: "lga", value: student.lga },
        { key: "dateOfBirth", value: student.dateOfBirth },
        { key: "gender", value: student.gender },
      ];

      const completedFields = requiredFields.filter((field) => {
        if (field.value === null || field.value === undefined) return false;
        if (typeof field.value === "string" && field.value.trim() === "")
          return false;
        return true;
      });

      const missingFields = requiredFields
        .filter((field) => !completedFields.includes(field))
        .map((field) => field.key);

      const completionPercentage = Math.round(
        (completedFields.length / requiredFields.length) * 100
      );

      return {
        completed: completionPercentage === 100,
        completionPercentage,
        missingFields,
      };
    } catch (error) {
      console.error("Error getting profile completion:", error);
      throw error;
    }
  }

  /**
   * Verify current password for sensitive operations
   */
  static async verifyCurrentPassword(
    userId: string,
    password: string
  ): Promise<{ isValid: boolean; message?: string }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return { isValid: false, message: "User not found" };
      }

      if (!user.passwordHash) {
        return { isValid: false, message: "Password not set" };
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      return {
        isValid,
        message: isValid ? undefined : "Invalid password",
      };
    } catch (error) {
      console.error("Error verifying current password:", error);
      return { isValid: false, message: "Error verifying password" };
    }
  }
}
