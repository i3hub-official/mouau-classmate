// app/api/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProfileService } from "@/lib/services/profileService";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!(session?.user && (session.user as { id?: string }).id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await ProfileService.getProfile((session.user as { id: string }).id);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!(session?.user && (session.user as { id?: string }).id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    const success = await ProfileService.updateProfile((session.user as { id: string }).id, body);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 500 }
    );
  }
}