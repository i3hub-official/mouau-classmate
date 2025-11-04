// app/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Calendar,
  FileText,
  Users,
  Bell,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Menu,
  X,
  Clock,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Target,
  Award,
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  matricNumber: string;
  department: string;
  college: string;
  course: string;
}

interface DashboardStats {
  activeCourses: number;
  pendingAssignments: number;
  upcomingDeadlines: number;
  classmatesCount: number;
  recentActivities: any[];
  userInfo: UserData;
  academicProgress?: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    averageProgress: number;
    averageScore: number;
  };
}

interface RecentActivity {
  id: string;
  title: string;
  description: string;
  type: "assignment" | "lecture" | "schedule" | "notification";
  courseCode: string;
  courseName: string;
  timestamp: Date;
  icon: string;
  color: string;
}

// Icon mapping for activities
const iconMap = {
  FileText: FileText,
  BookOpen: BookOpen,
  Calendar: Calendar,
  Clock: Clock,
};

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard");
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        console.error("Failed to fetch dashboard data");
        // Fallback to basic user data
        await fetchUserData();
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      await fetchUserData();
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/user/me");
      if (response.ok) {
        const user = await response.json();
        setDashboardData({
          activeCourses: 0,
          pendingAssignments: 0,
          upcomingDeadlines: 0,
          classmatesCount: 0,
          recentActivities: [],
          userInfo: user,
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      const response = await fetch("/signout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        window.location.href = "/auth/signin";
      } else {
        console.error("Sign out failed");
      }
    } catch (error) {
      console.error("Error during sign out:", error);
      window.location.href = "/auth/signin";
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - new Date(timestamp).getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
  };

  const getActivityIcon = (iconName: string, color: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || FileText;
    const colorClasses = {
      blue: "bg-blue-100 text-blue-600",
      green: "bg-green-100 text-green-600",
      orange: "bg-orange-100 text-orange-600",
      purple: "bg-purple-100 text-purple-600",
    };

    return (
      <div
        className={`p-2 rounded-lg ${
          colorClasses[color as keyof typeof colorClasses] || colorClasses.blue
        }`}
      >
        <IconComponent size={16} />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userData = dashboardData?.userInfo;
  const progress = dashboardData?.academicProgress;

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Full width */}
      <header className="border-b border-border bg-card/95 backdrop-blur-lg sticky top-0 z-50 w-full">
        <div className="w-full px-6 xl:px-8 py-3">
          <div className="flex justify-between items-center">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-lg shadow-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  MOUAU ClassMate
                </h1>
                <p className="text-xs text-muted-foreground">
                  {userData?.department || "Student Portal"}
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <nav className="flex items-center gap-8">
                <a
                  href="/dashboard"
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  Dashboard
                </a>
                <a
                  href="/courses"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Courses
                </a>
                <a
                  href="/assignments"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Assignments
                </a>
                <a
                  href="/schedule"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Schedule
                </a>
                <a
                  href="/grades"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Grades
                </a>
              </nav>

              <div className="flex items-center gap-4">
                {/* Notifications */}
                <button className="p-2 hover:bg-muted rounded-lg transition-colors relative">
                  <Bell size={20} className="text-muted-foreground" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-card"></span>
                </button>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
                      <User size={16} className="text-white" />
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-medium text-foreground">
                        {userData?.name || "Student"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {userData?.matricNumber || "MOUAU"}
                      </p>
                    </div>
                    <ChevronDown size={16} className="text-muted-foreground" />
                  </button>

                  {/* User Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-lg py-2 z-50">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium text-foreground">
                          {userData?.name || "Student"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {userData?.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {userData?.matricNumber} • {userData?.department}
                        </p>
                      </div>

                      <a
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <User size={16} />
                        Profile Settings
                      </a>

                      <a
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <Settings size={16} />
                        Account Settings
                      </a>

                      <div className="border-t border-border mt-2 pt-2">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-border pt-4">
              <nav className="flex flex-col gap-3">
                <a
                  href="/dashboard"
                  className="text-sm font-medium text-foreground py-2 px-3 bg-primary/10 rounded-lg"
                >
                  Dashboard
                </a>
                <a
                  href="/courses"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg transition-colors"
                >
                  Courses
                </a>
                <a
                  href="/assignments"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg transition-colors"
                >
                  Assignments
                </a>
                <a
                  href="/schedule"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg transition-colors"
                >
                  Schedule
                </a>

                {/* Mobile User Info */}
                <div className="border-t border-border pt-4 mt-2">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
                      <User size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {userData?.name || "Student"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {userData?.matricNumber}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <a
                      href="/profile"
                      className="text-center text-sm text-foreground py-2 px-3 bg-muted rounded-lg transition-colors"
                    >
                      Profile
                    </a>
                    <button
                      onClick={handleSignOut}
                      className="text-center text-sm text-red-600 py-2 px-3 bg-red-50 rounded-lg transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Dashboard Content - Full width with optimal max-width */}
      <main className="w-full px-6 xl:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {userData?.name?.split(" ")[0] || "Student"}! 👋
          </h2>
          <p className="text-lg text-muted-foreground">
            Here's what's happening with your academic journey today.
          </p>
        </div>

        {/* User Info Card - Full width */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 text-white mb-8 shadow-lg w-full">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-4">
                Student Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                <div>
                  <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-wide">
                    Matric Number
                  </p>
                  <p className="font-semibold text-lg">
                    {userData?.matricNumber || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-wide">
                    Department
                  </p>
                  <p className="font-semibold text-lg">
                    {userData?.department || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-wide">
                    Course
                  </p>
                  <p className="font-semibold text-lg">
                    {userData?.course || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-wide">
                    College
                  </p>
                  <p className="font-semibold text-lg">
                    {userData?.college || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid - Optimized for wide screens */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Stats Cards */}
          <div className="xl:col-span-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              {/* Active Courses */}
              <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary transition-all duration-300 hover:shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <BookOpen className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">
                      {dashboardData?.activeCourses || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Active Courses
                    </p>
                  </div>
                </div>
              </div>

              {/* Pending Assignments */}
              <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary transition-all duration-300 hover:shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <FileText className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">
                      {dashboardData?.pendingAssignments || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pending Assignments
                    </p>
                  </div>
                </div>
              </div>

              {/* Upcoming Deadlines */}
              <div className="bg-card border border-border rounded-2xl p-6 hover:border-accent transition-all duration-300 hover:shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-accent/20 rounded-xl">
                    <Calendar className="h-7 w-7 text-accent" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">
                      {dashboardData?.upcomingDeadlines || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Upcoming Deadlines
                    </p>
                  </div>
                </div>
              </div>

              {/* Classmates */}
              <div className="bg-card border border-border rounded-2xl p-6 hover:border-secondary transition-all duration-300 hover:shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-secondary/20 rounded-xl">
                    <Users className="h-7 w-7 text-secondary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">
                      {dashboardData?.classmatesCount || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Classmates</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activities - Wider on large screens */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-foreground">
                  Recent Activities
                </h3>
                <a
                  href="/activities"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  View All
                </a>
              </div>
              <div className="space-y-4">
                {dashboardData?.recentActivities &&
                dashboardData.recentActivities.length > 0 ? (
                  dashboardData.recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted rounded-xl transition-colors"
                    >
                      {getActivityIcon(activity.icon, activity.color)}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-foreground">
                          {activity.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.courseCode} - {activity.courseName}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                        {getTimeAgo(activity.timestamp)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground text-lg">
                      No recent activities
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Your recent activities will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Progress and Quick Actions */}
          <div className="space-y-8">
            {/* Academic Progress */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-foreground mb-6">
                Academic Progress
              </h3>
              <div className="space-y-6">
                {/* Overall Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">
                      Overall Progress
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {progress?.averageProgress || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all duration-500"
                      style={{ width: `${progress?.averageProgress || 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Courses Summary */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {progress?.totalCourses || 0}
                    </p>
                    <p className="text-xs text-blue-600 font-medium">Total</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {progress?.completedCourses || 0}
                    </p>
                    <p className="text-xs text-green-600 font-medium">
                      Completed
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      {progress?.inProgressCourses || 0}
                    </p>
                    <p className="text-xs text-orange-600 font-medium">
                      In Progress
                    </p>
                  </div>
                </div>

                {/* Average Score */}
                <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl">
                  <Award className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold text-foreground">
                    {progress?.averageScore
                      ? progress.averageScore.toFixed(1)
                      : "0.0"}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-foreground mb-6">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <a
                  href="/assignments/upload"
                  className="p-5 bg-primary/10 hover:bg-primary/20 rounded-xl transition-all duration-300 hover:scale-105 group text-center"
                >
                  <FileText className="h-7 w-7 text-primary mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    Upload Assignment
                  </p>
                </a>
                <a
                  href="/courses"
                  className="p-5 bg-primary/10 hover:bg-primary/20 rounded-xl transition-all duration-300 hover:scale-105 group text-center"
                >
                  <BookOpen className="h-7 w-7 text-primary mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    View Courses
                  </p>
                </a>
                <a
                  href="/forum"
                  className="p-5 bg-primary/10 hover:bg-primary/20 rounded-xl transition-all duration-300 hover:scale-105 group text-center"
                >
                  <Users className="h-7 w-7 text-primary mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    Class Forum
                  </p>
                </a>
                <a
                  href="/schedule"
                  className="p-5 bg-primary/10 hover:bg-primary/20 rounded-xl transition-all duration-300 hover:scale-105 group text-center"
                >
                  <Calendar className="h-7 w-7 text-primary mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    Schedule
                  </p>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Sections for Wide Screens */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Upcoming Deadlines */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-foreground">
                Upcoming Deadlines
              </h3>
              <a
                href="/assignments"
                className="text-sm text-primary hover:underline font-medium"
              >
                View All
              </a>
            </div>
            <div className="space-y-4">
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No upcoming deadlines</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your upcoming assignments will appear here
                </p>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-foreground">
                Performance Overview
              </h3>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-4">
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Performance data loading
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your academic performance metrics will appear here
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Close dropdown when clicking outside */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
}
