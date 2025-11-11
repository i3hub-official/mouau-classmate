// File: lib/services/teacher/gradeService.ts

import { prisma } from "@/lib/server/prisma";
import {
  GradeEntry,
  BulkGradeUpload,
  GradeDistribution,
  CourseGradingStats,
} from "@/lib/types/teacher/index";
import { Grade } from "@prisma/client";

export class TeacherGradeService {
  /**
   * Get grading statistics for a course
   */
  static async getCourseGradingStats(teacherId: string, courseId: string) {
    try {
      // Verify teacher is assigned to the course
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      if (course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      // Get all enrollments for the course
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId },
        include: {
          student: {
            select: {
              id: true,
              matricNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Get all assignments for the course
      const assignments = await prisma.assignment.findMany({
        where: { courseId },
        include: {
          submissions: {
            where: { isGraded: true },
          },
        },
      });

      const totalStudents = enrollments.length;
      const gradedStudents = enrollments.filter((e) => e.grade !== null).length;
      const pendingGrades = totalStudents - gradedStudents;

      // Calculate average score
      const gradedEnrollments = enrollments.filter((e) => e.score !== null);
      const averageScore =
        gradedEnrollments.length > 0
          ? gradedEnrollments.reduce((sum, e) => sum + (e.score || 0), 0) /
            gradedEnrollments.length
          : 0;

      // Calculate highest and lowest scores
      const scores = gradedEnrollments.map((e) => e.score || 0);
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

      // Calculate grade distribution
      const gradeCounts = {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        E: 0,
        F: 0,
      };

      enrollments.forEach((e) => {
        if (e.grade) {
          gradeCounts[e.grade]++;
        }
      });

      const total = Object.values(gradeCounts).reduce(
        (sum, count) => sum + count,
        0
      );
      const distribution: GradeDistribution[] = Object.entries(gradeCounts).map(
        ([grade, count]) => ({
          grade: grade as Grade,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0,
        })
      );

      const stats = {
        courseId,
        courseCode: course.code,
        courseTitle: course.title,
        totalStudents,
        gradedStudents,
        pendingGrades,
        averageScore: parseFloat(averageScore.toFixed(2)),
        highestScore,
        lowestScore,
        distribution,
      } as CourseGradingStats;

      return stats;
    } catch (error) {
      console.error("Error getting course grading stats:", error);
      throw error;
    }
  }

  /**
   * Grade a student
   */
  static async gradeStudent(teacherId: string, gradeEntry: GradeEntry) {
    try {
      const { studentId, courseId, score, grade, remarks } = gradeEntry;

      // Verify teacher is assigned to the course
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      if (course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      // Check if student is enrolled
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
      });

      if (!enrollment) {
        throw new Error("Student is not enrolled in this course");
      }

      // Validate score and grade
      if (score < 0 || score > 100) {
        throw new Error("Score must be between 0 and 100");
      }

      if (!Object.values(Grade).includes(grade)) {
        throw new Error("Invalid grade");
      }

      // Update the enrollment with grade
      const updatedEnrollment = await prisma.enrollment.update({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
        data: {
          score,
          grade,
          progress: 100, // Mark as complete when graded
          isCompleted: true,
          completionDate: new Date(),
        },
        include: {
          student: {
            select: {
              id: true,
              matricNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Log the grading
      await prisma.auditLog.create({
        data: {
          userId: teacherId,
          action: "GRADE_ASSIGNED",
          resourceType: "ENROLLMENT",
          resourceId: updatedEnrollment.id,
          details: {
            studentId,
            courseId,
            score,
            grade,
            courseCode: course.code,
          },
        },
      });

      return {
        success: true,
        enrollment: updatedEnrollment,
        message: "Student graded successfully",
      };
    } catch (error) {
      console.error("Error grading student:", error);
      throw error;
    }
  }

  /**
   * Bulk grade students
   */
  static async bulkGradeStudents(
    teacherId: string,
    bulkGradeData: BulkGradeUpload
  ) {
    try {
      const { courseId, grades } = bulkGradeData;

      // Verify teacher is assigned to the course
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      if (course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      const results = [];

      for (const gradeEntry of grades) {
        try {
          const result = await this.gradeStudent(teacherId, gradeEntry);
          results.push({
            success: true,
            studentId: gradeEntry.studentId,
            enrollment: result.enrollment,
          });
        } catch (error) {
          results.push({
            success: false,
            studentId: gradeEntry.studentId,
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
      console.error("Error bulk grading students:", error);
      throw error;
    }
  }

  /**
   * Get gradebook for a course
   */
  static async getCourseGradebook(teacherId: string, courseId: string) {
    try {
      // Verify teacher is assigned to the course
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error("Course not found");
      }

      if (course.instructorId !== teacherId) {
        throw new Error("You are not assigned to teach this course");
      }

      // Get all enrollments with student details
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId },
        include: {
          student: {
            select: {
              id: true,
              matricNumber: true,
              firstName: true,
              lastName: true,
              otherName: true,
              email: true,
            },
          },
        },
        orderBy: { student: { firstName: "asc" } },
      });

      // Get all assignments for the course
      const assignments = await prisma.assignment.findMany({
        where: { courseId },
        orderBy: { dueDate: "asc" },
      });

      // Get all assignment submissions
      const submissions = await prisma.assignmentSubmission.findMany({
        where: {
          studentId: { in: enrollments.map((e) => e.studentId) },
          assignment: { courseId },
        },
        include: {
          assignment: true,
        },
      });

      // Build gradebook data
      const gradebook = enrollments.map((enrollment) => {
        const studentSubmissions = submissions.filter(
          (s) => s.studentId === enrollment.studentId
        );
        const assignmentGrades = assignments.map((assignment) => {
          const submission = studentSubmissions.find(
            (s) => s.assignmentId === assignment.id
          );
          return {
            assignmentId: assignment.id,
            assignmentTitle: assignment.title,
            maxScore: assignment.maxScore,
            score: submission?.score,
            isGraded: submission?.isGraded || false,
            isLate: submission?.isLate || false,
            submittedAt: submission?.submittedAt,
          };
        });

        return {
          student: enrollment.student,
          enrollmentId: enrollment.id,
          finalGrade: enrollment.grade,
          finalScore: enrollment.score,
          isCompleted: enrollment.isCompleted,
          progress: enrollment.progress,
          assignmentGrades,
        };
      });

      return {
        course,
        assignments,
        gradebook,
      };
    } catch (error) {
      console.error("Error getting course gradebook:", error);
      throw error;
    }
  }

  /**
   * Export grades
   */
  static async exportGrades(
    teacherId: string,
    courseId: string,
    format: "csv" | "excel" = "csv"
  ) {
    try {
      // Get gradebook data
      const gradebookData = await this.getCourseGradebook(teacherId, courseId);

      // Log the export
      await prisma.auditLog.create({
        data: {
          userId: teacherId,
          action: "EXPORT_TRANSCRIPT",
          resourceType: "COURSE",
          resourceId: courseId,
          details: {
            format,
            courseCode: gradebookData.course.code,
          },
        },
      });

      // In a real implementation, you would generate and return the actual file
      // For now, we'll just return the data
      return {
        success: true,
        data: gradebookData,
        format,
        message: `Grades exported successfully in ${format.toUpperCase()} format`,
      };
    } catch (error) {
      console.error("Error exporting grades:", error);
      throw error;
    }
  }

  /**
   * Calculate grade from score
   */
  static calculateGrade(score: number): Grade {
    if (score >= 70) return Grade.A;
    if (score >= 60) return Grade.B;
    if (score >= 50) return Grade.C;
    if (score >= 45) return Grade.D;
    if (score >= 40) return Grade.E;
    return Grade.F;
  }

  /**
   * Calculate grade point from grade
   */
  static calculateGradePoint(grade: Grade): number {
    switch (grade) {
      case Grade.A:
        return 5.0;
      case Grade.B:
        return 4.0;
      case Grade.C:
        return 3.0;
      case Grade.D:
        return 2.0;
      case Grade.E:
        return 1.0;
      case Grade.F:
        return 0.0;
      default:
        return 0;
    }
  }
}
