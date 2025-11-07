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

// Array of 60 random greetings
const greetings = [
  "Happy {day}!",
  "Wonderful {day}!",
  "Great to see you this {day}!",
  "Hope you're having a fantastic {day}!",
  "Welcome back! It's a beautiful {day}!",
  "Good {day}! Ready to learn?",
  "Hello! Let's make this {day} count!",
  "Greetings! What a lovely {day}!",
  "Hi there! Hope your {day} is amazing!",
  "Welcome! Let's conquer this {day} together!",
  "Rise and shine! It's {day}!",
  "Hello scholar! Happy {day}!",
  "Good to see you this {day}!",
  "Welcome back! Let's make today productive!",
  "Greetings! Ready for academic excellence?",
  "Hello! Time to shine this {day}!",
  "Welcome! Your journey continues today!",
  "Hi! Let's achieve greatness this {day}!",
  "Greetings! Another day to learn and grow!",
  "Welcome back! Your future starts now!",

  // Additional 40 greetings
  "Awesome {day} ahead!",
  "Welcome! Knowledge awaits you this {day}!",
  "Hello! Let's embrace this {day} with enthusiasm!",
  "Greetings! Make this {day} remarkable!",
  "Welcome back! Success starts today!",
  "Hi there! Ready to expand your mind this {day}?",
  "Hello scholar! Let's make this {day} unforgettable!",
  "Welcome! Your potential is limitless this {day}!",
  "Greetings! Another opportunity to excel!",
  "Happy {day}! Let the learning begin!",
  "Welcome back! Your dedication inspires us!",
  "Hello! Today is yours to conquer!",
  "Greetings! Let's create magic this {day}!",
  "Welcome! The classroom awaits your brilliance!",
  "Hi! This {day} holds endless possibilities!",
  "Hello scholar! Your journey to greatness continues!",
  "Welcome back! Let's write your success story today!",
  "Greetings! Academic adventures await this {day}!",
  "Happy {day}! Your mind is your superpower!",
  "Welcome! Let's turn dreams into reality today!",
  "Hello! This {day} is your canvas - paint it bright!",
  "Greetings! Ready to unlock new knowledge?",
  "Welcome back! Your curiosity leads to discovery!",
  "Hi there! Let's make this {day} extraordinary!",
  "Hello scholar! Wisdom awaits your arrival!",
  "Welcome! Today's lesson: you are capable!",
  "Greetings! Let's build your future this {day}!",
  "Happy {day}! Your education is your passport!",
  "Welcome back! The world needs your brilliance!",
  "Hello! Let's make today's chapter amazing!",
  "Greetings! Your potential shines bright this {day}!",
  "Welcome! Ready to be inspired this {day}?",
  "Hi! Today is perfect for breakthroughs!",
  "Hello scholar! Let's create academic wonders!",
  "Welcome back! Your success story continues!",
  "Greetings! This {day} is full of promise!",
  "Happy {day}! Learning never looked so good!",
  "Welcome! Let's make today count together!",
  "Hello! Your academic journey continues!",
  "Greetings! Ready to master new challenges?",
  "Welcome back! Today's the day to shine!",
];

// Helper function to convert text to sentence case
const toSentenceCase = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// Helper function to get day of week
const getDayOfWeek = () => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[new Date().getDay()];
};

// Helper function to get random greeting
const getRandomGreeting = () => {
  const day = getDayOfWeek();
  const randomIndex = Math.floor(Math.random() * greetings.length);
  return greetings[randomIndex].replace("{day}", day);
};

// Helper function to extract surname from full name and convert to sentence case
const getSurname = (fullName?: string) => {
  if (!fullName) return "Student";

  const nameParts = fullName.trim().split(" ");
  // Return the last part as surname in sentence case
  const surname = nameParts[nameParts.length - 1];
  return toSentenceCase(surname);
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
      }
    } catch (error) {
      console.error("Error during sign out:", error);
      window.location.href = "/auth/signin";
    }
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

  const userData = dashboardData?.userInfo;
  const randomGreeting = getRandomGreeting();
  const userSurname = getSurname(userData?.name);

  return (
    <div className="min-h-screen bg-background">
      {/* Use DashboardHeader component - properly integrated */}
      <DashboardHeader />

      {/* Dashboard Content */}
      <main className="w-full px-6 xl:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            {randomGreeting} {userSurname}!
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
    </div>
  );
}
