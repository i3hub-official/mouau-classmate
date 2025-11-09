// app/teacher/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Users,
  BookOpenCheck,
  BookCheckIcon,
  Calendar,
  TrendingUp,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface DashboardStats {
  overview: {
    totalCourses: number;
    totalStudents: number;
    totalAssignments: number;
    pendingGrading: number;
  };
  recentActivity: any[];
  upcomingDeadlines: any[];
  coursePerformance: any[];
  quickActions: any[];
}

export default function TeacherDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
   
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Teacher Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's your teaching overview.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock size={16} />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Total Courses"
          value={stats.overview.totalCourses}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats.overview.totalStudents}
          color="green"
        />
        <StatCard
          icon={BookOpenCheck}
          label="Total Assignments"
          value={stats.overview.totalAssignments}
          color="purple"
        />
        <StatCard
          icon={BookCheckIcon}
          label="Pending Grading"
          value={stats.overview.pendingGrading}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              {stats.quickActions.map((action, index) => (
                <button
                  key={index}
                  className="w-full text-left p-3 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TrendingUp size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {action.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Upcoming Deadlines
              </h2>
              <Calendar size={20} className="text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {stats.upcomingDeadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {deadline.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {deadline.course} • Due{" "}
                      {new Date(deadline.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {deadline.pendingGrading} to grade
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {deadline.totalSubmissions} submissions
                    </p>
                  </div>
                </div>
              ))}
              {stats.upcomingDeadlines.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No upcoming deadlines
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Course Performance */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Course Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.coursePerformance.map((course) => (
            <div
              key={course.id}
              className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <h3 className="font-semibold text-foreground">{course.code}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {course.title}
              </p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Students:</span>
                  <span className="font-medium">{course.totalStudents}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Average Score:</span>
                  <span className="font-medium">{course.averageScore}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Assignments:</span>
                  <span className="font-medium">{course.totalAssignments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Submissions:</span>
                  <span className="font-medium">{course.totalSubmissions}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Recent Activity
        </h2>
        <div className="space-y-3">
          {stats.recentActivity.slice(0, 5).map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-3 p-3 border border-border rounded-lg"
            >
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  {formatActivityAction(activity.action)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(activity.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type StatCardColor = "blue" | "green" | "purple" | "orange";

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: StatCardColor;
}) {
  const colorClasses: Record<StatCardColor, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-green-50 border-green-200 text-green-600",
    purple: "bg-purple-50 border-purple-200 text-purple-600",
    orange: "bg-orange-50 border-orange-200 text-orange-600",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

function formatActivityAction(action: string): string {
  const actions: { [key: string]: string } = {
    ASSIGNMENT_CREATED: "Created a new assignment",
    GRADE_ASSIGNED: "Graded an assignment",
    COURSE_CREATED: "Created a new course",
    USER_LOGGED_IN: "Logged in to the system",
    PROFILE_UPDATED: "Updated profile information",
  };

  return actions[action] || action.replace(/_/g, " ").toLowerCase();
}
