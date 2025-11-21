// lib/services/s/studentService.ts
import { prisma } from "@/lib/server/prisma";
import { Student, StudentProfile } from "@/lib/types/s/index";
import { unprotectData } from "@/lib/security/dataProtection";
import { AuditAction, ResourceType } from "@prisma/client";

export class StudentService {
  /**
   * Decrypt all encrypted fields in a student record
   */
  private static async decryptStudentData(student: any): Promise<Student> {
    try {
      const decrypted = await Promise.all([
        unprotectData(student.firstName, "name"),
        unprotectData(student.surname, "name"),
        student.otherName ? unprotectData(student.otherName, "name") : null,
        unprotectData(student.email, "email"),
        unprotectData(student.phone, "phone"),
        unprotectData(student.nin, "nin"),
        unprotectData(student.jambRegNumber, "jamb"),
        student.matricNumber
          ? unprotectData(student.matricNumber, "matric")
          : student.matricNumber,
        unprotectData(student.state || "", "location"),
        unprotectData(student.lga || "", "location"),
      ]);

      return {
        ...student,
        firstName: decrypted[0],
        surname: decrypted[1],
        otherName: decrypted[2],
        email: decrypted[3],
        phone: decrypted[4],
        nin: decrypted[5],
        jambRegNumber: decrypted[6],
        matricNumber: decrypted[7] || student.matricNumber,
        state: decrypted[8] || "",
        lga: decrypted[9] || "",
        // Decrypt user email if included
        user: student.user
          ? {
              ...student.user,
              email: await unprotectData(student.user.email, "email"),
            }
          : undefined,
      };
    } catch (error) {
      console.error("Failed to decrypt student data:", error);
      throw new Error(
        "Data integrity violation — possible tampering or corruption"
      );
    }
  }

  /**
   * Get full decrypted student by ID
   */
  static async getStudentById(id: string): Promise<Student | null> {
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            emailVerified: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!student) return null;

    return this.decryptStudentData(student);
  }

  /**
   * Get student by matric number (case-insensitive)
   */
  static async getStudentByMatricNumber(
    matricNumber: string
  ): Promise<Student | null> {
    const student = await prisma.student.findUnique({
      where: { matricNumber: matricNumber.toUpperCase() },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            emailVerified: true,
          },
        },
      },
    });

    if (!student) return null;

    return this.decryptStudentData(student);
  }

  /**
   * Get student by user ID
   */
  static async getStudentByUserId(userId: string): Promise<Student | null> {
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            emailVerified: true,
            lastLoginAt: true,
          },
        },
      },
    });

    if (!student) return null;

    return this.decryptStudentData(student);
  }

  /**
   * Get safe, public-facing student profile (for dashboard, profile page)
   */
  static async getStudentProfile(
    userId: string
  ): Promise<StudentProfile | null> {
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
        college: true,
        admissionYear: true,
        gender: true,
        dateOfBirth: true,
        state: true,
        lga: true,
        isActive: true,
        dateEnrolled: true,
        course: true, // Add course property to select
        user: {
          select: { role: true },
        },
      },
    });

    if (!student) return null;

    const [firstName, surname, otherName, email, phone, state, lga] =
      await Promise.all([
        unprotectData(student.firstName, "name"),
        unprotectData(student.surname, "name"),
        student.otherName ? unprotectData(student.otherName, "name") : null,
        unprotectData(student.email, "email"),
        unprotectData(student.phone, "phone"),
        unprotectData(student.state || "", "location"),
        unprotectData(student.lga || "", "location"),
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
      department: student.department,
      college: student.college,
      admissionYear: student.admissionYear,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      state: state || "",
      lga: lga || "",
      isActive: student.isActive,
      createdAt: student.dateEnrolled,
      role: "STUDENT",
      course: student.course ?? "", // Add course property, fallback to empty string if undefined
    };
  }

  /**
   * Update last activity timestamp
   */
  static async updateLastActivity(studentId: string): Promise<void> {
    await prisma.student.update({
      where: { id: studentId },
      data: { lastActivityAt: new Date() },
    });
  }

  /**
   * Get all students with pagination (admin view)
   */
  static async getAllStudents(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        skip,
        take: limit,
        orderBy: { matricNumber: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
              emailVerified: true,
            },
          },
        },
      }),
      prisma.student.count(),
    ]);

    const decrypted = await Promise.all(
      students.map((s) => this.decryptStudentData(s))
    );

    return {
      students: decrypted as Student[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Search students by name, matric, email, phone (using search hashes)
   */
  static async searchStudents(query: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const q = query.trim();

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where: {
          OR: [
            { matricNumber: { contains: q, mode: "insensitive" } },
            { emailSearchHash: { contains: q.toLowerCase() } },
            { phoneSearchHash: { contains: q } },
            { ninSearchHash: { contains: q } },
            { jambRegSearchHash: { contains: q } },
          ],
        },
        skip,
        take: limit,
        orderBy: { matricNumber: "desc" },
        include: {
          user: { select: { email: true, isActive: true } },
        },
      }),
      prisma.student.count({
        where: {
          OR: [
            { matricNumber: { contains: q, mode: "insensitive" } },
            { emailSearchHash: { contains: q.toLowerCase() } },
            { phoneSearchHash: { contains: q } },
          ],
        },
      }),
    ]);

    const decrypted = await Promise.all(
      students.map((s) => this.decryptStudentData(s))
    );

    return {
      students: decrypted as Student[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create audit log
   */
  static async logAction(
    userId: string,
    action: AuditAction,
    resourceType: ResourceType,
    resourceId?: string,
    details?: any
  ) {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        details,
      },
    });
  }
}
