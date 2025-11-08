// File: lib/services/teachers/profileService.ts
import { prisma } from "@/lib/server/prisma";
import { hash, compare } from "bcryptjs";
import { AuditAction } from "@prisma/client";

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  otherName?: string;
  phone?: string;
  department?: string;
  qualification?: string;
  specialization?: string;
  gender?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export class TeacherProfileService {
  /**
   * Get teacher profile
   */
  static async getProfile(teacherId: string) {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            loginCount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        instructedCourses: {
          include: {
            enrollments: {
              include: {
                student: true,
              },
            },
            assignments: true,
          },
        },
        createdCourses: true,
        assignments: {
          include: {
            course: true,
            submissions: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new Error("Teacher not found");
    }

    // Calculate teaching statistics
    const stats = {
      totalCourses:
        teacher.instructedCourses.length + teacher.createdCourses.length,
      totalStudents: teacher.instructedCourses.reduce(
        (acc, course) => acc + course.enrollments.length,
        0
      ),
      totalAssignments: teacher.assignments.length,
      totalSubmissions: teacher.assignments.reduce(
        (acc, assignment) => acc + assignment.submissions.length,
        0
      ),
      pendingGrading: teacher.assignments.reduce(
        (acc, assignment) =>
          acc + assignment.submissions.filter((s) => !s.isGraded).length,
        0
      ),
    };

    return {
      ...teacher,
      stats,
    };
  }

  /**
   * Update teacher profile
   */
  static async updateProfile(teacherId: string, data: UpdateProfileData) {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
      });

      if (!teacher) {
        throw new Error("Teacher not found");
      }

      // Check if phone is being updated and if it's already taken
      if (data.phone && data.phone !== teacher.phone) {
        const existingTeacher = await prisma.teacher.findUnique({
          where: { phone: data.phone },
        });

        if (existingTeacher && existingTeacher.id !== teacherId) {
          throw new Error("Phone number already in use");
        }
      }

      // Map gender string to enum if present
      const prismaData = { ...data } as any;
      if (typeof data.gender === "string") {
        // @ts-ignore
        const { Gender } = prisma;
        prismaData.gender = data.gender as (typeof Gender)[keyof typeof Gender];
      }

      const updatedTeacher = await prisma.teacher.update({
        where: { id: teacherId },
        data: prismaData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
        },
      });

      // Update user name if firstName or lastName changed
      if (data.firstName || data.lastName) {
        const currentTeacher = await prisma.teacher.findUnique({
          where: { id: teacherId },
        });

        if (currentTeacher) {
          const newName = `${currentTeacher.firstName} ${currentTeacher.lastName}`;
          await prisma.user.update({
            where: { id: currentTeacher.userId },
            data: { name: newName },
          });
        }
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: teacher.userId,
          action: "PROFILE_UPDATED",
          resourceType: "TEACHER",
          resourceId: teacherId,
          details: {
            type: "teacher_profile_update",
            updatedFields: Object.keys(data),
          },
        },
      });

      return updatedTeacher;
    } catch (error) {
      console.error("Update profile error:", error);
      throw error;
    }
  }

  /**
   * Change password
   */
  static async changePassword(teacherId: string, data: ChangePasswordData) {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        include: {
          user: true,
        },
      });

      if (!teacher || !teacher.user.passwordHash) {
        throw new Error("Teacher not found");
      }

      // Verify current password
      const isCurrentPasswordValid = await compare(
        data.currentPassword,
        teacher.user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Hash new password
      const hashedNewPassword = await hash(data.newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: teacher.userId },
        data: {
          passwordHash: hashedNewPassword,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: teacher.userId,
          action: "PASSWORD_CHANGED",
          resourceType: "USER",
          details: {
            type: "teacher_password_change",
          },
        },
      });

      return { success: true, message: "Password updated successfully" };
    } catch (error) {
      console.error("Change password error:", error);
      throw error;
    }
  }

  /**
   * Update teacher preferences
   */
  static async updatePreferences(
    teacherId: string,
    preferences: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      assignmentReminders?: boolean;
      gradeAlerts?: boolean;
      lectureReminders?: boolean;
    }
  ) {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new Error("Teacher not found");
    }

    const userPreferences = await prisma.userPreferences.upsert({
      where: { userId: teacher.userId },
      update: preferences,
      create: {
        userId: teacher.userId,
        ...preferences,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: teacher.userId,
        action: "USER_PREFERENCES",
        resourceType: "USER",
        details: {
          type: "teacher_preferences_update",
          updatedPreferences: Object.keys(preferences),
        },
      },
    });

    return userPreferences;
  }

  /**
   * Get teacher activity log
   */
  static async getActivityLog(
    teacherId: string,
    filters?: {
      action?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new Error("Teacher not found");
    }

    // Import AuditAction enum from Prisma client
    //  // Add this import at the top if not present

    const where = {
      userId: teacher.userId,
      ...(filters?.action && Object.values(AuditAction).includes(filters.action as AuditAction)
        ? { action: filters.action as AuditAction }
        : {}),
      ...(filters?.startDate && {
        createdAt: {
          gte: filters.startDate,
        },
      }),
      ...(filters?.endDate && {
        createdAt: {
          lte: filters.endDate,
        },
      }),
    };

    const [activities, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get teacher security events
   */
  static async getSecurityEvents(
    teacherId: string,
    filters?: {
      severity?: string;
      resolved?: boolean;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new Error("Teacher not found");
    }

    const where = {
      userId: teacher.userId,
      ...(filters?.severity && { severity: filters.severity }),
      ...(filters?.resolved !== undefined && { resolved: filters.resolved }),
      ...(filters?.startDate && {
        createdAt: {
          gte: filters.startDate,
        },
      }),
      ...(filters?.endDate && {
        createdAt: {
          lte: filters.endDate,
        },
      }),
    };

    const [securityEvents, total] = await Promise.all([
      prisma.securityEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.securityEvent.count({ where }),
    ]);

    return {
      securityEvents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
