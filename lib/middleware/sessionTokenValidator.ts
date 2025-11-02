// lib/middleware/sessionTokenValidator.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { JWTUtils, JWTClientUtils } from "@/lib/server/jwt";
import { nanoid } from "nanoid";
import type { MiddlewareContext } from "./types";
import { Role } from "@prisma/client";

interface SessionValidationResult {
  isValid: boolean;
  needsRefresh: boolean;
  shouldLogout: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    matricNumber?: string;
    department?: string;
  };
  action: "continue" | "refresh" | "logout" | "redirect_login";
  errorCode?:
    | "SESSION_EXPIRED"
    | "USER_INACTIVE"
    | "TOKEN_INVALID"
    | "DEVICE_MISMATCH"
    | "RATE_LIMITED"
    | "SYSTEM_ERROR";
  securityLevel?: "low" | "medium" | "high";
}

interface RateLimitResult {
  isLimited: boolean;
  retryAfter?: number;
  remainingAttempts?: number;
}

export class SessionTokenValidator {
  private static readonly SESSION_EXPIRY_HOURS = 8;
  private static readonly REFRESH_THRESHOLD_HOURS = 2;
  private static readonly MAX_SESSION_AGE_DAYS = 7;
  private static readonly REFRESH_RATE_LIMIT = 5; // Max 5 refreshes per minute per user
  private static readonly MAX_CONCURRENT_SESSIONS = 3;

  private static initialized = false;

