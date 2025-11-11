// lib/services/serverProfileService.ts

import { prisma } from "@/lib/server/prisma";
import { StudentProfile } from "@/lib/types/student/index";
import { protectData, unprotectData } from "@/lib/security/dataProtection";
import { AuditAction } from "@prisma/client";

export class ServerProfileService {
  /**
   * Get student profile by ID (server-side)
   */
  static async getStudentProfileById(
    studentId: string
  ): Promise<StudentProfile | null> {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          matricNumber: true,
          firstName: true,
          lastName: true,
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
        lastName: await unprotectData(student.lastName, "name"),
        otherName: student.otherName
          ? await unprotectData(student.otherName, "name")
          : null,
        role: student.user.role,
      };
      return decryptedProfile as StudentProfile;
    } catch (error) {
      console.error("Error getting student profile by ID:", error);
      throw error;
    }
  }

  /**
   * Get student profile by matric number (server-side)
   */
  static async getStudentProfileByMatricNumber(
    matricNumber: string
  ): Promise<StudentProfile | null> {
    try {
      const student = await prisma.student.findUnique({
        where: { matricNumber },
        select: {
          id: true,
          matricNumber: true,
          firstName: true,
          lastName: true,
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
        lastName: await unprotectData(student.lastName, "name"),
        otherName: student.otherName
          ? await unprotectData(student.otherName, "name")
          : null,
        role: student.user.role,
      };

      return decryptedProfile as StudentProfile;
    } catch (error) {
      console.error("Error getting student profile by matric number:", error);
      throw error;
    }
  }

  /**
   * Update student profile (server-side)
   */
  static async updateStudentProfile(
    studentId: string,
    profileData: Partial<{
      firstName: string;
      lastName: string;
      otherName: string;
      phone: string;
      passportUrl: string;
      department: string;
      course: string;
      college: string;
    }>
  ) {
    try {
      // Get current student data
      const currentStudent = await prisma.student.findUnique({
        where: { id: studentId },
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

      if (profileData.lastName) {
        updateData.lastName = (
          await protectData(profileData.lastName, "name")
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

      if (profileData.department) {
        updateData.department = profileData.department;
      }

      if (profileData.course) {
        updateData.course = profileData.course;
      }

      if (profileData.college) {
        updateData.college = profileData.college;
      }

      // Update the student profile
      const updatedStudent = await prisma.student.update({
        where: { id: studentId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          matricNumber: true,
          firstName: true,
          lastName: true,
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
        lastName: await unprotectData(updatedStudent.lastName, "name"),
        otherName: updatedStudent.otherName
          ? await unprotectData(updatedStudent.otherName, "name")
          : null,
        role: updatedStudent.user.role,
      };

      // Log the profile update
      await prisma.auditLog.create({
        data: {
          userId: updatedStudent.id,
          action: "PROFILE_UPDATED",
          resourceType: "USER",
          resourceId: updatedStudent.id,
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
   * Deactivate student account (server-side)
   */
  static async deactivateStudentAccount(studentId: string, reason?: string) {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      // Deactivate the user account
      await prisma.user.update({
        where: { id: student.userId },
        data: {
          isActive: false,
        },
      });

      // Log the account deactivation
      await prisma.auditLog.create({
        data: {
          userId: student.userId,
          action: "ACCOUNT_DELETION_REQUESTED",
          resourceType: "USER",
          resourceId: student.userId,
          details: {
            reason,
          },
        },
      });

      return {
        success: true,
        message: "Student account deactivated successfully",
      };
    } catch (error) {
      console.error("Error deactivating student account:", error);
      throw error;
    }
  }

  /**
   * Activate student account (server-side)
   */
  static async activateStudentAccount(studentId: string) {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      // Activate the user account
      await prisma.user.update({
        where: { id: student.userId },
        data: {
          isActive: true,
        },
      });

      // Log the account activation
      await prisma.auditLog.create({
        data: {
          userId: student.userId,
          action: "USER_PROFILE_VIEWED",
          resourceType: "USER",
          resourceId: student.userId,
          details: {
            action: "account_activated",
          },
        },
      });

      return {
        success: true,
        message: "Student account activated successfully",
      };
    } catch (error) {
      console.error("Error activating student account:", error);
      throw error;
    }
  }

  /**
   * Get all students with pagination (server-side)
   */
  static async getAllStudents(
    page: number = 1,
    limit: number = 10,
    filters?: {
      department?: string;
      college?: string;
      isActive?: boolean;
    }
  ) {
    try {
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (filters?.department) where.department = filters.department;
      if (filters?.college) where.college = filters.college;
      if (filters?.isActive !== undefined) where.isActive = filters.isActive;

      const [students, total] = await Promise.all([
        prisma.student.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                isActive: true,
                emailVerified: true,
                lastLoginAt: true,
                createdAt: true,
              },
            },
          },
          orderBy: { dateEnrolled: "desc" },
        }),
        prisma.student.count({ where }),
      ]);

      // Decrypt sensitive data
      const decryptedStudents = await Promise.all(
        students.map(async (student) => ({
          ...student,
          email: await unprotectData(student.email, "email"),
          phone: await unprotectData(student.phone, "phone"),
          firstName: await unprotectData(student.firstName, "name"),
          lastName: await unprotectData(student.lastName, "name"),
          otherName: student.otherName
            ? await unprotectData(student.otherName, "name")
            : null,
          state: await unprotectData(student.state, "location"),
          lga: await unprotectData(student.lga, "location"),
          user: {
            ...student.user,
            email: await unprotectData(student.user.email, "email"),
          },
        }))
      );

      return {
        students: decryptedStudents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting all students:", error);
      throw error;
    }
  }
}
