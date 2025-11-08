// app/api/profile/deletion-request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProfileService } from "@/lib/services/students/profileService";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!(session?.user && (session.user as { id?: string }).id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reason } = body;

    const success = await ProfileService.requestAccountDeletion(reason);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to request account deletion" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error requesting account deletion:", error);
    return NextResponse.json(
      { error: "Failed to request account deletion" },
      { status: 500 }
    );
  }
}
