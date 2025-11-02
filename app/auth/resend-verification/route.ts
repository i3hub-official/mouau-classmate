// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { StudentRegistrationService } from "@/lib/services/studentRegistrationService";

export async function POST(request: NextRequest) {
  try {
    // Get the current session to find the user's email
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Please sign in to resend verification email",
          },
        },
        { status: 401 }
      );
    }

    const { email } = session.user;

    // Resend verification email
    const token = await StudentRegistrationService.resendVerificationEmail(
      email
    );

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully! Please check your inbox.",
    });
  } catch (error: any) {
    console.error("Resend verification error:", error);

    if (
      error.name === "ValidationError" ||
      error.name === "StudentRegistrationError"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code || "RESEND_FAILED",
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to resend verification email. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
