// ========================================
// 🛡️ TRUSTED SOURCE SYSTEM - Whitelist Management
// ========================================

// File: src/lib/middleware/trustedSourceManager.ts
import { NextRequest } from "next/server";

interface TrustedSource {
  id: string;
  name: string;
  type: "ip" | "ip_range" | "user_agent" | "api_key" | "domain" | "user_id";
  value: string;
  description: string;
  createdAt: number;
  expiresAt?: number;
  isActive: boolean;
  trustLevel: "LOW" | "MEDIUM" | "HIGH" | "ABSOLUTE";
  createdBy: string;
}

export class TrustedSourceManager {
  private static trustedSources = new Map<string, TrustedSource>();

  // Common sources for all environments
  private static readonly COMMON_TRUSTED_SOURCES: Omit<
    TrustedSource,
    "id" | "createdAt" | "createdBy"
  >[] = [
    {
      name: "Postman",
      type: "user_agent",
      value: "Postman",
      description: "API testing tool",
      isActive: true,
      trustLevel: "LOW",
    },
    {
      name: "Insomnia",
      type: "user_agent",
      value: "Insomnia",
      description: "API testing tool",
      isActive: true,
      trustLevel: "LOW",
    },
    {
      name: "Chrome DevTools",
      type: "user_agent",
      value: "Chrome",
      description: "Browser development tools",
      isActive: true,
      trustLevel: "LOW",
    },
  ];

  // Development-specific sources
  private static readonly DEVELOPMENT_TRUSTED_SOURCES: Omit<
    TrustedSource,
    "id" | "createdAt" | "createdBy"
  >[] = [
    {
      name: "Host Network",
      type: "domain",
      value: "https://mouauclassmate.vercel.app",
      description: "Host Domain Name",
      isActive: true,
      trustLevel: "ABSOLUTE",
    },
    {
      name: "Development IPs",
      type: "ip",
      value: "127.0.0.1",
      description: "Localhost development",
      isActive: true,
      trustLevel: "HIGH",
    },
    {
      name: "Local Network",
      type: "ip_range",
      value: "192.168.0.0/16",
      description: "Local network range",
      isActive: true,
      trustLevel: "MEDIUM",
    },
    {
      name: "Admin Development",
      type: "ip",
      value: "192.168.0.127", // Your IP that got blocked
      description: "Admin development machine",
      isActive: true,
      trustLevel: "ABSOLUTE",
    },
    {
      name: "Admin Secondary",
      type: "ip",
      value: "192.168.0.159", // Your server IP
      description: "Admin server machine",
      isActive: true,
      trustLevel: "ABSOLUTE",
    },
  ];

  // Production-specific sources
  private static readonly PRODUCTION_TRUSTED_SOURCES: Omit<
    TrustedSource,
    "id" | "createdAt" | "createdBy"
  >[] = [
    {
      name: "Production Monitoring",
      type: "ip",
      value: "YOUR_MONITORING_SERVICE_IP",
      description: "Production monitoring service",
      isActive: true,
      trustLevel: "HIGH",
    },
    {
      name: "CDN Service",
      type: "ip_range",
      value: "YOUR_CDN_IP_RANGE",
      description: "Content delivery network",
      isActive: true,
      trustLevel: "MEDIUM",
    },
  ];

  // Get default trusted sources based on environment
  private static get DEFAULT_TRUSTED_SOURCES(): Omit<
    TrustedSource,
    "id" | "createdAt" | "createdBy"
  >[] {
    const sources = [...this.COMMON_TRUSTED_SOURCES];

    if (process.env.NODE_ENV === "development") {
      sources.push(...this.DEVELOPMENT_TRUSTED_SOURCES);
    } else if (process.env.NODE_ENV === "production") {
      sources.push(...this.PRODUCTION_TRUSTED_SOURCES);
    }

    return sources;
  }

  static initialize(): void {
    // Initialize with default trusted sources
    this.DEFAULT_TRUSTED_SOURCES.forEach((source) => {
      this.addTrustedSource({
        ...source,
        createdBy: "system",
      });
    });

    console.log(
      `[TRUSTED SOURCE] 🛡️ Initialized with ${this.trustedSources.size} trusted sources`
    );
    console.log(
      `[TRUSTED SOURCE] 🌍 Environment: ${process.env.NODE_ENV || "unknown"}`
    );
  }

