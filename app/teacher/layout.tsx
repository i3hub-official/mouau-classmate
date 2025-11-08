// app/teacher/layout.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TeacherSidebar } from "@/app/components/teacher/TeacherSidebar";
import { TeacherHeader } from "@/app/components/teacher/TeacherHeader";
import { TeacherAuthService } from "@/lib/services/teachers";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get the current authenticated user
        const currentUser = await TeacherAuthService.getCurrentUser();

        if (!currentUser || !currentUser.id) {
          // User is not authenticated, redirect to login
          router.push("/auth/teacher-signin");
          return;
        }

        // Check if User has teacher role
        if (currentUser.role !== "TEACHER") {
          // User is authenticated but not a teacher, redirect to appropriate page
          if (currentUser.role === "STUDENT") {
            router.push("/dashboard");
          } else {
            router.push("/select-role");
          }
          return;
        }

        // User is authenticated and is a teacher
        setUser(currentUser);
        setLoading(false);
      } catch (error) {
        console.error("Authentication check failed:", error);
        // If there's an error, redirect to login
        router.push("/auth/teacher-signin");
      }
    };

    checkAuth();
  }, [router]);

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

  // If not authenticated or not a teacher, component will redirect
  // Only render layout if user is authenticated and is a teacher
  if (!user) {
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
