// lib/services/courseService.ts
import { prisma } from "@/lib/server/prisma";

interface CourseWithDetails {
  id: string;
  code: string;
  title: string;
  description: string | null;
  credits: number;
  level: number;
  semester: number;
  courseOutline: string | null;
  isActive: boolean;
  instructor: {
    firstName: string;
    lastName: string;
    otherName: string | null;
  } | null;
  enrollments: {
    progress: number;
    isCompleted: boolean;
    studentId: string;
  }[];
  assignments: {
    dueDate: Date;
    isPublished: boolean;
    submissions: {
      submittedAt: Date | null;
      isGraded: boolean;
    }[];
  }[];
  _count: {
    lectures: number;
    assignments: number;
  };
}

interface StudentCoursesResponse {
  enrolledCourses: CourseWithDetails[];
  availableCourses: CourseWithDetails[];
  departmentCourses: CourseWithDetails[];
}

export class CourseService {
  /**
   * Get courses for a student based on their department and college
   */
  static async getStudentCourses(
    userId: string
  ): Promise<StudentCoursesResponse> {
    try {
      // Get student information
      const student = await prisma.student.findFirst({
        where: { userId },
        select: {
          id: true,
          department: true,
          college: true,
          enrollments: {
            select: {
              courseId: true,
            },
          },
        },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      // Get all active courses with all required relations
      const allCourses = await prisma.course.findMany({
        where: {
          isActive: true,
        },
        include: {
          // Include instructor relation
          instructor: {
            select: {
              firstName: true,
              lastName: true,
              otherName: true,
            },
          },
          // Include enrollments relation
          enrollments: {
            where: {
              studentId: student.id,
            },
            select: {
              progress: true,
              isCompleted: true,
              studentId: true,
            },
          },
          // Include assignments relation
          assignments: {
            where: {
              isPublished: true,
            },
            include: {
              submissions: {
                where: {
                  studentId: student.id,
                },
                select: {
                  submittedAt: true,
                  isGraded: true,
                },
              },
            },
          },
          // Include counts
          _count: {
            select: {
              lectures: {
                where: {
                  isPublished: true,
                },
              },
              assignments: {
                where: {
                  isPublished: true,
                },
              },
            },
          },
        },
        orderBy: [{ level: "asc" }, { semester: "asc" }, { code: "asc" }],
      });

      // Cast the result to CourseWithDetails to satisfy TypeScript
      const coursesWithDetails = allCourses as unknown as CourseWithDetails[];

      // Separate enrolled and available courses
      const enrolledCourses = coursesWithDetails.filter(
        (course) => course.enrollments.length > 0
      );

      const availableCourses = coursesWithDetails.filter(
        (course) => course.enrollments.length === 0
      );

      return {
        enrolledCourses,
        availableCourses,
        departmentCourses: coursesWithDetails,
      };
    } catch (error) {
      console.error("Error fetching student courses:", error);
      throw error;
    }
  }

  /**
   * Get course details by ID
   */
  static async getCourseById(courseId: string, userId?: string) {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          instructor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              otherName: true,
              email: true,
              department: true,
            },
          },
          creator: {
            select: {
              firstName: true,
              lastName: true,
              otherName: true,
            },
          },
          lectures: {
            where: {
              isPublished: true,
            },
            orderBy: {
              orderIndex: "asc",
            },
            include: {
              submissions: userId
                ? {
                    where: {
                      student: {
                        userId: userId,
                      },
                    },
                  }
                : false,
            },
          },
          assignments: {
            where: {
              isPublished: true,
            },
            orderBy: {
              dueDate: "asc",
            },
            include: {
              submissions: userId
                ? {
                    where: {
                      student: {
                        userId: userId,
                      },
                    },
                    orderBy: {
                      submittedAt: "desc",
                    },
                    take: 1,
                  }
                : false,
              teacher: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          enrollments: userId
            ? {
                where: {
                  student: {
                    userId: userId,
                  },
                },
              }
            : false,
          _count: {
            select: {
              lectures: {
                where: {
                  isPublished: true,
                },
              },
              assignments: {
                where: {
                  isPublished: true,
                },
              },
              enrollments: true,
            },
          },
        },
      });

