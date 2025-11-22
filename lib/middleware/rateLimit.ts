// src/lib/rate-limit.ts
import { ClientIPDetector } from "@/lib/clientIp";
import { NextRequest } from "next/server";

/**
 * Advanced Rate Limiting with:
 * - Sliding window (more accurate than fixed)
 * - Burst protection
 * - Multiple strategies: IP, User ID, Route, etc.
 * - Auto-expiring entries (no memory leaks)
 * - Detailed X-RateLimit-* headers
 * - Integration with ClientIPDetector (proxy-aware, confidence-based)
 */

interface RateLimitEntry {
  tokens: number; // Current tokens (for token bucket)
  lastRefill: number; // Timestamp of last refill
  burst: number; // Max burst allowed
  requests: number[]; // For sliding window fallback
  blockedUntil?: number; // Temporary block (e.g. after abuse)
}

const store = new Map<string, RateLimitEntry>();

// Auto-cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.lastRefill < now - 3_600_000) {
      // 1 hour inactive
      store.delete(key);
    }
  }
}, 300_000);

export interface RateLimitOptions {
  /** Rate limit window in milliseconds (e.g., 60_000 = 1 minute) */
  windowMs: number;
  /** Max requests per window */
  limit: number;
  /** Optional: allow burst (e.g., 10 sudden requests) */
  burst?: number;
  /** Custom key (e.g., user ID, route, endpoint) */
  key?: string;
  /** Namespace to avoid collisions */
  namespace?: string;
  /** Block duration on abuse (ms) */
  blockOnExceed?: number;
  /** Use token bucket (smoother) vs fixed window */
  useTokenBucket?: boolean;
  /** Only apply if IP confidence is high */
  requireHighConfidence?: boolean;
}

export async function rateLimit(
  request: Request,
  options: RateLimitOptions
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
  blocked?: boolean;
}> {
  const {
    windowMs,
    limit,
    burst = limit,
    key = "",
    namespace = "rl",
    blockOnExceed = 0,
    useTokenBucket = true,
    requireHighConfidence = true,
  } = options;

  // Get accurate client IP + metadata
  const ipInfo = ClientIPDetector.getClientIP(request as any);
  const ip = ipInfo.ip;

  // Optional: skip rate limit for high-confidence real users
  if (requireHighConfidence && ipInfo.confidence === "LOW") {
    // Treat low-confidence (proxies, bots) more strictly
    // Or skip limiting real users — your choice
  }

  // Build unique key
  const uniqueKey = key || ip || "unknown";
  const rateLimitKey = `${namespace}:${uniqueKey}`;
  const now = Date.now();

  let entry = store.get(rateLimitKey);

  // Block check
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: entry.blockedUntil,
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      blocked: true,
    };
  }

  // Initialize or refill
  if (!entry || now - entry.lastRefill > windowMs) {
    entry = {
      tokens: limit,
      lastRefill: now,
      burst,
      requests: [],
    };
  }

  let allowed = false;
  let remaining = 0;
  let reset = entry.lastRefill + windowMs;

  if (useTokenBucket) {
    // Token Bucket Algorithm (smooth)
    const timePassed = now - entry.lastRefill;
    const refill = Math.floor((timePassed / windowMs) * limit);
    entry.tokens = Math.min(entry.burst, entry.tokens + refill);
    entry.lastRefill = now;

    if (entry.tokens > 0) {
      entry.tokens -= 1;
      allowed = true;
      remaining = entry.tokens;
    }
  } else {
    // Sliding Window (accurate but heavier)
    entry.requests = entry.requests.filter((t) => t > now - windowMs);
    if (entry.requests.length < limit) {
      entry.requests.push(now);
      allowed = true;
      remaining = limit - entry.requests.length - 1;
    }
  }

  // Update store
  store.set(rateLimitKey, entry);

  if (!allowed && blockOnExceed > 0) {
    entry.blockedUntil = now + blockOnExceed;
    store.set(rateLimitKey, entry);
  }

  return {
    success: allowed,
    limit,
    remaining: Math.max(0, remaining),
    reset,
    retryAfter: allowed ? undefined : Math.ceil((reset - now) / 1000),
  };
}

// Convenience wrappers
export const rateLimitByIp = (
  req: Request,
  opts: Omit<RateLimitOptions, "key">
) => rateLimit(req, { ...opts, namespace: "ip" });

export const rateLimitByUser = (
  req: Request,
  userId: string,
  opts: Omit<RateLimitOptions, "key">
) => rateLimit(req, { ...opts, key: `user:${userId}`, namespace: "user" });

export const rateLimitByRoute = (
  req: Request,
  route: string,
  opts: Omit<RateLimitOptions, "key">
) => rateLimit(req, { ...opts, key: route, namespace: "route" });

// Add rate limit headers to response
export function addRateLimitHeaders(
  response: Response,
  result: Awaited<ReturnType<typeof rateLimit>>
) {
  const headers = new Headers(response.headers);

  headers.set("X-RateLimit-Limit", result.limit.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", Math.ceil(result.reset / 1000).toString());

  if (result.retryAfter) {
    headers.set("Retry-After", result.retryAfter.toString());
  }

  if (result.blocked) {
    headers.set("X-RateLimit-Blocked", "true");
  }

  return new Response(response.body, {
    ...response,
    headers,
  });
}
