// app/api/auth/user/greeting/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { StudentService } from "@/lib/services/s/studentService";
import { TeacherService } from "@/lib/services/t/teacherService";
import { AdminService } from "@/lib/services/a/adminService";
import { AuditAction } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    // Get user ID from session or token
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Try to get user from each service
    let user;
    let greeting;

    // Try student first
    try {
      user = await StudentService.getStudentByUserId(userId);
      if (user) {
        greeting = `Welcome back, ${user.firstName}!`;
      }
    } catch (error) {
      // Try teacher if student failed
      try {
        user = await TeacherService.getTeacherByUserId(userId);
        if (user) {
          greeting = `Welcome back, ${user.firstName}!`;
        }
      } catch (error) {
        // Try admin if teacher failed
        try {
          user = await AdminService.getAdminByUserId(userId);
          if (user) {
            greeting = `Welcome back, ${user.name}!`;
          }
        } catch (error) {
          return NextResponse.json(
            { success: false, error: "User not found" },
            { status: 404 }
          );
        }
      }
    }

    // If no user found, return default greeting
    if (!greeting) {
      greeting = "Welcome back!";
    }

    // Log the greeting access
    await prisma.auditLog.create({
      data: {
        action: "USER_PROFILE_VIEWED",
        resourceType: "USER",
        resourceId: userId,
        details: { greeting },
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      },
    });

    return NextResponse.json({ success: true, greeting }, { status: 200 });
  } catch (error) {
    console.error("Get user greeting error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while fetching user greeting",
      },
      { status: 500 }
    );
  }
}
