// app/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { StudentRegistrationService } from '@/lib/services/studentRegistrationService';
import { prisma } from '@/lib/server/prisma';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { code, encodedEmail, hash } = body;

    // Validate required parameters
    if (!code || typeof code !== 'string' || code.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: {
            code: 'MISSING_CODE',
            message: 'Verification code is required'
          }
        },
        { status: 400 }
      );
    }

    // Optional: Validate encoded email if provided
    if (encodedEmail && typeof encodedEmail !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: {
            code: 'INVALID_EMAIL_PARAMETER',
            message: 'Invalid email parameter format'
          }
        },
        { status: 400 }
      );
    }

    // Get client IP for logging
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || 
                     request.headers.get("x-real-ip") || 
                     "unknown";

    const userAgent = request.headers.get("user-agent") || "unknown";

    // Verify the email using the new method signature
    const result = await StudentRegistrationService.verifyEmail(
      code,
      encodedEmail
    );

    // Log successful verification
    await prisma.auditLog.create({
      data: {
        userId: result.user.id,
        action: "EMAIL_VERIFIED",
        resourceType: "USER",
        resourceId: result.user.id,
        details: {
          email: result.user.email,
          verifiedAt: new Date().toISOString(),
          ipAddress,
        },
        ipAddress,
        userAgent,
      },
    });

    // Track verification success metric
    const duration = Date.now() - startTime;
    await prisma.metric.create({
      data: {
        name: "email_verification_success",
        value: duration,
        tags: {
          userId: result.user.id,
          duration: `${duration}ms`,
        },
        timestamp: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now sign in.',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name
      }
    });
  } catch (error: any) {
    console.error('❌ Email verification error:', error);

    const duration = Date.now() - startTime;
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

    // Track verification failure metric
    await prisma.metric.create({
      data: {
        name: "email_verification_error",
        value: duration,
        tags: {
          error: error.name || "UnknownError",
          duration: `${duration}ms`,
        },
        timestamp: new Date(),
      },
    });

    // Log failed verification attempt
    await prisma.auditLog.create({
      data: {
        action: "EMAIL_VERIFICATION_FAILED",
        resourceType: "USER",
        details: {
          error: error.message,
          errorCode: error.code,
          ipAddress,
        },
        ipAddress,
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    if (error.name === 'ValidationError' || error.name === 'StudentRegistrationError') {
      return NextResponse.json(
        { 
          success: false, 
          error: {
            code: error.code || 'VERIFICATION_FAILED',
            message: error.message
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: {
          code: 'SERVER_ERROR',
          message: 'Email verification failed. Please try again.'
        }
      },
      { status: 500 }
    );
  }
}

// GET endpoint to verify via URL parameters
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('t'); // Verification code
    const encodedEmail = searchParams.get('e'); // Encoded email
    const hash = searchParams.get('h'); // Timestamp hash

    if (!code) {
      return NextResponse.json(
        { 
          success: false, 
          error: {
            code: 'MISSING_CODE',
            message: 'Verification code is required'
          }
        },
        { status: 400 }
      );
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || 
                     request.headers.get("x-real-ip") || 
                     "unknown";

    const userAgent = request.headers.get("user-agent") || "unknown";

    // Verify the email
    const result = await StudentRegistrationService.verifyEmail(
      code,
      encodedEmail || undefined
    );

    // Log successful verification
    await prisma.auditLog.create({
      data: {
        userId: result.user.id,
        action: "EMAIL_VERIFIED",
        resourceType: "USER",
        resourceId: result.user.id,
        details: {
          email: result.user.email,
          verifiedAt: new Date().toISOString(),
          method: "GET",
          ipAddress,
        },
        ipAddress,
        userAgent,
      },
    });

    // Track success metric
    const duration = Date.now() - startTime;
    await prisma.metric.create({
      data: {
        name: "email_verification_success_get",
        value: duration,
        tags: {
          userId: result.user.id,
          duration: `${duration}ms`,
        },
        timestamp: new Date(),
      },
    });

    // Redirect to success page or return JSON
    const baseUrl = request.nextUrl.origin;
    return NextResponse.redirect(
      `${baseUrl}/auth/verify-email?status=success&message=${encodeURIComponent('Email verified successfully!')}`
    );

  } catch (error: any) {
    console.error('❌ Email verification error (GET):', error);

    const duration = Date.now() - startTime;
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

    // Track failure metric
    await prisma.metric.create({
      data: {
        name: "email_verification_error_get",
        value: duration,
        tags: {
          error: error.name || "UnknownError",
          duration: `${duration}ms`,
        },
        timestamp: new Date(),
      },
    });

    // Redirect to error page
    const baseUrl = request.nextUrl.origin;
    return NextResponse.redirect(
      `${baseUrl}/auth/verify-email?status=error&message=${encodeURIComponent(error.message || 'Verification failed')}`
    );
  }
}