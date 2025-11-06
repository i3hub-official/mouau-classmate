// File: src/lib/utils/pathsUtils.ts
export const PUBLIC_PATHS = [
  "/",
  "/sitemap",
  "/signin",
  "/signup",
  "/about",
] as const;

export const PRIVATE_PATHS = [
  "/dashboard",
  "/profile",
  "/courses",
  "/grades",
  "/admin",
  "/assignments",
  "/schedule",
] as const;

export const AUTH_PATHS = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/resend-verification",
] as const;

export const CACHEABLE_PATHS = [
  // Public pages
  "/",
  "/about",
  "/contact",
  "/school",
  "/school/*",
  "/help",
  "/help/*",
  "/faq",
  "/terms",
  "/privacy",
  "/support",
  "/news",
  "/news/*",
  "/blog",
  "/blog/*",
  "/events",
  "/events/*",
  "/gallery",
  "/gallery/*",

  // Authentication pages (read-only data)
  "/signin",
  "/forgot-password",
  "/reset-password",

  // File uploads/downloads (static content)
  "/uploads/*",
  "/downloads/*",
  "/documents/public/*", // Only public documents
  "/media/*",

  // Static assets
  "/static/*",
  "/assets/*",
  "/images/*",
  "/css/*",
  "/js/*",
  "/fonts/*",
  "/icons/*",
  "/favicon.ico",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
  "/sitemap/*",

  // API Routes - Cacheable (GET requests with stable data)
  "/api/courses/public/*", // Public course information
  "/api/school/*", // School information (faculties, departments, etc.)
  "/api/events/*", // Public events
  "/api/news/*", // News and announcements
  "/api/static/*", // Static data endpoints

  // Grade-related API routes with appropriate caching
  "/api/grades/summary", // Grade summary (cache for 5 minutes)
  "/api/grades/performance", // Performance metrics (cache for 2 minutes)
  "/api/grades/recent", // Recent grades (cache for 1 minute)
  "/api/grades/course", // Course grades (cache for 5 minutes)

  // Course-related cacheable APIs
  "/api/courses/list", // Course list (cache for 10 minutes)
  "/api/courses/public", // Public course catalog
  "/api/courses/details/*", // Course details

  // User profile (cache for short periods)
  "/api/user/profile/public/*", // Public profile data

  // Assignment-related cacheable APIs
  "/api/assignments/public/*", // Public assignment info
  "/api/assignments/course/*", // Course assignments (cache for 2 minutes)
] as const;

// NON-CACHEABLE PATHS (Dynamic/User-specific data)
export const NON_CACHEABLE_PATHS = [
  // User-specific data (should never be cached)
  "/api/user/me",
  "/api/user/profile",
  "/api/user/settings",

  // Grade-related APIs that should not be cached
  "/api/grades/export", // Export functionality (dynamic)
  "/api/grades/raw", // Raw grade data

  // Assignment submission endpoints
  "/api/assignments/submit",
  "/api/assignments/submissions/*",
  "/api/assignments/grade",

  // Authentication endpoints
  "/api/auth/*",

  // Admin endpoints
  "/api/admin/*",

  // Payment/transaction endpoints
  "/api/payments/*",
  "/api/transactions/*",

  // Real-time data
  "/api/notifications",
  "/api/messages",
  "/api/chat/*",

  // Form submissions
  "/api/forms/*",
  "/api/contact",

  // Any POST/PUT/DELETE endpoints
  "/api/*/create",
  "/api/*/update",
  "/api/*/delete",
  "/api/*/submit",
] as const;

// Type exports
export type PublicPath = (typeof PUBLIC_PATHS)[number];
export type PrivatePath = (typeof PRIVATE_PATHS)[number];
export type AuthPath = (typeof AUTH_PATHS)[number];
export type CacheablePath = (typeof CACHEABLE_PATHS)[number];
export type NonCacheablePath = (typeof NON_CACHEABLE_PATHS)[number];

