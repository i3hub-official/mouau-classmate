// lib/middleware/sessionTokenValidator.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { JWTUtils, JWTClientUtils } from "@/lib/server/jwt";
import { nanoid } from "nanoid";
import type { MiddlewareContext } from "./types";
import { Role } from "@prisma/client"; // Import the Role enum from Prisma

interface SessionValidationResult {
  isValid: boolean;
  needsRefresh: boolean;
  shouldLogout: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role; // Use the Role enum type
    regNumber?: string; // Changed from matricNumber to match schema
    department?: string;
  };
  action: "continue" | "refresh" | "logout" | "redirect_login";
}

export class SessionTokenValidator {
  private static readonly SESSION_EXPIRY_HOURS = 8;
  private static readonly REFRESH_THRESHOLD_HOURS = 2;
  private static readonly MAX_SESSION_AGE_DAYS = 7;

  static async validate(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<NextResponse> {
    try {
      const validationResult = await this.validateSession(request, context);

      switch (validationResult.action) {
        case "logout":
          return await this.performLogout(request, validationResult);

        case "refresh":
          return await this.performTokenRefresh(request, validationResult);

        case "redirect_login":
          return this.redirectToLogin(request);

        case "continue":
        default:
          return this.continueWithSession(request, validationResult);
      }
    } catch (error) {
      console.error("[SESSION VALIDATOR] Error validating session:", error);
      return this.handleValidationError(request);
    }
  }

  private static async validateSession(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<SessionValidationResult> {
    const sessionToken = request.cookies.get("session-token")?.value;
    const refreshToken = request.cookies.get("refresh-token")?.value;
    const userId = request.cookies.get("userId")?.value;
    const authToken = request.headers.get("authorization");

    // No tokens present
    if (!sessionToken && !refreshToken && !authToken) {
      return {
        isValid: false,
        needsRefresh: false,
        shouldLogout: false,
        action: context.isPrivatePath ? "redirect_login" : "continue",
      };
    }

    // Validate session token first
    if (sessionToken) {
      const sessionResult = await this.validateSessionToken(sessionToken);
      if (sessionResult.isValid) {
        // Check if session needs refresh
        if (sessionResult.needsRefresh) {
          return { ...sessionResult, action: "refresh" };
        }
        return { ...sessionResult, action: "continue" };
      }
    }

    // Session token invalid, try refresh token
    if (refreshToken) {
      const refreshResult = await this.validateRefreshToken(refreshToken);
      if (refreshResult.isValid) {
        return { ...refreshResult, action: "refresh" };
      }
    }

    // Try JWT auth token (for API requests)
    if (authToken) {
      const jwtResult = await this.validateAuthToken(authToken);
      if (jwtResult.isValid) {
        return { ...jwtResult, action: "continue" };
      }
    }

    // All tokens invalid - logout required
    return {
      isValid: false,
      needsRefresh: false,
      shouldLogout: true,
      action: "logout",
    };
  }

  private static async validateSessionToken(
    sessionToken: string
  ): Promise<SessionValidationResult> {
    try {
      // Find session in database
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
              // Student specific fields
              student: {
                select: {
                  regNumber: true,
                  department: true,
                },
              },
              // Teacher specific fields
              teacher: {
                select: {
                  employeeId: true,
                  department: true,
                },
              },
            },
          },
        },
      });

      if (!session) {
        return {
          isValid: false,
          needsRefresh: false,
          shouldLogout: true,
          action: "logout",
        };
      }

      // Check if session expired
      if (session.expires < new Date()) {
        // Clean up expired session
        await prisma.session.delete({ where: { id: session.id } });
        return {
          isValid: false,
          needsRefresh: false,
          shouldLogout: true,
          action: "logout",
        };
      }

      // Check if user is still active
      if (!session.user.isActive) {
        await prisma.session.delete({ where: { id: session.id } });
        return {
          isValid: false,
          needsRefresh: false,
          shouldLogout: true,
          action: "logout",
        };
      }

      // Check if session is too old
      const sessionAge = Date.now() - session.createdAt.getTime();
      const maxAge = this.MAX_SESSION_AGE_DAYS * 24 * 60 * 60 * 1000;
      if (sessionAge > maxAge) {
        await prisma.session.delete({ where: { id: session.id } });
        return {
          isValid: false,
          needsRefresh: false,
          shouldLogout: true,
          action: "logout",
        };
      }

      // Check if session needs refresh (less than 2 hours left)
      const timeLeft = session.expires.getTime() - Date.now();
      const refreshThreshold = this.REFRESH_THRESHOLD_HOURS * 60 * 60 * 1000;
      const needsRefresh = timeLeft < refreshThreshold;

      // Extract user information based on role
      let regNumber = undefined;
      let department = undefined;

      if (session.user.role === Role.STUDENT && session.user.student) {
        regNumber = session.user.student.regNumber;
        department = session.user.student.department;
      } else if (session.user.role === Role.TEACHER && session.user.teacher) {
        regNumber = session.user.teacher.employeeId;
        department = session.user.teacher.department;
      }

      return {
        isValid: true,
        needsRefresh,
        shouldLogout: false,
        user: {
          id: session.user.id,
          name: session.user.name || "",
          email: session.user.email,
          role: session.user.role,
          regNumber, // Changed from matricNumber
          department: department ?? undefined,
        },
        action: needsRefresh ? "refresh" : "continue",
      };
    } catch (error) {
      console.error(
        "[SESSION VALIDATOR] Error validating session token:",
        error
      );
      return {
        isValid: false,
        needsRefresh: false,
        shouldLogout: true,
        action: "logout",
      };
    }
  }

  private static async validateRefreshToken(
    refreshToken: string
  ): Promise<SessionValidationResult> {
    try {
      // Verify refresh token JWT
      const payload = await JWTUtils.verifyToken(refreshToken);

      if (payload.type !== "refresh" || !payload.userId) {
        return {
          isValid: false,
          needsRefresh: false,
          shouldLogout: true,
          action: "logout",
        };
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: payload.userId as string },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          // Student specific fields
          student: {
            select: {
              regNumber: true,
              department: true,
            },
          },
          // Teacher specific fields
          teacher: {
            select: {
              employeeId: true,
              department: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        return {
          isValid: false,
          needsRefresh: false,
          shouldLogout: true,
          action: "logout",
        };
      }

      // Extract user information based on role
      let regNumber = undefined;
      let department = undefined;

      if (user.role === Role.STUDENT && user.student) {
        regNumber = user.student.regNumber;
        department = user.student.department;
      } else if (user.role === Role.TEACHER && user.teacher) {
        regNumber = user.teacher.employeeId;
        department = user.teacher.department;
      }

      return {
        isValid: true,
        needsRefresh: true,
        shouldLogout: false,
        user: {
          id: user.id,
          name: user.name || "",
          email: user.email,
          role: user.role,
          regNumber, // Changed from matricNumber
         department: department ?? undefined,
        },
        action: "refresh",
      };
    } catch (error) {
      console.error(
        "[SESSION VALIDATOR] Error validating refresh token:",
        error
      );
      return {
        isValid: false,
        needsRefresh: false,
        shouldLogout: true,
        action: "logout",
      };
    }
  }

  private static async validateAuthToken(
    authHeader: string
  ): Promise<SessionValidationResult> {
    try {
      const token = JWTClientUtils.extractTokenFromHeader(authHeader);
      if (!token) {
        return {
          isValid: false,
          needsRefresh: false,
          shouldLogout: false,
          action: "continue",
        };
      }

      // Verify auth token
      const payload = await JWTUtils.verifyAuthToken(token);

      // Find user to ensure they're still active
      const user = await prisma.user.findUnique({
        where: { id: payload.adminId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          // Student specific fields
          student: {
            select: {
              regNumber: true,
              department: true,
            },
          },
          // Teacher specific fields
          teacher: {
            select: {
              employeeId: true,
              department: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        return {
          isValid: false,
          needsRefresh: false,
          shouldLogout: true,
          action: "logout",
        };
      }

      // Extract user information based on role
      let regNumber = undefined;
      let department = undefined;

      if (user.role === Role.STUDENT && user.student) {
        regNumber = user.student.regNumber;
        department = user.student.department;
      } else if (user.role === Role.TEACHER && user.teacher) {
        regNumber = user.teacher.employeeId;
        department = user.teacher.department;
      }

      return {
        isValid: true,
        needsRefresh: false,
        shouldLogout: false,
        user: {
          id: user.id,
          name: user.name || "",
          email: user.email,
          role: user.role,
          regNumber, // Changed from matricNumber
           department: department ?? undefined,
        },
        action: "continue",
      };
    } catch (error) {
      // JWT verification failed - not necessarily an error for API tokens
      return {
        isValid: false,
        needsRefresh: false,
        shouldLogout: false,
        action: "continue",
      };
    }
  }

  private static async performTokenRefresh(
    request: NextRequest,
    validationResult: SessionValidationResult
  ): Promise<NextResponse> {
    try {
      if (!validationResult.user) {
        return await this.performLogout(request, validationResult);
      }

      const user = validationResult.user;

      // Generate new tokens
      const newSessionToken = nanoid();
      const newRefreshToken = await JWTUtils.generateRefreshToken(user.id);
      const newAuthToken = await JWTUtils.generateAuthToken({
        adminId: user.id,
        email: user.email,
        schoolId: user.id,
        role: user.role,
        schoolNumber: user.regNumber || "",
      });

      // Update session in database
      const expires = new Date();
      expires.setHours(expires.getHours() + this.SESSION_EXPIRY_HOURS);

      // Delete old session and create new one
      const oldSessionToken = request.cookies.get("session-token")?.value;
      if (oldSessionToken) {
        await prisma.session.deleteMany({
          where: { sessionToken: oldSessionToken },
        });
      }

      await prisma.session.create({
        data: {
          sessionToken: newSessionToken,
          userId: user.id,
          expires,
        },
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Log refresh action
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "SESSION_REFRESHED",
          details: {
            automatic: true,
            userAgent: request.headers.get("user-agent"),
          },
          ipAddress:
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
        },
      });

      // Create response with new cookies
      const response = NextResponse.next();

      // Set new cookies
      response.cookies.set("session-token", newSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires,
      });

      response.cookies.set("refresh-token", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      response.cookies.set("userId", user.id, {
        httpOnly: false, // This one can be accessible by client
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires,
      });

      // Add user info to response headers for other middleware
      response.headers.set("x-user-id", user.id);
      response.headers.set("x-user-role", user.role);
      response.headers.set("x-user-reg", user.regNumber || ""); // Changed from x-user-matric
      response.headers.set("x-session-refreshed", "true");

      console.log(
        `[SESSION VALIDATOR] ✅ Session refreshed for user: ${user.id}`
      );
      return response;
    } catch (error) {
      console.error("[SESSION VALIDATOR] Error refreshing tokens:", error);
      return await this.performLogout(request, validationResult);
    }
  }

  private static async performLogout(
    request: NextRequest,
    validationResult: SessionValidationResult
  ): Promise<NextResponse> {
    console.log("[SESSION VALIDATOR] 🚪 Performing automatic logout");

    // Clean up database session
    const sessionToken = request.cookies.get("session-token")?.value;
    if (sessionToken) {
      await this.cleanupSession(sessionToken).catch((error) =>
        console.error("[SESSION VALIDATOR] Error cleaning up session:", error)
      );
    }

    const loginUrl = new URL("/auth/signin", request.url);
    loginUrl.searchParams.set("reason", "session_expired");

    const response = NextResponse.redirect(loginUrl);

    // Clear all session cookies
    const cookiesToClear = ["session-token", "refresh-token", "userId"];

    cookiesToClear.forEach((cookieName) => {
      response.cookies.set(cookieName, "", {
        expires: new Date(0),
        path: "/",
      });
    });

    response.headers.set("x-session-invalidated", "true");
    response.headers.set("x-logout-reason", "automatic");

    return response;
  }

  private static redirectToLogin(request: NextRequest): NextResponse {
    console.log("[SESSION VALIDATOR] 🔄 Redirecting to login");

    const loginUrl = new URL("/auth/signin", request.url);
    if (request.nextUrl.pathname !== "/auth/signin") {
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    }

    return NextResponse.redirect(loginUrl);
  }

  private static continueWithSession(
    request: NextRequest,
    validationResult: SessionValidationResult
  ): NextResponse {
    const response = NextResponse.next();

    if (validationResult.user) {
      // Add user info to headers for other middleware
      response.headers.set("x-user-id", validationResult.user.id);
      response.headers.set("x-user-role", validationResult.user.role);
      response.headers.set(
        "x-user-reg", // Changed from x-user-matric
        validationResult.user.regNumber || ""
      );
      response.headers.set(
        "x-user-department",
        validationResult.user.department || ""
      );
      response.headers.set("x-session-valid", "true");
    }

    return response;
  }

  private static handleValidationError(request: NextRequest): NextResponse {
    console.log(
      "[SESSION VALIDATOR] ⚠️ Validation error, redirecting to login"
    );

    const response = NextResponse.redirect(
      new URL("/auth/signin", request.url)
    );

    // Clear potentially corrupted cookies
    const cookiesToClear = ["session-token", "refresh-token", "userId"];
    cookiesToClear.forEach((cookieName) => {
      response.cookies.set(cookieName, "", {
        expires: new Date(0),
        path: "/",
      });
    });

    return response;
  }

  private static async cleanupSession(sessionToken: string): Promise<void> {
    try {
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });

      if (session) {
        await prisma.auditLog.create({
          data: {
            userId: session.userId,
            action: "SESSION_CLEANED_UP",
            details: { automatic: true },
            ipAddress: "middleware",
            userAgent: "SessionTokenValidator",
          },
        });

        await prisma.session.delete({
          where: { sessionToken },
        });
      }

      // Clean up expired sessions while we're here
      await prisma.session.deleteMany({
        where: {
          expires: { lt: new Date() },
        },
      });
    } catch (error) {
      console.error("[SESSION VALIDATOR] Error in cleanup:", error);
    }
  }

  // Public method for manual session validation (useful for API routes)
  static async validateSessionManually(
    sessionToken: string
  ): Promise<SessionValidationResult> {
    return this.validateSessionToken(sessionToken);
  }

  // Public method to get session statistics
  static async getSessionStats(): Promise<{
    totalActiveSessions: number;
    expiredSessions: number;
    oldSessions: number;
  }> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalActive, expired, old] = await Promise.all([
      prisma.session.count({
        where: {
          expires: { gt: now },
        },
      }),
      prisma.session.count({
        where: {
          expires: { lte: now },
        },
      }),
      prisma.session.count({
        where: {
          createdAt: { lte: sevenDaysAgo },
        },
      }),
    ]);

    return {
      totalActiveSessions: totalActive,
      expiredSessions: expired,
      oldSessions: old,
    };
  }
}
