// src/lib/middleware/activityLogger.ts
import { NextRequest } from "next/server";
import type { MiddlewareContext } from "./types";
import { ClientIPDetector } from "@/lib/clientIp";
import { prisma } from "@/lib/server/prisma";

/**
 * ActivityLogger — The Silent Observer
 * Logs every request with perfect balance: maximum visibility, zero secrets.
 */
export class ActivityLogger {
  // Paths that must NEVER log query params or body
  private static readonly SENSITIVE_PATHS = new Set([
    "/api/auth/login",
    "/api/auth/signin",
    "/api/auth/signup",
    "/api/auth/register",
    "/api/auth/reset-password",
    "/api/auth/change-password",
    "/api/auth/verify-email",
    "/api/auth/callback",
    "/auth/verify",
    "/reset-password",
  ]);

  // Headers that contain secrets
  private static readonly SENSITIVE_HEADERS = new Set([
    "authorization",
    "cookie",
    "set-cookie",
    "x-auth-token",
    "x-csrf-token",
    "x-api-key",
    "proxy-authorization",
  ]);

  // Query params that must be redacted
  private static readonly SENSITIVE_QUERY_PARAMS = new Set([
    "password",
    "token",
    "code",
    "access_token",
    "refresh_token",
    "secret",
    "key",
    "signature",
  ]);

  static async log(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<void> {
    const start = Date.now();

    // Always get fresh IP info (never trust context alone)
    const ipInfo = ClientIPDetector.getClientIP(request);

    const logEntry = {
      // Core
      requestId: context.requestId || "unknown",
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.nextUrl.pathname,
      fullUrl: this.sanitizeUrl(request.url),

      // Client
      ip: ipInfo.ip,
      ipSource: ipInfo.source,
      ipConfidence: ipInfo.confidence,
      isProxy: ipInfo.isProxy || ipInfo.isVPN || ipInfo.isTor,
      userAgent: this.sanitizeUserAgent(request.headers.get("user-agent")),

      // Auth & Access
      userId: context.userId || null,
      role: context.role || null,
      isAuthenticated: context.isAuthenticated || false,
      hasSession: context.hasSession || false,

      // Route Classification
      isPublic: context.isPublicPath,
      isAuthPath: context.isAuthPath,
      isPrivatePath: context.isPrivatePath,
      isSensitivePath: this.SENSITIVE_PATHS.has(request.nextUrl.pathname),

      // Security Context
      threatScore: context.threatScore || 0,
      securityLevel: context.securityLevel || "low",

      // Performance
      processingTimeMs: Date.now() - (context.startTime || Date.now()),
    };

    // ──────────────────────────────
    // Console Output (Development Only)
    // ──────────────────────────────
    if (process.env.NODE_ENV === "development") {
      const icon = logEntry.isSensitivePath
        ? "Secure Request"
        : logEntry.isPrivatePath
        ? "Private Request"
        : logEntry.isAuthenticated
        ? "Authenticated Request"
        : "Public Request";

      console.log(`${icon} [${logEntry.method}] ${logEntry.path}`, {
        ip: logEntry.ip,
        user: logEntry.userId ? `user:${logEntry.userId}` : "anonymous",
        threat: logEntry.threatScore > 30 ? `⚠️ ${logEntry.threatScore}` : logEntry.threatScore,
        time: `${logEntry.processingTimeMs}ms`,
      });

      // Log query only if safe
      if (request.nextUrl.search && !logEntry.isSensitivePath) {
        const safeParams = this.sanitizeQueryParams(request.nextUrl.searchParams);
        if (safeParams) console.log("Query Params:", safeParams);
      }
    }

    // ──────────────────────────────
    // Persistent Audit Log (Production)
    // ──────────────────────────────
    if (process.env.NODE_ENV === "production" || process.env.LOG_ALL_REQUESTS === "true") {
      // Fire-and-forget — never block the request
      this.persistLog(logEntry, request, ipInfo).catch(() => {});
    }
  }

  private static async persistLog(
    entry: any,
    request: NextRequest,
    ipInfo: any
  ): Promise<void> {
    try {
      await prisma.requestLog.create({
        data: {
          requestId: entry.requestId,
          method: entry.method,
          path: entry.path,
          ipAddress: entry.ip,
          userId: entry.userId,
          userAgent: entry.userAgent,
          isAuthenticated: entry.isAuthenticated,
          threatScore: entry.threatScore,
          securityLevel: entry.securityLevel,
          ipIntelligence: {
            source: ipInfo.source,
            confidence: ipInfo.confidence,
            isProxy: ipInfo.isProxy,
            isVPN: ipInfo.isVPN,
            isTor: ipInfo.isTor,
            isDatacenter: ipInfo.isDatacenter,
          },
          metadata: {
            role: entry.role,
            isPrivatePath: entry.isPrivatePath,
            processingTimeMs: entry.processingTimeMs,
          },
        },
      });
    } catch (error) {
      // Never break the request flow
      console.error("[ACTIVITY LOGGER] Failed to persist log:", error);
    }
  }

  // ──────────────────────────────
  // Sanitization Utilities
  // ──────────────────────────────
  private static sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      this.SENSITIVE_QUERY_PARAMS.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, "[REDACTED]");
        }
      });
      return urlObj.toString();
    } catch {
      return "[MALFORMED_URL]";
    }
  }

  private static sanitizeQueryParams(params: URLSearchParams): Record<string, string> | null {
    const safe: Record<string, string> = {};
    let hasParams = false;

    for (const [key, value] of params.entries()) {
      if (this.SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
        safe[key] = "[REDACTED]";
      } else {
        safe[key] = value.length > 100 ? value.substring(0, 100) + "..." : value;
      }
      hasParams = true;
    }

    return hasParams ? safe : null;
  }

  private static sanitizeUserAgent(ua: string | null): string {
    if (!ua) return "unknown";
    return ua.length > 200 ? ua.substring(0, 200) + "..." : ua;
  }

  // ──────────────────────────────
  // Optional: High-Threat Alert
  // ──────────────────────────────
  static async alertIfCritical(request: NextRequest, context: MiddlewareContext): Promise<void> {
    if ((context.threatScore || 0) >= 85) {
      console.warn(`HIGH THREAT DETECTED`, {
        requestId: context.requestId,
        ip: context.clientIp,
        path: request.nextUrl.pathname,
        score: context.threatScore,
        userId: context.userId,
      });

      // Optional: trigger webhook, SMS, etc.
      // await notifySecurityTeam(context);
    }
  }
}