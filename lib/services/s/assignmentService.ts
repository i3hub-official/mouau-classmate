// lib/services/students/assignmentService.ts

import { prisma } from "@/lib/server/prisma";
import {
  AssignmentWithStudentSubmission,
  AssignmentSubmission,
  AssignmentSubmissionData,
} from "@/lib/types/s/index";
import { AuditAction } from "@prisma/client";

interface AssignmentResponse {
  assignments: AssignmentWithStudentSubmission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface SubmissionResponse {
  success: boolean;
  submission: any;
  message: string;
  attemptNumber: number;
  attemptsRemaining: number;
}

export class StudentAssignmentService {
  /**
   * Get all published assignments for a student (with submission status)
   */
  static async getStudentAssignments(
    studentId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<AssignmentResponse> {
    const skip = (page - 1) * limit;

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, isCompleted: false },
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
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
          deletedAt: null,
        },
        include: {
          course: {
            select: {
              id: true,
              code: true,
              title: true,
              level: true,
              semester: true,
              credits: true,
              description: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          submissions: {
            where: { studentId },
            orderBy: { attemptNumber: "desc" },
          },
        },
        orderBy: { dueDate: "asc" },
        skip,
        take: limit,
      }),
      prisma.assignment.count({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
          deletedAt: null,
        },
      }),
    ]);

    const enrichedAssignments: AssignmentWithStudentSubmission[] =
      assignments.map((a) => {
        const submissions = a.submissions as AssignmentSubmission[];
        const latest = submissions[0] || null;
        const attemptsUsed = submissions.length;

        // Calculate best score (only from graded submissions)
        const gradedSubmissions = submissions.filter(
          (s) => s.isGraded && s.score !== null
        );
        const bestScore =
          gradedSubmissions.length > 0
            ? Math.max(...gradedSubmissions.map((s) => s.score!))
            : null;

        const isOverdue = new Date() > a.dueDate;
        const canSubmit =
          attemptsUsed < a.allowedAttempts &&
          (!isOverdue || a.allowLateSubmission);

        return {
          ...a,
          course: a.course,
          submissions,
          latestSubmission: latest,
          bestScore,
          attemptsUsed,
          canSubmit,
          isOverdue,
        };
      });

    return {
      assignments: enrichedAssignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get single assignment with full submission history
   */
  static async getAssignmentById(
    assignmentId: string,
    studentId: string
  ): Promise<AssignmentWithStudentSubmission | null> {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        isPublished: true,
        deletedAt: null,
        course: {
          enrollments: {
            some: { studentId, isCompleted: false },
          },
        },
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            level: true,
            semester: true,
            credits: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        submissions: {
          where: { studentId },
          orderBy: { attemptNumber: "desc" },
        },
      },
    });

    if (!assignment) return null;

    const submissions = assignment.submissions as AssignmentSubmission[];
    const attemptsUsed = submissions.length;

    const gradedSubmissions = submissions.filter(
      (s) => s.isGraded && s.score !== null
    );
    const bestScore =
      gradedSubmissions.length > 0
        ? Math.max(...gradedSubmissions.map((s) => s.score!))
        : null;

    const isOverdue = new Date() > assignment.dueDate;
    const canSubmit =
      attemptsUsed < assignment.allowedAttempts &&
      (!isOverdue || assignment.allowLateSubmission);

    return {
      ...assignment,
      course: assignment.course,
      submissions,
      latestSubmission: submissions[0] || null,
      bestScore,
      attemptsUsed,
      canSubmit,
      isOverdue,
    };
  }

  /**
   * Submit assignment
   */
  static async submitAssignment(
    studentId: string,
    data: AssignmentSubmissionData
  ): Promise<SubmissionResponse> {
    const { assignmentId, content, submissionUrl } = data;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
    });

    if (!assignment || !assignment.isPublished || assignment.deletedAt) {
      throw new Error("Assignment not found or not available");
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId: assignment.courseId,
        },
      },
    });

    if (!enrollment || enrollment.isCompleted) {
      throw new Error(
        "You are not enrolled in this course or course is completed"
      );
    }

    const now = new Date();
    const isLate = now > assignment.dueDate;

    if (isLate && !assignment.allowLateSubmission) {
      throw new Error("Late submissions are not allowed for this assignment");
    }

    // Check submission attempts
    const submissionCount = await prisma.assignmentSubmission.count({
      where: { assignmentId, studentId },
    });

    if (submissionCount >= assignment.allowedAttempts) {
      throw new Error(
        `Maximum ${assignment.allowedAttempts} attempt(s) exceeded`
      );
    }

    const attemptNumber = submissionCount + 1;

    const submission = await prisma.$transaction(async (tx) => {
      const newSubmission = await tx.assignmentSubmission.create({
        data: {
          studentId,
          assignmentId,
          content,
          submissionUrl,
          attemptNumber,
          isLate,
          submittedAt: now,
          isGraded: false,
        },
        include: {
          assignment: {
            include: {
              course: {
                select: {
                  code: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: studentId,
          action: AuditAction.ASSIGNMENT_SUBMITTED,
          resourceType: "ASSIGNMENT",
          resourceId: assignmentId,
          details: {
            studentId,
            assignmentId,
            attemptNumber,
            isLate,
            courseCode: assignment.course.code,
            courseTitle: assignment.course.title,
            submittedAt: now.toISOString(),
          },
        },
      });

      return newSubmission;
    });

    return {
      success: true,
      submission,
      message: isLate
        ? "Assignment submitted late"
        : "Assignment submitted successfully",
      attemptNumber,
      attemptsRemaining: assignment.allowedAttempts - attemptNumber,
    };
  }

  /**
   * Upcoming assignments (next N days)
   */
  static async getUpcomingAssignments(
    studentId: string,
    daysAhead: number = 14
  ): Promise<AssignmentWithStudentSubmission[]> {
    const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, isCompleted: false },
      select: { courseId: true },
    });

    const courseIds = enrollments.map((e) => e.courseId);
    if (courseIds.length === 0) return [];

    const assignments = await prisma.assignment.findMany({
      where: {
        courseId: { in: courseIds },
        isPublished: true,
        deletedAt: null,
        dueDate: {
          gte: new Date(),
          lte: futureDate,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            level: true,
            semester: true,
            credits: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        submissions: {
          where: { studentId },
          orderBy: { attemptNumber: "desc" },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    return assignments.map((a) => {
      const submissions = a.submissions as AssignmentSubmission[];
      const latest = submissions[0] || null;
      const attemptsUsed = submissions.length;
      const isOverdue = new Date() > a.dueDate;
      const canSubmit =
        attemptsUsed < a.allowedAttempts &&
        (!isOverdue || a.allowLateSubmission);

      return {
        ...a,
        course: a.course,
        submissions,
        latestSubmission: latest,
        bestScore: null, // Not needed for upcoming assignments
        attemptsUsed,
        canSubmit,
        isOverdue,
      };
    });
  }

  /**
   * Overdue unsubmitted assignments
   */
  static async getOverdueAssignments(
    studentId: string
  ): Promise<AssignmentWithStudentSubmission[]> {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, isCompleted: false },
      select: { courseId: true },
    });

    const courseIds = enrollments.map((e) => e.courseId);
    if (courseIds.length === 0) return [];

    const assignments = await prisma.assignment.findMany({
      where: {
        courseId: { in: courseIds },
        isPublished: true,
        deletedAt: null,
        dueDate: { lt: new Date() },
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            level: true,
            semester: true,
            credits: true,
            description: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        submissions: {
          where: { studentId },
        },
      },
    });

    return assignments
      .filter((a) => a.submissions.length === 0) // Only unsubmitted
      .map((a) => {
        const isOverdue = new Date() > a.dueDate;
        const canSubmit = isOverdue ? a.allowLateSubmission : true;

        return {
          ...a,
          course: a.course,
          submissions: [],
          latestSubmission: null,
          bestScore: null,
          attemptsUsed: 0,
          canSubmit,
          isOverdue,
        };
      });
  }

  /**
   * Graded assignments
   */
  static async getGradedAssignments(
    studentId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<AssignmentResponse> {
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where: {
          studentId,
          isGraded: true,
          score: { not: null },
        },
        include: {
          assignment: {
            include: {
              course: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                  level: true,
                  semester: true,
                  credits: true,
                },
              },
            },
          },
        },
        orderBy: { gradedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.assignmentSubmission.count({
        where: {
          studentId,
          isGraded: true,
          score: { not: null },
        },
      }),
    ]);

    // Transform submissions to assignment format for consistency
    const assignmentsMap = new Map();

    submissions.forEach((submission) => {
      if (!assignmentsMap.has(submission.assignmentId)) {
        assignmentsMap.set(submission.assignmentId, {
          ...submission.assignment,
          submissions: [submission],
        });
      } else {
        assignmentsMap
          .get(submission.assignmentId)
          .submissions.push(submission);
      }
    });

    const assignments = Array.from(assignmentsMap.values()).map(
      (assignment) => {
        const submissions = assignment.submissions as AssignmentSubmission[];
        const latest = submissions[0] || null;
        const attemptsUsed = submissions.length;
        const isOverdue = new Date() > assignment.dueDate;

        return {
          ...assignment,
          course: assignment.course,
          submissions,
          latestSubmission: latest,
          bestScore: latest?.score || null,
          attemptsUsed,
          canSubmit: false, // Already graded
          isOverdue,
        };
      }
    );

    return {
      assignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }
}
