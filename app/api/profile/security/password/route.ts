// app/api/profile/security/password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { cookies } from "next/headers";
import { ServerProfileService } from "@/lib/services/serverProfileService";

export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  console.log(
    `[PASSWORD_CHANGE] PUT request started at ${new Date().toISOString()}`
  );

  try {
    // Get session token from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session-token")?.value;

    console.log(`[PASSWORD_CHANGE] Session token found: ${!!sessionToken}`);

    if (!sessionToken) {
      console.log(`[PASSWORD_CHANGE] Authentication failed: No session token`);
      return NextResponse.json(
        { error: "Not authenticated", code: "NO_SESSION" },
        { status: 401 }
      );
    }

    // Find session and user
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    console.log(`[PASSWORD_CHANGE] Session found: ${!!session}`);

    if (!session) {
      console.log(`[PASSWORD_CHANGE] Authentication failed: Session not found`);
      return NextResponse.json(
        { error: "Session not found", code: "SESSION_NOT_FOUND" },
        { status: 401 }
      );
    }

    if (session.expires < new Date()) {
      console.log(
        `[PASSWORD_CHANGE] Authentication failed: Session expired at ${session.expires.toISOString()}`
      );
      return NextResponse.json(
        { error: "Session expired", code: "SESSION_EXPIRED" },
        { status: 401 }
      );
    }

    const user = session.user;
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    console.log(
      `[PASSWORD_CHANGE] Password change requested for user ${user.email}`
    );

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    // Use ServerProfileService to change password
    const success = await ServerProfileService.changePassword(user.id, {
      currentPassword,
      newPassword,
      confirmPassword: newPassword, // API doesn't need confirmation
    });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to change password" },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[PASSWORD_CHANGE] Successfully changed password for ${user.email} in ${duration}ms`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[PASSWORD_CHANGE] Error changing password after ${duration}ms:`,
      error
    );

    return NextResponse.json(
      {
        error: "Failed to change password",
        code: "PASSWORD_CHANGE_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}
