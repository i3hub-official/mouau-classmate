// lib/services/dashboardService.ts

import { prisma } from "@/lib/server/prisma";
import {
  StudentDashboard,
  DashboardStats,
  RecentActivity,
  UpcomingDeadline,
} from "@/lib/types/s/index";
import { StudentCourseService } from "./courseService";
import { StudentAssignmentService } from "./assignmentService";
import { StudentGradeService } from "./gradeService";
import { StudentNotificationService } from "./notificationService";
import { StudentService } from "./studentService";

export class StudentDashboardService {
  /**
   * Get student dashboard data
   */
  static async getStudentDashboard(
    studentId: string
  ): Promise<StudentDashboard> {
    try {
      // Get student profile
      const student = await StudentService.getStudentProfile(studentId);
      if (!student) {
        throw new Error("Student not found");
      }

      // Get dashboard stats
      const stats = await this.getDashboardStats(studentId);

      // Get recent activities
      const recentActivities = await this.getRecentActivities(studentId, 5);

      // Get upcoming deadlines
      const upcomingDeadlines = await this.getUpcomingDeadlines(studentId, 5);

      // Get current enrollments
      const currentEnrollments =
        await StudentCourseService.getActiveStudentEnrollments(studentId, 1, 5);

      // Get recent grades
      const recentGrades = await this.getRecentGrades(studentId, 5);

      return {
        student,
        stats,
        recentActivities,
        upcomingDeadlines,
        currentEnrollments: currentEnrollments.enrollments,
        recentGrades,
      };
    } catch (error) {
      console.error("Error getting student dashboard:", error);
      throw error;
    }
  }

  /**
   * Get dashboard statistics
   */
  private static async getDashboardStats(
    studentId: string
  ): Promise<DashboardStats> {
    try {
      // Get total courses
      const totalCourses = await prisma.enrollment.count({
        where: { studentId },
      });

      // Get active courses
      const activeCourses = await prisma.enrollment.count({
        where: {
          studentId,
          isCompleted: false,
        },
      });

      // Get completed courses
      const completedCourses = await prisma.enrollment.count({
        where: {
          studentId,
          isCompleted: true,
        },
      });

      // Get pending assignments
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        select: { courseId: true },
      });

      const courseIds = enrollments.map((e) => e.courseId);

