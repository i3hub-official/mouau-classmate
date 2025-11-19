// lib/services/s/studentService.ts
import { prisma } from "@/lib/server/prisma";
import { Student, StudentProfile } from "@/lib/types/s/index";
import { protectData, unprotectData } from "@/lib/security/dataProtection";
import { AuditAction, ResourceType } from "@prisma/client";

export class StudentService {
  /**
   * Helper method to decrypt student data
   */
  private static async decryptStudentData(student: any): Promise<Student> {
    try {
      return {
        ...student,
        email: await unprotectData(student.email, "email"),
        phone: await unprotectData(student.phone, "phone"),
        firstName: await unprotectData(student.firstName, "name"),
        surname: await unprotectData(student.surname, "name"),
        otherName: student.otherName
          ? await unprotectData(student.otherName, "name")
          : null,
        state: await unprotectData(student.state, "location"),
        lga: await unprotectData(student.lga, "location"),
        user: student.user
          ? {
              ...student.user,
              email: await unprotectData(student.user.email, "email"),
            }
          : undefined,
      };
    } catch (error) {
      console.error("Error decrypting student data:", error);
      throw new Error("Failed to decrypt student data");
    }
  }

  /**
   * Get student by ID
   */
  static async getStudentById(id: string): Promise<Student | null> {
    try {
      const student = await prisma.student.findUnique({
        where: { id },
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
      });

      if (!student) return null;

      // Decrypt sensitive data
      return (await this.decryptStudentData(student)) as Student;
    } catch (error) {
      console.error("Error getting student by ID:", error);
      throw error;
    }
  }

  /**
   * Get student by matric number
   */
  static async getStudentByMatricNumber(
    matricNumber: string
  ): Promise<Student | null> {
    try {
      const student = await prisma.student.findUnique({
        where: { matricNumber },
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
      });

      if (!student) return null;

      // Decrypt sensitive data
      return (await this.decryptStudentData(student)) as Student;
    } catch (error) {
      console.error("Error getting student by matric number:", error);
      throw error;
    }
  }

  /**
   * Get student by user ID
   */
  static async getStudentByUserId(userId: string): Promise<Student | null> {
    try {
      const student = await prisma.student.findUnique({
        where: { userId },
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
      });

      if (!student) return null;

      // Decrypt sensitive data
      return (await this.decryptStudentData(student)) as Student;
    } catch (error) {
      console.error("Error getting student by user ID:", error);
      throw error;
    }
  }

  /**
   * Get student profile (safe data without sensitive information)
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
   * Update student last activity
   */
  static async updateLastActivity(studentId: string): Promise<void> {
    try {
      await prisma.student.update({
        where: { id: studentId },
        data: { lastActivityAt: new Date() },
      });
    } catch (error) {
      console.error("Error updating student last activity:", error);
      throw error;
    }
  }

  /**
   * Get all students with pagination
   */
  static async getAllStudents(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [students, total] = await Promise.all([
        prisma.student.findMany({
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
          orderBy: { matricNumber: "desc" },
        }),
        prisma.student.count(),
      ]);

      // Decrypt sensitive data
      const decryptedStudents = await Promise.all(
        students.map(async (student) => await this.decryptStudentData(student))
      );

      return {
        students: decryptedStudents as Student[],
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

  /**
   * Search students by name, matric number, or email
   */
  static async searchStudents(
    query: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      // Search using matric number and email search hashes
      const [students, total] = await Promise.all([
        prisma.student.findMany({
          where: {
            OR: [
              { matricNumber: { contains: query, mode: "insensitive" } },
              // For encrypted fields, we use search hashes
              { emailSearchHash: { contains: query, mode: "insensitive" } },
            ],
          },
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
          orderBy: { matricNumber: "desc" },
        }),
        prisma.student.count({
          where: {
            OR: [
              { matricNumber: { contains: query, mode: "insensitive" } },
              { emailSearchHash: { contains: query, mode: "insensitive" } },
            ],
          },
        }),
      ]);

      // Decrypt sensitive data
      const decryptedStudents = await Promise.all(
        students.map(async (student) => await this.decryptStudentData(student))
      );

      return {
        students: decryptedStudents as Student[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error searching students:", error);
      throw error;
    }
  }

  /**
   * Get students by department
   */
  static async getStudentsByDepartment(
    department: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      const [students, total] = await Promise.all([
        prisma.student.findMany({
          where: { department },
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
          orderBy: { matricNumber: "desc" },
        }),
        prisma.student.count({ where: { department } }),
      ]);

      // Decrypt sensitive data
      const decryptedStudents = await Promise.all(
        students.map(async (student) => await this.decryptStudentData(student))
      );

      return {
        students: decryptedStudents as Student[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting students by department:", error);
      throw error;
    }
  }

  /**
   * Create audit log for student actions
   */
  static async createAuditLog(
    userId: string,
    action: AuditAction,
    resourceType: ResourceType,
    resourceId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          details,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error("Error creating audit log:", error);
      throw error;
    }
  }
}
