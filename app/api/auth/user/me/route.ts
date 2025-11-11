// app/api/auth/user/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { StudentService } from "@/lib/services/student/studentService";
import { TeacherService } from "@/lib/services/teacher/teacherService";
import { AdminUserService } from "@/lib/services/admin/userService";
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

    // Try student first
    try {
      user = await StudentService.getStudentByUserId(userId);
    } catch (error) {
      // Try teacher if student failed
      try {
        user = await TeacherService.getTeacherByUserId(userId);
      } catch (error) {
        // Try admin if teacher failed
        try {
          user = await AdminUserService.getUserById(userId);
        } catch (error) {
          return NextResponse.json(
            { success: false, error: "User not found" },
            { status: 404 }
          );
        }
      }
    }

    // Log the user profile access
    await prisma.auditLog.create({
      data: {
        action: "USER_PROFILE_VIEWED",
        resourceType: "USER",
        resourceId: userId,
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      },
    });

    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (error) {
    console.error("Get user profile error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while fetching user profile",
      },
      { status: 500 }
    );
  }
}
