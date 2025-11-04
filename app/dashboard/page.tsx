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
} from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { SignOutModal } from "@/app/components/SignOutModal";
import { RecentActivities } from "@/app/components/RecentActivities";
import { UpcomingDeadlines } from "@/app/components/UpcomingDeadlines";
import { AcademicProgress } from "@/app/components/AcademicProgress";
import { PerformanceOverview } from "@/app/components/PerformanceOverview";
import { QuickActions } from "@/app/components/QuickActions";

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

// Stat Cards Component
function StatCard({
  icon: Icon,
  value,
  label,
  color = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  color?: "primary" | "accent" | "secondary";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary border-primary/20",
    accent: "bg-accent/20 text-accent border-accent/30",
    secondary: "bg-secondary/20 text-secondary border-secondary/30",
  };

  return (
    <div
      className={`bg-card border ${colorClasses[color]} rounded-2xl p-6 hover:shadow-lg transition-all duration-300`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

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

  const handleSignOutClick = () => {
    setShowUserMenu(false);
    setShowSignOutModal(true);
  };

  const handleSignOut = async () => {
    try {
      const response = await fetch("/signout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        window.location.href = "/auth/signin";
      } else {
        console.error("Sign out failed");
        setShowSignOutModal(false);
      }
    } catch (error) {
      console.error("Error during sign out:", error);
      window.location.href = "/auth/signin";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userData = dashboardData?.userInfo;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
                <ThemeToggle />
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
                          onClick={handleSignOutClick}
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

            {/* Mobile Navigation - ThemeToggle before hamburger */}
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <button
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
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
                <a
                  href="/grades"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground py-2 px-3 rounded-lg transition-colors"
                >
                  Grades
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
                      onClick={handleSignOutClick}
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

      {/* Dashboard Content */}
      <main className="w-full px-6 xl:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {userData?.name?.split(" ")[0] || "Student"}!
          </h2>
          <p className="text-lg text-muted-foreground">
            Here's what's happening with your academic journey today.
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-linear-to-br from-primary to-primary/80 rounded-2xl p-8 text-white shadow-lg w-full">
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            icon={BookOpen}
            value={dashboardData?.activeCourses || 0}
            label="Active Courses"
            color="primary"
          />
          <StatCard
            icon={FileText}
            value={dashboardData?.pendingAssignments || 0}
            label="Pending Assignments"
            color="primary"
          />
          <StatCard
            icon={Calendar}
            value={dashboardData?.upcomingDeadlines || 0}
            label="Upcoming Deadlines"
            color="accent"
          />
          <StatCard
            icon={Users}
            value={dashboardData?.classmatesCount || 0}
            label="Classmates"
            color="secondary"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - 2/3 width */}
          <div className="xl:col-span-2 space-y-8">
            <RecentActivities
              activities={dashboardData?.recentActivities || []}
              loading={loading}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <UpcomingDeadlines
                assignments={[]} // You'll need to fetch this data
                loading={loading}
              />
              <PerformanceOverview
                metrics={undefined} // You'll need to fetch this data
                loading={loading}
              />
            </div>
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-8">
            <AcademicProgress
              progress={dashboardData?.academicProgress}
              loading={loading}
            />
          </div>
        </div>

        {/* Quick Actions - Always at the bottom */}
        <QuickActions />
      </main>

      {/* Sign Out Modal */}
      <SignOutModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onSignOut={handleSignOut}
      />

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
