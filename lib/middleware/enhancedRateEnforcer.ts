// src/lib/middleware/enhancedRateEnforcer.ts
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/middleware/rateLimit";
import type { MiddlewareContext, AuthenticatedActionContext } from "./types";
import { AuthenticatedActionHandler } from "./authenticatedActionHandler";
import { ClientIPDetector } from "@/lib/clientIp";

/**
 * EnhancedRateEnforcer — The Smart Traffic Cop
 * Adaptive, per-user + per-IP, context-aware, and defense-integrated.
 */
export class EnhancedRateEnforcer {
  // ─────────────────────────────────────────────────────────────────────
  // Dynamic Rate Limit Configs (2025 Best Practices)
  // ─────────────────────────────────────────────────────────────────────
  private static readonly CONFIGS = {
    // Critical auth paths — ultra strict
    auth: {
      signin: { windowMs: 15 * 60 * 1000, limit: 6, burst: 3 },
      signup: { windowMs: 60 * 60 * 1000, limit: 4, burst: 1 },
      password_reset: { windowMs: 30 * 60 * 1000, limit: 5, burst: 2 },
      verify_email: { windowMs: 10 * 60 * 1000, limit: 8, burst: 3 },
    },
    // API tiers
    api: {
      public: { windowMs: 60 * 1000, limit: 60 }, // 60 req/min
      authenticated: { windowMs: 60 * 1000, limit: 300 }, // 5x more
      admin: { windowMs: 60 * 1000, limit: 1000 },
    },
    // Global fallback
    default: { windowMs: 60 * 1000, limit: 120 },
  };

  static async enforce(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<NextResponse> {
    const authContext = AuthenticatedActionHandler.enhanceContext(
      request,
      context
    );

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.next();
    }
    const actionType = authContext.actionType;

    // Skip rate limiting entirely for trusted elevated users
    if (
      authContext.userContext?.isElevatedRole &&
      authContext.userContext.trustScore > 85
    ) {
      return this.allowWithHeaders(9999, 9999, Date.now() + 3600000);
    }

    // Dynamic key: userId > sessionToken > IP
    const key = this.getRateLimitKey(request, context, authContext);

    // Dynamic config based on action + user state
    const config = this.getDynamicConfig(actionType, authContext);

    const result = await rateLimit(request, {
      windowMs: config.windowMs,
      limit: config.limit,
      key,
      namespace: `rate_${actionType}_${
        authContext.isAuthenticated ? "auth" : "anon"
      }`,
      // Burst allowance for humans (reduces false positives)
      burst: config.burst,
    });

    return this.buildResponse(result, config);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Smart Key Generation (Prevents Gaming)
  // ─────────────────────────────────────────────────────────────────────
  private static getRateLimitKey(
    request: NextRequest,
    context: MiddlewareContext,
    authContext: AuthenticatedActionContext
  ): string {
    // 1. Authenticated user → strongest key
    if (authContext.userContext?.userId) {
      return `user:${authContext.userContext.userId}`;
    }

    // 2. Session token → still strong
    if (context.sessionToken) {
      return `session:${context.sessionToken.substring(0, 32)}`;
    }

    // 3. Device fingerprint (if available)
    if (context.deviceFingerprint) {
      return `fp:${context.deviceFingerprint}`;
    }

    // 4. IP + User-Agent hash (hardest to spoof together)
    const ip = ClientIPDetector.getClientIP(request).ip;
    const ua = context.userAgent || "unknown";
    const uaHash = this.simpleHash(ua.substring(0, 100));
    return `ip_ua:${ip}:${uaHash}`;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Dynamic Config Engine
  // ─────────────────────────────────────────────────────────────────────
  private static getDynamicConfig(
    actionType: AuthenticatedActionContext["actionType"],
    authContext: AuthenticatedActionContext
  ): { windowMs: number; limit: number; burst?: number } {
    // Critical auth actions — strict
    if (actionType === "signin") return this.CONFIGS.auth.signin;
    if (actionType === "signup") return this.CONFIGS.auth.signup;
    if (actionType === "password_reset")
      return this.CONFIGS.auth.password_reset;
    if (actionType === "verify_email") return this.CONFIGS.auth.verify_email;

    // API routes
    if (authContext.isPrivatePath || authContext.isAuthenticated) {
      if (authContext.userContext?.role === "ADMIN") {
        return this.CONFIGS.api.admin;
      }
      return this.CONFIGS.api.authenticated;
    }

    if (authContext.pathname.startsWith("/api/")) {
      return this.CONFIGS.api.public;
    }

    return this.CONFIGS.default;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Response Builder with Proper Headers
  // ─────────────────────────────────────────────────────────────────────
  private static buildResponse(
    result: {
      success: boolean;
      limit: number;
      remaining: number;
      reset: number;
    },
    config: any
  ): NextResponse {
    const { success, limit, remaining, reset } = result;
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

    const response = success
      ? NextResponse.next()
      : new NextResponse(
          JSON.stringify({
            error: "Too Many Requests",
            message: "Rate limit exceeded. Please try again later.",
            retryAfter,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": retryAfter.toString(),
            },
          }
        );

    // Standard rate limit headers (RFC 6585)
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set(
      "X-RateLimit-Remaining",
      Math.max(0, remaining).toString()
    );
    response.headers.set("X-RateLimit-Reset", new Date(reset).toISOString());
    response.headers.set("X-RateLimit-Used", (limit - remaining).toString());
    response.headers.set(
      "X-RateLimit-Policy",
      `${limit};w=${config.windowMs / 1000}`
    );

    // Custom
    if (!success) {
      response.headers.set("X-RateLimit-Blocked", "true");
    }

    return response;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Allow with generous headers (for trusted users)
  // ─────────────────────────────────────────────────────────────────────
  private static allowWithHeaders(
    limit: number,
    remaining: number,
    reset: number
  ): NextResponse {
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", new Date(reset).toISOString());
    response.headers.set("X-RateLimit-Bypass", "trusted_user");
    return response;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Simple non-crypto hash (fast)
  // ─────────────────────────────────────────────────────────────────────
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return (hash >>> 0).toString(36);
  }
}
