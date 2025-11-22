// src/lib/middleware/responseMerger.ts
import { NextResponse, type NextFetchEvent } from "next/server";
import type { NextRequest } from "next/server";

export class ResponseMerger {
  /**
   * Intelligently merges two NextResponse objects.
   * Preserves redirects/errors, merges headers safely, handles cookies properly.
   */
  static merge(
    baseResponse: NextResponse,
    newResponse: NextResponse
  ): NextResponse {
    // 1. If newResponse is an error, redirect, or has body → it wins
    if (
      newResponse.status >= 300 ||
      newResponse.redirected ||
      newResponse.body !== null
    ) {
      // But still merge safe headers from base → new (e.g. security, rate limit)
      this.mergeHeadersSafe(newResponse, baseResponse);
      return newResponse;
    }

    // 2. Otherwise: baseResponse wins (normal flow), but we enrich it
    this.mergeHeadersSafe(baseResponse, newResponse);
    return baseResponse;
  }

  /**
   * Safely merge headers: never overwrite critical ones unless intentional
   */
  private static mergeHeadersSafe(
    target: NextResponse,
    source: NextResponse,
    options: { allowOverride?: string[] } = {}
  ): void {
    const allowOverride = options.allowOverride || [];

    // List of headers that should NEVER be merged/overwritten automatically
    const protectedHeaders = new Set([
      "location",
      "set-cookie",
      "content-length",
      "content-encoding",
      "transfer-encoding",
      "content-type", // only override if explicitly allowed
      "www-authenticate",
      "proxy-authenticate",
      "trailer",
      "upgrade",
      "vary",
    ]);

    source.headers.forEach((value, rawKey) => {
      const key = rawKey.toLowerCase();

      // Skip protected headers unless explicitly allowed
      if (protectedHeaders.has(key) && !allowOverride.includes(key)) {
        return;
      }

      // Special handling for set-cookie: append instead of replace
      if (key === "set-cookie") {
        const existing = target.headers.getSetCookie();
        const incoming = source.headers.getSetCookie();
        const merged = [...existing, ...incoming];
        target.headers.delete("set-cookie");
        merged.forEach((cookie) => target.headers.append("set-cookie", cookie));
        return;
      }

      target.headers.set(key, value);
    });
  }

  /**
   * Add standard system/performance headers
   */
  static addSystemHeaders(
    response: NextResponse,
    context: {
      startTime: number;
      requestId?: string;
      middlewareChain?: string[];
      cacheStatus?: string;
      processingTime?: number;
      clientIp?: string;
      chain?: string[];
    }
  ): NextResponse {
    const now = Date.now();
    const processingTime = now - context.startTime;

    response.headers.set("x-processing-time", `${processingTime}ms`);
    response.headers.set("x-middleware-version", "2.1.0");
    response.headers.set("x-timestamp", new Date(now).toISOString());
    response.headers.set("x-powered-by", "MOUAU ClassMate Security Suite");

    if (context.requestId) {
      response.headers.set("x-request-id", context.requestId);
    }

    if (context.middlewareChain) {
      response.headers.set(
        "x-middleware-chain",
        context.middlewareChain.join(" → ")
      );
    }

    if (context.cacheStatus) {
      response.headers.set("x-cache", context.cacheStatus);
    }

    // Security headers (only if not already set)
    const securityHeaders = {
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "x-xss-protection": "1; mode=block",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy":
        "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    };

    Object.entries(securityHeaders).forEach(([key, value]) => {
      if (!response.headers.has(key)) {
        response.headers.set(key, value);
      }
    });

    return response;
  }

  /**
   * Finalize response with rate limit + security + performance headers
   */
  static finalize(
    response: NextResponse,
    context: {
      startTime: number;
      requestId: string;
      rateLimit?: {
        limit: number;
        remaining: number;
        reset: number;
        retryAfter?: number;
      };
      cacheStatus?: string;
      middlewareChain?: string[];
    }
  ): NextResponse {
    let finalResponse = response;

    // Add rate limit headers if provided
    if (context.rateLimit) {
      finalResponse.headers.set(
        "x-ratelimit-limit",
        context.rateLimit.limit.toString()
      );
      finalResponse.headers.set(
        "x-ratelimit-remaining",
        context.rateLimit.remaining.toString()
      );
      finalResponse.headers.set(
        "x-ratelimit-reset",
        Math.ceil(context.rateLimit.reset / 1000).toString()
      );

      if (context.rateLimit.retryAfter) {
        finalResponse.headers.set(
          "retry-after",
          context.rateLimit.retryAfter.toString()
        );
      }
    }

    // Add system & security headers
    finalResponse = this.addSystemHeaders(finalResponse, {
      startTime: context.startTime,
      requestId: context.requestId,
      middlewareChain: context.middlewareChain,
      cacheStatus: context.cacheStatus,
    });

    return finalResponse;
  }
}
