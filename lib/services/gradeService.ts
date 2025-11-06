// lib/services/gradeService.ts
import { Grade } from "@prisma/client";

export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  description?: string;
}

export interface Assignment {
  id: string;
  title: string;
  maxScore: number;
  dueDate: Date;
}

export interface Submission {
  id: string;
  score?: number;
  feedback?: string;
  isGraded: boolean;
  submittedAt?: Date;
}

export interface Enrollment {
  id: string;
  progress: number;
  status: string;
}

export interface AssignmentGrade {
  assignment: Assignment;
  submission: Submission | null;
  percentage: number;
}

export interface CourseGrade {
  course: Course;
  enrollment: Enrollment;
  assignments: AssignmentGrade[];
  overallGrade: Grade | null;
  overallPercentage: number;
  completedAssignments: number;
  totalAssignments: number;
}

export interface GradeSummary {
  courseGrades: CourseGrade[];
  gpa: number;
  averageGrade: number;
  totalCourses: number;
  completedCourses: number;
  totalCredits: number;
  earnedCredits: number;
}

export interface PerformanceMetric {
  label: string;
  value: string | number;
  trend: "up" | "down" | "stable";
  change: number;
}

export interface RecentGradedAssignment {
  id: string;
  title: string;
  courseCode: string;
  courseName: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: Grade;
  submittedAt: Date;
  gradedAt: Date;
  feedback?: string;
}

export type SortBy = "grade" | "course" | "percentage" | "progress";
export type SortOrder = "asc" | "desc";

