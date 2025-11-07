// app/api/grades/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { UserServiceServer } from "@/lib/services/userService.server";
import { Grade } from "@prisma/client";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

// Extend jsPDF with autoTable
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
  autoTable: (options: any) => void;
}

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
        action: "EXPORT_TRANSCRIPT",
        resourceType: "STUDENT",
        resourceId: student.id,
        details: {
          format,
          gpa,
          totalCourses: enrollments.length,
          generatedAt: new Date().toISOString(),
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
          action: "EXPORT_TRANSCRIPT_FAILED",
          resourceType: "STUDENT",
          details: {
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
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

// Update the generateExcelTranscript function to work with your data structure
async function generateExcelTranscript(
  student: any,
  enrollments: any[],
  gpa: number
) {
  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Summary sheet
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

  // Course grades sheet
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

    // Calculate course performance from assignment submissions
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

    // Use enrollment grade if available, otherwise calculated grade
    const finalGrade = enrollment.grade || calculatedGrade;

    // Determine course status
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

  // Detailed assignments sheet
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

  // Grade legend sheet
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

  // Generate Excel file
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

// Update generatePdfTranscript similarly (adjust for your data structure)
async function generatePdfTranscript(
  student: any,
  enrollments: any[],
  gpa: number
) {
  const doc = new jsPDF() as jsPDFWithAutoTable;

  // Set document properties
  doc.setProperties({
    title: `Academic Transcript - ${student.matricNumber}`,
    subject: "Official Academic Transcript",
    author: "MOUAU ClassMate System",
    creator: "MOUAU ClassMate",
  });

  // University Header
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text("MICHAEL OKPARA UNIVERSITY OF AGRICULTURE, UMUDIKE", 105, 20, {
    align: "center",
  });

  doc.setFontSize(14);
  doc.setTextColor(80, 80, 80);
  doc.text("OFFICIAL ACADEMIC TRANSCRIPT", 105, 30, { align: "center" });

  // Student information section
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("STUDENT INFORMATION", 20, 50);

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

  let yPos = 60;
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

  // Course grades table
  yPos += 15;
  const tableData = enrollments.map((enrollment) => {
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

    // Determine status
    let status = "Not Started";
    if (enrollment.isCompleted) status = "Completed";
    else if (enrollment.progress > 0) status = "In Progress";

    return [
      course.code,
      course.title,
      course.credits.toString(),
      `L${course.level}`,
      `S${course.semester}`,
      `${enrollment.progress}%`,
      status,
      finalGrade,
      `${overallPercentage.toFixed(1)}%`,
    ];
  });

  doc.autoTable({
    startY: yPos,
    head: [
      [
        "Course Code",
        "Course Title",
        "Credits",
        "Level",
        "Semester",
        "Progress",
        "Status",
        "Grade",
        "Percentage",
      ],
    ],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: "bold" },
      1: { cellWidth: 45 },
      2: { cellWidth: 12 },
      3: { cellWidth: 10 },
      4: { cellWidth: 12 },
      5: { cellWidth: 15 },
      6: { cellWidth: 18 },
      7: { cellWidth: 12, fontStyle: "bold" },
      8: { cellWidth: 15 },
    },
    margin: { left: 15, right: 15 },
  });

  // Add grade legend on new page if needed
  let finalY = doc.lastAutoTable.finalY + 15;

  if (finalY > 250) {
    doc.addPage();
    finalY = 20;
  }

  // Grade legend
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text("GRADE SCALE", 20, finalY);

  finalY += 8;
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
    doc.text(grade, 20, finalY);
    doc.text(points, 60, finalY);
    doc.text(description, 80, finalY);
    finalY += 5;
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
      290,
      { align: "center" }
    );

    // Confidential watermark on first page
    if (i === 1) {
      doc.setFontSize(40);
      doc.setTextColor(240, 240, 240);
      doc.text("CONFIDENTIAL", 105, 150, {
        align: "center",
        angle: 45,
      });
    }
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

function calculateGradeFromPercentage(percentage: number): Grade {
  if (percentage >= 90) return Grade.A;
  if (percentage >= 80) return Grade.B;
  if (percentage >= 70) return Grade.C;
  if (percentage >= 60) return Grade.D;
  if (percentage >= 50) return Grade.E;
  return Grade.F;
}
