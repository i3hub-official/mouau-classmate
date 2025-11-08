import { NextRequest, NextResponse } from "next/server";
import {
  StudentRegistrationService,
  ValidationError,
  StudentRegistrationError,
} from "@/lib/services/studentRegistrationService";

export async function POST(request: NextRequest) {
  try {
    const { token, encodedEmail, password, confirmPassword } =
      await request.json();

    const result = await StudentRegistrationService.resetPasswordWithToken(
      token,
      encodedEmail,
      password,
      confirmPassword
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Password reset error:", error);

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
        message: "Failed to reset password",
      },
      { status: 500 }
    );
  }
}
