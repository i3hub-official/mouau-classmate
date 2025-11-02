// ========================================
// 🔄 TASK 6: RESPONSE MERGER - Coordinator
// Responsibility: Merge responses and manage headers
// ========================================

// File: src/lib/middleware/responseMerger.ts
import { NextResponse } from "next/server";

export class ResponseMerger {
  static merge(
    baseResponse: NextResponse,
    newResponse: NextResponse
  ): NextResponse {
    // If new response is a redirect/error, preserve it but merge headers
    if (newResponse.status !== 200 || newResponse.redirected) {
      this.mergeHeaders(newResponse, baseResponse);
      return newResponse;
    }

    // Otherwise merge headers into base response
    this.mergeHeaders(baseResponse, newResponse);
    return baseResponse;
  }

  private static mergeHeaders(
    target: NextResponse,
    source: NextResponse
  ): void {
    source.headers.forEach((value, key) => {
      // Don't override certain critical headers
      const criticalHeaders = ["location", "set-cookie"];
      if (
        criticalHeaders.includes(key.toLowerCase()) &&
        target.headers.has(key)
      ) {
        return;
      }
      target.headers.set(key, value);
    });
  }

  static addSystemHeaders(
    response: NextResponse,
    processingTime: number
  ): NextResponse {
    response.headers.set("x-processing-time", `${processingTime}ms`);
    response.headers.set("x-middleware-version", "2.0.0");
    response.headers.set("x-timestamp", new Date().toISOString());
    return response;
  }
}
