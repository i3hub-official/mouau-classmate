// src/lib/middleware/UnifiedThreatDefenseSystem.ts
import { NextRequest, NextResponse } from "next/server";
import { ThreatDetector } from "./threatDetector";
import type { MiddlewareContext } from "./types";
import { TrustedSourceManager } from "./trustedSourceManager";

interface ThreatVector {
  name: string;
  score: number;
  confidence: number;
  source: "ML" | "RULES" | "BEHAVIOR" | "REPUTATION" | "HISTORY" | "TRUST";
}

interface DefenseDecision {
  action: "ALLOW" | "CHALLENGE" | "RATE_LIMIT" | "BLOCK" | "NEUTRALIZE";
  reason: string;
  score: number;
  confidence: number;
  vectors: ThreatVector[];
  bypassAvailable: boolean;
  challengeType?: "pow" | "captcha";
  incidentId: string;
}

interface ClientReputation {
  ip: string;
  trust: number;
  threat: number;
  sessions: number;
  lastSeen: number;
  firstSeen: number;
  behaviorProfile: any;
  labels: Set<string>;
  autoTrust: boolean;
}

export class UnifiedThreatDefenseSystem {
  private static instance: UnifiedThreatDefenseSystem;
  private reputationDB = new Map<string, ClientReputation>();
  private challengeRegistry = new Map<string, { expires: number; solved: boolean }>();
  private globalThreatHeat = 0;

  private adaptiveThresholds = {
    block: 88,
    challenge: 72,
    monitor: 52,
    autoBlock: 96,
  };

  static getInstance(): UnifiedThreatDefenseSystem {
    if (!this.instance) this.instance = new UnifiedThreatDefenseSystem();
    return this.instance;
  }

  private constructor() {
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
    setInterval(() => this.adaptThresholds(), 60 * 60 * 1000);
  }

  async defend(request: NextRequest, context: MiddlewareContext): Promise<NextResponse> {
    const ip = context.clientIp;
    const start = performance.now();

    try {
      const clientReputation = this.getOrInitReputation(ip, context.userAgent);

      // PHASE 1: Trust Must Be Earned — Check TrustedSourceManager
      const trustCheck = TrustedSourceManager.isTrusted(request, { clientIp: ip, userAgent: context.userAgent });
      if (trustCheck.isTrusted) {
        console.log(`[DEFENSE] Trust granted: ${trustCheck.reason}`);
        if (trustCheck.trustLevel === "ABSOLUTE") {
          return this.fastAllow(request, clientReputation, "ABSOLUTE_TRUST");
        }
        if (trustCheck.trustLevel === "HIGH") {
          clientReputation.trust = Math.min(100, clientReputation.trust + 30);
        }
      }

      // PHASE 2: Fast path for earned auto-trust
      if (clientReputation.autoTrust && clientReputation.threat < 15) {
        return this.fastAllow(request, clientReputation, "EARNED_AUTOTRUST");
      }

      // PHASE 3: ML Detection
      const mlResponse = await ThreatDetector.detect(request, context);
      const mlScore = parseInt(mlResponse.headers.get("x-threat-score") || "0", 10);

      // PHASE 4: Behavioral + Reputation
      const behavior = this.analyzeLiveBehavior(request, context, clientReputation);
      const reputationScore = 100 - clientReputation.trust + clientReputation.threat;
      const historicalScore = this.calculateHistoricalRisk(ip);

      // PHASE 5: Final Fusion
      const vectors: ThreatVector[] = [
        { name: "ML Model", score: mlScore, confidence: 92, source: "ML" },
        { name: "Behavior", score: behavior.score, confidence: 88, source: "BEHAVIOR" },
        { name: "Reputation", score: reputationScore, confidence: 95, source: "REPUTATION" },
        { name: "History", score: historicalScore, confidence: 80, source: "HISTORY" },
      ];

      const finalScore = this.fuseThreatScore(vectors, this.globalThreatHeat);
      const decision = this.makeAutonomousDecision(finalScore, clientReputation, vectors);

      // PHASE 6: Execute
      const response = await this.executeDecision(request, context, decision, clientReputation);

      // PHASE 7: Learn
      this.updateReputation(ip, decision, finalScore, performance.now() - start);

      // Final headers
      response.headers.set("x-defense", "v9.5-ACTIVE");
      response.headers.set("x-threat-final", finalScore.toFixed(1));
      response.headers.set("x-action", decision.action);
      response.headers.set("x-incident-id", decision.incidentId);
      response.headers.set("x-trust", clientReputation.trust.toFixed(1));

      return response;
    } catch (err) {
      console.error("[DEFENSE v9.5] Critical error:", err);
      return NextResponse.next();
    }
  }

