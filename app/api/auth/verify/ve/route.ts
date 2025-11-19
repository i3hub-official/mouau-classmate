// app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { StudentEmailService } from "@/lib/services/s/emailService";
import { TeacherEmailService } from "@/lib/services/t/emailService";
import { AdminEmailService } from "@/lib/services/a/emailService";
import { AuditAction, ResourceType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const { code, encodedEmail, hash } = await request.json();

    // Validate input
    if (!code || !encodedEmail) {
      return NextResponse.json(
        { success: false, error: "Verification code and email are required" },
        { status: 400 }
      );
    }

    // Extract IP address more reliably
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(/, /)[0] : "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Try to verify email for each user type
    let verifyResult;
    let userFound = false;

    // Try teacher first
    try {
      verifyResult = await TeacherEmailService.verifyEmailCode(
        code,
        encodedEmail,
        hash
      );
      userFound = true;
    } catch (error) {
      console.error("Teacher email verification failed:", error);

      // Try admin if teacher failed
      try {
        verifyResult = await AdminEmailService.verifyEmailCode(
          code,
          encodedEmail,
          hash
        );
        userFound = true;
      } catch (error) {
        console.error("Admin email verification failed:", error);

        // Try student if admin failed
        try {
          verifyResult = await StudentEmailService.verifyEmailCode(
            code,
            encodedEmail,
            hash
          );
          userFound = true;
        } catch (error) {
          console.error("Student email verification failed:", error);

          // All attempts failed
          return NextResponse.json(
            { success: false, error: "Invalid verification code" },
            { status: 400 }
          );
        }
      }
    }

    // Log the verification attempt
    await prisma.auditLog.create({
      data: {
        action: verifyResult?.success
          ? AuditAction.EMAIL_VERIFIED
          : AuditAction.EMAIL_VERIFICATION_FAILED,
        resourceType: ResourceType.USER,
        details: {
          encodedEmail,
          success: verifyResult?.success || false,
        },
        ipAddress: ip,
        userAgent,
      },
    });

    return NextResponse.json(verifyResult);
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while verifying your email" },
      { status: 500 }
    );
  }
}
