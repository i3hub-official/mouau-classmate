// src/lib/middleware/integration-utils.ts
import type { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";
import { AuditAction } from "@/lib/server/prisma"; // Adjust the import path if needed

/**
 * Integration Utilities — The Glue That Holds Your Defense Layers Together
 * Zero-downtime execution, context merging, threat scoring, and observability.
 */
export class IntegrationUtils {
  /**
   * Safely execute a middleware step with automatic fallback + full error context
   */
  static async safeExecute<T>(
    operation: () => Promise<T>,
    options: {
      name: string;
      fallback: T;
      request?: NextRequest;
      context?: MiddlewareContext;
      logError?: boolean;
    }
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - start;

      // Success metric (silent)
      if (options.context?.requestId) {
        console.log(
          `[INTEGRATION] ${options.name} → SUCCESS (${duration}ms) | Request: ${options.context.requestId}`
        );
      }

      return result;
    } catch (error: any) {
      const duration = Date.now() - start;
      const requestId = options.context?.requestId || "unknown";
      const path = options.request?.nextUrl.pathname || "unknown";

      // Structured error logging
      console.error(`[INTEGRATION] ${options.name} → FAILED (${duration}ms)`, {
        requestId,
        path,
        error: error?.message || error,
        stack: error?.stack,
        code: error?.code,
        name: error?.name,
      });

      // Optional: Send to audit log if user context exists
      if (options.context?.userId && options.request) {
        // Fire-and-forget audit
        this.logSecurityEvent({
          request: options.request,
          action: "MIDDLEWARE_FAILURE",
          details: {
            middleware: options.name,
            error: error?.message || "unknown",
            duration,
            fallbackUsed: true,
          },
          userId: options.context.userId,
        }).catch(() => {}); // Silent
      }

      return options.fallback;
    }
  }

  /**
   * Deep merge middleware contexts with source tracking and conflict resolution
   */
  static mergeContexts(
    base: Partial<MiddlewareContext>,
    additional: Partial<MiddlewareContext>
  ): MiddlewareContext {
    const merged: MiddlewareContext = {
      // Core identifiers
      requestId:
        base.requestId ||
        additional.requestId ||
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: base.startTime || additional.startTime || Date.now(),

      // User & session
      userId: additional.userId ?? base.userId ?? null,
      isAuthenticated:
        additional.isAuthenticated ?? base.isAuthenticated ?? false,

      // Security & threat
      threatScore: Math.max(base.threatScore || 0, additional.threatScore || 0),
      securityLevel: this.highestSecurityLevel(
        base.securityLevel || "low",
        additional.securityLevel || "low"
      ),

      // Technical
      nonce: additional.nonce || base.nonce,
      isDev:
        base.isDev ??
        additional.isDev ??
        process.env.NODE_ENV === "development",
      isPrivatePath: additional.isPrivatePath ?? base.isPrivatePath ?? true,

      // Additional required MiddlewareContext properties
      isPublicPath: additional.isPublicPath ?? base.isPublicPath ?? false,
      isAuthPath: additional.isAuthPath ?? base.isAuthPath ?? false,
      hasSession: additional.hasSession ?? base.hasSession ?? false,
      clientIp: additional.clientIp ?? base.clientIp ?? "",
      geo: additional.geo ?? base.geo ?? null,
      device: additional.device ?? base.device ?? null,
      userAgent: additional.userAgent ?? base.userAgent ?? null,
      referrer: additional.referrer ?? base.referrer ?? null,

      // Source tracking
      contextSources: Array.from(
        new Set([
          ...(base.contextSources || []),
          ...(additional.contextSources || []),
          `merge_${Date.now()}`,
        ])
      ),

      // Timestamps
      integratedAt: Date.now(),

      // Required MiddlewareContext properties
      timestamp: additional.timestamp ?? base.timestamp ?? Date.now(),
      userRole: additional.userRole ?? base.userRole ?? "",
      sessionData: additional.sessionData ?? base.sessionData ?? null,
      sessionAgeMs: additional.sessionAgeMs ?? base.sessionAgeMs ?? 0,
    };

    return merged;
  }

  /**
   * Calculate aggregated threat score with exponential weighting for critical signals
   */
  static calculateAggregatedThreatScore(scores: number[]): {
    score: number;
    level: "low" | "medium" | "high" | "critical";
    triggers: string[];
  } {
    if (scores.length === 0) {
      return { score: 0, level: "low", triggers: [] };
    }

    // Critical signals (instant high threat)
    if (scores.some((s) => s >= 90)) {
      return {
        score: 95,
        level: "critical",
        triggers: scores.filter((s) => s >= 90).map((s) => `critical_${s}`),
      };
    }

    // Exponential weighting: higher scores dominate
    const weighted = scores.map((score) => {
      if (score >= 80) return score * 2.5;
      if (score >= 60) return score * 1.8;
      if (score >= 40) return score * 1.2;
      return score * 0.8;
    });

    const rawScore = weighted.reduce((a, b) => a + b, 0) / scores.length;
    const finalScore = Math.min(100, Math.round(rawScore));

    const level =
      finalScore >= 80
        ? "critical"
        : finalScore >= 60
        ? "high"
        : finalScore >= 35
        ? "medium"
        : "low";

    return {
      score: finalScore,
      level,
      triggers: scores
        .map((s, i) => (s >= 60 ? `source_${i}=${s}` : null))
        .filter(Boolean) as string[],
    };
  }

  /**
   * Determine the strictest security level
   */
  static highestSecurityLevel(
    ...levels: ("low" | "medium" | "high")[]
  ): "low" | "medium" | "high" {
    if (levels.includes("high")) return "high";
    if (levels.includes("medium")) return "medium";
    return "low";
  }

  /**
   * Fire-and-forget security event logging
   */
  static async logSecurityEvent(data: {
    request: NextRequest;
    action: AuditAction;
    details: Record<string, any>;
    userId?: string;
  }): Promise<void> {
    try {
      const ipInfo =
        (await import("@/lib/clientIp").then((m) =>
          m.ClientIPDetector.getClientIP(data.request)
        )) || {};
      await (
        await import("@/lib/server/prisma")
      ).prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          action: data.action,
          details: {
            ...data.details,
            path: data.request.nextUrl.pathname,
            method: data.request.method,
            userAgent: data.request.headers
              .get("user-agent")
              ?.substring(0, 500),
            ipIntelligence: ipInfo,
          },
          ipAddress: ipInfo.ip || "unknown",
          userAgent: data.request.headers.get("user-agent") || "unknown",
        },
      });
    } catch {
      // Never break the request flow
    }
  }

  /**
   * Create a standardized middleware result object
   */
  static result<T = any>(
    data: T,
    options: {
      success: boolean;
      context?: Partial<MiddlewareContext>;
      threatScore?: number;
      message?: string;
    }
  ) {
    return {
      success: options.success,
      data,
      message: options.message || (options.success ? "OK" : "Failed"),
      timestamp: new Date().toISOString(),
      context: options.context || {},
      threatScore: options.threatScore || 0,
    };
  }
}
