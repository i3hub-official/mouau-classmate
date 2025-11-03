// ========================================
// 🔐 AUTHENTICATED ACTION HANDLER
// ========================================

import { NextRequest } from "next/server";
import { type MiddlewareContext } from "./types";

export interface AuthenticatedActionContext extends MiddlewareContext {
  isAuthAction: boolean;
  actionType:
    | "signin"
    | "signout"
    | "signup"
    | "password_reset"
    | "user_action"
    | "none";
  userContext?: {
  userId: string | null;
    role: string;
    sessionAge: number;
    trustLevel: number;
  };
  sensitivity: "low" | "medium" | "high" | "critical";
  authAdjustments: {
    sensitivityReduction: number;
    trustBonus: number;
  };
  
}

export class AuthenticatedActionHandler {
  private static readonly AUTH_PATHS = {
    "/auth/signin": { type: "signin", sensitivity: "critical" as const },
    "/auth/signout": { type: "signout", sensitivity: "high" as const },
    "/auth/signup": { type: "signup", sensitivity: "critical" as const },
    "/auth/reset-password": {
      type: "password_reset",
      sensitivity: "critical" as const,
    },
    "/auth/refresh": { type: "user_action", sensitivity: "high" as const },
    "/api/v1/auth/access-code": {
      type: "signin",
      sensitivity: "critical" as const,
    },
    "/api/v1/auth/token": { type: "signin", sensitivity: "critical" as const },
  };

  private static readonly USER_ACTION_PATTERNS = [
    "/api/dashboard/",
    "/api/dashboard/*",
    "/dashboard",
    "/profile",
    "/settings",
  ];

  static enhanceContext(
    request: NextRequest,
    baseContext: MiddlewareContext
  ): AuthenticatedActionContext {
    const pathname = request.nextUrl.pathname;

    const authAction =
      this.AUTH_PATHS[pathname as keyof typeof this.AUTH_PATHS];
    const isUserAction = this.USER_ACTION_PATTERNS.some((pattern) =>
      pathname.startsWith(pattern)
    );

    let actionType: AuthenticatedActionContext["actionType"] = "none";
    let sensitivity: AuthenticatedActionContext["sensitivity"] = "low";

    if (authAction) {
      actionType = authAction.type as AuthenticatedActionContext["actionType"];
      sensitivity = authAction.sensitivity;
    } else if (isUserAction) {
      actionType = "user_action";
      sensitivity = "medium";
    }

    const userContext = this.extractUserContext(request, baseContext);
    const authAdjustments = this.calculateAuthAdjustments(
      sensitivity,
      userContext
    );

    return {
      ...baseContext,
      isAuthAction: !!authAction,
      actionType,
      userContext,
      sensitivity,
      authAdjustments,
    };
  }

  private static extractUserContext(
    request: NextRequest,
    context: MiddlewareContext
  ) {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    const sessionRefreshed =
      request.headers.get("x-session-refreshed") === "true";
    const sessionToken = context.sessionToken;

    if (!userId || !userRole) return undefined;

    const sessionAge = sessionToken
      ? Date.now() - parseInt(sessionToken.substring(-13), 36)
      : 0;

    let trustLevel = 50;
    if (sessionRefreshed) trustLevel += 10;
    if (userRole === "Super_dashboard") trustLevel += 20;
    else if (userRole === "dashboard") trustLevel += 10;
    if (sessionAge < 3600000) trustLevel += 15;

    return {
      userId,
      role: userRole,
      sessionAge,
      trustLevel: Math.min(100, trustLevel),
    };
  }

  private static calculateAuthAdjustments(
    sensitivity: AuthenticatedActionContext["sensitivity"],
    userContext?: AuthenticatedActionContext["userContext"]
  ) {
    let sensitivityReduction = 0;
    let trustBonus = 0;

    // Adjust based on action sensitivity
    if (sensitivity === "critical") {
      sensitivityReduction = 20;
    } else if (sensitivity === "high") {
      sensitivityReduction = 10;
    }

    // Adjust based on user trust level
    if (userContext && userContext.trustLevel > 70) {
      trustBonus = 15;
    } else if (userContext && userContext.trustLevel > 50) {
      trustBonus = 5;
    }

    return { sensitivityReduction, trustBonus };
  }

  static shouldSkipMiddleware(
    middlewareName: string,
    context: AuthenticatedActionContext
  ): boolean {
    // Skip session validation for signin/signup
    if (
      middlewareName === "SessionTokenValidator" &&
      (context.actionType === "signin" || context.actionType === "signup")
    ) {
      return true;
    }

    // Skip cache for auth actions
    if (middlewareName === "CacheManager" && context.isAuthAction) {
      return true;
    }

    // Skip access control for signin/signup/logout
    if (
      (middlewareName === "AccessController" ||
        middlewareName === "ApiAccessGuardian") &&
      (context.actionType === "signin" ||
        context.actionType === "signup" ||
        (context.actionType === "signout" && context.userContext))
    ) {
      return true;
    }

    return false;
  }

  static getThreatThreshold(context: AuthenticatedActionContext): number {
    // Higher threshold for auth actions to reduce false positives
    if (context.actionType === "signin" || context.actionType === "signup") {
      return 90;
    }
    return 80;
  }
}
