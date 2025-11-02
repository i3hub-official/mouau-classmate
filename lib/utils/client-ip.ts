// File: src/lib/utils/client-ip.ts
import { NextRequest } from "next/server";

export const getClientIp = (request: Request | NextRequest): string | null => {
  // Handle standard Request object
  const headers =
    request.headers instanceof Headers
      ? request.headers
      : new Headers(request.headers);

  // Cloudflare
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  // Vercel
  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) return xRealIp;

  // Standard headers (behind proxy)
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  // Fallback to direct connection
  if ("ip" in request && typeof request.ip === "string") {
    return request.ip;
  }

  return null;
};

// Helper for logging
export const getIpDetails = (request: Request) => {
  const ip = getClientIp(request);
  return {
    ip,
    headers: {
      "x-forwarded-for": request.headers.get("x-forwarded-for"),
      "x-real-ip": request.headers.get("x-real-ip"),
      "cf-connecting-ip": request.headers.get("cf-connecting-ip"),
    },
    console: {
      log: (message: string) => {
        console.log(`[IP Logger] ${message} - ${ip}`);
      },
    },
  };
};
