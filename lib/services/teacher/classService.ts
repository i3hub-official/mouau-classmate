// File: lib/services/teacher/classService.ts

import { prisma } from "@/lib/server/prisma";
import {
  ClassInfo,
  EnrolledStudent,
  StudentPerformance,
} from "@/lib/types/teacher/index";
import { AuditAction } from "@prisma/client";

export class TeacherClassService {
  /**
   * Get class information for a teacher
   */
  static async getTeacherClasses(
    teacherId: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const skip = (page - 1) * limit;

      // Get courses taught by the teacher
      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where: { instructorId: teacherId },
          skip,
          take: limit,
          include: {
            enrollments: {
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
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.course.count({
          where: { instructorId: teacherId },
        }),
      ]);

      // Calculate class statistics
      const classes = courses.map((course) => {
        const totalEnrollments = course.enrollments.length;
        const activeStudents = course.enrollments.filter(
          (e) => !e.isCompleted
        ).length;
        const completedStudents = course.enrollments.filter(
          (e) => e.isCompleted
        ).length;
        const averageProgress =
          totalEnrollments > 0
            ? course.enrollments.reduce((sum, e) => sum + e.progress, 0) /
              totalEnrollments
            : 0;
        const averageGrade = course.enrollments
          .filter((e) => e.grade !== null)
          .reduce((sum, e, _, arr) => {
            const gradePoint = this.getGradePoint(e.grade);
            return sum + gradePoint / arr.length;
          }, 0);

        // Calculate attendance rate (simplified - would need attendance data)
        const attendanceRate = 85; // Placeholder

        return {
          course,
          enrolledStudents: course.enrollments.map((e) => ({
            ...e.student,
            enrollmentId: e.id,
            dateEnrolled: e.dateEnrolled,
            progress: e.progress,
            lastAccessedAt: e.lastAccessedAt,
            isCompleted: e.isCompleted,
            grade: e.grade,
            score: e.score,
          })) as EnrolledStudent[],
          totalEnrollments,
          activeStudents,
          completedStudents,
          averageProgress: parseFloat(averageProgress.toFixed(2)),
          averageGrade: parseFloat(averageGrade.toFixed(2)),
          attendanceRate,
        } as ClassInfo;
      });

      return {
        classes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting teacher classes:", error);
      throw error;
    }
  }

