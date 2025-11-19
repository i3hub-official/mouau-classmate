// ========================================
// 📊 TASK 4: ACTIVITY LOGGER - Observer
// Responsibility: Log requests and monitor activity
// ========================================

// File: src/lib/middleware/activityLogger.ts
import { NextRequest } from "next/server";
import type { MiddlewareContext } from "./types";

export class ActivityLogger {
  private static readonly SENSITIVE_PATHS = [
    "/auth/login",
    "/auth/signup",
    "/reset-password",
  ];

  static async log(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<void> {
    if (process.env.NODE_ENV !== "development") return;

    const logData = {
      timestamp: new Date(context.timestamp).toISOString(),
      method: request.method,
      path: request.nextUrl.pathname,
      ip: context.clientIp,
      userAgent: this.sanitizeUserAgent(context.userAgent),
      hasSession: context.hasSession,
      isPublic: context.isPublicPath,
      isAuth: context.isAuthPath,
      isPrivate: context.isPrivatePath,
    };

    // Different log levels for different paths
    if (this.SENSITIVE_PATHS.includes(request.nextUrl.pathname)) {
      console.log("🔐 [AUTH REQUEST]", logData);
    } else if (context.isPrivatePath) {
      console.log("🔒 [PRIVATE REQUEST]", logData);
    } else {
      console.log("📋 [REQUEST]", logData);
    }

    // Log query parameters if present (non-sensitive paths only)
    if (
      request.nextUrl.search &&
      !this.SENSITIVE_PATHS.includes(request.nextUrl.pathname)
    ) {
      console.log("📝 [QUERY PARAMS]", request.nextUrl.searchParams.toString());
    }
  }

  private static sanitizeUserAgent(userAgent: string): string {
    return userAgent.substring(0, 100); // Truncate long user agents
  }
}