  private fuseThreatScore(vectors: ThreatVector[], heat: number): number {
    let weighted = 0;
    let totalWeight = 0;

    vectors.forEach(v => {
      const w = (v.confidence / 100) * (v.source === "ML" ? 1.5 : v.source === "REPUTATION" ? 1.3 : 1.0);
      weighted += v.score * w;
      totalWeight += w;
    });

    return Math.min(100, (weighted / totalWeight) + heat * 0.35);
  }

  private makeAutonomousDecision(score: number, rep: ClientReputation, vectors: ThreatVector[]): DefenseDecision {
    const id = `DEF-${Date.now().toString(36).toUpperCase()}`;

    const blockThresh = rep.threat > 70 ? this.adaptiveThresholds.block - 18 : this.adaptiveThresholds.block;
    const challengeThresh = rep.trust < 30 ? this.adaptiveThresholds.challenge - 12 : this.adaptiveThresholds.challenge;

    if (score >= this.adaptiveThresholds.autoBlock || rep.threat > 94) {
      return { action: "NEUTRALIZE", reason: "Critical threat - AI neutralization", score, confidence: 99, vectors, bypassAvailable: false, incidentId: id };
    }
    if (score >= blockThresh) {
      return { action: "BLOCK", reason: "Threat threshold exceeded", score, confidence: 95, vectors, bypassAvailable: true, challengeType: "pow", incidentId: id };
    }
    if (score >= challengeThresh) {
      return { action: "CHALLENGE", reason: "Verification required", score, confidence: 89, vectors, bypassAvailable: true, challengeType: "pow", incidentId: id };
    }
    if (score >= this.adaptiveThresholds.monitor) {
      return { action: "RATE_LIMIT", reason: "Elevated monitoring", score, confidence: 82, vectors, bypassAvailable: true, incidentId: id };
    }

    // Earn trust over time
    if (rep.sessions > 250 && rep.threat < 12 && !rep.autoTrust) {
      rep.autoTrust = true;
      console.log(`[DEFENSE] AUTO-TRUST GRANTED → ${rep.ip} (${rep.sessions} clean sessions)`);
    }

    return { action: "ALLOW", reason: "Clean", score, confidence: 96, vectors, bypassAvailable: false, incidentId: id };
  }

  private async executeDecision(req: NextRequest, ctx: MiddlewareContext, decision: DefenseDecision, rep: ClientReputation): Promise<NextResponse> {
    switch (decision.action) {
      case "NEUTRALIZE":
      case "BLOCK":
        rep.threat = Math.min(100, rep.threat + 28);
        rep.trust = Math.max(0, rep.trust - 35);
        return this.block(req, decision);

      case "CHALLENGE":
        return this.challenge(req, ctx, decision);

      case "RATE_LIMIT":
        const res = NextResponse.next();
        res.headers.set("Retry-After", "45");
        return res;

      default:
        rep.trust = Math.min(100, rep.trust + 0.7);
        rep.threat = Math.max(0, rep.threat - 1.5);
        return this.fastAllow(req, rep, "CLEAN");
    }
  }

