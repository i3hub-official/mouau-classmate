// app/offline/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WifiOff, RefreshCw, Home, AlertCircle, CheckCircle } from "lucide-react";
import { useInternetConnection } from "@/app/providers/internet-connection-provider";
import { ThemeToggle } from "@/app/components/theme-toggle";

export default function OfflinePage() {
  const { isOnline, isChecking, checkConnection, lastChecked } =
    useInternetConnection();
  const [retryCount, setRetryCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOnline && retryCount > 0) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, retryCount]);

  const handleRetry = async () => {
    setRetryCount((prev) => prev + 1);
    await checkConnection();
  };

  const formatLastChecked = () => {
    if (!lastChecked) return "Never";
    const now = new Date();
    const diff = now.getTime() - lastChecked.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    return `${Math.floor(seconds / 3600)} hours ago`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Offline Banner */}
      <div className="bg-orange-500 text-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5" />
              <p className="font-medium text-sm">You're offline</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
            <WifiOff className="h-10 w-10 text-orange-500" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              No Internet Connection
            </h1>
            <p className="text-muted-foreground">
              Please check your internet connection and try again.
            </p>
          </div>

          {/* Connection Status */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className={`text-sm font-medium ${
                isOnline ? "text-green-500" : "text-orange-500"
              }`}>
                {isOnline ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last checked:</span>
              <span className="text-sm font-medium">
                {formatLastChecked()}
              </span>
            </div>
            {retryCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Attempts:</span>
                <span className="text-sm font-medium">{retryCount}</span>
              </div>
            )}
          </div>

          {/* Success Message */}
          {showSuccess && (
            <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm">Connection restored! Redirecting...</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              disabled={isChecking}
              className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  Retry Connection
                </>
              )}
            </button>

            <Link
              href="/"
              className="w-full py-3 px-4 border border-border text-foreground rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-2"
            >
              <Home className="h-5 w-5" />
              Go to Homepage
            </Link>
          </div>

          {/* Tips */}
          <div className="text-left space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Troubleshooting tips:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Check your Wi-Fi or mobile data connection</li>
                  <li>Try moving to a location with better signal</li>
                  <li>Restart your router or device</li>
                  <li>Check if other devices can connect</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}