// src/lib/middleware/trustedSourceManager.ts
// "Trust is earned, not given."

import { NextRequest } from "next/server";
import { Defense } from "./UnifiedThreatDefenseSystem";

interface TrustedSource {
  id: string;
  name: string;
  type: "ip" | "user_agent" | "api_key" | "domain" | "user_id" | "earned";
  value: string;
  description: string;
  createdAt: number;
  expiresAt?: number;
  isActive: boolean;
  trustLevel: "LOW" | "MEDIUM" | "HIGH" | "ABSOLUTE";
  createdBy: "system" | "behavior" | "admin";
  earnedThrough?:
    | "consistent_behavior"
    | "challenge_solved"
    | "manual_approval";
}

export class TrustedSourceManager {
  private static trustedSources = new Map<string, TrustedSource>();

  // These are ALLOWED to exist — but they do NOT grant automatic trust
  // They are just "known good patterns" — trust still must be earned
  private static readonly KNOWN_GOOD_PATTERNS = [
    { value: "Chrome", type: "user_agent" as const, name: "Chrome Browser" },
    { value: "Firefox", type: "user_agent" as const, name: "Firefox Browser" },
    { value: "Safari", type: "user_agent" as const, name: "Safari Browser" },
    { value: "Edg/", type: "user_agent" as const, name: "Edge Browser" },
  ];

  static initialize(): void {
    // Clear any old entries
    this.trustedSources.clear();

    // Only log — no auto-trust
    console.log(
      `[TRUSTED SOURCE] Trust must be EARNED. No automatic whitelists active.`
    );
    console.log(
      `[TRUSTED SOURCE] Known good patterns loaded: ${this.KNOWN_GOOD_PATTERNS.map(
        (p) => p.value
      ).join(", ")}`
    );
  }

  // MAIN CHECK: Is this source trusted?
  static isTrusted(
    request: NextRequest,
    context: { clientIp: string; userAgent: string }
  ): {
    isTrusted: boolean;
    trustLevel?: TrustedSource["trustLevel"];
    source?: TrustedSource;
    reason?: string;
  } {
    const ip = context.clientIp;
    const reputation = Defense["reputationDB"].get(ip);

    // 1. EARNED TRUST — via behavior (the only real way)
    if (reputation?.autoTrust) {
      const earnedSource: TrustedSource = {
        id: `earned_${ip}`,
        name: `Earned Trust - ${ip}`,
        type: "earned",
        value: ip,
        description: "Trust earned through consistent legitimate behavior",
        createdAt: Date.now(),
        isActive: true,
        trustLevel: reputation.threat < 10 ? "ABSOLUTE" : "HIGH",
        createdBy: "behavior",
        earnedThrough:
          reputation.sessions > 200
            ? "consistent_behavior"
            : "challenge_solved",
      };

      return {
        isTrusted: true,
        trustLevel: earnedSource.trustLevel,
        source: earnedSource,
        reason: `Earned trust: ${earnedSource.earnedThrough} (${reputation.sessions} sessions, threat: ${reputation.threat})`,
      };
    }

    // 2. Manual override (you can still add trusted IPs manually if needed)
    for (const source of this.trustedSources.values()) {
      if (!source.isActive) continue;
      if (source.expiresAt && source.expiresAt < Date.now()) continue;

      if (this.matchesSource(source, request, context)) {
        return {
          isTrusted: true,
          trustLevel: source.trustLevel,
          source,
          reason: `Manual trusted source: ${source.name}`,
        };
      }
    }

    return { isTrusted: false };
  }

  // Check if request matches a trusted source (for manual entries only)
  private static matchesSource(
    source: TrustedSource,
    request: NextRequest,
    context: { clientIp: string; userAgent: string }
  ): boolean {
    switch (source.type) {
      case "ip":
        return context.clientIp === source.value;
      case "user_agent":
        return context.userAgent.includes(source.value);
      case "api_key":
        return request.headers.get("x-api-key") === source.value;
      case "domain":
        const origin = request.headers.get("origin") || "";
        const referer = request.headers.get("referer") || "";
        return origin.includes(source.value) || referer.includes(source.value);
      case "user_id":
        return request.cookies.get("userId-token")?.value === source.value;
      case "earned":
        return context.clientIp === source.value;
      default:
        return false;
    }
  }

  // Admin-only: Manually grant trust (for emergency or known good actors)
  static grantTrust(
    value: string,
    type: TrustedSource["type"],
    options: {
      name: string;
      description?: string;
      trustLevel?: TrustedSource["trustLevel"];
      expiresInDays?: number;
    }
  ): string {
    const id = `manual_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 6)}`;
    const source: TrustedSource = {
      id,
      name: options.name,
      type,
      value,
      description: options.description || "Manually granted trust",
      createdAt: Date.now(),
      expiresAt: options.expiresInDays
        ? Date.now() + options.expiresInDays * 86400000
        : undefined,
      isActive: true,
      trustLevel: options.trustLevel || "HIGH",
      createdBy: "admin",
    };

    this.trustedSources.set(id, source);
    console.log(
      `[TRUSTED SOURCE] Granted manual trust: ${source.name} (${source.value}) → ${source.trustLevel}`
    );
    return id;
  }

  static revokeTrust(id: string): boolean {
    const source = this.trustedSources.get(id);
    if (source) {
      this.trustedSources.delete(id);
      console.log(`[TRUSTED SOURCE] Revoked trust: ${source.name}`);
      return true;
    }
    return false;
  }

  static getTrustedSources(): TrustedSource[] {
    return Array.from(this.trustedSources.values());
  }

  static getStats() {
    const earned =
      Defense["reputationDB"].size > 0
        ? Array.from(Defense["reputationDB"].values()).filter(
            (r) => r.autoTrust
          ).length
        : 0;

    return {
      earnedTrustCount: earned,
      manualTrustCount: this.trustedSources.size,
      totalTrusted: earned + this.trustedSources.size,
      philosophy: "TRUST MUST BE EARNED",
    };
  }
}
