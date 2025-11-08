// app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { cookies } from "next/headers";
import { ServerProfileService } from "@/lib/services/students/serverProfileService";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log(`[PROFILE] GET request started at ${new Date().toISOString()}`);

  try {
    // Get session token from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session-token")?.value;

    console.log(`[PROFILE] Session token found: ${!!sessionToken}`);

    if (!sessionToken) {
      console.log(`[PROFILE] Authentication failed: No session token`);
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

    console.log(`[PROFILE] Session found: ${!!session}`);

    if (!session) {
      console.log(`[PROFILE] Authentication failed: Session not found`);
      return NextResponse.json(
        { error: "Session not found", code: "SESSION_NOT_FOUND" },
        { status: 401 }
      );
    }

    if (session.expires < new Date()) {
      console.log(
        `[PROFILE] Authentication failed: Session expired at ${session.expires.toISOString()}`
      );
      return NextResponse.json(
        { error: "Session expired", code: "SESSION_EXPIRED" },
        { status: 401 }
      );
    }

    const user = session.user;
    console.log(
      `[PROFILE] User authenticated: ${user.email} (${user.id}) | Role: ${user.role}`
    );

    // Use ServerProfileService to get profile
    const profile = await ServerProfileService.getProfile(user.id);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const duration = Date.now() - startTime;
    console.log(
      `[PROFILE] Successfully returned profile data for ${user.email} in ${duration}ms`
    );

    return NextResponse.json(profile);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[PROFILE] Error fetching profile data after ${duration}ms:`,
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch profile",
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  console.log(`[PROFILE] PUT request started at ${new Date().toISOString()}`);

  try {
    // Get session token from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session-token")?.value;

    console.log(`[PROFILE] Session token found: ${!!sessionToken}`);

    if (!sessionToken) {
      console.log(`[PROFILE] Authentication failed: No session token`);
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

    console.log(`[PROFILE] Session found: ${!!session}`);

    if (!session) {
      console.log(`[PROFILE] Authentication failed: Session not found`);
      return NextResponse.json(
        { error: "Session not found", code: "SESSION_NOT_FOUND" },
        { status: 401 }
      );
    }

    if (session.expires < new Date()) {
      console.log(
        `[PROFILE] Authentication failed: Session expired at ${session.expires.toISOString()}`
      );
      return NextResponse.json(
        { error: "Session expired", code: "SESSION_EXPIRED" },
        { status: 401 }
      );
    }

    const user = session.user;
    const body = await request.json();

    console.log(
      `[PROFILE] Updating profile for user ${user.email} with data:`,
      Object.keys(body)
    );

    // Use ServerProfileService to update profile
    const success = await ServerProfileService.updateProfile(user.id, body);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[PROFILE] Successfully updated profile for ${user.email} in ${duration}ms`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[PROFILE] Error updating profile after ${duration}ms:`,
      error
    );

    return NextResponse.json(
      {
        error: "Failed to update profile",
        code: "UPDATE_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
