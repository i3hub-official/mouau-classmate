// app/api/auth/admin/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AdminPasswordService } from "@/lib/services/admin/passwordService";
import { AuditAction } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Authenticate admin
    const result = await AdminPasswordService.authenticateAdmin(
      email,
      password
    );

    // Log the authentication attempt
    await prisma.auditLog.create({
      data: {
        action: result.success ? "USER_LOGGED_IN" : "USER_LOGIN_FAILED",
        resourceType: "USER",
        details: {
          email,
          success: result.success || false,
        },
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin authentication error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500 }
    );
  }
}
