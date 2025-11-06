// app/api/grades/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { UserServiceServer } from "@/lib/services/userService.server";
import { Grade } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    // Check authentication using Server-side UserService
    const currentUser = await UserServiceServer.getCurrentUserFromSession();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    // Verify the user has access to this student's data using Server-side UserService
    const hasAccess = await UserServiceServer.verifyStudentAccess(studentId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all enrollments with course and assignment data
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        course: {
          include: {
            assignments: {
              where: { isPublished: true },
              include: {
                submissions: {
                  where: { studentId },
                  orderBy: { submittedAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    // Calculate course grades
    const courseGrades = enrollments.map((enrollment) => {
      const assignments = enrollment.course.assignments.map((assignment) => {
        const submission = assignment.submissions[0] || null;
        const percentage =
          submission?.isGraded && submission?.score
            ? (submission.score / assignment.maxScore) * 100
            : 0;

        return {
          assignment: {
            id: assignment.id,
            title: assignment.title,
            maxScore: assignment.maxScore,
            dueDate: assignment.dueDate,
          },
          submission: submission
            ? {
                id: submission.id,
                score: submission.score,
                feedback: submission.feedback,
                isGraded: submission.isGraded,
                submittedAt: submission.submittedAt,
              }
            : null,
          percentage,
        };
      });

      // Calculate overall percentage
      const gradedAssignments = assignments.filter(
        (a) => a.submission?.isGraded
      );
      const overallPercentage =
        gradedAssignments.length > 0
          ? gradedAssignments.reduce((sum, a) => sum + a.percentage, 0) /
            gradedAssignments.length
          : 0;

      // Determine overall grade
      const overallGrade =
        enrollment.grade || getGradeFromPercentage(overallPercentage);

      return {
        course: {
          id: enrollment.course.id,
          code: enrollment.course.code,
          title: enrollment.course.title,
          credits: enrollment.course.credits,
          description: enrollment.course.description,
        },
        enrollment: {
          id: enrollment.id,
          progress: enrollment.progress,
          status: enrollment.isCompleted ? "completed" : "in-progress",
        },
        assignments,
        overallGrade,
        overallPercentage: Math.round(overallPercentage * 100) / 100,
        completedAssignments: gradedAssignments.length,
        totalAssignments: assignments.length,
      };
    });

    // Calculate overall GPA
    const gpa = calculateGPA(courseGrades);

    // Calculate average grade
    const averageGrade =
      courseGrades.length > 0
        ? courseGrades.reduce((sum, cg) => sum + cg.overallPercentage, 0) /
          courseGrades.length
        : 0;

    // Count completed courses
    const completedCourses = enrollments.filter((e) => e.isCompleted).length;

    // Calculate credits
    const totalCredits = enrollments.reduce(
      (sum, e) => sum + e.course.credits,
      0
    );
    const earnedCredits = enrollments
      .filter((e) => e.isCompleted)
      .reduce((sum, e) => sum + e.course.credits, 0);

    const summary = {
      courseGrades,
      gpa: Math.round(gpa * 100) / 100,
      averageGrade: Math.round(averageGrade * 100) / 100,
      totalCourses: enrollments.length,
      completedCourses,
      totalCredits,
      earnedCredits,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching grade summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch grade summary" },
      { status: 500 }
    );
  }
}

// Helper functions
function getGradeFromPercentage(percentage: number): Grade | null {
  if (percentage >= 90) return Grade.A;
  if (percentage >= 80) return Grade.B;
  if (percentage >= 70) return Grade.C;
  if (percentage >= 60) return Grade.D;
  if (percentage >= 50) return Grade.E;
  if (percentage > 0) return Grade.F;
  return null;
}

function calculateGPA(courseGrades: any[]): number {
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

  return totalCredits > 0 ? totalPoints / totalCredits : 0.0;
}
