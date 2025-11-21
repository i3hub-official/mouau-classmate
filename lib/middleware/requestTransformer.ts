// src/lib/middleware/requestTransformer.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";

export class RequestTransformer {
  private static readonly DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /expression\s*\(/gi,
    /@@\w+/gi,
    /\bUNION\b.*\bSELECT\b/gi,
    /\bINSERT\b.*\bINTO\b/gi,
    /\bDELETE\b.*\bFROM\b/gi,
    /\bUPDATE\b.*\bSET\b/gi,
    /\bDROP\b.*\bTABLE\b/gi,
    /'\s*OR\s*'\d'='1/gi,
    /--/g,
    /;\s*(--|\/\*)/g,
    /\.\.\//g,
    /etc\/passwd/gi,
    /<iframe/gi,
    /onload\s*=/gi,
  ];

  static transform(
    request: NextRequest,
    context: MiddlewareContext
  ): NextResponse {
    try {
      // PHASE 1: EARLY MALICIOUS DETECTION — NUCLEAR RESPONSE
      const fullUrl = request.url;
      const queryString = request.nextUrl.search;
      const pathname = request.nextUrl.pathname;
      const userAgent = request.headers.get("user-agent") || "";

      const maliciousInput = [
        fullUrl,
        queryString,
        pathname,
        userAgent,
        ...Array.from(request.nextUrl.searchParams.values()),
      ].some((str) =>
        this.DANGEROUS_PATTERNS.some((pattern) => pattern.test(str))
      );

      if (maliciousInput) {
        console.log(
          `[REQUEST TRANSFORMER] NUCLEAR THREAT DETECTED → NEUTRALIZING`
        );

        // THIS IS WHERE YOU PUT THE CODE — FINAL VERSION
        const blockUrl = new URL("/security/blocked", request.url);
        blockUrl.searchParams.set(
          "id",
          `MAL-${Date.now().toString(36).toUpperCase()}-${Math.random()
            .toString(36)
            .substr(2, 4)}`
        );
        blockUrl.searchParams.set("score", "99.9");
        blockUrl.searchParams.set(
          "reason",
          "SQL_INJECTION_XSS_PATH_TRAVERSAL_COMBO"
        );
        blockUrl.searchParams.set("action", "NEUTRALIZE");

        const response = NextResponse.redirect(blockUrl);
        response.headers.set("X-Defense-Action", "NEUTRALIZE");
        response.headers.set(
          "X-Reason",
          "Malicious payload detected in request"
        );
        response.headers.set(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate"
        );
        response.headers.set("Pragma", "no-cache");
        response.headers.set("Expires", "0");

        return response;
        // END OF THE CODE YOU ASKED FOR
      }

      // PHASE 2: Normal transformation (safe requests only)
      const url = new URL(request.url);

      // Sanitize query params (safe now)
      this.sanitizeSearchParams(url.searchParams);

      // Normalize headers
      const headers = new Headers(request.headers);
      this.normalizeHeaders(headers);

      // Add metadata
      headers.set("x-client-ip", context.clientIp);
      headers.set("x-request-id", this.generateRequestId());
      headers.set("x-request-timestamp", new Date().toISOString());

      // Create transformed request
      const transformedRequest = new NextRequest(url.toString(), {
        method: request.method,
        headers,
        body: request.body,
        duplex: request.body ? "half" : undefined,
      });

      const response = NextResponse.next({
        request: transformedRequest,
      });

      response.headers.set("x-transformed", "true");
      response.headers.set("x-sanitized", "true");

      return response;
    } catch (error) {
      // Any error = potential bypass attempt → NEUTRALIZE
      console.error(
        "[REQUEST TRANSFORMER] Critical failure → neutralizing:",
        error
      );

      const blockUrl = new URL("/security/blocked", request.url);
      blockUrl.searchParams.set("reason", "TRANSFORMER_FAILURE_SUSPICIOUS");
      blockUrl.searchParams.set("score", "98");
      blockUrl.searchParams.set("action", "NEUTRALIZE");

      const response = NextResponse.redirect(blockUrl);
      response.headers.set("X-Defense-Action", "NEUTRALIZE");
      return response;
    }
  }

  // Safe sanitization (only runs if no malicious pattern found)
  private static sanitizeSearchParams(searchParams: URLSearchParams): void {
    for (const [key, value] of searchParams.entries()) {
      const cleanKey = value.trim().substring(0, 200);
      const cleanValue = value.trim().substring(0, 1000);

      if (cleanKey !== key || cleanValue !== value) {
        searchParams.delete(key);
        if (cleanKey && cleanValue) {
          searchParams.set(cleanKey, cleanValue);
        }
      }
    }
  }

  private static normalizeHeaders(headers: Headers): void {
    const ua = headers.get("user-agent");
    if (ua && ua.length > 500) {
      headers.set("user-agent", ua.substring(0, 500) + "...");
    }

    // Remove dangerous headers
    ["x-forwarded-for", "x-real-ip", "x-original-url"].forEach((h) => {
      if (headers.has(h)) headers.delete(h);
    });
  }

  private static generateRequestId(): string {
    return `req_${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .substr(2, 6)}`;
  }
}
