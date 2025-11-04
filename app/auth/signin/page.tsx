// app/auth/signin/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Home, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [matricNumber, setMatricNumber] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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
      // Call our custom API endpoint instead of NextAuth
      const response = await fetch("/auth/signin/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matricNumber: matricNumber.trim().toUpperCase(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Use the specific error message from our API
        throw new Error(data.error || "Authentication failed");
      }

      // Successful login
      setIsLoading(false);
      setLoginSuccess(true);

      // Redirect to dashboard after success
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh(); // Refresh to update auth state
      }, 1500);
    } catch (err) {
      setIsLoading(false);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    }
  };

  // Demo login for testing
  const handleDemoLogin = async (demoMatric: string) => {
    setMatricNumber(demoMatric);
    setPassword("demoPassword123!");

    // Auto-submit after a brief delay
    setTimeout(() => {
      const form = document.querySelector("form");
      if (form) {
        const submitEvent = new Event("submit", {
          cancelable: true,
          bubbles: true,
        });
        form.dispatchEvent(submitEvent);
      }
    }, 500);
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
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="text-destructive mt-0.5 flex-shrink-0"
              />
              <div className="flex-1">
                <p className="text-destructive text-sm font-medium mb-1">
                  Sign In Failed
                </p>
                <p className="text-destructive text-sm opacity-90">{error}</p>
                {/* Show helpful actions based on error type */}
                {(error.includes("verify") ||
                  error.includes("Verification")) && (
                  <div className="mt-2 flex gap-2">
                    <Link
                      href="/auth/verify-email"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Resend verification email
                    </Link>
                  </div>
                )}
                {(error.includes("locked") || error.includes("Locked")) && (
                  <div className="mt-2 flex gap-2">
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Reset password
                    </Link>
                    <span className="text-xs text-muted-foreground">•</span>
                    <Link
                      href="/support"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Contact support
                    </Link>
                  </div>
                )}
                {error.includes("Invalid") && (
                  <div className="mt-2">
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot your password?
                    </Link>
                  </div>
                )}
              </div>
            </div>
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
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  autoComplete="username"
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
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 relative overflow-hidden group"
              >
                {/* Button background animation */}
                <div className="absolute inset-0 bg-linear-to-r from-primary to-primary/80 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>

                {/* Button content */}
                <span className="relative z-10 flex items-center gap-2">
                  {isLoading ? "Signing In..." : "Sign In"}
                  {!isLoading && (
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform duration-300"
                    />
                  )}
                </span>
              </button>
            </form>

            {/* Demo Credentials Section */}
            <div className="mt-6 space-y-3">
              <p className="text-xs text-muted-foreground text-center font-medium">
                Quick Demo Access
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleDemoLogin("MOUAU/20/12345")}
                  disabled={isLoading}
                  className="text-xs py-2 px-3 bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-border transition-colors text-foreground"
                >
                  Demo Student 1
                </button>
                <button
                  onClick={() => handleDemoLogin("MOUAU/21/67890")}
                  disabled={isLoading}
                  className="text-xs py-2 px-3 bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-border transition-colors text-foreground"
                >
                  Demo Student 2
                </button>
              </div>
            </div>

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
                  href="/support"
                  className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Lock size={12} />
                  Need help signing in?
                </Link>
              </div>
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
