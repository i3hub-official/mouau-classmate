// app/assignments/submit/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/app/components/students/DashboardHeader";
import { AssignmentService } from "@/lib/services/students/assignmentService";
import {
  Upload,
  FileText,
  Calendar,
  Clock,
  BookOpen,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Paperclip,
  Trash2,
  Loader,
  ArrowLeft,
  Send,
} from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  course: string;
  courseCode: string;
  dueDate: string;
  dueTime: string;
  description: string;
  maxPoints: number;
  submissionType: "file" | "text" | "both";
  allowedFormats?: string[];
  maxFileSize?: number;
}

interface SubmissionData {
  assignmentId: string;
  submissionText: string;
  files: File[];
  submittedAt: string;
}

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

export default function SubmitAssignmentPage() {
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submissionText, setSubmissionText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [characterCount, setCharacterCount] = useState(0);
  const [dueDateInfo, setDueDateInfo] = useState<{
    isOverdue: boolean;
    timeRemaining: string;
    isCloseToDeadline: boolean;
    hoursRemaining: number;
  } | null>(null);

  // Get assignment ID from URL query parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const assignmentId = urlParams.get("id");

    if (!assignmentId) {
      setMessage({
        type: "error",
        text: "No assignment specified. Please select an assignment to submit.",
      });
      setLoading(false);
      return;
    }

    fetchAssignment(assignmentId);
  }, []);

  const fetchAssignment = async (assignmentId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assignments/${assignmentId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch assignment details");
      }

      const assignmentData = await response.json();
      setAssignment(assignmentData);
      calculateDueDateInfo(assignmentData);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      setMessage({
        type: "error",
        text: "Failed to load assignment details. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDueDateInfo = (assignmentData: Assignment) => {
    const dueDateTime = new Date(
      `${assignmentData.dueDate}T${assignmentData.dueTime}`
    );
    const now = new Date();
    const timeDiff = dueDateTime.getTime() - now.getTime();

    const isOverdue = timeDiff < 0;
    const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
    const isCloseToDeadline = timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000; // Less than 24 hours

    let timeRemaining = "";
    if (timeDiff > 0) {
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );

      if (days > 0) {
        timeRemaining = `${days} day${days > 1 ? "s" : ""} ${hours} hour${
          hours > 1 ? "s" : ""
        }`;
      } else {
        timeRemaining = `${hours} hour${hours > 1 ? "s" : ""}`;
      }
    } else {
      timeRemaining = "Overdue";
    }

    setDueDateInfo({
      isOverdue,
      timeRemaining,
      isCloseToDeadline,
      hoursRemaining,
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (!assignment) return;

    // Check file size limits
    const maxSize = assignment.maxFileSize || 10 * 1024 * 1024; // Default 10MB
    const oversizedFiles = files.filter((file) => file.size > maxSize);

    if (oversizedFiles.length > 0) {
      setMessage({
        type: "error",
        text: `Some files exceed the maximum size limit of ${
          maxSize / (1024 * 1024)
        }MB.`,
      });
      return;
    }

    // Check file format restrictions
    if (assignment.allowedFormats && assignment.allowedFormats.length > 0) {
      const invalidFiles = files.filter((file) => {
        const extension = file.name.split(".").pop()?.toLowerCase();
        return !assignment.allowedFormats?.includes(`.${extension}`);
      });

      if (invalidFiles.length > 0) {
        setMessage({
          type: "error",
          text: `Some files are not in allowed formats: ${assignment.allowedFormats.join(
            ", "
          )}`,
        });
        return;
      }
    }

    // Add files to upload queue
    const newFiles: UploadedFile[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: "uploading",
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
    simulateFileUpload(newFiles);
  };

  const simulateFileUpload = (files: UploadedFile[]) => {
    files.forEach((file) => {
      const interval = setInterval(() => {
        setUploadedFiles((prev) =>
          prev.map((f) => {
            if (f.id === file.id) {
              const newProgress = Math.min(f.progress + 10, 100);
              const status = newProgress === 100 ? "completed" : "uploading";

              if (status === "completed") {
                clearInterval(interval);
              }

              return { ...f, progress: newProgress, status };
            }
            return f;
          })
        );
      }, 200);
    });
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!assignment) return;

    // Validation
    if (assignment.submissionType !== "file" && !submissionText.trim()) {
      setMessage({
        type: "error",
        text: "Please provide a text submission or upload files as required.",
      });
      return;
    }

    if (assignment.submissionType !== "text" && uploadedFiles.length === 0) {
      setMessage({
        type: "error",
        text: "Please upload at least one file for this assignment.",
      });
      return;
    }

    // Check if all files are uploaded
    const pendingUploads = uploadedFiles.filter(
      (file) => file.status !== "completed"
    );
    if (pendingUploads.length > 0) {
      setMessage({
        type: "error",
        text: "Please wait for all files to finish uploading before submitting.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const submissionData = {
        assignmentId: assignment.id,
        submissionText: submissionText,
        files: uploadedFiles
          .filter((file) => file.status === "completed")
          .map((file) => file.file),
        submittedAt: new Date().toISOString(),
      };

      const result = await AssignmentService.submitAssignmentWithFiles(
        submissionData
      );

      if (result.success) {
        setMessage({
          type: "success",
          text: result.message || "Assignment submitted successfully!",
        });

        // Redirect to assignments page after successful submission
        setTimeout(() => {
          router.push("/assignments");
        }, 2000);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error submitting assignment:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to submit assignment. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">
              Loading assignment...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <XCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Assignment Not Found
            </h2>
            <button
              onClick={() => router.push("/assignments")}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors mx-auto"
            >
              <ArrowLeft size={16} />
              Back to Assignments
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <button
            onClick={() => router.push("/assignments")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft size={14} />
            Back to Assignments
          </button>
          <h1 className="text-2xl font-bold text-foreground">
            Submit Assignment
          </h1>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle2 size={16} />
              ) : (
                <XCircle size={16} />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Assignment Details Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  Assignment Details
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-medium text-foreground mb-1">
                    {assignment.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {assignment.course} ({assignment.courseCode})
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Due Date:</span>
                    <span className="font-medium text-foreground">
                      {new Date(assignment.dueDate).toLocaleDateString()} at{" "}
                      {assignment.dueTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Time Remaining:
                    </span>
                    <span
                      className={`font-medium ${
                        dueDateInfo?.isOverdue
                          ? "text-red-600"
                          : dueDateInfo?.isCloseToDeadline
                          ? "text-amber-600"
                          : "text-green-600"
                      }`}
                    >
                      {dueDateInfo?.timeRemaining}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Points:</span>
                    <span className="font-medium text-foreground">
                      {assignment.maxPoints} points
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Submission Type:
                    </span>
                    <span className="font-medium text-foreground capitalize">
                      {assignment.submissionType}
                    </span>
                  </div>
                </div>

                {assignment.description && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-1">
                      Description
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {assignment.description}
                    </p>
                  </div>
                )}

                {/* Animated Deadline Alert */}
                {dueDateInfo?.isOverdue && (
                  <div className="animate-pulse-slow bg-linear-to-r from-red-500/10 to-red-600/10 border-2 border-red-300 rounded-xl p-4 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        <div className="relative">
                          <AlertCircle className="h-6 w-6 text-red-600 animate-pulse" />
                          <div className="absolute inset-0 animate-ping">
                            <AlertCircle className="h-6 w-6 text-red-400 opacity-75" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base font-bold text-red-800 bg-red-100 px-2 py-1 rounded-md animate-pulse">
                            ⚠️ OVERDUE
                          </h4>
                          <span className="text-xs font-semibold text-red-700 bg-red-200 px-2 py-1 rounded-full">
                            {Math.abs(dueDateInfo.hoursRemaining)}h LATE
                          </span>
                        </div>
                        <p className="text-sm text-red-700 font-medium">
                          This assignment is past the deadline
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          Late submissions may be subject to penalties as per
                          course policy. Submit immediately to minimize grade
                          reduction.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {dueDateInfo?.isCloseToDeadline && !dueDateInfo.isOverdue && (
                  <div className="animate-pulse-slow bg-linear-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-300 rounded-xl p-4 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0">
                        <div className="relative">
                          <Clock className="h-6 w-6 text-amber-600 animate-pulse" />
                          <div className="absolute inset-0 animate-ping">
                            <Clock className="h-6 w-6 text-amber-400 opacity-75" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-base font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded-md">
                            ⏰ DEADLINE APPROACHING
                          </h4>
                          <span className="text-xs font-semibold text-amber-700 bg-amber-200 px-2 py-1 rounded-full">
                            {dueDateInfo.hoursRemaining}h LEFT
                          </span>
                        </div>
                        <p className="text-sm text-amber-700 font-medium">
                          Submit your assignment soon to avoid late penalties
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          The deadline is closing in. Make sure to review your
                          work before submitting.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Normal deadline (more than 24 hours) */}
                {!dueDateInfo?.isOverdue &&
                  !dueDateInfo?.isCloseToDeadline &&
                  dueDateInfo && (
                    <div className="bg-linear-to-r from-green-500/5 to-emerald-500/5 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            You have plenty of time
                          </p>
                          <p className="text-xs text-green-700">
                            {dueDateInfo.timeRemaining} remaining until deadline
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Text Submission */}
              {(assignment.submissionType === "text" ||
                assignment.submissionType === "both") && (
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                      Text Submission
                    </h2>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Your Submission{" "}
                      {assignment.submissionType === "text" && "*"}
                    </label>
                    <textarea
                      value={submissionText}
                      onChange={(e) => {
                        setSubmissionText(e.target.value);
                        setCharacterCount(e.target.value.length);
                      }}
                      placeholder="Type your assignment submission here..."
                      rows={12}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                      required={assignment.submissionType === "text"}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-muted-foreground">
                        Character count: {characterCount}
                      </p>
                      {assignment.submissionType === "text" && (
                        <p className="text-xs text-muted-foreground">
                          Required
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* File Submission */}
              {(assignment.submissionType === "file" ||
                assignment.submissionType === "both") && (
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                      File Submission
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {/* File Upload Area */}
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <input
                        type="file"
                        id="file-upload"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept={assignment.allowedFormats?.join(",")}
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer block"
                      >
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm font-medium text-foreground mb-1">
                          Click to upload files
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.allowedFormats
                            ? `Allowed formats: ${assignment.allowedFormats.join(
                                ", "
                              )}`
                            : "All file types accepted"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Maximum file size:{" "}
                          {assignment.maxFileSize
                            ? formatFileSize(assignment.maxFileSize)
                            : "10MB"}
                        </p>
                      </label>
                    </div>

                    {/* Uploaded Files List */}
                    {uploadedFiles.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground">
                          Uploaded Files ({uploadedFiles.length})
                        </h4>
                        {uploadedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center gap-3 p-3 border border-border rounded-lg"
                          >
                            <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {file.file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.file.size)}
                              </p>
                              {file.status === "uploading" && (
                                <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                                  <div
                                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${file.progress}%` }}
                                  ></div>
                                </div>
                              )}
                              {file.status === "error" && file.error && (
                                <p className="text-xs text-red-600 mt-1">
                                  {file.error}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {file.status === "completed" && (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              )}
                              {file.status === "uploading" && (
                                <Loader className="h-4 w-4 text-primary animate-spin" />
                              )}
                              {file.status === "error" && (
                                <XCircle className="h-4 w-4 text-red-600" />
                              )}
                              <button
                                type="button"
                                onClick={() => removeFile(file.id)}
                                className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {assignment.submissionType === "file" && (
                      <p className="text-xs text-muted-foreground">
                        * At least one file is required for submission
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {submitting ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                  {submitting ? "Submitting..." : "Submit Assignment"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/assignments")}
                  className="px-6 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* Submission Guidelines */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-base font-semibold text-foreground mb-4">
                Submission Guidelines
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    Ensure all required fields are completed
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    Verify file formats and sizes before uploading
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    Review your submission before finalizing
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">
                    Submissions cannot be edited after submission
                  </span>
                </div>
              </div>
            </div>

            {/* Technical Requirements */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-base font-semibold text-foreground mb-4">
                Technical Requirements
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max file size:</span>
                  <span className="font-medium text-foreground">
                    {assignment.maxFileSize
                      ? formatFileSize(assignment.maxFileSize)
                      : "10MB"}
                  </span>
                </div>
                {assignment.allowedFormats &&
                  assignment.allowedFormats.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Allowed formats:
                      </span>
                      <span className="font-medium text-foreground text-right">
                        {assignment.allowedFormats.join(", ")}
                      </span>
                    </div>
                  )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Submission type:
                  </span>
                  <span className="font-medium text-foreground capitalize">
                    {assignment.submissionType}
                  </span>
                </div>
              </div>
            </div>

            {/* Support Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h3 className="text-base font-semibold text-blue-900 mb-2">
                Need Help?
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                If you encounter any issues with submission, contact your
                instructor or technical support.
              </p>
              <button className="text-xs text-blue-700 hover:text-blue-800 underline transition-colors">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Add custom CSS for slower pulse animation */}
      <style jsx>{`
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
