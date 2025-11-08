// app/auth/signup/student/route.ts
import { NextRequest, NextResponse } from "next/server";
import { StudentRegistrationService } from "@/lib/services/students/studentRegistrationService";

export async function POST(request: NextRequest) {
  try {
    const registrationData = await request.json();

    // Validate required fields
    const requiredFields = ["matricNumber", "studentData", "password"];
    for (const field of requiredFields) {
      if (!registrationData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const result = await StudentRegistrationService.registerStudent(
      registrationData
    );

    // Send verification email
    await StudentRegistrationService.sendVerificationEmail(
      registrationData.studentData.email,
      result.user.id,
      result.user.name || "Student"
    );

    return NextResponse.json({
      success: true,
      message:
        "Registration successful. Please check your email for verification.",
      userId: result.user.id,
      requiresVerification: result.requiresVerification,
    });
  } catch (error) {
    console.error("Student registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 400 }
    );
  }
}
