// File: app/auth/signin/page.tsx

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Home,
  Lock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";

export default function SignInPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, isLoading } = useAuth();
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Smart detection of user type based on input
  const detectUserType = (input: string): "student" | "teacher" | "admin" => {
    const trimmedInput = input.trim().toUpperCase();

    // Student: Matric number pattern MOUAU/XX/XXX or variations
    if (/^MOUAU\/\d{2,3}\/\d{3,5}(?:\/\d{2})?$/.test(trimmedInput)) {
      return "student";
    }

    // Teacher: University email domain
    if (/@mouau\.edu\.ng$/i.test(input)) {
      return "teacher";
    }

    // Admin: Any other email (will be validated by backend)
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
      return "admin";
    }

    // Default to student for any non-email input that doesn't match matric pattern
    return "student";
  };

  const getPlaceholder = () => {
    return "Enter your matric number or email";
  };

  const getInputType = (input: string): "text" | "email" => {
    // If it contains @, treat as email for better mobile keyboard
    return input.includes("@") ? "email" : "text";
  };

  const getAutoComplete = (input: string): string => {
    const userType = detectUserType(input);
    return userType === "student" ? "username" : "email";
  };

  const validateIdentifier = (
    input: string
  ): { isValid: boolean; error?: string } => {
    if (!input.trim()) {
      return {
        isValid: false,
        error: "Please enter your matric number or email",
      };
    }

    const userType = detectUserType(input);

    switch (userType) {
      case "student":
        if (
          !/^MOUAU\/\d{2,3}\/\d{3,5}(?:\/\d{2})?$/i.test(input.toUpperCase())
        ) {
          return {
            isValid: false,
            error: "Please enter a valid matric number (e.g., MOUAU/20/12345)",
          };
        }
        break;

      case "teacher":
        if (!/@mouau\.edu\.ng$/i.test(input)) {
          return {
            isValid: false,
            error: "Please use your university email (@mouau.edu.ng)",
          };
        }
        break;

      case "admin":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
          return {
            isValid: false,
            error: "Please enter a valid email address",
          };
        }
        break;
    }

    return { isValid: true };
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    const validation = validateIdentifier(identifier);
    if (!validation.isValid) {
      setError(validation.error!);
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    // Auto-detect user type and prepare credentials
    const userType = detectUserType(identifier);
    const credentials = {
      password,
      ...(userType === "student" && {
        matricNumber: identifier.toUpperCase(),
      }),
      ...((userType === "teacher" || userType === "admin") && {
        email: identifier.toLowerCase(),
      }),
    };

    const result = await signIn(credentials);

    if (result.success) {
      setLoginSuccess(true);
      // Redirect is handled in the useAuth hook
    } else {
      setError(result.error || "Authentication failed");
    }
  };

  const getHelperText = () => {
    if (!identifier) return "Enter your matric number or university email";

    const userType = detectUserType(identifier);

    switch (userType) {
      case "student":
        return "Matric number detected";
      case "teacher":
        return "University email detected";
      case "admin":
        return "Email detected";
      default:
        return "Enter your credentials";
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
          <ThemeToggle />
        </div>

        {/* Logo and Title */}
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
                {loginSuccess && (
                  <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1 animate-bounce">
                    <CheckCircle size={16} className="text-white" />
                  </div>
                )}
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
                  : "University Portal Sign In"}
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
                className="text-destructive mt-0.5 shrink-0"
              />
              <div className="flex-1">
                <p className="text-destructive text-sm font-medium mb-1">
                  Sign In Failed
                </p>
                <p className="text-destructive text-sm opacity-90">{error}</p>
                {/* Show helpful actions based on error type */}
                {(error.includes("verify") ||
                  error.includes("Verification")) && (
                  <div className="mt-2">
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
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full"></div>
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Authenticating...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please wait while we verify your credentials
              </p>
            </div>

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
            <div className="relative">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <div className="absolute inset-0 border-4 border-green-500 rounded-full animate-ping opacity-75"></div>
            </div>

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
                  htmlFor="identifier"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Matric Number or Email
                </label>
                <input
                  type={getInputType(identifier)}
                  id="identifier"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder={getPlaceholder()}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                  autoComplete={getAutoComplete(identifier)}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {getHelperText()}
                </p>
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
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors pr-12"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !identifier.trim() || !password.trim()}
                className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-linear-to-r from-primary to-primary/80 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
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

            {/* Additional Links */}
            <div className="mt-6 space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Student without an account?{" "}
                <Link
                  href="/portal/student/signup"
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

        {/* Loading progress bar */}
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
