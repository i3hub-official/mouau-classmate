// app/teacher/grading/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { TeacherGradeService } from "@/lib/services/teachers/gradeService";
import {
  Search,
  Filter,
  BookMarked,
  BookOpen,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface UngradedSubmission {
  id: string;
  submittedAt: Date;
  attemptNumber: number;
  isLate: boolean;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    matricNumber: string;
    user: {
      email: string;
    };
  };
  assignment: {
    id: string;
    title: string;
    maxScore: number;
    dueDate: Date;
    course: {
      code: string;
      title: string;
    };
  };
}

export default function TeacherGradingPage() {
  const [submissions, setSubmissions] = useState<UngradedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    courseId: "",
    assignmentId: "",
  });

  useEffect(() => {
    loadUngradedSubmissions();
  }, []);

  const loadUngradedSubmissions = async () => {
    try {
      const teacherId = "temp-teacher-id";
      const response = await TeacherGradeService.getUngradedSubmissions(
        teacherId
      );
      setSubmissions(response.submissions);
    } catch (error) {
      console.error("Failed to load submissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const matchesSearch =
      submission.student.firstName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      submission.student.lastName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      submission.student.matricNumber
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      submission.assignment.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const courses = Array.from(
    new Set(submissions.map((s) => s.assignment.course.code))
  );
  const assignments = Array.from(
    new Set(submissions.map((s) => s.assignment.title))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Grading
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and grade student submissions
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookMarked size={16} />
            <span>{submissions.length} submissions pending grading</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by student name, matric number, or assignment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filters.courseId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, courseId: e.target.value }))
            }
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
          >
            <option value="">All Courses</option>
            {courses.map((course) => (
              <option key={course} value={course}>
                {course}
              </option>
            ))}
          </select>

          <select
            value={filters.assignmentId}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, assignmentId: e.target.value }))
            }
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
          >
            <option value="">All Assignments</option>
            {assignments.map((assignment) => (
              <option key={assignment} value={assignment}>
                {assignment}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {filteredSubmissions.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            onGraded={loadUngradedSubmissions}
          />
        ))}
      </div>

      {filteredSubmissions.length === 0 && (
        <div className="text-center py-12">
          {submissions.length === 0 ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                All caught up!
              </h3>
              <p className="text-muted-foreground">
                There are no submissions pending grading at the moment.
              </p>
            </>
          ) : (
            <>
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No submissions found
              </h3>
              <p className="text-muted-foreground">
                No submissions match your search criteria.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SubmissionCard({
  submission,
  onGraded,
}: {
  submission: UngradedSubmission;
  onGraded: () => void;
}) {
  const [grading, setGrading] = useState(false);
  const [showGradingForm, setShowGradingForm] = useState(false);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");

  const handleGrade = async () => {
    if (!score || isNaN(parseFloat(score))) return;

    setGrading(true);
    try {
      const teacherId = "temp-teacher-id";
      await TeacherGradeService.gradeSubmission(submission.id, teacherId, {
        score: parseFloat(score),
        feedback: feedback || undefined,
      });
      setShowGradingForm(false);
      onGraded();
    } catch (error) {
      console.error("Grading error:", error);
    } finally {
      setGrading(false);
    }
  };

  const daysAgo = Math.floor(
    (new Date().getTime() - new Date(submission.submittedAt).getTime()) /
      (1000 * 3600 * 24)
  );

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <User size={16} className="text-muted-foreground" />
              <span className="font-medium text-foreground">
                {submission.student.firstName} {submission.student.lastName}
              </span>
            </div>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {submission.student.matricNumber}
            </span>
            {submission.isLate && (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                Late
              </span>
            )}
            {submission.attemptNumber > 1 && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Attempt {submission.attemptNumber}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-foreground text-lg mb-2">
            {submission.assignment.title}
          </h3>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <BookOpen size={14} />
              <span>{submission.assignment.course.code}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>
                Submitted{" "}
                {daysAgo === 0
                  ? "today"
                  : `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>Max score: {submission.assignment.maxScore}</span>
            </div>
          </div>

          {showGradingForm ? (
            <div className="space-y-3 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Score (0-{submission.assignment.maxScore})
                  </label>
                  <input
                    type="number"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    min="0"
                    max={submission.assignment.maxScore}
                    step="0.5"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                    placeholder="Enter score"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Feedback (Optional)
                  </label>
                  <input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                    placeholder="Provide feedback to student..."
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGrade}
                  disabled={grading || !score}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {grading ? "Grading..." : "Submit Grade"}
                </button>
                <button
                  onClick={() => setShowGradingForm(false)}
                  className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowGradingForm(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Grade Submission
              </button>
              <Link
                href={`/teacher/assignments/${submission.assignment.id}/submissions`}
                className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
              >
                View All Submissions
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
