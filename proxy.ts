// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { orchestrator } from "@/lib/middleware/orchestrator";

// ─────────────────────────────────────────────────────────────────────────────
// PROXY MATCHER — Apply to all real routes
// ─────────────────────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|manifest\\.json|health|auth/callback).*)",
  ],
};

// REQUIRED: Must be named `proxy` when file is proxy.ts
export async function proxy(request: NextRequest): Promise<NextResponse> {
  try {
    const response = await orchestrator.execute(request);

    // Custom 404 handling
    if (response.headers.get("x-middleware-404") === "true") {
      return handleNotFound(request);
    }

    // Force redirect support
    const redirectUrl = response.headers.get("x-redirect-url");
    if (redirectUrl) {
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    return response;
  } catch (error: any) {
    console.error("PROXY CRITICAL FAILURE:", error);

    if (
      error?.code === "ENOENT" ||
      error?.status === 404 ||
      /not found/i.test(error?.message)
    ) {
      return handleNotFound(request);
    }

    return NextResponse.json(
      {
        error: "Service Unavailable",
        message: "System temporarily down. Please try again later.",
        code: "PROXY_FAILURE",
      },
      { status: 503 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 404 Handler — Clean & Consistent
// ─────────────────────────────────────────────────────────────────────────────
function handleNotFound(request: NextRequest): NextResponse {
  console.log(`404 → ${request.nextUrl.pathname}`);

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: "Not Found",
        message: "Endpoint does not exist",
        path: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      },
      { status: 404 }
    );
  }

  const url = new URL("/404", request.url);
  url.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.rewrite(url);
}

// Optional: Force Node.js runtime (recommended for full defense stack)
export const runtime = "nodejs";
