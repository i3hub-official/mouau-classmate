// app/api/grades/course/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { UserServiceServer } from "@/lib/services/userService.server";
import { Grade } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await UserServiceServer.getCurrentUserFromSession();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const courseId = searchParams.get("courseId");

    if (!studentId || !courseId) {
      return NextResponse.json(
        { error: "Student ID and Course ID are required" },
        { status: 400 }
      );
    }

    const hasAccess = await UserServiceServer.verifyStudentAccess(studentId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Get enrollment with course data
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId,
        },
      },
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

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    // Calculate assignment grades
    const assignments = enrollment.course.assignments.map((assignment) => {
      const submission = assignment.submissions[0] || null;
      const percentage = submission?.isGraded && submission?.score
        ? (submission.score / assignment.maxScore) * 100
        : 0;

      const status = submission 
        ? submission.isGraded 
          ? "graded" 
          : "submitted"
        : assignment.dueDate < new Date()
        ? "overdue"
        : "pending";

      return {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          maxScore: assignment.maxScore,
          dueDate: assignment.dueDate,
          description: assignment.description,
          instructions: assignment.instructions,
        },
        submission: submission
          ? {
              id: submission.id,
              score: submission.score,
              feedback: submission.feedback,
              isGraded: submission.isGraded,
              submittedAt: submission.submittedAt,
              attemptNumber: submission.attemptNumber,
            }
          : null,
        percentage: Math.round(percentage * 100) / 100,
        status,
      };
    });

    // Calculate overall percentage
    const gradedAssignments = assignments.filter((a) => a.submission?.isGraded);
    const overallPercentage =
      gradedAssignments.length > 0
        ? gradedAssignments.reduce((sum, a) => sum + a.percentage, 0) /
          gradedAssignments.length
        : 0;

    // Calculate assignment completion rate
    const submittedAssignments = assignments.filter((a) => a.submission);
    const completionRate = assignments.length > 0
      ? (submittedAssignments.length / assignments.length) * 100
      : 0;

    const courseGrade = {
      course: {
        id: enrollment.course.id,
        code: enrollment.course.code,
        title: enrollment.course.title,
        credits: enrollment.course.credits,
        description: enrollment.course.description,
        semester: enrollment.course.semester,
        level: enrollment.course.level,
      },
      enrollment: {
        id: enrollment.id,
        progress: enrollment.progress,
        status: enrollment.isCompleted ? "completed" : "in-progress",
        dateEnrolled: enrollment.dateEnrolled,
        grade: enrollment.grade,
        score: enrollment.score,
      },
      assignments,
      overallGrade: enrollment.grade || getGradeFromPercentage(overallPercentage),
      overallPercentage: Math.round(overallPercentage * 100) / 100,
      completedAssignments: gradedAssignments.length,
      totalAssignments: assignments.length,
      completionRate: Math.round(completionRate),
      averageScore: gradedAssignments.length > 0
        ? Math.round(gradedAssignments.reduce((sum, a) => sum + a.percentage, 0) / gradedAssignments.length)
        : 0,
    };

    return NextResponse.json(courseGrade);
  } catch (error) {
    console.error("Error fetching course grades:", error);
    return NextResponse.json(
      { error: "Failed to fetch course grades" },
      { status: 500 }
    );
  }
}

function getGradeFromPercentage(percentage: number): Grade | null {
  if (percentage >= 90) return Grade.A;
  if (percentage >= 80) return Grade.B;
  if (percentage >= 70) return Grade.C;
  if (percentage >= 60) return Grade.D;
  if (percentage >= 50) return Grade.E;
  if (percentage > 0) return Grade.F;
  return null;
}