// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { StudentPasswordService } from "@/lib/services/student/passwordService";
import { TeacherPasswordService } from "@/lib/services/teacher/passwordService";
import { AdminPasswordService } from "@/lib/services/admin/passwordService";
import { AuditAction } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const { token, encodedEmail, password, confirmPassword } =
      await request.json();

    // Validate input
    if (!token || !encodedEmail || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // Try to verify token and reset password for each user type
    let resetResult;

    // Try student service first
    try {
      resetResult = await StudentPasswordService.resetPassword(token, password);
    } catch (error) {
      // Not a student, try teacher
      try {
        resetResult = await TeacherPasswordService.resetPassword(
          token,
          password
        );
      } catch (error) {
        // Not a teacher, try admin
        try {
          resetResult = await AdminPasswordService.resetPassword(
            token,
            password
          );
        } catch (error) {
          return NextResponse.json(
            { success: false, error: "Invalid or expired reset token" },
            { status: 400 }
          );
        }
      }
    }

    // Log the password reset
    await prisma.auditLog.create({
      data: {
        action: "PASSWORD_RESET",
        resourceType: "USER",
        details: { encodedEmail },
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      },
    });

    return NextResponse.json(resetResult);
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while processing your request",
      },
      { status: 500 }
    );
  }
}
