// app/api/grades/performance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { UserServiceServer } from "@/lib/services/userService.server";

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

    // Get enrollments with grades
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        course: {
          include: {
            assignments: {
              where: { isPublished: true },
              include: {
                submissions: {
                  where: { 
                    studentId,
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
      A: 4.0,
      B: 3.0,
      C: 2.0,
      D: 1.0,
      E: 0.5,
      F: 0.0,
    };

    enrollments.forEach((enrollment) => {
      if (enrollment.grade) {
        totalPoints += gradePoints[enrollment.grade] * enrollment.course.credits;
        totalCredits += enrollment.course.credits;
      }
    });

    const currentGPA = totalCredits > 0 ? totalPoints / totalCredits : 0.0;

    // Calculate average grade percentage from submissions
    const allSubmissions = enrollments.flatMap((e) =>
      e.course.assignments.flatMap((a) => a.submissions)
    );
    const gradedSubmissions = allSubmissions.filter((s) => s.isGraded);
    
    const avgPercentage = gradedSubmissions.length > 0
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

    // Get previous performance data for trend calculation
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    const previousSubmissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentId,
        isGraded: true,
        submittedAt: {
          lt: previousMonth,
        },
      },
      include: {
        assignment: true,
      },
    });

    // Calculate previous average for trend
    const previousAvgPercentage = previousSubmissions.length > 0
      ? previousSubmissions.reduce((sum, s) => {
          return sum + ((s.score || 0) / (s.assignment.maxScore || 100)) * 100;
        }, 0) / previousSubmissions.length
      : 0;

    const percentageChange = previousAvgPercentage > 0 
      ? ((avgPercentage - previousAvgPercentage) / previousAvgPercentage) * 100
      : 0;

    // Mock trend data based on actual calculations
    const metrics = [
      {
        label: "Current GPA",
        value: currentGPA.toFixed(2),
        trend: percentageChange >= 0 ? "up" : "down",
        change: Math.abs(Math.round(percentageChange / 10)),
      },
      {
        label: "Average Grade",
        value: `${Math.round(avgPercentage)}%`,
        trend: percentageChange >= 0 ? "up" : "down",
        change: Math.abs(Math.round(percentageChange)),
      },
      {
        label: "Completed Courses",
        value: completedCourses,
        trend: "up",
        change: 2, // Mock data for demonstration
      },
      {
        label: "Total Credits",
        value: earnedCredits,
        trend: "up",
        change: 6, // Mock data for demonstration
      },
    ];

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance metrics" },
      { status: 500 }
    );
  }
}