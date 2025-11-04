// lib/services/dashboardService.ts
import { prisma } from "@/lib/server/prisma";

interface DashboardStats {
  activeCourses: number;
  pendingAssignments: number;
  upcomingDeadlines: number;
  classmatesCount: number;
  recentActivities: any[];
  userInfo: any;
}

interface RecentActivity {
  id: string;
  title: string;
  description: string;
  type: "assignment" | "lecture" | "schedule" | "notification";
  courseCode: string;
  courseName: string;
  timestamp: Date;
  icon: string;
  color: string;
}

export class DashboardService {
  /**
   * Get comprehensive dashboard data for a student
   */
  static async getStudentDashboard(userId: string): Promise<DashboardStats> {
    try {
      // Get student data
      const student = await prisma.student.findFirst({
        where: { userId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          enrollments: {
            include: {
              course: true,
            },
          },
        },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      // Get active courses count
      const activeCourses = await prisma.enrollment.count({
        where: {
          studentId: student.id,
          isCompleted: false,
        },
      });

      // Get pending assignments (assignments with due date in future and no submission or not graded)
      const pendingAssignments = await prisma.assignment.count({
        where: {
          course: {
            enrollments: {
              some: {
                studentId: student.id,
              },
            },
          },
          dueDate: {
            gt: new Date(),
          },
          isPublished: true,
          OR: [
            {
              submissions: {
                none: {
                  studentId: student.id,
                },
              },
            },
            {
              submissions: {
                some: {
                  studentId: student.id,
                  isGraded: false,
                },
              },
            },
          ],
        },
      });

      // Get upcoming deadlines (assignments due in next 7 days)
      const upcomingDeadlines = await prisma.assignment.count({
        where: {
          course: {
            enrollments: {
              some: {
                studentId: student.id,
              },
            },
          },
          dueDate: {
            gt: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          },
          isPublished: true,
        },
      });

      // Get classmates count (students in same courses)
      const classmatesCount = await prisma.student.count({
        where: {
          enrollments: {
            some: {
              course: {
                enrollments: {
                  some: {
                    studentId: student.id,
                  },
                },
              },
            },
          },
          id: {
            not: student.id,
          },
        },
      });

      // Get recent activities
      const recentActivities = await this.getRecentActivities(student.id);

      return {
        activeCourses,
        pendingAssignments,
        upcomingDeadlines,
        classmatesCount,
        recentActivities,
        userInfo: {
          id: student.userId,
          name: student.user.name,
          email: student.user.email,
          matricNumber: student.matricNumber,
          department: student.department,
          college: student.college,
          course: student.course,
        },
      };
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      throw error;
    }
  }

  /**
   * Get recent activities for a student
   */
  private static async getRecentActivities(
    studentId: string
  ): Promise<RecentActivity[]> {
    const activities: RecentActivity[] = [];

    // Get recent assignments
    const recentAssignments = await prisma.assignment.findMany({
      where: {
        course: {
          enrollments: {
            some: {
              studentId: studentId,
            },
          },
        },
        isPublished: true,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      include: {
        course: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    // Get recent lectures
    const recentLectures = await prisma.lecture.findMany({
      where: {
        course: {
          enrollments: {
            some: {
              studentId: studentId,
            },
          },
        },
        isPublished: true,
        publishedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        course: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 5,
    });

    // Get schedule changes (this would need additional logic based on your scheduling system)
    // For now, we'll use assignment due date changes as schedule changes

    // Convert assignments to activities
    activities.push(
      ...recentAssignments.map((assignment) => ({
        id: assignment.id,
        title: "New assignment posted",
        description: assignment.title,
        type: "assignment" as const,
        courseCode: assignment.course.code,
        courseName: assignment.course.title,
        timestamp: assignment.createdAt,
        icon: "FileText",
        color: "blue",
      }))
    );

    // Convert lectures to activities
    activities.push(
      ...recentLectures.map((lecture) => ({
        id: lecture.id,
        title: "Lecture notes updated",
        description: lecture.title,
        type: "lecture" as const,
        courseCode: lecture.course.code,
        courseName: lecture.course.title,
        timestamp: lecture.publishedAt || lecture.createdAt,
        icon: "BookOpen",
        color: "green",
      }))
    );

    // Sort all activities by timestamp and return top 5
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);
  }

  /**
   * Get student's enrolled courses
   */
  static async getStudentCourses(userId: string) {
    const student = await prisma.student.findFirst({
      where: { userId },
      include: {
        enrollments: {
          include: {
            course: {
              include: {
                instructor: true,
                assignments: {
                  where: {
                    isPublished: true,
                  },
                  orderBy: {
                    dueDate: "asc",
                  },
                  take: 3,
                },
              },
            },
          },
          where: {
            isCompleted: false,
          },
        },
      },
    });

    return student?.enrollments.map((enrollment) => enrollment.course) || [];
  }

  /**
   * Get upcoming assignments with deadlines
   */
  static async getUpcomingAssignments(userId: string) {
    const student = await prisma.student.findFirst({
      where: { userId },
    });

    if (!student) return [];

    return await prisma.assignment.findMany({
      where: {
        course: {
          enrollments: {
            some: {
              studentId: student.id,
            },
          },
        },
        dueDate: {
          gt: new Date(),
        },
        isPublished: true,
      },
      include: {
        course: true,
        submissions: {
          where: {
            studentId: student.id,
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 10,
    });
  }

  /**
   * Get student's academic progress
   */
  static async getAcademicProgress(userId: string) {
    const student = await prisma.student.findFirst({
      where: { userId },
      include: {
        enrollments: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!student) return null;

    const totalCourses = student.enrollments.length;
    const completedCourses = student.enrollments.filter(
      (e) => e.isCompleted
    ).length;
    const averageProgress =
      student.enrollments.reduce((acc, curr) => acc + curr.progress, 0) /
        totalCourses || 0;
    const averageScore =
      student.enrollments.reduce((acc, curr) => acc + (curr.score || 0), 0) /
        totalCourses || 0;

    return {
      totalCourses,
      completedCourses,
      inProgressCourses: totalCourses - completedCourses,
      averageProgress,
      averageScore,
      enrollments: student.enrollments,
    };
  }
}
