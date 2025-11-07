// ========================================
// 🎯 MAIN MIDDLEWARE - Entry Point
// ========================================

// File: src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import "./registry";
import { Orchestrator } from "@/lib/middleware/orchestrator";

// Matcher Config - Define what gets processed
export const config = {
  matcher: [
    "/((?!auth|auth|security-block|_next/static|_next/image|favicon.ico|manifest.json|robots.txt|health).*)",
  ],
};

// Main Middleware Function
export async function proxy(request: NextRequest) {
  try {
    const response = await Orchestrator.execute(request);

    // If Orchestrator returns a redirect to not-found, handle it
    if (response.headers.get("x-redirect-to-not-found") === "true") {
      return redirectToNotFound(request);
    }

    return response;
  } catch (error) {
    console.error("🔥 MIDDLEWARE ERROR:", error);

    // If it's a not found error from the orchestrator, show custom 404
    if (isNotFoundError(error)) {
      return redirectToNotFound(request);
    }

    // For other errors, let the orchestrator handle them or rethrow
    throw error;
  }
}

// ========================================
// 🎯 404 REDIRECT HANDLER
// ========================================

function isNotFoundError(error: any): boolean {
  return (
    error?.message?.includes("not found") ||
    error?.code === "ENOENT" ||
    error?.status === 404
  );
}

function redirectToNotFound(request: NextRequest): NextResponse {
  console.log("🔍 [MIDDLEWARE] Route not found, showing custom 404");

  // For API routes, return JSON response
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: "Not Found",
        message: "The requested resource was not found",
        path: request.nextUrl.pathname,
      },
      { status: 404 }
    );
  }

  // For pages, rewrite to custom not-found page
  const notFoundUrl = new URL("/not-found", request.url);

  // Preserve the original path for the 404 page to display
  notFoundUrl.searchParams.set("originalPath", request.nextUrl.pathname);

  return NextResponse.rewrite(notFoundUrl);
}
