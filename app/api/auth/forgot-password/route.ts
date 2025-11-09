import { NextRequest, NextResponse } from "next/server";
import { StudentRegistrationService } from "@/lib/services/student/studentRegistrationService";
import {
  ValidationError,
  StudentRegistrationError,
} from "@/lib/services/student/studentRegistrationService";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    const result = await StudentRegistrationService.requestPasswordReset(email);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Password reset request error:", error);

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

    if (error instanceof StudentRegistrationError) {
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
        message: "Failed to process password reset request",
      },
      { status: 500 }
    );
  }
}
