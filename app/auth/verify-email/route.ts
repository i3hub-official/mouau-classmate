// app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { StudentRegistrationService } from "@/lib/services/studentRegistrationService";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    const result = await StudentRegistrationService.verifyEmail(token);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Email verification failed",
      },
      { status: 400 }
    );
  }
}
