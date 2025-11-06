// app/api/grades/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { UserServiceServer } from "@/lib/services/userService.server";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await UserServiceServer.getCurrentUserFromSession();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const format = searchParams.get("format") || "json";

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    const hasAccess = await UserServiceServer.verifyStudentAccess(studentId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get student details
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        matricNumber: true,
        department: true,
        college: true,
        course: true,
        dateOfBirth: true,
        admissionYear: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get all enrollments with grades
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        course: {
          include: {
            instructor: {
              select: {
                firstName: true,
                lastName: true,
                department: true,
              },
            },
          },
        },
      },
      orderBy: {
        course: {
          semester: "asc",
        },
      },
    });

    // Calculate GPA and other statistics
    const gradePoints: Record<string, number> = {
      A: 4.0,
      B: 3.0,
      C: 2.0,
      D: 1.0,
      E: 0.5,
      F: 0.0,
    };

    let totalPoints = 0;
    let totalCredits = 0;
    let completedCredits = 0;

    const courseDetails = enrollments.map((enrollment) => {
      const points = enrollment.grade ? gradePoints[enrollment.grade] || 0 : 0;
      const qualityPoints = points * enrollment.course.credits;

      if (enrollment.grade) {
        totalPoints += qualityPoints;
        totalCredits += enrollment.course.credits;
      }

      if (enrollment.isCompleted) {
        completedCredits += enrollment.course.credits;
      }

      return {
        code: enrollment.course.code,
        title: enrollment.course.title,
        credits: enrollment.course.credits,
        semester: enrollment.course.semester,
        level: enrollment.course.level,
        grade: enrollment.grade,
        score: enrollment.score,
        instructor: enrollment.course.instructor
          ? `${enrollment.course.instructor.firstName} ${enrollment.course.instructor.lastName}`
          : "Not Assigned",
        status: enrollment.isCompleted ? "Completed" : "In Progress",
        dateCompleted: enrollment.isCompleted ? enrollment.updatedAt : null,
      };
    });

    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0.0;

    // Generate transcript data
    const transcriptData = {
      institution: {
        name: "Michael Okpara University of Agriculture, Umudike",
        address: "Umudike, Abia State, Nigeria",
        website: "www.mouau.edu.ng",
      },
      student: {
        name: `${student.firstName} ${student.lastName}`,
        matricNumber: student.matricNumber,
        department: student.department,
        college: student.college,
        course: student.course,
        dateOfBirth: student.dateOfBirth,
        admissionYear: student.admissionYear,
      },
      academicSummary: {
        gpa: gpa.toFixed(2),
        cgpa: gpa.toFixed(2), // Assuming same as GPA for simplicity
        totalCredits,
        completedCredits,
        totalCourses: enrollments.length,
        completedCourses: enrollments.filter((e) => e.isCompleted).length,
        currentLevel: getCurrentLevel(enrollments),
      },
      courses: courseDetails,
      gradingSystem: {
        A: "4.00 - 5.00 (Excellent)",
        B: "3.00 - 3.99 (Very Good)",
        C: "2.00 - 2.99 (Good)",
        D: "1.00 - 1.99 (Pass)",
        E: "0.50 - 0.99 (Poor)",
        F: "0.00 (Fail)",
      },
      generatedAt: new Date().toISOString(),
    };

    // For now, return as JSON
    // In production, you would generate actual PDF/Excel here
    if (format === "pdf") {
      // Generate PDF using a library like pdfkit or puppeteer
      return NextResponse.json(transcriptData, {
        headers: {
          "Content-Disposition": `attachment; filename="transcript_${student.matricNumber}.json"`,
          "Content-Type": "application/json",
        },
      });
    } else if (format === "excel") {
      // Generate Excel using a library like exceljs
      return NextResponse.json(transcriptData, {
        headers: {
          "Content-Disposition": `attachment; filename="transcript_${student.matricNumber}.json"`,
          "Content-Type": "application/json",
        },
      });
    } else {
      // Return JSON by default
      return NextResponse.json(transcriptData, {
        headers: {
          "Content-Disposition": `attachment; filename="transcript_${student.matricNumber}.json"`,
          "Content-Type": "application/json",
        },
      });
    }
  } catch (error) {
    console.error("Error exporting transcript:", error);
    return NextResponse.json(
      { error: "Failed to export transcript" },
      { status: 500 }
    );
  }
}

function getCurrentLevel(enrollments: any[]): string {
  if (enrollments.length === 0) return "100";

  const levels = enrollments.map((e) => e.course.level);
  const highestLevel = Math.max(
    ...levels.map((level) => parseInt(level) || 100)
  );
  return highestLevel.toString();
}
