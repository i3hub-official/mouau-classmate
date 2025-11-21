// File: app/api/s/signup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { StudentRegistrationService } from "@/lib/services/s/studentRegistrationService";
import { StudentEmailService } from "@/lib/services/s/emailService";

// Default profile picture URL
const DEFAULT_PROFILE_PICTURE =
  "https://res.cloudinary.com/djimok28g/image/upload/v1763579659/ock8lrmvr3elhho1dhuw.jpg";

export async function POST(request: NextRequest) {
  try {
    const registrationData = await request.json();

    // Show received data in development mode
    if (process.env.NODE_ENV === "development") {
      console.log("=== REGISTRATION DATA RECEIVED ===");
      console.log(JSON.stringify(registrationData, null, 2));
      console.log("=== END REGISTRATION DATA ===");
    }

    // Validate required fields
    const requiredFields = [
      "nin",
      "jambRegNumber",
      "email",
      "phone",
      "password",
      // Remove passportUrl from required fields since we have a default
    ];
    for (const field of requiredFields) {
      if (!registrationData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate NIN format (11 digits)
    if (!/^\d{11}$/.test(registrationData.nin)) {
      return NextResponse.json(
        { error: "Invalid NIN format. Must be 11 digits." },
        { status: 400 }
      );
    }

    // Validate JAMB Registration Number format
    if (!/^\d{10,13}[A-Z]{2}$/.test(registrationData.jambRegNumber)) {
      return NextResponse.json(
        { error: "Invalid JAMB Registration Number format." },
        { status: 400 }
      );
    }

    // Validate Matric Number if provided
    if (registrationData.hasMatricNumber === "yes") {
      if (!registrationData.matricNumber) {
        return NextResponse.json(
          { error: "Matric Number is required when you select 'Yes'" },
          { status: 400 }
        );
      }

      // Validate Matric Number format
      if (!/^[A-Za-z0-9\/\-]{7,}$/.test(registrationData.matricNumber)) {
        return NextResponse.json(
          { error: "Invalid Matric Number format." },
          { status: 400 }
        );
      }
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registrationData.email)) {
      return NextResponse.json(
        { error: "Invalid email address format." },
        { status: 400 }
      );
    }

    // Validate phone number format
    if (
      !/^\+?[\d\s-()]{10,}$/.test(registrationData.phone.replace(/\s/g, ""))
    ) {
      return NextResponse.json(
        { error: "Invalid phone number format." },
        { status: 400 }
      );
    }

    // Validate password strength
    if (registrationData.password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // Use default profile picture if passportUrl is empty
    const finalPassportUrl =
      registrationData.passportUrl?.trim() || DEFAULT_PROFILE_PICTURE;

    // Log which image is being used
    if (process.env.NODE_ENV === "development") {
      console.log("Using passport URL:", finalPassportUrl);
      console.log("Is using default:", !registrationData.passportUrl);
    }

    // Create registration data with the final passport URL
    const registrationDataWithDefault = {
      ...registrationData,
      passportUrl: finalPassportUrl,
    };

    const result = await StudentRegistrationService.registerStudent(
      registrationDataWithDefault
    );

    // Send verification email
    await StudentEmailService.sendEmailVerificationEmail(
      result.userId,
      result.verificationToken
    );

    return NextResponse.json({
      success: true,
      message:
        "Registration successful. Please check your email for verification.",
      userId: result.userId,
      usedDefaultProfile: !registrationData.passportUrl, // Indicate if default was used
    });
  } catch (error) {
    console.error("Student registration error:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      // Check for duplicate entry errors
      if (error.message.includes("duplicate key")) {
        if (error.message.includes("nin")) {
          return NextResponse.json(
            { error: "An account with this NIN already exists." },
            { status: 409 }
          );
        }
        if (error.message.includes("email")) {
          return NextResponse.json(
            { error: "An account with this email already exists." },
            { status: 409 }
          );
        }
        if (error.message.includes("jambRegNumber")) {
          return NextResponse.json(
            {
              error:
                "An account with this JAMB Registration Number already exists.",
            },
            { status: 409 }
          );
        }
        if (error.message.includes("matricNumber")) {
          return NextResponse.json(
            { error: "An account with this Matric Number already exists." },
            { status: 409 }
          );
        }
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
