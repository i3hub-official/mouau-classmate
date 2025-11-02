// app/api/auth/signup/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { StudentRegistrationService } from "@/lib/services/studentRegistrationService";

export async function POST(request: NextRequest) {
  try {
    const { identifier } = await request.json();

    if (!identifier) {
      return NextResponse.json(
        { error: "Identifier is required" },
        { status: 400 }
      );
    }

    const result = await StudentRegistrationService.verifyStudent(identifier);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Student verification error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 400 }
    );
  }
}
