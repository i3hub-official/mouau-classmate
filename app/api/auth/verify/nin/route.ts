// File: app/api/auth/verify/nin/route.ts

import { NextRequest, NextResponse } from "next/server";
import { StudentRegistrationService } from "@/lib/services/s/studentRegistrationService";
import { NINVerificationService } from "@/lib/services/ninVerificationService";

export async function POST(request: NextRequest) {
  try {
    const { nin } = await request.json();

    // Validate NIN format
    if (!nin || !/^\d{11}$/.test(nin)) {
      return NextResponse.json(
        { error: "Invalid NIN format. Must be 11 digits." },
        { status: 400 }
      );
    }

    // Step 1: Check if NIN is already registered in our system
    const isNINAvailable =
      await StudentRegistrationService.checkNINAvailability(nin);

    if (!isNINAvailable) {
      return NextResponse.json(
        {
          error:
            "This NIN is already registered. Please use a different NIN or try logging in.",
          code: "NIN_ALREADY_REGISTERED",
        },
        { status: 409 }
      );
    }

    // Step 2: Check NIN cache for previously verified data
    const cachedResult = await NINVerificationService.getCachedNINData(nin);

    if (cachedResult.exists) {
      return NextResponse.json({
        ...cachedResult,
        fromCache: true,
        source: "nin_cache",
        message: "NIN data retrieved from cache",
      });
    }

    // Step 3: Check our student database to see if user is registered
    const studentCheck = await NINVerificationService.checkStudentDBForNIN(nin);

    if (studentCheck.exists) {
      return NextResponse.json(
        {
          error:
            "This NIN is already registered. Please use a different NIN or try logging in.",
          code: "NIN_ALREADY_REGISTERED",
        },
        { status: 409 }
      );
    }

    // Step 4: Since NIN is not in cache or database, allow manual entry
    // External API check is temporarily disabled
    return NextResponse.json({
      exists: false,
      requiresManualEntry: true,
      message:
        "NIN not found in our records. Please enter your details manually.",
    });
  } catch (error) {
    console.error("NIN verification error:", error);

    if (error instanceof Error) {
      // Handle specific error cases
      if (error.message.includes("NIN already registered")) {
        return NextResponse.json(
          {
            error: error.message,
            code: "NIN_ALREADY_REGISTERED",
          },
          { status: 409 }
        );
      }

      // Handle API rate limiting or quota exceeded
      if (
        error.message.includes("quota") ||
        error.message.includes("rate limit")
      ) {
        return NextResponse.json(
          {
            error:
              "Verification service temporarily unavailable. Please try again later.",
            code: "SERVICE_UNAVAILABLE",
          },
          { status: 503 }
        );
      }

      // Handle invalid API key
      if (
        error.message.includes("unauthorized") ||
        error.message.includes("api key")
      ) {
        console.error("NIN verification API key issue:", error);
        return NextResponse.json(
          {
            error:
              "Verification service temporarily unavailable. Please try again later.",
            code: "SERVICE_UNAVAILABLE",
          },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "NIN verification failed. Please try again." },
      { status: 500 }
    );
  }
}
