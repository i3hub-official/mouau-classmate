// app/api/courses/enroll/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CourseService } from "@/lib/services/courseService";
import { prisma } from "@/lib/server/prisma";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Find session and user
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: true,
      },
    });

    if (!session || session.expires < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const { courseId } = await request.json();

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      );
    }

    // Enroll student in course
    const enrollment = await CourseService.enrollInCourse(
      courseId,
      session.userId
    );

    return NextResponse.json({ success: true, enrollment });
  } catch (error: any) {
    console.error("Error enrolling in course:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
