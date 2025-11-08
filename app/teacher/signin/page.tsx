// app/auth/teacher-signin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Shield,
  User,
  LogOut,
  Settings,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { UserService } from "@/lib/services/userService";
import { TeacherAuthService } from "@/lib/services/teachers/authService";

export default function TeacherSignInPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const user = await TeacherAuthService.getCurrentUser();
        if (user && (user.role === "TEACHER")) {
          router.replace("/teacher/dashboard");
        }
      } catch (error) {
        // User not authenticated, continue with sign in
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    // Handle lockout timer
    if (isLocked && lockTimeRemaining > 0) {
      const timer = setTimeout(() => {
        setLockTimeRemaining(lockTimeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isLocked && lockTimeRemaining === 0) {
      setIsLocked(false);
      setLoginAttempts(0);
    }
  }, [isLocked, lockTimeRemaining]);

  const formatLockTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setShowSuccess(false);

    try {
      const response = await TeacherAuthService.login({
        email: formData.email,
        password: formData.password,
        ipAddress: "", // You can get this from a service if needed
        userAgent: navigator.userAgent,
      });

      if (response.success) {
        // Store token if provided
        if (response.token) {
          // Store in localStorage for client-side access
          localStorage.setItem("auth-token", response.token);
          
          // Also store in cookie for server-side access
          document.cookie = `auth-token=${response.token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict; Secure`;
          
          if (formData.rememberMe) {
            localStorage.setItem("remember_email", formData.email);
          } else {
            localStorage.removeItem("remember_email");
          }
        }

        setShowSuccess(true);
        // Redirect to teacher dashboard after a short delay
        setTimeout(() => {
          router.replace("/teacher/dashboard");
        }, 1500);
      } else {
        // Handle failed login
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);

        if (newAttempts >= 5) {
          // Lock account for 30 minutes
          setIsLocked(true);
          setLockTimeRemaining(30 * 60); // 30 minutes in seconds
        }

        setErrors({
          submit: response.message || "Invalid email or password",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "Login failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push("/auth/teacher/forgot-password");
  };

  const handleBackToRoleSelection = () => {
    router.push("/select-role");
  };

  useEffect(() => {
    // Check for remembered email
    const rememberedEmail = localStorage.getItem("remember_email");
    if (rememberedEmail) {
      setFormData((prev) => ({ ...prev, email: rememberedEmail, rememberMe: true }));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-primary/5 flex flex-col">
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
              Student Sign In
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="flex-1 w-full px-4 sm:px-6 lg:px-12 py-12 sm:py-16 lg:py-24">
        <div className="max-w-md mx-auto w-full">
          {/* Back Button */}
          <button
            onClick={handleBackToRoleSelection}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Role Selection
          </button>

          {/* Sign In Card */}
          <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="p-3 bg-primary/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Lecturer Sign In
              </h2>
              <p className="text-sm text-muted-foreground">
                Welcome back! Please sign in to your account
              </p>
            </div>

            {/* Success Message */}
            {showSuccess && (
              <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-green-800 dark:text-green-200 text-sm font-medium">
                    Sign in successful! Redirecting to dashboard...
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errors.submit && (
              <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-error" />
                  <p className="text-error text-sm">{errors.submit}</p>
                </div>
              </div>
            )}

            {/* Lockout Message */}
            {isLocked && (
              <div className="mb-6 p-4 bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="text-orange-800 dark:text-orange-200 text-sm font-medium">
                      Account Temporarily Locked
                    </p>
                    <p className="text-orange-700 dark:text-orange-300 text-xs">
                      Too many failed attempts. Please try again in{" "}
                      {formatLockTime(lockTimeRemaining)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Enter your email address"
                    className={`w-full pl-10 pr-4 py-3 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                      errors.email
                        ? "border-error"
                        : "border-border hover:border-primary/50"
                    }`}
                    disabled={isLocked || isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-error text-xs mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-error rounded-full"></span>
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    placeholder="Enter your password"
                    className={`w-full pl-10 pr-12 py-3 bg-background border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                      errors.password
                        ? "border-error"
                        : "border-border hover:border-primary/50"
                    }`}
                    disabled={isLocked || isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLocked || isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-error text-xs mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-error rounded-full"></span>
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) => handleInputChange("rememberMe", e.target.checked)}
                    className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                    disabled={isLocked || isLoading}
                  />
                  <span className="text-sm text-foreground">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                  disabled={isLocked || isLoading}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLocked || isLoading}
                className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  href="/auth/teacher-signup"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Sign up as Lecturer
                </Link>
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <Link
              href="/auth/teacher/forgot-password"
              className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition-all text-center group"
            >
              <Shield className="h-6 w-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Reset Password</span>
            </Link>
            <Link
              href="/support"
              className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition-all text-center group"
            >
              <Settings className="h-6 w-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Get Help</span>
            </Link>
          </div>

          {/* Additional Options */}
          <div className="mt-6 text-center">
            <Link
              href="/select-role"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Not a lecturer? Sign in as student
            </Link>
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