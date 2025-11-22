// src/lib/middleware/authenticatedActionHandler.ts
import { NextRequest } from "next/server";
import type { MiddlewareContext } from "./types";
import { Role } from "@prisma/client";

export interface AuthenticatedActionContext extends MiddlewareContext {
  isAuthAction: boolean;
  actionType:
    | "signin"
    | "signout"
    | "signup"
    | "password_reset"
    | "verify_email"
    | "refresh_token"
    | "user_action"
    | "admin_action"
    | "none";
  sensitivity: "low" | "medium" | "high" | "critical";
  userContext?: {
    userId: string;
    role: Role | string;
    sessionAgeMs: number;
    trustScore: number; // 0–100
    isFreshSession: boolean;
    isElevatedRole: boolean;
  };
  authAdjustments: {
    threatThreshold: number;
    trustBonus: number;
    falsePositiveReduction: number;
  };
}

export class AuthenticatedActionHandler {
  // ─────────────────────────────────────────────────────────────────────
  // Known Auth & Sensitive Routes
  // ─────────────────────────────────────────────────────────────────────
  private static readonly AUTH_ROUTES = new Map<
    string,
    AuthenticatedActionContext["actionType"]
  >([
    ["/signin", "signin"],
    ["/auth/signin", "signin"],
    ["/api/auth/signin", "signin"],
    ["/api/v1/auth/token", "signin"],
    ["/api/v1/auth/access-code", "signin"],

    ["/signout", "signout"],
    ["/auth/signout", "signout"],
    ["/api/auth/signout", "signout"],

    ["/signup", "signup"],
    ["/auth/signup", "signup"],
    ["/register", "signup"],
    ["/api/auth/signup", "signup"],

    ["/reset-password", "password_reset"],
    ["/auth/reset-password", "password_reset"],
    ["/api/auth/reset-password", "password_reset"],

    ["/verify-email", "verify_email"],
    ["/auth/verify-email", "verify_email"],
    ["/api/auth/verify-email", "verify_email"],

    ["/auth/refresh", "refresh_token"],
    ["/api/auth/refresh", "refresh_token"],
  ]);

  private static readonly SENSITIVITY_MAP = {
    signin: "critical" as const,
    signup: "critical" as const,
    password_reset: "critical" as const,
    verify_email: "critical" as const,
    refresh_token: "high" as const,
    signout: "high" as const,
    user_action: "medium" as const,
    admin_action: "high" as const,
    none: "low" as const,
  };

  private static readonly PROTECTED_PREFIXES = [
    "/dashboard",
    "/profile",
    "/settings",
    "/courses",
    "/gradebook",
    "/admin",
    "/api/v1/user",
    "/api/v1/student",
    "/api/v1/teacher",
  ];

  private static readonly ADMIN_PREFIXES = ["/admin", "/api/v1/admin"];