// Utility function for path matching - improved version
export function matchPath(
  targetPath: string,
  patterns: readonly string[]
): boolean {
  return patterns.some((pattern) => {
    // Handle exact match
    if (pattern === targetPath) return true;

    // Handle wildcard patterns
    if (pattern.endsWith("/*")) {
      const basePattern = pattern.slice(0, -2); // Remove the trailing /*

      // Check if targetPath starts with the base pattern
      if (targetPath === basePattern) return true;

      // Check if targetPath starts with basePattern followed by a slash
      if (targetPath.startsWith(`${basePattern}/`)) return true;
    }

    // Handle single wildcard in the middle
    if (pattern.includes("*")) {
      const regexPattern = pattern
        .replace(/\*/g, "[^/]*") // Replace * with regex for any characters except /
        .replace(/\//g, "\\/"); // Escape slashes
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(targetPath);
    }

    return false;
  });
}

// Type guard functions
export function isPublicPath(path: string): path is PublicPath {
  return matchPath(path, PUBLIC_PATHS);
}

export function isPrivatePath(path: string): path is PrivatePath {
  return matchPath(path, PRIVATE_PATHS);
}

export function isAuthPath(path: string): path is AuthPath {
  return matchPath(path, AUTH_PATHS);
}

export function isCacheablePath(path: string): path is CacheablePath {
  return matchPath(path, CACHEABLE_PATHS);
}

export function isNonCacheablePath(path: string): path is NonCacheablePath {
  return matchPath(path, NON_CACHEABLE_PATHS);
}

// Cache duration utilities
export function getCacheDuration(path: string): number {
  // Return cache duration in milliseconds
  if (matchPath(path, ["/api/grades/summary", "/api/grades/course"])) {
    return 5 * 60 * 1000; // 5 minutes for grade summaries
  }

  if (matchPath(path, ["/api/grades/performance"])) {
    return 2 * 60 * 1000; // 2 minutes for performance metrics
  }

  if (matchPath(path, ["/api/grades/recent"])) {
    return 1 * 60 * 1000; // 1 minute for recent grades
  }

  if (matchPath(path, ["/api/courses/list", "/api/courses/details/*"])) {
    return 10 * 60 * 1000; // 10 minutes for course data
  }

  if (matchPath(path, ["/api/assignments/course/*"])) {
    return 2 * 60 * 1000; // 2 minutes for course assignments
  }

  // Default cache durations for other cacheable paths
  if (isCacheablePath(path)) {
    if (path.startsWith("/api/")) {
      return 5 * 60 * 1000; // 5 minutes for API routes
    }
    return 30 * 60 * 1000; // 30 minutes for static pages
  }

  return 0; // No caching
}

// Additional utility functions
export function getPathType(
  path: string
): "public" | "private" | "auth" | "unknown" {
  if (isPublicPath(path)) return "public";
  if (isPrivatePath(path)) return "private";
  if (isAuthPath(path)) return "auth";
  return "unknown";
}

export function requiresAuth(path: string): boolean {
  return isPrivatePath(path);
}

export function isAccessibleWithoutAuth(path: string): boolean {
  return isPublicPath(path) || isAuthPath(path);
}

// Cache key generator for API routes
export function generateCacheKey(path: string, userId?: string): string {
  const baseKey = `cache:${path}`;

  // For user-specific cacheable data, include user ID in the key
  if (userId && path.startsWith("/api/grades/")) {
    return `${baseKey}:user:${userId}`;
  }

  // For course-specific data, extract course ID if present
  if (path.includes("/api/courses/details/")) {
    const courseId = path.split("/").pop();
    return `${baseKey}:course:${courseId}`;
  }

  return baseKey;
}

// Cache invalidation patterns
export const CACHE_INVALIDATION_PATTERNS = {
  GRADES_UPDATED: [
    "/api/grades/summary*",
    "/api/grades/performance*",
    "/api/grades/recent*",
    "/api/grades/course*",
  ],
  ASSIGNMENTS_UPDATED: ["/api/assignments/course/*", "/api/grades/*"],
  COURSES_UPDATED: ["/api/courses/list", "/api/courses/details/*"],
  USER_PROFILE_UPDATED: ["/api/user/profile/public/*"],
} as const;

// Check if path matches any invalidation pattern
export function shouldInvalidateCache(
  path: string,
  operation: keyof typeof CACHE_INVALIDATION_PATTERNS
): boolean {
  const patterns = CACHE_INVALIDATION_PATTERNS[operation];
  return matchPath(path, patterns);
}
