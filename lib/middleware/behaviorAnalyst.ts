// ========================================
// 🧠 TASK 14: BEHAVIOR ANALYST - AI-Powered Anomaly Detection
// Responsibility: Learn normal patterns and detect behavioral anomalies
// ========================================

// File: src/lib/middleware/behaviorAnalyst.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";

interface UserBehaviorProfile {
  userId: string;
  typicalPaths: string[];
  averageRequestInterval: number;
  commonTimeRanges: number[]; // Hours of day
  typicalPayloadSizes: number[];
  geographicPattern: string[];
  lastAnalysis: number;
}

interface BehaviorAnomaly {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  confidence: number; // 0-100
  description: string;
}

export class BehaviorAnalyst {
  private static userProfiles = new Map<string, UserBehaviorProfile>();
  private static readonly LEARNING_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days

  static analyze(
    request: NextRequest,
    context: MiddlewareContext
  ): NextResponse {
    try {
      // Skip analysis for non-authenticated users initially
      if (!context.hasSession || !context.sessionToken) {
        return NextResponse.next();
      }

      const userId = context.sessionToken.substring(0, 16); // Use session as user identifier
      const anomalies = this.detectAnomalies(request, context, userId);

      // Update user profile
      this.updateUserProfile(request, context, userId);

      // Handle significant anomalies
      if (anomalies.some((a) => a.severity === "HIGH" && a.confidence > 80)) {
        console.log(`[BEHAVIOR ANALYST] ⚠️ HIGH-confidence anomaly: ${userId}`);

        const response = NextResponse.next();
        response.headers.set("x-behavior-anomaly", "HIGH");
        response.headers.set("x-require-additional-auth", "true");
        return response;
      }

      if (anomalies.length > 0) {
        console.log(
          `[BEHAVIOR ANALYST] 📊 Anomalies detected: ${anomalies.length}`
        );
      }

      const response = NextResponse.next();
      response.headers.set(
        "x-behavior-score",
        this.calculateBehaviorScore(anomalies).toString()
      );
      return response;
    } catch (error) {
      console.error("[BEHAVIOR ANALYST] Error in behavior analysis:", error);
      return NextResponse.next();
    }
  }

  private static detectAnomalies(
    request: NextRequest,
    context: MiddlewareContext,
    userId: string
  ): BehaviorAnomaly[] {
    const profile = this.userProfiles.get(userId);
    const anomalies: BehaviorAnomaly[] = [];

    if (!profile) {
      // New user - start learning
      return [];
    }

    // Check if enough learning data exists
    if (Date.now() - profile.lastAnalysis < this.LEARNING_PERIOD) {
      return []; // Still in learning phase
    }

    // Time-based anomaly
    const currentHour = new Date().getHours();
    if (!profile.commonTimeRanges.includes(currentHour)) {
      anomalies.push({
        type: "UNUSUAL_TIME",
        severity: "MEDIUM",
        confidence: 70,
        description: `Access at unusual time: ${currentHour}:00`,
      });
    }

    // Path anomaly
    const requestPath = request.nextUrl.pathname;
    if (
      !profile.typicalPaths.includes(requestPath) &&
      !this.isCommonPath(requestPath)
    ) {
      anomalies.push({
        type: "UNUSUAL_PATH",
        severity: "LOW",
        confidence: 60,
        description: `Access to unusual path: ${requestPath}`,
      });
    }

    // Geographic anomaly (if geo data available)
    const geoCountry = request.headers.get("x-geo-country");
    if (geoCountry && !profile.geographicPattern.includes(geoCountry)) {
      anomalies.push({
        type: "GEOGRAPHIC_ANOMALY",
        severity: "HIGH",
        confidence: 90,
        description: `Access from new country: ${geoCountry}`,
      });
    }

    return anomalies;
  }

  private static updateUserProfile(
    request: NextRequest,
    context: MiddlewareContext,
    userId: string
  ): void {
    const currentHour = new Date().getHours();
    const currentPath = request.nextUrl.pathname;
    const geoCountry = request.headers.get("x-geo-country") || "unknown";

    const profile = this.userProfiles.get(userId) || {
      userId,
      typicalPaths: [],
      averageRequestInterval: 0,
      commonTimeRanges: [],
      typicalPayloadSizes: [],
      geographicPattern: [],
      lastAnalysis: Date.now(),
    };

    // Update patterns
    if (!profile.typicalPaths.includes(currentPath)) {
      profile.typicalPaths.push(currentPath);
      // Keep only top 20 paths
      if (profile.typicalPaths.length > 20) {
        profile.typicalPaths = profile.typicalPaths.slice(-20);
      }
    }

    if (!profile.commonTimeRanges.includes(currentHour)) {
      profile.commonTimeRanges.push(currentHour);
    }

    if (!profile.geographicPattern.includes(geoCountry)) {
      profile.geographicPattern.push(geoCountry);
    }

    profile.lastAnalysis = Date.now();
    this.userProfiles.set(userId, profile);
  }

  private static isCommonPath(path: string): boolean {
    const commonPaths = ["/", "/login", "/admin", "/api/health"];
    return commonPaths.some((common) => path.startsWith(common));
  }

  private static calculateBehaviorScore(anomalies: BehaviorAnomaly[]): number {
    return anomalies.reduce((score, anomaly) => {
      const severityMultiplier =
        anomaly.severity === "HIGH" ? 3 : anomaly.severity === "MEDIUM" ? 2 : 1;
      return score + (anomaly.confidence * severityMultiplier) / 100;
    }, 0);
  }
}