  // ─────────────────────────────────────────────────────────────────────
  // Main Enhancement
  // ─────────────────────────────────────────────────────────────────────
  static enhanceContext(
    request: NextRequest,
    baseContext: MiddlewareContext
  ): AuthenticatedActionContext {
    const pathname = request.nextUrl.pathname;
    const method = request.method;

    // Detect action type
    const actionType = this.detectActionType(pathname);
    const sensitivity = this.SENSITIVITY_MAP[actionType];

    // Extract user context from trusted headers (set by SessionTokenValidator)
    const userContext = this.buildUserContext(request, baseContext);

    // Calculate dynamic threat adjustments
    const authAdjustments = this.calculateAdjustments(
      actionType,
      userContext,
      sensitivity
    );

    return {
      ...baseContext,
      isAuthAction:
        actionType !== "none" &&
        actionType !== "user_action" &&
        actionType !== "admin_action",
      actionType,
      sensitivity,
      userContext,
      authAdjustments,
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Action Detection
  // ─────────────────────────────────────────────────────────────────────
  private static detectActionType(
    pathname: string
  ): AuthenticatedActionContext["actionType"] {
    // Exact matches first
    const exactMatch = this.AUTH_ROUTES.get(pathname);
    if (exactMatch) return exactMatch;

    // Admin routes
    if (this.ADMIN_PREFIXES.some((p) => pathname.startsWith(p))) {
      return "admin_action";
    }

    // Protected user routes
    if (this.PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
      return "user_action";
    }

    return "none";
  }

  // ─────────────────────────────────────────────────────────────────────
  // User Context Builder
  // ─────────────────────────────────────────────────────────────────────
  private static buildUserContext(
    request: NextRequest,
    context: MiddlewareContext
  ): AuthenticatedActionContext["userContext"] | undefined {
    const userId = request.headers.get("x-user-id");
    const roleHeader = request.headers.get("x-user-role");
    const sessionRefreshed =
      request.headers.get("x-session-refreshed") === "true";

    if (!userId || !roleHeader) return undefined;

    const role = roleHeader as Role;
    const sessionCreatedHeader = request.headers.get("x-session-created");
    const sessionAgeMs = sessionCreatedHeader
      ? Date.now() - parseInt(sessionCreatedHeader)
      : context.sessionAgeMs || 0;

    let trustScore = 50;

    // Fresh session = higher trust
    if (sessionAgeMs < 5 * 60 * 1000) trustScore += 20; // < 5 min
    else if (sessionAgeMs < 30 * 60 * 1000) trustScore += 10; // < 30 min

    // Recently refreshed = trust boost
    if (sessionRefreshed) trustScore += 15;

    // Role-based trust
    if (role === Role.ADMIN) trustScore += 25;
    else if (role === Role.TEACHER) trustScore += 10;

    return {
      userId,
      role,
      sessionAgeMs,
      trustScore: Math.min(100, Math.max(0, trustScore)),
      isFreshSession: sessionAgeMs < 10 * 60 * 1000,
      isElevatedRole: ["ADMIN", "TEACHER"].includes(String(role)),
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Dynamic Threat Adjustments
  // ─────────────────────────────────────────────────────────────────────
  private static calculateAdjustments(
    actionType: AuthenticatedActionContext["actionType"],
    userContext?: AuthenticatedActionContext["userContext"],
    sensitivity?: AuthenticatedActionContext["sensitivity"]
  ): AuthenticatedActionContext["authAdjustments"] {
    let threatThreshold = 80;
    let trustBonus = 0;
    let falsePositiveReduction = 0;

    // Critical auth actions: be more lenient to reduce lockouts
    if (
      ["signin", "signup", "password_reset", "verify_email"].includes(
        actionType
      )
    ) {
      threatThreshold = 92;
      falsePositiveReduction = 25;
    }

    // Refresh token: slightly higher threshold
    if (actionType === "refresh_token") {
      threatThreshold = 88;
    }

    // Trusted users get lower effective threat
    if (userContext) {
      if (userContext.trustScore >= 85) {
        trustBonus = 20;
        threatThreshold += 10;
      } else if (userContext.trustScore >= 70) {
        trustBonus = 10;
        threatThreshold += 5;
      }
    }

    return {
      threatThreshold: Math.min(98, threatThreshold),
      trustBonus,
      falsePositiveReduction,
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Middleware Skip Logic
  // ─────────────────────────────────────────────────────────────────────
  static shouldSkipMiddleware(
    middlewareName: string,
    context: AuthenticatedActionContext
  ): boolean {
    const { actionType, userContext } = context;

    // Never run session validator on signin/signup
    if (
      middlewareName === "SessionTokenValidator" &&
      (actionType === "signin" ||
        actionType === "signup" ||
        actionType === "password_reset")
    ) {
      return true;
    }

    // Skip rate limiter on password reset (users forget passwords)
    if (middlewareName === "RateLimiter" && actionType === "password_reset") {
      return true;
    }

    // Skip bot detection false positives on signin
    if (middlewareName === "BotDetector" && actionType === "signin") {
      return true;
    }

    // Allow signout even if session expired
    if (
      middlewareName === "SessionTokenValidator" &&
      actionType === "signout"
    ) {
      return true;
    }

    // Skip access control for auth flows
    if (
      ["AccessController", "RoleGuard"].includes(middlewareName) &&
      [
        "signin",
        "signup",
        "signout",
        "password_reset",
        "verify_email",
      ].includes(actionType)
    ) {
      return true;
    }

    return false;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Threat Threshold (used by WAF, RateLimiter, etc.)
  // ─────────────────────────────────────────────────────────────────────
  static getThreatThreshold(context: AuthenticatedActionContext): number {
    return context.authAdjustments.threatThreshold;
  }

  static getEffectiveThreatScore(
    baseScore: number,
    context: AuthenticatedActionContext
  ): number {
    let score = baseScore;

    // Apply trust reduction
    score -= context.authAdjustments.trustBonus;

    // Apply false positive reduction for sensitive auth flows
    score -= context.authAdjustments.falsePositiveReduction;

    return Math.max(0, Math.min(100, score));
  }
}
