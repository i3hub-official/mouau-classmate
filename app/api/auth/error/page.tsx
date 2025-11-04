// app/auth/error/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Home,
  ArrowLeft,
  ShieldAlert,
  Mail,
  Lock,
} from "lucide-react";

export default function AuthError() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error");
  const [isLoading, setIsLoading] = useState(false);

  const getErrorDetails = (error: string | null) => {
    switch (error) {
      case "CredentialsSignin":
        return {
          title: "Invalid Credentials",
          message: "The matric number or password you entered is incorrect.",
          icon: <Lock className="h-8 w-8" />,
          color: "text-red-500",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
        };
      case "AccountNotVerified":
        return {
          title: "Email Not Verified",
          message:
            "Please verify your email address before signing in. Check your inbox for the verification link.",
          icon: <Mail className="h-8 w-8" />,
          color: "text-amber-500",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
        };
      case "AccountInactive":
        return {
          title: "Account Deactivated",
          message:
            "Your account has been deactivated. Please contact support for assistance.",
          icon: <ShieldAlert className="h-8 w-8" />,
          color: "text-red-500",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
        };
      case "AccountLocked":
        return {
          title: "Account Temporarily Locked",
          message:
            "Too many failed login attempts. Your account is locked for 30 minutes. Please try again later.",
          icon: <Lock className="h-8 w-8" />,
          color: "text-orange-500",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
        };
      case "Configuration":
        return {
          title: "Server Configuration Error",
          message:
            "There's a problem with the server configuration. Please try again later.",
          icon: <AlertCircle className="h-8 w-8" />,
          color: "text-purple-500",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
        };
      case "AccessDenied":
        return {
          title: "Access Denied",
          message: "You do not have permission to sign in.",
          icon: <ShieldAlert className="h-8 w-8" />,
          color: "text-red-500",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
        };
      case "Verification":
        return {
          title: "Verification Required",
          message:
            "The verification link was invalid or has expired. Please request a new one.",
          icon: <Mail className="h-8 w-8" />,
          color: "text-blue-500",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
        };
      default:
        return {
          title: "Authentication Error",
          message:
            "An unexpected error occurred during authentication. Please try again.",
          icon: <AlertCircle className="h-8 w-8" />,
          color: "text-gray-500",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
        };
    }
  };

  const errorDetails = getErrorDetails(error);

  const handleRetry = () => {
    setIsLoading(true);
    router.push("/auth/signin");
  };

  const handleGoHome = () => {
    setIsLoading(true);
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-accent/5 to-primary/5 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home size={16} />
            Back to Home
          </Link>
        </div>

        {/* Error Icon and Title */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${errorDetails.bgColor} ${errorDetails.borderColor} border-2 mb-4`}
          >
            <div className={errorDetails.color}>{errorDetails.icon}</div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {errorDetails.title}
          </h1>
          <p className="text-muted-foreground">
            We encountered an issue with your sign-in
          </p>
        </div>

        {/* Error Message */}
        <div
          className={`p-4 rounded-lg border ${errorDetails.borderColor} ${errorDetails.bgColor} mb-6`}
        >
          <p className="text-sm text-muted-foreground">
            {errorDetails.message}
          </p>
        </div>

        {/* Error Code (if present) */}
        {error && (
          <div className="bg-muted/50 p-3 rounded-lg mb-6">
            <p className="text-xs text-muted-foreground text-center">
              Error code:{" "}
              <code className="font-mono bg-muted px-2 py-1 rounded">
                {error}
              </code>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            disabled={isLoading}
            className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                <ArrowLeft size={18} />
                Back to Sign In
              </>
            )}
          </button>

          <button
            onClick={handleGoHome}
            disabled={isLoading}
            className="w-full py-2 bg-transparent text-foreground font-medium rounded-lg hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-border flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Go to Homepage
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Need help with your account?
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href="/auth/forgot-password"
                className="text-xs text-primary hover:underline font-medium"
              >
                Forgot Password?
              </Link>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                •
              </span>

              <Link
                href="/support"
                className="text-xs text-primary hover:underline font-medium"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </div>

        {/* Technical Details (for development) */}
        {process.env.NODE_ENV === "development" && error && (
          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800 font-medium mb-1">
              Development Info:
            </p>
            <p className="text-xs text-yellow-700">Error type: {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
