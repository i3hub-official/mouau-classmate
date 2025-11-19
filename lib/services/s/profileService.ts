// lib/services/profileService.ts
import { prisma } from "@/lib/server/prisma";
import { StudentProfile } from "@/lib/types/s/index";
import {
  protectData,
  unprotectData,
  verifyProtectedData,
} from "@/lib/security/dataProtection";
import { AuditAction } from "@prisma/client";

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
          dateEnrolled: true,
          isActive: true,
          user: {
            select: {
              role: true,
            },
          },
        },
      });

      if (!student) return null;

      // Decrypt sensitive data
      const decryptedProfile = {
        ...student,
        email: await unprotectData(student.email, "email"),
        phone: await unprotectData(student.phone, "phone"),
        firstName: await unprotectData(student.firstName, "name"),
        surname: await unprotectData(student.surname, "name"),
        otherName: student.otherName
          ? await unprotectData(student.otherName, "name")
          : null,
        role: student.user.role,
      };

      return decryptedProfile as StudentProfile;
    } catch (error) {
      console.error("Error getting student profile:", error);
      throw error;
    }
  }

  /**
   * Update student profile
   */
  static async updateStudentProfile(
    userId: string,
    profileData: Partial<{
      firstName: string;
      surname: string;
      otherName: string;
      phone: string;
      passportUrl: string;
    }>
  ) {
    try {
      // Get the current student data
      const currentStudent = await prisma.student.findUnique({
        where: { userId },
      });

      if (!currentStudent) {
        throw new Error("Student not found");
      }

      // Prepare update data
      const updateData: any = {};

      // Update fields if provided
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

      // Update the student profile
      const updatedStudent = await prisma.student.update({
        where: { userId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
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
          dateEnrolled: true,
          isActive: true,
          user: {
            select: {
              role: true,
            },
          },
        },
      });

      // Decrypt sensitive data for response
      const decryptedProfile = {
        ...updatedStudent,
        email: await unprotectData(updatedStudent.email, "email"),
        phone: await unprotectData(updatedStudent.phone, "phone"),
        firstName: await unprotectData(updatedStudent.firstName, "name"),
        surname: await unprotectData(updatedStudent.surname, "name"),
        otherName: updatedStudent.otherName
          ? await unprotectData(updatedStudent.otherName, "name")
          : null,
        role: updatedStudent.user.role,
      };

      // Log the profile update
      await prisma.auditLog.create({
        data: {
          userId,
          action: "PROFILE_UPDATED",
          resourceType: "USER",
          resourceId: userId,
          details: {
            updatedFields: Object.keys(profileData),
          },
        },
      });

      return {
        success: true,
        profile: decryptedProfile as StudentProfile,
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
  ) {
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

      // Verify the password
      if (!user.passwordHash) {
        throw new Error("Password not set");
      }

      const isPasswordValid = await verifyProtectedData(
        password,
        user.passwordHash,
        "password"
      );
      if (!isPasswordValid) {
        throw new Error("Invalid password");
      }

      // Check if the new email is already in use
      const existingStudent = await prisma.student.findFirst({
        where: {
          email: (await protectData(newEmail, "email")).encrypted,
        },
      });

      if (existingStudent && existingStudent.id !== user.student.id) {
        throw new Error("Email is already in use");
      }

      // Protect the new email
      const protectedEmail = await protectData(newEmail, "email");

      // Update the student email
      await prisma.student.update({
        where: { id: user.student.id },
        data: {
          email: protectedEmail.encrypted,
          emailSearchHash: protectedEmail.searchHash,
        },
      });

      // Update the user email
      await prisma.user.update({
        where: { id: userId },
        data: {
          email: protectedEmail.encrypted,
          emailVerified: null, // Require email verification again
          emailVerificationRequired: true,
        },
      });

      // Generate email verification token
      const verificationToken =
        require("@/lib/utils/utils").generateVerificationToken();
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
          action: "PROFILE_UPDATED",
          resourceType: "USER",
          resourceId: userId,
          details: {
            updatedFields: ["email"],
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
   * Deactivate student account
   */
  static async deactivateStudentAccount(userId: string, password: string) {
    try {
      // Get the user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Verify the password
      if (!user.passwordHash) {
        throw new Error("Password not set");
      }

      const isPasswordValid = await verifyProtectedData(
        password,
        user.passwordHash,
        "password"
      );
      if (!isPasswordValid) {
        throw new Error("Invalid password");
      }

      // Deactivate the user account
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
        },
      });

      // Log the account deactivation
      await prisma.auditLog.create({
        data: {
          userId,
          action: "ACCOUNT_DELETION_REQUESTED",
          resourceType: "USER",
          resourceId: userId,
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
   * Delete student account
   */
  static async deleteStudentAccount(userId: string, password: string) {
    try {
      // Get the user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Verify the password
      if (!user.passwordHash) {
        throw new Error("Password not set");
      }

      const isPasswordValid = await verifyProtectedData(
        password,
        user.passwordHash,
        "password"
      );
      if (!isPasswordValid) {
        throw new Error("Invalid password");
      }

      // Delete the student (this will cascade delete related records)
      const student = await prisma.student.findUnique({
        where: { userId },
      });

      if (student) {
        await prisma.student.delete({
          where: { id: student.id },
        });
      }

      // Delete the user
      await prisma.user.delete({
        where: { id: userId },
      });

      // Log the account deletion
      await prisma.auditLog.create({
        data: {
          userId,
          action: "ACCOUNT_DELETION",
          resourceType: "USER",
          resourceId: userId,
        },
      });

      return {
        success: true,
        message: "Account deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting student account:", error);
      throw error;
    }
  }
}
