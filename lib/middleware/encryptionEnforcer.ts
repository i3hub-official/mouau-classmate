// ========================================
// 🔒 TASK 15: ENCRYPTION ENFORCER - Data Protection Specialist
// Responsibility: Enforce encryption standards and secure data handling
// ========================================

// File: src/lib/middleware/encryptionEnforcer.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";

export class EncryptionEnforcer {
  private static readonly REQUIRED_TLS_VERSION = "1.2";
  private static readonly SENSITIVE_PATHS = [
       "/api/auth",
    "/dashboard",
    "/dashboard/*",
  ];

  static enforce(
    request: NextRequest,
    context: MiddlewareContext
  ): NextResponse {
    try {
      // Enforce HTTPS in production
      if (
        process.env.NODE_ENV === "production" &&
        !this.isSecureConnection(request)
      ) {
        console.log(`[ENCRYPTION ENFORCER] ❌ Insecure connection blocked`);
        return this.redirectToHTTPS(request);
      }

      // Check for sensitive data in URLs (should be in body)
      if (this.hasSensitiveDataInURL(request.url)) {
        console.log(`[ENCRYPTION ENFORCER] ❌ Sensitive data in URL blocked`);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "SENSITIVE_DATA_IN_URL",
              message: "Sensitive data must not be sent in URL parameters",
            },
          },
          { status: 400 }
        );
      }

      // Enforce strong encryption headers for sensitive paths
      const response = NextResponse.next();

      if (this.isSensitivePath(request.nextUrl.pathname)) {
        this.addEncryptionHeaders(response);
      }

      response.headers.set("x-encryption-enforced", "true");
      return response;
    } catch (error) {
      console.error("[ENCRYPTION ENFORCER] Error enforcing encryption:", error);
      return NextResponse.next();
    }
  }

  private static isSecureConnection(request: NextRequest): boolean {
    // Check various ways HTTPS might be indicated
    const proto = request.headers.get("x-forwarded-proto");
    const scheme = request.nextUrl.protocol;

    return scheme === "https:" || proto === "https";
  }

  private static hasSensitiveDataInURL(url: string): boolean {
    const sensitivePatterns = [
      /password=/i,
      /token=/i,
      /key=/i,
      /secret=/i,
      /ssn=/i,
      /credit/i,
      /card/i,
    ];

    return sensitivePatterns.some((pattern) => pattern.test(url));
  }

  private static isSensitivePath(pathname: string): boolean {
    return this.SENSITIVE_PATHS.some((path) => pathname.startsWith(path));
  }

  private static redirectToHTTPS(request: NextRequest): NextResponse {
    const httpsUrl = request.url.replace(/^http:/, "https:");
    return NextResponse.redirect(httpsUrl, 301);
  }

  private static addEncryptionHeaders(response: NextResponse): void {
    // Force HTTPS for future requests
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );

    // Require secure cookies
    response.headers.set("x-require-secure-cookies", "true");

    // Prevent mixed content
    response.headers.set(
      "Content-Security-Policy",
      "upgrade-insecure-requests"
    );
  }
}
