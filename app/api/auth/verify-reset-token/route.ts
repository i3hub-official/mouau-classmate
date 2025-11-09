import { NextRequest, NextResponse } from "next/server";
import { StudentRegistrationService } from "@/lib/services/student/studentRegistrationService";
import {
  ValidationError,
  StudentRegistrationError,
} from "@/lib/services/student/studentRegistrationService";

export async function POST(request: NextRequest) {
  try {
    const { token, encodedEmail } = await request.json();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "TOKEN_REQUIRED",
          message: "Reset token is required",
        },
        { status: 400 }
      );
    }

    const result = await StudentRegistrationService.verifyPasswordResetToken(
      token,
      encodedEmail
    );

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_TOKEN",
          message: result.message,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Token verification error:", error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "SERVER_ERROR",
        message: "Failed to verify reset token",
      },
      { status: 500 }
    );
  }
}
