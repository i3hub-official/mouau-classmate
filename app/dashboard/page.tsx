// app/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import { BookOpen, Calendar, FileText, Users, RefreshCw } from "lucide-react";
import { RecentActivities } from "@/app/components/students/RecentActivities";
import { UpcomingDeadlines } from "@/app/components/students/UpcomingDeadlines";
import { AcademicProgress } from "@/app/components/students/AcademicProgress";
import { PerformanceOverview } from "@/app/components/students/PerformanceOverview";
import { QuickActions } from "@/app/components/students/QuickActions";
import { DashboardHeader } from "@/app/components/students/DashboardHeader";

// -----------------------------
// Types
// -----------------------------
interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  matricNumber?: string;
  department?: string;
  college?: string;
  course?: string;
  greeting?: string;
  greetingNextChange?: string;
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

// -----------------------------
// Helpers
// -----------------------------
const toSentenceCase = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

const getSurname = (fullName?: string) => {
  if (!fullName) return "Student";
  const nameParts = fullName.trim().split(" ");
  return toSentenceCase(nameParts[nameParts.length - 1]);
};

const getPersistentGreeting = async (surname: string): Promise<string> => {
  try {
    const response = await fetch("/api/user/me");
    if (response.ok) {
      const data = await response.json();
      if (data.greeting) return data.greeting.replace("{surname}", surname);
    }
    return `Welcome back, ${surname}!`;
  } catch {
    return `Welcome back, ${surname}!`;
  }
};

// -----------------------------
// Stat Card
// -----------------------------
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
      className={`bg-card border ${colorClasses[color]} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

// -----------------------------
// Main Component
// -----------------------------
export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState<string>("");

  // Fetch user + dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const userResponse = await fetch("/api/user/me");
      if (!userResponse.ok) throw new Error("Failed to fetch user data");
      const userData = await userResponse.json();
      const surname = getSurname(userData.name);
      const greetingText = await getPersistentGreeting(surname);
      setGreeting(greetingText);

      const dashboardResponse = await fetch("/api/dashboard");
      const dashboardInfo = dashboardResponse.ok
        ? await dashboardResponse.json()
        : {
            activeCourses: 0,
            pendingAssignments: 0,
            upcomingDeadlines: 0,
            classmatesCount: 0,
            recentActivities: [],
            userInfo: userData,
          };

      setDashboardData(dashboardInfo);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardHeader />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">
              Loading dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="w-full px-4 sm:px-6 xl:px-8 py-6 space-y-8">
        {/* Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {greeting || "Welcome back!"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Here’s what’s happening with your academic journey today.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-all"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        {/* Student Info */}
        <div className="bg-linear-to-br from-primary to-primary/80 rounded-2xl p-6 text-white shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Student Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <InfoField
              label="Matric Number"
              value={dashboardData?.userInfo?.matricNumber}
            />
            <InfoField
              label="Department"
              value={dashboardData?.userInfo?.department}
            />
            <InfoField label="Course" value={dashboardData?.userInfo?.course} />
            <InfoField
              label="College"
              value={dashboardData?.userInfo?.college}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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

        {/* Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main */}
          <div className="xl:col-span-2 space-y-6">
            <RecentActivities
              activities={dashboardData?.recentActivities || []}
              loading={loading}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UpcomingDeadlines assignments={[]} loading={loading} />
              <PerformanceOverview metrics={undefined} loading={loading} />
            </div>
          </div>

          {/* Side */}
          <div className="space-y-6">
            <AcademicProgress
              progress={dashboardData?.academicProgress}
              loading={loading}
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <QuickActions />
      </main>
    </div>
  );
}

// Small helper for info items
function InfoField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-white/70 text-xs font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="font-semibold text-base">{value || "N/A"}</p>
    </div>
  );
}
