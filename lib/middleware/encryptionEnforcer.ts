// ========================================
// 🔒 TASK 15: ENCRYPTION ENFORCER - Data Protection Specialist
// Responsibility: Enforce encryption standards and secure data handling
// ========================================

// File: src/lib/middleware/encryptionEnforcer.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";

interface EncryptionViolation {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  action: "BLOCK" | "WARN" | "REDIRECT";
}

interface EncryptionMetrics {
  totalRequests: number;
  secureRequests: number;
  violations: number;
  redirects: number;
  lastReset: number;
}

export class EncryptionEnforcer {
  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────
  private static readonly REQUIRED_TLS_VERSION = "1.2";
  private static readonly METRICS_RESET_INTERVAL = 60 * 60 * 1000; // 1 hour

  private static readonly SENSITIVE_PATHS = [
    "/auth",
    "/api/auth",
    "/dashboard",
    "/admin",
    "/settings",
    "/profile",
    "/api/s",
    "/api/t",
    "/api/a",
    "/api/sa",
    "/api/admin",
    "/api/user",
  ];

  private static readonly HIGHLY_SENSITIVE_PATHS = [
    "/auth/login",
    "/auth/register",
    "/auth/reset",
    "/api/s/signup",
    "/api/s/login",
    "/api/auth/session",
    "/admin/users",
    "/settings/security",
  ];

  private static readonly SENSITIVE_URL_PATTERNS = [
    { pattern: /password/i, name: "password" },
    { pattern: /token/i, name: "token" },
    { pattern: /key=/i, name: "api_key" },
    { pattern: /secret/i, name: "secret" },
    { pattern: /ssn=/i, name: "ssn" },
    { pattern: /credit/i, name: "credit_card" },
    { pattern: /card_?num/i, name: "card_number" },
    { pattern: /cvv/i, name: "cvv" },
    { pattern: /pin=/i, name: "pin" },
    { pattern: /otp=/i, name: "otp" },
    { pattern: /auth_?code/i, name: "auth_code" },
    { pattern: /session_?id/i, name: "session_id" },
    { pattern: /private/i, name: "private_key" },
    { pattern: /nin=/i, name: "nin" },
    { pattern: /bvn=/i, name: "bvn" },
    { pattern: /email=.*@/i, name: "email" },
    { pattern: /phone=\d{10,}/i, name: "phone" },
  ];

