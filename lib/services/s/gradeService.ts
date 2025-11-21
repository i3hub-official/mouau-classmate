// lib/services/gradeService.ts

import { prisma } from "@/lib/server/prisma";
import { Grade } from "@prisma/client";
import {
  GradeInfo,
  SemesterGrades,
  AcademicTranscript,
  GradeStatistics,
} from "@/lib/types/s/index";

export class StudentGradeService {
  /**
   * Get student grades
   */
  static async getStudentGrades(studentId: string): Promise<GradeInfo[]> {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: {
            select: {
              id: true,
              code: true,
              title: true,
              credits: true,
              semester: true,
              level: true,
            },
          },
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
        isCompleted: enrollment.isCompleted,
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
          course: {
            select: {
              id: true,
              code: true,
              title: true,
              credits: true,
              semester: true,
              level: true,
            },
          },
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
        isCompleted: enrollment.isCompleted,
      }));

      // Only include completed courses in GPA calculation
      const completedCourses = courses.filter((course) => course.isCompleted);
      const totalCredits = completedCourses.reduce(
        (sum, course) => sum + course.credits,
        0
      );
      const totalGradePoints = completedCourses.reduce(
        (sum, course) => sum + course.gradePoint * course.credits,
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
          surname: true,
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
          course: {
            select: {
              id: true,
              code: true,
              title: true,
              credits: true,
              semester: true,
              level: true,
            },
          },
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
          isCompleted: enrollment.isCompleted,
        });
      });

      // Create semester grades
      const semesters: SemesterGrades[] = Object.keys(semesterGroups).map(
        (key) => {
          const [level, semester] = key.split("-").map(Number);
          const courses = semesterGroups[key];

          // Only include completed courses in GPA calculation
          const completedCourses = courses.filter(
            (course) => course.isCompleted
          );
          const totalCredits = completedCourses.reduce(
            (sum, course) => sum + course.credits,
            0
          );
          const totalGradePoints = completedCourses.reduce(
            (sum, course) => sum + course.gradePoint * course.credits,
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

      // Calculate cumulative GPA (only from completed courses across all semesters)
      const allCompletedCourses = enrollments.filter((e) => e.isCompleted);
      const totalCredits = allCompletedCourses.reduce(
        (sum, enrollment) => sum + enrollment.course.credits,
        0
      );
      const totalGradePoints = allCompletedCourses.reduce((sum, enrollment) => {
        const gradePoint = this.calculateGradePoint(enrollment.grade);
        return sum + gradePoint * enrollment.course.credits;
      }, 0);
      const cumulativeGPA =
        totalCredits > 0 ? totalGradePoints / totalCredits : 0;

      return {
        student: {
          ...student,
          role: "STUDENT" as const,
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
          course: {
            select: {
              id: true,
              credits: true,
            },
          },
        },
      });

      const totalCourses = enrollments.length;
      const completedCourses = enrollments.filter((e) => e.isCompleted).length;
      const inProgressCourses = totalCourses - completedCourses;

      // Only consider completed and graded courses for statistics
      const gradedCourses = enrollments.filter(
        (e) => e.isCompleted && e.grade !== null && e.score !== null
      );

      const averageScore =
        gradedCourses.length > 0
          ? gradedCourses.reduce((sum, e) => sum + (e.score || 0), 0) /
            gradedCourses.length
          : 0;

      // Calculate GPA (only from completed courses)
      const totalCredits = gradedCourses.reduce(
        (sum, e) => sum + e.course.credits,
        0
      );
      const totalGradePoints = gradedCourses.reduce((sum, e) => {
        const gradePoint = this.calculateGradePoint(e.grade);
        return sum + (gradePoint || 0) * e.course.credits;
      }, 0);
      const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

      // Calculate CGPA (same as GPA for now, but could be different in some systems)
      const cgpa = gpa;

      // Grade distribution (only from graded courses)
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
   * Get current semester GPA
   */
  static async getCurrentSemesterGPA(studentId: string): Promise<number> {
    try {
      // Get current semester (you might need to adjust this logic based on your academic calendar)
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();

      // Assuming semester 1: Jan-Jun, semester 2: Jul-Dec
      const currentSemester = currentMonth < 6 ? 1 : 2;

      // You might want to get the current level from student profile or enrollment
      const latestEnrollment = await prisma.enrollment.findFirst({
        where: { studentId },
        orderBy: { createdAt: "desc" },
        include: {
          course: {
            select: {
              level: true,
            },
          },
        },
      });

      if (!latestEnrollment) {
        return 0;
      }

      const currentLevel = latestEnrollment.course.level;
      const semesterGrades = await this.getGradesBySemester(
        studentId,
        currentLevel,
        currentSemester
      );

      return semesterGrades.gpa;
    } catch (error) {
      console.error("Error getting current semester GPA:", error);
      return 0;
    }
  }

  /**
   * Get grade progression over semesters
   */
  static async getGradeProgression(
    studentId: string
  ): Promise<{ semester: string; gpa: number }[]> {
    try {
      const transcript = await this.getAcademicTranscript(studentId);

      return transcript.semesters.map((semester) => ({
        semester: `Level ${semester.level} - Semester ${semester.semester}`,
        gpa: semester.gpa,
      }));
    } catch (error) {
      console.error("Error getting grade progression:", error);
      return [];
    }
  }

  /**
   * Calculate grade point from grade
   */
  private static calculateGradePoint(grade: Grade | null): number {
    if (grade === null) return 0;

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

  /**
   * Calculate letter grade from score
   */
  static calculateGradeFromScore(score: number | null): Grade | null {
    if (score === null) return null;

    if (score >= 70) return "A";
    if (score >= 60) return "B";
    if (score >= 50) return "C";
    if (score >= 45) return "D";
    if (score >= 40) return "E";
    return "F";
  }
}
