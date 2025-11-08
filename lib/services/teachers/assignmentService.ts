// src/lib/services/teachers/assignmentService.ts
import { prisma } from "@/lib/server/prisma";

export interface CreateAssignmentData {
  title: string;
  description?: string;
  instructions?: string;
  dueDate: Date;
  maxScore: number;
  courseId: string;
  teacherId: string;
  allowedAttempts?: number;
  assignmentUrl?: string;
  allowLateSubmission?: boolean;
}

export interface UpdateAssignmentData {
  title?: string;
  description?: string;
  instructions?: string;
  dueDate?: Date;
  maxScore?: number;
  allowedAttempts?: number;
  assignmentUrl?: string;
  allowLateSubmission?: boolean;
  isPublished?: boolean;
}

export class TeacherAssignmentService {
  /**
   * Create a new assignment
   */
  static async createAssignment(data: CreateAssignmentData) {
    try {
      // Verify teacher has access to the course
      const course = await prisma.course.findFirst({
        where: {
          id: data.courseId,
          OR: [
            { instructorId: data.teacherId },
            { creatorId: data.teacherId },
          ],
        },
      });

      if (!course) {
        throw new Error("Teacher does not have access to this course");
      }

      const assignment = await prisma.assignment.create({
        data: {
          title: data.title,
          description: data.description,
          instructions: data.instructions,
          dueDate: data.dueDate,
          maxScore: data.maxScore,
          courseId: data.courseId,
          teacherId: data.teacherId,
          allowedAttempts: data.allowedAttempts || 1,
          assignmentUrl: data.assignmentUrl,
          allowLateSubmission: data.allowLateSubmission || false,
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

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: data.teacherId,
          action: "ASSIGNMENT_CREATED",
          resourceType: "ASSIGNMENT",
          resourceId: assignment.id,
          details: {
            courseId: data.courseId,
            courseCode: course.code,
            dueDate: data.dueDate,
            maxScore: data.maxScore,
          },
        },
      });

      return assignment;
    } catch (error) {
      console.error("Create assignment error:", error);
      throw error;
    }
  }

  /**
   * Update an assignment
   */
  static async updateAssignment(
    assignmentId: string,
    teacherId: string,
    data: UpdateAssignmentData
  ) {
    try {
      // Verify teacher owns the assignment
      const existingAssignment = await prisma.assignment.findFirst({
        where: {
          id: assignmentId,
          teacherId: teacherId,
        },
      });

      if (!existingAssignment) {
        throw new Error("Assignment not found or access denied");
      }

      const assignment = await prisma.assignment.update({
        where: { id: assignmentId },
        data,
        include: {
          course: true,
          submissions: {
            include: {
              student: true,
            },
          },
        },
      });

      return assignment;
    } catch (error) {
      console.error("Update assignment error:", error);
      throw error;
    }
  }

  /**
   * Get teacher's assignments
   */
  static async getTeacherAssignments(teacherId: string, filters?: {
    courseId?: string;
    isPublished?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where = {
      teacherId,
      ...(filters?.courseId && { courseId: filters.courseId }),
      ...(filters?.isPublished !== undefined && { isPublished: filters.isPublished }),
    };

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        include: {
          course: true,
          submissions: {
            include: {
              student: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.assignment.count({ where }),
    ]);

    return {
      assignments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get assignment with submissions
   */
  static async getAssignmentWithSubmissions(assignmentId: string, teacherId: string) {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        teacherId: teacherId,
      },
      include: {
        course: true,
        submissions: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    isActive: true,
                  },
                },
              },
            },
          },
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    if (!assignment) {
      throw new Error("Assignment not found or access denied");
    }

    return assignment;
  }

  /**
   * Grade assignment submission
   */
  static async gradeSubmission(
    submissionId: string,
    teacherId: string,
    score: number,
    feedback?: string
  ) {
    try {
      // Verify teacher has access to this submission
      const submission = await prisma.assignmentSubmission.findFirst({
        where: {
          id: submissionId,
          assignment: {
            teacherId: teacherId,
          },
        },
        include: {
          assignment: true,
          student: true,
        },
      });

      if (!submission) {
        throw new Error("Submission not found or access denied");
      }

      // Validate score
      if (score < 0 || score > submission.assignment.maxScore) {
        throw new Error(`Score must be between 0 and ${submission.assignment.maxScore}`);
      }

      const updatedSubmission = await prisma.assignmentSubmission.update({
        where: { id: submissionId },
        data: {
          score,
          feedback,
          isGraded: true,
        },
        include: {
          student: true,
          assignment: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: teacherId,
          action: "GRADE_ASSIGNED",
          resourceType: "ASSIGNMENT",
          resourceId: submission.assignmentId,
          details: {
            submissionId,
            studentId: submission.studentId,
            score,
            maxScore: submission.assignment.maxScore,
          },
        },
      });

      // Create notification for student
      await prisma.notification.create({
        data: {
          userId: submission.student.userId,
          title: "Assignment Graded",
          message: `Your submission for "${submission.assignment.title}" has been graded. Score: ${score}/${submission.assignment.maxScore}`,
          type: "SUCCESS",
          actionUrl: `/assignments/${submission.assignmentId}`,
        },
      });

      return updatedSubmission;
    } catch (error) {
      console.error("Grade submission error:", error);
      throw error;
    }
  }

  /**
   * Publish/unpublish assignment
   */
  static async toggleAssignmentPublish(
    assignmentId: string,
    teacherId: string,
    publish: boolean
  ) {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        teacherId: teacherId,
      },
    });

    if (!assignment) {
      throw new Error("Assignment not found or access denied");
    }

    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        isPublished: publish,
        ...(publish && { publishedAt: new Date() }),
      },
      include: {
        course: true,
      },
    });

    return updatedAssignment;
  }

  /**
   * Delete assignment
   */
  static async deleteAssignment(assignmentId: string, teacherId: string) {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        teacherId: teacherId,
      },
    });

    if (!assignment) {
      throw new Error("Assignment not found or access denied");
    }

    // Check if there are submissions
    const submissionCount = await prisma.assignmentSubmission.count({
      where: { assignmentId },
    });

    if (submissionCount > 0) {
      throw new Error("Cannot delete assignment with existing submissions");
    }

    await prisma.assignment.delete({
      where: { id: assignmentId },
    });

    return { success: true, message: "Assignment deleted successfully" };
  }
}