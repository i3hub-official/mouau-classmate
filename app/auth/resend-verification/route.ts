// app/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { StudentRegistrationService } from "@/lib/services/studentRegistrationService";
import { prisma } from "@/lib/server/prisma";
import { RateLimitService } from "@/lib/services/rateLimitService";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get client IP for rate limiting
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Rate limiting check
    const rateLimitKey = `resend_verification:${ipAddress}`;
    const rateLimitResult = await RateLimitService.checkRateLimit(
      rateLimitKey,
      {
        maxAttempts: 3,
        windowMs: 15 * 60 * 1000, // 15 minutes
      }
    );

    if (rateLimitResult.isLimited) {
      await prisma.auditLog.create({
        data: {
          action: "RATE_LIMIT_EXCEEDED",
          resourceType: "USER",
          details: {
            action: "resend_verification",
            ipAddress,
            retryAfter: rateLimitResult.retryAfter,
          },
          ipAddress,
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: `Too many verification requests. Please try again in ${Math.ceil(
              rateLimitResult.retryAfter! / 1000
            )} seconds.`,
            retryAfter: rateLimitResult.retryAfter,
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              rateLimitResult.retryAfter! / 1000
            ).toString(),
            "X-RateLimit-Limit": "3",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(
              Date.now() + rateLimitResult.retryAfter!
            ).toISOString(),
          },
        }
      );
    }

    // Get the current session to find the user's email
    const session = await getServerSession(authOptions);

    let email: string;

    // Support both session-based and body-based email requests
    if (session?.user?.email) {
      email = session.user.email;
    } else {
      // Allow email to be provided in request body for non-authenticated users
      const body = await request.json().catch(() => ({}));
      email = body.email;

      if (!email || typeof email !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "EMAIL_REQUIRED",
              message: "Email address is required to resend verification",
            },
          },
          { status: 400 }
        );
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_EMAIL",
            message: "Please provide a valid email address",
          },
        },
        { status: 400 }
      );
    }

    // Check if user exists and needs verification
    const user = await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        emailVerified: true,
      },
    });

    if (!user) {
      // Don't reveal whether user exists for security
      await prisma.auditLog.create({
        data: {
          action: "RESEND_VERIFICATION_REQUESTED",
          resourceType: "USER",
          details: {
            email,
            status: "user_not_found",
            ipAddress,
          },
          ipAddress,
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });

      // Return success even if user doesn't exist for security
      return NextResponse.json({
        success: true,
        message:
          "If your email is registered, you will receive a verification email shortly.",
      });
    }

    // Check if user is already verified
    if (user.isActive && user.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ALREADY_VERIFIED",
            message:
              "Your email is already verified. You can sign in to your account.",
          },
        },
        { status: 400 }
      );
    }

    // Resend verification email (returns nanoid code, but we don't expose it)
    const code = await StudentRegistrationService.resendVerificationEmail(
      email
    );

    console.log("✅ Resent verification email with new nanoid code");

    // Log successful resend
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "RESEND_VERIFICATION_REQUESTED",
        resourceType: "USER",
        resourceId: user.id,
        details: {
          email,
          status: "success",
          ipAddress,
          securityMethod: "nanoid_encoded_email",
        },
        ipAddress,
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    // Create security notification for user
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Verification Email Sent",
        message:
          "A new verification email has been sent to your email address. Please check your inbox and spam folder.",
        type: "SECURITY",
        priority: 2,
      },
    });

    const duration = Date.now() - startTime;
    await prisma.metric.create({
      data: {
        name: "resend_verification_success",
        value: duration,
        tags: {
          userId: user.id,
          duration: `${duration}ms`,
        },
        timestamp: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully! Please check your inbox.",
      // Don't return the code for security
    });
  } catch (error: any) {
    console.error("❌ Resend verification error:", error);

    const duration = Date.now() - startTime;
    await prisma.metric.create({
      data: {
        name: "resend_verification_error",
        value: duration,
        tags: {
          error: error.name || "UnknownError",
          duration: `${duration}ms`,
        },
        timestamp: new Date(),
      },
    });

    // Log security event for critical errors
    if (
      error.name === "StudentRegistrationError" &&
      error.code === "SECURITY_ISSUE"
    ) {
      await prisma.securityEvent.create({
        data: {
          eventType: "verification_email_failure",
          severity: "high",
          description: `Failed to send verification email: ${error.message}`,
          ipAddress:
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
          metadata: {
            error: error.message,
            stack: error.stack,
          },
        },
      });
    }

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
