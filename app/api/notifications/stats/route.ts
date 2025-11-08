// app/api/notifications/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { UserServiceServer } from "@/lib/services/userService.server";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await UserServiceServer.getCurrentUserFromSession();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const total = await prisma.notification.count({
      where: { userId: currentUser.id },
    });

    const unread = await prisma.notification.count({
      where: {
        userId: currentUser.id,
        isRead: false,
      },
    });

    const read = total - unread;

    return NextResponse.json({
      total,
      unread,
      read,
    });
  } catch (error) {
    console.error("Error fetching notification stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification stats" },
      { status: 500 }
    );
  }
}
