// ========================================
// 🔍 UNIFIED THREAT DETECTION SYSTEM
// ========================================

import { NextRequest, NextResponse } from "next/server";
import { ThreatDetector } from "./threatDetector";
import { AdaptiveThreatDetector } from "./adaptiveThreatDetector";
import { type MiddlewareContext } from "./types";

export interface ThreatDetectionResult {
  threatScore: number;
  decision: string;
  details: Record<string, unknown>;
  response: NextResponse;
}

export class UnifiedThreatSystem {
  private static instance: UnifiedThreatSystem;
  private threatHistory: Map<string, number[]> = new Map();

  static getInstance(): UnifiedThreatSystem {
    if (!UnifiedThreatSystem.instance) {
      UnifiedThreatSystem.instance = new UnifiedThreatSystem();
    }
    return UnifiedThreatSystem.instance;
  }

  async analyzeRequest(
    request: NextRequest,
    context: MiddlewareContext,
    authAdjustments: number = 0
  ): Promise<ThreatDetectionResult> {
    const clientIp =
      request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "unknown";

    // Run all threat detection systems
    const [basicResult, adaptiveResult] = await Promise.all([
      ThreatDetector.detect(request, context),
      AdaptiveThreatDetector.analyze(request, context),
    ]);

    // Extract threat scores
    const basicScore = parseInt(
      basicResult.headers.get("x-threat-score") || "0"
    );
    const adaptiveScore = parseInt(
      adaptiveResult.headers.get("x-threat-score") || "0"
    );

    // Calculate unified score with weighting
    const unifiedScore = Math.round(basicScore * 0.6 + adaptiveScore * 0.4);

    // Apply authentication adjustments
    const adjustedScore = Math.max(0, unifiedScore - authAdjustments);

    // Update threat history
    this.updateThreatHistory(clientIp, adjustedScore);

    // Get historical analysis
    const historicalAnalysis = this.analyzeThreatHistory(clientIp);

    // Make final decision
    const decision = this.makeDecision(adjustedScore, historicalAnalysis);

    // Create response with headers
    const response = new NextResponse(null, { status: 200 });
    response.headers.set("x-threat-score", adjustedScore.toString());
    response.headers.set("x-unified-decision", decision);
    response.headers.set("x-historical-risk", historicalAnalysis.riskLevel);

    return {
      threatScore: adjustedScore,
      decision,
      details: {
        basicScore,
        adaptiveScore,
        unifiedScore,
        authAdjustments,
        historicalAnalysis,
      },
      response,
    };
  }

  private updateThreatHistory(clientIp: string, score: number): void {
    if (!this.threatHistory.has(clientIp)) {
      this.threatHistory.set(clientIp, []);
    }

    const history = this.threatHistory.get(clientIp)!;
    history.push(score);

    // Keep only last 20 scores
    if (history.length > 20) {
      history.shift();
    }

    this.threatHistory.set(clientIp, history);
  }

  private analyzeThreatHistory(clientIp: string): {
    riskLevel: string;
    averageScore: number;
    trend: "increasing" | "decreasing" | "stable";
  } {
    const history = this.threatHistory.get(clientIp) || [];

    if (history.length === 0) {
      return { riskLevel: "unknown", averageScore: 0, trend: "stable" };
    }

    const averageScore =
      history.reduce((sum, score) => sum + score, 0) / history.length;

    // Determine trend
    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (history.length >= 3) {
      const recent =
        history.slice(-3).reduce((sum, score) => sum + score, 0) / 3;
      const earlier =
        history.slice(0, 3).reduce((sum, score) => sum + score, 0) / 3;

      if (recent > earlier * 1.2) trend = "increasing";
      else if (recent < earlier * 0.8) trend = "decreasing";
    }

    // Determine risk level
    let riskLevel = "low";
    if (averageScore > 70 || trend === "increasing") riskLevel = "high";
    else if (averageScore > 40) riskLevel = "medium";

    return { riskLevel, averageScore, trend };
  }

  private makeDecision(
    score: number,
    historicalAnalysis: { riskLevel: string; averageScore: number; trend: "increasing" | "decreasing" | "stable" }
  ): string {
    // Adjust threshold based on historical risk
    let threshold = 80;
    if (historicalAnalysis.riskLevel === "high") threshold = 60;
    else if (historicalAnalysis.riskLevel === "medium") threshold = 70;

    if (score > threshold) return "BLOCK";
    if (score > threshold * 0.8) return "CHALLENGE";
    if (score > threshold * 0.6) return "MONITOR";
    return "ALLOW";
  }

  getThreatHistory(clientIp: string): number[] {
    return this.threatHistory.get(clientIp) || [];
  }

  clearThreatHistory(clientIp?: string): void {
    if (clientIp) {
      this.threatHistory.delete(clientIp);
    } else {
      this.threatHistory.clear();
    }
  }
}
