// app/api/assignments/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { AssignmentService } from "@/lib/services/students/assignmentService";

// 1. UPDATE: The params object is now a Promise
interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 2. UPDATE: Await the params object to resolve it before destructuring
    const { id } = await params;

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

// If you have other methods (PUT, DELETE), apply the same fix there too!
// For example:
/*
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params; // <-- Await here as well
    await AssignmentService.deleteAssignment(id);
    return NextResponse.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    // ... error handling
  }
}
*/
+98
+9