// ========================================
// 🔧 CORE UTILITIES - Foundation Layer
// ========================================

// File: src/lib/middleware/types.ts
import { Timestamp } from "next/dist/server/lib/cache-handlers/types";
import { NextRequest, NextResponse } from "next/server";

export interface MiddlewareContext {
  isPublicPath: boolean;
  isAuthPath: boolean;
  isPrivatePath: boolean;
  hasSession: boolean;
  sessionToken?: string;
  refreshToken?: string;
  userId: string | null;
  clientIp: string;
  userAgent: string;
  timestamp: Timestamp;
  userRole: string;
  sessionData: any;
  
}

export type MiddlewareFunction = (
  request: NextRequest,
  context: MiddlewareContext
) => Promise<NextResponse> | NextResponse;

export type MiddlewareResult = {
  response: NextResponse;
  shouldContinue: boolean;
  context: Partial<MiddlewareContext>;
};