  private static readonly ALLOWED_INSECURE_PATHS = [
    "/api/health",
    "/api/ping",
    "/_next",
    "/favicon.ico",
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // METRICS TRACKING
  // ─────────────────────────────────────────────────────────────────────────
  private static metrics: EncryptionMetrics = {
    totalRequests: 0,
    secureRequests: 0,
    violations: 0,
    redirects: 0,
    lastReset: Date.now(),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN ENFORCEMENT METHOD
  // ─────────────────────────────────────────────────────────────────────────
  static enforce(
    request: NextRequest,
    context: MiddlewareContext
  ): NextResponse {
    try {
      this.updateMetrics();
      this.metrics.totalRequests++;

      const pathname = request.nextUrl.pathname;
      const violations: EncryptionViolation[] = [];

      // Skip enforcement for allowed insecure paths
      if (this.isAllowedInsecurePath(pathname)) {
        return NextResponse.next();
      }

      // 1. Check HTTPS enforcement
      const httpsViolation = this.checkHTTPSEnforcement(request);
      if (httpsViolation) {
        violations.push(httpsViolation);
        if (httpsViolation.action === "REDIRECT") {
          this.metrics.redirects++;
          this.logViolation(request, httpsViolation);
          return this.redirectToHTTPS(request);
        }
      } else {
        this.metrics.secureRequests++;
      }

      // 2. Check for sensitive data in URL
      const urlViolation = this.checkSensitiveDataInURL(request);
      if (urlViolation) {
        violations.push(urlViolation);
        if (urlViolation.action === "BLOCK") {
          this.metrics.violations++;
          this.logViolation(request, urlViolation);
          return this.blockRequest(urlViolation);
        }
      }

      // 3. Check request headers for security issues
      const headerViolations = this.checkRequestHeaders(request);
      violations.push(...headerViolations);

      // 4. Check content type for sensitive paths
      if (this.isHighlySensitivePath(pathname)) {
        const contentViolation = this.checkContentType(request);
        if (contentViolation) {
          violations.push(contentViolation);
        }
      }

      // Log warnings for non-blocking violations
      violations
        .filter((v) => v.action === "WARN")
        .forEach((v) => this.logViolation(request, v));

      // Build response with security headers
      const response = NextResponse.next();
      this.addSecurityHeaders(response, pathname);

      // Add enforcement metadata
      response.headers.set("x-encryption-enforced", "true");
      response.headers.set(
        "x-security-score",
        this.calculateSecurityScore(violations).toString()
      );

      if (violations.length > 0) {
        response.headers.set(
          "x-security-warnings",
          violations.length.toString()
        );
      }

      return response;
    } catch (error) {
      console.error("[ENCRYPTION ENFORCER] ❌ Error:", error);
      // Fail open but log the error
      return NextResponse.next();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HTTPS ENFORCEMENT
  // ─────────────────────────────────────────────────────────────────────────
  private static checkHTTPSEnforcement(
    request: NextRequest
  ): EncryptionViolation | null {
    if (this.isSecureConnection(request)) {
      return null;
    }

    // In production, always redirect to HTTPS
    if (process.env.NODE_ENV === "production") {
      return {
        type: "INSECURE_CONNECTION",
        severity: "CRITICAL",
        description: "HTTP connection attempted in production",
        action: "REDIRECT",
      };
    }

    // In development, warn but allow
    return {
      type: "INSECURE_CONNECTION_DEV",
      severity: "LOW",
      description: "HTTP connection in development mode",
      action: "WARN",
    };
  }

  private static isSecureConnection(request: NextRequest): boolean {
    // Check multiple indicators for HTTPS
    const proto = request.headers.get("x-forwarded-proto");
    const scheme = request.nextUrl.protocol;
    const cfVisitor = request.headers.get("cf-visitor"); // Cloudflare

    if (scheme === "https:") return true;
    if (proto === "https") return true;
    if (cfVisitor?.includes('"scheme":"https"')) return true;

    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SENSITIVE DATA DETECTION
  // ─────────────────────────────────────────────────────────────────────────
  private static checkSensitiveDataInURL(
    request: NextRequest
  ): EncryptionViolation | null {
    const url = request.url;
    const searchParams = request.nextUrl.search;

    // Check URL and query parameters
    const fullUrl = url + searchParams;

    for (const { pattern, name } of this.SENSITIVE_URL_PATTERNS) {
      if (pattern.test(fullUrl)) {
        return {
          type: "SENSITIVE_DATA_IN_URL",
          severity: "HIGH",
          description: `Sensitive data detected in URL: ${name}`,
          action: "BLOCK",
        };
      }
    }

    // Check for base64 encoded sensitive data
    if (this.containsEncodedSensitiveData(searchParams)) {
      return {
        type: "ENCODED_SENSITIVE_DATA",
        severity: "MEDIUM",
        description: "Potentially encoded sensitive data in URL",
        action: "WARN",
      };
    }

    return null;
  }

  private static containsEncodedSensitiveData(params: string): boolean {
    // Look for suspiciously long base64-like strings in params
    const base64Pattern = /[A-Za-z0-9+/=]{50,}/;
    return base64Pattern.test(params);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REQUEST HEADER CHECKS
  // ─────────────────────────────────────────────────────────────────────────
  private static checkRequestHeaders(
    request: NextRequest
  ): EncryptionViolation[] {
    const violations: EncryptionViolation[] = [];

    // Check for missing security headers in requests
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");

    // Warn about requests without origin on sensitive paths
    if (
      this.isSensitivePath(request.nextUrl.pathname) &&
      request.method !== "GET" &&
      !origin
    ) {
      violations.push({
        type: "MISSING_ORIGIN",
        severity: "LOW",
        description: "POST/PUT/DELETE request without Origin header",
        action: "WARN",
      });
    }

    // Check for downgrade attacks
    const upgradeInsecure = request.headers.get("upgrade-insecure-requests");
    if (upgradeInsecure === "0") {
      violations.push({
        type: "DOWNGRADE_ATTEMPT",
        severity: "MEDIUM",
        description: "Client refusing to upgrade insecure requests",
        action: "WARN",
      });
    }

    return violations;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONTENT TYPE CHECKS
  // ─────────────────────────────────────────────────────────────────────────
  private static checkContentType(
    request: NextRequest
  ): EncryptionViolation | null {
    const contentType = request.headers.get("content-type");

    // For POST/PUT requests on sensitive paths, require JSON
    if (
      ["POST", "PUT", "PATCH"].includes(request.method) &&
      contentType &&
      !contentType.includes("application/json") &&
      !contentType.includes("multipart/form-data")
    ) {
      return {
        type: "INSECURE_CONTENT_TYPE",
        severity: "LOW",
        description: `Unusual content-type for sensitive endpoint: ${contentType}`,
        action: "WARN",
      };
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATH UTILITIES
  // ─────────────────────────────────────────────────────────────────────────
  private static isSensitivePath(pathname: string): boolean {
    return this.SENSITIVE_PATHS.some(
      (path) => pathname === path || pathname.startsWith(path + "/")
    );
  }

  private static isHighlySensitivePath(pathname: string): boolean {
    return this.HIGHLY_SENSITIVE_PATHS.some(
      (path) => pathname === path || pathname.startsWith(path)
    );
  }

  private static isAllowedInsecurePath(pathname: string): boolean {
    return this.ALLOWED_INSECURE_PATHS.some(
      (path) => pathname === path || pathname.startsWith(path)
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESPONSE BUILDERS
  // ─────────────────────────────────────────────────────────────────────────
  private static redirectToHTTPS(request: NextRequest): NextResponse {
    const httpsUrl = request.url.replace(/^http:/, "https:");
    console.log(`[ENCRYPTION ENFORCER] 🔄 Redirecting to HTTPS: ${httpsUrl}`);
    return NextResponse.redirect(httpsUrl, 301);
  }

  private static blockRequest(violation: EncryptionViolation): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: violation.type,
          message: "Request blocked due to security policy violation",
          details:
            process.env.NODE_ENV === "development"
              ? violation.description
              : undefined,
        },
      },
      {
        status: 400,
        headers: {
          "x-blocked-reason": violation.type,
          "x-security-violation": "true",
        },
      }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECURITY HEADERS
  // ─────────────────────────────────────────────────────────────────────────
  private static addSecurityHeaders(
    response: NextResponse,
    pathname: string
  ): void {
    // Always add HSTS in production
    if (process.env.NODE_ENV === "production") {
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
      );
    }

    // Add extra headers for sensitive paths
    if (this.isSensitivePath(pathname)) {
      // Upgrade insecure requests
      response.headers.set(
        "Content-Security-Policy",
        "upgrade-insecure-requests"
      );

      // Require secure cookies
      response.headers.set("x-require-secure-cookies", "true");

      // Prevent caching of sensitive responses
      response.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
      );
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
    }

    // Extra protection for highly sensitive paths
    if (this.isHighlySensitivePath(pathname)) {
      // Prevent embedding
      response.headers.set("X-Frame-Options", "DENY");

      // Strict content type
      response.headers.set("X-Content-Type-Options", "nosniff");

      // Referrer policy
      response.headers.set("Referrer-Policy", "no-referrer");

      // Permissions policy
      response.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=()"
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // METRICS & LOGGING
  // ─────────────────────────────────────────────────────────────────────────
  private static updateMetrics(): void {
    if (Date.now() - this.metrics.lastReset > this.METRICS_RESET_INTERVAL) {
      console.log(`[ENCRYPTION ENFORCER] 📊 Hourly Stats:`, {
        total: this.metrics.totalRequests,
        secure: this.metrics.secureRequests,
        violations: this.metrics.violations,
        redirects: this.metrics.redirects,
        securePercentage:
          this.metrics.totalRequests > 0
            ? (
                (this.metrics.secureRequests / this.metrics.totalRequests) *
                100
              ).toFixed(1) + "%"
            : "N/A",
      });

      this.metrics = {
        totalRequests: 0,
        secureRequests: 0,
        violations: 0,
        redirects: 0,
        lastReset: Date.now(),
      };
    }
  }

  private static logViolation(
    request: NextRequest,
    violation: EncryptionViolation
  ): void {
    const icon =
      violation.severity === "CRITICAL"
        ? "🚨"
        : violation.severity === "HIGH"
        ? "❌"
        : violation.severity === "MEDIUM"
        ? "⚠️"
        : "ℹ️";

    console.log(
      `[ENCRYPTION ENFORCER] ${icon} ${violation.severity}: ${violation.type}`,
      {
        path: request.nextUrl.pathname,
        action: violation.action,
        description: violation.description,
        ip: request.headers.get("x-forwarded-for") || "unknown",
      }
    );
  }

  private static calculateSecurityScore(
    violations: EncryptionViolation[]
  ): number {
    // Start at 100, deduct points for violations
    let score = 100;

    for (const violation of violations) {
      switch (violation.severity) {
        case "CRITICAL":
          score -= 40;
          break;
        case "HIGH":
          score -= 25;
          break;
        case "MEDIUM":
          score -= 10;
          break;
        case "LOW":
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────
  static getMetrics(): EncryptionMetrics {
    return { ...this.metrics };
  }

  static resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      secureRequests: 0,
      violations: 0,
      redirects: 0,
      lastReset: Date.now(),
    };
  }
}
