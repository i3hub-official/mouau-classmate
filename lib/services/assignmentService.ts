// lib/services/assignmentService.ts
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

export type SubmitAssignmentByUserIdData = {
  submissionUrl?: string;
  content?: string;
  userId: string;
  assignmentId: string;
  attemptNumber?: number;
};

export type GradeAssignmentData = {
  score: number;
  feedback?: string;
  isGraded: boolean;
};

// Helper function to check database connection
async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    throw new Error(
      "Database connection failed. Please check your DATABASE_URL environment variable."
    );
  }
}

export class AssignmentService {
  // ===========================================================
  // UTILITY METHODS
  // ===========================================================

  /**
   * Get student ID from user ID
   */
  static async getStudentIdByUserId(userId: string): Promise<string> {
    try {
      // Validate input
      if (!userId) {
        throw new Error("User ID is required");
      }

      // Check database connection
      await checkDatabaseConnection();

      const student = await prisma.student.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (!student) {
        throw new Error(`Student not found for user ID: ${userId}`);
      }

      return student.id;
    } catch (error) {
      console.error("Error fetching student ID:", error);
      
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Failed to fetch student information: ${error.message}`);
      }
      throw new Error("Failed to fetch student information");
    }
  }

  /**
   * Get teacher ID from user ID
   */
  static async getTeacherIdByUserId(userId: string): Promise<string> {
    try {
      // Validate input
      if (!userId) {
        throw new Error("User ID is required");
      }

      // Check database connection
      await checkDatabaseConnection();

      const teacher = await prisma.teacher.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (!teacher) {
        throw new Error(`Teacher not found for user ID: ${userId}`);
      }

      return teacher.id;
    } catch (error) {
      console.error("Error fetching teacher ID:", error);
      
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Failed to fetch teacher information: ${error.message}`);
      }
      throw new Error("Failed to fetch teacher information");
    }
  }

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
      if (!courseId) {
        throw new Error("Course ID is required");
      }

      await checkDatabaseConnection();

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
      
      if (error instanceof Error) {
        throw new Error(`Failed to fetch assignments: ${error.message}`);
      }
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
      if (!studentId) {
        throw new Error("Student ID is required");
      }

      await checkDatabaseConnection();

      // First, get the student's enrolled courses
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: { course: true },
      });

      const courseIds = enrollments.map((enrollment) => enrollment.courseId);

      // If no enrollments, return empty array
      if (courseIds.length === 0) {
        return [];
      }

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
      
      if (error instanceof Error) {
        throw new Error(`Failed to fetch student assignments: ${error.message}`);
      }
      throw new Error("Failed to fetch student assignments");
    }
  }

  /**
   * Get assignments for a student (using user ID)
   */
  static async getAssignmentsByUserId(
    userId: string
  ): Promise<AssignmentWithRelations[]> {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      const studentId = await this.getStudentIdByUserId(userId);
      return await this.getAssignmentsByStudent(studentId);
    } catch (error) {
      console.error("Error fetching assignments by user ID:", error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to fetch student assignments: ${error.message}`);
      }
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
      if (!teacherId) {
        throw new Error("Teacher ID is required");
      }

      await checkDatabaseConnection();

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
      
      if (error instanceof Error) {
        throw new Error(`Failed to fetch teacher assignments: ${error.message}`);
      }
      throw new Error("Failed to fetch teacher assignments");
    }
  }

  /**
   * Get assignments created by a teacher (using user ID)
   */
  static async getAssignmentsByTeacherUserId(
    userId: string
  ): Promise<AssignmentWithRelations[]> {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      const teacherId = await this.getTeacherIdByUserId(userId);
      return await this.getAssignmentsByTeacher(teacherId);
    } catch (error) {
      console.error("Error fetching assignments by teacher user ID:", error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to fetch teacher assignments: ${error.message}`);
      }
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
      if (!assignmentId) {
        throw new Error("Assignment ID is required");
      }

      await checkDatabaseConnection();

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
      
      if (error instanceof Error) {
        throw new Error(`Failed to fetch assignment: ${error.message}`);
      }
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
      if (!data.title || !data.courseId) {
        throw new Error("Title and course ID are required");
      }

      await checkDatabaseConnection();

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
      
      if (error instanceof Error) {
        throw new Error(`Failed to create assignment: ${error.message}`);
      }
      throw new Error("Failed to create assignment");
    }
  }

  /**
   * Create a new assignment (using user ID)
   */
  static async createAssignmentByUserId(
    data: Omit<CreateAssignmentData, "teacherId"> & { userId: string }
  ): Promise<Assignment> {
    try {
      if (!data.userId) {
        throw new Error("User ID is required");
      }

      const teacherId = await this.getTeacherIdByUserId(data.userId);

      const assignmentData: CreateAssignmentData = {
        ...data,
        teacherId,
      };

      return await this.createAssignment(assignmentData);
    } catch (error) {
      console.error("Error creating assignment by user ID:", error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to create assignment: ${error.message}`);
      }
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
      if (!assignmentId) {
        throw new Error("Assignment ID is required");
      }

      await checkDatabaseConnection();

      return await prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error updating assignment:", error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to update assignment: ${error.message}`);
      }
      throw new Error("Failed to update assignment");
    }
  }

  /**
   * Delete an assignment
   */
  static async deleteAssignment(assignmentId: string): Promise<void> {
    try {
      if (!assignmentId) {
        throw new Error("Assignment ID is required");
      }

      await checkDatabaseConnection();

      await prisma.assignment.delete({
        where: { id: assignmentId },
      });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to delete assignment: ${error.message}`);
      }
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
      if (!assignmentId) {
        throw new Error("Assignment ID is required");
      }

      await checkDatabaseConnection();

      return await prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          isPublished: publish,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error toggling assignment publish status:", error);
      
      if (error instanceof Error) {
        throw new Error(`Failed to update assignment status: ${error.message}`);
      }
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
      if (!data.studentId || !data.assignmentId) {
        throw new Error("Student ID and assignment ID are required");
      }

      await checkDatabaseConnection();

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
        throw error; // Preserve specific error messages
      }
      throw new Error("Failed to submit assignment");
    }
  }

  /**
   * Submit assignment (using user ID)
   */
  static async submitAssignmentByUserId(
    data: SubmitAssignmentByUserIdData
  ): Promise<AssignmentSubmission> {
    try {
      if (!data.userId) {
        throw new Error("User ID is required");
      }

      const studentId = await this.getStudentIdByUserId(data.userId);

      const submissionData: SubmitAssignmentData = {
        ...data,
        studentId,
      };

      return await this.submitAssignment(submissionData);
    } catch (error) {
      console.error("Error submitting assignment by user ID:", error);
      
      if (error instanceof Error) {
        throw error; // Preserve specific error messages
      }
      throw new Error("Failed to submit assignment");
    }
  }

  // ... (Continue with remaining methods following the same pattern)
  // For brevity, I'll include just a few more key methods

  /**
   * Get submissions for an assignment
   */
  static async getSubmissionsByAssignment(
    assignmentId: string
  ): Promise<AssignmentSubmissionWithRelations[]> {
    try {
      if (!assignmentId) {
        throw new Error("Assignment ID is required");
      }

      await checkDatabaseConnection();

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
      
      if (error instanceof Error) {
        throw new Error(`Failed to fetch submissions: ${error.message}`);
      }
      throw new Error("Failed to fetch submissions");
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
      if (!submissionId) {
        throw new Error("Submission ID is required");
      }

      await checkDatabaseConnection();

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
      
      if (error instanceof Error) {
        throw new Error(`Failed to grade submission: ${error.message}`);
      }
      throw new Error("Failed to grade submission");
    }
  }
}

// Export individual functions for easier imports
export const {
  getStudentIdByUserId,
  getTeacherIdByUserId,
  getAssignmentsByCourse,
  getAssignmentsByStudent,
  getAssignmentsByUserId,
  getAssignmentsByTeacher,
  getAssignmentsByTeacherUserId,
  getAssignmentById,
  createAssignment,
  createAssignmentByUserId,
  updateAssignment,
  deleteAssignment,
  toggleAssignmentPublish,
  submitAssignment,
  submitAssignmentByUserId,
  getSubmissionsByAssignment,
  gradeSubmission,
} = AssignmentService;