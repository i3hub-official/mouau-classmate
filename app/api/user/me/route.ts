// app/api/user/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session-token")?.value;

    console.log("Session token found:", !!sessionToken);

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Not authenticated", code: "NO_SESSION" },
        { status: 401 }
      );
    }

    // Find session and user
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: {
          include: {
            student: true,
            teacher: true,
          },
        },
      },
    });

    console.log("Session found:", !!session);

    if (!session) {
      return NextResponse.json(
        { error: "Session not found", code: "SESSION_NOT_FOUND" },
        { status: 401 }
      );
    }

    if (session.expires < new Date()) {
      return NextResponse.json(
        { error: "Session expired", code: "SESSION_EXPIRED" },
        { status: 401 }
      );
    }

    const user = session.user;

    type UserData = {
      id: string;
      email: string;
      name: string | null;
      role: string;
      matricNumber?: string;
      department?: string;
      college?: string;
      course?: string;
    };

    let userData: UserData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    // Add role-specific data
    if (user.role === "STUDENT" && user.student) {
      userData = {
        ...userData,
        matricNumber: user.student.matricNumber,
        department: user.student.department,
        college: user.student.college,
        course: user.student.course,
      };
    } else if (user.role === "TEACHER" && user.teacher) {
      userData = {
        ...userData,
        matricNumber: user.teacher.employeeId,
        department: user.teacher.department,
        course: "Lecturer",
      };
    }

    console.log("Returning user data for:", user.email);
    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);

    // Return proper JSON error response
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