  static isTrusted(
    request: NextRequest,
    context: { clientIp: string; userAgent: string }
  ): {
    isTrusted: boolean;
    trustLevel?: "LOW" | "MEDIUM" | "HIGH" | "ABSOLUTE";
    source?: TrustedSource;
    reason?: string;
  } {
    const now = Date.now();

    // Check each trusted source
    for (const [id, source] of this.trustedSources.entries()) {
      if (!source.isActive) continue;
      if (source.expiresAt && source.expiresAt < now) continue;

      let matches = false;
      let reason = "";

      switch (source.type) {
        case "ip":
          matches = context.clientIp === source.value;
          reason = `IP ${context.clientIp} matches trusted IP`;
          break;

        case "ip_range":
          matches = this.isIPInRange(context.clientIp, source.value);
          reason = `IP ${context.clientIp} in trusted range ${source.value}`;
          break;

        case "user_agent":
          matches = context.userAgent.includes(source.value);
          reason = `User agent contains "${source.value}"`;
          break;

        case "api_key":
          const apiKey = request.headers.get("x-api-key");
          matches = apiKey === source.value;
          reason = "Valid API key provided";
          break;

        case "domain":
          const origin = request.headers.get("origin");
          const referer = request.headers.get("referer");
          matches =
            !!(origin && origin.includes(source.value)) ||
            !!(referer && referer.includes(source.value));
          reason = `Request from trusted domain ${source.value}`;
          break;

        case "user_id":
          const userId =
            request.headers.get("x-user-id") ||
            request.cookies.get("userId-token")?.value;
          matches = userId === source.value;
          reason = `Trusted user ID ${source.value}`;
          break;
      }

      if (matches) {
        console.log(
          `[TRUSTED SOURCE] ✅ Trust granted: ${reason} (Level: ${source.trustLevel})`
        );
        return {
          isTrusted: true,
          trustLevel: source.trustLevel,
          source,
          reason,
        };
      }
    }

    return { isTrusted: false };
  }

  static addTrustedSource(
    sourceData: Omit<TrustedSource, "id" | "createdAt">
  ): string {
    const id = `trust_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}`;
    const source: TrustedSource = {
      id,
      createdAt: Date.now(),
      ...sourceData,
    };

    this.trustedSources.set(id, source);
    console.log(
      `[TRUSTED SOURCE] ➕ Added: ${source.name} (${source.type}: ${source.value})`
    );
    return id;
  }

  static removeTrustedSource(id: string): boolean {
    const removed = this.trustedSources.delete(id);
    if (removed) {
      console.log(`[TRUSTED SOURCE] ➖ Removed trusted source: ${id}`);
    }
    return removed;
  }

  static updateTrustedSource(
    id: string,
    updates: Partial<TrustedSource>
  ): boolean {
    const source = this.trustedSources.get(id);
    if (source) {
      this.trustedSources.set(id, { ...source, ...updates });
      console.log(`[TRUSTED SOURCE] 🔄 Updated trusted source: ${id}`);
      return true;
    }
    return false;
  }

  static getTrustedSources(): TrustedSource[] {
    return Array.from(this.trustedSources.values());
  }

  static getTrustedSource(id: string): TrustedSource | undefined {
    return this.trustedSources.get(id);
  }

  private static isIPInRange(ip: string, range: string): boolean {
    // Simple CIDR check - in production use a proper IP library
    if (!range.includes("/")) return ip === range;

    const [network, prefixLength] = range.split("/");
    const prefix = parseInt(prefixLength);

    // This is a simplified version - use a proper IP library in production
    const ipParts = ip.split(".").map(Number);
    const networkParts = network.split(".").map(Number);

    const ipInt =
      (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const networkInt =
      (networkParts[0] << 24) |
      (networkParts[1] << 16) |
      (networkParts[2] << 8) |
      networkParts[3];
    const mask = (-1 << (32 - prefix)) >>> 0;

    return (ipInt & mask) === (networkInt & mask);
  }

  // Cleanup expired sources
  static cleanupExpiredSources(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, source] of this.trustedSources.entries()) {
      if (source.expiresAt && source.expiresAt < now) {
        this.trustedSources.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(
        `[TRUSTED SOURCE] 🧹 Cleaned up ${cleaned} expired trusted sources`
      );
    }

    return cleaned;
  }

  // Get environment-specific trusted sources for debugging
  static getEnvironmentInfo(): {
    environment: string;
    commonSources: number;
    envSpecificSources: number;
    totalSources: number;
  } {
    const environment = process.env.NODE_ENV || "unknown";
    const commonSources = this.COMMON_TRUSTED_SOURCES.length;

    let envSpecificSources = 0;
    if (environment === "development") {
      envSpecificSources = this.DEVELOPMENT_TRUSTED_SOURCES.length;
    } else if (environment === "production") {
      envSpecificSources = this.PRODUCTION_TRUSTED_SOURCES.length;
    }

    return {
      environment,
      commonSources,
      envSpecificSources,
      totalSources: commonSources + envSpecificSources,
    };
  }
}
