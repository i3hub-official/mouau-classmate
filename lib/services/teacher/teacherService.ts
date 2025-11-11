// lib/services/teacher/teacherService.ts
import { prisma } from "@/lib/server/prisma";
import {
  protectData,
  verifyPassword,
  validatePasswordStrength,
} from "@/lib/security/dataProtection";
import { AuditAction } from "@prisma/client";
import { TeacherUser } from "@/lib/types/teacher/index";

export class TeacherService {
  /**
   * Get teacher by ID
   */
  static async getTeacherById(id: string): Promise<TeacherUser | null> {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              emailVerified: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
        },
      });

      if (!teacher) {
        return null;
      }

      // Decrypt sensitive data
      const decryptedTeacher: TeacherUser = {
        id: teacher.id,
        employeeId: teacher.employeeId,
        email: await this.decryptField(teacher.user.email, "email"),
        phone: await this.decryptField(teacher.phone, "phone"),
        firstName: await this.decryptField(teacher.firstName, "name"),
        lastName: await this.decryptField(teacher.lastName, "name"),
        otherName: teacher.otherName
          ? await this.decryptField(teacher.otherName, "name")
          : null,
        department: teacher.department,
        institution: teacher.institution,
        qualification: teacher.qualification ?? undefined,
        specialization: teacher.specialization ?? undefined,
        experience: teacher.experience,
        dateJoined: teacher.dateJoined,
        isActive: teacher.isActive,
        photo: teacher.photo,
        // Add required properties from user
        role: "TEACHER",
        name: teacher.user.name ?? "",
        emailVerified: teacher.user.emailVerified,
        lastLoginAt: teacher.user.lastLoginAt,
        createdAt: teacher.user.createdAt,
      };

      return decryptedTeacher;
    } catch (error) {
      console.error("Error getting teacher by ID:", error);
      throw error;
    }
  }

  /**
   * Get teacher by user ID
   */
  static async getTeacherByUserId(userId: string): Promise<TeacherUser | null> {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              emailVerified: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
        },
      });

      if (!teacher) {
        return null;
      }

      // Decrypt sensitive data
      const decryptedTeacher: TeacherUser = {
        id: teacher.id,
        employeeId: teacher.employeeId,
        email: await this.decryptField(teacher.user.email, "email"),
        phone: await this.decryptField(teacher.phone, "phone"),
        firstName: await this.decryptField(teacher.firstName, "name"),
        lastName: await this.decryptField(teacher.lastName, "name"),
        otherName: teacher.otherName
          ? await this.decryptField(teacher.otherName, "name")
          : null,
        department: teacher.department,
        institution: teacher.institution,
        qualification: teacher.qualification ?? undefined,
        specialization: teacher.specialization ?? undefined,
        experience: teacher.experience,
        dateJoined: teacher.dateJoined,
        isActive: teacher.isActive,
        photo: teacher.photo,
        // Add required properties from user
        role: "TEACHER",
        name: teacher.user.name ?? "",
        emailVerified: teacher.user.emailVerified,
        lastLoginAt: teacher.user.lastLoginAt,
        createdAt: teacher.user.createdAt,
      };

      return decryptedTeacher;
    } catch (error) {
      console.error("Error getting teacher by user ID:", error);
      throw error;
    }
  }

  /**
   * Get teacher by email
   */
  static async getTeacherByEmail(email: string): Promise<TeacherUser | null> {
    try {
      const protectedEmail = await protectData(email, "email");

      const teacher = await prisma.teacher.findFirst({
        where: {
          user: {
            email: protectedEmail.encrypted,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              emailVerified: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
        },
      });

      if (!teacher) {
        return null;
      }

      // Decrypt sensitive data
      const decryptedTeacher: TeacherUser = {
        id: teacher.id,
        employeeId: teacher.employeeId,
        email: await this.decryptField(teacher.user.email, "email"),
        phone: await this.decryptField(teacher.phone, "phone"),
        firstName: await this.decryptField(teacher.firstName, "name"),
        lastName: await this.decryptField(teacher.lastName, "name"),
        otherName: teacher.otherName
          ? await this.decryptField(teacher.otherName, "name")
          : null,
        department: teacher.department,
        institution: teacher.institution,
        qualification: teacher.qualification ?? undefined,
        specialization: teacher.specialization ?? undefined,
        experience: teacher.experience,
        dateJoined: teacher.dateJoined,
        isActive: teacher.isActive,
        photo: teacher.photo,
        // Add required properties from user
        role: "TEACHER",
        name: teacher.user.name ?? "",
        emailVerified: teacher.user.emailVerified,
        lastLoginAt: teacher.user.lastLoginAt,
        createdAt: teacher.user.createdAt,
      };

      return decryptedTeacher;
    } catch (error) {
      console.error("Error getting teacher by email:", error);
      throw error;
    }
  }

  /**
   * Get teacher by employee ID
   */
  static async getTeacherByEmployeeId(
    employeeId: string
  ): Promise<TeacherUser | null> {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { employeeId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              emailVerified: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
        },
      });

      if (!teacher) {
        return null;
      }

      // Decrypt sensitive data
      const decryptedTeacher = {
        ...teacher,
        email: await this.decryptField(teacher.user.email, "email"),
        phone: await this.decryptField(teacher.phone, "phone"),
        firstName: await this.decryptField(teacher.firstName, "name"),
        lastName: await this.decryptField(teacher.lastName, "name"),
        otherName: teacher.otherName
          ? await this.decryptField(teacher.otherName, "name")
          : null,
        department: teacher.department,
        institution: teacher.institution,
        qualification: teacher.qualification,
        specialization: teacher.specialization,
        experience: teacher.experience,
        dateJoined: teacher.dateJoined,
        isActive: teacher.isActive,
        photo: teacher.photo,
        // Add required properties from user
        role: "TEACHER",
        name: teacher.user.name ?? "",
        emailVerified: teacher.user.emailVerified,
        lastLoginAt: teacher.user.lastLoginAt,
        createdAt: teacher.user.createdAt,
      };

      return decryptedTeacher as TeacherUser;
    } catch (error) {
      console.error("Error getting teacher by employee ID:", error);
      throw error;
    }
  }

  /**
   * Create teacher
   */
  static async createTeacher(teacherData: {
    employeeId: string;
    firstName: string;
    lastName: string;
    otherName?: string;
    email: string;
    phone: string;
    department: string;
    institution: string;
    qualification?: string;
    specialization?: string;
    experience?: string;
    password: string;
    userId: string;
  }) {
    try {
      // Check if email already exists
      const protectedEmail = await protectData(teacherData.email, "email");
      const existingUser = await prisma.user.findFirst({
        where: {
          email: protectedEmail.encrypted,
        },
      });

      if (existingUser) {
        throw new Error("A user with this email already exists");
      }

      // Check if employee ID already exists
      const existingTeacher = await prisma.teacher.findFirst({
        where: { employeeId: teacherData.employeeId },
      });

      if (existingTeacher) {
        throw new Error("A teacher with this employee ID already exists");
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(teacherData.password);
      if (!passwordValidation.isValid) {
        throw new Error(
          `Password validation failed: ${passwordValidation.errors.join(", ")}`
        );
      }

      // Hash the password
      const hashedPassword = await protectData(
        teacherData.password,
        "password"
      );

      // Create user account
      const user = await prisma.user.create({
        data: {
          email: protectedEmail.encrypted,
          passwordHash: hashedPassword.encrypted,
          role: "TEACHER",
          isActive: false, // Will be activated after email verification
          emailVerified: null,
        },
      });

      // Create teacher profile
      const teacher = await prisma.teacher.create({
        data: {
          userId: user.id,
          employeeId: teacherData.employeeId,
          firstName: (
            await protectData(teacherData.firstName, "name")
          ).encrypted,
          lastName: (await protectData(teacherData.lastName, "name")).encrypted,
          otherName: teacherData.otherName
            ? (
                await protectData(teacherData.otherName, "name")
              ).encrypted
            : null,
          email: protectedEmail.encrypted,
          phone: (await protectData(teacherData.phone, "phone")).encrypted,
          department: teacherData.department,
          institution: teacherData.institution,
          qualification: teacherData.qualification,
          specialization: teacherData.specialization,
          experience: teacherData.experience,
          dateJoined: new Date(),
          isActive: true,
        },
      });

      // Log teacher creation
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "TEACHER_REGISTERED",
          resourceType: "USER",
          resourceId: teacher.id,
          details: {
            employeeId: teacherData.employeeId,
            email: protectedEmail.encrypted,
            department: teacherData.department,
            institution: teacherData.institution,
          },
        },
      });

      // In a real implementation, send verification email here
      console.log(`Teacher account created for: ${teacherData.email}`);

      return {
        success: true,
        teacher: {
          id: teacher.id,
          userId: user.id,
          email: protectedEmail.encrypted,
          firstName: teacherData.firstName,
          lastName: teacherData.lastName,
          otherName: teacherData.otherName,
          phone: teacherData.phone,
          department: teacherData.department,
          institution: teacherData.institution,
          qualification: teacherData.qualification,
          specialization: teacherData.specialization,
          experience: teacherData.experience,
          dateJoined: teacher.dateJoined,
          isActive: true,
        },
        message:
          "Teacher account created successfully. Please check your email for verification.",
      };
    } catch (error) {
      console.error("Error creating teacher:", error);
      throw error;
    }
  }

  /**
   * Update teacher profile
   */
  static async updateTeacherProfile(
    teacherId: string,
    profileData: {
      firstName?: string;
      lastName?: string;
      otherName?: string;
      phone?: string;
      department?: string;
      institution?: string;
      qualification?: string;
      specialization?: string;
      experience?: string;
      photo?: string;
    }
  ) {
    try {
      // Get existing teacher
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!teacher) {
        throw new Error("Teacher not found");
      }

      // Prepare update data
      const updateData: any = {};

      if (profileData.firstName !== undefined) {
        updateData.firstName = await protectData(profileData.firstName, "name");
      }
      if (profileData.lastName !== undefined) {
        updateData.lastName = await protectData(profileData.lastName, "name");
      }
      if (profileData.otherName !== undefined) {
        updateData.otherName = await protectData(profileData.otherName, "name");
      }
      if (profileData.phone !== undefined) {
        updateData.phone = await protectData(profileData.phone, "phone");
        const protectedPhone = await protectData(profileData.phone, "phone");
        updateData.phoneSearchHash = protectedPhone.searchHash;
      }
      if (profileData.department !== undefined) {
        updateData.department = profileData.department;
      }
      if (profileData.institution !== undefined) {
        updateData.institution = profileData.institution;
      }
      if (profileData.qualification !== undefined) {
        updateData.qualification = profileData.qualification;
      }
      if (profileData.specialization !== undefined) {
        updateData.specialization = profileData.specialization;
      }
      if (profileData.experience !== undefined) {
        updateData.experience = profileData.experience;
      }
      if (profileData.photo !== undefined) {
        updateData.photo = profileData.photo;
      }

      // Update teacher profile
      await prisma.teacher.update({
        where: { id: teacherId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      // Log profile update
      await prisma.auditLog.create({
        data: {
          userId: teacher.userId,
          action: "PROFILE_UPDATED",
          resourceType: "USER",
          resourceId: teacherId,
          details: {
            updatedFields: Object.keys(profileData),
          },
        },
      });

      return {
        success: true,
        message: "Teacher profile updated successfully",
      };
    } catch (error) {
      console.error("Error updating teacher profile:", error);
      throw error;
    }
  }

  /**
   * Authenticate teacher
   */
  static async authenticateTeacher(
    email: string,
    password: string
  ): Promise<TeacherUser> {
    try {
      // Find teacher by email
      const protectedEmail = await protectData(email, "email");

      const teacher = await prisma.teacher.findFirst({
        where: {
          user: {
            email: protectedEmail.encrypted,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              passwordHash: true,
              isActive: true,
              emailVerified: true,
              lastLoginAt: true,
              createdAt: true,
              role: true,
              accountLocked: true,
              lockedUntil: true,
              failedLoginAttempts: true,
              lastFailedLoginAt: true,
            },
          },
        },
      });

      if (!teacher) {
        throw new Error("Invalid email or password");
      }

      // Check if account is locked
      if (
        teacher.user.accountLocked &&
        teacher.user.lockedUntil &&
        teacher.user.lockedUntil > new Date()
      ) {
        throw new Error(
          "Account is temporarily locked. Please try again later."
        );
      }

      // Verify password
      if (!teacher.user.passwordHash) {
        throw new Error("Invalid email or password");
      }
      const isValidPassword = await verifyPassword(
        password,
        teacher.user.passwordHash
      );

      if (!isValidPassword) {
        // Increment failed attempts
        const failedAttempts = teacher.user.failedLoginAttempts + 1;
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
          where: { id: teacher.user.id },
          data: updateData,
        });

        throw new Error("Invalid email or password");
      }

      // Reset failed attempts on successful login
      if (teacher.user.failedLoginAttempts > 0) {
        await prisma.user.update({
          where: { id: teacher.user.id },
          data: {
            failedLoginAttempts: 0,
            lastFailedLoginAt: null,
            accountLocked: false,
            lockedUntil: null,
          },
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: teacher.user.id },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
        },
      });

      // Log successful login
      await prisma.auditLog.create({
        data: {
          userId: teacher.user.id,
          action: "USER_LOGGED_IN",
          resourceType: "USER",
          resourceId: teacher.id,
          details: {
            email: protectedEmail.encrypted,
            role: "TEACHER",
          },
        },
      });

      // Decrypt sensitive data
      const decryptedTeacher = {
        ...teacher,
        email: await this.decryptField(teacher.user.email, "email"),
        phone: await this.decryptField(teacher.phone, "phone"),
        firstName: await this.decryptField(teacher.firstName, "name"),
        lastName: await this.decryptField(teacher.lastName, "name"),
        otherName: teacher.otherName
          ? await this.decryptField(teacher.otherName, "name")
          : null,
        department: teacher.department,
        institution: teacher.institution,
        qualification: teacher.qualification,
        specialization: teacher.specialization,
        experience: teacher.experience,
        dateJoined: teacher.dateJoined,
        isActive: teacher.user.isActive,
        photo: teacher.photo,
        // Add required properties from user
        role: "TEACHER",
        name: teacher.user.name ?? "",
        emailVerified: teacher.user.emailVerified,
        lastLoginAt: teacher.user.lastLoginAt,
        createdAt: teacher.user.createdAt,
      };

      return decryptedTeacher as TeacherUser;
    } catch (error) {
      console.error("Teacher authentication error:", error);
      throw error;
    }
  }

  /**
   * Get all teachers with pagination
   */
  static async getAllTeachers(
    page: number = 1,
    limit: number = 10,
    filters?: {
      department?: string;
      isActive?: boolean;
    }
  ) {
    try {
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (filters?.department) {
        where.department = filters.department;
      }
      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      const [teachers, total] = await Promise.all([
        prisma.teacher.findMany({
          where,
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                emailVerified: true,
                lastLoginAt: true,
                createdAt: true,
              },
            },
          },
        }),
        prisma.teacher.count({ where }),
      ]);

      // Decrypt sensitive data for each teacher
      const decryptedTeachers = await Promise.all(
        teachers.map(async (teacher) => ({
          ...teacher,
          email: await this.decryptField(teacher.user.email, "email"),
          phone: await this.decryptField(teacher.phone, "phone"),
          firstName: await this.decryptField(teacher.firstName, "name"),
          lastName: await this.decryptField(teacher.lastName, "name"),
          otherName: teacher.otherName
            ? await this.decryptField(teacher.otherName, "name")
            : null,
          department: teacher.department,
          institution: teacher.institution,
          qualification: teacher.qualification,
          specialization: teacher.specialization,
          experience: teacher.experience,
          dateJoined: teacher.dateJoined,
          isActive: teacher.user.isActive,
          photo: teacher.photo,
        }))
      );

      return {
        teachers: decryptedTeachers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting all teachers:", error);
      throw error;
    }
  }

  /**
   * Search teachers
   */
  static async searchTeachers(
    query: string,
    page: number = 1,
    limit: number = 10,
    filters?: {
      department?: string;
    }
  ) {
    try {
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      if (filters?.department) {
        where.department = filters.department;
      }

      // For a real implementation, you would need to use a search service
      // This is a simplified version that searches by name
      const [teachers, total] = await Promise.all([
        prisma.teacher.findMany({
          where: {
            OR: [
              {
                user: {
                  name: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
              {
                department: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            ],
          },
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                emailVerified: true,
                lastLoginAt: true,
                createdAt: true,
              },
            },
          },
        }),
        prisma.teacher.count({ where }),
      ]);

      // Decrypt sensitive data for each teacher
      const decryptedTeachers = await Promise.all(
        teachers.map(async (teacher) => ({
          ...teacher,
          email: await this.decryptField(teacher.user.email, "email"),
          phone: await this.decryptField(teacher.phone, "phone"),
          firstName: await this.decryptField(teacher.firstName, "name"),
          lastName: await this.decryptField(teacher.lastName, "name"),
          otherName: teacher.otherName
            ? await this.decryptField(teacher.otherName, "name")
            : null,
          department: teacher.department,
          institution: teacher.institution,
          qualification: teacher.qualification,
          specialization: teacher.specialization,
          experience: teacher.experience,
          dateJoined: teacher.dateJoined,
          isActive: teacher.user.isActive,
          photo: teacher.photo,
        }))
      );

      return {
        teachers: decryptedTeachers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error searching teachers:", error);
      throw error;
    }
  }

  /**
   * Helper method to decrypt field
   */
  private static async decryptField(
    encryptedField: string,
    fieldType: "email" | "phone" | "name"
  ): Promise<string> {
    try {
      const { unprotectData } = await import("@/lib/security/dataProtection");
      return await unprotectData(encryptedField, fieldType);
    } catch (error) {
      console.error("Error decrypting field:", error);
      throw error;
    }
  }
}
