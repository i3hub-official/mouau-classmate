// lib/services/students/assignmentService.ts

import { prisma } from "@/lib/server/prisma";
import {
  Assignment,
  AssignmentWithSubmission,
  AssignmentSubmissionData,
} from "@/lib/types/s/index";
import { AuditAction } from "@prisma/client";

export class StudentAssignmentService {
  /**
   * Get assignments for a student
   */
  static async getStudentAssignments(
    studentId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      // Get student enrollments to find their courses
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        select: { courseId: true },
      });

      const courseIds = enrollments.map((e) => e.courseId);

      if (courseIds.length === 0) {
        return {
          assignments: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        };
      }

      const [assignments, total] = await Promise.all([
        prisma.assignment.findMany({
          where: {
            courseId: { in: courseIds },
            isPublished: true,
          },
          skip,
          take: limit,
          include: {
            course: true,
            submissions: {
              where: { studentId },
              orderBy: { attemptNumber: "desc" },
              take: 1, // Get only the latest submission
            },
          },
          orderBy: { dueDate: "asc" },
        }),
        prisma.assignment.count({
          where: {
            courseId: { in: courseIds },
            isPublished: true,
          },
        }),
      ]);

      return {
        assignments: assignments as AssignmentWithSubmission[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting student assignments:", error);
      throw error;
    }
  }

  /**
   * Get assignment by ID
   */
  static async getAssignmentById(id: string): Promise<Assignment | null> {
    try {
      const assignment = await prisma.assignment.findUnique({
        where: { id },
        include: {
          course: true,
        },
      });

      return assignment as Assignment;
    } catch (error) {
      console.error("Error getting assignment by ID:", error);
      throw error;
    }
  }

  /**
   * Get assignment with student's submissions
   */
  static async getAssignmentWithSubmissions(
    assignmentId: string,
    studentId: string
  ): Promise<AssignmentWithSubmission | null> {
    try {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          course: true,
          submissions: {
            where: { studentId },
            orderBy: { attemptNumber: "desc" },
          },
        },
      });

      return assignment as AssignmentWithSubmission;
    } catch (error) {
      console.error("Error getting assignment with submissions:", error);
      throw error;
    }
  }

  /**
   * Submit assignment
   */
  static async submitAssignment(
    studentId: string,
    submissionData: AssignmentSubmissionData
  ) {
    try {
      const { assignmentId, content, submissionUrl, attemptNumber } =
        submissionData;

      // Check if assignment exists and is published
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
      });

      if (!assignment) {
        throw new Error("Assignment not found");
      }

      if (!assignment.isPublished) {
        throw new Error("Assignment is not available for submission");
      }

      // Check if student is enrolled in the course
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId: assignment.courseId,
          },
        },
      });

      if (!enrollment) {
        throw new Error("You are not enrolled in this course");
      }

      // Check if submission is late
      const isLate = new Date() > new Date(assignment.dueDate);

      // Check if late submissions are allowed
      if (isLate && !assignment.allowLateSubmission) {
        throw new Error("Late submissions are not allowed for this assignment");
      }

      // Check if the student has exceeded the allowed attempts
      const existingSubmissions = await prisma.assignmentSubmission.findMany({
        where: {
          studentId,
          assignmentId,
        },
      });

      if (existingSubmissions.length >= assignment.allowedAttempts) {
        throw new Error(
          `You have exceeded the maximum number of attempts (${assignment.allowedAttempts})`
        );
      }

      // Create submission
      const submission = await prisma.assignmentSubmission.create({
        data: {
          studentId,
          assignmentId,
          content,
          submissionUrl,
          attemptNumber: attemptNumber || existingSubmissions.length + 1,
          isLate,
        },
        include: {
          assignment: {
            include: {
              course: true,
            },
          },
        },
      });

      // Log the submission
      await prisma.auditLog.create({
        data: {
          action: "ASSIGNMENT_SUBMITTED",
          resourceType: "ASSIGNMENT",
          resourceId: assignmentId,
          details: {
            studentId,
            assignmentId,
            attemptNumber: submission.attemptNumber,
            isLate,
          },
        },
      });

      return {
        success: true,
        submission,
        message: "Assignment submitted successfully",
      };
    } catch (error) {
      console.error("Error submitting assignment:", error);
      throw error;
    }
  }

  /**
   * Get upcoming assignments (due in the future)
   */
  static async getUpcomingAssignments(studentId: string, days: number = 7) {
    try {
      // Get student enrollments to find their courses
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        select: { courseId: true },
      });

      const courseIds = enrollments.map((e) => e.courseId);

      if (courseIds.length === 0) {
        return [];
      }

      const assignments = await prisma.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          course: true,
          submissions: {
            where: { studentId },
            orderBy: { attemptNumber: "desc" },
            take: 1, // Get only the latest submission
          },
        },
        orderBy: { dueDate: "asc" },
      });

      return assignments as AssignmentWithSubmission[];
    } catch (error) {
      console.error("Error getting upcoming assignments:", error);
      throw error;
    }
  }

  /**
   * Get overdue assignments (past due date and not submitted)
   */
  static async getOverdueAssignments(studentId: string) {
    try {
      // Get student enrollments to find their courses
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        select: { courseId: true },
      });

      const courseIds = enrollments.map((e) => e.courseId);

      if (courseIds.length === 0) {
        return [];
      }

      // Get assignments that are past due date
      const allPastDueAssignments = await prisma.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
          dueDate: {
            lt: new Date(),
          },
        },
        include: {
          course: true,
          submissions: {
            where: { studentId },
          },
        },
      });

      // Filter out assignments that have been submitted
      const overdueAssignments = allPastDueAssignments.filter(
        (assignment) => assignment.submissions.length === 0
      );

      return overdueAssignments as AssignmentWithSubmission[];
    } catch (error) {
      console.error("Error getting overdue assignments:", error);
      throw error;
    }
  }

  /**
   * Get submitted assignments
   */
  static async getSubmittedAssignments(
    studentId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      const [submissions, total] = await Promise.all([
        prisma.assignmentSubmission.findMany({
          where: { studentId },
          skip,
          take: limit,
          include: {
            assignment: {
              include: {
                course: true,
              },
            },
          },
          orderBy: { submittedAt: "desc" },
        }),
        prisma.assignmentSubmission.count({ where: { studentId } }),
      ]);

      // Transform the data to match AssignmentWithSubmission format
      const assignments = submissions.map((submission) => ({
        ...submission.assignment,
        submissions: [submission],
      }));

      return {
        assignments: assignments as AssignmentWithSubmission[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting submitted assignments:", error);
      throw error;
    }
  }

  /**
   * Get graded assignments
   */
  static async getGradedAssignments(
    studentId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      const [submissions, total] = await Promise.all([
        prisma.assignmentSubmission.findMany({
          where: {
            studentId,
            isGraded: true,
          },
          skip,
          take: limit,
          include: {
            assignment: {
              include: {
                course: true,
              },
            },
          },
          orderBy: { submittedAt: "desc" },
        }),
        prisma.assignmentSubmission.count({
          where: {
            studentId,
            isGraded: true,
          },
        }),
      ]);

      // Transform the data to match AssignmentWithSubmission format
      const assignments = submissions.map((submission) => ({
        ...submission.assignment,
        submissions: [submission],
      }));

      return {
        assignments: assignments as AssignmentWithSubmission[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting graded assignments:", error);
      throw error;
    }
  }
}
