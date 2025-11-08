"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Users,
  UserCheck,
  GraduationCap,
  ArrowRight,
  Shield,
  FileText,
  MessageSquare,
  Calendar,
  TrendingUp,
  ChevronRight,
  User,
  LogOut,
  Settings,
  Award,
  LogIn,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";

export default function SelectRolePage() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<
    "signup" | "login" | null
  >(null);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  const handleRoleSelection = (role: string) => {
    setSelectedRole(role);
    setSelectedAction(null);
  };

  const handleActionSelection = (action: "signup" | "login") => {
    setSelectedAction(action);
  };

  const handleContinue = () => {
    if (!selectedRole || !selectedAction) return;

    // Navigate to the appropriate page based on role and action
    if (selectedAction === "signup") {
      if (selectedRole === "lecturer") {
        router.push("/teacher/signup");
      } else if (selectedRole === "student") {
        router.push("/auth/signup");
      }
    } else if (selectedAction === "login") {
      if (selectedRole === "lecturer") {
        router.push("/teacher/signin");
      } else if (selectedRole === "student") {
        router.push("/auth/signin");
      }
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setTimeout(() => setSigningOut(false), 1000);
  };

  // Get the appropriate navigation URL based on selections
  const getNavigationUrl = () => {
    if (!selectedRole || !selectedAction) return "#";

    if (selectedAction === "signup") {
      return selectedRole === "lecturer" ? "/teacher/signup" : "/auth/signup";
    } else {
      return selectedRole === "lecturer" ? "/teacher/signin" : "/auth/signin";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-12 py-4 flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="p-2 border-2 border-primary/20 rounded-xl bg-primary/5">
              <img
                src="/mouau_logo.webp"
                alt="MOUAU Logo"
                className="h-6 w-6 sm:h-7 sm:w-7 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src =
                    "https://placehold.co/40x40/10b981/ffffff?text=M";
                }}
              />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">
                MOUAU ClassMate
              </h1>
              <p className="text-xs text-muted-foreground sm:block">
                Your Academic Partner
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/auth/signin"
              className="hidden md:block px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="hidden md:block px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="flex-1 w-full px-4 sm:px-6 lg:px-12 py-12 sm:py-16 lg:py-20">
        <div className="max-w-6xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Welcome to MOUAU ClassMate
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Choose Your Journey
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select your role and get started with your academic experience
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center gap-4 sm:gap-8">
              <div
                className={`flex flex-col items-center transition-colors ${
                  selectedRole ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-semibold transition-all ${
                    selectedRole
                      ? "bg-primary border-primary text-primary-foreground scale-110"
                      : "border-border"
                  }`}
                >
                  1
                </div>
                <span className="text-xs sm:text-sm mt-2 font-medium">
                  Select Role
                </span>
              </div>
              <div
                className={`w-12 sm:w-16 h-1 rounded-full transition-colors ${
                  selectedRole ? "bg-primary" : "bg-border"
                }`}
              ></div>
              <div
                className={`flex flex-col items-center transition-colors ${
                  selectedAction ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-semibold transition-all ${
                    selectedAction
                      ? "bg-primary border-primary text-primary-foreground scale-110"
                      : "border-border"
                  }`}
                >
                  2
                </div>
                <span className="text-xs sm:text-sm mt-2 font-medium">
                  Choose Action
                </span>
              </div>
              <div
                className={`w-12 sm:w-16 h-1 rounded-full transition-colors ${
                  selectedAction ? "bg-primary" : "bg-border"
                }`}
              ></div>
              <div
                className={`flex flex-col items-center transition-colors ${
                  selectedRole && selectedAction
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-semibold transition-all ${
                    selectedRole && selectedAction
                      ? "bg-primary border-primary text-primary-foreground scale-110"
                      : "border-border"
                  }`}
                >
                  3
                </div>
                <span className="text-xs sm:text-sm mt-2 font-medium">
                  Continue
                </span>
              </div>
            </div>
          </div>

          {/* Role Selection Cards */}
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8 mb-12">
            {/* Lecturer Card */}
            <div
              className={`relative p-8 bg-card rounded-2xl border-2 transition-all cursor-pointer group ${
                selectedRole === "lecturer"
                  ? "border-primary shadow-lg shadow-primary/20 bg-primary/5 scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
              }`}
              onClick={() => handleRoleSelection("lecturer")}
            >
              {selectedRole === "lecturer" && (
                <div className="absolute top-4 right-4 p-2 bg-primary rounded-full animate-in zoom-in duration-200">
                  <UserCheck className="h-5 w-5 text-primary-foreground" />
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`p-3 rounded-xl transition-all duration-300 ${
                    selectedRole === "lecturer"
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110"
                  }`}
                >
                  <BookOpen className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Lecturer
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Faculty Member
                  </p>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed">
                Manage courses, create assignments, grade submissions, and
                communicate with students efficiently.
              </p>

              <ul className="space-y-3 mb-6">
                {[
                  { icon: Shield, text: "Create and manage course content" },
                  {
                    icon: FileText,
                    text: "Grade assignments and provide feedback",
                  },
                  { icon: MessageSquare, text: "Communicate with students" },
                  { icon: TrendingUp, text: "Track student progress" },
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 group/item">
                    <div className="p-1 bg-primary/10 rounded-lg shrink-0 group-hover/item:bg-primary/20 group-hover/item:scale-110 transition-all">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{item.text}</span>
                  </li>
                ))}
              </ul>

              <div
                className={`flex items-center font-medium transition-all group-hover:gap-3 gap-2 ${
                  selectedRole === "lecturer" ? "text-primary" : "text-primary"
                }`}
              >
                Select as Lecturer
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Student Card */}
            <div
              className={`relative p-8 bg-card rounded-2xl border-2 transition-all cursor-pointer group ${
                selectedRole === "student"
                  ? "border-primary shadow-lg shadow-primary/20 bg-primary/5 scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
              }`}
              onClick={() => handleRoleSelection("student")}
            >
              {selectedRole === "student" && (
                <div className="absolute top-4 right-4 p-2 bg-primary rounded-full animate-in zoom-in duration-200">
                  <UserCheck className="h-5 w-5 text-primary-foreground" />
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`p-3 rounded-xl transition-all duration-300 ${
                    selectedRole === "student"
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110"
                  }`}
                >
                  <GraduationCap className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Student
                  </h2>
                  <p className="text-sm text-muted-foreground">Learner</p>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed">
                Access course materials, submit assignments, collaborate with
                peers, and track your academic progress.
              </p>

              <ul className="space-y-3 mb-6">
                {[
                  { icon: BookOpen, text: "Access course materials" },
                  { icon: Calendar, text: "Submit assignments on time" },
                  { icon: Users, text: "Collaborate with classmates" },
                  { icon: Award, text: "Track your grades and progress" },
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 group/item">
                    <div className="p-1 bg-primary/10 rounded-lg shrink-0 group-hover/item:bg-primary/20 group-hover/item:scale-110 transition-all">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{item.text}</span>
                  </li>
                ))}
              </ul>

              <div
                className={`flex items-center font-medium transition-all group-hover:gap-3 gap-2 ${
                  selectedRole === "student" ? "text-primary" : "text-primary"
                }`}
              >
                Select as Student
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Action Selection */}
          {selectedRole && (
            <div className="mb-12 animate-in fade-in slide-in-from-bottom duration-500">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Are you a new or returning user?
                </h2>
                <p className="text-muted-foreground">
                  Choose your next step to continue
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {/* Sign Up Action */}
                <div
                  className={`p-6 bg-card rounded-2xl border-2 transition-all cursor-pointer group ${
                    selectedAction === "signup"
                      ? "border-primary shadow-lg shadow-primary/20 bg-primary/5 scale-[1.02]"
                      : "border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                  }`}
                  onClick={() => handleActionSelection("signup")}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        selectedAction === "signup"
                          ? "bg-primary text-primary-foreground scale-110"
                          : "bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110"
                      }`}
                    >
                      <UserPlus className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">
                        Create Account
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        New to MOUAU ClassMate
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sign up for a new{" "}
                    {selectedRole === "lecturer" ? "lecturer" : "student"}{" "}
                    account
                  </p>
                </div>

                {/* Login Action */}
                <div
                  className={`p-6 bg-card rounded-2xl border-2 transition-all cursor-pointer group ${
                    selectedAction === "login"
                      ? "border-primary shadow-lg shadow-primary/20 bg-primary/5 scale-[1.02]"
                      : "border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
                  }`}
                  onClick={() => handleActionSelection("login")}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        selectedAction === "login"
                          ? "bg-primary text-primary-foreground scale-110"
                          : "bg-primary/10 text-primary group-hover:bg-primary/20 group-hover:scale-110"
                      }`}
                    >
                      <LogIn className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">
                        Sign In
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Existing account
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sign in to your existing{" "}
                    {selectedRole === "lecturer" ? "lecturer" : "student"}{" "}
                    account
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href={getNavigationUrl()}
              className={`px-8 py-3.5 font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group ${
                selectedRole && selectedAction
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-100"
                  : "bg-muted text-muted-foreground cursor-not-allowed pointer-events-none"
              }`}
            >
              {selectedAction === "signup"
                ? "Create Account"
                : selectedAction === "login"
                ? "Sign In"
                : "Continue"}
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/"
              className="px-6 py-3.5 border-2 border-border text-foreground font-semibold rounded-xl hover:bg-accent/10 hover:border-primary/50 transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-100"
            >
              Back to Home
            </Link>
          </div>

          {(!selectedRole || !selectedAction) && (
            <p className="text-center text-sm text-muted-foreground mt-4 animate-pulse">
              {!selectedRole
                ? "Please select your role to continue"
                : "Please choose an action to proceed"}
            </p>
          )}

          {/* Help Section */}
          <div className="mt-16 bg-primary/5 rounded-3xl p-8 text-center border border-primary/20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-card rounded-full mb-4">
              <Settings className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Need Assistance?
              </span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              We're Here to Help
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
              If you're unsure which role to select or need assistance with your
              account, please contact the support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/support"
                className="px-6 py-2.5 bg-card border border-border text-foreground font-medium rounded-lg hover:bg-accent/10 hover:border-primary/50 transition-all flex items-center justify-center gap-2"
              >
                <Settings className="h-5 w-5" />
                Contact Support
              </Link>
              <Link
                href="/help"
                className="px-6 py-2.5 text-primary font-medium rounded-lg hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
              >
                Learn More
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 MOUAU ClassMate. All rights reserved.
            </p>
            <div className="flex gap-4">
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
