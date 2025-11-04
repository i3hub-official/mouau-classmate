// app/api/user/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
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

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
