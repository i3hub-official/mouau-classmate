// File: src/lib/middleware/cacheManager.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";
import { isCacheablePath } from "@/lib/utils/pathUtils";

interface CacheEntry {
  data: unknown;
  headers: Record<string, string>;
  timestamp: number;
  expiry: number;
  etag: string;
}

interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Max entries in cache
  varyByUser: boolean; // Include user info in cache key
  varyByQuery: boolean; // Include query params in cache key
}

export class CacheManager {
  private static cache = new Map<string, CacheEntry>();
  private static cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  private static readonly DEFAULT_CONFIG: CacheConfig = {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 1000,
    varyByUser: false,
    varyByQuery: true,
  };

  private static readonly PATH_CONFIGS: Record<string, CacheConfig> = {
    // Public pages - safe to cache without user variation
    "/": {
      enabled: true,
      ttl: 15 * 60 * 1000, // 15 minutes for homepage
      maxSize: 10,
      varyByUser: false,
      varyByQuery: false,
    },
    "/about": {
      enabled: true,
      ttl: 30 * 60 * 1000, // 30 minutes for static pages
      maxSize: 10,
      varyByUser: false,
      varyByQuery: false,
    },
    "/school": {
      enabled: true,
      ttl: 10 * 60 * 1000, // 10 minutes for center pages
      maxSize: 50,
      varyByUser: false,
      varyByQuery: true,
    },
    "/news": {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes for news
      maxSize: 100,
      varyByUser: false,
      varyByQuery: true,
    },
    "/events": {
      enabled: true,
      ttl: 10 * 60 * 1000, // 10 minutes for events
      maxSize: 100,
      varyByUser: false,
      varyByQuery: true,
    },

    // PUBLIC API endpoints only - REMOVED SENSITIVE ROUTES
    "/api/v1/schools": {
      enabled: true,
      ttl: 30 * 60 * 1000, // 30 minutes - school data changes rarely
      maxSize: 50,
      varyByUser: false,
      varyByQuery: true,
    },
    "/api/v2": {
      enabled: true,
      ttl: 30 * 60 * 1000, // 30 minutes - center data changes rarely
      maxSize: 50,
      varyByUser: false,
      varyByQuery: true,
    },
    "/api/v1/public": {
      enabled: true,
      ttl: 10 * 60 * 1000, // 10 minutes for public APIs
      maxSize: 200,
      varyByUser: false,
      varyByQuery: true,
    },
    "/api/v1/config/public": {
      enabled: true,
      ttl: 60 * 60 * 1000, // 1 hour - public config changes rarely
      maxSize: 10,
      varyByUser: false,
      varyByQuery: false,
    },
    "/api/v1/news/public": {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes for public news
      maxSize: 100,
      varyByUser: false,
      varyByQuery: true,
    },
    "/api/v1/events/public": {
      enabled: true,
      ttl: 10 * 60 * 1000, // 10 minutes for public events
      maxSize: 100,
      varyByUser: false,
      varyByQuery: true,
    },

    // REMOVED UNSAFE ROUTES:
    // ❌ "/api/v1/audit/stats" - Contains sensitive audit data
    // ❌ "/api/v1/audit" - Audit logs are sensitive
    // ❌ "/api/auth" - Authentication data should not be cached
  };

  // Blacklisted paths that should NEVER be cached
  private static readonly NEVER_CACHE_PATTERNS = [
    /^\/api\/auth/, // All auth endpoints
    /^\/api\/v1\/audit/, // All audit endpoints
    /^\/api\/v1\/users/, // All user endpoints
    /^\/api\/v1\/admin/, // All admin endpoints
    /^\/admin/, // Admin pages
    /^\/dashboard/, // User dashboards
    /^\/profile/, // User profiles
    /^\/settings/, // User settings
    /^\/api.*\/private/, // Any private API
  ];

  // Helper function to hash data using Web Crypto API
  private static async hashData(
    data: string,
    algorithm = "SHA-256"
  ): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Use crypto.subtle.digest which is available in Edge environments
    const hashBuffer = await crypto.subtle.digest(algorithm, dataBuffer);

    // Convert ArrayBuffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Helper function to generate a short hash for cache keys
  private static async shortHash(data: string, length = 16): Promise<string> {
    const fullHash = await this.hashData(data);
    return fullHash.substring(0, length);
  }

