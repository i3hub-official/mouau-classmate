// File: lib/services/teachers/dashboardService.ts
import { prisma } from "@/lib/server/prisma";

export interface DashboardStats {
  overview: {
    totalCourses: number;
    totalStudents: number;
    totalAssignments: number;
    pendingGrading: number;
  };
  recentActivity: any[];
  upcomingDeadlines: any[];
  coursePerformance: any[];
  quickActions: {
    label: string;
    icon: string;
    href: string;
    description: string;
  }[];
}

export class TeacherDashboardService {
  /**
   * Get comprehensive dashboard data for teacher
   */
  static async getDashboardData(teacherId: string): Promise<DashboardStats> {
    const [
      courses,
      assignments,
      ungradedSubmissions,
      recentSubmissions,
      upcomingAssignments,
      recentActivity
    ] = await Promise.all([
      // Get teacher's courses with enrollment counts
      prisma.course.findMany({
        where: {
          OR: [
            { instructorId: teacherId },
            { creatorId: teacherId },
          ],
          isActive: true,
        },
        include: {
          enrollments: {
            where: {
              student: {
                user: {
                  isActive: true,
                },
              },
            },
          },
        },
      }),

      // Get all assignments
      prisma.assignment.findMany({
        where: {
          teacherId: teacherId,
        },
      }),

      // Get ungraded submissions count
      prisma.assignmentSubmission.count({
        where: {
          isGraded: false,
          assignment: {
            teacherId: teacherId,
          },
        },
      }),

      // Get recent submissions (last 7 days)
      prisma.assignmentSubmission.findMany({
        where: {
          assignment: {
            teacherId: teacherId,
          },
          submittedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          student: true,
          assignment: {
            include: {
              course: true,
            },
          },
        },
        orderBy: {
          submittedAt: 'desc',
        },
        take: 10,
      }),

      // Get upcoming assignment deadlines (next 7 days)
      prisma.assignment.findMany({
        where: {
          teacherId: teacherId,
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          isPublished: true,
        },
        include: {
          course: true,
          submissions: true,
        },
        orderBy: {
          dueDate: 'asc',
        },
        take: 10,
      }),

      // Get recent teacher activity
      prisma.auditLog.findMany({
        where: {
          userId: teacherId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 15,
      }),
    ]);

    // Calculate course performance metrics
    const coursePerformance = await Promise.all(
      courses.map(async (course) => {
        const courseAssignments = await prisma.assignment.findMany({
          where: {
            courseId: course.id,
            isPublished: true,
          },
          include: {
            submissions: {
              where: {
                isGraded: true,
              },
            },
          },
        });

        const totalSubmissions = courseAssignments.reduce(
          (acc, assignment) => acc + assignment.submissions.length,
          0
        );

        const averageScores = courseAssignments
          .filter(assignment => assignment.submissions.length > 0)
          .map(assignment => {
            const avgScore = assignment.submissions.reduce(
              (acc, submission) => acc + (submission.score || 0),
              0
            ) / assignment.submissions.length;
            return (avgScore / assignment.maxScore) * 100;
          });

        const overallAverage = averageScores.length > 0
          ? averageScores.reduce((acc, score) => acc + score, 0) / averageScores.length
          : 0;

        return {
          id: course.id,
          code: course.code,
          title: course.title,
          totalStudents: course.enrollments.length,
          totalAssignments: courseAssignments.length,
          totalSubmissions,
          averageScore: Math.round(overallAverage * 100) / 100,
          completionRate: course.enrollments.filter(e => e.isCompleted).length,
        };
      })
    );

    // Quick actions for teacher
    const quickActions = [
      {
        label: "Create Assignment",
        icon: "assignment",
        href: "/teacher/assignments/create",
        description: "Create new assignment for your course",
      },
      {
        label: "Grade Submissions",
        icon: "grading",
        href: "/teacher/grading",
        description: "Review and grade student submissions",
      },
      {
        label: "Manage Courses",
        icon: "course",
        href: "/teacher/courses",
        description: "View and manage your courses",
      },
      {
        label: "Student Progress",
        icon: "analytics",
        href: "/teacher/analytics",
        description: "View student performance analytics",
      },
    ];

    return {
      overview: {
        totalCourses: courses.length,
        totalStudents: courses.reduce((acc, course) => acc + course.enrollments.length, 0),
        totalAssignments: assignments.length,
        pendingGrading: ungradedSubmissions,
      },
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        action: activity.action,
        details: activity.details,
        createdAt: activity.createdAt,
        resourceType: activity.resourceType,
      })),
      upcomingDeadlines: upcomingAssignments.map(assignment => ({
        id: assignment.id,
        title: assignment.title,
        course: assignment.course.code,
        dueDate: assignment.dueDate,
        totalSubmissions: assignment.submissions.length,
        pendingGrading: assignment.submissions.filter(s => !s.isGraded).length,
      })),
      coursePerformance,
      quickActions,
    };
  }

  /**
   * Get teacher notifications
   */
  static async getNotifications(teacherId: string, filters?: {
    isRead?: boolean;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const teacher = await prisma.teacher.findUnique({
      where: { userId: teacherId },
    });

    if (!teacher) {
      throw new Error("Teacher not found");
    }

    const where = {
      userId: teacherId,
      ...(filters?.isRead !== undefined && { isRead: filters.isRead }),
      ...(filters?.type && { type: filters.type as any }), // Cast to enum if needed
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string, teacherId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: teacherId,
      },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return updatedNotification;
  }

  /**
   * Mark all notifications as read
   */
  static async markAllNotificationsAsRead(teacherId: string) {
    await prisma.notification.updateMany({
      where: {
        userId: teacherId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true, message: "All notifications marked as read" };
  }

  /**
   * Get teacher calendar events
   */
  static async getCalendarEvents(teacherId: string, startDate: Date, endDate: Date) {
    const assignments = await prisma.assignment.findMany({
      where: {
        teacherId: teacherId,
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
        isPublished: true,
      },
      include: {
        course: true,
        submissions: {
          include: {
            student: true,
          },
        },
      },
    });

    const events = assignments.map(assignment => ({
      id: assignment.id,
      title: `${assignment.course.code}: ${assignment.title}`,
      start: assignment.dueDate,
      end: new Date(assignment.dueDate.getTime() + 60 * 60 * 1000), // 1 hour duration
      type: 'assignment',
      course: assignment.course.code,
      totalSubmissions: assignment.submissions.length,
      pendingGrading: assignment.submissions.filter(s => !s.isGraded).length,
      color: this.getEventColor(assignment.dueDate),
    }));

    return events;
  }

  private static getEventColor(dueDate: Date): string {
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);

    if (daysDiff < 1) return '#ef4444'; // red - due today
    if (daysDiff < 3) return '#f59e0b'; // amber - due in 3 days
    if (daysDiff < 7) return '#3b82f6'; // blue - due in week
    return '#10b981'; // green - more than a week
  }
}