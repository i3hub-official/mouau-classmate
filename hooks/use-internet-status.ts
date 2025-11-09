// app/hooks/use-internet-status.ts
"use client";

import { useEffect, useState } from "react";
import { useInternetConnection } from "@/app/providers/internet-connection-provider";

export function useInternetStatus() {
  const { isOnline, checkConnection } = useInternetConnection();
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);

  // Save current URL when going offline
  useEffect(() => {
    if (!isOnline) {
      setPreviousUrl(window.location.href);
    }
  }, [isOnline]);

  // Redirect back when online
  const redirectToPreviousPage = () => {
    if (previousUrl && previousUrl !== window.location.href) {
      window.location.href = previousUrl;
    }
  };

  return {
    isOnline,
    checkConnection,
    previousUrl,
    redirectToPreviousPage,
  };
}