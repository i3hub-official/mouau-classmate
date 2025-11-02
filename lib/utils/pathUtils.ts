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
] as const;

// Type exports
export type PublicPath = (typeof PUBLIC_PATHS)[number];
export type PrivatePath = (typeof PRIVATE_PATHS)[number];
export type AuthPath = (typeof AUTH_PATHS)[number];
export type CacheablePath = (typeof CACHEABLE_PATHS)[number];

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
