// lib/services/serverProfileService.ts
import { prisma } from "@/lib/server/prisma";
import { StudentProfile } from "@/lib/types/s/index";
import { protectData, unprotectData } from "@/lib/security/dataProtection";
import { AuditAction, ResourceType } from "@prisma/client";

export interface ProfileUpdateResponse {
  success: boolean;
  profile: StudentProfile;
  message: string;
}

export interface AccountActionResponse {
  success: boolean;
  message: string;
}

export interface StudentsListResponse {
  students: StudentProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ServerProfileService {
  /**
   * Get decrypted student profile by ID
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
          surname: true,
          otherName: true,
          email: true,
          phone: true,
          passportUrl: true,
          department: true,
          college: true,
          course: true, // Added missing course field
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
              createdAt: true,
            },
          },
        },
      });

      if (!student) return null;

      // Decrypt all sensitive data in parallel
      const [firstName, surname, otherName, email, phone, state, lga] =
        await Promise.all([
          unprotectData(student.firstName, "name"),
          unprotectData(student.surname, "name"),
          student.otherName
            ? unprotectData(student.otherName, "name")
            : Promise.resolve(null),
          unprotectData(student.email, "email"),
          unprotectData(student.phone, "phone"),
          student.state
            ? unprotectData(student.state, "location")
            : Promise.resolve(""),
          student.lga
            ? unprotectData(student.lga, "location")
            : Promise.resolve(""),
        ]);

      const fullName = [surname, firstName, otherName]
        .filter(Boolean)
        .join(" ")
        .trim();

      return {
        id: student.id,
        matricNumber: student.matricNumber,
        firstName,
        surname,
        otherName,
        fullName,
        email,
        phone,
        passportUrl: student.passportUrl,
        course: student.course || "", // Now properly available
        department: student.department,
        college: student.college,
        admissionYear: student.admissionYear,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        state: state || "",
        lga: lga || "",
        isActive: student.isActive,
        createdAt:
          student.user?.createdAt || student.dateEnrolled || student.createdAt,
        role: "STUDENT" as const,
      };
    } catch (error) {
      console.error("Error getting student profile by ID:", error);
      throw new Error("Failed to retrieve student profile");
    }
  }

  /**
   * Get profile by matric number (case-insensitive)
   */
  static async getStudentProfileByMatricNumber(
    matricNumber: string
  ): Promise<StudentProfile | null> {
    try {
      const student = await prisma.student.findUnique({
        where: { matricNumber: matricNumber.toUpperCase() },
        select: {
          id: true,
        },
      });

      if (!student) return null;

      return this.getStudentProfileById(student.id); // Reuse decrypted logic
    } catch (error) {
      console.error("Error getting student profile by matric number:", error);
      throw new Error("Failed to retrieve student profile");
    }
  }

  /**
   * Update student profile — secure, atomic, audited
   */
  static async updateStudentProfile(
    studentId: string,
    data: Partial<{
      firstName: string;
      surname: string;
      otherName?: string;
      phone: string;
      passportUrl?: string;
      department?: string;
      college?: string;
      course?: string; // Added course field
      state?: string;
      lga?: string;
    }>
  ): Promise<ProfileUpdateResponse> {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) throw new Error("Student not found");

      const updateData: any = {};
      const updatedFields: string[] = [];

      if (data.firstName !== undefined) {
        const { encrypted } = await protectData(data.firstName.trim(), "name");
        updateData.firstName = encrypted;
        updatedFields.push("firstName");
      }

      if (data.surname !== undefined) {
        const { encrypted } = await protectData(data.surname.trim(), "name");
        updateData.surname = encrypted;
        updatedFields.push("surname");
      }

      if (data.otherName !== undefined) {
        updateData.otherName = data.otherName
          ? (await protectData(data.otherName.trim(), "name")).encrypted
          : null;
        updatedFields.push("otherName");
      }

      if (data.phone !== undefined) {
        const { encrypted, searchHash } = await protectData(
          data.phone.trim(),
          "phone"
        );
        updateData.phone = encrypted;
        updateData.phoneSearchHash = searchHash;
        updatedFields.push("phone");
      }

      if (data.passportUrl !== undefined) {
        updateData.passportUrl = data.passportUrl || null;
        updatedFields.push("passportUrl");
      }

      if (data.department !== undefined) {
        updateData.department = data.department;
        updatedFields.push("department");
      }

      if (data.college !== undefined) {
        updateData.college = data.college;
        updatedFields.push("college");
      }

      if (data.course !== undefined) {
        updateData.course = data.course;
        updatedFields.push("course");
      }

      if (data.state !== undefined) {
        const { encrypted } = await protectData(data.state.trim(), "location");
        updateData.state = encrypted;
        updatedFields.push("state");
      }

      if (data.lga !== undefined) {
        const { encrypted } = await protectData(data.lga.trim(), "location");
        updateData.lga = encrypted;
        updatedFields.push("lga");
      }

      if (Object.keys(updateData).length === 0) {
        return {
          success: true,
          profile: (await this.getStudentProfileById(
            studentId
          )) as StudentProfile,
          message: "No changes detected",
        };
      }

      const updated = await prisma.student.update({
        where: { id: studentId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: student.userId,
          action: AuditAction.PROFILE_UPDATED,
          resourceType: ResourceType.STUDENT,
          resourceId: studentId,
          details: {
            updatedFields,
            by: "self",
            timestamp: new Date().toISOString(),
          },
        },
      });

      const profile = await this.getStudentProfileById(studentId);

      if (!profile) {
        throw new Error("Failed to retrieve updated profile");
      }

      return {
        success: true,
        profile,
        message: "Profile updated successfully",
      };
    } catch (error) {
      console.error("Error updating student profile:", error);
      throw new Error("Failed to update student profile");
    }
  }

  /**
   * Deactivate account
   */
  static async deactivateStudentAccount(
    studentId: string,
    reason?: string
  ): Promise<AccountActionResponse> {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) throw new Error("Student not found");

      await prisma.$transaction([
        prisma.user.update({
          where: { id: student.userId },
          data: {
            isActive: false,
            updatedAt: new Date(),
          },
        }),
        prisma.student.update({
          where: { id: studentId },
          data: {
            isActive: false,
            updatedAt: new Date(),
          },
        }),
      ]);

      await prisma.auditLog.create({
        data: {
          userId: student.userId,
          action: AuditAction.ACCOUNT_DEACTIVATED,
          resourceType: ResourceType.USER,
          resourceId: student.userId,
          details: {
            reason: reason || "user_request",
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
      throw new Error("Failed to deactivate student account");
    }
  }

  /**
   * Activate account
   */
  static async activateStudentAccount(
    studentId: string
  ): Promise<AccountActionResponse> {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) throw new Error("Student not found");

      await prisma.$transaction([
        prisma.user.update({
          where: { id: student.userId },
          data: {
            isActive: true,
            updatedAt: new Date(),
          },
        }),
        prisma.student.update({
          where: { id: studentId },
          data: {
            isActive: true,
            updatedAt: new Date(),
          },
        }),
      ]);

      await prisma.auditLog.create({
        data: {
          userId: student.userId,
          action: AuditAction.ACCOUNT_ACTIVATED,
          resourceType: ResourceType.USER,
          resourceId: student.userId,
          details: {
            by: "system",
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        message: "Account activated successfully",
      };
    } catch (error) {
      console.error("Error activating student account:", error);
      throw new Error("Failed to activate student account");
    }
  }

  /**
   * Get all students (admin view) — decrypted + paginated
   */
  static async getAllStudents(
    page = 1,
    limit = 20,
    filters?: {
      department?: string;
      college?: string;
      course?: string;
      isActive?: boolean;
      search?: string;
    }
  ): Promise<StudentsListResponse> {
    try {
      const skip = (page - 1) * limit;
      const where: any = {};

      if (filters?.department) where.department = filters.department;
      if (filters?.college) where.college = filters.college;
      if (filters?.course) where.course = filters.course;
      if (filters?.isActive !== undefined) where.isActive = filters.isActive;

      // Search filter for matric number
      if (filters?.search) {
        where.matricNumber = {
          contains: filters.search.toUpperCase(),
          mode: "insensitive",
        };
      }

      const [students, total] = await prisma.$transaction([
        prisma.student.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
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
            college: true,
            course: true,
            isActive: true,
            dateEnrolled: true,
            state: true,
            lga: true,
            createdAt: true,
          },
        }),
        prisma.student.count({ where }),
      ]);

      const decrypted = await Promise.all(
        students.map(async (s) => {
          try {
            const profile = await this.getStudentProfileById(s.id);
            return profile;
          } catch (error) {
            console.error(
              `Error decrypting profile for student ${s.id}:`,
              error
            );
            return null;
          }
        })
      );

      const validProfiles = decrypted.filter(Boolean) as StudentProfile[];

      const totalPages = Math.ceil(total / limit);

      return {
        students: validProfiles,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error("Error getting all students:", error);
      throw new Error("Failed to retrieve students list");
    }
  }

  /**
   * Get student profile by user ID
   */
  static async getStudentProfileByUserId(
    userId: string
  ): Promise<StudentProfile | null> {
    try {
      const student = await prisma.student.findUnique({
        where: { userId },
        select: {
          id: true,
        },
      });

      if (!student) return null;

      return this.getStudentProfileById(student.id);
    } catch (error) {
      console.error("Error getting student profile by user ID:", error);
      throw new Error("Failed to retrieve student profile");
    }
  }

  /**
   * Check if student exists by matric number
   */
  static async checkStudentExists(matricNumber: string): Promise<boolean> {
    try {
      const student = await prisma.student.findUnique({
        where: { matricNumber: matricNumber.toUpperCase() },
        select: { id: true },
      });

      return !!student;
    } catch (error) {
      console.error("Error checking student existence:", error);
      return false;
    }
  }

  /**
   * Get student statistics
   */
  static async getStudentStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byDepartment: Record<string, number>;
    byCollege: Record<string, number>;
  }> {
    try {
      const [total, active, departmentStats, collegeStats] = await Promise.all([
        prisma.student.count(),
        prisma.student.count({ where: { isActive: true } }),
        prisma.student.groupBy({
          by: ["department"],
          _count: { _all: true },
        }),
        prisma.student.groupBy({
          by: ["college"],
          _count: { _all: true },
        }),
      ]);

      const byDepartment = departmentStats.reduce((acc, stat) => {
        acc[stat.department] = stat._count._all;
        return acc;
      }, {} as Record<string, number>);

      const byCollege = collegeStats.reduce((acc, stat) => {
        acc[stat.college] = stat._count._all;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        active,
        inactive: total - active,
        byDepartment,
        byCollege,
      };
    } catch (error) {
      console.error("Error getting student statistics:", error);
      throw new Error("Failed to retrieve student statistics");
    }
  }
}
