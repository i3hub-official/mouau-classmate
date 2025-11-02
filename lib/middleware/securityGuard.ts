// ========================================
// 🔒 SECURITY GUARD - First Line of Defense
// Responsibility: Apply security headers and CORS
// ========================================

// File: src/lib/middleware/securityGuard.ts
import { NextRequest, NextResponse } from "next/server";
import { getCspConfig } from "@/lib/security/cspConfig";
import type { MiddlewareContext } from "./types";

export class SecurityGuard {
  private static readonly ALLOWED_ORIGINS = [
    process.env.NEXT_PUBLIC_BASE_URL,
    "https://*.vercel.app",
  ].filter(Boolean) as string[];

  private static readonly ALLOWED_METHODS = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ];
  private static readonly ALLOWED_HEADERS = ["Content-Type", "Authorization"];

  static apply(request: NextRequest, context: MiddlewareContext): NextResponse {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return this.handlePreflight(request);
    }

    const response = NextResponse.next();

    // Apply security headers
    this.applySecurityHeaders(response);

    // Apply CORS headers
    this.applyCorsHeaders(request, response);

    // Mark security as applied
    response.headers.set("x-security-applied", "true");

    return response;
  }

  private static handlePreflight(request: NextRequest): NextResponse {
    const origin = request.headers.get("origin");
    const isAllowedOrigin = origin && this.isOriginAllowed(origin);

    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": isAllowedOrigin
          ? origin
          : this.ALLOWED_ORIGINS[0],
        "Access-Control-Allow-Methods": this.ALLOWED_METHODS.join(","),
        "Access-Control-Allow-Headers": this.ALLOWED_HEADERS.join(","),
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }

  private static applySecurityHeaders(response: NextResponse): void {
    const headers = {
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy":
        "camera=(), microphone=(), geolocation=(), payment=()",
      "Strict-Transport-Security":
        "max-age=63072000; includeSubDomains; preload",
      "X-XSS-Protection": "1; mode=block",
    };

    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Apply CSP
    const cspConfig = getCspConfig() as Record<string, string[] | string>;
    const cspDirectives = Object.entries(cspConfig)
      .map(([key, values]) => {
        const directive = key.replace(/([A-Z])/g, "-$1").toLowerCase();
        if (Array.isArray(values)) {
          return values.length > 0
            ? `${directive} ${values.join(" ")}`
            : directive;
        }
        return typeof values === "string" && values.length > 0
          ? `${directive} ${values}`
          : null;
      })
      .filter(Boolean)
      .join("; ");

    response.headers.set("Content-Security-Policy", cspDirectives);
  }

  private static applyCorsHeaders(
    request: NextRequest,
    response: NextResponse
  ): void {
    const origin = request.headers.get("origin");
    if (origin && this.isOriginAllowed(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Vary", "Origin");
    }
  }

  private static isOriginAllowed(origin: string): boolean {
    return this.ALLOWED_ORIGINS.some((allowed) =>
      origin.match(new RegExp(allowed.replace("*", ".*")))
    );
  }
}
