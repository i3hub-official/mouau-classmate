// app/assignments/page.tsx
"use client";
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import {
  Search,
  Filter,
  Plus,
  Calendar,
  Clock,
  FileText,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  Download,
  Eye,
  RefreshCw,
} from "lucide-react";
import {
  AssignmentService,
  AssignmentWithRelations,
} from "@/lib/services/assignmentService";

interface UserData {
  id: string;
  name?: string;
  email?: string;
  role: string;
  matricNumber?: string;
  department?: string;
  college?: string;
  course?: string;
}

interface AssignmentStats {
  total: number;
  pending: number;
  submitted: number;
  overdue: number;
  graded: number;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentWithRelations[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<
    AssignmentWithRelations[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AssignmentStats>({
    total: 0,
    pending: 0,
    submitted: 0,
    overdue: 0,
    graded: 0,
  });
  const [courses, setCourses] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Initialize data on component mount
  useEffect(() => {
    initializeData();
  }, []);

  // Update filtered assignments and stats when dependencies change
  useEffect(() => {
    filterAssignments();
    updateStats();
    extractCourses();
  }, [assignments, searchTerm, statusFilter, courseFilter]);

  const initializeData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user data first
      const user = await fetchUserData();

      if (!user?.id) {
        setError(
          "Unable to load user information. Please try refreshing the page."
        );
        setLoading(false);
        return;
      }

      // Then fetch assignments
      await fetchAssignments(user.id);
    } catch (err) {
      console.error("Error initializing data:", err);
      setError(
        "Failed to load data. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (): Promise<UserData | null> => {
    try {
      const response = await fetch("/api/user/me", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Check content type first
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text.substring(0, 200));
        throw new Error(
          "Server returned unexpected response. Please check if you are logged in."
        );
      }

      const data = await response.json();

      if (response.ok) {
        setUserData(data);
        return data;
      } else {
        // Handle API errors
        console.error("API error response:", data);
        throw new Error(
          data.error || data.message || "Failed to fetch user data"
        );
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load user information. Please check if you're logged in."
      );
      return null;
    }
  };

  const fetchAssignments = async (userId: string) => {
    try {
      if (!userId) {
        throw new Error("User ID is required to fetch assignments");
      }

      console.log("Fetching assignments for user:", userId);

      const assignmentsData = await AssignmentService.getAssignmentsByUserId(
        userId
      );

      console.log("Assignments fetched successfully:", assignmentsData.length);
      setAssignments(assignmentsData);
      setError(null);
    } catch (error) {
      console.error("Error fetching assignments:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch assignments. Please try again later.";

      setError(errorMessage);
      setAssignments([]);
    }
  };

  const handleRefresh = async () => {
    if (!userData?.id) return;

    setRefreshing(true);
    try {
      await fetchAssignments(userData.id);
    } finally {
      setRefreshing(false);
    }
  };

  const extractCourses = () => {
    const uniqueCourses = Array.from(
      new Set(
        assignments.map(
          (assignment) =>
            `${assignment.course.code} - ${assignment.course.title}`
        )
      )
    );
    setCourses(uniqueCourses);
  };

  const filterAssignments = () => {
    let filtered = assignments;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (assignment) =>
          assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          assignment.course.title
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          assignment.course.code
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          assignment.description
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          assignment.teacher?.firstName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          assignment.teacher?.lastName
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((assignment) => {
        const status = getAssignmentStatus(assignment);
        return status === statusFilter;
      });
    }

    // Apply course filter
    if (courseFilter !== "all") {
      filtered = filtered.filter(
        (assignment) =>
          `${assignment.course.code} - ${assignment.course.title}` ===
          courseFilter
      );
    }

    setFilteredAssignments(filtered);
  };

  const updateStats = () => {
    const total = assignments.length;
    const pending = assignments.filter(
      (a) => getAssignmentStatus(a) === "pending"
    ).length;
    const submitted = assignments.filter(
      (a) => getAssignmentStatus(a) === "submitted"
    ).length;
    const overdue = assignments.filter(
      (a) => getAssignmentStatus(a) === "overdue"
    ).length;
    const graded = assignments.filter(
      (a) => getAssignmentStatus(a) === "graded"
    ).length;

    setStats({ total, pending, submitted, overdue, graded });
  };

  const getAssignmentStatus = (assignment: AssignmentWithRelations): string => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);

    const hasSubmission = assignment.submissions.length > 0;
    const isGraded = assignment.submissions.some((sub) => sub.isGraded);
    const isOverdue = dueDate < now && !hasSubmission;

    if (isGraded) return "graded";
    if (hasSubmission) return "submitted";
    if (isOverdue) return "overdue";
    return "pending";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "submitted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200";
      case "graded":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "submitted":
        return <CheckCircle2 className="h-4 w-4" />;
      case "overdue":
        return <AlertCircle className="h-4 w-4" />;
      case "graded":
        return <FileText className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDaysLeft = (dueDate: Date) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getSubmissionInfo = (assignment: AssignmentWithRelations) => {
    const latestSubmission = assignment.submissions[0];
    const isSubmitted = !!latestSubmission?.submittedAt;
    const isGraded = !!latestSubmission?.isGraded;
    const score = latestSubmission?.score;
    const feedback = latestSubmission?.feedback;

    return { latestSubmission, isSubmitted, isGraded, score, feedback };
  };

  const handleSubmitAssignment = (assignmentId: string) => {
    if (signingOut) return;
    window.location.href = `/assignments/submit?assignmentId=${assignmentId}`;
  };

