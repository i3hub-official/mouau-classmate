// src/lib/middleware/securityGuard.ts
import { NextRequest, NextResponse } from "next/server";
import { getCspConfig } from "@/lib/security/cspConfig";
import type { MiddlewareContext } from "./types";

export class SecurityGuard {
  // ───────────────────────────────────────────────────────────────────────
  // CONFIG: Trusted Origins (supports wildcards & environment fallbacks)
  // ───────────────────────────────────────────────────────────────────────
 
// Inside SecurityGuard.apply() — at the very top
// Moved into the apply() method below
 
  private static readonly ALLOWED_ORIGINS = [
    // Production domain
    process.env.NEXT_PUBLIC_BASE_URL,
    // Vercel preview & deploy URLs
    "https://*.vercel.app",
    "https://*.vercel.pub",
    // Local development
    "http://localhost",
    "https://localhost",
    "http://192.168.0.*",
    "https://192.168.0.*",
    // Optional: Allow trusted mobile apps / desktop clients
    // "capacitor://localhost",
    // "ionic://localhost",
  ].filter(Boolean) as string[];

  private static readonly ALLOWED_METHODS = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
    "HEAD",
  ];

  private static readonly ALLOWED_HEADERS = [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-CSRF-Token",
    "Accept",
    "Origin",
    "Cache-Control",
    "x-client-ip",
    "x-request-id",
  ];

  private static readonly EXPOSED_HEADERS = [
    "x-request-id",
    "x-processing-time",
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
  ];

  // ───────────────────────────────────────────────────────────────────────
  // MAIN ENTRY POINT
  // ───────────────────────────────────────────────────────────────────────
  static apply(request: NextRequest, context: MiddlewareContext): NextResponse {
    // Handle CORS preflight early
    if (request.method === "OPTIONS") {
      return this.handlePreflight(request);
    }

  // Development IP bypass
  if (process.env.NODE_ENV === "development") {
    const ip = context.clientIp || "";
    if (ip === "0.0.0.0" || ip === "127.0.0.1" || ip === "::1") {
      console.log("[SecurityGuard] Local dev IP detected — bypassing strict checks");
      return NextResponse.next(); // Let it through in dev
    }
  }

  // Handle CORS preflight early
  if (request.method === "OPTIONS") {
    return this.handlePreflight(request);
  }

  const response = NextResponse.next();

  // Apply all security + CORS headers
  this.applySecurityHeaders(response, context);
  this.applyCorsHeaders(request, response);

  // Mark as protected
  response.headers.set("x-security-guard", "active");
  response.headers.set("x-protected-by", "MOUAU ClassMate Shield");

  return response;
    const isAllowed = origin ? this.isOriginAllowed(origin) : false;

    const headers = new Headers({
      Vary: "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
      "Access-Control-Allow-Methods": this.ALLOWED_METHODS.join(", "),
      "Access-Control-Allow-Headers": this.ALLOWED_HEADERS.join(", "),
      "Access-Control-Max-Age": "86400", // 24 hours
    });

    if (isAllowed && origin) {
      headers.set("Access-Control-Allow-Origin", origin);
    } else {
      // Still respond 204, but without allowing credentials/origin
      headers.set("Access-Control-Allow-Origin", "null");
    }

    return new NextResponse(null, { status: 204, headers });
  }

  // ───────────────────────────────────────────────────────────────────────
  // Handle CORS Preflight Requests
  // ───────────────────────────────────────────────────────────────────────
  private static handlePreflight(request: NextRequest): NextResponse {
    const origin = request.headers.get("origin");
    const isAllowed = origin ? this.isOriginAllowed(origin) : false;

    const headers = new Headers({
      Vary: "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
      "Access-Control-Allow-Methods": this.ALLOWED_METHODS.join(", "),
      "Access-Control-Allow-Headers": this.ALLOWED_HEADERS.join(", "),
      "Access-Control-Max-Age": "86400", // 24 hours
    });

    if (isAllowed && origin) {
      headers.set("Access-Control-Allow-Origin", origin);
    } else {
      headers.set("Access-Control-Allow-Origin", "null");
    }

    return new NextResponse(null, { status: 204, headers });
  }

  // ───────────────────────────────────────────────────────────────────────
  // SECURITY HEADERS (CSP, HSTS, etc.)
  // ───────────────────────────────────────────────────────────────────────
  private static applySecurityHeaders(
    response: NextResponse,
    context: MiddlewareContext
  ): void {
    const headers: Record<string, string> = {
      // Clickjacking Protection
      "X-Frame-Options": "DENY",

      // MIME Sniffing Protection
      "X-Content-Type-Options": "nosniff",

      // XSS Auditor (legacy but harmless)
      "X-XSS-Protection": "1; mode=block",

      // Referrer Policy
      "Referrer-Policy": "strict-origin-when-cross-origin",

      // Feature Policy → Permissions Policy
      "Permissions-Policy": [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "fullscreen=(self)",
        "accelerometer=()",
        "gyroscope=()",
        "magnetometer=()",
        "usb=()",
      ].join(", "),

      // HSTS — 2 years + preload (must be served over HTTPS!)
      "Strict-Transport-Security":
        "max-age=63072000; includeSubDomains; preload",

      // Prevent DNS prefetching (optional)
      "X-DNS-Prefetch-Control": "off",

      // Hide powered-by (optional)
      "X-Powered-By": "MOUAU ClassMate",
    };

    // Apply headers
    Object.entries(headers).forEach(([key, value]) => {
      if (!response.headers.has(key)) {
        response.headers.set(key, value);
      }
    });

    // ──────────────────────────────
    // Content-Security-Policy (with nonce support)
    // ──────────────────────────────
    const nonce =
      context.nonce || Buffer.from(crypto.randomUUID()).toString("base64");
    const csp = this.buildCsp(nonce, context.isDev);

    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("X-CSP-Nonce", nonce);

    // Store nonce for React SSR (if needed)
    if (!response.headers.has("x-nonce")) {
      response.headers.set("x-nonce", nonce);
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Build Dynamic CSP with Nonce & Dev Mode Support
  // ───────────────────────────────────────────────────────────────────────
  private static buildCsp(nonce: string, isDev: boolean = false): string {
    const baseConfig = getCspConfig();

    const directives = Object.entries(baseConfig)
      .map(([key, values]) => {
        let directive = key.replace(/([A-Z])/g, "-$1").toLowerCase();

        if (Array.isArray(values)) {
          let sources = [...values];

          // Inject nonce where needed
          if (["script-src", "style-src"].includes(directive)) {
            sources = sources.filter((s) => s !== "'unsafe-inline'");
            sources.unshift(`'nonce-${nonce}'`);
          }

          // Dev relaxations
          if (isDev) {
            if (directive === "script-src") sources.push("'unsafe-eval'");
            if (directive === "style-src") sources.push("'unsafe-inline'");
            if (directive === "connect-src")
              sources.push("ws://localhost:3000");
          }

          return sources.length > 0
            ? `${directive} ${sources.join(" ")}`
            : null;
        }

        return `${directive} ${values}`;
      })
      .filter(Boolean)
      .join("; ");

    return directives;
  }

  // ───────────────────────────────────────────────────────────────────────
  // CORS Headers (Runtime)
  // ───────────────────────────────────────────────────────────────────────
  private static applyCorsHeaders(
    request: NextRequest,
    response: NextResponse
  ): void {
    const origin = request.headers.get("origin");

    if (origin && this.isOriginAllowed(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set(
        "Access-Control-Expose-Headers",
        this.EXPOSED_HEADERS.join(", ")
      );
      response.headers.set("Vary", "Origin");
    } else {
      // Explicitly deny if not allowed
      response.headers.set("Access-Control-Allow-Origin", "null");
    }
  }

  // ───────────────────────────────────────────────────────────────────────
  // Origin Validation (supports *.vercel.app)
  // ───────────────────────────────────────────────────────────────────────
  private static isOriginAllowed(origin: string): boolean {
    try {
      const url = new URL(origin);
      return this.ALLOWED_ORIGINS.some((pattern) => {
        const regex = new RegExp(
          "^" +
            pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace("*", ".*") +
            "$"
        );
        return regex.test(origin);
      });
    } catch {
      return false;
    }
  }
}
