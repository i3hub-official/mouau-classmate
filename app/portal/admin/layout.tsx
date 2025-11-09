// File: app/teacher/layout.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TeacherSidebar } from "@/app/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/app/components/teacher/TeacherHeader";
import {
  useRoleProtection,
  clearRoleSelection,
  type UserRole,
} from "@/hooks/useRoleProtection";

// Define proper types
interface TeacherUser {
  id: string;
  name: string;
  email: string;
  role: "TEACHER" | "LECTURER" | "STUDENT" | "ADMIN";
  isActive: boolean;
  lastLoginAt?: Date;
  profile?: {
    firstName: string;
    lastName: string;
    department: string;
    employeeId: string;
    college: string;
    academicRank: string;
    photo?: string;
  };
}

interface AuthState {
  user: TeacherUser | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// In-memory session management
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds

// In-memory storage for session data
let sessionData = {
  token: null as string | null,
  user: null as TeacherUser | null,
  lastActivity: Date.now(),
};

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    isAuthenticated: false,
  });
  const [sessionWarning, setSessionWarning] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Use the role protection hook for teacher/lecturer routes
  const {
    isValid: hasValidRole,
    isLoading: roleLoading,
    roleData,
  } = useRoleProtection({
    requiredRole: ["teacher", "lecturer"],
    redirectTo: "/select-role",
    maxAge: 30,
  });

  // Session management functions using in-memory storage
  const clearSession = () => {
    sessionData.token = null;
    sessionData.user = null;
    sessionData.lastActivity = Date.now();
  };

  const updateLastActivity = () => {
    sessionData.lastActivity = Date.now();
  };

  const checkSessionExpiry = (): boolean => {
    const timeSinceLastActivity = Date.now() - sessionData.lastActivity;
    return timeSinceLastActivity > SESSION_TIMEOUT;
  };

  const showSessionWarning = () => {
    const timeSinceLastActivity = Date.now() - sessionData.lastActivity;
    const warningThreshold = SESSION_TIMEOUT - 5 * 60 * 1000; // 5 minutes before expiry

    if (timeSinceLastActivity > warningThreshold) {
      setSessionWarning(true);
    }
  };

  // Check if current path requires authentication
  const isAuthRequiredPath = (path: string): boolean => {
    const publicPaths = [
      "/teacher/signup",
      "/teacher/signin",
      "/teacher/forgot-password",
    ];
    return !publicPaths.some((publicPath) => path.startsWith(publicPath));
  };

  // Mock authentication service
  const authenticateTeacher = async (): Promise<TeacherUser> => {
    // Check in-memory storage first
    if (sessionData.user && sessionData.token && !checkSessionExpiry()) {
      updateLastActivity();
      return sessionData.user;
    }

    // If no valid session, check for auth token in cookies
    const authToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth_token="))
      ?.split("=")[1];

    if (!authToken) {
      throw new Error("No authentication token found");
    }

    // Mock API call to verify teacher
    const response = await fetch("/api/auth/teacher/verify", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Authentication failed");
    }

    const userData: TeacherUser = await response.json();

    // Validate user role
    if (userData.role !== "TEACHER" && userData.role !== "LECTURER") {
      throw new Error("Access denied. Teacher/Lecturer role required.");
    }

    // Store in-memory
    sessionData.user = userData;
    sessionData.token = authToken;
    updateLastActivity();

    return userData;
  };

  // Main authentication effect - only runs for protected routes or authenticated users
  useEffect(() => {
    // If we're on a public route (signup) and user has valid role, no need to authenticate
    if (
      !isAuthRequiredPath(pathname) &&
      hasValidRole &&
      !authState.isAuthenticated
    ) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // If we're on a protected route OR user needs authentication, proceed with auth check
    if (isAuthRequiredPath(pathname) || authState.isAuthenticated) {
      let isMounted = true;
      let timeoutId: NodeJS.Timeout;

      const performAuthCheck = async (retryCount = 0) => {
        try {
          if (!isMounted) return;

          // Set timeout for auth check
          timeoutId = setTimeout(() => {
            if (isMounted) {
              setAuthState((prev) => ({
                ...prev,
                isLoading: false,
                error: "Authentication check timed out. Please try again.",
              }));
            }
          }, 15000);

          const user = await authenticateTeacher();

          if (!isMounted) return;
          clearTimeout(timeoutId);

          setAuthState({
            user,
            isLoading: false,
            error: null,
            isAuthenticated: true,
          });

          // If authenticated user is on signup page, redirect to dashboard
          if (pathname === "/teacher/signup") {
            router.push("/teacher/student/dashboard");
            return;
          }
        } catch (error) {
          if (!isMounted) return;
          clearTimeout(timeoutId);

          console.error("Authentication error:", error);

          // Retry logic for network errors
          if (
            retryCount < 2 &&
            error instanceof Error &&
            error.message.includes("fetch")
          ) {
            setTimeout(
              () => performAuthCheck(retryCount + 1),
              1000 * (retryCount + 1)
            );
            return;
          }

          const errorMessage =
            error instanceof Error
              ? error.message
              : "Authentication failed. Please log in again.";

          setAuthState({
            user: null,
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });

          // Clear invalid session
          clearSession();

          // Only redirect to login if we're on a protected path
          if (isAuthRequiredPath(pathname) && pathname !== "/teacher/signup") {
            setTimeout(() => {
              router.push(
                "/auth/signin?redirect=" + encodeURIComponent(pathname)
              );
            }, 2000);
          }
        }
      };

      performAuthCheck();

      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
      };
    }
  }, [router, pathname, authState.isAuthenticated, hasValidRole]);

  // Session expiry monitoring (only for authenticated users)
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    const updateActivity = () => {
      updateLastActivity();
      setSessionWarning(false);
    };

    // Update activity on user interaction
    activityEvents.forEach((event) => {
      document.addEventListener(event, updateActivity);
    });

    // Check for session warning every minute
    const warningInterval = setInterval(showSessionWarning, 60000);

    // Check for session expiry every 30 seconds
    const expiryInterval = setInterval(() => {
      if (checkSessionExpiry()) {
        handleSessionExpiry();
      }
    }, 30000);

    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, updateActivity);
      });
      clearInterval(warningInterval);
      clearInterval(expiryInterval);
    };
  }, [authState.isAuthenticated]);

  const handleSessionExpiry = () => {
    clearSession();
    clearRoleSelection();
    setAuthState({
      user: null,
      isLoading: false,
      error: "Your session has expired. Please log in again.",
      isAuthenticated: false,
    });
    router.push("/auth/signin?message=session_expired");
  };

  const handleExtendSession = async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        updateLastActivity();
        setSessionWarning(false);
      } else {
        handleSessionExpiry();
      }
    } catch (error) {
      handleSessionExpiry();
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearSession();
      clearRoleSelection();
      setAuthState({
        user: null,
        isLoading: false,
        error: null,
        isAuthenticated: false,
      });
      router.push("/auth/signin");
    }
  };

  // Show loading state for role validation or auth check
  if (roleLoading || authState.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            {roleLoading
              ? "Verifying role access..."
              : "Checking authentication..."}
          </p>
        </div>
      </div>
    );
  }

  // Handle unauthorized role access to teacher routes
  if (!hasValidRole && !authState.isAuthenticated) {
    // The useRoleProtection hook will automatically redirect, but we show a message meanwhile
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto p-6 bg-card rounded-lg border border-border shadow-lg">
          <div className="mb-4 text-warning">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Redirecting...
          </h2>
          <p className="text-muted-foreground mb-4">
            Please select Teacher/Lecturer role to access this page.
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  // Handle unauthenticated access to protected routes
  if (isAuthRequiredPath(pathname) && !authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto p-6 bg-card rounded-lg border border-border shadow-lg">
          <div className="mb-4 text-warning">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Authentication Required
          </h2>
          <p className="text-muted-foreground mb-4">
            {authState.error ||
              "Please sign in to access the teacher dashboard."}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push("/auth/signin")}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Sign In
            </button>

            <button
              onClick={() => router.push("/select-role")}
              className="px-4 py-2 border border-border text-foreground rounded-md hover:bg-accent transition-colors"
            >
              Select Role
            </button>
          </div>
        </div>
      </div>
    );
  }

  // For unauthenticated users on public routes (like signup), render without layout
  if (!authState.isAuthenticated && !isAuthRequiredPath(pathname)) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // Don't render layout if not authenticated on protected routes
  if (!authState.isAuthenticated || !authState.user) {
    return null;
  }

  // Render full teacher layout for authenticated users on protected routes
  return (
    <div className="flex h-screen bg-background">
      {/* Session Warning Modal */}
      {sessionWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg border border-warning/20 p-6 max-w-md w-full shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-warning/10 rounded-full">
                <svg
                  className="w-6 h-6 text-warning"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Session Expiring Soon
              </h3>
            </div>

            <p className="text-muted-foreground mb-4">
              Your session will expire in 5 minutes. Do you want to extend your
              session?
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleExtendSession}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Extend Session
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 border border-border text-foreground rounded-md hover:bg-accent transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      <TeacherSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={authState.user}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader
          onMenuClick={() => setSidebarOpen(true)}
          user={authState.user}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-auto bg-accent/5">
          <div className="container mx-auto p-4 md:p-6 max-w-7xl">
            {/* Welcome Banner */}
            <div className="mb-6 p-4 bg-linear-to-r from-primary/10 to-accent/10 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    Welcome back,{" "}
                    {authState.user.profile?.firstName || "Teacher"}!
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {authState.user.profile?.department} •{" "}
                    {authState.user.profile?.college}
                  </p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Academic Rank: {authState.user.profile?.academicRank}</p>
                  <p>Employee ID: {authState.user.profile?.employeeId}</p>
                </div>
              </div>
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