  static async validate(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<NextResponse> {
    // Initialize on first run
    if (!this.initialized) {
      this.initialize();
    }

    const startTime = Date.now();
    let success = false;

    try {
      const validationResult = await this.validateSession(request, context);
      success = validationResult.isValid;

      switch (validationResult.action) {
        case "logout":
          return await this.performLogout(request, validationResult);

        case "refresh":
          const rateLimitResult = await this.checkRefreshRateLimit(
            validationResult.user!.id,
            request
          );
          if (rateLimitResult.isLimited) {
            return this.handleRateLimitExceeded(request, rateLimitResult);
          }
          return await this.performTokenRefresh(request, validationResult);

        case "redirect_login":
          return this.redirectToLogin(request);

        case "continue":
        default:
          return this.continueWithSession(request, validationResult);
      }
    } catch (error) {
      console.error("[SESSION VALIDATOR] Error validating session:", error);
      success = false;
      return this.handleValidationError(request, error);
    } finally {
      const duration = Date.now() - startTime;
      await this.recordMetric("session_validation", success, duration);
    }
  }

  private static initialize(): void {
    this.validateConfig();
    this.initialized = true;
    console.log("[SESSION VALIDATOR] ✅ Initialized with valid configuration");
  }

  private static validateConfig(): void {
    const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET", "NEXTAUTH_SECRET"];

    const missing = requiredEnvVars.filter((envVar) => !process.env[envVar]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`
      );
    }

    if (this.SESSION_EXPIRY_HOURS < 1) {
      throw new Error("SESSION_EXPIRY_HOURS must be at least 1");
    }

    if (this.REFRESH_THRESHOLD_HOURS >= this.SESSION_EXPIRY_HOURS) {
      throw new Error(
        "REFRESH_THRESHOLD_HOURS must be less than SESSION_EXPIRY_HOURS"
      );
    }

    if (this.REFRESH_RATE_LIMIT < 1) {
      throw new Error("REFRESH_RATE_LIMIT must be at least 1");
    }

    if (this.MAX_CONCURRENT_SESSIONS < 1) {
      throw new Error("MAX_CONCURRENT_SESSIONS must be at least 1");
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
        securityLevel: "low",
      };
    }

    // Validate session token first
    if (sessionToken) {
      const sessionResult = await this.validateSessionToken(
        sessionToken,
        request
      );
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
      const refreshResult = await this.validateRefreshToken(
        refreshToken,
        request
      );
      if (refreshResult.isValid) {
        return { ...refreshResult, action: "refresh" };
      }
    }

    // Try JWT auth token (for API requests)
    if (authToken) {
      const jwtResult = await this.validateAuthToken(authToken, request);
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
      errorCode: "TOKEN_INVALID",
      securityLevel: "high",
    };
  }

  private static async validateSessionToken(
    sessionToken: string,
    request: NextRequest
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
                  matricNumber: true,
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
          errorCode: "TOKEN_INVALID",
          securityLevel: "medium",
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
          errorCode: "SESSION_EXPIRED",
          securityLevel: "low",
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
          errorCode: "USER_INACTIVE",
          securityLevel: "high",
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
          errorCode: "SESSION_EXPIRED",
          securityLevel: "medium",
        };
      }

      // Validate device fingerprint
      const deviceCheck = await this.validateDeviceFingerprint(
        session,
        request
      );
      if (!deviceCheck.isValid) {
        await this.handleSuspiciousActivity(
          session.userId,
          request,
          "device_mismatch"
        );
        return {
          isValid: false,
          needsRefresh: false,
          shouldLogout: true,
          action: "logout",
          errorCode: "DEVICE_MISMATCH",
          securityLevel: "high",
        };
      }

      // Check if session needs refresh (less than 2 hours left)
      const timeLeft = session.expires.getTime() - Date.now();
      const refreshThreshold = this.REFRESH_THRESHOLD_HOURS * 60 * 60 * 1000;
      const needsRefresh = timeLeft < refreshThreshold;

      // Extract user information based on role
      let matricNumber = undefined;
      let department = undefined;

      if (session.user.role === Role.STUDENT && session.user.student) {
        matricNumber = session.user.student.matricNumber;
        department = session.user.student.department;
      } else if (session.user.role === Role.TEACHER && session.user.teacher) {
        matricNumber = session.user.teacher.employeeId;
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
          matricNumber,
          department: department ?? undefined,
        },
        action: needsRefresh ? "refresh" : "continue",
        securityLevel: deviceCheck.securityLevel,
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
        errorCode: "SYSTEM_ERROR",
        securityLevel: "high",
      };
    }
  }

  private static async validateRefreshToken(
    refreshToken: string,
    request: NextRequest
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
          errorCode: "TOKEN_INVALID",
          securityLevel: "high",
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
              matricNumber: true,
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
          errorCode: "USER_INACTIVE",
          securityLevel: "high",
        };
      }

      // Extract user information based on role
      let matricNumber = undefined;
      let department = undefined;

      if (user.role === Role.STUDENT && user.student) {
        matricNumber = user.student.matricNumber;
        department = user.student.department;
      } else if (user.role === Role.TEACHER && user.teacher) {
        matricNumber = user.teacher.employeeId;
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
          matricNumber,
          department: department ?? undefined,
        },
        action: "refresh",
        securityLevel: "medium",
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
        errorCode: "TOKEN_INVALID",
        securityLevel: "high",
      };
    }
  }

  private static async validateAuthToken(
    authHeader: string,
    request: NextRequest
  ): Promise<SessionValidationResult> {
    try {
      const token = JWTClientUtils.extractTokenFromHeader(authHeader);
      if (!token) {
        return {
          isValid: false,
          needsRefresh: false,
          shouldLogout: false,
          action: "continue",
          securityLevel: "low",
        };
      }

      // Verify auth token
      const payload = await JWTUtils.verifyAuthToken(token);

      // Find user to ensure they're still active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          // Student specific fields
          student: {
            select: {
              matricNumber: true,
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
          errorCode: "USER_INACTIVE",
          securityLevel: "high",
        };
      }

      // Extract user information based on role
      let matricNumber = undefined;
      let department = undefined;

      if (user.role === Role.STUDENT && user.student) {
        matricNumber = user.student.matricNumber;
        department = user.student.department;
      } else if (user.role === Role.TEACHER && user.teacher) {
        matricNumber = user.teacher.employeeId;
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
          matricNumber,
          department: department ?? undefined,
        },
        action: "continue",
        securityLevel: "medium",
      };
    } catch (error) {
      // JWT verification failed - not necessarily an error for API tokens
      return {
        isValid: false,
        needsRefresh: false,
        shouldLogout: false,
        action: "continue",
        securityLevel: "low",
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

      // Check concurrent sessions
      const sessionCount = await prisma.session.count({
        where: { userId: user.id, expires: { gt: new Date() } },
      });

      if (sessionCount >= this.MAX_CONCURRENT_SESSIONS) {
        // Remove oldest session to make room
        const oldestSession = await prisma.session.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: "asc" },
        });

        if (oldestSession) {
          await prisma.session.delete({ where: { id: oldestSession.id } });
        }
      }

      // Generate new tokens
      const newSessionToken = nanoid();
      const newRefreshToken = await JWTUtils.generateRefreshToken(user.id);
      const newAuthToken = await JWTUtils.generateAuthToken({
        userId: user.id,
        email: user.email,
        schoolId: user.id,
        role: user.role,
        schoolNumber: user.matricNumber || "",
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

      // Generate device fingerprint
      const deviceFingerprint = this.generateDeviceFingerprint(request);

      await prisma.session.create({
        data: {
          sessionToken: newSessionToken,
          userId: user.id,
          expires,
          deviceFingerprint,
          userAgent: request.headers.get("user-agent") || "unknown",
          ipAddress:
            request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
            "unknown",
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
            deviceFingerprint,
            securityLevel: validationResult.securityLevel,
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
      response.headers.set("x-user-matric", user.matricNumber || "");
      response.headers.set("x-session-refreshed", "true");
      response.headers.set(
        "x-security-level",
        validationResult.securityLevel || "low"
      );

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

    if (validationResult.errorCode) {
      loginUrl.searchParams.set("error", validationResult.errorCode);
    }

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

    if (validationResult.errorCode) {
      response.headers.set("x-error-code", validationResult.errorCode);
    }

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
        "x-user-matric",
        validationResult.user.matricNumber || ""
      );
      response.headers.set(
        "x-user-department",
        validationResult.user.department || ""
      );
      response.headers.set("x-session-valid", "true");
      response.headers.set(
        "x-security-level",
        validationResult.securityLevel || "low"
      );
    }

    return response;
  }

  private static handleValidationError(
    request: NextRequest,
    error?: any
  ): NextResponse {
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

    // Log the error for debugging
    if (error) {
      console.error("[SESSION VALIDATOR] Detailed error:", error);
    }

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

  // Device fingerprinting
  private static generateDeviceFingerprint(request: NextRequest): string {
    const components = [
      request.headers.get("user-agent") || "unknown",
      request.headers.get("accept-language") || "unknown",
      request.headers.get("accept-encoding") || "unknown",
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown",
    ];

    // Simple hash of the components
    const fingerprint = components.join("|");
    return Buffer.from(fingerprint).toString("base64").substring(0, 32);
  }

  private static async validateDeviceFingerprint(
    session: any,
    request: NextRequest
  ): Promise<{ isValid: boolean; securityLevel: "low" | "medium" | "high" }> {
    const currentFingerprint = this.generateDeviceFingerprint(request);

    // If no existing fingerprint, set it and continue
    if (!session.deviceFingerprint) {
      await prisma.session.update({
        where: { id: session.id },
        data: { deviceFingerprint: currentFingerprint },
      });
      return { isValid: true, securityLevel: "medium" };
    }

    // Compare fingerprints
    if (session.deviceFingerprint === currentFingerprint) {
      return { isValid: true, securityLevel: "high" };
    }

    // Fingerprint mismatch - check if it's a minor change
    const similarity = this.calculateFingerprintSimilarity(
      session.deviceFingerprint,
      currentFingerprint
    );

    if (similarity > 0.7) {
      // Minor change - update fingerprint and continue with medium security
      await prisma.session.update({
        where: { id: session.id },
        data: { deviceFingerprint: currentFingerprint },
      });
      return { isValid: true, securityLevel: "medium" };
    }

    // Major change - invalid session
    return { isValid: false, securityLevel: "high" };
  }

  private static calculateFingerprintSimilarity(
    fp1: string,
    fp2: string
  ): number {
    // Simple similarity calculation based on common components
    const components1 = Buffer.from(fp1, "base64").toString().split("|");
    const components2 = Buffer.from(fp2, "base64").toString().split("|");

    let matches = 0;
    for (let i = 0; i < Math.min(components1.length, components2.length); i++) {
      if (components1[i] === components2[i]) matches++;
    }

    return matches / Math.max(components1.length, components2.length);
  }

  // Rate limiting
  private static async checkRefreshRateLimit(
    userId: string,
    request: NextRequest
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // Count refresh attempts in the last minute
    const recentRefreshes = await prisma.auditLog.count({
      where: {
        userId,
        action: "SESSION_REFRESHED",
        createdAt: {
          gte: new Date(windowStart),
        },
      },
    });

    if (recentRefreshes >= this.REFRESH_RATE_LIMIT) {
      return {
        isLimited: true,
        retryAfter: Math.ceil((now - windowStart) / 1000),
        remainingAttempts: 0,
      };
    }

    return {
      isLimited: false,
      remainingAttempts: this.REFRESH_RATE_LIMIT - recentRefreshes,
    };
  }

  private static handleRateLimitExceeded(
    request: NextRequest,
    rateLimitResult: RateLimitResult
  ): NextResponse {
    console.log("[SESSION VALIDATOR] 🚫 Rate limit exceeded");

    const response = NextResponse.redirect(
      new URL("/auth/signin", request.url)
    );
    response.cookies.set("session-token", "", {
      expires: new Date(0),
      path: "/",
    });
    response.cookies.set("refresh-token", "", {
      expires: new Date(0),
      path: "/",
    });

    response.headers.set("x-rate-limit-exceeded", "true");
    response.headers.set(
      "x-retry-after",
      rateLimitResult.retryAfter?.toString() || "60"
    );

    return response;
  }

  // Security monitoring
  private static async handleSuspiciousActivity(
    userId: string,
    request: NextRequest,
    reason: string
  ): Promise<void> {
    console.log(
      `[SESSION VALIDATOR] 🚨 Suspicious activity detected: ${reason}`
    );

    await prisma.auditLog.create({
      data: {
        userId,
        action: "SUSPICIOUS_ACTIVITY_DETECTED",
        details: {
          reason,
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
          timestamp: new Date().toISOString(),
        },
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
          "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    // In high-security scenarios, you might want to:
    // - Send email notification to user
    // - Temporarily lock the account
    // - Require additional verification
  }

  // Public methods
  static async validateSessionManually(
    sessionToken: string
  ): Promise<SessionValidationResult> {
    const mockRequest = new NextRequest("http://localhost");
    return this.validateSessionToken(sessionToken, mockRequest);
  }

  static async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      await prisma.session.deleteMany({
        where: { userId },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: "ALL_SESSIONS_INVALIDATED",
          details: { reason: "manual_invalidation" },
          ipAddress: "system",
          userAgent: "SessionTokenValidator",
        },
      });

      console.log(
        `[SESSION VALIDATOR] ✅ All sessions invalidated for user: ${userId}`
      );
    } catch (error) {
      console.error(
        "[SESSION VALIDATOR] Error invalidating user sessions:",
        error
      );
      throw error;
    }
  }

  static async getSessionStats(): Promise<{
    totalActiveSessions: number;
    expiredSessions: number;
    oldSessions: number;
    concurrentSessions: { [userId: string]: number };
  }> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalActive, expired, old, concurrentData] = await Promise.all([
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
      prisma.session.groupBy({
        by: ["userId"],
        where: {
          expires: { gt: now },
        },
        _count: {
          id: true,
        },
        having: {
          id: {
            _count: {
              gt: 1,
            },
          },
        },
      }),
    ]);

    // Add type annotation to concurrentData
    const concurrentDataTyped = concurrentData as Array<{ userId: string; _count: { id: number } }>;
    const concurrentSessions: { [userId: string]: number } = {};
    concurrentDataTyped.forEach((item) => {
      concurrentSessions[item.userId] = item._count.id;
    });

    return {
      totalActiveSessions: totalActive,
      expiredSessions: expired,
      oldSessions: old,
      concurrentSessions,
    };
  }

  static async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    issues: string[];
    stats: any;
  }> {
    const issues: string[] = [];

    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      issues.push("Database connection failed");
    }

    // Check for expired sessions that need cleanup
    const expiredCount = await prisma.session.count({
      where: { expires: { lt: new Date() } },
    });

    if (expiredCount > 100) {
      issues.push(`High number of expired sessions: ${expiredCount}`);
    }

    const stats = await this.getSessionStats();

    // Check for suspicious concurrent sessions
    Object.entries(stats.concurrentSessions).forEach(([userId, count]) => {
      if (count > this.MAX_CONCURRENT_SESSIONS) {
        issues.push(`User ${userId} has ${count} concurrent sessions`);
      }
    });

    return {
      status:
        issues.length === 0
          ? "healthy"
          : issues.length <= 2
          ? "degraded"
          : "unhealthy",
      issues,
      stats,
    };
  }

  // Metrics and monitoring
  private static async recordMetric(
    action: string,
    success: boolean,
    duration: number
  ): Promise<void> {
    try {
      console.log(
        `[METRIC] ${action}: ${
          success ? "SUCCESS" : "FAILURE"
        } in ${duration}ms`
      );

      // Store metrics in database for analytics
      await prisma.metric
        .create({
          data: {
            name: `session_validator_${action}`,
            value: duration,
            tags: {
              success: success.toString(),
              timestamp: new Date().toISOString(),
            },
            timestamp: new Date(),
          },
        })
        .catch((error) => {
          // Don't throw if metrics fail
          console.error("[SESSION VALIDATOR] Failed to record metric:", error);
        });
    } catch (error) {
      // Silent fail for metrics
    }
  }
}

// // lib/middleware/sessionTokenValidator.ts

// import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/server/prisma";
// import { JWTUtils, JWTClientUtils } from "@/lib/server/jwt";
// import { nanoid } from "nanoid";
// import type { MiddlewareContext } from "./types";
// import { Role } from "@prisma/client";

// interface SessionValidationResult {
//   isValid: boolean;
//   needsRefresh: boolean;
//   shouldLogout: boolean;
//   user?: {
//     id: string;
//     name: string;
//     email: string;
//     role: Role;
//     matricNumber?: string; // Changed back to matricNumber to match schema
//     department?: string;
//   };
//   action: "continue" | "refresh" | "logout" | "redirect_login";
// }

// export class SessionTokenValidator {
//   private static readonly SESSION_EXPIRY_HOURS = 8;
//   private static readonly REFRESH_THRESHOLD_HOURS = 2;
//   private static readonly MAX_SESSION_AGE_DAYS = 7;

//   static async validate(
//     request: NextRequest,
//     context: MiddlewareContext
//   ): Promise<NextResponse> {
//     try {
//       const validationResult = await this.validateSession(request, context);

//       switch (validationResult.action) {
//         case "logout":
//           return await this.performLogout(request, validationResult);

//         case "refresh":
//           return await this.performTokenRefresh(request, validationResult);

//         case "redirect_login":
//           return this.redirectToLogin(request);

//         case "continue":
//         default:
//           return this.continueWithSession(request, validationResult);
//       }
//     } catch (error) {
//       console.error("[SESSION VALIDATOR] Error validating session:", error);
//       return this.handleValidationError(request);
//     }
//   }

//   private static async validateSession(
//     request: NextRequest,
//     context: MiddlewareContext
//   ): Promise<SessionValidationResult> {
//     const sessionToken = request.cookies.get("session-token")?.value;
//     const refreshToken = request.cookies.get("refresh-token")?.value;
//     const userId = request.cookies.get("userId")?.value;
//     const authToken = request.headers.get("authorization");

//     // No tokens present
//     if (!sessionToken && !refreshToken && !authToken) {
//       return {
//         isValid: false,
//         needsRefresh: false,
//         shouldLogout: false,
//         action: context.isPrivatePath ? "redirect_login" : "continue",
//       };
//     }

//     // Validate session token first
//     if (sessionToken) {
//       const sessionResult = await this.validateSessionToken(sessionToken);
//       if (sessionResult.isValid) {
//         // Check if session needs refresh
//         if (sessionResult.needsRefresh) {
//           return { ...sessionResult, action: "refresh" };
//         }
//         return { ...sessionResult, action: "continue" };
//       }
//     }

//     // Session token invalid, try refresh token
//     if (refreshToken) {
//       const refreshResult = await this.validateRefreshToken(refreshToken);
//       if (refreshResult.isValid) {
//         return { ...refreshResult, action: "refresh" };
//       }
//     }

//     // Try JWT auth token (for API requests)
//     if (authToken) {
//       const jwtResult = await this.validateAuthToken(authToken);
//       if (jwtResult.isValid) {
//         return { ...jwtResult, action: "continue" };
//       }
//     }

//     // All tokens invalid - logout required
//     return {
//       isValid: false,
//       needsRefresh: false,
//       shouldLogout: true,
//       action: "logout",
//     };
//   }

//   private static async validateSessionToken(
//     sessionToken: string
//   ): Promise<SessionValidationResult> {
//     try {
//       // Find session in database
//       const session = await prisma.session.findUnique({
//         where: { sessionToken },
//         include: {
//           user: {
//             select: {
//               id: true,
//               name: true,
//               email: true,
//               role: true,
//               isActive: true,
//               // Student specific fields
//               student: {
//                 select: {
//                   matricNumber: true, // Changed to matricNumber
//                   department: true,
//                 },
//               },
//               // Teacher specific fields
//               teacher: {
//                 select: {
//                   employeeId: true,
//                   department: true,
//                 },
//               },
//             },
//           },
//         },
//       });

//       if (!session) {
//         return {
//           isValid: false,
//           needsRefresh: false,
//           shouldLogout: true,
//           action: "logout",
//         };
//       }

//       // Check if session expired
//       if (session.expires < new Date()) {
//         // Clean up expired session
//         await prisma.session.delete({ where: { id: session.id } });
//         return {
//           isValid: false,
//           needsRefresh: false,
//           shouldLogout: true,
//           action: "logout",
//         };
//       }

//       // Check if user is still active
//       if (!session.user.isActive) {
//         await prisma.session.delete({ where: { id: session.id } });
//         return {
//           isValid: false,
//           needsRefresh: false,
//           shouldLogout: true,
//           action: "logout",
//         };
//       }

//       // Check if session is too old
//       const sessionAge = Date.now() - session.createdAt.getTime();
//       const maxAge = this.MAX_SESSION_AGE_DAYS * 24 * 60 * 60 * 1000;
//       if (sessionAge > maxAge) {
//         await prisma.session.delete({ where: { id: session.id } });
//         return {
//           isValid: false,
//           needsRefresh: false,
//           shouldLogout: true,
//           action: "logout",
//         };
//       }

//       // Check if session needs refresh (less than 2 hours left)
//       const timeLeft = session.expires.getTime() - Date.now();
//       const refreshThreshold = this.REFRESH_THRESHOLD_HOURS * 60 * 60 * 1000;
//       const needsRefresh = timeLeft < refreshThreshold;

//       // Extract user information based on role
//       let matricNumber = undefined;
//       let department = undefined;

//       if (session.user.role === Role.STUDENT && session.user.student) {
//         matricNumber = session.user.student.matricNumber; // Changed to matricNumber
//         department = session.user.student.department;
//       } else if (session.user.role === Role.TEACHER && session.user.teacher) {
//         matricNumber = session.user.teacher.employeeId;
//         department = session.user.teacher.department;
//       }

//       return {
//         isValid: true,
//         needsRefresh,
//         shouldLogout: false,
//         user: {
//           id: session.user.id,
//           name: session.user.name || "",
//           email: session.user.email,
//           role: session.user.role,
//           matricNumber, // Changed back to matricNumber
//           department: department ?? undefined,
//         },
//         action: needsRefresh ? "refresh" : "continue",
//       };
//     } catch (error) {
//       console.error(
//         "[SESSION VALIDATOR] Error validating session token:",
//         error
//       );
//       return {
//         isValid: false,
//         needsRefresh: false,
//         shouldLogout: true,
//         action: "logout",
//       };
//     }
//   }

//   private static async validateRefreshToken(
//     refreshToken: string
//   ): Promise<SessionValidationResult> {
//     try {
//       // Verify refresh token JWT
//       const payload = await JWTUtils.verifyToken(refreshToken);

//       if (payload.type !== "refresh" || !payload.userId) {
//         return {
//           isValid: false,
//           needsRefresh: false,
//           shouldLogout: true,
//           action: "logout",
//         };
//       }

//       // Find user
//       const user = await prisma.user.findUnique({
//         where: { id: payload.userId as string },
//         select: {
//           id: true,
//           name: true,
//           email: true,
//           role: true,
//           isActive: true,
//           // Student specific fields
//           student: {
//             select: {
//               matricNumber: true, // Changed to matricNumber
//               department: true,
//             },
//           },
//           // Teacher specific fields
//           teacher: {
//             select: {
//               employeeId: true,
//               department: true,
//             },
//           },
//         },
//       });

//       if (!user || !user.isActive) {
//         return {
//           isValid: false,
//           needsRefresh: false,
//           shouldLogout: true,
//           action: "logout",
//         };
//       }

//       // Extract user information based on role
//       let matricNumber = undefined;
//       let department = undefined;

//       if (user.role === Role.STUDENT && user.student) {
//         matricNumber = user.student.matricNumber; // Changed to matricNumber
//         department = user.student.department;
//       } else if (user.role === Role.TEACHER && user.teacher) {
//         matricNumber = user.teacher.employeeId;
//         department = user.teacher.department;
//       }

//       return {
//         isValid: true,
//         needsRefresh: true,
//         shouldLogout: false,
//         user: {
//           id: user.id,
//           name: user.name || "",
//           email: user.email,
//           role: user.role,
//           matricNumber, // Changed back to matricNumber
//           department: department ?? undefined,
//         },
//         action: "refresh",
//       };
//     } catch (error) {
//       console.error(
//         "[SESSION VALIDATOR] Error validating refresh token:",
//         error
//       );
//       return {
//         isValid: false,
//         needsRefresh: false,
//         shouldLogout: true,
//         action: "logout",
//       };
//     }
//   }

//   private static async validateAuthToken(
//     authHeader: string
//   ): Promise<SessionValidationResult> {
//     try {
//       const token = JWTClientUtils.extractTokenFromHeader(authHeader);
//       if (!token) {
//         return {
//           isValid: false,
//           needsRefresh: false,
//           shouldLogout: false,
//           action: "continue",
//         };
//       }

//       // Verify auth token
//       const payload = await JWTUtils.verifyAuthToken(token);

//       // Find user to ensure they're still active
//       const user = await prisma.user.findUnique({
//         where: { id: payload.userId },
//         select: {
//           id: true,
//           name: true,
//           email: true,
//           role: true,
//           isActive: true,
//           // Student specific fields
//           student: {
//             select: {
//               matricNumber: true, // Changed to matricNumber
//               department: true,
//             },
//           },
//           // Teacher specific fields
//           teacher: {
//             select: {
//               employeeId: true,
//               department: true,
//             },
//           },
//         },
//       });

//       if (!user || !user.isActive) {
//         return {
//           isValid: false,
//           needsRefresh: false,
//           shouldLogout: true,
//           action: "logout",
//         };
//       }

//       // Extract user information based on role
//       let matricNumber = undefined;
//       let department = undefined;

//       if (user.role === Role.STUDENT && user.student) {
//         matricNumber = user.student.matricNumber; // Changed to matricNumber
//         department = user.student.department;
//       } else if (user.role === Role.TEACHER && user.teacher) {
//         matricNumber = user.teacher.employeeId;
//         department = user.teacher.department;
//       }

//       return {
//         isValid: true,
//         needsRefresh: false,
//         shouldLogout: false,
//         user: {
//           id: user.id,
//           name: user.name || "",
//           email: user.email,
//           role: user.role,
//           matricNumber, // Changed back to matricNumber
//           department: department ?? undefined,
//         },
//         action: "continue",
//       };
//     } catch (error) {
//       // JWT verification failed - not necessarily an error for API tokens
//       return {
//         isValid: false,
//         needsRefresh: false,
//         shouldLogout: false,
//         action: "continue",
//       };
//     }
//   }

//   private static async performTokenRefresh(
//     request: NextRequest,
//     validationResult: SessionValidationResult
//   ): Promise<NextResponse> {
//     try {
//       if (!validationResult.user) {
//         return await this.performLogout(request, validationResult);
//       }

//       const user = validationResult.user;

//       // Generate new tokens
//       const newSessionToken = nanoid();
//       const newRefreshToken = await JWTUtils.generateRefreshToken(user.id);
//       const newAuthToken = await JWTUtils.generateAuthToken({
//         userId: user.id,
//         email: user.email,
//         schoolId: user.id,
//         role: user.role,
//         schoolNumber: user.matricNumber || "", // Changed back to matricNumber
//       });

//       // Update session in database
//       const expires = new Date();
//       expires.setHours(expires.getHours() + this.SESSION_EXPIRY_HOURS);

//       // Delete old session and create new one
//       const oldSessionToken = request.cookies.get("session-token")?.value;
//       if (oldSessionToken) {
//         await prisma.session.deleteMany({
//           where: { sessionToken: oldSessionToken },
//         });
//       }

//       await prisma.session.create({
//         data: {
//           sessionToken: newSessionToken,
//           userId: user.id,
//           expires,
//         },
//       });

//       // Update last login
//       await prisma.user.update({
//         where: { id: user.id },
//         data: { lastLoginAt: new Date() },
//       });

//       // Log refresh action
//       await prisma.auditLog.create({
//         data: {
//           userId: user.id,
//           action: "SESSION_REFRESHED",
//           details: {
//             automatic: true,
//             userAgent: request.headers.get("user-agent"),
//           },
//           ipAddress:
//             request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
//             "unknown",
//           userAgent: request.headers.get("user-agent") || "unknown",
//         },
//       });

//       // Create response with new cookies
//       const response = NextResponse.next();

//       // Set new cookies
//       response.cookies.set("session-token", newSessionToken, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "lax",
//         path: "/",
//         expires,
//       });

//       response.cookies.set("refresh-token", newRefreshToken, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "lax",
//         path: "/",
//         expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
//       });

//       response.cookies.set("userId", user.id, {
//         httpOnly: false, // This one can be accessible by client
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "lax",
//         path: "/",
//         expires,
//       });

//       // Add user info to response headers for other middleware
//       response.headers.set("x-user-id", user.id);
//       response.headers.set("x-user-role", user.role);
//       response.headers.set("x-user-matric", user.matricNumber || ""); // Changed back to x-user-matric
//       response.headers.set("x-session-refreshed", "true");

//       console.log(
//         `[SESSION VALIDATOR] ✅ Session refreshed for user: ${user.id}`
//       );
//       return response;
//     } catch (error) {
//       console.error("[SESSION VALIDATOR] Error refreshing tokens:", error);
//       return await this.performLogout(request, validationResult);
//     }
//   }

//   private static async performLogout(
//     request: NextRequest,
//     validationResult: SessionValidationResult
//   ): Promise<NextResponse> {
//     console.log("[SESSION VALIDATOR] 🚪 Performing automatic logout");

//     // Clean up database session
//     const sessionToken = request.cookies.get("session-token")?.value;
//     if (sessionToken) {
//       await this.cleanupSession(sessionToken).catch((error) =>
//         console.error("[SESSION VALIDATOR] Error cleaning up session:", error)
//       );
//     }

//     const loginUrl = new URL("/auth/signin", request.url);
//     loginUrl.searchParams.set("reason", "session_expired");

//     const response = NextResponse.redirect(loginUrl);

//     // Clear all session cookies
//     const cookiesToClear = ["session-token", "refresh-token", "userId"];

//     cookiesToClear.forEach((cookieName) => {
//       response.cookies.set(cookieName, "", {
//         expires: new Date(0),
//         path: "/",
//       });
//     });

//     response.headers.set("x-session-invalidated", "true");
//     response.headers.set("x-logout-reason", "automatic");

//     return response;
//   }

//   private static redirectToLogin(request: NextRequest): NextResponse {
//     console.log("[SESSION VALIDATOR] 🔄 Redirecting to login");

//     const loginUrl = new URL("/auth/signin", request.url);
//     if (request.nextUrl.pathname !== "/auth/signin") {
//       loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
//     }

//     return NextResponse.redirect(loginUrl);
//   }

//   private static continueWithSession(
//     request: NextRequest,
//     validationResult: SessionValidationResult
//   ): NextResponse {
//     const response = NextResponse.next();

//     if (validationResult.user) {
//       // Add user info to headers for other middleware
//       response.headers.set("x-user-id", validationResult.user.id);
//       response.headers.set("x-user-role", validationResult.user.role);
//       response.headers.set(
//         "x-user-matric", // Changed back to x-user-matric
//         validationResult.user.matricNumber || ""
//       );
//       response.headers.set(
//         "x-user-department",
//         validationResult.user.department || ""
//       );
//       response.headers.set("x-session-valid", "true");
//     }

//     return response;
//   }

//   private static handleValidationError(request: NextRequest): NextResponse {
//     console.log(
//       "[SESSION VALIDATOR] ⚠️ Validation error, redirecting to login"
//     );

//     const response = NextResponse.redirect(
//       new URL("/auth/signin", request.url)
//     );

//     // Clear potentially corrupted cookies
//     const cookiesToClear = ["session-token", "refresh-token", "userId"];
//     cookiesToClear.forEach((cookieName) => {
//       response.cookies.set(cookieName, "", {
//         expires: new Date(0),
//         path: "/",
//       });
//     });

//     return response;
//   }

//   private static async cleanupSession(sessionToken: string): Promise<void> {
//     try {
//       const session = await prisma.session.findUnique({
//         where: { sessionToken },
//         include: { user: true },
//       });

//       if (session) {
//         await prisma.auditLog.create({
//           data: {
//             userId: session.userId,
//             action: "SESSION_CLEANED_UP",
//             details: { automatic: true },
//             ipAddress: "middleware",
//             userAgent: "SessionTokenValidator",
//           },
//         });

//         await prisma.session.delete({
//           where: { sessionToken },
//         });
//       }

//       // Clean up expired sessions while we're here
//       await prisma.session.deleteMany({
//         where: {
//           expires: { lt: new Date() },
//         },
//       });
//     } catch (error) {
//       console.error("[SESSION VALIDATOR] Error in cleanup:", error);
//     }
//   }

//   // Public method for manual session validation (useful for API routes)
//   static async validateSessionManually(
//     sessionToken: string
//   ): Promise<SessionValidationResult> {
//     return this.validateSessionToken(sessionToken);
//   }

//   // Public method to get session statistics
//   static async getSessionStats(): Promise<{
//     totalActiveSessions: number;
//     expiredSessions: number;
//     oldSessions: number;
//   }> {
//     const now = new Date();
//     const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
//     const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

//     const [totalActive, expired, old] = await Promise.all([
//       prisma.session.count({
//         where: {
//           expires: { gt: now },
//         },
//       }),
//       prisma.session.count({
//         where: {
//           expires: { lte: now },
//         },
//       }),
//       prisma.session.count({
//         where: {
//           createdAt: { lte: sevenDaysAgo },
//         },
//       }),
//     ]);

//     return {
//       totalActiveSessions: totalActive,
//       expiredSessions: expired,
//       oldSessions: old,
//     };
//   }
// }
