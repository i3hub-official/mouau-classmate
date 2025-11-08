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
  Download,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

export default function AssignmentSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<AssignmentWithRelations | null>(
    null
  );
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    loadAssignmentAndSubmissions();
  }, [assignmentId]);

  const loadAssignmentAndSubmissions = async () => {
    try {
      // Get assignment details which includes submissions
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
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (submission: Submission) => {
    if (submission.isGraded) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (submission.submittedAt) {
      return <Clock className="h-5 w-5 text-blue-600" />;
    }
    return <AlertCircle className="h-5 w-5 text-gray-400" />;
  };

  const getStatusText = (submission: Submission) => {
    if (submission.isGraded) {
      return "Graded";
    } else if (submission.submittedAt) {
      return "Submitted";
    }
    return "Not Submitted";
  };

  const isLateSubmission = (
    submission: Submission,
    assignment: AssignmentWithRelations
  ) => {
    if (!submission.submittedAt) return false;
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

  // Get allowed attempts from assignment (you might need to add this field to your interface)
  const allowedAttempts = (assignment as any).allowedAttempts || 1;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/assignments/${assignmentId}`}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            My Submissions
          </h1>
          <p className="text-muted-foreground mt-1">
            {assignment.title} • {assignment.course.code}
          </p>
        </div>
      </div>

      {/* Assignment Info */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              {assignment.title}
            </h2>
            <p className="text-muted-foreground">{assignment.description}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>Due: {formatDate(assignment.dueDate)}</span>
              </div>
              <div>
                <span>Max Score: {assignment.maxScore}</span>
              </div>
              <div>
                <span>
                  Allowed Attempts:{" "}
                  {allowedAttempts === 0 ? "Unlimited" : allowedAttempts}
                </span>
              </div>
            </div>
          </div>
          {(assignment as any).assignmentUrl && (
            <a
              href={(assignment as any).assignmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Download size={16} />
              Resources
            </a>
          )}
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Submission History ({submissions.length})
          </h3>
          {allowedAttempts === 0 || submissions.length < allowedAttempts ? (
            <Link
              href={`/assignments/${assignmentId}/submit`}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              New Submission
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">
              Maximum attempts reached
            </span>
          )}
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Submissions Yet
            </h3>
            <p className="text-muted-foreground mb-4">
              Submit your work to get started.
            </p>
            <Link
              href={`/assignments/${assignmentId}/submit`}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Make First Submission
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission, index) => (
              <div
                key={submission.id}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(submission)}
                      <div>
                        <h4 className="font-semibold text-foreground">
                          Attempt #{submission.attemptNumber}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>
                            Submitted:{" "}
                            {submission.submittedAt
                              ? formatDate(submission.submittedAt)
                              : "Not submitted"}
                          </span>
                          {submission.submittedAt &&
                            isLateSubmission(submission, assignment) && (
                              <span className="text-amber-600">
                                Late Submission
                              </span>
                            )}
                        </div>
                      </div>
                    </div>

                    {submission.content && (
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-foreground whitespace-pre-wrap">
                          {submission.content}
                        </p>
                      </div>
                    )}

                    {submission.fileUrl && (
                      <a
                        href={submission.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                      >
                        <FileText size={16} />
                        View Submitted File
                      </a>
                    )}

                    {submission.isGraded && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <div className="text-lg font-bold text-foreground">
                            Score: {submission.score}/{assignment.maxScore}
                          </div>
                          <div
                            className={`px-2 py-1 rounded text-sm font-medium ${
                              (submission.score || 0) >=
                              assignment.maxScore * 0.7
                                ? "bg-green-100 text-green-800"
                                : (submission.score || 0) >=
                                  assignment.maxScore * 0.5
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {(
                              ((submission.score || 0) / assignment.maxScore) *
                              100
                            ).toFixed(1)}
                            %
                          </div>
                        </div>
                        {submission.feedback && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h5 className="font-semibold text-blue-900 mb-2">
                              Teacher Feedback
                            </h5>
                            <p className="text-blue-800 whitespace-pre-wrap">
                              {submission.feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        submission.isGraded
                          ? "bg-green-100 text-green-800"
                          : submission.submittedAt
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {getStatusText(submission)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
