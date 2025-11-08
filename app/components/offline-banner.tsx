// app/components/offline-banner.tsx
"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react";
import { useInternetConnection } from "@/app/providers/internet-connection-provider";

export function OfflineBanner() {
  const { isOnline, isChecking, checkConnection } = useInternetConnection();
  const [showBanner, setShowBanner] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Show banner when offline
  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
    } else {
      // Hide banner after a delay when online
      const timer = setTimeout(() => {
        setShowBanner(false);
        setRetryCount(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const handleRetry = async () => {
    setRetryCount((prev) => prev + 1);
    await checkConnection();
  };

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isOnline ? "bg-green-500 text-white" : "bg-orange-500 text-white"
      }`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="h-5 w-5" />
            ) : (
              <WifiOff className="h-5 w-5" />
            )}
            <div>
              <p className="font-medium text-sm">
                {isOnline ? "Connection restored" : "No internet connection"}
              </p>
              {!isOnline && (
                <p className="text-xs opacity-90">
                  Some features may not work properly
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <button
                onClick={handleRetry}
                disabled={isChecking}
                className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-md hover:bg-white/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`}
                />
                <span className="text-sm">
                  {isChecking ? "Checking..." : "Retry"}
                </span>
              </button>
            )}
            <button
              onClick={() => setShowBanner(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <span className="sr-only">Dismiss</span>×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
