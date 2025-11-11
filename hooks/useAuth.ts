// fILe: hooks/useAuth.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BaseUser, StudentUser } from "@/lib/types/shared/index";
import { TeacherUser } from "@/lib/types/teacher/index";
import { AdminUser } from "@/lib/types/admin/index";

type AuthUser = StudentUser | TeacherUser | AdminUser;

interface SignInCredentials {
  // Common identifier fields
  email?: string;
  matricNumber?: string; // For students
  employeeId?: string; // For teachers
  // Authentication
  password: string;
}

interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
  requiresVerification?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/user/me", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth status check failed:", error);
      setUser(null);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const signIn = useCallback(
    async (credentials: SignInCredentials): Promise<AuthResponse> => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 401) {
            return {
              success: false,
              error: data.error || "Invalid credentials",
              requiresVerification: data.requiresVerification,
            };
          }
          if (response.status === 403) {
            return {
              success: false,
              error: data.error || "Account not active or locked",
            };
          }
          if (response.status === 423) {
            return {
              success: false,
              error: data.error || "Account temporarily locked",
            };
          }
          throw new Error(data.error || "Authentication failed");
        }

        setUser(data.user);

        // Redirect based on role
        setTimeout(() => {
          switch (data.user.role) {
            case "STUDENT":
              router.push("/portal/student/dashboard");
              break;
            case "TEACHER":
              router.push("/portal/teacher/dashboard");
              break;
            case "ADMIN":
              router.push("/portal/admin/dashboard");
              break;
            default:
              router.push("/select-role");
          }
        }, 100);

        return { success: true, user: data.user };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Authentication failed";
        console.error("Sign in error:", error);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setUser(null);
      setIsLoading(false);
      router.push("/auth/signin");
    }
  }, [router]);

  // Role-based helper functions
  const hasRole = useCallback(
    (role: AuthUser["role"] | AuthUser["role"][]) => {
      if (!user) return false;
      if (Array.isArray(role)) {
        return role.includes(user.role);
      }
      return user.role === role;
    },
    [user]
  );

  const isStudent = useCallback(() => hasRole("STUDENT"), [hasRole]);
  const isTeacher = useCallback(() => hasRole("TEACHER"), [hasRole]);
  const isAdmin = useCallback(() => hasRole("ADMIN"), [hasRole]);

  // Role-based access control
  type StudentResources =
    | "courses"
    | "assignments"
    | "grades"
    | "profile"
    | "portfolio";
  type TeacherResources =
    | "courses"
    | "assignments"
    | "students"
    | "grades"
    | "attendance";
  type AdminResources = "users" | "courses" | "system" | "reports" | "audits";
  type ResourceKey = StudentResources | TeacherResources | AdminResources;

  const canAccess = useCallback(
    (resource: ResourceKey, action: string): boolean => {
      if (!user) return false;

      // Define role-based permissions
      const permissions = {
        STUDENT: {
          courses: ["view", "enroll"],
          assignments: ["view", "submit"],
          grades: ["view"],
          profile: ["view", "edit"],
          portfolio: ["create", "view", "edit"],
        },
        TEACHER: {
          courses: ["view", "create", "edit", "manage"],
          assignments: ["view", "create", "edit", "grade"],
          students: ["view", "manage"],
          grades: ["view", "assign", "publish"],
          attendance: ["view", "mark"],
        },
        ADMIN: {
          users: ["view", "create", "edit", "delete"],
          courses: ["view", "create", "edit", "delete"],
          system: ["manage", "configure"],
          reports: ["view", "generate"],
          audits: ["view"],
        },
      };

      const rolePermissions = permissions[user.role];
      return (
        (rolePermissions &&
          rolePermissions[resource as keyof typeof rolePermissions]?.includes(
            action
          )) ||
        false
      );
    },
    [user]
  );

  // Quick access to user-specific data
  const getUserIdentifier = useCallback(() => {
    if (!user) return null;

    switch (user.role) {
      case "STUDENT":
        return (user as StudentUser).matricNumber;
      case "TEACHER":
        return (user as TeacherUser).employeeId;
      case "ADMIN":
        return (user as AdminUser).email;
      default:
        return (user as BaseUser).email;
    }
  }, [user]);

  const getDisplayName = useCallback(() => {
    if (!user) return "";

    switch (user.role) {
      case "STUDENT":
        const student = user as StudentUser;
        return `${student.firstName} ${student.lastName}`;
      case "TEACHER":
        const teacher = user as TeacherUser;
        return `${teacher.firstName} ${teacher.lastName}`;
      case "ADMIN":
        return user.name || user.email;
      default:
        return (user as AuthUser).name || (user as AuthUser).email;
    }
  }, [user]);

  return {
    // State
    user,
    isLoading: isLoading || isInitializing,
    isInitializing,

    // Authentication methods
    signIn,
    signOut,
    checkAuthStatus,

    // Authentication state
    isAuthenticated: !!user,

    // Role checks
    hasRole,
    isStudent,
    isTeacher,
    isAdmin,

    // Access control
    canAccess,

    // User info helpers
    getUserIdentifier,
    getDisplayName,

    // Current role (convenience)
    currentRole: user?.role,
  };
}

// Hook for protecting routes
export function useRequireAuth(
  requiredRole?: AuthUser["role"] | AuthUser["role"][]
) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isInitializing && !auth.isAuthenticated) {
      router.push("/auth/signin");
      return;
    }

    if (!auth.isInitializing && auth.isAuthenticated && requiredRole) {
      const hasRequiredRole = Array.isArray(requiredRole)
        ? requiredRole.some((role) => auth.hasRole(role))
        : auth.hasRole(requiredRole);

      if (!hasRequiredRole) {
        // Redirect to unauthorized or dashboard based on role
        switch (auth.currentRole) {
          case "STUDENT":
            router.push("/portal/student/dashboard");
            break;
          case "TEACHER":
            router.push("/portal/teacher/dashboard");
            break;
          case "ADMIN":
            router.push("/portal/admin/dashboard");
            break;
          default:
            router.push("/unauthorized");
        }
      }
    }
  }, [
    auth.isAuthenticated,
    auth.isInitializing,
    auth.currentRole,
    requiredRole,
    router,
    auth.hasRole,
  ]);

  return auth;
}
