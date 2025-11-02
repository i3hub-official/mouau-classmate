// app/auth/signin/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ArrowRight,
  Home,
  Lock,
  CheckCircle,
  Mail,
  AlertCircle,
} from "lucide-react";
// import { ThemeToggle } from "@/app/components/theme-toggle";

export default function SignInPage() {
  const [matricNumber, setMatricNumber] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!matricNumber.trim()) {
      setError("Please enter your matriculation number");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call with delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate authentication check
      const validMatricNumbers = ["MOUAU/20/12345", "MOUAU/21/67890"];
      if (!validMatricNumbers.includes(matricNumber.toUpperCase())) {
        throw new Error("Invalid credentials");
      }

      // Simulate successful login
      setIsLoading(false);
      setLoginSuccess(true);

      // Redirect after success
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    } catch (err) {
      setIsLoading(false);
      setError("Invalid matric number or password. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-accent/5 to-primary/5 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-lg">
        {/* Header with Back to Home and Theme Toggle */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home size={16} />
            Back to Home
          </Link>
          {/* <ThemeToggle /> */}
        </div>

        {/* Logo and Title - Centered and Standalone */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="p-3 rounded-xl relative">
              <div
                className="relative"
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              >
                <img
                  src="/mouau_logo.webp"
                  alt="MOUAU Logo"
                  className="h-12 w-12 object-contain select-none pointer-events-none transition-all duration-300"
                  draggable="false"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />
                {/* Success checkmark overlay */}
                {loginSuccess && (
                  <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1 animate-bounce">
                    <CheckCircle size={16} className="text-white" />
                  </div>
                )}
                {/* Transparent overlay to prevent right-click and drag */}
                <div
                  className="absolute inset-0 z-10"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                ></div>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                MOUAU ClassMate
              </h1>
              <p className="text-muted-foreground">
                {isLoading
                  ? "Signing you in..."
                  : loginSuccess
                  ? "Welcome back!"
                  : "Student Portal Sign In"}
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-error text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-error rounded-full"></span>
              {error}
            </p>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center mb-6 space-y-4">
            {/* Main Spinner */}
            <div className="relative">
              {/* Outer ring */}
              <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
              {/* Spinning ring */}
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              {/* Inner dot */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full"></div>
            </div>

            {/* Loading text */}
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Authenticating
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please wait while we verify your credentials
              </p>
            </div>

            {/* Animated dots */}
            <div className="flex space-x-1">
              <div
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        )}

        {/* Success State */}
        {loginSuccess && (
          <div className="flex flex-col items-center justify-center mb-6 space-y-4">
            {/* Success Animation */}
            <div className="relative">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              {/* Pulsing ring effect */}
              <div className="absolute inset-0 border-4 border-green-500 rounded-full animate-ping opacity-75"></div>
            </div>

            {/* Success text */}
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Login Successful!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Redirecting to your dashboard...
              </p>
            </div>
          </div>
        )}

        {/* Sign-in Form - Hidden during loading/success states */}
        {!isLoading && !loginSuccess && (
          <>
            <form onSubmit={handleSignIn} className="space-y-6">
              <div>
                <label
                  htmlFor="matricNumber"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Matriculation Number
                </label>
                <input
                  type="text"
                  id="matricNumber"
                  value={matricNumber}
                  onChange={(e) => {
                    setMatricNumber(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="e.g., MOUAU/20/12345"
                  className="form-input w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-foreground"
                  >
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter your password"
                  className="form-input w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 relative overflow-hidden group"
              >
                {/* Button background animation */}
                <div className="absolute inset-0 bg-linear-to-r from-primary to-primary/80 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>

                {/* Button content */}
                <span className="relative z-10 flex items-center gap-2">
                  Sign In
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform duration-300"
                  />
                </span>
              </button>
            </form>

            {/* Additional Links */}
            <div className="mt-6 space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  href="/auth/signup"
                  className="text-primary hover:underline font-medium"
                >
                  Sign up here
                </Link>
              </p>

              <div className="border-t border-border pt-4">
                <Link
                  href="/auth/help"
                  className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Lock size={12} />
                  Need help signing in?
                </Link>
              </div>
            </div>

            {/* Demo Credentials Hint */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground text-center">
                <strong>Demo Credentials:</strong>
                <br />
                Matric: <span className="font-mono">
                  MOUAU/20/12345
                </span> or <span className="font-mono">MOUAU/21/67890</span>
                <br />
                Password: <span className="font-mono">any password works</span>
              </p>
            </div>
          </>
        )}

        {/* Loading progress bar (subtle) */}
        {isLoading && (
          <div className="mt-4">
            <div className="w-full bg-muted rounded-full h-1">
              <div className="bg-primary h-1 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
