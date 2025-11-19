// app/api/auth/verify-reset-token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { StudentPasswordService } from "@/lib/services/s/passwordService";
import { TeacherPasswordService } from "@/lib/services/t/passwordService";
import { AdminPasswordService } from "@/lib/services/a/passwordService";

export async function POST(request: NextRequest) {
  try {
    const { token, encodedEmail } = await request.json();

    // Validate input
    if (!token || !encodedEmail) {
      return NextResponse.json(
        { success: false, error: "Token and email are required" },
        { status: 400 }
      );
    }

    // Try to verify token for each user type
    let verifyResult;

    // Try student service first
    try {
      verifyResult = await StudentPasswordService.verifyResetToken(token);
    } catch (error) {
      // Not a student, try teacher
      try {
        verifyResult = await TeacherPasswordService.verifyResetToken(token);
      } catch (error) {
        // Not a teacher, try admin
        try {
          verifyResult = await AdminPasswordService.verifyResetToken(token);
        } catch (error) {
          return NextResponse.json(
            { success: false, error: "Invalid or expired reset token" },
            { status: 400 }
          );
        }
      }
    }

    return NextResponse.json(verifyResult);
  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while verifying your token" },
      { status: 500 }
    );
  }
}
