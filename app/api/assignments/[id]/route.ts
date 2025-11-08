// app/api/assignments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AssignmentService } from "@/lib/services/students/assignmentService";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    // In a real application, you would get the user ID from the session
    const assignment = await AssignmentService.getAssignmentById(id);

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    // Transform the data to match the frontend interface
    const assignmentData = {
      id: assignment.id,
      title: assignment.title,
      course: assignment.course.title,
      courseCode: assignment.course.code,
      dueDate: assignment.dueDate.toISOString().split("T")[0],
      dueTime: assignment.dueDate.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }),
      description: assignment.description,
      maxPoints: assignment.maxScore,
      submissionType: "both" as const, // You might want to store this in your Assignment model
      allowedFormats: [".pdf", ".doc", ".docx", ".txt", ".zip"],
      maxFileSize: 10 * 1024 * 1024, // 10MB
    };

    return NextResponse.json(assignmentData);
  } catch (error) {
    console.error("Error fetching assignment:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignment details" },
      { status: 500 }
    );
  }
}
