// app/api/grades/performance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { UserServiceServer } from "@/lib/services/userService.server";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Starting performance metrics request");
    const currentUser = await UserServiceServer.getCurrentUserFromSession();

    if (!currentUser) {
      console.log("❌ Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedId = searchParams.get("studentId");

    // Get the correct student ID
    const correctStudentId = await UserServiceServer.getCorrectStudentId(
      requestedId || undefined
    );

    if (!correctStudentId) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      );
    }

    // console.log(
    //   "📊 Fetching performance metrics for student:",
    //   correctStudentId
    // );

    // Get enrollments with grades
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: correctStudentId },
      include: {
        course: {
          include: {
            assignments: {
              where: { isPublished: true },
              include: {
                submissions: {
                  where: {
                    studentId: correctStudentId,
                    isGraded: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Calculate current GPA
    let totalPoints = 0;
    let totalCredits = 0;
    const gradePoints: Record<string, number> = {
      A: 5.0,
      B: 4.0,
      C: 3.0,
      D: 2.0,
      E: 1.0,
      F: 0.0,
    };

    enrollments.forEach((enrollment) => {
      if (enrollment.grade) {
        totalPoints +=
          gradePoints[enrollment.grade] * enrollment.course.credits;
        totalCredits += enrollment.course.credits;
      }
    });

    const currentGPA = totalCredits > 0 ? totalPoints / totalCredits : 0.0;

    // Calculate average grade percentage from submissions
    const allSubmissions = enrollments.flatMap((e) =>
      e.course.assignments.flatMap((a) => a.submissions)
    );
    const gradedSubmissions = allSubmissions.filter((s) => s.isGraded);

    const avgPercentage =
      gradedSubmissions.length > 0
        ? gradedSubmissions.reduce((sum, s) => {
            const assignment = enrollments
              .flatMap((e) => e.course.assignments)
              .find((a) => a.id === s.assignmentId);
            return sum + ((s.score || 0) / (assignment?.maxScore || 100)) * 100;
          }, 0) / gradedSubmissions.length
        : 0;

    // Count completed courses
    const completedCourses = enrollments.filter((e) => e.isCompleted).length;

    // Calculate total credits
    const earnedCredits = enrollments
      .filter((e) => e.isCompleted)
      .reduce((sum, e) => sum + e.course.credits, 0);

    // Mock trend data
    const metrics = [
      {
        label: "Current GPA",
        value: currentGPA.toFixed(2),
        trend: "stable" as const,
        change: 0,
      },
      {
        label: "Average Grade",
        value: `${Math.round(avgPercentage)}%`,
        trend: "up" as const,
        change: 5,
      },
      {
        label: "Completed Courses",
        value: completedCourses,
        trend: "up" as const,
        change: 10,
      },
      {
        label: "Total Credits",
        value: earnedCredits,
        trend: "up" as const,
        change: 8,
      },
    ];

    // console.log("✅ Performance metrics calculated");
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance metrics" },
      { status: 500 }
    );
  }
}