export class GradeService {
  /**
   * Get grade summary for a student
   */
  static async getGradeSummary(studentId: string): Promise<GradeSummary> {
    try {
      if (!studentId) {
        throw new Error("Student ID is required to fetch grade summary");
      }

      const response = await fetch(
        `/api/grades/summary?studentId=${studentId}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("You must be logged in to view grades");
        }
        if (response.status === 404) {
          console.warn("No grades found for student");
          return this.getEmptyGradeSummary();
        }
        throw new Error(
          `Failed to fetch grade summary: ${response.statusText}`
        );
      }

      const data = await response.json();

      // Parse dates
      return {
        ...data,
        courseGrades: data.courseGrades.map((cg: any) => ({
          ...cg,
          assignments: cg.assignments.map((ag: any) => ({
            ...ag,
            assignment: {
              ...ag.assignment,
              dueDate: ag.assignment.dueDate
                ? new Date(ag.assignment.dueDate)
                : null,
            },
            submission: ag.submission
              ? {
                  ...ag.submission,
                  submittedAt: ag.submission.submittedAt
                    ? new Date(ag.submission.submittedAt)
                    : null,
                }
              : null,
          })),
        })),
      };
    } catch (error) {
      console.error("Error fetching grade summary:", error);
      throw error;
    }
  }

  /**
   * Get performance metrics for a student
   */
  static async getPerformanceMetrics(
    studentId: string
  ): Promise<PerformanceMetric[]> {
    try {
      if (!studentId) {
        throw new Error("Student ID is required to fetch performance metrics");
      }

      const response = await fetch(
        `/api/grades/performance?studentId=${studentId}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn("No performance metrics found");
          return this.getDefaultPerformanceMetrics();
        }
        throw new Error(
          `Failed to fetch performance metrics: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      throw error;
    }
  }

  /**
   * Get recently graded assignments
   */
  static async getRecentGradedAssignments(
    studentId: string,
    limit: number = 5
  ): Promise<RecentGradedAssignment[]> {
    try {
      if (!studentId) {
        throw new Error("Student ID is required to fetch recent grades");
      }

      const response = await fetch(
        `/api/grades/recent?studentId=${studentId}&limit=${limit}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn("No recent graded assignments found");
          return [];
        }
        throw new Error(
          `Failed to fetch recent grades: ${response.statusText}`
        );
      }

      const data = await response.json();

      // Parse dates
      return data.map((item: any) => ({
        ...item,
        submittedAt: new Date(item.submittedAt),
        gradedAt: new Date(item.gradedAt),
      }));
    } catch (error) {
      console.error("Error fetching recent graded assignments:", error);
      throw error;
    }
  }

  /**
   * Get grades for a specific course
   */
  static async getCourseGrades(
    studentId: string,
    courseId: string
  ): Promise<CourseGrade | null> {
    try {
      if (!studentId || !courseId) {
        throw new Error("Student ID and Course ID are required");
      }

      const response = await fetch(
        `/api/grades/course?studentId=${studentId}&courseId=${courseId}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn("No grades found for this course");
          return null;
        }
        throw new Error(
          `Failed to fetch course grades: ${response.statusText}`
        );
      }

      const data = await response.json();

      // Parse dates
      return {
        ...data,
        assignments: data.assignments.map((ag: any) => ({
          ...ag,
          assignment: {
            ...ag.assignment,
            dueDate: ag.assignment.dueDate
              ? new Date(ag.assignment.dueDate)
              : null,
          },
          submission: ag.submission
            ? {
                ...ag.submission,
                submittedAt: ag.submission.submittedAt
                  ? new Date(ag.submission.submittedAt)
                  : null,
              }
            : null,
        })),
      };
    } catch (error) {
      console.error("Error fetching course grades:", error);
      throw error;
    }
  }

  /**
   * Sort course grades
   */
  static sortCourseGrades(
    courseGrades: CourseGrade[],
    sortBy: SortBy,
    sortOrder: SortOrder = "desc"
  ): CourseGrade[] {
    const sorted = [...courseGrades].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "grade":
          const gradeOrder = { A: 6, B: 5, C: 4, D: 3, E: 2, F: 1 };
          const gradeA = a.overallGrade ? gradeOrder[a.overallGrade] || 0 : 0;
          const gradeB = b.overallGrade ? gradeOrder[b.overallGrade] || 0 : 0;
          comparison = gradeB - gradeA;
          break;

        case "course":
          comparison = a.course.code.localeCompare(b.course.code);
          break;

        case "percentage":
          comparison = b.overallPercentage - a.overallPercentage;
          break;

        case "progress":
          comparison = b.enrollment.progress - a.enrollment.progress;
          break;

        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? -comparison : comparison;
    });

    return sorted;
  }

  /**
   * Filter course grades by status
   */
  static filterCourseGrades(
    courseGrades: CourseGrade[],
    filter: "all" | "completed" | "in-progress" | "passed" | "failed"
  ): CourseGrade[] {
    switch (filter) {
      case "completed":
        return courseGrades.filter((cg) => cg.enrollment.progress === 100);
      case "in-progress":
        return courseGrades.filter((cg) => cg.enrollment.progress < 100);
      case "passed":
        return courseGrades.filter(
          (cg) => cg.overallGrade && !["F", "E"].includes(cg.overallGrade)
        );
      case "failed":
        return courseGrades.filter(
          (cg) => cg.overallGrade && ["F", "E"].includes(cg.overallGrade)
        );
      default:
        return courseGrades;
    }
  }

  /**
   * Calculate GPA from course grades
   */
  static calculateGPA(courseGrades: CourseGrade[]): number {
    const gradePoints: Record<string, number> = {
      A: 5.0,
      B: 4.0,
      C: 3.0,
      D: 2.0,
      E: 1.0,
      F: 0.5,
    };

    let totalPoints = 0;
    let totalCredits = 0;

    courseGrades.forEach((cg) => {
      if (cg.overallGrade) {
        const points = gradePoints[cg.overallGrade] || 0;
        totalPoints += points * cg.course.credits;
        totalCredits += cg.course.credits;
      }
    });

    return totalCredits > 0
      ? parseFloat((totalPoints / totalCredits).toFixed(2))
      : 0.0;
  }

  /**
   * Calculate average grade percentage
   */
  static calculateAverageGrade(courseGrades: CourseGrade[]): number {
    if (courseGrades.length === 0) return 0;

    const total = courseGrades.reduce(
      (sum, cg) => sum + cg.overallPercentage,
      0
    );
    return Math.round(total / courseGrades.length);
  }

  /**
   * Get grade from percentage
   */
  static getGradeFromPercentage(percentage: number): Grade {
    if (percentage >= 90) return Grade.A;
    if (percentage >= 80) return Grade.B;
    if (percentage >= 70) return Grade.C;
    if (percentage >= 60) return Grade.D;
    if (percentage >= 50) return Grade.E;
    return Grade.F;
  }

  /**
   * Get grade color classes for UI
   */
  static getGradeColor(grade: Grade | null): string {
    if (!grade) return "bg-gray-100 text-gray-800 border-gray-200";

    switch (grade) {
      case Grade.A:
        return "bg-green-100 text-green-800 border-green-200";
      case Grade.B:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case Grade.C:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case Grade.D:
        return "bg-orange-100 text-orange-800 border-orange-200";
      case Grade.E:
        return "bg-red-100 text-red-800 border-red-200";
      case Grade.F:
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  /**
   * Get trend color classes for UI
   */
  static getTrendColor(trend: "up" | "down" | "stable"): string {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date, format: "short" | "long" = "short"): string {
    if (format === "long") {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  /**
   * Check if grade is passing
   */
  static isPassing(grade: Grade | null): boolean {
    if (!grade) return false;
    return grade !== Grade.F && grade !== Grade.E;
  }

  /**
   * Get completion status
   */
  static getCompletionStatus(courseGrade: CourseGrade): {
    status: string;
    color: string;
  } {
    const progress = courseGrade.enrollment.progress;

    if (progress === 100) {
      return { status: "Completed", color: "text-green-600" };
    } else if (progress >= 50) {
      return { status: "In Progress", color: "text-blue-600" };
    } else {
      return { status: "Just Started", color: "text-yellow-600" };
    }
  }

  /**
   * Calculate statistics for course grades
   */
  static calculateStatistics(courseGrades: CourseGrade[]): {
    highest: number;
    lowest: number;
    average: number;
    median: number;
  } {
    if (courseGrades.length === 0) {
      return { highest: 0, lowest: 0, average: 0, median: 0 };
    }

    const percentages = courseGrades
      .map((cg) => cg.overallPercentage)
      .sort((a, b) => a - b);

    const highest = Math.max(...percentages);
    const lowest = Math.min(...percentages);
    const average =
      percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const median =
      percentages.length % 2 === 0
        ? (percentages[percentages.length / 2 - 1] +
            percentages[percentages.length / 2]) /
          2
        : percentages[Math.floor(percentages.length / 2)];

    return {
      highest: Math.round(highest),
      lowest: Math.round(lowest),
      average: Math.round(average),
      median: Math.round(median),
    };
  }

  /**
   * Get empty grade summary (fallback)
   */
  private static getEmptyGradeSummary(): GradeSummary {
    return {
      courseGrades: [],
      gpa: 0.0,
      averageGrade: 0,
      totalCourses: 0,
      completedCourses: 0,
      totalCredits: 0,
      earnedCredits: 0,
    };
  }

  /**
   * Get default performance metrics (fallback)
   */
  private static getDefaultPerformanceMetrics(): PerformanceMetric[] {
    return [
      {
        label: "Current GPA",
        value: "0.0",
        trend: "stable",
        change: 0,
      },
      {
        label: "Average Grade",
        value: "0%",
        trend: "stable",
        change: 0,
      },
      {
        label: "Completed Courses",
        value: 0,
        trend: "stable",
        change: 0,
      },
      {
        label: "Total Credits",
        value: 0,
        trend: "stable",
        change: 0,
      },
    ];
  }

  /**
   * Export grade data (for transcript generation)
   */
  static async exportTranscript(
    studentId: string,
    format: "pdf" | "excel"
  ): Promise<Blob> {
    try {
      const response = await fetch(
        `/api/grades/export?studentId=${studentId}&format=${format}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to export transcript: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error("Error exporting transcript:", error);
      throw error;
    }
  }
}

// Export convenient methods
export const {
  getGradeSummary,
  getPerformanceMetrics,
  getRecentGradedAssignments,
  getCourseGrades,
  sortCourseGrades,
  filterCourseGrades,
  calculateGPA,
  calculateAverageGrade,
  getGradeFromPercentage,
  getGradeColor,
  getTrendColor,
  formatDate,
  isPassing,
  getCompletionStatus,
  calculateStatistics,
  exportTranscript,
} = GradeService;
