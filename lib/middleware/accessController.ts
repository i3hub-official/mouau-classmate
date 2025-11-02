// ========================================
// 🛡️ TASK 5: ACCESS CONTROLLER - Bouncer
// Responsibility: Control access to protected routes
// ========================================

// File: src/lib/middleware/accessController.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "@/lib/middleware/types";

export class AccessController {
  private static readonly SESSION_COOKIE = "session-token";
  private static readonly AGENT_COOKIE = "adminId";
  private static readonly SESSION_EXPIRY_HOURS = 6;

  static control(
    request: NextRequest,
    context: MiddlewareContext
  ): NextResponse {
    // Handle auth paths (login/signup) - redirect if already authenticated
    if (context.isAuthPath && context.hasSession) {
      console.log(
        `[ACCESS] Authenticated user redirected from auth path: ${request.nextUrl.pathname}`
      );
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Handle private paths - require authentication
    if (context.isPrivatePath && !context.hasSession) {
      console.log(
        `[ACCESS] Unauthenticated user blocked from private path: ${request.nextUrl.pathname}`
      );
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }

    // Handle public paths - always allow
    if (context.isPublicPath) {
      return this.handlePublicPath(request, context);
    }

    // Handle authenticated users - refresh session
    if (context.hasSession) {
      return this.refreshSession(request, context);
    }

    // Default: allow
    return NextResponse.next();
  }

  private static handlePublicPath(
    request: NextRequest,
    context: MiddlewareContext
  ): NextResponse {
    const response = NextResponse.next();
    response.headers.set("x-public-path", "true");

    console.log(`[ACCESS] Public path allowed: ${request.nextUrl.pathname}`);
    return response;
  }

  private static refreshSession(
    request: NextRequest,
    context: MiddlewareContext
  ): NextResponse {
    const response = NextResponse.next();
    const secure = process.env.NODE_ENV === "production";
    const maxAge = this.SESSION_EXPIRY_HOURS * 60 * 60;

    // Refresh session cookie
    if (context.sessionToken) {
      response.cookies.set({
        name: this.SESSION_COOKIE,
        value: context.sessionToken,
        httpOnly: true,
        secure,
        sameSite: "strict",
        path: "/",
        maxAge,
      });
    }

    // Refresh agent cookie if present
    if (context.adminId) {
      response.cookies.set({
        name: this.AGENT_COOKIE,
        value: context.adminId,
        httpOnly: false,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge,
      });
    }

    console.log(`[ACCESS] Session refreshed for: ${request.nextUrl.pathname}`);
    return response;
  }
}
