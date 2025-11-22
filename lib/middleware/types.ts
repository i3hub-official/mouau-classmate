// ========================================
// 🔧 CORE UTILITIES - Foundation Layer
// ========================================

// File: src/lib/middleware/types.ts
import { Timestamp } from "next/dist/server/lib/cache-handlers/types";
import { NextRequest, NextResponse } from "next/server";

export interface MiddlewareContext {
  // Core
  processingTimeMs: number;

  // Routing
  method: string;
  pathname: string;
  fullUrl: string;

  // Authentication
  isAdmin: boolean;

  // Client
  clientIpSource: string;
  clientIpConfidence: number;
  isProxy: boolean;
  country: string;
  region: string;
  acceptLanguage: string;
  secFetchSite: string;

  // Session
  sessionCreatedAt: number | null;
  deviceFingerprint: string | null;

  // Security
  _BANDWIDTH: number;
  botScore: number;

  // Compliance
  consent: {
    cookies: boolean;
    analytics: boolean;
    processing: boolean;
    marketing: boolean;
    version: string;
  };

  // Observability
  isPublicPath: boolean;
  isAuthPath: boolean;
  isPrivatePath: boolean;
  hasSession: boolean;
  sessionToken?: string;
  refreshToken?: string;
  userId: string | null;
  clientIp: string;
  userAgent: string | null;
  timestamp: Timestamp;
  userRole: string;
  sessionData: any;
  requestId?: string;
  startTime?: number;
  isAuthenticated?: boolean;
  threatScore?: number;
  securityLevel?: "low" | "medium" | "high";
  nonce?: string;
  device?: any | null;
  referrer?: string | null;
  role?: string | null;
  isDev?: boolean;
  contextSources?: string[];
  integratedAt?: number;
  geo: any | null;
  sessionAgeMs: number | null;
  headers: Record<string, string>; // Added headers property
}

export type MiddlewareFunction = (
  request: NextRequest,
  context: MiddlewareContext
) => NextResponse | Promise<NextResponse>;

export type { AuthenticatedActionContext } from "./authenticatedActionHandler";