      return course;
    } catch (error) {
      console.error("Error fetching course:", error);
      throw error;
    }
  }

  /**
   * Enroll student in a course
   */
  static async enrollInCourse(courseId: string, userId: string) {
    try {
      // Get student ID
      const student = await prisma.student.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId: courseId,
          },
        },
      });

      if (existingEnrollment) {
        throw new Error("Already enrolled in this course");
      }

      // Create enrollment
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId: student.id,
          courseId: courseId,
          dateEnrolled: new Date(),
        },
        include: {
          course: {
            include: {
              instructor: true,
            },
          },
        },
      });

      // Log enrollment activity
      await prisma.auditLog.create({
        data: {
          userId: userId,
          action: "ENROLLMENT_CREATED",
          resourceType: "ENROLLMENT",
          resourceId: enrollment.id,
          details: {
            courseCode: enrollment.course.code,
            courseTitle: enrollment.course.title,
          },
          ipAddress: "system",
          userAgent: "CourseService",
        },
      });

      return enrollment;
    } catch (error) {
      console.error("Error enrolling in course:", error);
      throw error;
    }
  }

  /**
   * Get course progress for a student
   */
  static async getCourseProgress(courseId: string, userId: string) {
    try {
      const student = await prisma.student.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId: courseId,
          },
        },
        include: {
          course: {
            include: {
              lectures: {
                where: { isPublished: true },
                include: {
                  submissions: {
                    where: { studentId: student.id },
                  },
                },
              },
              assignments: {
                where: { isPublished: true },
                include: {
                  submissions: {
                    where: { studentId: student.id },
                  },
                },
              },
            },
          },
        },
      });

      if (!enrollment) {
        return null;
      }

      const totalLectures = enrollment.course.lectures.length;
      const completedLectures = enrollment.course.lectures.filter(
        (lecture) => lecture.submissions.length > 0
      ).length;

      const totalAssignments = enrollment.course.assignments.length;
      const submittedAssignments = enrollment.course.assignments.filter(
        (assignment) => assignment.submissions.length > 0
      ).length;
      const gradedAssignments = enrollment.course.assignments.filter(
        (assignment) => assignment.submissions.some((sub) => sub.isGraded)
      ).length;

      const lectureProgress =
        totalLectures > 0 ? (completedLectures / totalLectures) * 100 : 0;
      const assignmentProgress =
        totalAssignments > 0
          ? (submittedAssignments / totalAssignments) * 100
          : 0;

      const overallProgress = (lectureProgress + assignmentProgress) / 2;

      return {
        enrollment,
        progress: {
          overall: overallProgress,
          lectures: {
            completed: completedLectures,
            total: totalLectures,
            percentage: lectureProgress,
          },
          assignments: {
            submitted: submittedAssignments,
            graded: gradedAssignments,
            total: totalAssignments,
            percentage: assignmentProgress,
          },
        },
      };
    } catch (error) {
      console.error("Error fetching course progress:", error);
      throw error;
    }
  }

  /**
   * Search courses by department and filters
   */
  static async searchCourses(filters: {
    department?: string;
    level?: number;
    semester?: number;
    searchTerm?: string;
  }) {
    try {
      const where: any = {
        isActive: true,
      };

      if (filters.level) {
        where.level = filters.level;
      }

      if (filters.semester) {
        where.semester = filters.semester;
      }

      if (filters.searchTerm) {
        where.OR = [
          { code: { contains: filters.searchTerm, mode: "insensitive" } },
          { title: { contains: filters.searchTerm, mode: "insensitive" } },
          {
            description: { contains: filters.searchTerm, mode: "insensitive" },
          },
        ];
      }

      const courses = await prisma.course.findMany({
        where,
        include: {
          instructor: {
            select: {
              firstName: true,
              lastName: true,
              otherName: true,
            },
          },
          enrollments: {
            select: {
              progress: true,
              isCompleted: true,
              studentId: true,
            },
          },
          assignments: {
            where: {
              isPublished: true,
            },
            include: {
              submissions: {
                select: {
                  submittedAt: true,
                  isGraded: true,
                },
              },
            },
          },
          _count: {
            select: {
              lectures: {
                where: {
                  isPublished: true,
                },
              },
              assignments: {
                where: {
                  isPublished: true,
                },
              },
              enrollments: true,
            },
          },
        },
        orderBy: [{ level: "asc" }, { semester: "asc" }, { code: "asc" }],
      });

      return courses as unknown as CourseWithDetails[];
    } catch (error) {
      console.error("Error searching courses:", error);
      throw error;
    }
  }
}
