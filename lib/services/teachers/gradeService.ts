// // File: lib/services/teachers/gradeService.ts
import { prisma } from "@/lib/server/prisma";

export interface GradeSubmissionData {
  score: number;
  feedback?: string;
}

export interface BulkGradeData {
  submissionId: string;
  score: number;
  feedback?: string;
}

export class TeacherGradeService {
  /**
   * Grade a single submission
   */
  static async gradeSubmission(
    submissionId: string,
    teacherId: string,
    data: GradeSubmissionData
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
      if (data.score < 0 || data.score > submission.assignment.maxScore) {
        throw new Error(`Score must be between 0 and ${submission.assignment.maxScore}`);
      }

      const updatedSubmission = await prisma.assignmentSubmission.update({
        where: { id: submissionId },
        data: {
          score: data.score,
          feedback: data.feedback,
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

      // Update enrollment grade if this is the final attempt
      await this.updateEnrollmentGrade(
        submission.studentId,
        submission.assignment.courseId,
        teacherId
      );

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
            score: data.score,
            maxScore: submission.assignment.maxScore,
            assignmentTitle: submission.assignment.title,
          },
        },
      });

      // Create notification for student
      await prisma.notification.create({
        data: {
          userId: submission.student.userId,
          title: "Assignment Graded",
          message: `Your submission for "${submission.assignment.title}" has been graded. Score: ${data.score}/${submission.assignment.maxScore}`,
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
   * Grade multiple submissions in bulk
   */
  static async bulkGradeSubmissions(
    teacherId: string,
    grades: BulkGradeData[]
  ) {
    const results = [];

    for (const gradeData of grades) {
      try {
        const gradedSubmission = await this.gradeSubmission(
          gradeData.submissionId,
          teacherId,
          {
            score: gradeData.score,
            feedback: gradeData.feedback,
          }
        );
        results.push({
          submissionId: gradeData.submissionId,
          success: true,
          data: gradedSubmission,
        });
      } catch (error) {
        results.push({
          submissionId: gradeData.submissionId,
          success: false,
          error: error instanceof Error ? error.message : "Grading failed",
        });
      }
    }

    return results;
  }

  /**
   * Get ungraded submissions for a teacher
   */
  static async getUngradedSubmissions(
    teacherId: string,
    filters?: {
      courseId?: string;
      assignmentId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      isGraded: false,
      assignment: {
        teacherId: teacherId,
        ...(filters?.courseId && { courseId: filters.courseId }),
        ...(filters?.assignmentId && { id: filters.assignmentId }),
      },
    };

    const [submissions, total] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where,
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
          assignment: {
            include: {
              course: true,
            },
          },
        },
        orderBy: { submittedAt: "asc" },
        skip,
        take: limit,
      }),
      prisma.assignmentSubmission.count({ where }),
    ]);

    return {
      submissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get student performance in a course
   */
  static async getStudentPerformance(
    courseId: string,
    studentId: string,
    teacherId: string
  ) {
    // Verify teacher has access to the course
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [
          { instructorId: teacherId },
          { creatorId: teacherId },
        ],
      },
    });

    if (!course) {
      throw new Error("Course not found or access denied");
    }

    const [assignments, enrollment, submissions] = await Promise.all([
      prisma.assignment.findMany({
        where: {
          courseId: courseId,
          isPublished: true,
        },
        include: {
          submissions: {
            where: {
              studentId: studentId,
            },
            orderBy: {
              attemptNumber: "desc",
            },
          },
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
      }),
      prisma.assignmentSubmission.findMany({
        where: {
          studentId: studentId,
          assignment: {
            courseId: courseId,
          },
          isGraded: true,
        },
        include: {
          assignment: true,
        },
        orderBy: { submittedAt: "desc" },
      }),
    ]);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Calculate performance metrics
    const gradedSubmissions = submissions.filter(s => s.isGraded);
    const totalPossibleScore = assignments.reduce((acc, assignment) => acc + assignment.maxScore, 0);
    const totalEarnedScore = gradedSubmissions.reduce((acc, submission) => acc + (submission.score || 0), 0);
    const overallAverage = totalPossibleScore > 0 ? (totalEarnedScore / totalPossibleScore) * 100 : 0;

    const assignmentPerformance = assignments.map(assignment => {
      const submission = assignment.submissions[0]; // Latest attempt
      return {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          maxScore: assignment.maxScore,
          dueDate: assignment.dueDate,
        },
        submission: submission ? {
          id: submission.id,
          score: submission.score,
          isGraded: submission.isGraded,
          submittedAt: submission.submittedAt,
          isLate: submission.isLate,
          attemptNumber: submission.attemptNumber,
        } : null,
        status: !submission ? 'not_submitted' : submission.isGraded ? 'graded' : 'submitted',
      };
    });

    return {
      student,
      enrollment,
      performance: {
        overallAverage: Math.round(overallAverage * 100) / 100,
        totalAssignments: assignments.length,
        submittedAssignments: assignments.filter(a => a.submissions.length > 0).length,
        gradedAssignments: assignments.filter(a => a.submissions.some(s => s.isGraded)).length,
        totalEarnedScore,
        totalPossibleScore,
        completionRate: assignments.length > 0 ? (assignments.filter(a => a.submissions.length > 0).length / assignments.length) * 100 : 0,
      },
      assignmentPerformance,
      recentSubmissions: submissions.slice(0, 10),
    };
  }

  /**
   * Update enrollment grade based on assignment scores
   */
  private static async updateEnrollmentGrade(
    studentId: string,
    courseId: string,
    teacherId: string
  ) {
    try {
      const gradedSubmissions = await prisma.assignmentSubmission.findMany({
        where: {
          studentId,
          assignment: {
            courseId,
          },
          isGraded: true,
        },
        include: {
          assignment: true,
        },
      });

      if (gradedSubmissions.length === 0) return;

      const totalScore = gradedSubmissions.reduce((acc, submission) => acc + (submission.score || 0), 0);
      const totalMaxScore = gradedSubmissions.reduce((acc, submission) => acc + submission.assignment.maxScore, 0);
      const averageScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

      // Convert to grade letter
      const grade = this.calculateGradeLetter(averageScore);

      await prisma.enrollment.update({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
        data: {
          score: averageScore,
          grade: grade as any, // Cast to the correct enum type if needed, e.g., grade as Grade
        },
      });
    } catch (error) {
      console.error("Update enrollment grade error:", error);
    }
  }

  /**
   * Calculate grade letter from percentage
   */
  private static calculateGradeLetter(percentage: number): string {
    if (percentage >= 90) return "A";
    if (percentage >= 80) return "B";
    if (percentage >= 70) return "C";
    if (percentage >= 60) return "D";
    if (percentage >= 50) return "E";
    return "F";
  }

  /**
   * Export grades for a course
   */
  static async exportCourseGrades(courseId: string, teacherId: string) {
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [
          { instructorId: teacherId },
          { creatorId: teacherId },
        ],
      },
      include: {
        enrollments: {
          include: {
            student: true,
          },
        },
        assignments: {
          where: { isPublished: true },
          include: {
            submissions: {
              include: {
                student: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new Error("Course not found or access denied");
    }

    // Create gradebook data
    const gradebook = course.enrollments.map(enrollment => {
      const studentGrades = course.assignments.map(assignment => {
        const submission = assignment.submissions.find(s => s.studentId === enrollment.studentId);
        return {
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          maxScore: assignment.maxScore,
          score: submission?.score || null,
          isGraded: submission?.isGraded || false,
          submittedAt: submission?.submittedAt || null,
        };
      });

      const gradedGrades = studentGrades.filter(grade => grade.isGraded);
      const totalScore = gradedGrades.reduce((acc, grade) => acc + (grade.score || 0), 0);
      const totalMaxScore = gradedGrades.reduce((acc, grade) => acc + grade.maxScore, 0);
      const average = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

      return {
        student: {
          id: enrollment.studentId,
          matricNumber: enrollment.student.matricNumber,
          firstName: enrollment.student.firstName,
          lastName: enrollment.student.lastName,
          email: enrollment.student.email,
        },
        enrollment: {
          grade: enrollment.grade,
          score: enrollment.score,
          isCompleted: enrollment.isCompleted,
        },
        assignments: studentGrades,
        overall: {
          average: Math.round(average * 100) / 100,
          grade: this.calculateGradeLetter(average),
          totalGraded: gradedGrades.length,
          totalAssignments: course.assignments.length,
        },
      };
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: teacherId,
        action: "EXPORT_TRANSCRIPT",
        resourceType: "COURSE",
        resourceId: courseId,
        details: {
          courseCode: course.code,
          totalStudents: course.enrollments.length,
          totalAssignments: course.assignments.length,
        },
      },
    });

    return {
      course: {
        code: course.code,
        title: course.title,
        credits: course.credits,
        level: course.level,
        semester: course.semester,
      },
      gradebook,
      exportedAt: new Date().toISOString(),
    };
  }
}