      const pendingAssignments = await prisma.assignment.count({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
          dueDate: {
            gte: new Date(),
          },
          submissions: {
            none: {
              studentId,
            },
          },
        },
      });

      // Get upcoming deadlines (assignments due in the next 7 days)
      const upcomingDeadlines = await prisma.assignment.count({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          submissions: {
            none: {
              studentId,
            },
          },
        },
      });

      // Get current GPA
      const gradeStats = await StudentGradeService.getGradeStatistics(
        studentId
      );
      const currentGPA = gradeStats.gpa;

      // Get total credits
      // If 'Enrollment' does not have a 'credit' field, sum the credits from the related 'Course' model
      const enrollmentsWithCourses = await prisma.enrollment.findMany({
        where: { studentId },
        select: { course: { select: { credits: true } } },
      });
      const totalCredits = enrollmentsWithCourses.reduce(
        (sum, enrollment) => sum + (enrollment.course?.credits ?? 0),
        0
      );

      // Get unread notifications
      const unreadNotifications = await prisma.notification.count({
        where: {
          userId: studentId,
          isRead: false,
        },
      });

      return {
        totalCourses,
        activeCourses,
        completedCourses,
        pendingAssignments,
        upcomingDeadlines,
        currentGPA,
        totalCredits,
        unreadNotifications,
      };
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      throw error;
    }
  }

  /**
   * Get recent activities
   */
  private static async getRecentActivities(
    studentId: string,
    limit: number = 10
  ): Promise<RecentActivity[]> {
    try {
      // Get recent user activities
      const activities = await prisma.userActivity.findMany({
        where: { userId: studentId },
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      // Transform to RecentActivity format
      const recentActivities: RecentActivity[] = activities.map((activity) => ({
        id: activity.id,
        type: this.getActivityType(activity.action),
        title: activity.action.replace(/_/g, " ").toLowerCase(), // Added title property
        description: this.getActivityDescription(activity),
        timestamp: activity.createdAt,
        metadata: activity.details,
      }));

      return recentActivities;
    } catch (error) {
      console.error("Error getting recent activities:", error);
      throw error;
    }
  }

  /**
   * Get upcoming deadlines
   */
  private static async getUpcomingDeadlines(
    studentId: string,
    limit: number = 10
  ): Promise<UpcomingDeadline[]> {
    try {
      const assignments = await StudentAssignmentService.getUpcomingAssignments(
        studentId,
        30
      ); // Next 30 days

      // Filter assignments that haven't been submitted
      const unsubmittedAssignments = assignments.filter(
        (assignment) => assignment.submissions.length === 0
      );

      // Transform to UpcomingDeadline format
      const upcomingDeadlines: UpcomingDeadline[] = unsubmittedAssignments
        .slice(0, limit)
        .map((assignment) => {
          const dueDate = new Date(assignment.dueDate);
          const now = new Date();
          const daysRemaining = Math.ceil(
            (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          return {
            id: assignment.id,
            assignmentId: assignment.id,
            title: assignment.title,
            courseCode: assignment.course?.code ?? "",
            courseTitle: assignment.course?.title ?? "",
            dueDate,
            daysRemaining,
            isSubmitted: false,
            isLate: false,
          };
        });

      return upcomingDeadlines;
    } catch (error) {
      console.error("Error getting upcoming deadlines:", error);
      throw error;
    }
  }

  /**
   * Get recent grades
   */
  private static async getRecentGrades(studentId: string, limit: number = 10) {
    try {
      const submissions = await StudentAssignmentService.getGradedAssignments(
        studentId,
        1,
        limit
      );

      // Transform to GradeInfo format
      const recentGrades = submissions.assignments.map((assignment) => {
        const submission = assignment.submissions[0];
        return {
          courseId: assignment.courseId,
          courseCode: assignment.course?.code ?? "",
          courseTitle: assignment.course?.title ?? "",
          credits: assignment.course?.credits ?? 0,
          grade: this.scoreToGrade(submission.score),
          score: submission.score,
          gradePoint: this.calculateGradePoint(
            this.scoreToGrade(submission.score)
          ),
          semester: assignment.course?.semester ?? 0,
          level: assignment.course?.level ?? 0,
        };
      });

      return recentGrades;
    } catch (error) {
      console.error("Error getting recent grades:", error);
      throw error;
    }
  }

  /**
   * Get activity type from action
   */
  private static getActivityType(
    action: string
  ): "enrollment" | "submission" | "grade" | "assignment" | "lecture" {
    if (action.includes("ENROLLMENT")) return "enrollment";
    if (action.includes("SUBMISSION")) return "submission";
    if (action.includes("GRADE")) return "grade";
    if (action.includes("ASSIGNMENT")) return "assignment";
    if (action.includes("LECTURE")) return "lecture";
    return "enrollment"; // Default
  }

  /**
   * Get activity description from activity
   */
  private static getActivityDescription(activity: any): string {
    switch (activity.action) {
      case "ENROLLMENT_CREATED":
        return `Enrolled in course`;
      case "ASSIGNMENT_SUBMITTED":
        return `Submitted assignment`;
      case "GRADE_ASSIGNED":
        return `Received a grade`;
      default:
        return activity.action.replace(/_/g, " ").toLowerCase();
    }
  }

  /**
   * Convert score to grade
   */
  private static scoreToGrade(
    score: number | null | undefined
  ): "A" | "B" | "C" | "D" | "E" | "F" | null {
    if (score === null || score === undefined) return null;
    if (score >= 70) return "A";
    if (score >= 60) return "B";
    if (score >= 50) return "C";
    if (score >= 45) return "D";
    if (score >= 40) return "E";
    return "F";
  }

  /**
   * Calculate grade point from grade
   */
  private static calculateGradePoint(
    grade: "A" | "B" | "C" | "D" | "E" | "F" | null
  ): number {
    switch (grade) {
      case "A":
        return 5.0;
      case "B":
        return 4.0;
      case "C":
        return 3.0;
      case "D":
        return 2.0;
      case "E":
        return 1.0;
      case "F":
        return 0.0;
      default:
        return 0;
    }
  }
}
