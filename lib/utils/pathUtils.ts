// src/lib/utils/pathsUtils.ts

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC PATHS — No auth required
// ─────────────────────────────────────────────────────────────────────────────
export const PUBLIC_PATHS = [
  "/",
  "/sitemap",
  "/about",
  "/contact",
  "/school",
  "/help",
  "/faq",
  "/terms",
  "/privacy",
  "/support",
  "/news",
  "/blog",
  "/events",
  "/gallery",
  "/public",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// AUTH PATHS — Login, signup, password reset, etc.
// ─────────────────────────────────────────────────────────────────────────────
export const AUTH_PATHS = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/resend-verification",
  "/auth/callback",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE PATHS — Require authentication
// ─────────────────────────────────────────────────────────────────────────────
export const PRIVATE_PATHS = [
  "/dashboard",
  "/profile",
  "/courses",
  "/grades",
  "/assignments",
  "/schedule",
  "/admin",
  "/settings",
  "/notifications",
  "/messages",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// CACHEABLE PATHS — Safe to cache (GET-only, stable data)
// ─────────────────────────────────────────────────────────────────────────────
export const CACHEABLE_PATHS = [
  // Public pages
  "/",
  "/about",
  "/contact",
  "/school",
  "/help",
  "/faq",
  "/terms",
  "/privacy",
  "/support",
  "/news",
  "/blog",
  "/events",
  "/gallery",

  // Wildcard public sections
  "/school/*",
  "/help/*",
  "/news/*",
  "/blog/*",
  "/events/*",
  "/gallery/*",

  // Auth pages (static forms)
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",

  // Static assets
  "/_next/*",
  "/static/*",
  "/assets/*",
  "/images/*",
  "/uploads/public/*",
  "/media/*",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",

  // Public API routes (stable data)
  "/api/public/*",
  "/api/courses/public",
  "/api/courses/list",
  "/api/courses/details/*",
  "/api/school/info",
  "/api/school/faculties",
  "/api/school/departments",
  "/api/events/public",
  "/api/news/public",
  "/api/static/*",

  // Grade summary (short cache)
  "/api/grades/summary",
  "/api/grades/performance",
  "/api/grades/recent",

  // User public profile
  "/api/user/profile/public/*",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// NON-CACHEABLE PATHS — Dynamic, user-specific, or mutating
// ─────────────────────────────────────────────────────────────────────────────
export const NON_CACHEABLE_PATHS = [
  // Auth endpoints
  "/api/auth/*",

  // User-specific
  "/api/user/me",
  "/api/user/profile",
  "/api/user/settings",

  // Grades (sensitive/full)
  "/api/grades/raw",
  "/api/grades/export",

  // Assignments
  "/api/assignments/submit",
  "/api/assignments/submissions/*",
  "/api/assignments/grade",

  // Admin & sensitive operations
  "/api/admin/*",
  "/api/a/*",

  // Payments & transactions
  "/api/payments/*",
  "/api/transactions/*",

  // Real-time / dynamic
  "/api/notifications",
  "/api/messages",
  "/api/chat/*",

  // Form submissions
  "/api/contact",
  "/api/forms/*",

  // Any mutation endpoints
  "/api/*/create",
  "/api/*/update",
  "/api/*/delete",
  "/api/*/submit",
  "/api/*/upload",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
export type PublicPath = (typeof PUBLIC_PATHS)[number];
export type AuthPath = (typeof AUTH_PATHS)[number];
export type PrivatePath = (typeof PRIVATE_PATHS)[number];
export type CacheablePath = (typeof CACHEABLE_PATHS)[number];
export type NonCacheablePath = (typeof NON_CACHEABLE_PATHS)[number];

// ─────────────────────────────────────────────────────────────────────────────
// IMPROVED PATH MATCHER (supports /* wildcards correctly)
// ─────────────────────────────────────────────────────────────────────────────
export function matchPath(
  targetPath: string,
  patterns: readonly string[]
): boolean {
  return patterns.some((pattern) => {
    if (pattern === targetPath) return true;

    if (pattern.endsWith("/*")) {
      const base = pattern.slice(0, -2);
      return targetPath === base || targetPath.startsWith(base + "/");
    }

    if (pattern.includes("*")) {
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, "[^/]*").replace(/\//g, "\\/") + "$"
      );
      return regex.test(targetPath);
    }

    return false;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE GUARDS
// ─────────────────────────────────────────────────────────────────────────────
export const isPublicPath = (path: string): path is PublicPath =>
  matchPath(path, PUBLIC_PATHS);

export const isAuthPath = (path: string): path is AuthPath =>
  matchPath(path, AUTH_PATHS);

export const isPrivatePath = (path: string): path is PrivatePath =>
  matchPath(path, PRIVATE_PATHS);

export const isCacheablePath = (path: string): path is CacheablePath =>
  matchPath(path, CACHEABLE_PATHS);

export const isNonCacheablePath = (path: string): path is NonCacheablePath =>
  matchPath(path, NON_CACHEABLE_PATHS);

// ─────────────────────────────────────────────────────────────────────────────
// AUTH & ACCESS HELPERS
// ─────────────────────────────────────────────────────────────────────────────
export const requiresAuth = (path: string): boolean =>
  isPrivatePath(path) && !isAuthPath(path);

export const isAccessibleWithoutAuth = (path: string): boolean =>
  isPublicPath(path) || isAuthPath(path);

// ─────────────────────────────────────────────────────────────────────────────
// CACHE DURATION (ms)
// ─────────────────────────────────────────────────────────────────────────────
export const getCacheDuration = (path: string): number => {
  if (matchPath(path, ["/api/grades/summary", "/api/courses/details/*"])) {
    return 5 * 60 * 1000; // 5 min
  }
  if (
    matchPath(path, ["/api/grades/performance", "/api/assignments/course/*"])
  ) {
    return 2 * 60 * 1000; // 2 min
  }
  if (path === "/api/grades/recent") {
    return 60 * 1000; // 1 min
  }
  if (path.startsWith("/api/courses/") || path.startsWith("/api/school/")) {
    return 10 * 60 * 1000; // 10 min
  }
  if (isCacheablePath(path)) {
    return path.startsWith("/api/") ? 5 * 60 * 1000 : 30 * 60 * 1000;
  }
  return 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// CACHE KEY GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
export const generateCacheKey = (path: string, userId?: string): string => {
  if (userId && path.startsWith("/api/grades/")) {
    return `cache:${path}:user:${userId}`;
  }
  if (path.includes("/api/courses/details/")) {
    const courseId = path.split("/").pop();
    return `cache:${path}:course:${courseId}`;
  }
  return `cache:${path}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// CACHE INVALIDATION PATTERNS
// ─────────────────────────────────────────────────────────────────────────────
export const CACHE_INVALIDATION_PATTERNS = {
  GRADES_UPDATED: ["/api/grades/*"],
  ASSIGNMENTS_UPDATED: ["/api/assignments/*", "/api/grades/*"],
  COURSES_UPDATED: ["/api/courses/*"],
  USER_PROFILE_UPDATED: ["/api/user/profile/public/*"],
  NEWS_EVENTS_UPDATED: ["/api/news/*", "/api/events/*"],
} as const;

export const shouldInvalidateCache = (
  path: string,
  operation: keyof typeof CACHE_INVALIDATION_PATTERNS
): boolean => matchPath(path, CACHE_INVALIDATION_PATTERNS[operation]);

// ─────────────────────────────────────────────────────────────────────────────
// PATH TYPE DETECTION
// ─────────────────────────────────────────────────────────────────────────────
export const getPathType = (
  path: string
): "public" | "private" | "auth" | "unknown" => {
  if (isPublicPath(path)) return "public";
  if (isPrivatePath(path)) return "private";
  if (isAuthPath(path)) return "auth";
  return "unknown";
};
