// src/lib/middleware/cacheManager.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";
import { isCacheablePath } from "@/lib/utils/pathUtils";

export class CacheManager {
  private static cache = new Map<string, any>();
  private static cacheStats = { hits: 0, misses: 0, evictions: 0 };

  private static readonly DEFAULT_CONFIG = {
    enabled: true,
    ttl: 5 * 60 * 1000,
    maxSize: 1000,
    varyByUser: false,
    varyByQuery: true,
  };

  private static readonly PATH_CONFIGS: Record<string, any> = {
    "/": { ttl: 15 * 60 * 1000, varyByQuery: false },
    "/about": { ttl: 30 * 60 * 1000 },
    "/api/v1/public": { ttl: 10 * 60 * 1000 },
    "/api/v1/news/public": { ttl: 5 * 60 * 1000 },
  };

  private static readonly NEVER_CACHE = [
    /^\/api\/auth/,
    /^\/a/,
    /^\/dashboard/,
    /^\/api.*private/,
  ];

  // CRITICAL: This must be a static method and called properly
  static async manage(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<NextResponse> {
    try {
      // Fixed: Add null check for pathname
      const pathname = request.nextUrl?.pathname || "";

      // 1. Block sensitive paths
      if (CacheManager.isSensitivePath(pathname)) {
        return NextResponse.next();
      }

      // 2. Only cache known safe paths
      if (!isCacheablePath(pathname)) {
        return NextResponse.next();
      }

      // 3. Never cache authenticated requests
      if (context.hasSession) {
        return NextResponse.next();
      }

      // Fixed: Use CacheManager.DEFAULT_CONFIG instead of this.DEFAULT_CONFIG
      const config = {
        ...CacheManager.DEFAULT_CONFIG,
        ...CacheManager.PATH_CONFIGS[pathname],
      };

      if (!config.enabled || request.method !== "GET") {
        return NextResponse.next();
      }

      // Fixed: Use CacheManager.generateKey instead of this.generateKey
      const key = await CacheManager.generateKey(request, config);
      const cached = CacheManager.cache.get(key);

      if (cached && Date.now() < cached.expiry) {
        CacheManager.cacheStats.hits++;
        return new NextResponse(cached.body, {
          status: cached.status,
          headers: cached.headers,
        });
      }

      CacheManager.cacheStats.misses++;
      const res = NextResponse.next();
      res.headers.set("x-cache", "MISS");
      return res;
    } catch (err) {
      console.error("[CACHE MANAGER] Error:", err);
      return NextResponse.next();
    }
  }

  // These must be static methods
  private static isSensitivePath(path: string): boolean {
    // Fixed: Use CacheManager.NEVER_CACHE instead of this.NEVER_CACHE
    return CacheManager.NEVER_CACHE.some((regex) => regex.test(path));
  }

  private static async generateKey(
    req: NextRequest,
    config: any
  ): Promise<string> {
    let key = req.nextUrl.pathname;
    if (config.varyByQuery) {
      const sorted = Array.from(req.nextUrl.searchParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("&");
      if (sorted) key += `?${sorted}`;
    }
    return key;
  }

  // Public cache response method (used after route handler)
  static async cacheResponse(
    key: string,
    response: NextResponse,
    ttl = 5 * 60 * 1000
  ) {
    if (response.headers.has("set-cookie")) return;

    const cloned = response.clone();
    // Fixed: Use CacheManager.cache instead of this.cache
    CacheManager.cache.set(key, {
      body: await cloned.text(),
      status: cloned.status,
      headers: Object.fromEntries(cloned.headers.entries()),
      expiry: Date.now() + ttl,
    });
  }

  static getStats() {
    // Fixed: Use CacheManager.cacheStats instead of this.cacheStats
    return {
      ...CacheManager.cacheStats,
      size: CacheManager.cache.size,
      hitRate:
        CacheManager.cacheStats.hits /
          (CacheManager.cacheStats.hits + CacheManager.cacheStats.misses) || 0,
    };
  }
}
