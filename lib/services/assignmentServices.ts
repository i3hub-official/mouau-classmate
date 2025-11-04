// lib/services/assignmentServices.ts
import { prisma } from "@/lib/server/prisma";
import {
  Assignment,
  AssignmentSubmission,
  Student,
  Course,
  Teacher,
} from "@prisma/client";

export type AssignmentWithRelations = Assignment & {
  course: Course;
  teacher?: Teacher | null;
  submissions: AssignmentSubmission[];
};

export type AssignmentSubmissionWithRelations = AssignmentSubmission & {
  student: Student;
  assignment: Assignment;
};

export type CreateAssignmentData = {
  title: string;
  description?: string;
  instructions?: string;
  dueDate: Date;
  maxScore?: number;
  allowedAttempts?: number;
  assignmentUrl?: string;
  isPublished?: boolean;
  allowLateSubmission?: boolean;
  courseId: string;
  teacherId?: string;
};

export type UpdateAssignmentData = Partial<CreateAssignmentData>;

export type SubmitAssignmentData = {
  submissionUrl?: string;
  content?: string;
  studentId: string;
  assignmentId: string;
  attemptNumber?: number;
};

export type GradeAssignmentData = {
  score: number;
  feedback?: string;
  isGraded: boolean;
};

export class AssignmentService {
  // ===========================================================
  // ASSIGNMENT CRUD OPERATIONS
  // ===========================================================

  /**
   * Get all assignments for a course
   */
  static async getAssignmentsByCourse(
    courseId: string
  ): Promise<AssignmentWithRelations[]> {
    try {
      return await prisma.assignment.findMany({
        where: { courseId },
        include: {
          course: true,
          teacher: true,
          submissions: true,
        },
        orderBy: { dueDate: "asc" },
      });
    } catch (error) {
      console.error("Error fetching assignments by course:", error);
      throw new Error("Failed to fetch assignments");
    }
  }

  /**
   * Get assignments for a student (based on enrolled courses)
   */
  static async getAssignmentsByStudent(
    studentId: string
  ): Promise<AssignmentWithRelations[]> {
    try {
      // First, get the student's enrolled courses
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: { course: true },
      });

      const courseIds = enrollments.map((enrollment) => enrollment.courseId);

