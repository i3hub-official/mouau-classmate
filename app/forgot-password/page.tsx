// File: app/forgot-password/page.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ArrowRight,
  Home,
  Lock,
  CheckCircle,
  ArrowLeft,
  Key,
} from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic email validation
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        setError(
          data.message || "Failed to send reset link. Please try again."
        );
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetForm = () => {
    setEmail("");
    setIsSuccess(false);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-accent/5 to-primary/5 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Sign In
          </Link>
          <ThemeToggle />
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="p-3 border-2 rounded-xl">
              <img
                src="/mouau_logo.webp"
                alt="MOUAU Logo"
                className="h-12 w-12 object-contain"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                MOUAU ClassMate
              </h1>
              <p className="text-muted-foreground">Reset Your Password</p>
            </div>
          </div>
        </div>

        {/* Success State */}
        {isSuccess && (
          <div className="text-center space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              {/* Success Icon */}
              <div className="p-4 bg-green-500/10 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>

              {/* Success Message */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Check Your Email
                </h2>
                <p className="text-muted-foreground mb-4">
                  We've sent a password reset link to:
                </p>
                <p className="font-mono text-sm bg-muted p-3 rounded-lg border border-border">
                  {email}
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-left">
                <div className="flex items-start gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      What to do next:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>
                        • Check your inbox for an email from MOUAU ClassMate
                      </li>
                      <li>• Click the reset link in the email</li>
                      <li>• Create your new password</li>
                      <li>• Sign in with your new credentials</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-1 w-full">
                <Link
                  href="/signin"
                  className="flex-1 py-2 sm:py-2.5 bg-primary text-sm text-white font-medium rounded-md hover:bg-primary/90 transition-colors text-center flex items-center justify-center"
                >
                  Back to Sign In
                </Link>
              </div>

              {/* Help Text */}
              <div className="text-xs text-muted-foreground">
                <p>Didn't receive the email? Check your spam folder or </p>
                <button
                  onClick={handleResetForm}
                  className="text-primary hover:underline font-medium"
                >
                  try again with a different email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Form */}
        {!isSuccess && (
          <>
            <div className="text-center mb-6">
              <div className="p-3 bg-primary/10 rounded-lg inline-flex mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Forgot Your Password?
              </h2>
              <p className="text-muted-foreground">
                Enter your email address and we'll send you a link to reset your
                password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
                  <p className="text-error text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-error rounded-full"></span>
                    {error}
                  </p>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Email Address <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Enter your registered email"
                    className={`form-input w-full pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                      error ? "border-error" : ""
                    }`}
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Enter the email address associated with your MOUAU ClassMate
                  account
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              >
                {/* Loading overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-primary/80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  </div>
                )}

                {/* Button content */}
                <span
                  className={`flex items-center gap-2 ${
                    isLoading ? "opacity-0" : "opacity-100"
                  }`}
                >
                  Send Reset Link
                  <ArrowRight size={18} />
                </span>
              </button>
            </form>

            {/* "I have remembered my password" Link */}
            <div className="mt-4 text-center">
              <Link
                href="/signin"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium transition-colors group"
              >
                <Key
                  size={16}
                  className="group-hover:scale-110 transition-transform"
                />
                I have remembered my password
              </Link>
            </div>

            {/* Additional Help */}
            <div className="mt-6 space-y-4">
              {/* Security Notice */}
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="flex items-start gap-3">
                  <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Security Notice
                    </p>
                    <p className="text-xs text-muted-foreground">
                      The password reset link will expire in 1 hour for security
                      reasons. If you don't reset your password within this
                      time, you'll need to request a new link.
                    </p>
                  </div>
                </div>
              </div>

              {/* Support Link */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Still having trouble?{" "}
                  <Link
                    href="/auth/help"
                    className="text-primary hover:underline font-medium"
                  >
                    Contact support
                  </Link>
                </p>
              </div>
            </div>
          </>
        )}

        {/* Footer Links */}
        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              ← Back to Home
            </Link>
            <div className="flex gap-4">
              <Link
                href="/auth/help"
                className="hover:text-foreground transition-colors"
              >
                Help
              </Link>
              <Link
                href="/auth/privacy"
                className="hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
