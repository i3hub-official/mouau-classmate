// app/api/grades/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { UserServiceServer } from "@/lib/services/userService.server";
import PDFDocument from "pdfkit";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await UserServiceServer.getCurrentUserFromSession();

    if (!currentUser) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedStudentId = searchParams.get("studentId");
    const formatType = searchParams.get("format") || "json";

    // Get the correct student ID using the centralized service
    const correctStudentId = await UserServiceServer.getCorrectStudentId(
      requestedStudentId || undefined
    );

    if (!correctStudentId) {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      );
    }

    // Get student details
    const student = await prisma.student.findUnique({
      where: { id: correctStudentId },
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
      where: { studentId: correctStudentId },
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

    // Calculate GPA and other statistics using consistent grading scale
    const gradePoints: Record<string, number> = {
      A: 5.0,
      B: 4.0,
      C: 3.0,
      D: 2.0,
      E: 1.0,
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
        cgpa: gpa.toFixed(2),
        totalCredits,
        completedCredits,
        totalCourses: enrollments.length,
        completedCourses: enrollments.filter((e) => e.isCompleted).length,
        currentLevel: getCurrentLevel(enrollments),
      },
      courses: courseDetails,
      gradingSystem: {
        A: "4.50 - 5.00 (Excellent)",
        B: "3.50 - 4.49 (Very Good)",
        C: "2.50 - 3.49 (Good)",
        D: "1.50 - 2.49 (Pass)",
        E: "1.00 - 1.49 (Poor)",
        F: "0.00 (Fail)",
      },
      generatedAt: new Date().toISOString(),
    };

    if (formatType === "pdf") {
      // Generate PDF
      const pdfBuffer = await generatePDF(transcriptData);

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="transcript_${student.matricNumber}.pdf"`,
          "Content-Length": pdfBuffer.length.toString(),
        },
      });
    } else if (formatType === "excel") {
      // For now, return JSON for Excel format
      // You can implement Excel generation later using exceljs
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

async function generatePDF(transcriptData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(transcriptData.institution.name, { align: "center" })
        .moveDown(0.5);

      doc
        .fontSize(12)
        .font("Helvetica")
        .text(transcriptData.institution.address, { align: "center" })
        .text(`Website: ${transcriptData.institution.website}`, {
          align: "center",
        })
        .moveDown(1);

      // Title
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("OFFICIAL ACADEMIC TRANSCRIPT", { align: "center" })
        .moveDown(1);

      // Student Information
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("STUDENT INFORMATION:")
        .moveDown(0.3);

      doc
        .font("Helvetica")
        .text(`Full Name: ${transcriptData.student.name}`)
        .text(`Matriculation Number: ${transcriptData.student.matricNumber}`)
        .text(`Department: ${transcriptData.student.department}`)
        .text(`College: ${transcriptData.student.college}`)
        .text(`Program: ${transcriptData.student.course}`)
        .text(
          `Date of Birth: ${format(
            new Date(transcriptData.student.dateOfBirth),
            "dd/MM/yyyy"
          )}`
        )
        .text(`Admission Year: ${transcriptData.student.admissionYear}`)
        .moveDown(1);

      // Academic Summary
      doc.font("Helvetica-Bold").text("ACADEMIC SUMMARY:").moveDown(0.3);

      doc
        .font("Helvetica")
        .text(`Current GPA: ${transcriptData.academicSummary.gpa}`)
        .text(`CGPA: ${transcriptData.academicSummary.cgpa}`)
        .text(`Total Credits: ${transcriptData.academicSummary.totalCredits}`)
        .text(
          `Completed Credits: ${transcriptData.academicSummary.completedCredits}`
        )
        .text(`Total Courses: ${transcriptData.academicSummary.totalCourses}`)
        .text(
          `Completed Courses: ${transcriptData.academicSummary.completedCourses}`
        )
        .text(`Current Level: ${transcriptData.academicSummary.currentLevel}`)
        .moveDown(1);

      // Course Details Table Header
      doc
        .font("Helvetica-Bold")
        .text("COURSE DETAILS:", 50, doc.y)
        .moveDown(0.5);

      // Table Headers
      const tableTop = doc.y;
      const headers = [
        "Code",
        "Title",
        "Credits",
        "Semester",
        "Level",
        "Grade",
        "Instructor",
        "Status",
      ];
      const columnWidths = [60, 150, 40, 60, 40, 40, 100, 60];

      let xPosition = 50;
      headers.forEach((header, i) => {
        doc
          .fontSize(8)
          .font("Helvetica-Bold")
          .text(header, xPosition, tableTop, {
            width: columnWidths[i],
            align: "left",
          });
        xPosition += columnWidths[i];
      });

      doc.moveDown(0.3);

      // Course Rows
      let yPosition = doc.y;
      transcriptData.courses.forEach((course: any, index: number) => {
        if (yPosition > 700) {
          // Add new page if needed
          doc.addPage();
          yPosition = 50;
        }

        xPosition = 50;
        const rowData = [
          course.code,
          course.title,
          course.credits.toString(),
          course.semester,
          course.level,
          course.grade || "-",
          course.instructor,
          course.status,
        ];

        rowData.forEach((data, i) => {
          doc
            .fontSize(8)
            .font("Helvetica")
            .text(data || "-", xPosition, yPosition, {
              width: columnWidths[i],
              align: "left",
              lineBreak: false,
            });
          xPosition += columnWidths[i];
        });

        yPosition += 20;

        // Draw line between rows
        doc
          .moveTo(50, yPosition - 5)
          .lineTo(50 + columnWidths.reduce((a, b) => a + b, 0), yPosition - 5)
          .strokeOpacity(0.2)
          .stroke();
      });

      doc.y = yPosition + 10;

      // Grading System
      doc.font("Helvetica-Bold").text("GRADING SYSTEM:").moveDown(0.3);

      doc
        .font("Helvetica")
        .text(`A: ${transcriptData.gradingSystem.A}`)
        .text(`B: ${transcriptData.gradingSystem.B}`)
        .text(`C: ${transcriptData.gradingSystem.C}`)
        .text(`D: ${transcriptData.gradingSystem.D}`)
        .text(`E: ${transcriptData.gradingSystem.E}`)
        .text(`F: ${transcriptData.gradingSystem.F}`)
        .moveDown(1);

      // Footer
      doc
        .fontSize(8)
        .text(
          `Generated on: ${format(
            new Date(transcriptData.generatedAt),
            "dd/MM/yyyy HH:mm"
          )}`,
          { align: "center" }
        )
        .text("This is an official document issued by the University.", {
          align: "center",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function getCurrentLevel(enrollments: any[]): string {
  if (enrollments.length === 0) return "100";

  const levels = enrollments.map((e) => e.course.level);
  const highestLevel = Math.max(
    ...levels.map((level) => parseInt(level) || 100)
  );
  return highestLevel.toString();
}
