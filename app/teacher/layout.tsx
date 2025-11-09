"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TeacherSidebar } from "@/app/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/app/components/teacher/TeacherHeader";

// Define a proper type for the user object
interface TeacherUser {
  id: string;
  name: string;
  email: string;
  role: "TEACHER" | "STUDENT" | "ADMIN";
  isActive: boolean;
  lastLoginAt?: Date;
  profile?: {
    firstName: string;
    lastName: string;
    department: string;
    employeeId: string;
  };
}

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<TeacherUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const checkAuth = async (retryCount = 0) => {
      try {
        // Set a timeout for the authentication check
        timeoutId = setTimeout(() => {
          if (isMounted) {
            setError("Authentication check timed out. Please try again.");
            setLoading(false);
          }
        }, 10000); // 10 seconds timeout

        // Get the current authenticated user
        // Note: This method should be implemented in your

        // User is authenticated and is a teacher

        setLoading(false);
        setAuthChecked(true);
      } catch (error) {
        clearTimeout(timeoutId);

        if (!isMounted) return;

        console.error("Authentication check failed:", error);

        // Retry up to 2 times if it's a network error
        if (
          retryCount < 2 &&
          error instanceof Error &&
          error.message.includes("fetch")
        ) {
          setTimeout(() => checkAuth(retryCount + 1), 1000);
          return;
        }

        setError("Failed to verify authentication. Please try again.");
        setLoading(false);
        setAuthChecked(true);
      }
    };

    checkAuth();

    return () => {
      clearTimeout(timeoutId);
      isMounted = false;
    };
  }, [router]);

  // Function to retry authentication
  const handleRetryAuth = () => {
    setLoading(true);
    setError(null);
    setAuthChecked(false);

    // Trigger the useEffect again
    router.refresh();
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            Verifying authentication...
          </p>
        </div>
      </div>
    );
  }

  // Show error state if authentication failed
  if (error && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-4 text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto"
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
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={handleRetryAuth}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // If not authenticated or not a teacher, component will redirect
  // Only render layout if user is authenticated and is a teacher
  if (!user || !authChecked) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <TeacherSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TeacherHeader onMenuClick={() => setSidebarOpen(true)} user={user} />

        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
