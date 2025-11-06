// app/signout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session-token")?.value;
    const userId = request.cookies.get("userId")?.value;

    if (sessionToken) {
      // Delete session from database
      await prisma.session.deleteMany({
        where: { sessionToken },
      });

      // Log logout action
      if (userId) {
        await prisma.auditLog.create({
          data: {
            userId,
            action: "USER_LOGGED_OUT",
            resourceType: "USER",
            details: { manual: true },
            ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown",
            userAgent: request.headers.get("user-agent") || "unknown",
          },
        });
      }
    }

    // Create response and clear cookies
    const response = NextResponse.json({ success: true });
    
    // Clear all session cookies
    const cookiesToClear = ["session-token", "refresh-token", "userId"];
    cookiesToClear.forEach((cookieName) => {
      response.cookies.set(cookieName, "", {
        expires: new Date(0),
        path: "/",
      });
    });

    response.headers.set("x-session-cleared", "true");

    return response;
  } catch (error) {
    console.error("SignOut error:", error);
    
    // Still attempt to clear cookies even if database operation fails
    const response = NextResponse.json({ success: false, error: "Logout failed" });
    
    const cookiesToClear = ["session-token", "refresh-token", "userId"];
    cookiesToClear.forEach((cookieName) => {
      response.cookies.set(cookieName, "", {
        expires: new Date(0),
        path: "/",
      });
    });

    return response;
  }
}