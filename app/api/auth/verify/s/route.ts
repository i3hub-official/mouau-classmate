import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

// Helper function for conditional logging (DEV only)
const devLog = (...messages: any[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log("[DEV DEBUG]", ...messages);
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    devLog("Received verification request body:", body);

    const { identifier } = body; // 1. Input Validation (returns 400)

    if (!identifier || typeof identifier !== "string") {
      devLog("Validation Failed: Identifier missing or not a string.");
      return NextResponse.json(
        { error: "Matriculation number is required" },
        { status: 400 }
      );
    }

    const matricNumber = identifier.trim().toUpperCase();
    devLog("Checking matricNumber:", matricNumber); // 2. Database Lookup: ONLY select required minimal fields

    const student = await prisma.student.findUnique({
      where: { matricNumber },
      select: {
        matricNumber: true,
        jambRegNumber: true, // Requested field
        userId: true, // Crucial field to check registration status
      },
    });

    if (!student) {
      devLog("Verification Result: Student not found in records."); // 3. Not Found (Manual Entry Allowed)
      return NextResponse.json({
        exists: false,
        requiresManualEntry: true,
        message:
          "Student not found in records. You can proceed with manual entry.",
      });
    }

    devLog(
      "Verification Result: Student found (Matric:",
      student.matricNumber,
      "UserID:",
      student.userId,
      ")"
    ); // 4. Already Registered Check (returns 409)

    if (student.userId) {
      devLog("Conflict: Matric number is already registered.");
      return NextResponse.json(
        { error: "This matric number is already registered." },
        { status: 409 }
      );
    } // 5. Success (Return data for pre-fill)

    const { userId, ...studentData } = student;
    devLog("Success: Returning pre-fill data.");

    return NextResponse.json({
      exists: true,
      data: studentData,
      requiresManualEntry: false,
    });
  } catch (error) {
    console.error("Verification error:", error);
    devLog(
      "Error detail:",
      error instanceof Error ? error.message : String(error)
    );

    return NextResponse.json(
      { error: "Verification failed. Please try again later." },
      { status: 500 }
    );
  }
}
