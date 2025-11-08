// app/api/notifications/sample/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { UserServiceServer } from "@/lib/services/userService.server";
import { NotificationType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await UserServiceServer.getCurrentUserFromSession();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, delete any existing sample notifications to avoid duplicates
    await prisma.notification.deleteMany({
      where: {
        userId: currentUser.id,
        title: {
          contains: "Sample",
        },
      },
    });

    // Create sample notifications
    const sampleNotifications = [
      {
        title: "Welcome to MOUAU ClassMate!",
        message: "Your account has been successfully activated. Start exploring your courses.",
        type: NotificationType.SUCCESS,
        actionUrl: "/dashboard",
        priority: 1,
      },
      {
        title: "New Assignment Available",
        message: "Introduction to Computer Science assignment is now available. Due in 7 days.",
        type: NotificationType.INFO,
        actionUrl: "/assignments",
        priority: 2,
      },
      {
        title: "Grade Posted",
        message: "Your Mathematics assignment has been graded. Check your grades page for details.",
        type: NotificationType.SUCCESS,
        actionUrl: "/grades",
        priority: 2,
      },
      {
        title: "Lecture Reminder",
        message: "Physics lecture starts in 30 minutes. Don't forget to attend!",
        type: NotificationType.WARNING,
        actionUrl: "/schedule",
        priority: 3,
      },
    ];

    // Create notifications in database
    for (const notificationData of sampleNotifications) {
      await prisma.notification.create({
        data: {
          ...notificationData,
          userId: currentUser.id,
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Sample notifications created" 
    });
  } catch (error) {
    console.error("Error creating sample notifications:", error);
    return NextResponse.json(
      { error: "Failed to create sample notifications" },
      { status: 500 }
    );
  }
}