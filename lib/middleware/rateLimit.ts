// File: src/lib/rate-limit.ts
import { getClientIp } from "@/lib/utils/client-ip";
interface RateLimitEntry {
  count: number;
  reset: number;
}

const localStore = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  interval: number; // milliseconds
  limit: number;
  uniqueId: string; // Typically IP or user ID
  namespace?: string;
}

export const rateLimit = async ({
  interval,
  limit,
  uniqueId,
  namespace = "rl",
}: RateLimitOptions): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> => {
  const key = `${namespace}:${uniqueId}`;
  const now = Date.now();

  let entry = localStore.get(key);

  // Reset if window has passed
  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + interval };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      limit,
      remaining: Math.max(0, limit - entry.count),
      reset: entry.reset,
    };
  }

  // Increment count
  entry.count += 1;
  localStore.set(key, entry);

  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    reset: entry.reset,
  };
};

// Convenience function for IP-based rate limiting
export const rateLimitByIp = async (
  req: Request,
  options: { interval: number; limit: number }
) => {
  const ip = getClientIp(req);
  return rateLimit({
    ...options,
    uniqueId: ip || "unknown",
    namespace: "ip",
  });
};
