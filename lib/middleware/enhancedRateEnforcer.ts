// ========================================
// 🚦 TASK 3: RATE ENFORCER - Traffic Controller
// Responsibility: Enforce rate limits per IP/user
// ========================================

// File: src/lib/middleware/enhancedRateEnforcer.ts
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/middleware/rateLimit";
import { PrismaClient } from "@prisma/client/edge";

const prisma = new PrismaClient();
import type { MiddlewareContext } from "./types";

export class EnhancedRateEnforcer {
  private static readonly DEFAULT_CONFIG = {
    interval: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    namespace: "global",
  };

  private static readonly PATH_CONFIGS: Record<
    string,
    { interval: number; limit: number; namespace: string }
  > = {
    "/auth/signin": {
      interval: 15 * 60 * 1000,
      limit: 5,
      namespace: "signin",
    },
    "/auth/signup": {
      interval: 60 * 60 * 1000,
      limit: 3,
      namespace: "signup",
    },
    "/api/v1": { interval: 60 * 60 * 1000, limit: 1000, namespace: "api" }, // Default API limit
  };

    private static async enforceRegularRateLimit(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<NextResponse> {
    const pathname = request.nextUrl.pathname;
    const config = this.getConfigForPath(pathname);

    const { success, limit, remaining, reset } = await rateLimit({
      interval: config.interval,
      limit: config.limit,
      uniqueId: context.clientIp,
      namespace: config.namespace,
    });

    return this.createRateLimitResponse(success, {
      limit,
      remaining,
      reset,
      used: limit - remaining,
    });
  }

  private static getConfigForPath(pathname: string) {
    // Find the most specific path match
    const matchingPath = Object.keys(this.PATH_CONFIGS)
      .filter((path) => pathname.startsWith(path))
      .sort((a, b) => b.length - a.length)[0]; // Longest match first

    return this.PATH_CONFIGS[matchingPath] || this.DEFAULT_CONFIG;
  }

  private static createRateLimitResponse(
    success: boolean,
    info: { limit: number; remaining: number; reset: number; used: number }
  ): NextResponse {
    const response = success
      ? NextResponse.next()
      : new NextResponse("Too many requests", {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (info.reset - Date.now()) / 1000
            ).toString(),
          },
        });

    // Add rate limit headers
    const headers = {
      "X-RateLimit-Limit": info.limit.toString(),
      "X-RateLimit-Remaining": info.remaining.toString(),
      "X-RateLimit-Reset": new Date(info.reset).toISOString(),
      "X-RateLimit-Used": info.used.toString(),
    };

    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
}
