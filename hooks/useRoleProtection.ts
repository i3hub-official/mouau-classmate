// hooks/useRoleProtection.ts
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type UserRole = "student" | "teacher" | "lecturer";

interface RoleProtectionConfig {
  requiredRole: UserRole | UserRole[];
  redirectTo?: string;
  maxAge?: number; // in minutes
}

interface RoleData {
  role: UserRole;
  timestamp: number;
  email?: string;
}

// In-memory storage as fallback (will be lost on page refresh, but works everywhere)
let inMemoryRoleData: RoleData | null = null;

// Helper to safely check if sessionStorage is available
const isSessionStorageAvailable = (): boolean => {
  try {
    if (typeof window === "undefined") return false;
    const test = "__storage_test__";
    window.sessionStorage.setItem(test, test);
    window.sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

export const useRoleProtection = (config: RoleProtectionConfig) => {
  const router = useRouter();
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [roleData, setRoleData] = useState<RoleData | null>(null);

  useEffect(() => {
    let isMounted = true;

    const validateRole = () => {
      if (!isMounted) return;

      setIsLoading(true);

      try {
        let data: RoleData | null = null;

        // Check sessionStorage first if available
        if (isSessionStorageAvailable()) {
          const storedData = sessionStorage.getItem("selectedRole");
          if (storedData) {
            data = JSON.parse(storedData);
            // Sync to in-memory
            inMemoryRoleData = data;
          }
        }

        // Fallback to in-memory if sessionStorage not available or empty
        if (!data && inMemoryRoleData) {
          data = inMemoryRoleData;
        }

        if (!data) {
          throw new Error("No role selected");
        }

        // Check if data is expired (default 30 minutes)
        const maxAge = (config.maxAge || 30) * 60 * 1000;
        const isExpired = Date.now() - data.timestamp > maxAge;

        if (isExpired) {
          inMemoryRoleData = null;
          if (isSessionStorageAvailable()) {
            sessionStorage.removeItem("selectedRole");
          }
          throw new Error("Role selection expired");
        }

        const requiredRoles = Array.isArray(config.requiredRole)
          ? config.requiredRole
          : [config.requiredRole];

        if (!requiredRoles.includes(data.role)) {
          throw new Error(
            `Invalid role. Expected: ${requiredRoles.join(" or ")}`
          );
        }

        if (!isMounted) return;
        setIsValid(true);
        setRoleData(data);
      } catch (error) {
        if (!isMounted) return;
        console.error("Role validation failed:", error);
        inMemoryRoleData = null;
        if (isSessionStorageAvailable()) {
          sessionStorage.removeItem("selectedRole");
        }
        router.push(config.redirectTo || "/sr");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    validateRole();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  return { isValid, isLoading, roleData };
};

export const setRoleWithExpiration = (
  role: UserRole,
  email?: string,
  maxAge: number = 30
) => {
  const roleData: RoleData = {
    role,
    timestamp: Date.now(),
    email,
  };
  inMemoryRoleData = roleData;

  // Also store in sessionStorage if available
  if (isSessionStorageAvailable()) {
    sessionStorage.setItem("selectedRole", JSON.stringify(roleData));
  }
};

export const clearRoleSelection = () => {
  inMemoryRoleData = null;

  // Also clear from sessionStorage if available
  if (isSessionStorageAvailable()) {
    sessionStorage.removeItem("selectedRole");
  }
};

export const getCurrentRole = (): {
  role: UserRole | null;
  isValid: boolean;
  data: RoleData | null;
} => {
  try {
    let data: RoleData | null = null;

    // Check sessionStorage first if available
    if (isSessionStorageAvailable()) {
      const storedData = sessionStorage.getItem("selectedRole");
      if (storedData) {
        data = JSON.parse(storedData);
        // Sync to in-memory
        inMemoryRoleData = data;
      }
    }

    // Fallback to in-memory
    if (!data && inMemoryRoleData) {
      data = inMemoryRoleData;
    }

    if (!data) {
      return { role: null, isValid: false, data: null };
    }

    const isExpired = Date.now() - data.timestamp > 30 * 60 * 1000;

    if (isExpired) {
      inMemoryRoleData = null;
      if (isSessionStorageAvailable()) {
        sessionStorage.removeItem("selectedRole");
      }
      return { role: null, isValid: false, data: null };
    }

    return { role: data.role, isValid: true, data };
  } catch {
    return { role: null, isValid: false, data: null };
  }
};
