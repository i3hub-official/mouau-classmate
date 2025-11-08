// app/api/profile/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { cookies } from "next/headers";
import { ServerProfileService } from "@/lib/services/serverProfileService";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log(
    `[PROFILE_NOTIFICATIONS] GET request started at ${new Date().toISOString()}`
  );

  try {
    // Get session token from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session-token")?.value;

    console.log(
      `[PROFILE_NOTIFICATIONS] Session token found: ${!!sessionToken}`
    );

    if (!sessionToken) {
      console.log(
        `[PROFILE_NOTIFICATIONS] Authentication failed: No session token`
      );
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

    console.log(`[PROFILE_NOTIFICATIONS] Session found: ${!!session}`);

    if (!session) {
      console.log(
        `[PROFILE_NOTIFICATIONS] Authentication failed: Session not found`
      );
      return NextResponse.json(
        { error: "Session not found", code: "SESSION_NOT_FOUND" },
        { status: 401 }
      );
    }

    if (session.expires < new Date()) {
      console.log(
        `[PROFILE_NOTIFICATIONS] Authentication failed: Session expired at ${session.expires.toISOString()}`
      );
      return NextResponse.json(
        { error: "Session expired", code: "SESSION_EXPIRED" },
        { status: 401 }
      );
    }

    const user = session.user;
    console.log(
      `[PROFILE_NOTIFICATIONS] User authenticated: ${user.email} (${user.id})`
    );

    // Use ServerProfileService to get notification settings
    const settings = await ServerProfileService.getNotificationSettings(
      user.id
    );

    const duration = Date.now() - startTime;
    console.log(
      `[PROFILE_NOTIFICATIONS] Successfully returned notification settings for ${user.email} in ${duration}ms`
    );

    return NextResponse.json(settings);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[PROFILE_NOTIFICATIONS] Error fetching notification settings after ${duration}ms:`,
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch notification settings",
        code: "NOTIFICATIONS_FETCH_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  console.log(
    `[PROFILE_NOTIFICATIONS] PUT request started at ${new Date().toISOString()}`
  );

  try {
    // Get session token from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session-token")?.value;

    console.log(
      `[PROFILE_NOTIFICATIONS] Session token found: ${!!sessionToken}`
    );

    if (!sessionToken) {
      console.log(
        `[PROFILE_NOTIFICATIONS] Authentication failed: No session token`
      );
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

    console.log(`[PROFILE_NOTIFICATIONS] Session found: ${!!session}`);

    if (!session) {
      console.log(
        `[PROFILE_NOTIFICATIONS] Authentication failed: Session not found`
      );
      return NextResponse.json(
        { error: "Session not found", code: "SESSION_NOT_FOUND" },
        { status: 401 }
      );
    }

    if (session.expires < new Date()) {
      console.log(
        `[PROFILE_NOTIFICATIONS] Authentication failed: Session expired at ${session.expires.toISOString()}`
      );
      return NextResponse.json(
        { error: "Session expired", code: "SESSION_EXPIRED" },
        { status: 401 }
      );
    }

    const user = session.user;
    const body = await request.json();

    console.log(
      `[PROFILE_NOTIFICATIONS] Updating notification settings for user ${user.email} with data:`,
      body
    );

    // Use ServerProfileService to update notification settings
    const success = await ServerProfileService.updateNotificationSettings(
      user.id,
      body
    );

    if (!success) {
      return NextResponse.json(
        {
          error: "Failed to update notification settings",
          code: "UPDATE_FAILED",
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[PROFILE_NOTIFICATIONS] Successfully updated notification settings for ${user.email} in ${duration}ms`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[PROFILE_NOTIFICATIONS] Error updating notification settings after ${duration}ms:`,
      error
    );

    return NextResponse.json(
      {
        error: "Failed to update notification settings",
        code: "UPDATE_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
