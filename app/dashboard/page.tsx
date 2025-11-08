// app/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import { BookOpen, Calendar, FileText, Users } from "lucide-react";
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

// Helper function to convert text to sentence case
const toSentenceCase = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// Helper function to extract surname from full name and convert to sentence case
const getSurname = (fullName?: string) => {
  if (!fullName) return "Student";

  const nameParts = fullName.trim().split(" ");
  // Return the last part as surname in sentence case
  const surname = nameParts[nameParts.length - 1];
  return toSentenceCase(surname);
};

// Helper function to get or update persistent greeting
const getPersistentGreeting = async (surname: string): Promise<string> => {
  try {
    const response = await fetch("/api/user/me", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.greeting) {
        return data.greeting.replace("{surname}", surname);
      }
    }

    // Fallback to client-side generation
    const timeBasedGreetings = {
      night: [
        "Burning midnight oil, {surname}?",
        "Late night studying session, {surname}?",
        "Night owl mode activated, {surname}!",
        "Pushing through the night, {surname}!",
        "Dedication knows no time, {surname}!",
        "The quiet hours are perfect for focus, {surname}!",
      ],
      morning: [
        "Rise and shine, {surname}! Ready to conquer today?",
        "Good morning, {surname}! Let's make today count!",
        "Early bird catches the knowledge, {surname}!",
        "Morning motivation, {surname}! Time to excel!",
        "Fresh start to a productive day, {surname}!",
        "Hello {surname}! Ready to learn something new?",
      ],
      afternoon: [
        "Good afternoon, {surname}! Keeping up the great work!",
        "Afternoon focus session, {surname}!",
        "Halfway through the day, {surname}! Stay strong!",
        "Afternoon productivity boost, {surname}!",
        "Hello {surname}! How's your academic day going?",
        "Afternoon vibes, {surname}! Time to tackle those assignments!",
      ],
      evening: [
        "Good evening, {surname}! Time to review today's progress!",
        "Evening study session, {surname}?",
        "Winding down with some learning, {surname}?",
        "Evening reflections, {surname}! What did you achieve today?",
        "Hello {surname}! Ready for some evening studying?",
        "Evening dedication, {surname}! Almost there!",
      ],
    };

    const getTimePeriod = (): keyof typeof timeBasedGreetings => {
      const now = new Date();
      const hours = now.getHours();

      if (hours >= 0 && hours < 6) {
        return "night";
      } else if (hours >= 6 && hours < 12) {
        return "morning";
      } else if (hours >= 12 && hours < 18) {
        return "afternoon";
      } else {
        return "evening";
      }
    };

    const timePeriod = getTimePeriod();
    const greetings = timeBasedGreetings[timePeriod];
    const randomIndex = Math.floor(Math.random() * greetings.length);
    return greetings[randomIndex].replace("{surname}", surname);
  } catch (error) {
    console.error("Error fetching greeting:", error);

    // Fallback to a simple greeting
    return `Welcome back, ${surname}!`;
  }
};

// Calculate next hourly check time (at the top of the next hour)
const getNextHourlyCheck = (): Date => {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0);
  return nextHour;
};

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
      className={`bg-card border ${colorClasses[color]} rounded-xl p-4 hover:shadow-lg transition-all duration-300`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
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

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState<string>("");
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [nextCheckTime, setNextCheckTime] = useState<Date | null>(null);

  // Fetch user data and greeting on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // First fetch user data to get greeting
        const userResponse = await fetch("/api/user/me");
        if (userResponse.ok) {
          const userData = await userResponse.json();
          const surname = getSurname(userData.name);

          // Set greeting immediately if available
          if (userData.greeting) {
            setGreeting(userData.greeting.replace("{surname}", surname));
          } else {
            // Otherwise, fetch a new greeting
            const newGreeting = await getPersistentGreeting(surname);
            setGreeting(newGreeting);
          }

          // Then fetch dashboard data
          const dashboardResponse = await fetch("/api/dashboard");
          if (dashboardResponse.ok) {
            const dashboardInfo = await dashboardResponse.json();
            setDashboardData(dashboardInfo);
          } else {
            console.error("Failed to fetch dashboard data");
            // Set minimal dashboard data with user info
            setDashboardData({
              activeCourses: 0,
              pendingAssignments: 0,
              upcomingDeadlines: 0,
              classmatesCount: 0,
              recentActivities: [],
              userInfo: userData,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    };

    fetchInitialData();
  }, []);

  // Set up timer to check for greeting updates after initial load
  useEffect(() => {
    if (!initialLoadComplete || !dashboardData?.userInfo?.name) return;

    const surname = getSurname(dashboardData.userInfo.name);

    // Calculate when to check next (at the top of the next hour)
    const nextHour = getNextHourlyCheck();
    setNextCheckTime(nextHour);

    const checkInterval = setInterval(async () => {
      const now = new Date();

      // Only check if we've reached the next check time
      if (now >= nextHour) {
        const updatedGreeting = await getPersistentGreeting(surname);
        if (updatedGreeting !== greeting) {
          setGreeting(updatedGreeting);

          // Calculate the next check time
          const newNextHour = getNextHourlyCheck();
          setNextCheckTime(newNextHour);
        }
      }
    }, 60000); // Check every minute but only update at the top of the hour

    return () => clearInterval(checkInterval);
  }, [initialLoadComplete, dashboardData?.userInfo?.name, greeting]);

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
      }
    } catch (error) {
      console.error("Error during sign out:", error);
      window.location.href = "/auth/signin";
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <div className="flex items-center justify-center min-h-[400px]">
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
      {/* Use DashboardHeader component - properly integrated */}
      <DashboardHeader />

      {/* Dashboard Content */}
      <main className="w-full px-4 sm:px-6 xl:px-8 py-6 space-y-6">
        {/* Welcome Section */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">
            {greeting || "Welcome back!"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Here's what's happening with your academic journey today.
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-linear-to-br from-primary to-primary/80 rounded-xl p-6 text-white shadow-lg w-full">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-3">
                Student Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-wide">
                    Matric Number
                  </p>
                  <p className="font-semibold text-base">
                    {dashboardData?.userInfo?.matricNumber || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-wide">
                    Department
                  </p>
                  <p className="font-semibold text-base">
                    {dashboardData?.userInfo?.department || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-wide">
                    Course
                  </p>
                  <p className="font-semibold text-base">
                    {dashboardData?.userInfo?.course || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-wide">
                    College
                  </p>
                  <p className="font-semibold text-base">
                    {dashboardData?.userInfo?.college || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="xl:col-span-2 space-y-6">
            <RecentActivities
              activities={dashboardData?.recentActivities || []}
              loading={loading}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <div className="space-y-6">
            <AcademicProgress
              progress={dashboardData?.academicProgress}
              loading={loading}
            />
          </div>
        </div>

        {/* Quick Actions - Always at bottom */}
        <QuickActions />
      </main>
    </div>
  );
}