      // Then get assignments for those courses
      return await prisma.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
        },
        include: {
          course: true,
          teacher: true,
          submissions: {
            where: { studentId },
          },
        },
        orderBy: { dueDate: "asc" },
      });
    } catch (error) {
      console.error("Error fetching assignments by student:", error);
      throw new Error("Failed to fetch student assignments");
    }
  }

  /**
   * Get assignments created by a teacher
   */
  static async getAssignmentsByTeacher(
    teacherId: string
  ): Promise<AssignmentWithRelations[]> {
    try {
      return await prisma.assignment.findMany({
        where: { teacherId },
        include: {
          course: true,
          teacher: true,
          submissions: {
            include: {
              student: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("Error fetching assignments by teacher:", error);
      throw new Error("Failed to fetch teacher assignments");
    }
  }

  /**
   * Get a single assignment by ID with all relations
   */
  static async getAssignmentById(
    assignmentId: string
  ): Promise<AssignmentWithRelations | null> {
    try {
      return await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          course: true,
          teacher: true,
          submissions: {
            include: {
              student: true,
            },
          },
        },
      });
    } catch (error) {
      console.error("Error fetching assignment by ID:", error);
      throw new Error("Failed to fetch assignment");
    }
  }

  /**
   * Create a new assignment
   */
  static async createAssignment(
    data: CreateAssignmentData
  ): Promise<Assignment> {
    try {
      return await prisma.assignment.create({
        data: {
          title: data.title,
          description: data.description,
          instructions: data.instructions,
          dueDate: data.dueDate,
          maxScore: data.maxScore || 100,
          allowedAttempts: data.allowedAttempts || 1,
          assignmentUrl: data.assignmentUrl,
          isPublished: data.isPublished || false,
          allowLateSubmission: data.allowLateSubmission || false,
          courseId: data.courseId,
          teacherId: data.teacherId,
        },
      });
    } catch (error) {
      console.error("Error creating assignment:", error);
      throw new Error("Failed to create assignment");
    }
  }

  /**
   * Update an assignment
   */
  static async updateAssignment(
    assignmentId: string,
    data: UpdateAssignmentData
  ): Promise<Assignment> {
    try {
      return await prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error updating assignment:", error);
      throw new Error("Failed to update assignment");
    }
  }

  /**
   * Delete an assignment
   */
  static async deleteAssignment(assignmentId: string): Promise<void> {
    try {
      await prisma.assignment.delete({
        where: { id: assignmentId },
      });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      throw new Error("Failed to delete assignment");
    }
  }

  /**
   * Publish/unpublish an assignment
   */
  static async toggleAssignmentPublish(
    assignmentId: string,
    publish: boolean
  ): Promise<Assignment> {
    try {
      return await prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          isPublished: publish,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error toggling assignment publish status:", error);
      throw new Error("Failed to update assignment status");
    }
  }

  // ===========================================================
  // ASSIGNMENT SUBMISSION OPERATIONS
  // ===========================================================

  /**
   * Submit an assignment
   */
  static async submitAssignment(
    data: SubmitAssignmentData
  ): Promise<AssignmentSubmission> {
    try {
      const assignment = await prisma.assignment.findUnique({
        where: { id: data.assignmentId },
      });

      if (!assignment) {
        throw new Error("Assignment not found");
      }

      if (!assignment.isPublished) {
        throw new Error("Assignment is not published");
      }

      // Check if due date has passed
      const now = new Date();
      const isLate =
        now > assignment.dueDate && !assignment.allowLateSubmission;

      if (isLate && !assignment.allowLateSubmission) {
        throw new Error("Assignment submission is closed");
      }

      // Get current attempt number
      const previousSubmissions = await prisma.assignmentSubmission.findMany({
        where: {
          studentId: data.studentId,
          assignmentId: data.assignmentId,
        },
        orderBy: { attemptNumber: "desc" },
      });

      const nextAttemptNumber =
        previousSubmissions.length > 0
          ? previousSubmissions[0].attemptNumber + 1
          : 1;

      // Check if max attempts reached
      if (nextAttemptNumber > assignment.allowedAttempts) {
        throw new Error("Maximum submission attempts reached");
      }

      return await prisma.assignmentSubmission.create({
        data: {
          submissionUrl: data.submissionUrl,
          content: data.content,
          studentId: data.studentId,
          assignmentId: data.assignmentId,
          attemptNumber: nextAttemptNumber,
          isLate: isLate,
          submittedAt: now,
        },
      });
    } catch (error) {
      console.error("Error submitting assignment:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to submit assignment");
    }
  }

  /**
   * Get submissions for an assignment
   */
  static async getSubmissionsByAssignment(
    assignmentId: string
  ): Promise<AssignmentSubmissionWithRelations[]> {
    try {
      return await prisma.assignmentSubmission.findMany({
        where: { assignmentId },
        include: {
          student: true,
          assignment: true,
        },
        orderBy: { submittedAt: "desc" },
      });
    } catch (error) {
      console.error("Error fetching assignment submissions:", error);
      throw new Error("Failed to fetch submissions");
    }
  }

  /**
   * Get submissions by a student
   */
  static async getSubmissionsByStudent(
    studentId: string
  ): Promise<AssignmentSubmissionWithRelations[]> {
    try {
      return await prisma.assignmentSubmission.findMany({
        where: { studentId },
        include: {
          student: true,
          assignment: {
            include: {
              course: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      });
    } catch (error) {
      console.error("Error fetching student submissions:", error);
      throw new Error("Failed to fetch student submissions");
    }
  }

  /**
   * Get a specific submission
   */
  static async getSubmissionById(
    submissionId: string
  ): Promise<AssignmentSubmissionWithRelations | null> {
    try {
      return await prisma.assignmentSubmission.findUnique({
        where: { id: submissionId },
        include: {
          student: true,
          assignment: {
            include: {
              course: true,
              teacher: true,
            },
          },
        },
      });
    } catch (error) {
      console.error("Error fetching submission:", error);
      throw new Error("Failed to fetch submission");
    }
  }

  /**
   * Grade an assignment submission
   */
  static async gradeSubmission(
    submissionId: string,
    data: GradeAssignmentData
  ): Promise<AssignmentSubmission> {
    try {
      return await prisma.assignmentSubmission.update({
        where: { id: submissionId },
        data: {
          score: data.score,
          feedback: data.feedback,
          isGraded: data.isGraded,
        },
      });
    } catch (error) {
      console.error("Error grading submission:", error);
      throw new Error("Failed to grade submission");
    }
  }

  /**
   * Delete a submission
   */
  static async deleteSubmission(submissionId: string): Promise<void> {
    try {
      await prisma.assignmentSubmission.delete({
        where: { id: submissionId },
      });
    } catch (error) {
      console.error("Error deleting submission:", error);
      throw new Error("Failed to delete submission");
    }
  }

  // ===========================================================
  // UTILITY & ANALYTICS FUNCTIONS
  // ===========================================================

  /**
   * Get assignment statistics for a student
   */
  static async getStudentAssignmentStats(studentId: string) {
    try {
      const submissions = await this.getSubmissionsByStudent(studentId);

      const totalAssignments = submissions.length;
      const submittedAssignments = submissions.filter(
        (sub) => sub.submittedAt
      ).length;
      const gradedAssignments = submissions.filter(
        (sub) => sub.isGraded
      ).length;
      const pendingAssignments = totalAssignments - submittedAssignments;
      const overdueAssignments = submissions.filter(
        (sub) => !sub.submittedAt && sub.assignment.dueDate < new Date()
      ).length;

      const averageScore =
        gradedAssignments > 0
          ? submissions.reduce((sum, sub) => sum + (sub.score || 0), 0) /
            gradedAssignments
          : 0;

      return {
        totalAssignments,
        submittedAssignments,
        gradedAssignments,
        pendingAssignments,
        overdueAssignments,
        averageScore: Math.round(averageScore * 100) / 100,
      };
    } catch (error) {
      console.error("Error fetching student assignment stats:", error);
      throw new Error("Failed to fetch assignment statistics");
    }
  }

  /**
   * Get upcoming assignments for a student
   */
  static async getUpcomingAssignments(
    studentId: string,
    days: number = 7
  ): Promise<AssignmentWithRelations[]> {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: { course: true },
      });

      const courseIds = enrollments.map((enrollment) => enrollment.courseId);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      return await prisma.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
          dueDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          course: true,
          teacher: true,
          submissions: {
            where: { studentId },
          },
        },
        orderBy: { dueDate: "asc" },
      });
    } catch (error) {
      console.error("Error fetching upcoming assignments:", error);
      throw new Error("Failed to fetch upcoming assignments");
    }
  }

  /**
   * Get overdue assignments for a student
   */
  static async getOverdueAssignments(
    studentId: string
  ): Promise<AssignmentWithRelations[]> {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: { course: true },
      });

      const courseIds = enrollments.map((enrollment) => enrollment.courseId);

      const assignments = await prisma.assignment.findMany({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
          dueDate: {
            lt: new Date(),
          },
        },
        include: {
          course: true,
          teacher: true,
          submissions: {
            where: { studentId },
          },
        },
        orderBy: { dueDate: "asc" },
      });

      // Filter assignments that haven't been submitted
      return assignments.filter(
        (assignment) =>
          assignment.submissions.length === 0 ||
          assignment.submissions.every((sub) => !sub.submittedAt)
      );
    } catch (error) {
      console.error("Error fetching overdue assignments:", error);
      throw new Error("Failed to fetch overdue assignments");
    }
  }

  /**
   * Check if student can submit assignment
   */
  static async canStudentSubmitAssignment(
    studentId: string,
    assignmentId: string
  ): Promise<{
    canSubmit: boolean;
    reason?: string;
    attemptsLeft: number;
  }> {
    try {
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
      });

      if (!assignment) {
        return {
          canSubmit: false,
          reason: "Assignment not found",
          attemptsLeft: 0,
        };
      }

      if (!assignment.isPublished) {
        return {
          canSubmit: false,
          reason: "Assignment is not published",
          attemptsLeft: 0,
        };
      }

      const now = new Date();
      if (now > assignment.dueDate && !assignment.allowLateSubmission) {
        return {
          canSubmit: false,
          reason: "Assignment submission is closed",
          attemptsLeft: 0,
        };
      }

      const submissions = await prisma.assignmentSubmission.findMany({
        where: {
          studentId,
          assignmentId,
        },
      });

      const attemptsLeft = assignment.allowedAttempts - submissions.length;

      if (attemptsLeft <= 0) {
        return {
          canSubmit: false,
          reason: "No submission attempts left",
          attemptsLeft: 0,
        };
      }

      return { canSubmit: true, attemptsLeft };
    } catch (error) {
      console.error("Error checking submission eligibility:", error);
      return {
        canSubmit: false,
        reason: "Error checking eligibility",
        attemptsLeft: 0,
      };
    }
  }
}

// Export individual functions for easier imports
export const {
  getAssignmentsByCourse,
  getAssignmentsByStudent,
  getAssignmentsByTeacher,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  toggleAssignmentPublish,
  submitAssignment,
  getSubmissionsByAssignment,
  getSubmissionsByStudent,
  getSubmissionById,
  gradeSubmission,
  deleteSubmission,
  getStudentAssignmentStats,
  getUpcomingAssignments,
  getOverdueAssignments,
  canStudentSubmitAssignment,
} = AssignmentService;
