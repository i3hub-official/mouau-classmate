// app/api/profile/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { cookies } from "next/headers";
import { ServerProfileService } from "@/lib/services/serverProfileService";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log(
    `[PROFILE_EXPORT] GET request started at ${new Date().toISOString()}`
  );

  try {
    // Get session token from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session-token")?.value;

    console.log(`[PROFILE_EXPORT] Session token found: ${!!sessionToken}`);

    if (!sessionToken) {
      console.log(`[PROFILE_EXPORT] Authentication failed: No session token`);
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

    console.log(`[PROFILE_EXPORT] Session found: ${!!session}`);

    if (!session) {
      console.log(`[PROFILE_EXPORT] Authentication failed: Session not found`);
      return NextResponse.json(
        { error: "Session not found", code: "SESSION_NOT_FOUND" },
        { status: 401 }
      );
    }

    if (session.expires < new Date()) {
      console.log(
        `[PROFILE_EXPORT] Authentication failed: Session expired at ${session.expires.toISOString()}`
      );
      return NextResponse.json(
        { error: "Session expired", code: "SESSION_EXPIRED" },
        { status: 401 }
      );
    }

    const user = session.user;
    console.log(
      `[PROFILE_EXPORT] User authenticated: ${user.email} (${user.id})`
    );

    // Use ServerProfileService to export user data
    const exportData = await ServerProfileService.exportUserData(user.id);

    const duration = Date.now() - startTime;
    console.log(
      `[PROFILE_EXPORT] Successfully exported data for ${user.email} in ${duration}ms`
    );

    return NextResponse.json(exportData);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[PROFILE_EXPORT] Error exporting user data after ${duration}ms:`,
      error
    );

    return NextResponse.json(
      {
        error: "Failed to export user data",
        code: "EXPORT_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
