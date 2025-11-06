// app/api/grades/recent/route.ts
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
    const limit = parseInt(searchParams.get("limit") || "5");

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
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

    // Get recent graded submissions
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentId,
        isGraded: true,
      },
      include: {
        assignment: {
          include: {
            course: true,
          },
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
      take: limit,
    });

    const recentGraded = submissions.map((submission) => {
      const percentage = submission.score
        ? (submission.score / submission.assignment.maxScore) * 100
        : 0;
      const grade = getGradeFromPercentage(percentage);

      return {
        id: submission.id,
        title: submission.assignment.title,
        courseCode: submission.assignment.course.code,
        courseName: submission.assignment.course.title,
        score: submission.score || 0,
        maxScore: submission.assignment.maxScore,
        percentage: Math.round(percentage),
        grade,
        submittedAt: submission.submittedAt,
        gradedAt: submission.submittedAt, // Using submittedAt as gradedAt for now
        feedback: submission.feedback,
        assignmentDueDate: submission.assignment.dueDate,
      };
    });

    return NextResponse.json(recentGraded);
  } catch (error) {
    console.error("Error fetching recent graded assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent grades" },
      { status: 500 }
    );
  }
}

function getGradeFromPercentage(percentage: number): Grade {
  if (percentage >= 90) return Grade.A;
  if (percentage >= 80) return Grade.B;
  if (percentage >= 70) return Grade.C;
  if (percentage >= 60) return Grade.D;
  if (percentage >= 50) return Grade.E;
  return Grade.F;
}