// ========================================
// 🛡️ TASK 5: ACCESS CONTROLLER - Bouncer
// Responsibility: Control access to protected routes
// ========================================

// File: src/lib/middleware/accessController.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "@/lib/middleware/types";
import { getToken } from "next-auth/jwt";

export class AccessController {
  // Use NextAuth's standard cookie names
  private static readonly SESSION_COOKIE = "next-auth.session-token";
  private static readonly SECURE_SESSION_COOKIE =
    "__Secure-next-auth.session-token";
  private static readonly SESSION_EXPIRY_HOURS = 6;

  static async control(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<NextResponse> {
    // Get the NextAuth token to verify authentication
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Update context with actual authentication status
    context.hasSession = !!token;
    context.userId = token?.sub as string;

    // Handle auth paths (login/signup) - redirect if already authenticated
    if (context.isAuthPath && context.hasSession) {
      console.log(
        `[ACCESS] Authenticated user redirected from auth path: ${request.nextUrl.pathname}`
      );

      // Determine dashboard based on user role
      const dashboardPath = this.getDashboardPath(token?.role as string);
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }

    // Handle private paths - require authentication
    if (context.isPrivatePath && !context.hasSession) {
      console.log(
        `[ACCESS] Unauthenticated user blocked from private path: ${request.nextUrl.pathname}`
      );
      return NextResponse.redirect(new URL("/signin", request.url));
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

  private static getDashboardPath(role?: string): string {
    switch (role) {
      case "admin":
        return "/a/dashboard";
      case "teacher":
        return "/t/dashboard";
      case "student":
      default:
        return "/s/dashboard";
    }
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

    // We don't need to manually refresh NextAuth session cookies
    // NextAuth handles this automatically through its session management

    // Instead, we can set a non-httpOnly cookie with user ID for client-side access
    if (context.userId) {
      response.cookies.set({
        name: "userId",
        value: context.userId,
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

  /**
   * Clear all authentication cookies
   * Used for signout functionality
   */
  static clearAuthCookies(response: NextResponse): void {
    // Clear standard NextAuth session token
    response.cookies.set({
      name: this.SESSION_COOKIE,
      value: "",
      path: "/",
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
    });

    // Clear secure NextAuth session token (used in production)
    response.cookies.set({
      name: this.SECURE_SESSION_COOKIE,
      value: "",
      path: "/",
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // Clear user ID cookie
    response.cookies.set({
      name: "userId",
      value: "",
      path: "/",
      expires: new Date(0),
      httpOnly: false,
      sameSite: "lax",
    });
  }
}
