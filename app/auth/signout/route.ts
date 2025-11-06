// app/api/auth/signout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session-token")?.value;
    const userId = request.cookies.get("userId")?.value;

    // Delete session from database if token exists
    if (sessionToken) {
      try {
        await prisma.session.deleteMany({
          where: { sessionToken },
        });

        // Log logout action if userId exists
        if (userId) {
          try {
            await prisma.auditLog.create({
              data: {
                userId,
                action: "USER_LOGGED_OUT",
                resourceType: "USER",
                details: { manual: true },
                ipAddress:
                  request.headers
                    .get("x-forwarded-for")
                    ?.split(",")[0]
                    .trim() || "unknown",
                userAgent: request.headers.get("user-agent") || "unknown",
              },
            });
          } catch (auditError) {
            console.error("Audit log error:", auditError);
            // Continue with logout even if audit fails
          }
        }
      } catch (dbError) {
        console.error("Session deletion error:", dbError);
        // Continue with cookie clearing even if DB operation fails
      }
    }

    // Create response and clear cookies
    const response = NextResponse.json({
      success: true,
      message: "Signed out successfully",
    });

    // Clear all session cookies
    const cookiesToClear = [
      "session-token",
      "refresh-token",
      "userId",
      "user-role",
    ];

    cookiesToClear.forEach((cookieName) => {
      response.cookies.set(cookieName, "", {
        expires: new Date(0),
        path: "/",
        httpOnly: cookieName !== "userId" && cookieName !== "user-role",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    });

    return response;
  } catch (error) {
    console.error("SignOut error:", error);

    // Still attempt to clear cookies even if everything else fails
    const response = NextResponse.json(
      {
        success: false,
        error: "Logout failed",
      },
      { status: 500 }
    );

    const cookiesToClear = [
      "session-token",
      "refresh-token",
      "userId",
      "user-role",
    ];

    cookiesToClear.forEach((cookieName) => {
      response.cookies.set(cookieName, "", {
        expires: new Date(0),
        path: "/",
        httpOnly: cookieName !== "userId" && cookieName !== "user-role",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    });

    return response;
  }
}
