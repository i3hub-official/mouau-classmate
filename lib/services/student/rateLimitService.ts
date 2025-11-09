// lib/services/rateLimitService.ts
import { prisma } from "@/lib/server/prisma";

export interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number;
  prefix?: string;
}

export interface RateLimitResult {
  isLimited: boolean;
  remainingAttempts: number;
  retryAfter?: number;
  resetTime?: Date;
}

export class RateLimitService {
  private static readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  static async checkRateLimit(
    key: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - options.windowMs);
    const windowEnd = new Date(now.getTime() + options.windowMs);

    try {
      // Clean up old rate limit records periodically
      await this.cleanupExpiredRecords();

      // Find or create rate limit record
      const rateLimit = await prisma.rateLimit.upsert({
        where: {
          key_windowStart: {
            key,
            windowStart,
          },
        },
        create: {
          key,
          count: 1,
          windowStart,
          windowEnd,
        },
        update: {
          count: { increment: 1 },
          updatedAt: now,
        },
      });

      const remainingAttempts = Math.max(0, options.maxAttempts - rateLimit.count);
      const isLimited = rateLimit.count > options.maxAttempts;

      let retryAfter: number | undefined;
      if (isLimited) {
        retryAfter = rateLimit.windowEnd.getTime() - now.getTime();
      }

      return {
        isLimited,
        remainingAttempts,
        retryAfter,
        resetTime: rateLimit.windowEnd,
      };
    } catch (error) {
      console.error("Rate limit check error:", error);
      // Fail open - don't block requests if rate limiting fails
      return {
        isLimited: false,
        remainingAttempts: options.maxAttempts,
      };
    }
  }

  private static async cleanupExpiredRecords(): Promise<void> {
    // Only cleanup occasionally to avoid performance issues
    if (Math.random() > 0.1) { // 10% chance to cleanup
      return;
    }

    try {
      await prisma.rateLimit.deleteMany({
        where: {
          windowEnd: { lt: new Date() },
        },
      });
    } catch (error) {
      console.error("Rate limit cleanup error:", error);
    }
  }

  static async getRateLimitStatus(
    key: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - options.windowMs);

    const rateLimit = await prisma.rateLimit.findUnique({
      where: {
        key_windowStart: {
          key,
          windowStart,
        },
      },
    });

    if (!rateLimit) {
      return {
        isLimited: false,
        remainingAttempts: options.maxAttempts,
      };
    }

    const remainingAttempts = Math.max(0, options.maxAttempts - rateLimit.count);
    const isLimited = rateLimit.count > options.maxAttempts;

    let retryAfter: number | undefined;
    if (isLimited) {
      retryAfter = rateLimit.windowEnd.getTime() - now.getTime();
    }

    return {
      isLimited,
      remainingAttempts,
      retryAfter,
      resetTime: rateLimit.windowEnd,
    };
  }

  static async resetRateLimit(key: string): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours window

    await prisma.rateLimit.deleteMany({
      where: {
        key,
        windowStart: { gte: windowStart },
      },
    });
  }
}