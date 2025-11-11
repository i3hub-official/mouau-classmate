// lib/services/gradeService.ts

import { prisma } from "@/lib/server/prisma";
import {
  GradeInfo,
  SemesterGrades,
  AcademicTranscript,
  GradeStatistics,
} from "@/lib/types/student/index";
import { Grade } from "@prisma/client";

export class StudentGradeService {
  /**
   * Get student grades
   */
  static async getStudentGrades(studentId: string): Promise<GradeInfo[]> {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: true,
        },
      });

      const grades: GradeInfo[] = enrollments.map((enrollment) => ({
        courseId: enrollment.courseId,
        courseCode: enrollment.course.code,
        courseTitle: enrollment.course.title,
        credits: enrollment.course.credits,
        grade: enrollment.grade,
        score: enrollment.score,
        gradePoint: this.calculateGradePoint(enrollment.grade),
        semester: enrollment.course.semester,
        level: enrollment.course.level,
      }));

      return grades;
    } catch (error) {
      console.error("Error getting student grades:", error);
      throw error;
    }
  }

  /**
   * Get grades by semester and level
   */
  static async getGradesBySemester(
    studentId: string,
    level: number,
    semester: number
  ): Promise<SemesterGrades> {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: {
          studentId,
          course: {
            level,
            semester,
          },
        },
        include: {
          course: true,
        },
      });

      const courses: GradeInfo[] = enrollments.map((enrollment) => ({
        courseId: enrollment.courseId,
        courseCode: enrollment.course.code,
        courseTitle: enrollment.course.title,
        credits: enrollment.course.credits,
        grade: enrollment.grade,
        score: enrollment.score,
        gradePoint: this.calculateGradePoint(enrollment.grade),
        semester: enrollment.course.semester,
        level: enrollment.course.level,
      }));

      const totalCredits = courses.reduce(
        (sum, course) => sum + course.credits,
        0
      );
      const totalGradePoints = courses.reduce(
        (sum, course) => sum + (course.gradePoint || 0) * course.credits,
        0
      );
      const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

      return {
        semester,
        level,
        courses,
        totalCredits,
        totalGradePoints,
        gpa: parseFloat(gpa.toFixed(2)),
      };
    } catch (error) {
      console.error("Error getting grades by semester:", error);
      throw error;
    }
  }

  /**
   * Get academic transcript
   */
  static async getAcademicTranscript(
    studentId: string
  ): Promise<AcademicTranscript> {
    try {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
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
          course: true,
          college: true,
          dateEnrolled: true,
          isActive: true,
        },
      });

      if (!student) {
        throw new Error("Student not found");
      }

      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: true,
        },
        orderBy: [
          { course: { level: "asc" } },
          { course: { semester: "asc" } },
        ],
      });

      // Group enrollments by semester and level
      const semesterGroups: Record<string, GradeInfo[]> = {};

      enrollments.forEach((enrollment) => {
        const key = `${enrollment.course.level}-${enrollment.course.semester}`;
        if (!semesterGroups[key]) {
          semesterGroups[key] = [];
        }

        semesterGroups[key].push({
          courseId: enrollment.courseId,
          courseCode: enrollment.course.code,
          courseTitle: enrollment.course.title,
          credits: enrollment.course.credits,
          grade: enrollment.grade,
          score: enrollment.score,
          gradePoint: this.calculateGradePoint(enrollment.grade),
          semester: enrollment.course.semester,
          level: enrollment.course.level,
        });
      });

      // Create semester grades
      const semesters: SemesterGrades[] = Object.keys(semesterGroups).map(
        (key) => {
          const [level, semester] = key.split("-").map(Number);
          const courses = semesterGroups[key];

          const totalCredits = courses.reduce(
            (sum, course) => sum + course.credits,
            0
          );
          const totalGradePoints = courses.reduce(
            (sum, course) => sum + (course.gradePoint || 0) * course.credits,
            0
          );
          const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

          return {
            level,
            semester,
            courses,
            totalCredits,
            totalGradePoints,
            gpa: parseFloat(gpa.toFixed(2)),
          };
        }
      );

      // Calculate cumulative GPA
      const totalCredits = semesters.reduce(
        (sum, semester) => sum + semester.totalCredits,
        0
      );
      const totalGradePoints = semesters.reduce(
        (sum, semester) => sum + semester.totalGradePoints,
        0
      );
      const cumulativeGPA =
        totalCredits > 0 ? totalGradePoints / totalCredits : 0;

      return {
        student: {
          ...student,
          role: "STUDENT",
        },
        semesters,
        cumulativeGPA: parseFloat(cumulativeGPA.toFixed(2)),
        totalCredits,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error getting academic transcript:", error);
      throw error;
    }
  }

  /**
   * Get grade statistics
   */
  static async getGradeStatistics(studentId: string): Promise<GradeStatistics> {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: true,
        },
      });

      const totalCourses = enrollments.length;
      const completedCourses = enrollments.filter((e) => e.isCompleted).length;
      const inProgressCourses = totalCourses - completedCourses;

      const gradedCourses = enrollments.filter(
        (e) => e.grade !== null && e.score !== null
      );
      const averageScore =
        gradedCourses.length > 0
          ? gradedCourses.reduce((sum, e) => sum + (e.score || 0), 0) /
            gradedCourses.length
          : 0;

      // Calculate GPA
      const totalCredits = enrollments.reduce(
        (sum, e) => sum + e.course.credits,
        0
      );
      const totalGradePoints = enrollments.reduce((sum, e) => {
        const gradePoint = this.calculateGradePoint(e.grade);
        return sum + (gradePoint || 0) * e.course.credits;
      }, 0);
      const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

      // Calculate CGPA (same as GPA for now, but could be different in some systems)
      const cgpa = gpa;

      // Grade distribution
      const gradeDistribution: Record<Grade, number> = {
        A: 0,
        B: 0,
        C: 0,
        D: 0,
        E: 0,
        F: 0,
      };

      gradedCourses.forEach((e) => {
        if (e.grade) {
          gradeDistribution[e.grade]++;
        }
      });

      return {
        totalCourses,
        completedCourses,
        inProgressCourses,
        averageScore: parseFloat(averageScore.toFixed(2)),
        gpa: parseFloat(gpa.toFixed(2)),
        cgpa: parseFloat(cgpa.toFixed(2)),
        gradeDistribution,
      };
    } catch (error) {
      console.error("Error getting grade statistics:", error);
      throw error;
    }
  }

  /**
   * Calculate grade point from grade
   */
  private static calculateGradePoint(grade: Grade | null): number {
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
