// app/api/assignments/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// Configure file upload settings
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
];

const fileExtensions: { [key: string]: string } = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "text/plain": ".txt",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const assignmentId = formData.get("assignmentId") as string;
    const submissionText = formData.get("submissionText") as string;
    const submittedAt = formData.get("submittedAt") as string;
    const files = formData.getAll("files") as File[];

    console.log("Received submission:", {
      assignmentId,
      submissionTextLength: submissionText?.length,
      fileCount: files.length,
      submittedAt,
    });

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required" },
        { status: 400 }
      );
    }

    // Validate files
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size limit of 10MB` },
          { status: 400 }
        );
      }

      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: `File type not allowed for ${file.name}. Allowed types: PDF, DOC, DOCX, TXT, ZIP`,
          },
          { status: 400 }
        );
      }
    }

    // Process file uploads
    const uploadedFiles: { name: string; url: string; size: number }[] = [];

    if (files.length > 0) {
      // In development, upload to public directory
      // In production, you'd want to use cloud storage like S3
      const uploadDir = join(
        process.cwd(),
        "public",
        "uploads",
        "assignments",
        assignmentId
      );

      // Create directory if it doesn't exist
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique filename
        const timestamp = Date.now();
        const originalName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        const extension = fileExtensions[file.type] || ".bin";
        const uniqueFilename = `${timestamp}-${originalName}${extension}`;

        const filePath = join(uploadDir, uniqueFilename);
        await writeFile(filePath, buffer);

        uploadedFiles.push({
          name: file.name,
          url: `/uploads/assignments/${assignmentId}/${uniqueFilename}`,
          size: file.size,
        });
      }
    }

    // Create submission record
    const submissionData = {
      id: Math.random().toString(36).substr(2, 9),
      assignmentId,
      studentId: "current-user-id", // In real app, get from session
      studentName: "John Doe", // In real app, get from user profile
      submittedAt: new Date(submittedAt),
      content: submissionText || undefined,
      files: uploadedFiles,
      isGraded: false,
      score: null,
      feedback: null,
      attemptNumber: 1, // Calculate based on previous submissions
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("Submission created successfully:", {
      submissionId: submissionData.id,
      assignmentId: submissionData.assignmentId,
      fileCount: submissionData.files.length,
      hasText: !!submissionData.content,
    });

    // In a real application, you would save this to your database
    // await saveSubmissionToDatabase(submissionData);

    return NextResponse.json({
      success: true,
      submission: submissionData,
      message:
        "Assignment submitted successfully! Your work has been received.",
    });
  } catch (error) {
    console.error("Error submitting assignment:", error);
    return NextResponse.json(
      {
        error: "Failed to submit assignment. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
