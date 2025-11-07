// app/grades/page.tsx
"use client";
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import {
  TrendingUp,
  Award,
  BookOpen,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar,
  Info,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  GradeService,
  GradeSummary,
  PerformanceMetric,
  CourseGrade,
  SortBy,
  SortOrder,
} from "@/lib/services/gradeService";
import { UserService } from "@/lib/services/userService";
import { Grade } from "@prisma/client";

interface UserData {
  id: string;
  name?: string | null;
  matricNumber?: string;
  department?: string;
  email?: string;
}

export default function GradesPage() {
  const [gradeSummary, setGradeSummary] = useState<GradeSummary | null>(null);
  const [displayedCourseGrades, setDisplayedCourseGrades] = useState<
    CourseGrade[]
  >([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<
    PerformanceMetric[]
  >([]);
  const [recentGraded, setRecentGraded] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"overview" | "detailed">("overview");
  const [showExportModal, setShowExportModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("grade");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    if (gradeSummary) {
      applySorting();
    }
  }, [sortBy, sortOrder, gradeSummary]);

  const initializeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await UserService.getCurrentUser();
      if (!user?.id) {
        setError(
          "Unable to load user information. Please try refreshing the page."
        );
        setLoading(false);
        return;
      }

      setUserData(user);
      await fetchGradesData(user.id);
    } catch (err) {
      console.error("Error initializing data:", err);
      setError(
        "Failed to load data. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchGradesData = async (userId: string) => {
    if (!userId) return;

    try {
      const [summary, metrics, recent] = await Promise.all([
        GradeService.getGradeSummary(userId),
        GradeService.getPerformanceMetrics(userId),
        GradeService.getRecentGradedAssignments(userId, 5),
      ]);

      setGradeSummary(summary);
      setPerformanceMetrics(metrics);
      setRecentGraded(recent);
      setError(null);
    } catch (error) {
      console.error("Error fetching grades data:", error);
      setError("Failed to load grades. Please try again.");
    }
  };

  const handleRefresh = async () => {
    if (!userData?.id) return;

    setRefreshing(true);
    try {
      await fetchGradesData(userData.id);
    } finally {
      setRefreshing(false);
    }
  };

  const applySorting = () => {
    if (!gradeSummary) return;

    const sorted = GradeService.sortCourseGrades(
      gradeSummary.courseGrades,
      sortBy,
      sortOrder
    );
    setDisplayedCourseGrades(sorted);
  };

  const handleSortChange = (newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      // Toggle order if same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new field with default desc order
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
    setShowSortMenu(false);
  };

  const getSortLabel = () => {
    const labels: Record<SortBy, string> = {
      grade: "Grade",
      course: "Course Name",
      percentage: "Percentage",
      progress: "Progress",
    };
    return labels[sortBy];
  };

  const getGradeColor = (grade: Grade | null) => {
    return GradeService.getGradeColor(grade);
  };

  const getGradeIcon = (grade: Grade | null) => {
    if (!grade) return <Clock className="h-4 w-4" />;

    switch (grade) {
      case Grade.A:
      case Grade.B:
        return <Award className="h-4 w-4" />;
      case Grade.C:
        return <CheckCircle2 className="h-4 w-4" />;
      case Grade.D:
      case Grade.E:
      case Grade.F:
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4" />;
      case "down":
        return <TrendingUp className="h-4 w-4 rotate-180" />;
      default:
        return <TrendingUp className="h-4 w-4 rotate-90" />;
    }
  };

  const formatDate = (date: Date) => {
    return GradeService.formatDate(date, "short");
  };

  const toggleCourseExpansion = (courseId: string) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  const handleExport = async (format: "pdf" | "excel") => {
    try {
      const blob = await GradeService.exportTranscript(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transcript-${userData?.matricNumber}.${
        format === "pdf" ? "pdf" : "xlsx"
      }`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowExportModal(false);
    } catch (error) {
      console.error("Error exporting transcript:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to export transcript. Please try again.";
      setError(errorMessage);

      // If it's an auth error, suggest signing in again
      if (errorMessage.includes("Authentication required")) {
        setError("Session expired. Please refresh the page and try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading grades...</p>
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl p-6 shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Export Transcript
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Choose the format for your transcript export. The file will be
              downloaded to your device.
            </p>
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleExport("pdf")}
                className="w-full p-3 border border-border rounded-lg hover:bg-muted transition-colors flex items-center justify-between"
              >
                <span className="text-foreground">PDF Document</span>
                <Download className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => handleExport("excel")}
                className="w-full p-3 border border-border rounded-lg hover:bg-muted transition-colors flex items-center justify-between"
              >
                <span className="text-foreground">Excel Spreadsheet</span>
                <Download className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
              Grades & Performance
            </h1>
            <p className="text-lg text-muted-foreground">
              Track your academic performance and progress
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4 lg:mt-0">
            <button
              onClick={handleRefresh}
              disabled={refreshing || signingOut}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              disabled={signingOut}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="h-5 w-5" />
              Export Transcript
            </button>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {performanceMetrics.map((metric, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${GradeService.getTrendColor(
                    metric.trend
                  )}`}
                >
                  {getTrendIcon(metric.trend)}
                  <span>{metric.change}%</span>
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {metric.value}
                </p>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Course Grades */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-foreground">
                Course Grades
              </h3>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  disabled={signingOut}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Filter className="h-4 w-4" />
                  <span>Sort by: {getSortLabel()}</span>
                  {sortOrder === "asc" ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </button>

                {showSortMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowSortMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-2 z-20">
                      <button
                        onClick={() => handleSortChange("grade")}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors ${
                          sortBy === "grade"
                            ? "text-primary font-medium"
                            : "text-foreground"
                        }`}
                      >
                        Grade
                      </button>
                      <button
                        onClick={() => handleSortChange("course")}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors ${
                          sortBy === "course"
                            ? "text-primary font-medium"
                            : "text-foreground"
                        }`}
                      >
                        Course Name
                      </button>
                      <button
                        onClick={() => handleSortChange("percentage")}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors ${
                          sortBy === "percentage"
                            ? "text-primary font-medium"
                            : "text-foreground"
                        }`}
                      >
                        Percentage
                      </button>
                      <button
                        onClick={() => handleSortChange("progress")}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors ${
                          sortBy === "progress"
                            ? "text-primary font-medium"
                            : "text-foreground"
                        }`}
                      >
                        Progress
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {displayedCourseGrades.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-foreground mb-2">
                  No grades available
                </h4>
                <p className="text-muted-foreground">
                  Your grades will appear here once assignments are graded.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedCourseGrades.map((courseGrade) => {
                  const isExpanded = expandedCourse === courseGrade.course.id;
                  return (
                    <div
                      key={courseGrade.course.id}
                      className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300"
                    >
                      <div
                        className="p-6 cursor-pointer"
                        onClick={() =>
                          toggleCourseExpansion(courseGrade.course.id)
                        }
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-xl font-semibold text-foreground">
                                {courseGrade.course.title}
                              </h4>
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-muted-foreground">
                              {courseGrade.course.code} •{" "}
                              {courseGrade.course.credits} Credits
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-1 ${getGradeColor(
                                courseGrade.overallGrade
                              )}`}
                            >
                              {getGradeIcon(courseGrade.overallGrade)}
                              {courseGrade.overallGrade || "N/A"}
                            </span>
                            <p className="text-sm text-muted-foreground mt-1">
                              {Math.round(courseGrade.overallPercentage)}%
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex justify-between text-sm text-muted-foreground mb-2">
                            <span>Course Progress</span>
                            <span>
                              {Math.round(courseGrade.enrollment.progress)}%
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${courseGrade.enrollment.progress}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-border">
                          <div className="pt-4">
                            <h5 className="font-medium text-foreground mb-3">
                              Assignment Grades
                            </h5>
                            <div className="space-y-3">
                              {courseGrade.assignments.map((assignment) => (
                                <div
                                  key={assignment.assignment.id}
                                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                      <FileText className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-foreground text-sm">
                                        {assignment.assignment.title}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Max Score:{" "}
                                        {assignment.assignment.maxScore}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {assignment.submission?.isGraded ? (
                                      <>
                                        <p className="font-semibold text-foreground">
                                          {assignment.submission.score} /{" "}
                                          {assignment.assignment.maxScore}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {Math.round(assignment.percentage)}%
                                        </p>
                                      </>
                                    ) : assignment.submission ? (
                                      <div className="flex items-center gap-1 text-yellow-600">
                                        <Clock className="h-3 w-3" />
                                        <p className="text-sm">Pending Grade</p>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-gray-500">
                                        <AlertCircle className="h-3 w-3" />
                                        <p className="text-sm">Not Submitted</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Overall Summary */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Overall Summary
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">GPA</span>
                  <span className="text-2xl font-bold text-foreground">
                    {gradeSummary?.gpa?.toFixed(2) || "0.00"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Average Grade</span>
                  <span className="text-xl font-semibold text-foreground">
                    {Math.round(gradeSummary?.averageGrade || 0)}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    Courses Completed
                  </span>
                  <span className="text-lg font-medium text-foreground">
                    {gradeSummary?.completedCourses || 0} /{" "}
                    {gradeSummary?.totalCourses || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Recently Graded */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-foreground">
                  Recently Graded
                </h3>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>

              {recentGraded.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recently graded assignments</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {recentGraded.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-foreground text-sm">
                          {item.title}
                        </h5>
                        <span
                          className={`px-2 py-1 rounded text-xs ${getGradeColor(
                            item.grade
                          )}`}
                        >
                          {item.grade}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {item.courseCode} • {formatDate(item.submittedAt)}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-foreground">
                          {item.score} / {item.maxScore}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(item.percentage)}%
                        </span>
                      </div>
                      {item.feedback && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <div className="flex items-start gap-1">
                            <Info className="h-3 w-3 text-muted-foreground mt-0.5" />
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.feedback}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grade Legend */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Grade Scale
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-green-600 font-medium">A</span>
                  <span className="text-muted-foreground">90% - 100%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-600 font-medium">B</span>
                  <span className="text-muted-foreground">80% - 89%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-600 font-medium">C</span>
                  <span className="text-muted-foreground">70% - 79%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-orange-600 font-medium">D</span>
                  <span className="text-muted-foreground">60% - 69%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-600 font-medium">E</span>
                  <span className="text-muted-foreground">50% - 59%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-600 font-medium">F</span>
                  <span className="text-muted-foreground">Below 50%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
