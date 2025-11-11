// app/api/auth/student/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { StudentPasswordService } from "@/lib/services/student/passwordService";
import { AuditAction, ResourceType, SessionSecurityLevel } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const { matricNumber, password } = await request.json();

    // Validate input
    if (!matricNumber || !password) {
      return NextResponse.json(
        { success: false, error: "Matric number and password are required" },
        { status: 400 }
      );
    }

    // Get student details to check if account is locked
    const student = await prisma.student.findUnique({
      where: { matricNumber },
      select: { 
        userId: true, 
        id: true,
        user: {
          select: {
            accountLocked: true,
            lockedUntil: true,
            failedLoginAttempts: true
          }
        }
      }
    });

    // Check if student exists
    if (!student) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (student.user.accountLocked && student.user.lockedUntil && student.user.lockedUntil > new Date()) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Account is temporarily locked. Please try again later." 
        },
        { status: 423 }
      );
    }

    // Authenticate student
    const result = await StudentPasswordService.authenticateStudent(
      matricNumber,
      password
    );

    // Extract IP address more reliably
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(/, /)[0] : "unknown";

    // Log the authentication attempt
    await prisma.auditLog.create({
      data: {
        userId: student.userId,
        action: result.success ? AuditAction.USER_LOGGED_IN : AuditAction.USER_LOGIN_FAILED,
        resourceType: ResourceType.USER,
        resourceId: student.id,
        details: {
          matricNumber,
          success: result.success || false,
          timestamp: new Date().toISOString()
        },
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || "unknown",
        securityLevel: SessionSecurityLevel.MEDIUM
      },
    });

    // If authentication failed, increment failed attempts and potentially lock account
    if (!result.success) {
      const newFailedAttempts = (student.user.failedLoginAttempts || 0) + 1;
      const shouldLockAccount = newFailedAttempts >= 5;
      const lockedUntil = shouldLockAccount ? new Date(Date.now() + 30 * 60 * 1000) : null;
      
      // Update user with new failed attempts and lock status
      await prisma.user.update({
        where: { id: student.userId },
        data: {
          failedLoginAttempts: newFailedAttempts,
          accountLocked: shouldLockAccount,
          lockedUntil,
          lastFailedLoginAt: new Date()
        }
      });

      // Return appropriate error message
      if (shouldLockAccount) {
        return NextResponse.json(
          { 
            success: false, 
            error: "Account locked due to multiple failed login attempts. Please try again in 30 minutes." 
          },
          { status: 429 }
        );
      }
    } else {
      // Reset failed login attempts on successful login
      await prisma.user.update({
        where: { id: student.userId },
        data: {
          failedLoginAttempts: 0,
          lastLoginAt: new Date(),
          loginCount: { increment: 1 }
        }
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Student authentication error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 }
    );
  }
}