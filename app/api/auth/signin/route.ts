// app/api/auth/signout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { AuditAction } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    // Get user ID from session or token
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Clear session (implementation depends on your session management)
    // This would involve clearing cookies, server-side sessions, etc.

    // Log the sign out
    await prisma.auditLog.create({
      data: {
        action: "USER_LOGGED_OUT",
        resourceType: "USER",
        resourceId: userId,
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      },
    });

    // Return success response
    return NextResponse.json(
      { success: true, message: "Signed out successfully" },
      {
        status: 200,
        // Clear any auth cookies
        headers: {
          "Set-Cookie":
            "auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax, refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
        },
      }
    );
  } catch (error) {
    console.error("Sign out error:", error);
    return NextResponse.json(
      { success: false, error: "An error occurred while signing out" },
      { status: 500 }
    );
  }
}