  const handleViewAssignment = (assignmentId: string) => {
    if (signingOut) return;
    window.location.href = `/assignments/${assignmentId}`;
  };

  const handleNewSubmission = () => {
    if (signingOut) return;
    window.location.href = "/assignments/submit";
  };

  const handleViewSubmissions = (assignmentId: string) => {
    if (signingOut) return;
    window.location.href = `/assignments/${assignmentId}/submissions`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardHeader />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">
              Loading assignments...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      {/* Sign Out Overlay */}
      {signingOut && (
        <div className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center">
          <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <span className="text-foreground font-medium">
                Signing out...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        className={`w-full px-6 xl:px-8 py-8 ${
          signingOut ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Assignments
            </h1>
            <p className="text-lg text-muted-foreground">
              Manage and track your academic assignments
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 lg:mt-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing || signingOut}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={handleNewSubmission}
              disabled={signingOut}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-5 w-5" />
              New Submission
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.total}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.pending}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.submitted}
                </p>
                <p className="text-sm text-muted-foreground">Submitted</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.graded}
                </p>
                <p className="text-sm text-muted-foreground">Graded</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.overdue}
                </p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Search assignments, courses, instructors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={signingOut}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={signingOut}
              className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 min-w-[140px]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="graded">Graded</option>
              <option value="overdue">Overdue</option>
            </select>

            {/* Course Filter */}
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              disabled={signingOut || courses.length === 0}
              className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 min-w-[200px]"
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            {(searchTerm ||
              statusFilter !== "all" ||
              courseFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setCourseFilter("all");
                }}
                disabled={signingOut}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Assignments List */}
        <div className="space-y-4">
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {assignments.length === 0
                  ? "No assignments found"
                  : "No matching assignments"}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {assignments.length === 0
                  ? "You don't have any assignments in your enrolled courses yet. Check back later for new assignments."
                  : "Try adjusting your search or filters to find what you're looking for."}
              </p>
              {assignments.length === 0 && (
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  Check for New Assignments
                </button>
              )}
            </div>
          ) : (
            filteredAssignments.map((assignment) => {
              const status = getAssignmentStatus(assignment);
              const dueDate = new Date(assignment.dueDate);
              const isOverdue = status === "overdue";
              const daysLeft = getDaysLeft(assignment.dueDate);
              const { latestSubmission, isSubmitted, isGraded, score } =
                getSubmissionInfo(assignment);

              return (
                <div
                  key={assignment.id}
                  className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-foreground mb-2">
                            {assignment.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <BookOpen className="h-4 w-4" />
                              <span>
                                {assignment.course.code} -{" "}
                                {assignment.course.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>Max Score: {assignment.maxScore}</span>
                            </div>
                            {assignment.teacher && (
                              <div className="flex items-center gap-1">
                                <span>
                                  By: Dr. {assignment.teacher.firstName}{" "}
                                  {assignment.teacher.lastName}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(
                              status
                            )}`}
                          >
                            {getStatusIcon(status)}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </div>
                      </div>

                      {/* Description and Instructions */}
                      {assignment.description && (
                        <p className="text-muted-foreground mb-3 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}

                      {assignment.instructions && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-foreground mb-1">
                            Instructions:
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {assignment.instructions}
                          </p>
                        </div>
                      )}

                      {/* Submission Info */}
                      {isSubmitted && latestSubmission && (
                        <div className="mb-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium text-foreground">
                            Submitted on{" "}
                            {formatDate(latestSubmission.submittedAt)} at{" "}
                            {formatTime(latestSubmission.submittedAt)}
                            {latestSubmission.attemptNumber > 1 &&
                              ` (Attempt ${latestSubmission.attemptNumber})`}
                          </p>
                          {isGraded && score !== null && (
                            <p className="text-sm text-green-600 font-medium mt-1">
                              Grade: {score}/{assignment.maxScore} (
                              {Math.round(
                                ((score ?? 0) / assignment.maxScore) * 100
                              )}
                              %)
                            </p>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Due: {formatDate(assignment.dueDate)} at{" "}
                              {formatTime(assignment.dueDate)}
                            </span>
                          </div>
                          {isOverdue ? (
                            <span className="text-red-600 font-medium flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              Overdue
                            </span>
                          ) : status === "pending" ? (
                            <span
                              className={
                                daysLeft <= 3
                                  ? "text-orange-600 font-medium"
                                  : "text-green-600 font-medium"
                              }
                            >
                              {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewAssignment(assignment.id)}
                            disabled={signingOut}
                            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </button>

                          {status === "pending" && (
                            <button
                              onClick={() =>
                                handleSubmitAssignment(assignment.id)
                              }
                              disabled={signingOut}
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                              <Download className="h-4 w-4" />
                              Submit Work
                            </button>
                          )}

                          {status === "submitted" && !isGraded && (
                            <button
                              onClick={() =>
                                handleViewAssignment(assignment.id)
                              }
                              disabled={signingOut}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                              <Clock className="h-4 w-4" />
                              Awaiting Grade
                            </button>
                          )}

                          {isGraded && (
                            <button
                              onClick={() =>
                                handleViewAssignment(assignment.id)
                              }
                              disabled={signingOut}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              View Grade
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Info */}
        {filteredAssignments.length > 0 && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Showing {filteredAssignments.length} of {assignments.length}{" "}
              assignments
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
