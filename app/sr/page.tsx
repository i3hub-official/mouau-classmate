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
  Home,
  Award,
  LogIn,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";

// Helper to safely check if sessionStorage is available
const isSessionStorageAvailable = (): boolean => {
  try {
    if (typeof window === "undefined") return false;
    const test = "__storage_test__";
    window.sessionStorage.setItem(test, test);
    window.sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

// In-memory storage
let inMemoryRoleData: { role: string; timestamp: number } | null = null;

const setRoleSelection = (role: string) => {
  const data = {
    role,
    timestamp: Date.now(),
  };

  // Store in memory
  inMemoryRoleData = data;

  // Also store in sessionStorage if available
  if (isSessionStorageAvailable()) {
    sessionStorage.setItem("selectedRole", JSON.stringify(data));
  }
};

export default function SelectRolePage() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  const handleRoleSelection = (role: string) => {
    setSelectedRole(role);
  };

  // Updated to store role before navigation
  const handleContinue = () => {
    if (!selectedRole) return;

    // Store role selection
    setRoleSelection(selectedRole);

    // Navigate to appropriate signup form
    if (selectedRole === "lecturer") {
      router.push("/p/t/signup");
    } else if (selectedRole === "student") {
      router.push("/p/s/signup");
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setTimeout(() => setSigningOut(false), 1000);
  };

  // Get appropriate navigation URL based on selections
  const getNavigationUrl = () => {
    if (!selectedRole) return "#";
    return selectedRole === "lecturer" ? "/p/t/signup" : "/p/s/signup";
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
              href="/"
              className="inline-flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Home</span>
            </Link>
            <Link
              href="/signin"
              className="hidden md:block px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/p/s/signup"
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
              Choose Your Registration Path
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select your role to access the appropriate registration form with
              built-in security validation
            </p>
          </div>

          {/* Super Minimal Security Badges with Subtle Flair */}
          <div className="text-center mb-12">
            <div className="inline-flex flex-wrap justify-center gap-2 mb-4">
              {[
                { icon: Shield, text: "Secure", variant: "primary" },
                { icon: UserCheck, text: "Verified", variant: "accent" },
                { icon: FileText, text: "Validated", variant: "primary" },
                { icon: Award, text: "Trusted", variant: "accent" },
              ].map((badge, i) => {
                const Icon = badge.icon;
                const isPrimary = badge.variant === "primary";

                return (
                  <div
                    key={i}
                    className={`
            group relative inline-flex items-center gap-1.5 px-2.5 py-1.5 
            rounded-lg border text-xs font-medium backdrop-blur-sm 
            transition-all duration-300 
            hover:scale-105 hover:shadow-sm
            ${
              isPrimary
                ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15"
                : "bg-accent/10 border-accent/20 text-accent-foreground hover:bg-accent/15"
            }
          `}
                  >
                    {/* subtle animated border shimmer */}
                    <span
                      className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm ${
                        isPrimary ? "bg-primary/10" : "bg-accent/10"
                      }`}
                    ></span>

                    {/* icon + text */}
                    <Icon
                      className={`relative z-10 h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110 ${
                        isPrimary ? "text-primary" : "text-accent-foreground"
                      }`}
                    />
                    <span className="relative z-10">{badge.text}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-muted-foreground text-sm">
              Layered protection — simple, verified, and trusted.
            </p>
          </div>

          {/* Minimalist Animated Dots */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center gap-8">
              {/* Step 1 */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full transition-all duration-500 ${
                    selectedRole
                      ? "bg-primary scale-125 shadow-lg shadow-primary/25"
                      : "bg-primary scale-100 animate-pulse"
                  }`}
                ></div>
                <span className="text-sm font-medium text-primary">
                  Select Role
                </span>
              </div>

              {/* Connector */}
              <div
                className={`w-16 h-0.5 rounded-full transition-colors duration-500 ${
                  selectedRole ? "bg-primary" : "bg-muted"
                }`}
              ></div>

              {/* Step 2 */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full transition-all duration-500 ${
                    selectedRole
                      ? "bg-primary scale-125 shadow-lg shadow-primary/25"
                      : "bg-muted scale-100"
                  }`}
                ></div>
                <span
                  className={`text-sm font-medium transition-colors ${
                    selectedRole ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  Register
                </span>
              </div>
            </div>
          </div>

          {/* Role Selection Cards - Dual Form Approach */}
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
                    Lecturer Registration
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Faculty & Teaching Staff
                  </p>
                </div>
              </div>

              <div className="bg-primary/10 rounded-lg p-4 mb-6 border border-primary/20">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Security Requirements
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• @mouau.edu.ng email address</li>
                  <li>• Valid staff ID</li>
                  <li>• NIN verification</li>
                  <li>• Phone number</li>
                </ul>
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed">
                Access the lecturer registration form with university email
                validation. Only official MOUAU staff emails are accepted.
              </p>

              <ul className="space-y-3 mb-6">
                {[
                  { icon: Shield, text: "University email domain protection" },
                  { icon: FileText, text: "Staff ID verification" },
                  { icon: Users, text: "Course management access" },
                  { icon: TrendingUp, text: "Student progress tracking" },
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
                Register as Lecturer
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
                    Student Registration
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    MOUAU Learners
                  </p>
                </div>
              </div>

              <div className="bg-primary/10 rounded-lg p-4 mb-6 border border-primary/20">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Security Requirements
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Valid matric number</li>
                  <li>• Personal email address</li>
                  <li>• NIN verification</li>
                  <li>• Phone number</li>
                </ul>
              </div>

              <p className="text-muted-foreground mb-6 leading-relaxed">
                Access the student registration form with matric number
                validation. Personal emails accepted (university emails blocked
                for students).
              </p>

              <ul className="space-y-3 mb-6">
                {[
                  { icon: FileText, text: "Matric number verification" },
                  { icon: BookOpen, text: "Course material access" },
                  { icon: Calendar, text: "Assignment submission" },
                  { icon: Award, text: "Grade tracking" },
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
                Register as Student
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleContinue}
              disabled={!selectedRole}
              className={`px-8 py-3.5 font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group ${
                selectedRole
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-100"
                  : "bg-muted text-muted-foreground cursor-not-allowed pointer-events-none"
              }`}
            >
              Continue to Registration
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <Link
              href="/signin"
              className="px-6 py-3.5 border-2 border-border text-foreground font-semibold rounded-xl hover:bg-accent/10 hover:border-primary/50 transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-100"
            >
              <LogIn className="h-5 w-5" />
              Sign In Instead
            </Link>
          </div>

          {!selectedRole && (
            <p className="text-center text-sm text-muted-foreground mt-4 animate-pulse">
              Please select your role to continue to registration
            </p>
          )}

          {/* Security Notice */}
          <div className="mt-12 bg-card rounded-2xl p-6 text-center border border-border">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Security Notice
              </span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Protected Registration System
            </h3>
            <p className="text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed">
              Each registration form has built-in security validation to ensure
              proper role assignment. Lecturers require university emails, while
              students use matric numbers for verification.
            </p>
            <div className="text-xs text-muted-foreground">
              Attempts to bypass role validation will be automatically rejected
              by the system.
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
