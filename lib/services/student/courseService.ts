// lib/services/student/courseService.ts
import { prisma } from "@/lib/server/prisma";
import { Course, Enrollment, EnrollmentWithCourse } from "@/lib/types/student/index";
import { AuditAction } from "@prisma/client";

export class StudentCourseService {
  /**
   * Get all available courses
   */
  static async getAllCourses(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where: { isActive: true },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.course.count({ where: { isActive: true } }),
      ]);

      return {
        courses: courses as Course[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting all courses:", error);
      throw error;
    }
  }

  /**
   * Get course by ID
   */
  static async getCourseById(id: string): Promise<Course | null> {
    try {
      const course = await prisma.course.findUnique({
        where: { id },
      });

      return course as Course;
    } catch (error) {
      console.error("Error getting course by ID:", error);
      throw error;
    }
  }

  /**
   * Get courses by department
   */
  static async getCoursesByDepartment(department: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where: { 
            isActive: true,
            // Note: In a real implementation, you might need to join with a department table
            // or have a department field in the course table
          },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.course.count({ where: { isActive: true } }),
      ]);

      return {
        courses: courses as Course[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting courses by department:", error);
      throw error;
    }
  }

  /**
   * Get courses by level and semester
   */
  static async getCoursesByLevelAndSemester(level: number, semester: number, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where: { 
            isActive: true,
            level,
            semester,
          },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.course.count({ 
          where: { 
            isActive: true,
            level,
            semester,
          },
        }),
      ]);

      return {
        courses: courses as Course[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting courses by level and semester:", error);
      throw error;
    }
  }

  /**
   * Get student enrollments
   */
  static async getStudentEnrollments(studentId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [enrollments, total] = await Promise.all([
        prisma.enrollment.findMany({
          where: { studentId },
          skip,
          take: limit,
          include: {
            course: true,
          },
          orderBy: { dateEnrolled: "desc" },
        }),
        prisma.enrollment.count({ where: { studentId } }),
      ]);

      return {
        enrollments: enrollments as EnrollmentWithCourse[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting student enrollments:", error);
      throw error;
    }
  }

  /**
   * Get active student enrollments
   */
  static async getActiveStudentEnrollments(studentId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [enrollments, total] = await Promise.all([
        prisma.enrollment.findMany({
          where: { 
            studentId,
            isCompleted: false,
          },
          skip,
          take: limit,
          include: {
            course: true,
          },
          orderBy: { dateEnrolled: "desc" },
        }),
        prisma.enrollment.count({ 
          where: { 
            studentId,
            isCompleted: false,
          },
        }),
      ]);

      return {
        enrollments: enrollments as EnrollmentWithCourse[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting active student enrollments:", error);
      throw error;
    }
  }

  /**
   * Get completed student enrollments
   */
  static async getCompletedStudentEnrollments(studentId: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [enrollments, total] = await Promise.all([
        prisma.enrollment.findMany({
          where: { 
            studentId,
            isCompleted: true,
          },
          skip,
          take: limit,
          include: {
            course: true,
          },
          orderBy: { completionDate: "desc" },
        }),
        prisma.enrollment.count({ 
          where: { 
            studentId,
            isCompleted: true,
          },
        }),
      ]);

      return {
        enrollments: enrollments as EnrollmentWithCourse[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting completed student enrollments:", error);
      throw error;
    }
  }

  /**
   * Enroll student in a course
   */
  static async enrollStudent(studentId: string, courseId: string) {
    try {
      // Check if student is already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
      });

      if (existingEnrollment) {
        throw new Error("Student is already enrolled in this course");
      }

      // Check if course exists and is active
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      if (!course.isActive) {
        throw new Error("Course is not available for enrollment");
      }

      // Create enrollment
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId,
          courseId,
          dateEnrolled: new Date(),
        },
        include: {
          course: true,
        },
      });

      // Log the enrollment
      await prisma.auditLog.create({
        data: {
          action: "ENROLLMENT_CREATED",
          resourceType: "ENROLLMENT",
          resourceId: enrollment.id,
          details: {
            studentId,
            courseId,
            courseCode: course.code,
          },
        },
      });

      return {
        success: true,
        enrollment: enrollment as EnrollmentWithCourse,
        message: "Successfully enrolled in course",
      };
    } catch (error) {
      console.error("Error enrolling student:", error);
      throw error;
    }
  }

  /**
   * Update enrollment progress
   */
  static async updateEnrollmentProgress(enrollmentId: string, progress: number) {
    try {
      // Validate progress value
      if (progress < 0 || progress > 100) {
        throw new Error("Progress must be between 0 and 100");
      }

      const enrollment = await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { 
          progress,
          lastAccessedAt: new Date(),
        },
        include: {
          course: true,
        },
      });

      // Check if enrollment is now complete
      if (progress >= 100 && !enrollment.isCompleted) {
        await prisma.enrollment.update({
          where: { id: enrollmentId },
          data: { 
            isCompleted: true,
            completionDate: new Date(),
          },
        });

        // Log the completion 
        await prisma.auditLog.create({
          data: {
            action: "COURSE_COMPLETED",
            resourceType: "ENROLLMENT",
            resourceId: enrollmentId,
            details: {
              courseId: enrollment.courseId,
              courseCode: enrollment.course.code,
              studentId: enrollment.studentId,
            },
          },
        });
      }

      return {
        success: true,
        enrollment: {
          ...enrollment,
          progress,
          isCompleted: progress >= 100 ? true : enrollment.isCompleted,
          completionDate: progress >= 100 ? new Date() : enrollment.completionDate,
        } as EnrollmentWithCourse,
        message: "Progress updated successfully",
      };
    } catch (error) {
      console.error("Error updating enrollment progress:", error);
      throw error;
    }
  }

  /**
   * Search courses
   */
  static async searchCourses(query: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where: {
            isActive: true,
            OR: [
              { code: { contains: query, mode: "insensitive" } },
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.course.count({
          where: {
            isActive: true,
            OR: [
              { code: { contains: query, mode: "insensitive" } },
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          },
        }),
      ]);

      return {
        courses: courses as Course[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error searching courses:", error);
      throw error;
    }
  }
}