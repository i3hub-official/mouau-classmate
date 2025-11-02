// ========================================
// 🔄 TASK 10: REQUEST TRANSFORMER - Data Processor
// Responsibility: Transform, validate, and sanitize incoming requests
// ========================================

// File: src/lib/middleware/requestTransformer.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";

interface TransformationConfig {
  normalizeHeaders: boolean;
  sanitizeQueryParams: boolean;
  addRequestId: boolean;
  addTimestamp: boolean;
  validateContentType: boolean;
  maxBodySize: number; // in bytes
  compressResponse: boolean;
}

export class RequestTransformer {
  private static readonly DEFAULT_CONFIG: TransformationConfig = {
    normalizeHeaders: true,
    sanitizeQueryParams: true,
    addRequestId: true,
    addTimestamp: true,
    validateContentType: true,
    maxBodySize: 10 * 1024 * 1024, // 10MB
    compressResponse: false,
  };

  private static readonly API_CONFIG: TransformationConfig = {
    normalizeHeaders: true,
    sanitizeQueryParams: true,
    addRequestId: true,
    addTimestamp: true,
    validateContentType: true,
    maxBodySize: 5 * 1024 * 1024, // 5MB for API
    compressResponse: true,
  };

  private static readonly DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /expression\s*\(/gi,
    /@@\w+/gi, // SQL Server functions
    /\bUNION\b.*\bSELECT\b/gi,
    /\bINSERT\b.*\bINTO\b/gi,
    /\bDELETE\b.*\bFROM\b/gi,
    /\bUPDATE\b.*\bSET\b/gi,
  ];

  static transform(
    request: NextRequest,
    context: MiddlewareContext
  ): NextResponse {
    try {
      const config = this.getConfigForPath(request.nextUrl.pathname);

      // Create a new request with transformations
      const transformedRequest = this.applyTransformations(
        request,
        config,
        context
      );

      // Create response with request transformations applied
      const response = NextResponse.next({
        request: transformedRequest,
      });

      // Add transformation headers
      if (config.addRequestId) {
        const requestId = this.generateRequestId();
        response.headers.set("x-request-id", requestId);
      }

      if (config.addTimestamp) {
        response.headers.set("x-request-timestamp", new Date().toISOString());
      }

      // Add processing metadata
      response.headers.set("x-transformed", "true");
      response.headers.set(
        "x-sanitized",
        config.sanitizeQueryParams.toString()
      );

      console.log(
        `[REQUEST TRANSFORMER] ✅ Request transformed: ${request.nextUrl.pathname}`
      );
      return response;
    } catch (error) {
      console.error("[REQUEST TRANSFORMER] Error transforming request:", error);

      // Return error for malicious requests
      if (error instanceof Error && error.message.includes("MALICIOUS")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "MALICIOUS_REQUEST",
              message: "Request blocked due to security concerns",
            },
          },
          { status: 400 }
        );
      }

      // For other errors, continue without transformation
      return NextResponse.next();
    }
  }

  private static applyTransformations(
    request: NextRequest,
    config: TransformationConfig,
    context: MiddlewareContext
  ): NextRequest {
    const url = new URL(request.url);

    // Sanitize query parameters
    if (config.sanitizeQueryParams) {
      this.sanitizeSearchParams(url.searchParams);
    }

    // Normalize headers
    const headers = new Headers(request.headers);
    if (config.normalizeHeaders) {
      this.normalizeHeaders(headers);
    }

    // Add transformation headers
    if (config.addRequestId) {
      headers.set("x-request-id", this.generateRequestId());
    }

    if (config.addTimestamp) {
      headers.set("x-request-timestamp", new Date().toISOString());
    }

    // Add context headers
    headers.set("x-client-ip", context.clientIp);
    headers.set("x-is-public-path", context.isPublicPath.toString());
    headers.set(
      "x-is-api-path",
      request.nextUrl.pathname.startsWith("/api/v1").toString()
    );

    // Validate content type for POST/PUT requests
    if (
      config.validateContentType &&
      ["POST", "PUT", "PATCH"].includes(request.method)
    ) {
      this.validateContentType(headers);
    }

    // Create new request with transformed URL and headers
    return new NextRequest(url.toString(), {
      method: request.method,
      headers,
      body: request.body,
    });
  }

  private static sanitizeSearchParams(searchParams: URLSearchParams): void {
    const keysToDelete: string[] = [];

    searchParams.forEach((value, key) => {
      // Check for dangerous patterns in both key and value
      const sanitizedKey = this.sanitizeString(key);
      const sanitizedValue = this.sanitizeString(value);

      if (sanitizedKey !== key || sanitizedValue !== value) {
        keysToDelete.push(key);

        // Only re-add if the sanitized version is not empty
        if (sanitizedKey && sanitizedValue) {
          searchParams.set(sanitizedKey, sanitizedValue);
        }
      }
    });

    // Remove dangerous parameters
    keysToDelete.forEach((key) => searchParams.delete(key));
  }

  private static sanitizeString(input: string): string {
    if (!input) return input;

    // Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(input)) {
        throw new Error(`MALICIOUS pattern detected: ${pattern}`);
      }
    }

    // Basic sanitization
    return input
      .trim()
      .replace(/[<>]/g, "") // Remove angle brackets
      .replace(/['";]/g, "") // Remove quotes and semicolons
      .substring(0, 1000); // Limit length
  }

  private static normalizeHeaders(headers: Headers): void {
    // Standardize user-agent
    const userAgent = headers.get("user-agent");
    if (userAgent) {
      headers.set("user-agent", userAgent.substring(0, 500)); // Limit length
    }

    // Normalize authorization header
    const auth = headers.get("authorization");
    if (auth && !auth.startsWith("Bearer ")) {
      // Log suspicious auth headers
      console.warn(
        `[REQUEST TRANSFORMER] Unusual auth header format: ${auth.substring(0, 20)}...`
      );
    }

    // Remove potentially dangerous headers
    const dangerousHeaders = [
      "x-forwarded-host",
      "x-original-host",
      "x-rewrite-url",
    ];

    dangerousHeaders.forEach((header) => {
      if (headers.has(header)) {
        console.warn(
          `[REQUEST TRANSFORMER] Removed dangerous header: ${header}`
        );
        headers.delete(header);
      }
    });
  }

  private static validateContentType(headers: Headers): void {
    const contentType = headers.get("content-type");

    if (!contentType) {
      throw new Error("Content-Type header required for body requests");
    }

    const allowedTypes = [
      "application/json",
      "application/x-www-form-urlencoded",
      "multipart/form-data",
      "text/plain",
    ];

    const isAllowed = allowedTypes.some((type) =>
      contentType.toLowerCase().startsWith(type)
    );

    if (!isAllowed) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }
  }

  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private static getConfigForPath(pathname: string): TransformationConfig {
    // API paths get stricter transformation
    if (pathname.startsWith("/api/v1")) {
      return this.API_CONFIG;
    }

    // Admin paths get enhanced transformation
    if (pathname.startsWith("/admin") || pathname.startsWith("/admin")) {
      return {
        ...this.DEFAULT_CONFIG,
        sanitizeQueryParams: true,
        validateContentType: true,
      };
    }

    // Public paths get basic transformation
    return this.DEFAULT_CONFIG;
  }
}
