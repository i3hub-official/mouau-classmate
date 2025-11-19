// lib/services/rateLimitService.ts
import { prisma } from "@/lib/server/prisma";

export class StudentRateLimitService {
  /**
   * Check if a user has exceeded the rate limit for a specific action
   */
  static async checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - windowMs);
      const windowEnd = now;

      // Find or create rate limit record
      let rateLimit = await prisma.rateLimit.findFirst({
        where: {
          key,
          windowStart: {
            gte: windowStart,
          },
        },
      });

      if (!rateLimit) {
        // Create a new rate limit record
        rateLimit = await prisma.rateLimit.create({
          data: {
            key,
            count: 1,
            windowStart,
            windowEnd,
          },
        });

        return {
          allowed: true,
          remaining: maxRequests - 1,
          resetTime: windowEnd,
        };
      }

      // Update the existing record
      const newCount = rateLimit.count + 1;
      const allowed = newCount <= maxRequests;

      await prisma.rateLimit.update({
        where: { id: rateLimit.id },
        data: {
          count: newCount,
          updatedAt: now,
        },
      });

      return {
        allowed,
        remaining: Math.max(0, maxRequests - newCount),
        resetTime: windowEnd,
      };
    } catch (error) {
      console.error("Error checking rate limit:", error);
      // In case of error, allow the request to avoid blocking legitimate traffic
      return {
        allowed: true,
        remaining: 0,
        resetTime: new Date(Date.now() + windowMs),
      };
    }
  }

  /**
   * Check if a user has exceeded the rate limit for password reset requests
   */
  static async checkPasswordResetRateLimit(
    userId: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const key = `password_reset:${userId}`;
    const maxRequests = 3; // 3 requests per hour
    const windowMs = 60 * 60 * 1000; // 1 hour

    return this.checkRateLimit(key, maxRequests, windowMs);
  }

  /**
   * Check if a user has exceeded the rate limit for email verification requests
   */
  static async checkEmailVerificationRateLimit(
    userId: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const key = `email_verification:${userId}`;
    const maxRequests = 5; // 5 requests per day
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours

    return this.checkRateLimit(key, maxRequests, windowMs);
  }

  /**
   * Check if a user has exceeded the rate limit for assignment submissions
   */
  static async checkAssignmentSubmissionRateLimit(
    userId: string,
    assignmentId: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const key = `assignment_submission:${userId}:${assignmentId}`;
    const maxRequests = 10; // 10 submissions per day
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours

    return this.checkRateLimit(key, maxRequests, windowMs);
  }

  /**
   * Check if an IP address has exceeded the rate limit for login attempts
   */
  static async checkLoginRateLimit(
    ipAddress: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const key = `login:${ipAddress}`;
    const maxRequests = 20; // 20 login attempts per 15 minutes
    const windowMs = 15 * 60 * 1000; // 15 minutes

    return this.checkRateLimit(key, maxRequests, windowMs);
  }

  /**
   * Check if a user has exceeded the rate limit for profile updates
   */
  static async checkProfileUpdateRateLimit(
    userId: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    const key = `profile_update:${userId}`;
    const maxRequests = 5; // 5 profile updates per hour
    const windowMs = 60 * 60 * 1000; // 1 hour

    return this.checkRateLimit(key, maxRequests, windowMs);
  }

  /**
   * Clean up expired rate limit records
   */
  static async cleanupExpiredRateLimits(): Promise<void> {
    try {
      const now = new Date();

      // Delete rate limit records that have expired
      await prisma.rateLimit.deleteMany({
        where: {
          windowEnd: {
            lt: now,
          },
        },
      });

      console.log("Expired rate limit records cleaned up");
    } catch (error) {
      console.error("Error cleaning up expired rate limits:", error);
    }
  }
}
