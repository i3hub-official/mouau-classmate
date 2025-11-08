// app/api/grades/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { UserServiceServer } from "@/lib/services/userService.server";
import { Grade, AuditAction } from "@prisma/client";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    // Use the same authentication pattern as your summary route
    const currentUser = await UserServiceServer.getCurrentUserFromSession();

    if (!currentUser) {
      console.log("❌ Unauthorized access attempt to export");
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") as "pdf" | "excel";

    // Validate format parameter
    if (!format) {
      return NextResponse.json(
        { error: "Missing format parameter" },
        { status: 400 }
      );
    }

    if (format !== "pdf" && format !== "excel") {
      return NextResponse.json(
        { error: 'Invalid format. Use "pdf" or "excel"' },
        { status: 400 }
      );
    }

    // Get the correct student ID using your existing service
    const correctStudentId = await UserServiceServer.getCorrectStudentId();

    if (!correctStudentId) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      );
    }

    console.log("📊 Exporting transcript for student:", correctStudentId);

    // Get student data for the authenticated user with proper relationships
    const student = await prisma.student.findFirst({
      where: {
        id: correctStudentId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        enrollments: {
          include: {
            course: {
              include: {
                assignments: {
                  where: { isPublished: true },
                  include: {
                    submissions: {
                      where: {
                        studentId: correctStudentId,
                      },
                      orderBy: { submittedAt: "desc" },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            course: {
              code: "asc",
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student record not found" },
        { status: 404 }
      );
    }

    // Calculate academic statistics
    const enrollments = student.enrollments;

    // Calculate GPA based on your schema's Grade enum
    const gradePoints: Record<Grade, number> = {
      [Grade.A]: 5.0,
      [Grade.B]: 4.0,
      [Grade.C]: 3.0,
      [Grade.D]: 2.0,
      [Grade.E]: 1.0,
      [Grade.F]: 0.0,
    };

    // Get all graded submissions from enrollments
    const allGradedSubmissions = enrollments.flatMap((enrollment) => {
      return enrollment.course.assignments.flatMap((assignment) => {
        return assignment.submissions
          .filter(
            (submission) => submission.isGraded && submission.score !== null
          )
          .map((submission) => ({
            grade: calculateGradeFromPercentage(
              (submission.score! / assignment.maxScore) * 100
            ),
            credits: enrollment.course.credits,
          }));
      });
    });

    const totalGradePoints = allGradedSubmissions.reduce((sum, item) => {
      return sum + (gradePoints[item.grade] || 0) * item.credits;
    }, 0);

    const totalCredits = allGradedSubmissions.reduce((sum, item) => {
      return sum + item.credits;
    }, 0);

    const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

    // Create audit log for the export
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: AuditAction.SYSTEM_CONFIG_UPDATED,
        resourceType: "STUDENT",
        resourceId: student.id,
        details: {
          format,
          gpa,
          totalCourses: enrollments.length,
          generatedAt: new Date().toISOString(),
          note: "Transcript exported successfully",
          actionType: "EXPORT_TRANSCRIPT",
        },
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
          "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    if (format === "excel") {
      return await generateExcelTranscript(student, enrollments, gpa);
    } else {
      return await generatePdfTranscript(student, enrollments, gpa);
    }
  } catch (error) {
    console.error("Error exporting transcript:", error);

    // Log the error in audit log
    const currentUser = await UserServiceServer.getCurrentUserFromSession();
    if (currentUser) {
      await prisma.auditLog.create({
        data: {
          userId: currentUser.id,
          action: AuditAction.USER_LOGIN_ERROR,
          resourceType: "STUDENT",
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
            note: "Transcript export failed",
            actionType: "EXPORT_TRANSCRIPT_FAILED",
          },
          ipAddress:
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });
    }

    return NextResponse.json(
      { error: "Failed to export transcript" },
      { status: 500 }
    );
  }
}

// Helper function to load and convert logo to base64
function getLogoBase64(): string | null {
  try {
    // Try mouau_logo.webp first, then favicon.ico
    const logoPath = path.join(process.cwd(), "public", "mouau_logo.webp");
    const faviconPath = path.join(process.cwd(), "public", "favicon.ico");

    let imagePath = logoPath;
    let imageFormat = "WEBP";

    if (fs.existsSync(logoPath)) {
      imagePath = logoPath;
      imageFormat = "WEBP";
    } else if (fs.existsSync(faviconPath)) {
      imagePath = faviconPath;
      imageFormat = "PNG"; // ICO files are typically PNG format
    } else {
      console.warn("Logo file not found in public directory");
      return null;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");
    return `data:image/${imageFormat.toLowerCase()};base64,${base64Image}`;
  } catch (error) {
    console.error("Error loading logo:", error);
    return null;
  }
}

// PDF generation with logo
async function generatePdfTranscript(
  student: any,
  enrollments: any[],
  gpa: number
) {
  const doc = new jsPDF();

  // Set document properties
  doc.setProperties({
    title: `Academic Transcript - ${student.matricNumber}`,
    subject: "Official Academic Transcript",
    author: "MOUAU ClassMate System",
    creator: "MOUAU ClassMate",
  });

  // Add logo at the top
  const logoData = getLogoBase64();
  if (logoData) {
    try {
      // Add logo centered at the top (adjust size and position as needed)
      doc.addImage(logoData, "PNG", 90, 5, 30, 30);
    } catch (error) {
      console.error("Error adding logo to PDF:", error);
    }
  }

  // University Header (moved down to accommodate logo)
  const headerYStart = logoData ? 40 : 20;

  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text(
    "MICHAEL OKPARA UNIVERSITY OF AGRICULTURE, UMUDIKE",
    105,
    headerYStart,
    {
      align: "center",
    }
  );

  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  doc.text("OFFICIAL ACADEMIC TRANSCRIPT", 105, headerYStart + 10, {
    align: "center",
  });

  // Student information section
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("STUDENT INFORMATION", 20, headerYStart + 30);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  const studentInfo = [
    [
      "Full Name:",
      student.user?.name || `${student.firstName} ${student.lastName}`,
    ],
    ["Matric Number:", student.matricNumber],
    ["Department:", student.department],
    ["Course of Study:", student.course],
    ["College:", student.college],
    ["Email Address:", student.user?.email || student.email],
    [
      "Date Enrolled:",
      student.dateEnrolled
        ? new Date(student.dateEnrolled).toLocaleDateString()
        : "N/A",
    ],
  ];

  let yPos = headerYStart + 40;
  studentInfo.forEach(([label, value]) => {
    doc.text(label, 20, yPos);
    doc.text(value, 60, yPos);
    yPos += 6;
  });

  // Academic summary
  yPos += 10;
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("ACADEMIC SUMMARY", 20, yPos);

  yPos += 8;
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  const totalGraded = enrollments.flatMap((e) =>
    e.course.assignments.flatMap((a: any) =>
      a.submissions.filter((s: any) => s.isGraded)
    )
  ).length;

  const academicSummary = [
    ["Cumulative GPA:", gpa.toFixed(2)],
    ["Total Courses Enrolled:", enrollments.length.toString()],
    [
      "Courses Completed:",
      enrollments.filter((e) => e.isCompleted).length.toString(),
    ],
    [
      "Courses In Progress:",
      enrollments
        .filter((e) => !e.isCompleted && e.progress > 0)
        .length.toString(),
    ],
    ["Graded Assignments:", totalGraded.toString()],
  ];

  academicSummary.forEach(([label, value]) => {
    doc.text(label, 20, yPos);
    doc.text(value, 80, yPos);
    yPos += 5;
  });

  // Course grades section
  yPos += 15;
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("COURSE PERFORMANCE", 20, yPos);

  yPos += 10;

  // Simple table header
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(59, 130, 246);
  doc.rect(20, yPos, 170, 6, "F");
  doc.text("Course Code", 22, yPos + 4);
  doc.text("Course Title", 45, yPos + 4);
  doc.text("Credits", 120, yPos + 4);
  doc.text("Grade", 140, yPos + 4);
  doc.text("Progress", 160, yPos + 4);

  yPos += 8;
  doc.setTextColor(0, 0, 0);

  // Course data
  enrollments.forEach((enrollment, index) => {
    const course = enrollment.course;

    // Check if we need a new page
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    // Calculate course performance
    const gradedSubmissions = course.assignments.flatMap((assignment: any) =>
      assignment.submissions.filter(
        (submission: any) => submission.isGraded && submission.score !== null
      )
    );

    const totalScore = gradedSubmissions.reduce(
      (sum: number, submission: any) => sum + (submission.score || 0),
      0
    );

    const maxScore = gradedSubmissions.reduce(
      (sum: number, submission: any) => {
        const assignment = course.assignments.find(
          (a: any) => a.id === submission.assignmentId
        );
        return sum + (assignment?.maxScore || 0);
      },
      0
    );

    const overallPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const calculatedGrade = calculateGradeFromPercentage(overallPercentage);
    const finalGrade = enrollment.grade || calculatedGrade;

    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPos, 170, 6, "F");
    }

    doc.text(course.code, 22, yPos + 4);

    // Truncate long course titles
    const title =
      course.title.length > 30
        ? course.title.substring(0, 30) + "..."
        : course.title;
    doc.text(title, 45, yPos + 4);
    doc.text(course.credits.toString(), 120, yPos + 4);
    doc.text(finalGrade, 140, yPos + 4);
    doc.text(`${enrollment.progress}%`, 160, yPos + 4);

    yPos += 7;
  });

  // Grade legend
  yPos += 10;
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("GRADE SCALE", 20, yPos);

  yPos += 8;
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  const gradeScale = [
    ["A (90-100%)", "5.0", "Excellent"],
    ["B (80-89%)", "4.0", "Very Good"],
    ["C (70-79%)", "3.0", "Good"],
    ["D (60-69%)", "2.0", "Credit"],
    ["E (50-59%)", "1.0", "Pass"],
    ["F (Below 50%)", "0.0", "Fail"],
  ];

  gradeScale.forEach(([grade, points, description]) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(grade, 20, yPos);
    doc.text(points, 60, yPos);
    doc.text(description, 80, yPos);
    yPos += 5;
  });

  // Footer with generation info
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} • Page ${i} of ${pageCount} • MOUAU ClassMate System`,
      105,
      285,
      { align: "center" }
    );
  }

  // Generate PDF buffer
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="transcript-${student.matricNumber}.pdf"`,
      "Cache-Control": "no-cache",
    },
  });
}

