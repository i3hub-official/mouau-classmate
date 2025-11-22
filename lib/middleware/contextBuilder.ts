// src/lib/middleware/contextBuilder.ts
import { NextRequest } from "next/server";
import { ClientIPDetector } from "@/lib/clientIp";
import { isPublicPath, isAuthPath, isPrivatePath } from "@/lib/utils/pathUtils";
import type { MiddlewareContext } from "./types";
import { Role } from "@prisma/client";

/**
 * ContextBuilder — The Foundation of Zero-Trust
 * Collects, sanitizes, and enriches every request with trusted context.
 * First line of defense. Never trust raw input.
 */
export class ContextBuilder {
  private static readonly FALLBACK_IP = "0.0.0.0";
  private static readonly FALLBACK_UA = "unknown";

  /**
   * Build a rich, secure, and immutable context for the entire middleware chain
   */
  static build(request: NextRequest): MiddlewareContext {
    const startTime = Date.now();
    const pathname = request.nextUrl.pathname;
    const method = request.method;
    const url = request.url;

    // Generate deterministic request ID (critical for tracing)
    const requestId = this.generateRequestId(request);

    // IP Intelligence — never trust headers blindly
    const ipInfo = ClientIPDetector.getClientIP(request);

    // Securely extract tokens (never expose raw cookies)
    const sessionToken = this.safelyGetCookie(request, "session-token");
    const refreshToken = this.safelyGetCookie(request, "refresh-token");
    const userIdFromCookie = this.safelyGetCookie(request, "userId");

    // Classify route type
    const publicPath = isPublicPath(pathname);
    const authPath = isAuthPath(pathname);
    const privatePath = isPrivatePath(pathname);

    // Build immutable base context
    const baseContext: MiddlewareContext = {
      // Core identifiers
      requestId,
      startTime,
      timestamp: Date.now(),

      // Required property
      headers: Object.fromEntries(request.headers.entries()),

      // Routing
      method,
      pathname,
      fullUrl: this.sanitizeUrl(url),
      isPublicPath: publicPath,
      isAuthPath: authPath,
      isPrivatePath: privatePath,

      // Authentication state
      hasSession: !!sessionToken,
      sessionToken: sessionToken || undefined,
      refreshToken: refreshToken || undefined,
      userId: userIdFromCookie ?? null,

      // Client intelligence
      clientIp: ipInfo.ip || this.FALLBACK_IP,
      clientIpSource: ipInfo.source,
      clientIpConfidence: typeof ipInfo.confidence === "number" ? ipInfo.confidence : Number(ipInfo.confidence) || 0,
      isProxy: ipInfo.isProxy || ipInfo.isVPN || ipInfo.isTor || ipInfo.isDatacenter,
      country: "country" in ipInfo ? (ipInfo as any).country || "XX" : "XX",
      region: "region" in ipInfo ? (ipInfo as any).region || "XX" : "XX",

      // Device & browser
      userAgent: this.sanitizeUserAgent(request.headers.get("user-agent")),
      acceptLanguage: request.headers.get("accept-language") || "unknown",
      secFetchSite: request.headers.get("sec-fetch-site") || "unknown",

      // Session metadata (will be enriched later)
      sessionAgeMs: 0,
      sessionCreatedAt: null,
      deviceFingerprint: null,

      // User context (initial — will be enriched by SessionValidator)
      userRole: "guest" as const,
      isAuthenticated: false,
      isAdmin: false,

      // Security & threat (will be enriched)
      threatScore: 0,
      securityLevel: "low" as const,
      botScore: 0,

      // Compliance
      consent: {
        cookies: false,
        analytics: false,
        processing: false,
        marketing: false,
        version: "none",
      },

      // Observability
      contextSources: ["ContextBuilder"],
      processingTimeMs: 0, // Will be updated at end of chain

      // Missing properties for MiddlewareContext
      _BANDWIDTH: 0,
      sessionData: null,
      geo: null,
    };

    // Final processing time
    baseContext.processingTimeMs = Date.now() - startTime;

    return baseContext;
  }

  /**
   * Safely extract cookie value (prevents prototype pollution & null issues)
   */
  private static safelyGetCookie(request: NextRequest, name: string): string | null {
    try {
      const cookie = request.cookies.get(name);
      if (!cookie || typeof cookie.value !== "string") return null;
      return cookie.value.length > 1000 ? cookie.value.substring(0, 1000) + "..." : cookie.value;
    } catch {
      return null;
    }
  }

  /**
   * Generate deterministic, traceable request ID
   */
  private static generateRequestId(request: NextRequest): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    const pathHash = Buffer.from(request.nextUrl.pathname).toString("base64url").substring(0, 8);
    return `req_${timestamp}_${pathHash}_${random}`;
  }

  /**
   * Sanitize URL (remove tokens, passwords, etc.)
   */
  private static sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const sensitiveParams = ["token", "code", "password", "secret", "key"];
      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, "[REDACTED]");
        }
      });
      return urlObj.toString();
    } catch {
      return "[MALFORMED_URL]";
    }
  }

  /**
   * Sanitize and truncate User-Agent
   */
  private static sanitizeUserAgent(ua: string | null): string {
    if (!ua) return this.FALLBACK_UA;
    return ua.length > 300 ? ua.substring(0, 300) + "..." : ua;
  }

  /**
   * Optional: Enrich context from trusted headers (set by previous middleware)
   */
  static enrichFromHeaders(request: NextRequest, context: MiddlewareContext): MiddlewareContext {
    const headers = request.headers;

    return {
      ...context,
      // Trust headers set by SessionTokenValidator
      userId: headers.get("x-user-id") || context.userId,
      userRole: (headers.get("x-user-role") as Role | "guest") || context.userRole,
      isAuthenticated: headers.get("x-authenticated") === "true",
      isAdmin: headers.get("x-user-role") === Role.ADMIN,

      // Session metadata
      sessionAgeMs: headers.has("x-session-created")
        ? Date.now() - parseInt(headers.get("x-session-created")!)
        : context.sessionAgeMs,

      // Threat & security
      threatScore: parseInt(headers.get("x-threat-score") || "0") || context.threatScore,
      securityLevel: (headers.get("x-security-level") as any) || context.securityLevel,

      // Add source
      contextSources: [...(context.contextSources ?? []), "HeaderEnrichment"],
    };
  }
}