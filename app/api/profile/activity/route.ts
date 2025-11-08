// app/api/profile/activity/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { cookies } from "next/headers";
import { ServerProfileService } from "@/lib/services/serverProfileService";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log(
    `[PROFILE_ACTIVITY] GET request started at ${new Date().toISOString()}`
  );

  try {
    // Get session token from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session-token")?.value;

    console.log(`[PROFILE_ACTIVITY] Session token found: ${!!sessionToken}`);

    if (!sessionToken) {
      console.log(`[PROFILE_ACTIVITY] Authentication failed: No session token`);
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

    console.log(`[PROFILE_ACTIVITY] Session found: ${!!session}`);

    if (!session) {
      console.log(
        `[PROFILE_ACTIVITY] Authentication failed: Session not found`
      );
      return NextResponse.json(
        { error: "Session not found", code: "SESSION_NOT_FOUND" },
        { status: 401 }
      );
    }

    if (session.expires < new Date()) {
      console.log(
        `[PROFILE_ACTIVITY] Authentication failed: Session expired at ${session.expires.toISOString()}`
      );
      return NextResponse.json(
        { error: "Session expired", code: "SESSION_EXPIRED" },
        { status: 401 }
      );
    }

    const user = session.user;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    console.log(
      `[PROFILE_ACTIVITY] User authenticated: ${user.email} (${user.id}) | Limit: ${limit}`
    );

    // Use ServerProfileService to get activity log
    const activities = (await ServerProfileService.getActivityLog(
      user.id,
      limit
    )) ?? [];

    const duration = Date.now() - startTime;
    console.log(
      `[PROFILE_ACTIVITY] Successfully returned ${activities.length} activities for ${user.email} in ${duration}ms`
    );

    return NextResponse.json(activities);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[PROFILE_ACTIVITY] Error fetching activity log after ${duration}ms:`,
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch activity log",
        code: "ACTIVITY_FETCH_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
