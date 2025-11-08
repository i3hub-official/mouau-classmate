"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  Key,
  Shield,
  AlertCircle,
  Clock,
} from "lucide-react";
import { ThemeToggle } from "@/app/components/theme-toggle";

// Client component that uses search params
function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: [] as string[],
  });

  // Get URL parameters
  const encodedEmail = searchParams.get("e");
  const token = searchParams.get("t");
  const hash = searchParams.get("h");

  useEffect(() => {
    // Immediately redirect if required parameters are missing
    if (!token || !encodedEmail) {
      router.push("/auth/signin");
      return;
    }
    verifyToken();
  }, [token, encodedEmail, router]);

  const verifyToken = async () => {
    // Double check parameters before making API call
    if (!token || !encodedEmail) {
      router.push("/auth/signin");
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-reset-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          encodedEmail,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        // Token is invalid or expired - redirect to signin
        console.log("Token verification failed:", data.message);
        router.push("/auth/signin");
        return;
      }

      // Token is valid, proceed to show form
      setIsVerifying(false);
    } catch (err) {
      console.error("Token verification error:", err);
      // On network error, redirect to signin for security
      router.push("/auth/signin");
    }
  };

  const validatePassword = (password: string) => {
    const feedback = [];
    let score = 0;

    // Length check
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push("At least 8 characters");
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("One lowercase letter");
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("One uppercase letter");
    }

    // Number check
    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push("One number");
    }

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 1;
    } else {
      feedback.push("One special character");
    }

    return { score, feedback };
  };

  const handlePasswordChange = (password: string) => {
    setFormData((prev) => ({ ...prev, password }));
    setPasswordStrength(validatePassword(password));
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score <= 1) return "bg-red-500";
    if (score <= 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = (score: number) => {
    if (score <= 1) return "Weak";
    if (score <= 3) return "Good";
    return "Strong";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.password || !formData.confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (passwordStrength.score < 3) {
      setError("Please use a stronger password");
      return;
    }

    // Final security check - should never happen if verification passed
    if (!token || !encodedEmail) {
      setError(
        "Security error: Invalid reset session. Please request a new password reset link."
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          encodedEmail,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        setError(data.message || "Failed to reset password. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state - only shown during brief verification period
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-accent/5 to-primary/5 p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Verifying Reset Link
          </h2>
          <p className="text-muted-foreground">
            Please wait while we verify your password reset link...
          </p>
        </div>
      </div>
    );
  }

  // Success state - only shown after successful password reset
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-accent/5 to-primary/5 p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Sign In
            </Link>
            <ThemeToggle />
          </div>

          {/* Success Content */}
          <div className="text-center space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              {/* Success Icon */}
              <div className="p-4 bg-green-500/10 rounded-full">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>

              {/* Success Message */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Password Reset Successfully!
                </h2>
                <p className="text-muted-foreground mb-4">
                  Your password has been updated successfully. You can now sign
                  in with your new password.
                </p>
              </div>

              {/* Security Notice */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-left w-full">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      Security Updated
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Your account password has been changed</li>
                      <li>• All existing sessions have been secured</li>
                      <li>• You can now sign in with your new password</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Link
                href="/auth/signin"
                className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors text-center flex items-center justify-center gap-2"
              >
                <Key size={18} />
                Sign In to ClassMate
              </Link>

              {/* Help Text */}
              <div className="text-xs text-muted-foreground">
                <p>Having trouble signing in? </p>
                <Link
                  href="/auth/help"
                  className="text-primary hover:underline font-medium"
                >
                  Contact support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If we reach here, it means token is valid and we can show the reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-accent/5 to-primary/5 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/auth/signin"
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
              <p className="text-muted-foreground">Create New Password</p>
            </div>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="p-3 bg-primary/10 rounded-lg inline-flex mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Reset Your Password
          </h2>
          <p className="text-muted-foreground">
            Create a new strong password for your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message - Only for form validation errors, not token errors */}
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
              <p className="text-error text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </p>
            </div>
          )}

          {/* New Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-2"
            >
              New Password <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={formData.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Enter your new password"
                className="form-input w-full pr-10 pl-4 py-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {formData.password && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Password strength:
                  </span>
                  <span
                    className={`font-medium ${
                      passwordStrength.score <= 1
                        ? "text-red-500"
                        : passwordStrength.score <= 3
                        ? "text-yellow-500"
                        : "text-green-500"
                    }`}
                  >
                    {getPasswordStrengthText(passwordStrength.score)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(
                      passwordStrength.score
                    )}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  ></div>
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <p>Requirements:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      {passwordStrength.feedback.map((item, index) => (
                        <li key={index} className="text-red-500">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Confirm New Password <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
                placeholder="Confirm your new password"
                className="form-input w-full pr-10 pl-4 py-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formData.confirmPassword &&
              formData.password !== formData.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">
                  Passwords do not match
                </p>
              )}
          </div>

          {/* Password Requirements */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <div className="flex items-start gap-3">
              <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Password Requirements
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• One uppercase letter (A-Z)</li>
                  <li>• One lowercase letter (a-z)</li>
                  <li>• One number (0-9)</li>
                  <li>• One special character (!@#$% etc.)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              isLoading ||
              passwordStrength.score < 3 ||
              formData.password !== formData.confirmPassword
            }
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
              <Lock size={18} />
              Reset Password
            </span>
          </button>
        </form>

        {/* Additional Help */}
        <div className="mt-6 space-y-4">
          {/* Security Notice */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Security Notice
                </p>
                <p className="text-xs text-muted-foreground">
                  This reset link will expire in 1 hour. For security reasons,
                  please complete the password reset process immediately.
                </p>
              </div>
            </div>
          </div>

          {/* Support Link */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Need help?{" "}
              <Link
                href="/auth/help"
                className="text-primary hover:underline font-medium"
              >
                Contact support
              </Link>
            </p>
          </div>
        </div>

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

// Main page component with Suspense
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-accent/5 to-primary/5 p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-8 shadow-lg text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Loading...
            </h2>
            <p className="text-muted-foreground">
              Preparing password reset form...
            </p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
