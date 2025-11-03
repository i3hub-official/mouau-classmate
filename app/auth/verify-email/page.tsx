// app/auth/verify-email/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get parameters from URL (new security structure)
  const verificationCode = searchParams.get("t"); // Code
  const encodedEmail = searchParams.get("e"); // Encoded email
  const hash = searchParams.get("h"); // Timestamp hash
  const statusParam = searchParams.get("status"); // For GET redirect
  const messageParam = searchParams.get("message"); // For GET redirect

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);

  useEffect(() => {
    // Handle GET redirect status
    if (statusParam) {
      setStatus(statusParam as any);
      setMessage(messageParam || "");

      if (statusParam === "success") {
        setTimeout(() => {
          router.push("/auth/signin");
        }, 3000);
      }
      return;
    }

    // If verification code is provided in URL, automatically verify
    if (verificationCode) {
      verifyEmailCode(verificationCode, encodedEmail || undefined);
    }
  }, [verificationCode, encodedEmail, statusParam, messageParam]);

  const verifyEmailCode = async (code: string, email?: string) => {
    if (!code.trim()) {
      setMessage("Please enter a verification code");
      return;
    }

    setStatus("loading");
    setMessage("Verifying your email...");

    try {
      const response = await fetch("/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          encodedEmail: email,
          hash: hash,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus("success");
        setMessage(
          result.message || "Email verified successfully! You can now sign in."
        );

        // Redirect to login page after 3 seconds
        setTimeout(() => {
          router.push("/auth/signin");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(
          result.error?.message || "Verification failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Verification error:", error);
      setStatus("error");
      setMessage(
        "Verification failed. Please check your connection and try again."
      );
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyEmailCode(manualCode);
  };

  const handleResendEmail = async () => {
    setStatus("loading");
    setMessage("Sending new verification email...");

    try {
      const response = await fetch("/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        setStatus("success");
        setMessage("New verification email sent! Please check your inbox.");
      } else {
        setStatus("error");
        setMessage(
          result.error?.message || "Failed to resend verification email."
        );
      }
    } catch (error) {
      console.error("Resend error:", error);
      setStatus("error");
      setMessage("Failed to resend verification email. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-primary/5 to-accent/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border-2 border-primary/20">
            <svg
              className="h-8 w-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-foreground">
            Verify Your Email
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Please verify your email address to complete your registration
          </p>
        </div>

        {/* Status Messages */}
        {status === "loading" && (
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
            <div className="flex">
              <div className="shrink-0">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">{message}</p>
              </div>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
            <div className="flex">
              <div className="shrink-0">
                <svg
                  className="h-5 w-5 text-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">{message}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Redirecting to login page...
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4">
            <div className="flex">
              <div className="shrink-0">
                <svg
                  className="h-5 w-5 text-destructive"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-destructive">
                  {message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Manual Code Entry */}
        {!verificationCode && status === "idle" && !statusParam && (
          <div className="bg-card py-8 px-6 shadow-lg rounded-2xl border border-border sm:px-10">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Check your email for the verification link, or enter the code
                  manually below.
                </p>

                {!showManualEntry ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => setShowManualEntry(true)}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
                    >
                      Enter Verification Code Manually
                    </button>

                    <button
                      onClick={handleResendEmail}
                      className="w-full flex justify-center py-3 px-4 border-2 border-border rounded-xl shadow-sm text-sm font-medium text-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
                    >
                      Resend Verification Email
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="code"
                        className="block text-sm font-medium text-foreground"
                      >
                        Verification Code
                      </label>
                      <input
                        id="code"
                        name="code"
                        type="text"
                        required
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Enter the code from your email"
                        className="mt-1 block w-full border border-border rounded-xl shadow-sm py-3 px-4 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
                      >
                        Verify Email
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowManualEntry(false)}
                        className="flex-1 flex justify-center py-3 px-4 border-2 border-border rounded-xl shadow-sm text-sm font-medium text-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Success Actions */}
        {status === "success" && (
          <div className="text-center">
            <Link
              href="/auth/signin"
              className="font-medium text-primary hover:text-primary/80 transition-colors duration-200"
            >
              Go to Sign In
            </Link>
          </div>
        )}

        {/* Error Actions */}
        {status === "error" && (
          <div className="text-center space-y-3">
            <button
              onClick={handleResendEmail}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
            >
              Resend Verification Email
            </button>

            <Link
              href="/auth/signin"
              className="block text-sm font-medium text-primary hover:text-primary/80 transition-colors duration-200"
            >
              Return to Sign In
            </Link>
          </div>
        )}

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Didn't receive the email? Check your spam folder or contact support.
          </p>
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense
function VerifyEmailLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-primary/5 to-accent/10">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading verification...</p>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