  /**
   * Get class details for a specific course
   */
  static async getClassDetails(teacherId: string, courseId: string) {
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

      // Get enrollments with student details
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
              phone: true,
              passportUrl: true,
              department: true,
              college: true,
            },
          },
        },
        orderBy: { student: { firstName: "asc" } },
      });

      // Calculate class statistics
      const totalEnrollments = enrollments.length;
      const activeStudents = enrollments.filter((e) => !e.isCompleted).length;
      const completedStudents = enrollments.filter((e) => e.isCompleted).length;
      const averageProgress =
        totalEnrollments > 0
          ? enrollments.reduce((sum, e) => sum + e.progress, 0) /
            totalEnrollments
          : 0;
      const averageGrade = enrollments
        .filter((e) => e.grade !== null)
        .reduce((sum, e, _, arr) => {
          const gradePoint = this.getGradePoint(e.grade);
          return sum + gradePoint / arr.length;
        }, 0);

      // Get attendance data (simplified)
      const attendanceRate = 85; // Placeholder - would need to calculate from attendance records

      const classInfo = {
        course,
        enrolledStudents: enrollments.map((e) => ({
          ...e.student,
          enrollmentId: e.id,
          dateEnrolled: e.dateEnrolled,
          progress: e.progress,
          lastAccessedAt: e.lastAccessedAt,
          isCompleted: e.isCompleted,
          grade: e.grade,
          score: e.score,
        })) as EnrolledStudent[],
        totalEnrollments,
        activeStudents,
        completedStudents,
        averageProgress: parseFloat(averageProgress.toFixed(2)),
        averageGrade: parseFloat(averageGrade.toFixed(2)),
        attendanceRate,
      } as ClassInfo;

      return classInfo;
    } catch (error) {
      console.error("Error getting class details:", error);
      throw error;
    }
  }

  /**
   * Get student performance in a class
   */
  static async getStudentPerformance(
    teacherId: string,
    courseId: string,
    studentId: string
  ) {
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

      // Get student enrollment
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
        include: {
          student: {
            select: {
              id: true,
              matricNumber: true,
              firstName: true,
              lastName: true,
              otherName: true,
              email: true,
              phone: true,
              passportUrl: true,
              department: true,
              college: true,
            },
          },
        },
      });

      if (!enrollment) {
        throw new Error("Student not enrolled in this course");
      }

      // Get assignment submissions
      const assignmentSubmissions = await prisma.assignmentSubmission.findMany({
        where: {
          studentId,
          assignment: {
            courseId,
          },
        },
        include: {
          assignment: true,
        },
      });

      // Get attendance records
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          studentId,
          courseId,
        },
      });

      // Calculate performance metrics
      const totalAssignments = await prisma.assignment.count({
        where: {
          courseId,
          isPublished: true,
        },
      });

      const submittedAssignments = assignmentSubmissions.length;
      const gradedAssignments = assignmentSubmissions.filter(
        (s) => s.isGraded
      ).length;
      const averageScore = assignmentSubmissions
        .filter((s) => s.score !== null)
        .reduce((sum, s, _, arr) => sum + (s.score || 0) / arr.length, 0);

      const totalSessions = attendanceRecords.length;
      const presentSessions = attendanceRecords.filter(
        (r) => r.status === "PRESENT"
      ).length;
      const attendance = {
        total: totalSessions,
        present: presentSessions,
        absent: totalSessions - presentSessions,
        percentage:
          totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0,
      };

      const performance = {
        student: enrollment.student,
        courseId,
        courseCode: course.code,
        courseTitle: course.title,
        enrollmentDate: enrollment.dateEnrolled,
        attendance,
        assignments: {
          total: totalAssignments,
          submitted: submittedAssignments,
          graded: gradedAssignments,
          averageScore: parseFloat(averageScore.toFixed(2)),
        },
        currentGrade: enrollment.grade,
        currentScore: enrollment.score,
        progressPercentage: enrollment.progress,
      } as StudentPerformance;

      return performance;
    } catch (error) {
      console.error("Error getting student performance:", error);
      throw error;
    }
  }

  /**
   * Add student to class
   */
  static async addStudentToClass(
    teacherId: string,
    courseId: string,
    studentId: string
  ) {
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

      // Check if student exists
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      // Check if student is already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
      });

      if (existingEnrollment) {
        throw new Error("Student is already enrolled in this course");
      }

      // Create enrollment
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId,
          courseId,
          dateEnrolled: new Date(),
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

      // Log the enrollment
      await prisma.auditLog.create({
        data: {
          userId: teacherId,
          action: "ENROLLMENT_CREATED",
          resourceType: "ENROLLMENT",
          resourceId: enrollment.id,
          details: {
            studentId,
            courseId,
            courseCode: course.code,
            matricNumber: enrollment.student.matricNumber,
          },
        },
      });

      return {
        success: true,
        enrollment,
        message: "Student added to class successfully",
      };
    } catch (error) {
      console.error("Error adding student to class:", error);
      throw error;
    }
  }

  /**
   * Remove student from class
   */
  static async removeStudentFromClass(
    teacherId: string,
    courseId: string,
    studentId: string
  ) {
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

      // Check if enrollment exists
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
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

      if (!enrollment) {
        throw new Error("Student is not enrolled in this course");
      }

      // Delete the enrollment
      await prisma.enrollment.delete({
        where: {
          studentId_courseId: {
            studentId,
            courseId,
          },
        },
      });

      // Log the removal
      await prisma.auditLog.create({
        data: {
          userId: teacherId,
          action: "PROFILE_UPDATED",
          resourceType: "ENROLLMENT",
          resourceId: enrollment.id,
          details: {
            action: "removed",
            studentId,
            courseId,
            courseCode: course.code,
            matricNumber: enrollment.student.matricNumber,
          },
        },
      });

      return {
        success: true,
        message: "Student removed from class successfully",
      };
    } catch (error) {
      console.error("Error removing student from class:", error);
      throw error;
    }
  }

  /**
   * Helper method to convert grade to grade point
   */
  private static getGradePoint(grade: string | null): number {
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
