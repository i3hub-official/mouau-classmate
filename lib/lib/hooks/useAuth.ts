// lib/hooks/useAuth.ts
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  matricNumber: string;
  department: string;
  college: string;
  course: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const signIn = useCallback(async (matricNumber: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ matricNumber, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    router.push("/auth/signin");
  }, [router]);

  return {
    user,
    isLoading,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };
}