  private block(req: NextRequest, decision: DefenseDecision): NextResponse {
    const url = new URL("/security/blocked", req.url);
    url.searchParams.set("id", decision.incidentId);
    url.searchParams.set("score", decision.score.toFixed(1));
    url.searchParams.set("reason", decision.reason);
    url.searchParams.set("action", decision.action);

    const res = NextResponse.redirect(url);
    res.headers.set("X-Defense-Action", "BLOCKED");
    res.headers.set("Cache-Control", "no-store, no-cache");
    return res;
  }

  private challenge(req: NextRequest, ctx: MiddlewareContext, decision: DefenseDecision): NextResponse {
    const url = new URL("/security/blocked", req.url);
    url.searchParams.set("id", decision.incidentId);
    url.searchParams.set("score", decision.score.toFixed(1));
    url.searchParams.set("reason", "SECURITY_CHALLENGE_REQUIRED");
    url.searchParams.set("action", "CHALLENGE");
    url.searchParams.set("type", "pow");

    const res = NextResponse.redirect(url);
    res.headers.set("X-Defense-Action", "CHALLENGE");
    return res;
  }

  private fastAllow(req: NextRequest, rep: ClientReputation, reason: string): NextResponse {
    const res = NextResponse.next();
    res.headers.set("x-defense", "TRUSTED");
    res.headers.set("x-fastpath", reason);
    res.headers.set("x-trust", rep.trust.toFixed(1));
    return res;
  }

  private getOrInitReputation(ip: string, ua: string): ClientReputation {
    let rep = this.reputationDB.get(ip);
    if (!rep) {
      rep = {
        ip,
        trust: 50,
        threat: 0,
        sessions: 0,
        lastSeen: Date.now(),
        firstSeen: Date.now(),
        behaviorProfile: {},
        labels: new Set(),
        autoTrust: false,
      };
      this.reputationDB.set(ip, rep);
    }
    rep.lastSeen = Date.now();
    rep.sessions++;
    return rep;
  }

  private analyzeLiveBehavior(req: NextRequest, ctx: MiddlewareContext, rep: ClientReputation) {
    let score = 0;
    const freq = ThreatDetector["requestFrequency"].get(ctx.clientIp)?.length || 0;
    if (freq > 100) score += 45;
    return { score };
  }

  private calculateHistoricalRisk(ip: string): number { return 0; }

  private updateReputation(ip: string, decision: DefenseDecision, score: number, latency: number) {
    const rep = this.reputationDB.get(ip);
    if (!rep) return;

    if (decision.action === "ALLOW") {
      rep.trust = Math.min(100, rep.trust + 0.8);
      rep.threat = Math.max(0, rep.threat - 2);
    } else if (decision.action === "BLOCK" || decision.action === "NEUTRALIZE") {
      rep.threat = Math.min(100, rep.threat + 30);
      rep.trust = Math.max(0, rep.trust - 25);
    }
  }

  private adaptThresholds() {
    const attackRate = this.reputationDB.size > 500
      ? Array.from(this.reputationDB.values()).filter(r => r.threat > 70).length / this.reputationDB.size
      : 0;

    if (attackRate > 0.12) {
      this.globalThreatHeat = Math.min(100, this.globalThreatHeat + 20);
      this.adaptiveThresholds.block = Math.max(70, this.adaptiveThresholds.block - 6);
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, ch] of this.challengeRegistry.entries()) {
      if (ch.expires < now) this.challengeRegistry.delete(id);
    }
  }

  // Public API
  validatePoW(req: NextRequest, ip: string): boolean {
    const nonce = req.headers.get("x-pow-nonce") || req.nextUrl.searchParams.get("pow");
    const challengeId = req.nextUrl.searchParams.get("challenge_id");
    if (!nonce || !challengeId) return false;

    const ch = this.challengeRegistry.get(challengeId);
    if (!ch || ch.solved) return false;

    const hash = require("crypto").createHash("sha256").update(challengeId + nonce).digest("hex");
    if (hash.startsWith("0000")) {
      ch.solved = true;
      const rep = this.reputationDB.get(ip);
      if (rep) rep.trust += 25;
      return true;
    }
    return false;
  }
}

export const Defense = UnifiedThreatDefenseSystem.getInstance();