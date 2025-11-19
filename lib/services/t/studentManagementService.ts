// File: lib/services/t/studentManagementService.ts

import { prisma } from "@/lib/server/prisma";
import { StudentBasicInfo, EnrolledStudent } from "@/lib/types/t/index";
import { protectData, unprotectData } from "@/lib/security/dataProtection";
import { AuditAction } from "@prisma/client";

export class TeacherStudentManagementService {
  /**
   * Get students in a course
   */
  static async getCourseStudents(
    teacherId: string,
    courseId: string,
    page: number = 1,
    limit: number = 10
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

      const skip = (page - 1) * limit;

      const [enrollments, total] = await Promise.all([
        prisma.enrollment.findMany({
          where: { courseId },
          skip,
          take: limit,
          include: {
            student: {
              select: {
                id: true,
                matricNumber: true,
                firstName: true,
                surname: true,
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
        }),
        prisma.enrollment.count({ where: { courseId } }),
      ]);

      // Decrypt sensitive data
      const students = await Promise.all(
        enrollments.map(async (enrollment) => {
          const student = enrollment.student;
          return {
            enrollmentId: enrollment.id,
            matricNumber: student.matricNumber,
            firstName: await unprotectData(student.firstName, "name"),
            surname: await unprotectData(student.surname, "name"),
            otherName: student.otherName
              ? await unprotectData(student.otherName, "name")
              : null,
            email: await unprotectData(student.email, "email"),
            phone: await unprotectData(student.phone, "phone"),
            passportUrl: student.passportUrl,
            department: student.department,
            college: student.college,
            dateEnrolled: enrollment.dateEnrolled,
            progress: enrollment.progress,
            isCompleted: enrollment.isCompleted,
            grade: enrollment.grade,
            score: enrollment.score,
          } as EnrolledStudent;
        })
      );

      return {
        students,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error getting course students:", error);
      throw error;
    }
  }

  /**
   * Search students in a course
   */
  static async searchCourseStudents(
    teacherId: string,
    courseId: string,
    query: string,
    page: number = 1,
    limit: number = 10
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

      const skip = (page - 1) * limit;

      const [enrollments, total] = await Promise.all([
        prisma.enrollment.findMany({
          where: {
            courseId,
            student: {
              OR: [
                { matricNumber: { contains: query, mode: "insensitive" } },
                // For encrypted fields, you would need to use search hashes or a dedicated search service
              ],
            },
          },
          skip,
          take: limit,
          include: {
            student: {
              select: {
                id: true,
                matricNumber: true,
                firstName: true,
                surname: true,
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
        }),
        prisma.enrollment.count({
          where: {
            courseId,
            student: {
              OR: [{ matricNumber: { contains: query, mode: "insensitive" } }],
            },
          },
        }),
      ]);

      // Decrypt sensitive data
      const students = await Promise.all(
        enrollments.map(async (enrollment) => {
          const student = enrollment.student;
          return {
            enrollmentId: enrollment.id,
            matricNumber: student.matricNumber,
            firstName: await unprotectData(student.firstName, "name"),
            surname: await unprotectData(student.surname, "name"),
            otherName: student.otherName
              ? await unprotectData(student.otherName, "name")
              : null,
            email: await unprotectData(student.email, "email"),
            phone: await unprotectData(student.phone, "phone"),
            passportUrl: student.passportUrl,
            department: student.department,
            college: student.college,
            dateEnrolled: enrollment.dateEnrolled,
            progress: enrollment.progress,
            isCompleted: enrollment.isCompleted,
            grade: enrollment.grade,
            score: enrollment.score,
          } as EnrolledStudent;
        })
      );

      return {
        students,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error searching course students:", error);
      throw error;
    }
  }

  /**
   * Get student details
   */
  static async getStudentDetails(teacherId: string, studentId: string) {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          matricNumber: true,
          firstName: true,
          surname: true,
          otherName: true,
          email: true,
          phone: true,
          passportUrl: true,
          department: true,
          course: true,
          college: true,
          dateEnrolled: true,
          admissionYear: true,
          isActive: true,
        },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      // Decrypt sensitive data
      const decryptedStudent = {
        ...student,
        email: await unprotectData(student.email, "email"),
        phone: await unprotectData(student.phone, "phone"),
        firstName: await unprotectData(student.firstName, "name"),
        surname: await unprotectData(student.surname, "name"),
        otherName: student.otherName
          ? await unprotectData(student.otherName, "name")
          : null,
      } as StudentBasicInfo;

      return decryptedStudent;
    } catch (error) {
      console.error("Error getting student details:", error);
      throw error;
    }
  }

  /**
   * Get student's courses (courses the student is enrolled in)
   */
  static async getStudentCourses(teacherId: string, studentId: string) {
    try {
      // Get enrollments for courses taught by this teacher
      const enrollments = await prisma.enrollment.findMany({
        where: {
          studentId,
          course: {
            instructorId: teacherId,
          },
        },
        include: {
          course: true,
        },
        orderBy: { course: { code: "asc" } },
      });

      return enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        course: enrollment.course,
        dateEnrolled: enrollment.dateEnrolled,
        progress: enrollment.progress,
        isCompleted: enrollment.isCompleted,
        grade: enrollment.grade,
        score: enrollment.score,
      }));
    } catch (error) {
      console.error("Error getting student courses:", error);
      throw error;
    }
  }

  /**
   * Get student's performance summary
   */
  static async getStudentPerformanceSummary(
    teacherId: string,
    studentId: string
  ) {
    try {
      // Get enrollments for courses taught by this teacher
      const enrollments = await prisma.enrollment.findMany({
        where: {
          studentId,
          course: {
            instructorId: teacherId,
          },
        },
        include: {
          course: true,
        },
      });

      // Get assignment submissions for these courses
      const courseIds = enrollments.map((e) => e.courseId);
      const submissions = await prisma.assignmentSubmission.findMany({
        where: {
          studentId,
          assignment: {
            courseId: { in: courseIds },
          },
        },
        include: {
          assignment: true,
        },
      });

      // Calculate performance metrics
      const totalCourses = enrollments.length;
      const completedCourses = enrollments.filter((e) => e.isCompleted).length;
      const activeCourses = totalCourses - completedCourses;

      const totalAssignments = await prisma.assignment.count({
        where: {
          courseId: { in: courseIds },
          isPublished: true,
        },
      });

      const submittedAssignments = submissions.length;
      const gradedAssignments = submissions.filter((s) => s.isGraded).length;
      const averageScore = submissions
        .filter((s) => s.score !== null)
        .reduce((sum, s, _, arr) => sum + (s.score || 0) / arr.length, 0);

      const averageGrade = enrollments
        .filter((e) => e.grade !== null)
        .reduce((sum, e, _, arr) => {
          const gradePoint = this.getGradePoint(e.grade);
          return sum + gradePoint / arr.length;
        }, 0);

      return {
        totalCourses,
        completedCourses,
        activeCourses,
        totalAssignments,
        submittedAssignments,
        gradedAssignments,
        averageScore: parseFloat(averageScore.toFixed(2)),
        averageGrade: parseFloat(averageGrade.toFixed(2)),
        submissionRate:
          totalAssignments > 0
            ? (submittedAssignments / totalAssignments) * 100
            : 0,
        gradingRate:
          submittedAssignments > 0
            ? (gradedAssignments / submittedAssignments) * 100
            : 0,
      };
    } catch (error) {
      console.error("Error getting student performance summary:", error);
      throw error;
    }
  }

  /**
   * Send message to student
   */
  static async sendMessageToStudent(
    teacherId: string,
    studentId: string,
    subject: string,
    message: string
  ) {
    try {
      // Verify teacher exists
      const teacher = await prisma.teacher.findUnique({
        where: { userId: teacherId },
      });

      if (!teacher) {
        throw new Error("Teacher not found");
      }

      // Verify student exists
      const student = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      // Create notification for the student
      const notification = await prisma.notification.create({
        data: {
          userId: student.userId,
          title: subject,
          message,
          type: "INFO",
          priority: 2,
        },
      });

      // Log the message
      await prisma.auditLog.create({
        data: {
          userId: teacherId,
          action: "NOTIFICATION_SENT",
          resourceType: "USER",
          resourceId: studentId,
          details: {
            subject,
            studentId,
            teacherId,
          },
        },
      });

      return {
        success: true,
        notification,
        message: "Message sent to student successfully",
      };
    } catch (error) {
      console.error("Error sending message to student:", error);
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