  static async manage(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<NextResponse> {
    try {
      const pathname = request.nextUrl.pathname;

      // Security check: Never cache sensitive paths
      if (this.isSensitivePath(pathname)) {
        console.log(`[CACHE MANAGER] 🚫 Skipping sensitive path: ${pathname}`);
        return NextResponse.next();
      }

      // Check if the path is cacheable
      if (!isCacheablePath(pathname)) {
        return NextResponse.next();
      }

      // Additional security: Don't cache authenticated requests unless explicitly allowed
      if (context.hasSession && !this.isPublicPath(pathname)) {
        console.log(
          `[CACHE MANAGER] 🚫 Skipping authenticated request for: ${pathname}`
        );
        return NextResponse.next();
      }

      const config = this.getConfigForPath(pathname);

      if (!config.enabled || request.method !== "GET") {
        return NextResponse.next();
      }

      // Generate cache key
      const cacheKey = await this.generateCacheKey(request, context, config);

      // Check for cached response
      const cachedEntry = this.cache.get(cacheKey);
      if (cachedEntry && this.isValidEntry(cachedEntry)) {
        // Check ETag for conditional requests
        const clientETag = request.headers.get("if-none-match");
        if (clientETag === cachedEntry.etag) {
          this.cacheStats.hits++;
          return new NextResponse(null, {
            status: 304,
            headers: {
              etag: cachedEntry.etag,
              "x-cache": "HIT-304",
              "x-cache-key": await this.shortHash(cacheKey),
            },
          });
        }

        // Return cached response
        this.cacheStats.hits++;
        const headers = new Headers(cachedEntry.headers);
        headers.set("x-cache", "HIT");
        headers.set(
          "x-cache-age",
          Math.floor((Date.now() - cachedEntry.timestamp) / 1000).toString()
        );
        headers.set("x-cache-key", await this.shortHash(cacheKey));
        headers.set(
          "cache-control",
          `max-age=${Math.floor((cachedEntry.expiry - Date.now()) / 1000)}`
        );

        console.log(`[CACHE MANAGER] ✅ Cache HIT for ${pathname}`);
        return new NextResponse(JSON.stringify(cachedEntry.data), {
          status: 200,
          headers,
        });
      }

      // Cache miss - continue with request but mark for caching
      this.cacheStats.misses++;
      const response = NextResponse.next();
      response.headers.set("x-cache", "MISS");
      response.headers.set("x-cache-key", await this.shortHash(cacheKey));

      console.log(`[CACHE MANAGER] ⏳ Cache MISS for ${pathname}`);
      return response;
    } catch (error) {
      console.error("[CACHE MANAGER] Error in cache management:", error);
      return NextResponse.next();
    }
  }

  // New security method: Check if path contains sensitive data
  private static isSensitivePath(pathname: string): boolean {
    return this.NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(pathname));
  }

  // New method: Check if path is truly public
  private static isPublicPath(pathname: string): boolean {
    const publicPatterns = [
      /^\/$/,
      /^\/about/,
      /^\/contact/,
      /^\/school/,
      /^\/news/,
      /^\/events/,
      /^\/help/,
      /^\/api\/v1\/public/,
      /^\/api\/v1\/schools$/,
      /^\/api\/v1\/schools$/,
    ];

    return publicPatterns.some((pattern) => pattern.test(pathname));
  }

  static async cacheResponse(
    cacheKey: string,
    response: unknown,
    headers: Headers,
    config: CacheConfig
  ): Promise<void> {
    try {
      // Security check: Don't cache responses with user-specific headers
      const sensitiveHeaders = ["set-cookie", "authorization", "x-user-id"];
      const hasSensitiveHeaders = sensitiveHeaders.some((header) =>
        headers.has(header)
      );

      if (hasSensitiveHeaders) {
        console.log(
          `[CACHE MANAGER] 🚫 Skipping cache due to sensitive headers`
        );
        return;
      }

      // Clean cache if at max size
      if (this.cache.size >= config.maxSize) {
        this.evictOldest();
      }

      const etag = await this.generateETag(response);
      const entry: CacheEntry = {
        data: response,
        headers: Object.fromEntries(headers.entries()),
        timestamp: Date.now(),
        expiry: Date.now() + config.ttl,
        etag,
      };

      this.cache.set(cacheKey, entry);
      console.log(
        `[CACHE MANAGER] 💾 Cached response for key: ${await this.shortHash(
          cacheKey
        )}`
      );
    } catch (error) {
      console.error("[CACHE MANAGER] Error caching response:", error);
    }
  }

  private static async generateCacheKey(
    request: NextRequest,
    context: MiddlewareContext,
    config: CacheConfig
  ): Promise<string> {
    let key = `${request.method}:${request.nextUrl.pathname}`;

    if (config.varyByQuery) {
      const params = Array.from(request.nextUrl.searchParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("&");
      if (params) key += `?${params}`;
    }

    // Only vary by user for explicitly configured paths
    if (config.varyByUser && context.hasSession && context.sessionToken) {
      const userHash = await this.hashData(context.sessionToken);
      key += `:user:${userHash.substring(0, 8)}`;
    }

    return key;
  }

  private static isValidEntry(entry: CacheEntry): boolean {
    return Date.now() < entry.expiry;
  }

  private static evictOldest(): void {
    let oldestKey = "";
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.cacheStats.evictions++;
    }
  }

  private static async generateETag(data: unknown): Promise<string> {
    const dataString = JSON.stringify(data);
    const hash = await this.hashData(dataString);
    return `"${hash.substring(0, 32)}"`;
  }

  private static getConfigForPath(pathname: string): CacheConfig {
    // Exact matches first
    if (this.PATH_CONFIGS[pathname]) {
      return this.PATH_CONFIGS[pathname];
    }

    // Pattern matching for prefixes
    for (const [path, config] of Object.entries(this.PATH_CONFIGS)) {
      if (pathname.startsWith(path)) {
        return config;
      }
    }

    return this.DEFAULT_CONFIG;
  }

  static getCacheStats() {
    return {
      ...this.cacheStats,
      size: this.cache.size,
      hitRate:
        this.cacheStats.hits /
          (this.cacheStats.hits + this.cacheStats.misses) || 0,
    };
  }

  static clearCache(): void {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0, evictions: 0 };
    console.log("[CACHE MANAGER] 🗑️ Cache cleared");
  }

  // Enhanced method to check if a path is cacheable
  static async isPathCacheable(pathname: string): Promise<boolean> {
    // First check if it's a sensitive path
    if (this.isSensitivePath(pathname)) {
      return false;
    }

    return isCacheablePath(pathname);
  }

  // New method: Invalidate cache by pattern
  static invalidateByPattern(pattern: RegExp): number {
    let invalidated = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    console.log(
      `[CACHE MANAGER] 🔄 Invalidated ${invalidated} entries matching pattern`
    );
    return invalidated;
  }
}
