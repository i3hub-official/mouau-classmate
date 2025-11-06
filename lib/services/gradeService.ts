// lib/services/gradeServices.ts
import { prisma } from '@/lib/server/prisma';
import { Enrollment, AssignmentSubmission, Grade, Course } from '@prisma/client';

export type CourseGrade = {
  course: Course;
  enrollment: Enrollment;
  assignments: {
    assignment: {
      id: string;
      title: string;
      maxScore: number;
    };
    submission: AssignmentSubmission | null;
    percentage: number;
  }[];
  overallGrade: Grade | null;
  overallPercentage: number;
  averageScore: number;
};

export type GradeSummary = {
  totalCourses: number;
  completedCourses: number;
  averageGrade: number;
  gpa: number;
  courseGrades: CourseGrade[];
};

export type PerformanceMetric = {
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
};

export class GradeService {
  /**
   * Get grade summary for a student
   */
  static async getGradeSummary(studentId: string): Promise<GradeSummary> {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: {
            include: {
              assignments: {
                include: {
                  submissions: {
                    where: { studentId }
                  }
                }
              }
            }
          }
        }
      });

      const courseGrades: CourseGrade[] = [];

      enrollments.forEach(enrollment => {
        const assignmentGrades = enrollment.course.assignments.map(assignment => {
          const submission = assignment.submissions[0] || null;
          const percentage = submission?.score ? (submission.score / assignment.maxScore) * 100 : 0;

          return {
            assignment: {
              id: assignment.id,
              title: assignment.title,
              maxScore: assignment.maxScore
            },
            submission,
            percentage
          };
        });

        const gradedAssignments = assignmentGrades.filter(ag => ag.submission?.isGraded);
        const averageScore = gradedAssignments.length > 0 
          ? gradedAssignments.reduce((sum, ag) => sum + (ag.submission?.score || 0), 0) / gradedAssignments.length
          : 0;

        const overallPercentage = gradedAssignments.length > 0
          ? gradedAssignments.reduce((sum, ag) => sum + ag.percentage, 0) / gradedAssignments.length
          : 0;

        const overallGrade = this.calculateGrade(overallPercentage);

        courseGrades.push({
          course: enrollment.course,
          enrollment,
          assignments: assignmentGrades,
          overallGrade,
          overallPercentage,
          averageScore
        });
      });

      const completedCourses = courseGrades.filter(cg => cg.enrollment.isCompleted).length;
      const totalAverage = courseGrades.length > 0
        ? courseGrades.reduce((sum, cg) => sum + cg.overallPercentage, 0) / courseGrades.length
        : 0;

      const gpa = this.calculateGPA(courseGrades);

      return {
        totalCourses: enrollments.length,
        completedCourses,
        averageGrade: totalAverage,
        gpa,
        courseGrades
      };
    } catch (error) {
      console.error('Error fetching grade summary:', error);
      throw new Error('Failed to fetch grade summary');
    }
  }

  /**
   * Get grades for a specific course
   */
  static async getCourseGrades(studentId: string, courseId: string): Promise<CourseGrade | null> {
    try {
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId, courseId },
        include: {
          course: {
            include: {
              assignments: {
                include: {
                  submissions: {
                    where: { studentId }
                  }
                }
              }
            }
          }
        }
      });

      if (!enrollment) return null;

      const assignmentGrades = enrollment.course.assignments.map(assignment => {
        const submission = assignment.submissions[0] || null;
        const percentage = submission?.score ? (submission.score / assignment.maxScore) * 100 : 0;

        return {
          assignment: {
            id: assignment.id,
            title: assignment.title,
            maxScore: assignment.maxScore
          },
          submission,
          percentage
        };
      });

      const gradedAssignments = assignmentGrades.filter(ag => ag.submission?.isGraded);
      const averageScore = gradedAssignments.length > 0 
        ? gradedAssignments.reduce((sum, ag) => sum + (ag.submission?.score || 0), 0) / gradedAssignments.length
        : 0;

      const overallPercentage = gradedAssignments.length > 0
        ? gradedAssignments.reduce((sum, ag) => sum + ag.percentage, 0) / gradedAssignments.length
        : 0;

      const overallGrade = this.calculateGrade(overallPercentage);

      return {
        course: enrollment.course,
        enrollment,
        assignments: assignmentGrades,
        overallGrade,
        overallPercentage,
        averageScore
      };
    } catch (error) {
      console.error('Error fetching course grades:', error);
      throw new Error('Failed to fetch course grades');
    }
  }

  /**
   * Get performance metrics over time
   */
  static async getPerformanceMetrics(studentId: string): Promise<PerformanceMetric[]> {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: {
          course: {
            include: {
              assignments: {
                include: {
                  submissions: {
                    where: { studentId, isGraded: true }
                  }
                }
              }
            }
          }
        }
      });

      const metrics: PerformanceMetric[] = [];

      // Overall performance
      const allSubmissions = enrollments.flatMap(e => 
        e.course.assignments.flatMap(a => a.submissions)
      );
      const averageScore = allSubmissions.length > 0
        ? allSubmissions.reduce((sum, s) => sum + (s?.score || 0), 0) / allSubmissions.length
        : 0;

      metrics.push({
        label: 'Average Score',
        value: Math.round(averageScore * 100) / 100,
        change: 2.5, // This would come from historical data
        trend: 'up'
      });

      // Completion rate
      const totalAssignments = enrollments.reduce((sum, e) => sum + e.course.assignments.length, 0);
      const completedAssignments = allSubmissions.length;
      const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

      metrics.push({
        label: 'Completion Rate',
        value: Math.round(completionRate),
        change: 5,
        trend: 'up'
      });

      // Course progress
      const averageProgress = enrollments.length > 0
        ? enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length
        : 0;

      metrics.push({
        label: 'Course Progress',
        value: Math.round(averageProgress),
        change: 3,
        trend: 'up'
      });

      // GPA
      const courseGrades = await this.getGradeSummary(studentId);
      metrics.push({
        label: 'GPA',
        value: Math.round(courseGrades.gpa * 100) / 100,
        change: 0.1,
        trend: 'stable'
      });

      return metrics;
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      throw new Error('Failed to fetch performance metrics');
    }
  }

  /**
   * Get recent graded assignments
   */
  static async getRecentGradedAssignments(studentId: string, limit: number = 5) {
    try {
      const submissions = await prisma.assignmentSubmission.findMany({
        where: {
          studentId,
          isGraded: true
        },
        include: {
          assignment: {
            include: {
              course: true
            }
          }
        },
        orderBy: {
          submittedAt: 'desc'
        },
        take: limit
      });

      return submissions.map(submission => ({
        id: submission.id,
        title: submission.assignment.title,
        course: submission.assignment.course.title,
        courseCode: submission.assignment.course.code,
        score: submission.score,
        maxScore: submission.assignment.maxScore,
        percentage: submission.score ? (submission.score / submission.assignment.maxScore) * 100 : 0,
        grade: this.calculateGrade(submission.score ? (submission.score / submission.assignment.maxScore) * 100 : 0),
        submittedAt: submission.submittedAt,
        feedback: submission.feedback
      }));
    } catch (error) {
      console.error('Error fetching recent graded assignments:', error);
      throw new Error('Failed to fetch recent graded assignments');
    }
  }

  private static calculateGrade(percentage: number): Grade {
    if (percentage >= 90) return Grade.A;
    if (percentage >= 80) return Grade.B;
    if (percentage >= 70) return Grade.C;
    if (percentage >= 60) return Grade.D;
    if (percentage >= 50) return Grade.E;
    return Grade.F;
  }

  private static calculateGPA(courseGrades: CourseGrade[]): number {
    const gradePoints: { [key in Grade]: number } = {
      [Grade.A]: 4.0,
      [Grade.B]: 3.0,
      [Grade.C]: 2.0,
      [Grade.D]: 1.0,
      [Grade.E]: 0.5,
      [Grade.F]: 0.0
    };

    const gradedCourses = courseGrades.filter(cg => cg.overallGrade);
    if (gradedCourses.length === 0) return 0;

    const totalPoints = gradedCourses.reduce((sum, cg) => {
      return sum + (gradePoints[cg.overallGrade!] || 0);
    }, 0);

    return Math.round((totalPoints / gradedCourses.length) * 100) / 100;
  }
}

export const {
  getGradeSummary,
  getCourseGrades,
  getPerformanceMetrics,
  getRecentGradedAssignments,
} = GradeService;