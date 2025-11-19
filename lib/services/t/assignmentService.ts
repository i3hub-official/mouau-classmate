// lib/services/t/assignmentService.ts
import { prisma } from "@/lib/server/prisma";
import {
  Assignment,
  AssignmentFormData,
  AssignmentSubmission,
  GradingData,
  BulkGradingData,
} from "@/lib/types/t/index";
import { AuditAction } from "@prisma/client";

export class TeacherAssignmentService {
  /**
   * Get assignments for a teacher
   */
  static async getTeacherAssignments(
    teacherId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      // Get courses taught by the teacher
      const courses = await prisma.course.findMany({
        where: { instructorId: teacherId },
        select: { id: true },
      });

      const courseIds = courses.map((c) => c.id);

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
          where: { courseId: { in: courseIds } },
          skip,
          take: limit,
          include: {
            course: true,
            submissions: {
              include: {
                student: {
                  select: {
                    id: true,
                    matricNumber: true,
                    firstName: true,
                    surname: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.assignment.count({
          where: { courseId: { in: courseIds } },
        }),
      ]);

      return {
        assignments: assignments as Assignment[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting teacher assignments:", error);
      throw error;
    }
  }

  /**
   * Create assignment
   */
  static async createAssignment(
    teacherId: string,
    assignmentData: AssignmentFormData
  ) {
    try {
      // Verify teacher is assigned to the course
      const course = await prisma.course.findUnique({
        where: { id: assignmentData.courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      if (course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      const assignment = await prisma.assignment.create({
        data: {
          title: assignmentData.title,
          description: assignmentData.description,
          instructions: assignmentData.instructions,
          dueDate: assignmentData.dueDate,
          maxScore: assignmentData.maxScore,
          allowedAttempts: assignmentData.allowedAttempts,
          assignmentUrl: assignmentData.assignmentUrl,
          allowLateSubmission: assignmentData.allowLateSubmission,
          isPublished: assignmentData.isPublished,
          courseId: assignmentData.courseId,
          teacherId,
        },
        include: {
          course: true,
        },
      });

      // Log assignment creation
      await prisma.auditLog.create({
        data: {
          userId: teacherId,
          action: "ASSIGNMENT_CREATED",
          resourceType: "ASSIGNMENT",
          resourceId: assignment.id,
          details: {
            title: assignment.title,
            courseId: assignment.courseId,
            courseCode: course.code,
          },
        },
      });

      return {
        success: true,
        assignment: assignment as Assignment,
        message: "Assignment created successfully",
      };
    } catch (error) {
      console.error("Error creating assignment:", error);
      throw error;
    }
  }

  /**
   * Update assignment
   */
  static async updateAssignment(
    teacherId: string,
    assignmentId: string,
    assignmentData: Partial<AssignmentFormData>
  ) {
    try {
      // Get the assignment
      const existingAssignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          course: true,
        },
      });

      if (!existingAssignment) {
        throw new Error("Assignment not found");
      }

      // Verify teacher is assigned to the course
      if (existingAssignment.course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      const assignment = await prisma.assignment.update({
        where: { id: assignmentId },
        data: {
          ...assignmentData,
          updatedAt: new Date(),
        },
        include: {
          course: true,
          submissions: {
            include: {
              student: {
                select: {
                  id: true,
                  matricNumber: true,
                  firstName: true,
                  surname: true,
                },
              },
            },
          },
        },
      });

      // Log assignment update
      await prisma.auditLog.create({
        data: {
          userId: teacherId,
          action: "PROFILE_UPDATED",
          resourceType: "ASSIGNMENT",
          resourceId: assignmentId,
          details: {
            title: assignment.title,
            updatedFields: Object.keys(assignmentData),
          },
        },
      });

      return {
        success: true,
        assignment: assignment as Assignment,
        message: "Assignment updated successfully",
      };
    } catch (error) {
      console.error("Error updating assignment:", error);
      throw error;
    }
  }

  /**
   * Delete assignment
   */
  static async deleteAssignment(teacherId: string, assignmentId: string) {
    try {
      // Get the assignment
      const existingAssignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          course: true,
        },
      });

      if (!existingAssignment) {
        throw new Error("Assignment not found");
      }

      // Verify teacher is assigned to the course
      if (existingAssignment.course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      // Delete the assignment (this will cascade delete submissions)
      await prisma.assignment.delete({
        where: { id: assignmentId },
      });

      // Log assignment deletion
      await prisma.auditLog.create({
        data: {
          userId: teacherId,
          action: "PROFILE_UPDATED",
          resourceType: "ASSIGNMENT",
          resourceId: assignmentId,
          details: {
            title: existingAssignment.title,
            action: "deleted",
          },
        },
      });

      return {
        success: true,
        message: "Assignment deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting assignment:", error);
      throw error;
    }
  }

  /**
   * Get assignment submissions
   */
  static async getAssignmentSubmissions(
    teacherId: string,
    assignmentId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      // Verify teacher is assigned to the course
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          course: true,
        },
      });

      if (!assignment) {
        throw new Error("Assignment not found");
      }

      if (assignment.course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      const skip = (page - 1) * limit;

      const [submissions, total] = await Promise.all([
        prisma.assignmentSubmission.findMany({
          where: { assignmentId },
          skip,
          take: limit,
          include: {
            student: {
              select: {
                id: true,
                matricNumber: true,
                firstName: true,
                surname: true,
                email: true,
              },
            },
          },
          orderBy: { submittedAt: "desc" },
        }),
        prisma.assignmentSubmission.count({ where: { assignmentId } }),
      ]);

      return {
        submissions: submissions as AssignmentSubmission[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting assignment submissions:", error);
      throw error;
    }
  }

  /**
   * Grade submission
   */
  static async gradeSubmission(teacherId: string, gradingData: GradingData) {
    try {
      const { submissionId, score, feedback } = gradingData;

      // Get the submission
      const submission = await prisma.assignmentSubmission.findUnique({
        where: { id: submissionId },
        include: {
          assignment: {
            include: {
              course: true,
            },
          },
          student: true,
        },
      });

      if (!submission) {
        throw new Error("Submission not found");
      }

      // Verify teacher is assigned to the course
      if (submission.assignment.course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      // Validate score
      if (score < 0 || score > submission.assignment.maxScore) {
        throw new Error(
          `Score must be between 0 and ${submission.assignment.maxScore}`
        );
      }

      // Update the submission
      const updatedSubmission = await prisma.assignmentSubmission.update({
        where: { id: submissionId },
        data: {
          score,
          feedback,
          isGraded: true,
        },
        include: {
          student: true,
          assignment: {
            include: {
              course: true,
            },
          },
        },
      });

      // Log the grading
      await prisma.auditLog.create({
        data: {
          userId: teacherId,
          action: "GRADE_ASSIGNED",
          resourceType: "ASSIGNMENT",
          resourceId: submission.assignmentId,
          details: {
            submissionId,
            score,
            studentId: submission.studentId,
            assignmentTitle: submission.assignment.title,
          },
        },
      });

      // Send notification to student (in a real implementation)
      // await StudentNotificationService.createNotification(
      //   submission.studentId,
      //   "Assignment Graded",
      //   `Your assignment "${submission.assignment.title}" has been graded.`,
      //   NotificationType.INFO,
      //   `/assignments/${submission.assignmentId}`,
      //   2
      // );

      return {
        success: true,
        submission: updatedSubmission,
        message: "Submission graded successfully",
      };
    } catch (error) {
      console.error("Error grading submission:", error);
      throw error;
    }
  }

  /**
   * Bulk grade submissions
   */
  static async bulkGradeSubmissions(
    teacherId: string,
    bulkGradingData: BulkGradingData
  ) {
    try {
      const { submissions } = bulkGradingData;
      const results = [];

      for (const gradingData of submissions) {
        try {
          const result = await this.gradeSubmission(teacherId, gradingData);
          results.push({
            success: true,
            submissionId: gradingData.submissionId,
            result,
          });
        } catch (error) {
          results.push({
            success: false,
            submissionId: gradingData.submissionId,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        success: true,
        results,
        message: "Bulk grading completed",
      };
    } catch (error) {
      console.error("Error bulk grading submissions:", error);
      throw error;
    }
  }

  /**
   * Get assignment statistics
   */
  static async getAssignmentStatistics(
    teacherId: string,
    assignmentId: string
  ) {
    try {
      // Verify teacher is assigned to the course
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          course: true,
        },
      });

      if (!assignment) {
        throw new Error("Assignment not found");
      }

      if (assignment.course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      // Get all submissions
      const submissions = await prisma.assignmentSubmission.findMany({
        where: { assignmentId },
      });

      // Get total enrolled students
      const totalEnrollments = await prisma.enrollment.count({
        where: { courseId: assignment.courseId },
      });

      const submittedCount = submissions.length;
      const gradedCount = submissions.filter((s) => s.isGraded).length;
      const pendingCount = submittedCount - gradedCount;
      const lateCount = submissions.filter((s) => s.isLate).length;

      // Calculate average score
      const gradedSubmissions = submissions.filter(
        (s) => s.isGraded && s.score !== null
      );
      const averageScore =
        gradedSubmissions.length > 0
          ? gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) /
            gradedSubmissions.length
          : 0;

      return {
        totalEnrollments,
        submitted: submittedCount,
        graded: gradedCount,
        pending: pendingCount,
        late: lateCount,
        averageScore: parseFloat(averageScore.toFixed(2)),
        submissionRate:
          totalEnrollments > 0 ? (submittedCount / totalEnrollments) * 100 : 0,
        gradingRate:
          submittedCount > 0 ? (gradedCount / submittedCount) * 100 : 0,
      };
    } catch (error) {
      console.error("Error getting assignment statistics:", error);
      throw error;
    }
  }
}
