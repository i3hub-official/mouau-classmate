"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AssignmentService,
  type AssignmentWithRelations,
  type Submission,
} from "@/lib/services/students/assignmentService";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Upload,
  Clock,
  AlertCircle,
  CheckCircle,
  Users,
} from "lucide-react";

export default function AssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<AssignmentWithRelations | null>(
    null
  );
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    loadAssignmentData();
  }, [assignmentId]);

  const loadAssignmentData = async () => {
    try {
      const assignmentData = await AssignmentService.getAssignmentById(
        assignmentId
      );

      if (assignmentData) {
        setAssignment(assignmentData);
        // Sort submissions by attempt number (latest first)
        const sortedSubmissions = [...assignmentData.submissions].sort(
          (a, b) => b.attemptNumber - a.attemptNumber
        );
        setSubmissions(sortedSubmissions);
      }
    } catch (error) {
      console.error("Failed to load assignment:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeRemaining = (dueDate: Date) => {
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();

    if (diff <= 0) return { text: "Overdue", color: "text-red-600" };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0)
      return { text: `${days} days ${hours} hrs`, color: "text-green-600" };
    if (hours > 0) return { text: `${hours} hours`, color: "text-amber-600" };

    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { text: `${minutes} minutes`, color: "text-red-600" };
  };

  const getSubmissionStatus = () => {
    const latestSubmission = submissions[0];
    if (!latestSubmission || !latestSubmission.submittedAt)
      return {
        status: "not_submitted",
        text: "Not Submitted",
        color: "text-gray-600",
      };
    if (latestSubmission.isGraded)
      return { status: "graded", text: "Graded", color: "text-green-600" };
    return { status: "submitted", text: "Submitted", color: "text-blue-600" };
  };

  const canSubmit = () => {
    if (!assignment) return false;
    // Get allowed attempts from assignment (you might need to add this field to your interface)
    const allowedAttempts = (assignment as any).allowedAttempts || 1;
    if (allowedAttempts === 0) return true; // Unlimited attempts
    return submissions.length < allowedAttempts;
  };

  const isLateSubmission = (submission: Submission) => {
    if (!submission.submittedAt || !assignment) return false;
    return submission.submittedAt > assignment.dueDate;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-foreground">
          Assignment Not Found
        </h1>
        <p className="text-muted-foreground mt-2">
          The assignment you're looking for doesn't exist.
        </p>
        <Link
          href="/assignments"
          className="mt-4 inline-block text-primary hover:underline"
        >
          Back to Assignments
        </Link>
      </div>
    );
  }

  const timeRemaining = getTimeRemaining(assignment.dueDate);
  const submissionStatus = getSubmissionStatus();
  const latestSubmission = submissions[0];
  const allowedAttempts = (assignment as any).allowedAttempts || 1;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/assignments"
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              {assignment.course.code}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${timeRemaining.color}`}
            >
              {timeRemaining.text}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {assignment.title}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assignment Details */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Assignment Details
            </h2>
            <div className="prose prose-gray max-w-none">
              {assignment.description && (
                <div className="mb-6">
                  <h3 className="font-semibold text-foreground mb-2">
                    Description
                  </h3>
                  <p className="text-foreground whitespace-pre-wrap">
                    {assignment.description}
                  </p>
                </div>
              )}

              {assignment.instructions && (
                <div className="mb-6">
                  <h3 className="font-semibold text-foreground mb-2">
                    Instructions
                  </h3>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-foreground whitespace-pre-wrap">
                      {assignment.instructions}
                    </p>
                  </div>
                </div>
              )}

              {(assignment as any).assignmentUrl && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Resources
                  </h3>
                  <a
                    href={(assignment as any).assignmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <FileText size={16} />
                    View Assignment Resources
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Latest Submission */}
          {latestSubmission && latestSubmission.submittedAt && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Latest Submission
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {submissionStatus.status === "graded" ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-blue-600" />
                    )}
                    <div>
                      <span className="font-medium text-foreground">
                        Attempt #{latestSubmission.attemptNumber}
                      </span>
                      <div className="text-sm text-muted-foreground">
                        Submitted {formatDate(latestSubmission.submittedAt)}
                        {isLateSubmission(latestSubmission) && (
                          <span className="text-amber-600 ml-2">• Late</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      submissionStatus.status === "graded"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {submissionStatus.text}
                  </div>
                </div>

                {latestSubmission.content && (
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-semibold text-foreground mb-2">
                      Your Submission
                    </h4>
                    <p className="text-foreground whitespace-pre-wrap">
                      {latestSubmission.content}
                    </p>
                  </div>
                )}

                {latestSubmission.fileUrl && (
                  <a
                    href={latestSubmission.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <FileText size={16} />
                    View Submitted File
                  </a>
                )}

                {latestSubmission.isGraded && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="text-xl font-bold text-foreground">
                        Score: {latestSubmission.score}/{assignment.maxScore}
                      </div>
                      <div
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          (latestSubmission.score || 0) >=
                          assignment.maxScore * 0.7
                            ? "bg-green-100 text-green-800"
                            : (latestSubmission.score || 0) >=
                              assignment.maxScore * 0.5
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {(
                          ((latestSubmission.score || 0) /
                            assignment.maxScore) *
                          100
                        ).toFixed(1)}
                        %
                      </div>
                    </div>
                    {latestSubmission.feedback && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">
                          Teacher Feedback
                        </h4>
                        <p className="text-blue-800 whitespace-pre-wrap">
                          {latestSubmission.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Key Information */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">
              Key Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Due Date</div>
                  <div className="font-medium text-foreground">
                    {formatDate(assignment.dueDate)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Max Score</div>
                  <div className="font-medium text-foreground">
                    {assignment.maxScore} points
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Upload className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Attempts</div>
                  <div className="font-medium text-foreground">
                    {submissions.length} /{" "}
                    {allowedAttempts === 0 ? "∞" : allowedAttempts}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Actions</h3>
            <div className="space-y-3">
              {canSubmit() ? (
                <Link
                  href={`/assignments/${assignmentId}/submit`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Upload size={16} />
                  {submissions.length === 0
                    ? "Submit Assignment"
                    : "New Attempt"}
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-muted text-muted-foreground rounded-lg cursor-not-allowed"
                >
                  <AlertCircle size={16} />
                  Maximum Attempts Reached
                </button>
              )}

              <Link
                href={`/assignments/${assignmentId}/submissions`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                <FileText size={16} />
                View All Submissions
              </Link>
            </div>
          </div>

          {/* Submission Status */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">
              Submission Status
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-medium ${submissionStatus.color}`}>
                  {submissionStatus.text}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Attempts Used</span>
                <span className="font-medium text-foreground">
                  {submissions.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time Remaining</span>
                <span className={`font-medium ${timeRemaining.color}`}>
                  {timeRemaining.text}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
