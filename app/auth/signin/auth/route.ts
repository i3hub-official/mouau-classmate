// app/auth/signin/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { StudentRegistrationService } from "@/lib/services/students/studentRegistrationService";
import { prisma } from "@/lib/server/prisma";
import { JWTUtils } from "@/lib/server/jwt";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  try {
    const { matricNumber, password } = await request.json();

    if (!matricNumber || !password) {
      return NextResponse.json(
        { error: "Matric number and password are required" },
        { status: 400 }
      );
    }

    const normalizedMatric = matricNumber.trim().toUpperCase();
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded
      ? forwarded.split(",")[0].trim()
      : request.headers.get("x-real-ip") ?? "unknown";

    // Find student by matric number
    const student = await prisma.student.findFirst({
      where: {
        matricNumber: normalizedMatric,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
            isActive: true,
            emailVerified: true,
            accountLocked: true,
            lockedUntil: true,
            failedLoginAttempts: true,
          },
        },
      },
    });

    if (!student || !student.user) {
      await prisma.auditLog.create({
        data: {
          action: "USER_LOGIN_FAILED",
          resourceType: "USER",
          details: {
            matricNumber: normalizedMatric,
            reason: "student_not_found",
          },
          ipAddress: ipAddress,
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });
      return NextResponse.json(
        { error: "Invalid matric number or password" },
        { status: 401 }
      );
    }

    const user = student.user;

    // Check if account is locked
    if (
      user.accountLocked &&
      user.lockedUntil &&
      user.lockedUntil > new Date()
    ) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_LOGIN_FAILED",
          resourceType: "USER",
          details: {
            reason: "account_locked",
            lockedUntil: user.lockedUntil,
            matricNumber: normalizedMatric,
          },
          ipAddress: ipAddress,
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });
      return NextResponse.json(
        { error: "Account is temporarily locked. Please try again later." },
        { status: 423 }
      );
    }

    // Verify password
    const isValidPassword =
      await StudentRegistrationService.verifyPasswordForAuth(
        password,
        user.passwordHash!
      );

    if (!isValidPassword) {
      // Increment failed attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updateData: any = {
        failedLoginAttempts: failedAttempts,
        lastFailedLoginAt: new Date(),
      };

      if (failedAttempts >= 5) {
        updateData.accountLocked = true;
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_LOGIN_FAILED",
          resourceType: "USER",
          details: {
            failedAttempts,
            locked: failedAttempts >= 5,
            matricNumber: normalizedMatric,
          },
          ipAddress: ipAddress,
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });

      return NextResponse.json(
        { error: "Invalid matric number or password" },
        { status: 401 }
      );
    }

    // Check if account is active and verified
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Your account has been deactivated. Please contact support." },
        { status: 403 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email before signing in." },
        { status: 403 }
      );
    }

    // Reset failed attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        accountLocked: false,
        lockedUntil: null,
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    // Get student data
    const studentData = await StudentRegistrationService.getStudentData(
      normalizedMatric
    );

    // Log successful login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "USER_LOGGED_IN",
        resourceType: "USER",
        details: {
          matricNumber: normalizedMatric,
          department: student.department,
        },
        ipAddress: ipAddress,
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    // Generate session tokens
    const sessionToken = nanoid();
    const refreshToken = await JWTUtils.generateRefreshToken(user.id);
    const authToken = await JWTUtils.generateAuthToken({
      userId: user.id,
      email: user.email,
      schoolId: user.id,
      role: user.role,
      schoolNumber: normalizedMatric,
    });

    // Calculate session expiry
    const sessionExpiry = new Date();
    sessionExpiry.setHours(sessionExpiry.getHours() + 8); // 8 hours

    // Create session in database
    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires: sessionExpiry,
        deviceFingerprint: generateDeviceFingerprint(request),
        userAgent: request.headers.get("user-agent") || "unknown",
        ipAddress: ipAddress,
      },
    });

    // Create user session data for response
    const userSession = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      matricNumber: student.matricNumber,
      department: studentData?.department || student.department,
      college: studentData?.college || student.college,
      course: studentData?.course || student.course,
    };

    // Create response with proper cookies
    const response = NextResponse.json({
      success: true,
      user: userSession,
      token: authToken, // Include auth token in response for client-side usage
    });

    // Set session cookie (httpOnly for security)
    response.cookies.set("session-token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: sessionExpiry,
    });

    // Set refresh token cookie
    response.cookies.set("refresh-token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Set user ID cookie (non-httpOnly for client-side access)
    response.cookies.set("userId", user.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: sessionExpiry,
    });

    // Add security headers
    response.headers.set("x-session-created", "true");
    response.headers.set("x-user-id", user.id);
    response.headers.set("x-user-role", user.role);

    return response;
  } catch (error) {
    console.error("SignIn error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Helper function to generate device fingerprint
function generateDeviceFingerprint(request: NextRequest): string {
  const components = [
    request.headers.get("user-agent") || "unknown",
    request.headers.get("accept-language") || "unknown",
    request.headers.get("accept-encoding") || "unknown",
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown",
  ];

  const fingerprint = components.join("|");
  return Buffer.from(fingerprint).toString("base64").substring(0, 32);
}
