// app/p/s/assignments/components/AssignmentCard.tsx
"use client";

import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Download,
  Eye,
  Plus,
  User,
} from "lucide-react";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";

interface AssignmentWithDetails {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  dueDate: Date;
  maxScore: number;
  allowedAttempts: number;
  assignmentUrl?: string | null;
  isPublished: boolean;
  allowLateSubmission: boolean;
  createdAt: Date;
  updatedAt: Date;
  course: {
    id: string;
    code: string;
    title: string;
  };
  submissions: Array<{
    id: string;
    submittedAt: Date;
    score?: number | null;
    feedback?: string | null;
    isGraded: boolean;
    isLate: boolean;
    attemptNumber: number;
  }>;
  _count: {
    submissions: number;
  };
}

interface AssignmentCardProps {
  assignment: AssignmentWithDetails;
  studentId: string;
}

export default function AssignmentCard({
  assignment,
  studentId,
}: AssignmentCardProps) {
  const isOverdue =
    isPast(new Date(assignment.dueDate)) && assignment._count.submissions === 0;
  const hasSubmitted = assignment._count.submissions > 0;
  const latestSubmission = assignment.submissions[0];
  const isGraded = latestSubmission?.isGraded;

  const getStatusColor = () => {
    if (isOverdue) return "text-red-500";
    if (isGraded) return "text-green-500";
    if (hasSubmitted) return "text-blue-500";
    return "text-yellow-500";
  };

  const getStatusText = () => {
    if (isOverdue) return "Overdue";
    if (isGraded) return "Graded";
    if (hasSubmitted) return "Submitted";
    return "Pending";
  };

  const getStatusIcon = () => {
    if (isOverdue) return <AlertTriangle className="h-4 w-4" />;
    if (isGraded) return <CheckCircle className="h-4 w-4" />;
    if (hasSubmitted) return <Eye className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const handleViewSubmission = () => {
    window.location.href = `/p/s/assignments/${assignment.id}/submission`;
  };

  const handleSubmitAssignment = () => {
    window.location.href = `/p/s/assignments/${assignment.id}/submit`;
  };

  const handleClearFilters = () => {
    window.location.href = "/p/s/assignments";
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", page.toString());
    window.location.href = `/p/s/assignments?${params.toString()}`;
  };

  return (
    <div className="rounded-lg border p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-semibold">
              {assignment.course.code}
            </span>
            <h3 className="text-lg font-semibold">{assignment.title}</h3>
          </div>

          <p className="text-muted-foreground mb-4 line-clamp-2">
            {assignment.description}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className={cn("font-medium", isOverdue && "text-red-500")}>
                  {format(assignment.dueDate, "PPP p")}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Max Score</p>
                <p className="font-medium">{assignment.maxScore}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Attempts</p>
              <p className="font-medium">
                {assignment._count.submissions}/{assignment.allowedAttempts}
              </p>
            </div>
          </div>

          {latestSubmission && (
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Last Score</p>
                <p className="font-medium">
                  {latestSubmission.score ?? "Not graded"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end space-y-2">
          <div className={cn("flex items-center space-x-2", getStatusColor())}>
            {getStatusIcon()}
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>

          <div className="flex space-x-2">
            {assignment.assignmentUrl && (
              <a
                href={assignment.assignmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2"
              >
                <Download className="h-4 w-4 mr-2" />
                Resources
              </a>
            )}

            {hasSubmitted ? (
              <button
                onClick={handleViewSubmission}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2"
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </button>
            ) : (
              <button
                onClick={handleSubmitAssignment}
                disabled={isOverdue && !assignment.allowLateSubmission}
                className={cn(
                  "inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 py-2",
                  isOverdue && !assignment.allowLateSubmission
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                <Plus className="h-4 w-4 mr-2" />
                {hasSubmitted ? "Resubmit" : "Submit"}
              </button>
            )}
          </div>
        </div>
      </div>

      {latestSubmission?.feedback && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-semibold mb-2">Instructor Feedback</h4>
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm">{latestSubmission.feedback}</p>
          </div>
        </div>
      )}
    </div>
  );
}
