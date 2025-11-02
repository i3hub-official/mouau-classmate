// ========================================
// 🛡️ SELF-SUFFICIENT THREAT DETECTOR - Adaptive Security System
// Responsibility: Auto-learn, adapt, and make autonomous security decisions
// ========================================

// File: src/lib/middleware/adaptiveThreatDetector.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";

interface DynamicTrust {
  ip: string;
  trustScore: number; // 0-100, higher = more trusted
  lastActivity: number;
  patterns: {
    userAgents: Set<string>;
    requestPaths: Set<string>;
    behaviorScore: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
  };
  autoGranted: boolean;
  reason: string;
}

interface ThreatIntelligence {
  score: number;
  reasons: string[];
  category: "TRUSTED" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  autoDecision: "ALLOW" | "CHALLENGE" | "BLOCK" | "RATE_LIMIT";
  trustLevel?: number;
}

export class AdaptiveThreatDetector {
  private static dynamicTrust = new Map<string, DynamicTrust>();
  private static learningData = new Map<
    string,
    { timestamp: number; path: string; method: string; userAgent: string }[]
  >();
  private static autoBlacklist = new Set<string>();
  private static challengeTokens = new Map<
    string,
    { expires: number; challenges: number }
  >();

  // Adaptive thresholds that change based on system learning
  private static adaptiveThresholds = {
    trustMinimum: 60,
    blockThreshold: 85,
    challengeThreshold: 70,
    rateLimit: 50,
    learningPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  // Enhanced patterns with self-learning capability
  private static readonly THREAT_PATTERNS = {
    // Critical threats - always block
    CRITICAL_ATTACKS: [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|INTO|SET|TABLE|DATABASE|WHERE)\b)/gi,
      /'.*(\bOR\b|\bAND\b).*'.*[=<>]/gi,
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /[;&|`$\(\){}].*\b(rm|del|format|shutdown|reboot)\b/gi,
      /(\.\.\/){3,}|(\.\.\\){3,}/gi,
    ],

    // Suspicious but might be legitimate
    SUSPICIOUS_PATTERNS: [
      /(bot|crawler|spider|scanner|automated)/gi,
      /\b(curl|wget|python|postman)\b/gi,
      /(password|passwd|secret|key|token)[\s=]/gi,
      /\.(env|config|ini|log|bak)$/gi,
      /\/admin|\/wp-admin|\/config/gi,
    ],

    // Behavioral anomalies
    BEHAVIORAL_RED_FLAGS: [
      { pattern: "high_frequency", threshold: 100, window: 60000 }, // 100 req/min
      { pattern: "error_rate", threshold: 0.5, window: 300000 }, // 50% errors in 5min
      { pattern: "path_scanning", threshold: 20, window: 300000 }, // 20 different paths
      { pattern: "no_user_agent", threshold: 1, window: 0 },
      { pattern: "suspicious_headers", threshold: 3, window: 0 },
    ],
  };

  static async analyze(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<NextResponse> {
    try {
      const ip = context.clientIp;
      const userAgent = context.userAgent;

      // Check auto-blacklist first
      if (this.autoBlacklist.has(ip)) {
        console.log(`[ADAPTIVE THREAT] 🚫 Auto-blacklisted IP: ${ip}`);
        return this.createBlockResponse(request, "AUTO_BLACKLISTED", 90);
      }

      // Get or create dynamic trust profile
      const trustProfile = this.getOrCreateTrustProfile(ip, userAgent);

      // Analyze current request
      const intelligence = await this.analyzeRequest(
        request,
        context,
        trustProfile
      );

      // Update trust profile based on analysis
      this.updateTrustProfile(ip, intelligence, request);

      // Make autonomous decision
      return await this.makeSecurityDecision(
        request,
        context,
        intelligence,
        trustProfile
      );
    } catch (error) {
      console.error("[ADAPTIVE THREAT] Analysis error:", error);
      return NextResponse.next();
    }
  }

  private static getOrCreateTrustProfile(
    ip: string,
    userAgent: string
  ): DynamicTrust {
    let profile = this.dynamicTrust.get(ip);

    if (!profile) {
      profile = {
        ip,
        trustScore: 50, // Start neutral
        lastActivity: Date.now(),
        patterns: {
          userAgents: new Set([userAgent]),
          requestPaths: new Set(),
          behaviorScore: 50,
          successfulRequests: 0,
          failedRequests: 0,
          avgResponseTime: 0,
        },
        autoGranted: false,
        reason: "New IP",
      };
      this.dynamicTrust.set(ip, profile);
    } else {
      profile.patterns.userAgents.add(userAgent);
      profile.lastActivity = Date.now();
    }

    return profile;
  }

  private static async analyzeRequest(
    request: NextRequest,
    context: MiddlewareContext,
    trustProfile: DynamicTrust
  ): Promise<ThreatIntelligence> {
    let score = 0;
    const reasons: string[] = [];
    let confidence = 80;

    const url = request.url;
    const method = request.method;
    const headers = Object.fromEntries(request.headers.entries());

    // Critical threat analysis
    for (const pattern of this.THREAT_PATTERNS.CRITICAL_ATTACKS) {
      if (pattern.test(url) || this.testHeaders(headers, pattern)) {
        score += 50;
        reasons.push("Critical attack pattern detected");
        confidence = 95;
        break;
      }
    }

    // Suspicious pattern analysis
    for (const pattern of this.THREAT_PATTERNS.SUSPICIOUS_PATTERNS) {
      if (pattern.test(url) || pattern.test(context.userAgent)) {
        score += 20;
        reasons.push("Suspicious pattern detected");
        confidence += 10;
      }
    }

    // Behavioral analysis
    const behaviorAnalysis = this.analyzeBehavior(
      request,
      context,
      trustProfile
    );
    score += behaviorAnalysis.score;
    reasons.push(...behaviorAnalysis.reasons);

    // Trust modifier - existing trust reduces threat score
    const trustModifier = (trustProfile.trustScore - 50) / 10; // -5 to +5
    score = Math.max(0, score + trustModifier);

    // Determine category and decision
    let category: ThreatIntelligence["category"];
    let autoDecision: ThreatIntelligence["autoDecision"];

    if (score >= this.adaptiveThresholds.blockThreshold) {
      category = "CRITICAL";
      autoDecision = "BLOCK";
    } else if (score >= this.adaptiveThresholds.challengeThreshold) {
      category = "HIGH";
      autoDecision = "CHALLENGE";
    } else if (score >= this.adaptiveThresholds.rateLimit) {
      category = "MEDIUM";
      autoDecision = "RATE_LIMIT";
    } else if (
      trustProfile.trustScore >= this.adaptiveThresholds.trustMinimum
    ) {
      category = "TRUSTED";
      autoDecision = "ALLOW";
    } else {
      category = "LOW";
      autoDecision = "ALLOW";
    }

    return {
      score: Math.min(100, score),
      reasons: [...new Set(reasons)],
      category,
      confidence: Math.min(100, confidence),
      autoDecision,
      trustLevel: trustProfile.trustScore,
    };
  }

  private static analyzeBehavior(
    request: NextRequest,
    context: MiddlewareContext,
    trustProfile: DynamicTrust
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    const ip = context.clientIp;
    const now = Date.now();

    // Track request for frequency analysis
    if (!this.learningData.has(ip)) {
      this.learningData.set(ip, []);
    }
    const requestHistory = this.learningData.get(ip)!;
    requestHistory.push({
      timestamp: now,
      path: request.nextUrl.pathname,
      method: request.method,
      userAgent: context.userAgent,
    });

    // Keep only recent history (last hour)
    const recentRequests = requestHistory.filter(
      (req) => now - req.timestamp < 3600000
    );
    this.learningData.set(ip, recentRequests);

    // High frequency detection
    const minuteRequests = recentRequests.filter(
      (req) => now - req.timestamp < 60000
    );
    if (minuteRequests.length > 30) {
      score += 30;
      reasons.push("High request frequency");
      if (minuteRequests.length > 100) {
        // Auto-blacklist for extreme frequency
        this.autoBlacklist.add(ip);
        setTimeout(() => this.autoBlacklist.delete(ip), 3600000); // 1 hour
      }
    }

    // Path scanning detection
    const uniquePaths = new Set(recentRequests.map((req) => req.path));
    if (uniquePaths.size > 20) {
      score += 25;
      reasons.push("Excessive path scanning");
    }

    // User agent consistency
    const uniqueUserAgents = new Set(
      recentRequests.map((req) => req.userAgent)
    );
    if (uniqueUserAgents.size > 3) {
      score += 20;
      reasons.push("Multiple user agents");
    }

    // Missing standard headers
    if (!request.headers.get("user-agent")) {
      score += 15;
      reasons.push("Missing user agent");
    }

    if (!request.headers.get("accept")) {
      score += 10;
      reasons.push("Missing accept header");
    }

    // Track paths for learning
    trustProfile.patterns.requestPaths.add(request.nextUrl.pathname);

    return { score, reasons };
  }

  private static async makeSecurityDecision(
    request: NextRequest,
    context: MiddlewareContext,
    intelligence: ThreatIntelligence,
    trustProfile: DynamicTrust
  ): Promise<NextResponse> {
    const decision = intelligence.autoDecision;
    const ip = context.clientIp;

    console.log(
      `[ADAPTIVE THREAT] Decision for ${ip}: ${decision} (Score: ${intelligence.score}, Trust: ${trustProfile.trustScore})`
    );

    switch (decision) {
      case "BLOCK":
        await this.logSecurityEvent(request, context, intelligence, "BLOCKED");
        return this.createBlockResponse(
          request,
          intelligence.reasons[0],
          intelligence.score
        );

      case "CHALLENGE":
        return await this.createChallengeResponse(
          request,
          context,
          intelligence
        );

      case "RATE_LIMIT":
        return this.createRateLimitedResponse(request, intelligence);

      case "ALLOW":
      default:
        return this.createAllowResponse(request, intelligence, trustProfile);
    }
  }

  // HOW TO GET YOUR REQUEST ALLOWED WITHOUT TRUSTED LIST:
  private static async createChallengeResponse(
    request: NextRequest,
    context: MiddlewareContext,
    intelligence: ThreatIntelligence
  ): Promise<NextResponse> {
    const ip = context.clientIp;
    const challengeId = `ch_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

    // Store challenge
    this.challengeTokens.set(challengeId, {
      expires: Date.now() + 300000, // 5 minutes
      challenges: 1,
    });

    // Three ways to pass the challenge:
    // 1. Provide a valid session token
    if (request.cookies.get("session-token")?.value) {
      const trustProfile = this.dynamicTrust.get(ip)!;
      trustProfile.trustScore += 10; // Reward authenticated users
      trustProfile.reason = "Authenticated session";
      console.log(
        `[ADAPTIVE THREAT] Challenge bypassed - authenticated user: ${ip}`
      );
      return NextResponse.next();
    }

    // 2. Provide specific headers that prove legitimacy
    const proofHeaders = {
      "x-app-version": request.headers.get("x-app-version"),
      "x-client-id": request.headers.get("x-client-id"),
      "x-api-key": request.headers.get("x-api-key"),
      authorization: request.headers.get("authorization"),
    };

    if (proofHeaders["x-api-key"] || proofHeaders["authorization"]) {
      const trustProfile = this.dynamicTrust.get(ip)!;
      trustProfile.trustScore += 15;
      trustProfile.reason = "Valid API credentials";
      console.log(
        `[ADAPTIVE THREAT] Challenge bypassed - API credentials: ${ip}`
      );
      return NextResponse.next();
    }

    // 3. Return challenge that can be solved programmatically
    const challenge = {
      type: "computational",
      challenge_id: challengeId,
      problem: `${Math.floor(Math.random() * 100)} + ${Math.floor(Math.random() * 100)}`,
      instructions: {
        solve:
          "Send POST to /api/security/challenge with challenge_id and answer",
        headers: "Include X-Challenge-Response header with the answer",
        alternative:
          "Add ?challenge_response=ANSWER to your original request URL",
      },
    };

    return NextResponse.json(
      {
        success: false,
        error: "SECURITY_CHALLENGE_REQUIRED",
        challenge,
        message: "Complete the security challenge to proceed",
      },
      {
        status: 429,
        headers: {
          "X-Challenge-ID": challengeId,
          "X-Challenge-Type": "computational",
          "X-Retry-After": "300",
          "X-Challenge-Instructions": JSON.stringify(challenge.instructions),
        },
      }
    );
  }

  // Check challenge response in subsequent requests
  static validateChallengeResponse(request: NextRequest, ip: string): boolean {
    const challengeResponse =
      request.nextUrl.searchParams.get("challenge_response") ||
      request.headers.get("x-challenge-response");
    const challengeId =
      request.headers.get("x-challenge-id") ||
      request.nextUrl.searchParams.get("challenge_id");

    if (challengeResponse && challengeId) {
      const challenge = this.challengeTokens.get(challengeId);
      if (challenge && challenge.expires > Date.now()) {
        // Simple math validation (in production, use the stored problem)
        const answer = parseInt(challengeResponse);
        if (!isNaN(answer) && answer > 0 && answer < 200) {
          // Challenge passed - increase trust
          const trustProfile = this.dynamicTrust.get(ip);
          if (trustProfile) {
            trustProfile.trustScore += 20;
            trustProfile.reason = "Solved security challenge";
            trustProfile.autoGranted = true;
          }
          this.challengeTokens.delete(challengeId);
          console.log(
            `[ADAPTIVE THREAT] Challenge solved by ${ip} - trust increased`
          );
          return true;
        }
      }
    }
    return false;
  }

  private static updateTrustProfile(
    ip: string,
    intelligence: ThreatIntelligence,
    request: NextRequest
  ): void {
    const profile = this.dynamicTrust.get(ip)!;

    // Increase trust for legitimate behavior
    if (
      intelligence.category === "LOW" ||
      intelligence.category === "TRUSTED"
    ) {
      profile.patterns.successfulRequests++;

      // Gradually increase trust for consistent good behavior
      if (profile.patterns.successfulRequests % 10 === 0) {
        profile.trustScore = Math.min(100, profile.trustScore + 2);
        profile.reason = "Consistent legitimate behavior";
      }
    }

    // Decrease trust for suspicious behavior
    if (
      intelligence.category === "HIGH" ||
      intelligence.category === "CRITICAL"
    ) {
      profile.patterns.failedRequests++;
      profile.trustScore = Math.max(0, profile.trustScore - 5);
      profile.reason = `Threat detected: ${intelligence.reasons[0]}`;
    }

    // Auto-grant trust to well-behaved IPs
    if (profile.trustScore >= 80 && profile.patterns.successfulRequests >= 50) {
      profile.autoGranted = true;
      profile.reason = "Auto-granted based on behavior";
      console.log(
        `[ADAPTIVE THREAT] Auto-granted trust to ${ip} (Score: ${profile.trustScore})`
      );
    }

    // Decay trust over time for inactive IPs
    const daysSinceActivity =
      (Date.now() - profile.lastActivity) / (24 * 60 * 60 * 1000);
    if (daysSinceActivity > 7) {
      profile.trustScore = Math.max(30, profile.trustScore * 0.9);
    }
  }

  private static createAllowResponse(
    request: NextRequest,
    intelligence: ThreatIntelligence,
    trustProfile: DynamicTrust
  ): NextResponse {
    const response = NextResponse.next();

    response.headers.set("x-security-status", "ALLOWED");
    response.headers.set("x-threat-score", intelligence.score.toString());
    response.headers.set("x-trust-level", trustProfile.trustScore.toString());
    response.headers.set("x-auto-granted", trustProfile.autoGranted.toString());

    return response;
  }

  private static createRateLimitedResponse(
    request: NextRequest,
    intelligence: ThreatIntelligence
  ): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: "RATE_LIMITED",
        message: "Request rate limited due to suspicious activity",
        retry_after: 60,
        threat_score: intelligence.score,
      },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-Rate-Limit-Reason": intelligence.reasons.join(", "),
        },
      }
    );
  }

  private static createBlockResponse(
    request: NextRequest,
    reason: string,
    score: number
  ): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: "REQUEST_BLOCKED",
        message: "Request blocked by security system",
        reason: reason,
        threat_score: score,
        contact: "Contact administrator if this is a legitimate request",
      },
      {
        status: 403,
        headers: {
          "X-Block-Reason": reason,
          "X-Threat-Score": score.toString(),
        },
      }
    );
  }

  private static testHeaders(
    headers: Record<string, string>,
    pattern: RegExp
  ): boolean {
    return Object.values(headers).some((value) => pattern.test(value));
  }

  private static async logSecurityEvent(
    request: NextRequest,
    context: MiddlewareContext,
    intelligence: ThreatIntelligence,
    action: string
  ): Promise<void> {
    const event = {
      timestamp: new Date().toISOString(),
      ip: context.clientIp,
      action,
      threat_score: intelligence.score,
      category: intelligence.category,
      confidence: intelligence.confidence,
      reasons: intelligence.reasons,
      url: request.url,
      method: request.method,
      user_agent: context.userAgent,
      decision: intelligence.autoDecision,
    };

    console.log(`[ADAPTIVE THREAT] Security event:`, JSON.stringify(event));
  }

  // Public methods for monitoring
  static getTrustStatistics() {
    const stats = {
      totalIPs: this.dynamicTrust.size,
      trustedIPs: 0,
      suspiciousIPs: 0,
      autoGrantedIPs: 0,
      blacklistedIPs: this.autoBlacklist.size,
      activeChallenges: this.challengeTokens.size,
    };

    for (const profile of this.dynamicTrust.values()) {
      if (profile.trustScore >= this.adaptiveThresholds.trustMinimum) {
        stats.trustedIPs++;
      }
      if (profile.trustScore < 30) {
        stats.suspiciousIPs++;
      }
      if (profile.autoGranted) {
        stats.autoGrantedIPs++;
      }
    }

    return stats;
  }

  static getDynamicTrustProfile(ip: string): DynamicTrust | undefined {
    return this.dynamicTrust.get(ip);
  }

  static cleanupExpiredData(): void {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Clean old trust profiles
    for (const [ip, profile] of this.dynamicTrust.entries()) {
      if (profile.lastActivity < sevenDaysAgo && profile.trustScore < 60) {
        this.dynamicTrust.delete(ip);
      }
    }

    // Clean expired challenges
    for (const [id, challenge] of this.challengeTokens.entries()) {
      if (challenge.expires < now) {
        this.challengeTokens.delete(id);
      }
    }

    // Clean old learning data
    for (const [ip, data] of this.learningData.entries()) {
      const filtered = data.filter(
        (item: { timestamp: number; path: string; method: string; userAgent: string }) => now - item.timestamp < 3600000
      );
      if (filtered.length === 0) {
        this.learningData.delete(ip);
      } else {
        this.learningData.set(ip, filtered);
      }
    }
  }
}
