// app/providers/internet-connection-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface InternetConnectionContextType {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  checkConnection: () => Promise<boolean>;
}

const InternetConnectionContext = createContext<InternetConnectionContextType>({
  isOnline: true,
  isChecking: false,
  lastChecked: null,
  checkConnection: async () => true,
});

export function useInternetConnection() {
  return useContext(InternetConnectionContext);
}

interface InternetConnectionProviderProps {
  children: ReactNode;
}

export function InternetConnectionProvider({
  children,
}: InternetConnectionProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Check real internet connectivity by making a request to a reliable endpoint
  const checkConnection = async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      // Try multiple endpoints for reliability
      const endpoints = [
        "/api/health", // Your own health endpoint
        "https://httpbin.org/get", // Public API for testing
        "https://api.github.com", // GitHub API
      ];

      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(endpoint, {
            method: "HEAD", // HEAD request is lighter
            signal: controller.signal,
            cache: "no-cache",
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            setLastChecked(new Date());
            setIsOnline(true);
            return true;
          }
        } catch (error) {
          // Continue to next endpoint
          continue;
        }
      }

      // If all endpoints fail
      setLastChecked(new Date());
      setIsOnline(false);
      return false;
    } catch (error) {
      setLastChecked(new Date());
      setIsOnline(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, []);

  // Listen to browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkConnection(); // Verify with real check
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Periodic connection check
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        checkConnection();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Check when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && navigator.onLine) {
        checkConnection();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <InternetConnectionContext.Provider
      value={{
        isOnline,
        isChecking,
        lastChecked,
        checkConnection,
      }}
    >
      {children}
    </InternetConnectionContext.Provider>
  );
}