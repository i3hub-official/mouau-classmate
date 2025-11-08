// File: lib/services/teachers/courseService.ts
import { prisma } from "@/lib/server/prisma";

export interface CreateCourseData {
  code: string;
  title: string;
  description?: string;
  credits?: number;
  level?: number;
  semester?: number;
  courseOutline?: string;
  instructorId: string;
}

export class TeacherCourseService {
  /**
   * Create a new course
   */
  static async createCourse(data: CreateCourseData) {
    try {
      // Check if course code already exists
      const existingCourse = await prisma.course.findUnique({
        where: { code: data.code },
      });

      if (existingCourse) {
        throw new Error("A course with this code already exists");
      }

      const course = await prisma.course.create({
        data: {
          code: data.code,
          title: data.title,
          description: data.description,
          credits: data.credits || 3,
          level: data.level || 100,
          semester: data.semester || 1,
          courseOutline: data.courseOutline,
          instructorId: data.instructorId,
          creatorId: data.instructorId,
        },
        include: {
          instructor: true,
          enrollments: {
            include: {
              student: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: data.instructorId,
          action: "COURSE_CREATED",
          resourceType: "COURSE",
          resourceId: course.id,
          details: {
            courseCode: data.code,
            title: data.title,
            level: data.level,
            semester: data.semester,
          },
        },
      });

      return course;
    } catch (error) {
      console.error("Create course error:", error);
      throw error;
    }
  }

  /**
   * Get teacher's courses
   */
  static async getTeacherCourses(
    teacherId: string,
    filters?: {
      isActive?: boolean;
      level?: number;
      semester?: number;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where = {
      OR: [{ instructorId: teacherId }, { creatorId: teacherId }],
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.level && { level: filters.level }),
      ...(filters?.semester && { semester: filters.semester }),
    };

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          instructor: true,
          enrollments: {
            include: {
              student: true,
            },
          },
          assignments: {
            include: {
              submissions: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.course.count({ where }),
    ]);

    // Calculate course statistics
    const coursesWithStats = courses.map((course) => ({
      ...course,
      stats: {
        totalStudents: course.enrollments.length,
        totalAssignments: course.assignments.length,
        pendingSubmissions: course.assignments.reduce(
          (acc, assignment) =>
            acc + assignment.submissions.filter((s) => !s.isGraded).length,
          0
        ),
        averageScore: this.calculateCourseAverage(course),
      },
    }));

    return {
      courses: coursesWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get course details with comprehensive data
   */
  static async getCourseDetails(courseId: string, teacherId: string) {
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [{ instructorId: teacherId }, { creatorId: teacherId }],
      },
      include: {
        instructor: true,
        creator: true,
        enrollments: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
        assignments: {
          include: {
            submissions: {
              include: {
                student: true,
              },
            },
          },
        },
        lectures: {
          orderBy: { orderIndex: "asc" },
        },
        portfolios: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!course) {
      throw new Error("Course not found or access denied");
    }

    // Calculate comprehensive course statistics
    const stats = {
      totalStudents: course.enrollments.length,
      totalAssignments: course.assignments.length,
      totalLectures: course.lectures.length,
      totalPortfolios: course.portfolios.length,
      pendingSubmissions: course.assignments.reduce(
        (acc, assignment) =>
          acc + assignment.submissions.filter((s) => !s.isGraded).length,
        0
      ),
      averageScore: this.calculateCourseAverage(course),
      enrollmentStats: this.calculateEnrollmentStats(course.enrollments),
      assignmentStats: this.calculateAssignmentStats(course.assignments),
    };

    return {
      ...course,
      stats,
    };
  }

  /**
   * Update course information
   */
  static async updateCourse(
    courseId: string,
    teacherId: string,
    data: Partial<CreateCourseData>
  ) {
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [{ instructorId: teacherId }, { creatorId: teacherId }],
      },
    });

    if (!course) {
      throw new Error("Course not found or access denied");
    }

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data,
      include: {
        instructor: true,
        enrollments: {
          include: {
            student: true,
          },
        },
      },
    });

    return updatedCourse;
  }

  /**
   * Toggle course active status
   */
  static async toggleCourseActive(
    courseId: string,
    teacherId: string,
    isActive: boolean
  ) {
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [{ instructorId: teacherId }, { creatorId: teacherId }],
      },
    });

    if (!course) {
      throw new Error("Course not found or access denied");
    }

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: { isActive },
      include: {
        instructor: true,
      },
    });

    return updatedCourse;
  }

  /**
   * Calculate course average score
   */
  private static calculateCourseAverage(course: any): number {
    const allScores = course.assignments.flatMap((assignment: any) =>
      assignment.submissions
        .filter((s: any) => s.isGraded && s.score !== null)
        .map((s: any) => s.score)
    );

    if (allScores.length === 0) return 0;

    const average =
      allScores.reduce((acc: number, score: number) => acc + score, 0) /
      allScores.length;
    return Math.round(average * 100) / 100;
  }

  /**
   * Calculate enrollment statistics
   */
  private static calculateEnrollmentStats(enrollments: any[]) {
    const completed = enrollments.filter((e) => e.isCompleted).length;
    const inProgress = enrollments.length - completed;

    return {
      total: enrollments.length,
      completed,
      inProgress,
      completionRate:
        enrollments.length > 0 ? (completed / enrollments.length) * 100 : 0,
    };
  }

  /**
   * Calculate assignment statistics
   */
  private static calculateAssignmentStats(assignments: any[]) {
    const published = assignments.filter((a) => a.isPublished).length;
    const gradedSubmissions = assignments.reduce(
      (acc, assignment) =>
        acc + assignment.submissions.filter((s: any) => s.isGraded).length,
      0
    );
    const totalSubmissions = assignments.reduce(
      (acc, assignment) => acc + assignment.submissions.length,
      0
    );

    return {
      total: assignments.length,
      published,
      totalSubmissions,
      gradedSubmissions,
      gradingProgress:
        totalSubmissions > 0 ? (gradedSubmissions / totalSubmissions) * 100 : 0,
    };
  }
}
