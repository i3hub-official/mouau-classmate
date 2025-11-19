// app/api/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { StudentPasswordService } from "@/lib/services/s/passwordService";
import { TeacherPasswordService } from "@/lib/services/t/passwordService";
import { AdminPasswordService } from "@/lib/services/a/passwordService";
import { AuditAction } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate input
    if (!email || typeof email !== "string" || email.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Try to find user by email (could be student, teacher, or admin)
    let resetResult;

    // Try student service first
    try {
      resetResult = await StudentPasswordService.requestPasswordReset(email);
    } catch (error) {
      // Not a student, try teacher
      try {
        resetResult = await TeacherPasswordService.requestPasswordReset(email);
      } catch (error) {
        // Not a teacher, try admin
        try {
          resetResult = await AdminPasswordService.requestPasswordReset(email);
        } catch (error) {
          return NextResponse.json(
            {
              success: false,
              error: "No account found with this email address",
            },
            { status: 404 }
          );
        }
      }
    }

    // Log the password reset request
    await prisma.auditLog.create({
      data: {
        action: "PASSWORD_RESET_REQUESTED",
        resourceType: "USER",
        details: { email },
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      },
    });

    return NextResponse.json(resetResult);
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while processing your request",
      },
      { status: 500 }
    );
  }
}
