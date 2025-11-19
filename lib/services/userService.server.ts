// lib/services/userService.server.ts
import { prisma } from "@/lib/server/prisma";
import { protectData, unprotectData } from "@/lib/security/dataProtection";
import { AuditAction } from "@prisma/client";

export class UserServiceServer {
  /**
   * Find user by email (server-side)
   */
  static async findUserByEmail(email: string) {
    try {
      const protectedEmail = await protectData(email, "email");

      const user = await prisma.user.findFirst({
        where: {
          email: protectedEmail.encrypted,
        },
        include: {
          student: {
            select: {
              id: true,
              matricNumber: true,
              firstName: true,
              surname: true,
              department: true,
            },
          },
          teacher: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              surname: true,
              department: true,
            },
          },
        },
      });

      if (!user) return null;

      // Decrypt sensitive data
      const decryptedUser = {
        ...user,
        email: await unprotectData(user.email, "email"),
      };

      if (user.student) {
        decryptedUser.student = {
          ...user.student,
          firstName: await unprotectData(user.student.firstName, "name"),
          surname: await unprotectData(user.student.surname, "name"),
        };
      }

      if (user.teacher) {
        decryptedUser.teacher = {
          ...user.teacher,
          firstName: await unprotectData(user.teacher.firstName, "name"),
          surname: await unprotectData(user.teacher.surname, "name"),
        };
      }

      return decryptedUser;
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }

  /**
   * Find student by matric number (server-side)
   */
  static async findStudentByMatricNumber(matricNumber: string) {
    try {
      const student = await prisma.student.findUnique({
        where: { matricNumber },
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

      // Decrypt sensitive data
      const decryptedStudent = {
        ...student,
        email: await unprotectData(student.email, "email"),
        user: {
          ...student.user,
          email: await unprotectData(student.user.email, "email"),
        },
      };

      return decryptedStudent;
    } catch (error) {
      console.error("Error finding student by matric number:", error);
      throw error;
    }
  }

  /**
   * Find teacher by employee ID (server-side)
   */
  static async findTeacherByEmployeeId(employeeId: string) {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { employeeId },
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

      if (!teacher) return null;

      // Decrypt sensitive data
      const decryptedTeacher = {
        ...teacher,
        email: await unprotectData(teacher.email, "email"),
        user: {
          ...teacher.user,
          email: await unprotectData(teacher.user.email, "email"),
        },
      };

      return decryptedTeacher;
    } catch (error) {
      console.error("Error finding teacher by employee ID:", error);
      throw error;
    }
  }

  /**
   * Update last login
   */
  static async updateLastLogin(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
          failedLoginAttempts: 0,
          accountLocked: false,
          lockedUntil: null,
        },
      });

      // Log successful login
      await prisma.auditLog.create({
        data: {
          userId,
          action: "USER_LOGGED_IN",
          resourceType: "USER",
          resourceId: userId,
          ipAddress,
          userAgent,
        },
      });

      return {
        success: true,
        message: "Last login updated successfully",
      };
    } catch (error) {
      console.error("Error updating last login:", error);
      throw error;
    }
  }

  /**
   * Increment failed login attempts
   */
  static async incrementFailedLogin(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const failedAttempts = user.failedLoginAttempts + 1;
      const updateData: any = {
        failedLoginAttempts: failedAttempts,
        lastFailedLoginAt: new Date(),
      };

      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        updateData.accountLocked = true;
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Log failed login
      await prisma.auditLog.create({
        data: {
          userId,
          action: "USER_LOGIN_FAILED",
          resourceType: "USER",
          resourceId: userId,
          details: {
            failedAttempts,
            locked: failedAttempts >= 5,
          },
          ipAddress,
          userAgent,
        },
      });

      return {
        success: true,
        failedAttempts,
        locked: failedAttempts >= 5,
        message:
          failedAttempts >= 5
            ? "Account locked due to too many failed attempts"
            : "Failed login attempt recorded",
      };
    } catch (error) {
      console.error("Error incrementing failed login:", error);
      throw error;
    }
  }

  /**
   * Reset failed login attempts
   */
  static async resetFailedLoginAttempts(userId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          accountLocked: false,
          lockedUntil: null,
        },
      });

      return {
        success: true,
        message: "Failed login attempts reset successfully",
      };
    } catch (error) {
      console.error("Error resetting failed login attempts:", error);
      throw error;
    }
  }

  /**
   * Create user activity log
   */
  static async logUserActivity(
    userId: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await prisma.userActivity.create({
        data: {
          userId,
          action,
          resourceType,
          resourceId,
          details,
          ipAddress,
          userAgent,
          createdAt: new Date(),
        },
      });

      return {
        success: true,
        message: "User activity logged successfully",
      };
    } catch (error) {
      console.error("Error logging user activity:", error);
      throw error;
    }
  }

  /**
   * Get user activities
   */
  static async getUserActivities(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      const [activities, total] = await Promise.all([
        prisma.userActivity.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.userActivity.count({ where: { userId } }),
      ]);

      return {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting user activities:", error);
      throw error;
    }
  }

  /**
   * Search users (server-side)
   */
  static async searchUsers(
    query: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      // For a real implementation, you would need to implement proper search functionality
      // This is a simplified version
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              // For encrypted fields, you would need to use search hashes
            ],
          },
          skip,
          take: limit,
          include: {
            student: {
              select: {
                id: true,
                matricNumber: true,
                firstName: true,
                surname: true,
                department: true,
              },
            },
            teacher: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                surname: true,
                department: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.count({
          where: {
            OR: [{ name: { contains: query, mode: "insensitive" } }],
          },
        }),
      ]);

      // Decrypt sensitive data
      const decryptedUsers = await Promise.all(
        users.map(async (user) => {
          const decryptedUser = {
            ...user,
            email: await unprotectData(user.email, "email"),
          };

          if (user.student) {
            decryptedUser.student = {
              ...user.student,
              firstName: await unprotectData(user.student.firstName, "name"),
              surname: await unprotectData(user.student.surname, "name"),
            };
          }

          if (user.teacher) {
            decryptedUser.teacher = {
              ...user.teacher,
              firstName: await unprotectData(user.teacher.firstName, "name"),
              surname: await unprotectData(user.teacher.surname, "name"),
            };
          }

          return decryptedUser;
        })
      );

      return {
        users: decryptedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error searching users:", error);
      throw error;
    }
  }
}