// Excel generation function (unchanged)
async function generateExcelTranscript(
  student: any,
  enrollments: any[],
  gpa: number
) {
  const workbook = XLSX.utils.book_new();

  const summaryData = [
    ["OFFICIAL ACADEMIC TRANSCRIPT"],
    ["Michael Okpara University of Agriculture, Umudike"],
    [],
    ["STUDENT INFORMATION"],
    [
      "Full Name:",
      student.user?.name || `${student.firstName} ${student.lastName}`,
    ],
    ["Matric Number:", student.matricNumber],
    ["Department:", student.department],
    ["Course of Study:", student.course],
    ["College:", student.college],
    ["Email:", student.user?.email || student.email],
    [
      "Date Enrolled:",
      student.dateEnrolled
        ? new Date(student.dateEnrolled).toLocaleDateString()
        : "N/A",
    ],
    [],
    ["ACADEMIC SUMMARY"],
    ["Cumulative GPA:", gpa.toFixed(2)],
    ["Total Courses Enrolled:", enrollments.length],
    ["Courses Completed:", enrollments.filter((e) => e.isCompleted).length],
    [
      "Courses In Progress:",
      enrollments.filter((e) => !e.isCompleted && e.progress > 0).length,
    ],
    [
      "Courses Not Started:",
      enrollments.filter((e) => e.progress === 0).length,
    ],
    [
      "Total Graded Assignments:",
      enrollments.flatMap((e) =>
        e.course.assignments.flatMap((a: any) =>
          a.submissions.filter((s: any) => s.isGraded)
        )
      ).length,
    ],
    [],
    [
      "Transcript Generated On:",
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    ],
    [],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Transcript Summary");

  const courseGradesData = [
    ["COURSE PERFORMANCE"],
    [],
    [
      "Course Code",
      "Course Title",
      "Credits",
      "Level",
      "Semester",
      "Progress %",
      "Status",
      "Course Grade",
      "Graded Assignments",
      "Overall %",
    ],
  ];

  enrollments.forEach((enrollment) => {
    const course = enrollment.course;

    const gradedSubmissions = course.assignments.flatMap((assignment: any) =>
      assignment.submissions.filter(
        (submission: any) => submission.isGraded && submission.score !== null
      )
    );

    const totalScore = gradedSubmissions.reduce(
      (sum: number, submission: any) => sum + (submission.score || 0),
      0
    );

    const maxScore = gradedSubmissions.reduce(
      (sum: number, submission: any) => {
        const assignment = course.assignments.find(
          (a: any) => a.id === submission.assignmentId
        );
        return sum + (assignment?.maxScore || 0);
      },
      0
    );

    const overallPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const calculatedGrade = calculateGradeFromPercentage(overallPercentage);
    const finalGrade = enrollment.grade || calculatedGrade;

    let status = "Not Started";
    if (enrollment.isCompleted) {
      status = "Completed";
    } else if (enrollment.progress > 0) {
      status = "In Progress";
    }

    courseGradesData.push([
      course.code,
      course.title,
      course.credits.toString(),
      `Level ${course.level}`,
      `Semester ${course.semester}`,
      `${enrollment.progress}%`,
      status,
      finalGrade,
      gradedSubmissions.length.toString(),
      `${overallPercentage.toFixed(1)}%`,
    ]);
  });

  const gradesSheet = XLSX.utils.aoa_to_sheet(courseGradesData);
  XLSX.utils.book_append_sheet(workbook, gradesSheet, "Course Grades");

  const assignmentsData = [
    ["DETAILED ASSIGNMENT GRADES"],
    [],
    [
      "Course Code",
      "Course Title",
      "Assignment",
      "Due Date",
      "Max Score",
      "Score",
      "Percentage",
      "Grade",
      "Submission Date",
      "Graded",
      "Feedback",
    ],
  ];

  enrollments.forEach((enrollment) => {
    enrollment.course.assignments.forEach((assignment: any) => {
      assignment.submissions.forEach((submission: any) => {
        const percentage =
          assignment.maxScore > 0 && submission.score !== null
            ? ((submission.score || 0) / assignment.maxScore) * 100
            : 0;

        const submissionGrade =
          submission.isGraded && submission.score !== null
            ? calculateGradeFromPercentage(percentage)
            : "Pending";

        assignmentsData.push([
          enrollment.course.code,
          enrollment.course.title,
          assignment.title,
          new Date(assignment.dueDate).toLocaleDateString(),
          assignment.maxScore.toString(),
          submission.isGraded ? submission.score?.toString() || "N/A" : "N/A",
          submission.isGraded ? `${percentage.toFixed(1)}%` : "N/A",
          submissionGrade,
          submission.submittedAt
            ? new Date(submission.submittedAt).toLocaleDateString()
            : "N/A",
          submission.isGraded ? "Yes" : "No",
          submission.feedback || "",
        ]);
      });
    });
  });

  const assignmentsSheet = XLSX.utils.aoa_to_sheet(assignmentsData);
  XLSX.utils.book_append_sheet(
    workbook,
    assignmentsSheet,
    "Assignment Details"
  );

  const legendData = [
    ["GRADE SCALE AND INTERPRETATION"],
    [],
    ["Grade", "Percentage Range", "Grade Points", "Interpretation"],
    ["A", "90% - 100%", "5.0", "Excellent"],
    ["B", "80% - 89%", "4.0", "Very Good"],
    ["C", "70% - 79%", "3.0", "Good"],
    ["D", "60% - 69%", "2.0", "Credit"],
    ["E", "50% - 59%", "1.0", "Pass"],
    ["F", "Below 50%", "0.0", "Fail"],
    [],
    [
      "Note: GPA is calculated based on all graded assignments across all courses.",
    ],
  ];

  const legendSheet = XLSX.utils.aoa_to_sheet(legendData);
  XLSX.utils.book_append_sheet(workbook, legendSheet, "Grade Scale");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  return new NextResponse(excelBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="transcript-${student.matricNumber}.xlsx"`,
      "Cache-Control": "no-cache",
    },
  });
}

function calculateGradeFromPercentage(percentage: number): Grade {
  if (percentage >= 90) return Grade.A;
  if (percentage >= 80) return Grade.B;
  if (percentage >= 70) return Grade.C;
  if (percentage >= 60) return Grade.D;
  if (percentage >= 50) return Grade.E;
  return Grade.F;
}
