// app/portal/student/signup/student/route.ts
import { NextRequest, NextResponse } from "next/server";
import { StudentRegistrationService } from "@/lib/services/student/studentRegistrationService";
import { StudentEmailService } from "@/lib/services/student/emailService";

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
    await StudentEmailService.sendEmailVerificationEmail(
      result.userId,
      result.verificationToken
    );

    return NextResponse.json({
      success: true,
      message:
        "Registration successful. Please check your email for verification.",
      userId: result.userId,
    });
  } catch (error) {
    console.error("Student registration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 400 }
    );
  }
}
