// app/api/profile/security/password/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProfileService } from "@/lib/services/profileService";

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!(session?.user && (session.user as { id?: string }).id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    const success = await ProfileService.changePassword({
      currentPassword,
      newPassword,
      confirmPassword: newPassword, // API doesn't need confirmation
    });

    return NextResponse.json({ success });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to change password" },
      { status: 400 }
    );
  }
}