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

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/user/me");
      if (response.ok) {
        const user = await response.json();
        setUserData(user);
      } else {
        // Fallback to cookie data if API fails
        const cookies = document.cookie.split(";");
        const userCookie = cookies.find((cookie) =>
          cookie.trim().startsWith("user_session=")
        );
        if (userCookie) {
          const userDataString = decodeURIComponent(userCookie.split("=")[1]);
          setUserData(JSON.parse(userDataString));
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const response = await fetch("/auth/signout", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        // Clear client-side state and redirect
        window.location.href = "/auth/signin";
      } else {
        console.error("Sign out failed");
      }
    } catch (error) {
      console.error("Error during sign out:", error);
      // Force redirect even if API call fails
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/95 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
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
              <nav className="flex items-center gap-6">
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
              </nav>

              <div className="flex items-center gap-3">
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

      {/* Dashboard Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome back, {userData?.name?.split(" ")[0] || "Student"}! 👋
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening with your courses today.
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-white mb-8 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Student Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-primary-foreground/80">Matric Number</p>
                  <p className="font-medium">
                    {userData?.matricNumber || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-primary-foreground/80">Department</p>
                  <p className="font-medium">{userData?.department || "N/A"}</p>
                </div>
                <div>
                  <p className="text-primary-foreground/80">Course</p>
                  <p className="font-medium">{userData?.course || "N/A"}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="bg-white/20 rounded-lg px-4 py-2 text-sm">
                <p className="text-primary-foreground/80">College</p>
                <p className="font-medium">{userData?.college || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4 hover:border-primary transition-all duration-300 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">5</p>
                <p className="text-sm text-muted-foreground">Active Courses</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 hover:border-primary transition-all duration-300 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">3</p>
                <p className="text-sm text-muted-foreground">
                  Pending Assignments
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 hover:border-accent transition-all duration-300 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">2</p>
                <p className="text-sm text-muted-foreground">
                  Upcoming Deadlines
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 hover:border-secondary transition-all duration-300 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/20 rounded-lg">
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">45</p>
                <p className="text-sm text-muted-foreground">Classmates</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activities */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Recent Activities
              </h3>
              <a
                href="/activities"
                className="text-sm text-primary hover:underline"
              >
                View All
              </a>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    New assignment posted
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PHY 301 - Quantum Mechanics • 2 hours ago
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BookOpen size={16} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Lecture notes updated
                  </p>
                  <p className="text-xs text-muted-foreground">
                    MAT 201 - Advanced Calculus • 5 hours ago
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar size={16} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Class schedule changed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CHE 101 - General Chemistry • 1 day ago
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <a
                href="/assignments/upload"
                className="p-4 bg-primary/10 hover:bg-primary/20 rounded-xl transition-all duration-300 hover:scale-105 group text-center"
              >
                <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  Upload Assignment
                </p>
              </a>
              <a
                href="/courses"
                className="p-4 bg-primary/10 hover:bg-primary/20 rounded-xl transition-all duration-300 hover:scale-105 group text-center"
              >
                <BookOpen className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  View Courses
                </p>
              </a>
              <a
                href="/forum"
                className="p-4 bg-primary/10 hover:bg-primary/20 rounded-xl transition-all duration-300 hover:scale-105 group text-center"
              >
                <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  Class Forum
                </p>
              </a>
              <a
                href="/schedule"
                className="p-4 bg-primary/10 hover:bg-primary/20 rounded-xl transition-all duration-300 hover:scale-105 group text-center"
              >
                <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Schedule</p>
              </a>
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
