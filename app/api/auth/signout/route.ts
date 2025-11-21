// app/api/auth/signout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/server/prisma";
import { ClientIPDetector, type IPInfo } from "@/lib/clientIp";

type SessionUser = {
  id: string;
  role?: string;
  matricNumber?: string;
  teacherId?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

// NextAuth cookie names that need to be cleared
const NEXTAUTH_COOKIES = [
  "next-auth.session-token",
  "next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.session-token",
  "__Host-next-auth.session-token",
  "__Secure-next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
] as const;

// Helper function to clear all auth cookies
function clearAuthCookies(response: NextResponse): void {
  NEXTAUTH_COOKIES.forEach((name) => {
    response.cookies.set({
      name,
      value: "",
      path: "/",
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  });
}

// Helper function to get user-friendly identifier
function getUserIdentifier(user: SessionUser): string {
  return user.matricNumber || user.teacherId || user.email || user.id;
}

// Build IP details for logging
function buildIPDetails(ipInfo: IPInfo): Record<string, unknown> {
  return {
    ip: ipInfo.ip,
    source: ipInfo.source,
    confidence: ipInfo.confidence,
    isProxy: ipInfo.isProxy,
    isVPN: ipInfo.isVPN,
    isTor: ipInfo.isTor,
    isDatacenter: ipInfo.isDatacenter,
    ipChain: ipInfo.chain,
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Get detailed IP information
  const ipInfo = ClientIPDetector.getClientIP(request);
  const clientIP = ipInfo.ip;
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    // Get current session (works for Student, Lecturer, Admin)
    const session = (await getServerSession(authOptions)) as {
      user?: SessionUser;
    } | null;

    if (!session?.user?.id) {
      console.warn(`[SIGNOUT] ⚠️ Unauthenticated signout attempt`, {
        ip: clientIP,
        source: ipInfo.source,
        confidence: ipInfo.confidence,
        isProxy: ipInfo.isProxy,
        isVPN: ipInfo.isVPN,
        isTor: ipInfo.isTor,
      });

      const response = NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
          code: "NO_SESSION",
        },
        { status: 401 }
      );

      // Clear cookies anyway for security
      clearAuthCookies(response);
      return response;
    }

    const userId = session.user.id;
    const role = session.user.role;
    const identifier = getUserIdentifier(session.user);

    // Log logout attempt with IP details
    console.log(`[SIGNOUT] 🚪 User ${identifier} (${role}) signing out`, {
      ip: clientIP,
      confidence: ipInfo.confidence,
      isProxy: ipInfo.isProxy || ipInfo.isVPN || ipInfo.isTor,
    });

    // Log logout with full context including IP intelligence
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "USER_LOGGED_OUT",
          resourceType: "USER",
          resourceId: userId,
          details: JSON.parse(JSON.stringify({
            role,
            identifier,
            method: "api_endpoint",
            userAgent: userAgent.substring(0, 500),
            duration: Date.now() - startTime,
            // IP Intelligence
            ipDetails: buildIPDetails(ipInfo),
            // Security flags
            securityFlags: {
              proxied: ipInfo.isProxy,
              vpn: ipInfo.isVPN,
              tor: ipInfo.isTor,
              datacenter: ipInfo.isDatacenter,
              ipConfidence: ipInfo.confidence,
            },
          })),
          ipAddress: clientIP,
          userAgent,
        },
      });
    } catch (dbError) {
      console.error("[SIGNOUT] ❌ Failed to create audit log:", dbError);
      // Continue with signout even if logging fails
    }

    // Create success response
    const response = NextResponse.json({
      success: true,
      message: "Signed out successfully",
      data: {
        timestamp: new Date().toISOString(),
        userId,
      },
    });

    // Clear all NextAuth cookies
    clearAuthCookies(response);

    // Add security headers
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("X-Content-Type-Options", "nosniff");

    // Add IP tracking headers (for debugging/monitoring)
    response.headers.set("X-Client-IP", clientIP);
    response.headers.set("X-IP-Confidence", ipInfo.confidence);

    console.log(
      `[SIGNOUT] ✅ Successfully signed out user ${identifier} in ${
        Date.now() - startTime
      }ms`
    );

    return response;
  } catch (error) {
    console.error("[SIGNOUT] ❌ Critical error during signout:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      ip: clientIP,
      ipSource: ipInfo.source,
      ipConfidence: ipInfo.confidence,
      isProxied: ipInfo.isProxy || ipInfo.isVPN || ipInfo.isTor,
      duration: Date.now() - startTime,
    });

    // Create error response
    const response = NextResponse.json(
      {
        success: false,
        error: "Logout failed",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );

    // Still clear cookies even on error for security
    clearAuthCookies(response);

    // Add security headers
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");

    return response;
  }
}

// Handle other HTTP methods
export async function GET(request: NextRequest) {
  const ipInfo = ClientIPDetector.getClientIP(request);

  console.warn(`[SIGNOUT] ⚠️ Invalid GET request to signout endpoint`, {
    ip: ipInfo.ip,
    isProxy: ipInfo.isProxy,
  });

  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
      code: "METHOD_NOT_ALLOWED",
    },
    { status: 405 }
  );
}
