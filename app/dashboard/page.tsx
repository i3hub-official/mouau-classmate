// app/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import { BookOpen, Calendar, FileText, Users } from "lucide-react";
import { SignOutModal } from "@/app/components/SignOutModal";
import { RecentActivities } from "@/app/components/RecentActivities";
import { UpcomingDeadlines } from "@/app/components/UpcomingDeadlines";
import { AcademicProgress } from "@/app/components/AcademicProgress";
import { PerformanceOverview } from "@/app/components/PerformanceOverview";
import { QuickActions } from "@/app/components/QuickActions";
import { DashboardHeader } from "@/app/components/DashboardHeader";

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
      <div className="min-h-screen bg-background">
        <DashboardHeader
          userData={dashboardData?.userInfo}
          onSignOut={() => setShowSignOutModal(true)}
        />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const userData = dashboardData?.userInfo;

  return (
    <div className="min-h-screen bg-background">
      {/* Use DashboardHeader component - properly integrated */}
      <DashboardHeader
        userData={userData}
        onSignOut={() => setShowSignOutModal(true)}
      />

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
    </div>
  );
}
