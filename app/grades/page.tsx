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
  Eye,
  BarChart3,
} from "lucide-react";
import {
  GradeService,
  GradeSummary,
  PerformanceMetric,
} from "@/lib/services/gradeService";
import { Grade } from "@prisma/client";

interface UserData {
  name?: string;
  matricNumber?: string;
  department?: string;
  email?: string;
}

export default function GradesPage() {
  const [gradeSummary, setGradeSummary] = useState<GradeSummary | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<
    PerformanceMetric[]
  >([]);
  const [recentGraded, setRecentGraded] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    fetchGradesData();
    fetchUserData();
  }, []);

  const fetchGradesData = async () => {
    try {
      setLoading(true);
      const studentId = await getCurrentStudentId();

      if (!studentId) {
        console.error("No student ID found");
        setLoading(false);
        return;
      }

      const [summary, metrics, recent] = await Promise.all([
        GradeService.getGradeSummary(studentId),
        GradeService.getPerformanceMetrics(studentId),
        GradeService.getRecentGradedAssignments(studentId),
      ]);

      setGradeSummary(summary);
      setPerformanceMetrics(metrics);
      setRecentGraded(recent);
    } catch (error) {
      console.error("Error fetching grades data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStudentId = async (): Promise<string | null> => {
    // TODO: Implement this based on your auth system
    return null;
  };

  const fetchUserData = async () => {
    try {
      // TODO: Replace with actual user data fetch
      setUserData({
        name: "Student",
        matricNumber: "MOUAU/XX/XX/XXX",
        department: "Computer Science",
        email: "student@mouau.edu.ng",
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const getGradeColor = (grade: Grade | null) => {
    if (!grade) return "bg-gray-100 text-gray-800";

    switch (grade) {
      case Grade.A:
        return "bg-green-100 text-green-800";
      case Grade.B:
        return "bg-blue-100 text-blue-800";
      case Grade.C:
        return "bg-yellow-100 text-yellow-800";
      case Grade.D:
        return "bg-orange-100 text-orange-800";
      case Grade.E:
        return "bg-red-100 text-red-800";
      case Grade.F:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getGradeIcon = (grade: Grade | null) => {
    if (!grade) return <Clock className="h-4 w-4" />;

    switch (grade) {
      case Grade.A:
        return <Award className="h-4 w-4" />;
      case Grade.B:
        return <Award className="h-4 w-4" />;
      case Grade.C:
        return <CheckCircle2 className="h-4 w-4" />;
      case Grade.D:
        return <AlertCircle className="h-4 w-4" />;
      case Grade.E:
        return <AlertCircle className="h-4 w-4" />;
      case Grade.F:
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return "↗";
      case "down":
        return "↘";
      default:
        return "→";
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      {/* Main Content */}
      <main className="w-full px-6 xl:px-8 py-8">
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
          <button className="mt-4 lg:mt-0 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Transcript
          </button>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {performanceMetrics.map((metric, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <span
                  className={`text-sm font-medium ${getTrendColor(
                    metric.trend
                  )}`}
                >
                  {getTrendIcon(metric.trend)} {metric.change}%
                </span>
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
            <h3 className="text-2xl font-bold text-foreground">
              Course Grades
            </h3>

            {gradeSummary?.courseGrades.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
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
                {gradeSummary?.courseGrades.map((courseGrade) => (
                  <div
                    key={courseGrade.course.id}
                    className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-xl font-semibold text-foreground mb-1">
                          {courseGrade.course.title}
                        </h4>
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
                    <div className="mb-4">
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

                    {/* Assignment Grades */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-foreground">
                        Assignment Grades
                      </h5>
                      {courseGrade.assignments.map((assignment) => (
                        <div
                          key={assignment.assignment.id}
                          className="flex items-center justify-between p-3 border border-border rounded-lg"
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
                                Max Score: {assignment.assignment.maxScore}
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
                              <p className="text-sm text-yellow-600">
                                Pending Grade
                              </p>
                            ) : (
                              <p className="text-sm text-gray-500">
                                Not Submitted
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Overall Summary */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Overall Summary
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">GPA</span>
                  <span className="text-2xl font-bold text-foreground">
                    {gradeSummary?.gpa || 0.0}
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
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Recently Graded
              </h3>

              {recentGraded.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recently graded assignments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentGraded.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-border rounded-lg"
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
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {item.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grade Legend */}
            <div className="bg-card border border-border rounded-2xl p-6">
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
