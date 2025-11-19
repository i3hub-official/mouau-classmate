// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { StudentEmailService } from "@/lib/services/s/emailService";
import { TeacherEmailService } from "@/lib/services/t/emailService";
import { AdminEmailService } from "@/lib/services/a/emailService";
import { AuditAction, ResourceType } from "@prisma/client";

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

    // Extract IP address more reliably
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(/, /)[0] : "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Try to resend verification for each user type
    let resendResult;
    let userFound = false;

    // Try student first
    try {
      resendResult = await StudentEmailService.resendVerificationEmail(email);
      userFound = true;
    } catch (error) {
      // Try teacher if student failed
      try {
        resendResult = await TeacherEmailService.resendVerificationEmail(email);
        userFound = true;
      } catch (error) {
        // Try admin if teacher failed
        try {
          resendResult = await AdminEmailService.resendVerificationEmail(email);
          userFound = true;
        } catch (error) {
          // All attempts failed
          console.error("All user type attempts failed:", error);
        }
      }
    }

    // If no user was found, don't reveal this for security reasons
    if (!userFound) {
      // Still log the attempt
      await prisma.auditLog.create({
        data: {
          action: AuditAction.RESEND_VERIFICATION_REQUESTED,
          resourceType: ResourceType.USER,
          details: {
            email,
            success: false,
            reason: "User not found",
          },
          ipAddress: ip,
          userAgent,
        },
      });

      // Return a generic success message to prevent email enumeration attacks
      return NextResponse.json({
        success: true,
        message:
          "If an account with this email exists, a verification email has been sent.",
      });
    }

    // Log the resend verification attempt
    await prisma.auditLog.create({
      data: {
        action: AuditAction.RESEND_VERIFICATION_REQUESTED,
        resourceType: ResourceType.USER,
        details: {
          email,
          success: resendResult?.success || false,
        },
        ipAddress: ip,
        userAgent,
      },
    });

    return NextResponse.json(resendResult);
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while resending verification email",
      },
      { status: 500 }
    );
  }
}
