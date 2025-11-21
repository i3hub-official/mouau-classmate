// lib/services/dashboardService.ts

import { prisma } from "@/lib/server/prisma";
import {
  StudentProfile,
  DashboardStats,
  RecentActivity,
  UpcomingDeadline,
  EnrollmentWithCourse,
} from "@/lib/types/s/index";
import { StudentCourseService } from "./courseService";
import { StudentAssignmentService } from "./assignmentService";
import { StudentGradeService } from "./gradeService";
import { StudentService } from "./studentService";

interface DashboardResponse {
  student: StudentProfile;
  stats: DashboardStats;
  recentActivities: RecentActivity[];
  upcomingDeadlines: UpcomingDeadline[];
  currentEnrollments: EnrollmentWithCourse[];
  recentGrades: any[]; // You might want to create a proper type for this
}

export class StudentDashboardService {
  /**
   * Get student dashboard data
   */
  static async getStudentDashboard(
    studentId: string
  ): Promise<DashboardResponse> {
    try {
      // Get student profile
      const studentResponse = await StudentService.getStudentProfile(studentId);
      // The response type should match the actual return type from StudentService.getStudentProfile
      // For example, if it returns { success: boolean, student?: StudentProfile }
      if (
        !studentResponse ||
        (typeof studentResponse === "object" &&
          "success" in studentResponse &&
          !studentResponse.success) ||
        (typeof studentResponse === "object" &&
          "student" in studentResponse &&
          !studentResponse.student)
      ) {
        throw new Error("Student not found");
      }

      // If studentResponse is { success, student }, extract student, else assume it's StudentProfile
      const student =
        typeof studentResponse === "object" && "student" in studentResponse
          ? (studentResponse as any).student
          : studentResponse;

      // Create student profile
      const studentProfile: StudentProfile = {
        id: student.id,
        matricNumber: student.matricNumber,
        fullName: this.formatFullName(
          student.surname,
          student.firstName,
          student.otherName
        ),
        firstName: student.firstName,
        surname: student.surname,
        otherName: student.otherName,
        email: student.email,
        phone: student.phone,
        passportUrl: student.passportUrl,
        department: student.department,
        college: student.college,
        course: student.course,
        admissionYear: student.admissionYear,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        state: student.state,
        lga: student.lga,
        isActive: student.isActive,
        role: "STUDENT",
        createdAt: student.createdAt,
      };

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
        student: studentProfile,
        stats,
        recentActivities,
        upcomingDeadlines,
        currentEnrollments: currentEnrollments.enrollments || [],
        recentGrades,
      };
    } catch (error) {
      console.error("Error getting student dashboard:", error);
      throw error;
    }
  }

  /**
   * Format full name from components
   */
  private static formatFullName(
    surname: string,
    firstName: string,
    otherName: string | null
  ): string {
    let fullName = `${surname} ${firstName}`;
    if (otherName) {
      fullName += ` ${otherName}`;
    }
    return fullName;
  }

  /**
   * Get dashboard statistics
   */
  private static async getDashboardStats(
    studentId: string
  ): Promise<DashboardStats> {
    try {
      // Get enrollments with course information
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: {
            select: {
              id: true,
              credits: true,
              isActive: true,
            },
          },
        },
      });

      const totalCourses = enrollments.length;
      const activeCourses = enrollments.filter((e) => !e.isCompleted).length;
      const completedCourses = enrollments.filter((e) => e.isCompleted).length;

      // Calculate total credits
      const totalCredits = enrollments.reduce((sum, enrollment) => {
        return sum + (enrollment.course?.credits || 0);
      }, 0);

      // Get course IDs for assignment queries
      const courseIds = enrollments.map((e) => e.courseId);

      // Get pending assignments (unsubmitted published assignments)
      const pendingAssignments = await prisma.assignment.count({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
          dueDate: { gte: new Date() },
          submissions: {
            none: {
              studentId: studentId,
            },
          },
          deletedAt: null,
        },
      });

      // Get upcoming deadlines count (next 7 days)
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const upcomingDeadlinesCount = await prisma.assignment.count({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
          dueDate: {
            gte: new Date(),
            lte: weekFromNow,
          },
          submissions: {
            none: {
              studentId: studentId,
            },
          },
          deletedAt: null,
        },
      });

      // Get current GPA
      const gradeStats = await StudentGradeService.getGradeStatistics(
        studentId
      );
      const currentGPA = gradeStats.gpa || 0;

      // Get unread notifications
      const user = await prisma.user.findFirst({
        where: {
          student: {
            id: studentId,
          },
        },
        select: { id: true },
      });

      const unreadNotifications = user
        ? await prisma.notification.count({
            where: {
              userId: user.id,
              isRead: false,
            },
          })
        : 0;

      // Get upcoming exams (you'll need to implement this based on your Exam model)
      const upcomingExams = await prisma.exam.count({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
          date: { gte: new Date() },
        },
      });

      return {
        totalCourses,
        enrolledCourses: totalCourses,
        totalEnrolledCourses: totalCourses,
        activeCourses,
        completedCourses,
        pendingAssignments,
        upcomingDeadlines: upcomingDeadlinesCount,
        currentGPA,
        totalCredits,
        unreadNotifications,
        upcomingExams,
        totalCreditsEarned: totalCredits, // You might want different logic for earned vs enrolled credits
      };
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      throw error;
    }
  }

  /**
   * Get recent activities for a student
   */
  private static async getRecentActivities(
    studentId: string,
    limit: number = 10
  ): Promise<RecentActivity[]> {
    try {
      // Get user ID for the student
      const user = await prisma.user.findFirst({
        where: {
          student: {
            id: studentId,
          },
        },
        select: { id: true },
      });

      if (!user) {
        return [];
      }

      // Get audit logs for recent activities
      const activities = await prisma.auditLog.findMany({
        where: {
          userId: user.id,
          action: {
            in: [
              "ASSIGNMENT_SUBMITTED",
              "EXAM_COMPLETED",
              "COURSE_ENROLLED",
              "GRADE_RECEIVED",
            ],
          },
        },
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
          details: true,
          createdAt: true,
          resourceType: true,
          resourceId: true,
        },
      });

      return activities.map((activity) => {
        const type = this.mapActionToActivityType(activity.action);
        const title = this.getActivityTitle(activity.action, activity.details);
        const description = this.getActivityDescription(
          activity.action,
          activity.details
        );

        return {
          id: activity.id,
          activityType: type,
          title,
          description: description || undefined,
          date: activity.createdAt,
        };
      });
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      return [];
    }
  }

  /**
   * Map action to activity type
   */
  private static mapActionToActivityType(
    action: string
  ): RecentActivity["activityType"] {
    const map: Record<string, RecentActivity["activityType"]> = {
      ASSIGNMENT_SUBMITTED: "assignment_submitted",
      EXAM_COMPLETED: "exam_taken",
      COURSE_ENROLLED: "course_completed",
      GRADE_RECEIVED: "assignment_submitted", // or create "grade_received" type
    };

    return map[action] || "assignment_submitted";
  }

  /**
   * Get activity title
   */
  private static getActivityTitle(action: string, details?: any): string {
    const titles: Record<string, string> = {
      ASSIGNMENT_SUBMITTED: "Assignment Submitted",
      EXAM_COMPLETED: "Exam Completed",
      COURSE_ENROLLED: "Course Enrolled",
      GRADE_RECEIVED: "Grade Received",
    };

    return titles[action] || "Activity Recorded";
  }

  /**
   * Get activity description
   */
  private static getActivityDescription(
    action: string,
    details?: any
  ): string | null {
    if (!details) return null;

    switch (action) {
      case "ASSIGNMENT_SUBMITTED":
        return details.assignmentTitle || `Assignment submission`;
      case "EXAM_COMPLETED":
        return details.examTitle || `Exam completed`;
      case "COURSE_ENROLLED":
        return details.courseCode || `New course enrollment`;
      case "GRADE_RECEIVED":
        return `Score: ${details.score || "N/A"}`;
      default:
        return null;
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
      );

      return assignments.slice(0, limit).map((assignment) => {
        const dueDate = new Date(assignment.dueDate);
        const now = new Date();
        const daysRemaining = Math.ceil(
          (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          id: assignment.id,
          title: assignment.title,
          courseCode: assignment.course?.code || "",
          courseTitle: assignment.course?.title || "",
          dueDate,
          daysRemaining,
          type: "assignment",
          isOverdue: dueDate < now,
        };
      });
    } catch (error) {
      console.error("Error getting upcoming deadlines:", error);
      return [];
    }
  }

  /**
   * Get recent grades
   */
  private static async getRecentGrades(
    studentId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const submissionsResponse =
        await StudentAssignmentService.getGradedAssignments(
          studentId,
          1,
          limit
        );
      const submissions = submissionsResponse?.assignments || [];

      return submissions
        .map((assignment: any) => {
          const submission = assignment.submissions?.[0];
          if (!submission) return null;

          return {
            courseId: assignment.courseId,
            courseCode: assignment.course?.code || "",
            courseTitle: assignment.course?.title || "",
            credits: assignment.course?.credits || 0,
            grade: this.scoreToGrade(submission.score),
            score: submission.score,
            gradePoint: this.calculateGradePoint(
              this.scoreToGrade(submission.score)
            ),
            assignmentTitle: assignment.title,
            submittedAt: submission.submittedAt,
          };
        })
        .filter(Boolean);
    } catch (error) {
      console.error("Error getting recent grades:", error);
      return [];
    }
  }

  /**
   * Convert score to grade
   */
  private static scoreToGrade(score: number | null | undefined): string {
    if (score === null || score === undefined) return "N/A";
    if (score >= 70) return "A";
    if (score >= 60) return "B";
    if (score >= 50) return "C";
    if (score >= 45) return "D";
    if (score >= 40) return "E";
    return "F";
  }

  /**
   * Calculate grade point
   */
  private static calculateGradePoint(grade: string): number {
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
