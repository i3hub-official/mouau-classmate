// lib/clientIp.ts
// ========================================
// 🌐 CLIENT IP DETECTOR - Real IP Detection Utility
// Responsibility: Extract real client IP from various headers and sources
// ========================================

import { NextRequest } from "next/server";
import { IncomingMessage } from "http";

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
export interface IPInfo {
  ip: string;
  source: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  isProxy: boolean;
  isVPN: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  originalHeaders: IPHeaders;
  chain: string[];
  geo?: GeoInfo;
}

export interface IPHeaders {
  xForwardedFor?: string;
  xRealIp?: string;
  cfConnectingIp?: string;
  trueClientIp?: string;
  xClientIp?: string;
  xOriginalForwardedFor?: string;
  forwardedFor?: string;
  forwarded?: string;
  xClusterClientIp?: string;
  fastlyClientIp?: string;
  xAzureClientIp?: string;
  xAkamaiClientIp?: string;
}

export interface GeoInfo {
  country?: string;
  region?: string;
  city?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  asn?: string;
}

interface IPValidationResult {
  isValid: boolean;
  isPrivate: boolean;
  isLoopback: boolean;
  isReserved: boolean;
  version: 4 | 6 | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT IP DETECTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────
export class ClientIPDetector {
  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────

  // Trusted proxy headers in order of priority
  private static readonly HEADER_PRIORITY = [
    // CDN/Proxy specific headers (most reliable)
    "cf-connecting-ip", // Cloudflare
    "true-client-ip", // Cloudflare Enterprise / Akamai
    "x-azure-clientip", // Azure
    "fastly-client-ip", // Fastly
    "x-akamai-client-ip", // Akamai
    "x-vercel-forwarded-for", // Vercel
    "x-vercel-ip", // Vercel
    "x-nf-client-connection-ip", // Netlify

    // Standard proxy headers
    "x-real-ip",
    "x-client-ip",
    "x-forwarded-for",
    "x-original-forwarded-for",
    "x-cluster-client-ip",
    "forwarded-for",
    "forwarded",

    // Less common headers
    "x-forwarded",
    "x-originating-ip",
    "x-remote-ip",
    "x-remote-addr",
    "x-host",
    "z-forwarded-for", // Some load balancers
    "proxy-client-ip", // Apache
    "wl-proxy-client-ip", // WebLogic
    "http-x-forwarded-for",
    "http-forwarded-for",
    "http-client-ip",
    "http-via",
    "via",
  ];

  // Known datacenter IP ranges (simplified - in production use a database)
  private static readonly DATACENTER_RANGES = [
    // AWS
    { start: "3.0.0.0", end: "3.255.255.255" },
    { start: "13.0.0.0", end: "13.255.255.255" },
    { start: "18.0.0.0", end: "18.255.255.255" },
    { start: "34.0.0.0", end: "34.255.255.255" },
    { start: "35.0.0.0", end: "35.255.255.255" },
    { start: "52.0.0.0", end: "52.255.255.255" },
    { start: "54.0.0.0", end: "54.255.255.255" },
    // GCP
    { start: "34.0.0.0", end: "34.255.255.255" },
    { start: "35.0.0.0", end: "35.255.255.255" },
    // Azure
    { start: "13.64.0.0", end: "13.107.255.255" },
    { start: "40.64.0.0", end: "40.127.255.255" },
    // DigitalOcean
    { start: "104.131.0.0", end: "104.131.255.255" },
    { start: "159.65.0.0", end: "159.65.255.255" },
    // Linode
    { start: "45.33.0.0", end: "45.33.255.255" },
    { start: "45.56.0.0", end: "45.56.255.255" },
  ];

  // Known Tor exit node patterns (simplified)
  private static readonly TOR_INDICATORS = [/tor/i, /exit/i, /relay/i];

  // VPN detection patterns in hostnames/ASN
  private static readonly VPN_INDICATORS = [
    /vpn/i,
    /proxy/i,
    /hide/i,
    /mask/i,
    /anonymous/i,
    /private/i,
    /tunnel/i,
    /nord/i,
    /express/i,
    /surfshark/i,
    /cyberghost/i,
    /proton/i,
    /mullvad/i,
    /pia/i,
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN DETECTION METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get client IP from NextRequest (App Router / Middleware)
   */
  static getClientIP(request: NextRequest): IPInfo {
    const headers = this.extractHeaders(request);
    return this.detectIP(headers);
  }
  /**
   * Get client IP from IncomingMessage (API Routes / Pages Router)
   */
  static getClientIPFromRequest(request: IncomingMessage): IPInfo {
    const headers = this.extractHeadersFromIncoming(request);
    const socketIp =
      request.socket?.remoteAddress || request.connection?.remoteAddress;
    return this.detectIP(headers, socketIp);
  }

  /**
   * Get client IP from raw headers object
   */
  static getClientIPFromHeaders(
    headers: Record<string, string | string[] | undefined>,
    fallbackIp?: string
  ): IPInfo {
    const normalizedHeaders = this.normalizeHeaders(headers);
    return this.detectIP(normalizedHeaders, fallbackIp);
  }

  /**
   * Simple IP extraction (just returns the IP string)
   */
  static getIP(request: NextRequest): string {
    return this.getClientIP(request).ip;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CORE DETECTION LOGIC
  // ─────────────────────────────────────────────────────────────────────────

  private static detectIP(headers: IPHeaders, fallbackIp?: string): IPInfo {
    const chain: string[] = [];
    let detectedIp: string | null = null;
    let source = "unknown";
    let confidence: IPInfo["confidence"] = "LOW";

    // Try each header in priority order
    for (const headerName of this.HEADER_PRIORITY) {
      const headerValue = this.getHeaderValue(headers, headerName);

      if (headerValue) {
        const ips = this.parseIPsFromHeader(headerValue);

        for (const ip of ips) {
          chain.push(ip);

          // Skip private/invalid IPs
          const validation = this.validateIP(ip);
          if (
            validation.isValid &&
            !validation.isPrivate &&
            !validation.isLoopback &&
            !validation.isReserved
          ) {
            if (!detectedIp) {
              detectedIp = ip;
              source = headerName;

              // Set confidence based on header type
              confidence = this.getConfidenceFromSource(headerName);
            }
          }
        }
      }
    }

    // Fallback to socket IP
    if (!detectedIp && fallbackIp) {
      const cleanFallback = this.cleanIP(fallbackIp);
      const validation = this.validateIP(cleanFallback);

      if (validation.isValid) {
        detectedIp = cleanFallback;
        source = "socket";
        confidence = "MEDIUM";
        chain.push(cleanFallback);
      }
    }

    // Final fallback
    if (!detectedIp) {
      detectedIp = "0.0.0.0";
      source = "none";
      confidence = "LOW";
    }

    // Detect proxy/VPN/Tor/Datacenter
    const isProxy = this.detectProxy(headers, chain);
    const isVPN = this.detectVPN(detectedIp, headers);
    const isTor = this.detectTor(detectedIp, headers);
    const isDatacenter = this.detectDatacenter(detectedIp);

    // Adjust confidence if behind proxy
    if (isProxy && confidence === "HIGH") {
      confidence = "MEDIUM";
    }

    return {
      ip: detectedIp,
      source,
      confidence,
      isProxy,
      isVPN,
      isTor,
      isDatacenter,
      originalHeaders: headers,
      chain: [...new Set(chain)], // Remove duplicates
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HEADER EXTRACTION
  // ─────────────────────────────────────────────────────────────────────────

  private static extractHeaders(request: NextRequest): IPHeaders {
    return {
      xForwardedFor: request.headers.get("x-forwarded-for") || undefined,
      xRealIp: request.headers.get("x-real-ip") || undefined,
      cfConnectingIp: request.headers.get("cf-connecting-ip") || undefined,
      trueClientIp: request.headers.get("true-client-ip") || undefined,
      xClientIp: request.headers.get("x-client-ip") || undefined,
      xOriginalForwardedFor:
        request.headers.get("x-original-forwarded-for") || undefined,
      forwardedFor: request.headers.get("forwarded-for") || undefined,
      forwarded: request.headers.get("forwarded") || undefined,
      xClusterClientIp: request.headers.get("x-cluster-client-ip") || undefined,
      fastlyClientIp: request.headers.get("fastly-client-ip") || undefined,
      xAzureClientIp: request.headers.get("x-azure-clientip") || undefined,
      xAkamaiClientIp: request.headers.get("x-akamai-client-ip") || undefined,
    };
  }

  private static extractHeadersFromIncoming(
    request: IncomingMessage
  ): IPHeaders {
    const h = request.headers;
    return {
      xForwardedFor: this.toStringOrUndefined(h["x-forwarded-for"]),
      xRealIp: this.toStringOrUndefined(h["x-real-ip"]),
      cfConnectingIp: this.toStringOrUndefined(h["cf-connecting-ip"]),
      trueClientIp: this.toStringOrUndefined(h["true-client-ip"]),
      xClientIp: this.toStringOrUndefined(h["x-client-ip"]),
      xOriginalForwardedFor: this.toStringOrUndefined(
        h["x-original-forwarded-for"]
      ),
      forwardedFor: this.toStringOrUndefined(h["forwarded-for"]),
      forwarded: this.toStringOrUndefined(h["forwarded"]),
      xClusterClientIp: this.toStringOrUndefined(h["x-cluster-client-ip"]),
      fastlyClientIp: this.toStringOrUndefined(h["fastly-client-ip"]),
      xAzureClientIp: this.toStringOrUndefined(h["x-azure-clientip"]),
      xAkamaiClientIp: this.toStringOrUndefined(h["x-akamai-client-ip"]),
    };
  }

  private static normalizeHeaders(
    headers: Record<string, string | string[] | undefined>
  ): IPHeaders {
    const get = (key: string): string | undefined => {
      const value = headers[key] || headers[key.toLowerCase()];
      return Array.isArray(value) ? value[0] : value;
    };

    return {
      xForwardedFor: get("x-forwarded-for"),
      xRealIp: get("x-real-ip"),
      cfConnectingIp: get("cf-connecting-ip"),
      trueClientIp: get("true-client-ip"),
      xClientIp: get("x-client-ip"),
      xOriginalForwardedFor: get("x-original-forwarded-for"),
      forwardedFor: get("forwarded-for"),
      forwarded: get("forwarded"),
      xClusterClientIp: get("x-cluster-client-ip"),
      fastlyClientIp: get("fastly-client-ip"),
      xAzureClientIp: get("x-azure-clientip"),
      xAkamaiClientIp: get("x-akamai-client-ip"),
    };
  }

  private static getHeaderValue(
    headers: IPHeaders,
    headerName: string
  ): string | undefined {
    const mapping: Record<string, keyof IPHeaders> = {
      "x-forwarded-for": "xForwardedFor",
      "x-real-ip": "xRealIp",
      "cf-connecting-ip": "cfConnectingIp",
      "true-client-ip": "trueClientIp",
      "x-client-ip": "xClientIp",
      "x-original-forwarded-for": "xOriginalForwardedFor",
      "forwarded-for": "forwardedFor",
      forwarded: "forwarded",
      "x-cluster-client-ip": "xClusterClientIp",
      "fastly-client-ip": "fastlyClientIp",
      "x-azure-clientip": "xAzureClientIp",
      "x-akamai-client-ip": "xAkamaiClientIp",
    };

    const key = mapping[headerName];
    return key ? headers[key] : undefined;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // IP PARSING & VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  private static parseIPsFromHeader(headerValue: string): string[] {
    const ips: string[] = [];

    // Handle "Forwarded" header format (RFC 7239)
    if (headerValue.toLowerCase().includes("for=")) {
      const forMatches = headerValue.match(/for=["']?([^"',;\s]+)/gi);
      if (forMatches) {
        for (const match of forMatches) {
          const ip = match.replace(/for=["']?/i, "").replace(/["']$/, "");
          const cleanedIP = this.cleanIP(ip);
          if (cleanedIP) ips.push(cleanedIP);
        }
      }
    } else {
      // Standard comma-separated format
      const parts = headerValue.split(/[,\s]+/);
      for (const part of parts) {
        const cleanedIP = this.cleanIP(part.trim());
        if (cleanedIP) ips.push(cleanedIP);
      }
    }

    return ips;
  }

  private static cleanIP(ip: string): string {
    if (!ip) return "";

    let cleaned = ip.trim();

    // Remove brackets from IPv6
    cleaned = cleaned.replace(/^\[|\]$/g, "");

    // Remove port number
    if (cleaned.includes(":") && !cleaned.includes("::")) {
      // IPv4 with port
      const lastColon = cleaned.lastIndexOf(":");
      const possiblePort = cleaned.substring(lastColon + 1);
      if (/^\d+$/.test(possiblePort)) {
        cleaned = cleaned.substring(0, lastColon);
      }
    } else if (cleaned.startsWith("[") || cleaned.includes("]:")) {
      // IPv6 with port [::1]:8080
      cleaned = cleaned.replace(/\]:\d+$/, "").replace(/^\[|\]$/g, "");
    }

    // Handle IPv4-mapped IPv6
    if (cleaned.startsWith("::ffff:")) {
      cleaned = cleaned.substring(7);
    }

    // Remove any remaining whitespace or quotes
    cleaned = cleaned.replace(/["']/g, "").trim();

    return cleaned;
  }

  private static validateIP(ip: string): IPValidationResult {
    if (!ip) {
      return {
        isValid: false,
        isPrivate: false,
        isLoopback: false,
        isReserved: false,
        version: null,
      };
    }

    // Check IPv4
    const ipv4Regex =
      /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
    if (ipv4Regex.test(ip)) {
      return {
        isValid: true,
        isPrivate: this.isPrivateIPv4(ip),
        isLoopback: ip.startsWith("127."),
        isReserved: this.isReservedIPv4(ip),
        version: 4,
      };
    }

    // Check IPv6
    const ipv6Regex =
      /^(?:[a-fA-F\d]{1,4}:){7}[a-fA-F\d]{1,4}$|^(?:[a-fA-F\d]{1,4}:){1,7}:$|^(?:[a-fA-F\d]{1,4}:){1,6}:[a-fA-F\d]{1,4}$|^(?:[a-fA-F\d]{1,4}:){1,5}(?::[a-fA-F\d]{1,4}){1,2}$|^(?:[a-fA-F\d]{1,4}:){1,4}(?::[a-fA-F\d]{1,4}){1,3}$|^(?:[a-fA-F\d]{1,4}:){1,3}(?::[a-fA-F\d]{1,4}){1,4}$|^(?:[a-fA-F\d]{1,4}:){1,2}(?::[a-fA-F\d]{1,4}){1,5}$|^[a-fA-F\d]{1,4}:(?::[a-fA-F\d]{1,4}){1,6}$|^:(?::[a-fA-F\d]{1,4}){1,7}$|^::$/i;

    if (ipv6Regex.test(ip)) {
      return {
        isValid: true,
        isPrivate: this.isPrivateIPv6(ip),
        isLoopback: ip === "::1",
        isReserved: this.isReservedIPv6(ip),
        version: 6,
      };
    }

    return {
      isValid: false,
      isPrivate: false,
      isLoopback: false,
      isReserved: false,
      version: null,
    };
  }

  private static isPrivateIPv4(ip: string): boolean {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;

    // 10.0.0.0/8
    if (a === 10) return true;

    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) return true;

    return false;
  }

  private static isReservedIPv4(ip: string): boolean {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;

    // 0.0.0.0/8
    if (a === 0) return true;

    // 100.64.0.0/10 (Carrier-grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 192.0.0.0/24 (IETF Protocol)
    if (a === 192 && b === 0 && parts[2] === 0) return true;

    // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Documentation)
    if (a === 192 && b === 0 && parts[2] === 2) return true;
    if (a === 198 && b === 51 && parts[2] === 100) return true;
    if (a === 203 && b === 0 && parts[2] === 113) return true;

    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 (Reserved)
    if (a >= 240) return true;

    // 255.255.255.255 (Broadcast)
    if (ip === "255.255.255.255") return true;

    return false;
  }

  private static isPrivateIPv6(ip: string): boolean {
    const normalized = ip.toLowerCase();

    // fc00::/7 (Unique local)
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;

    // fe80::/10 (Link-local)
    if (normalized.startsWith("fe80")) return true;

    return false;
  }

  private static isReservedIPv6(ip: string): boolean {
    const normalized = ip.toLowerCase();

    // :: (Unspecified)
    if (normalized === "::") return true;

    // ::1 (Loopback)
    if (normalized === "::1") return true;

    // ff00::/8 (Multicast)
    if (normalized.startsWith("ff")) return true;

    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROXY/VPN/TOR DETECTION
  // ─────────────────────────────────────────────────────────────────────────

  private static detectProxy(headers: IPHeaders, chain: string[]): boolean {
    // Multiple IPs in chain indicates proxy
    if (chain.length > 1) return true;

    // Presence of certain headers indicates proxy
    if (
      headers.xForwardedFor ||
      headers.forwarded ||
      headers.xOriginalForwardedFor
    ) {
      return true;
    }

    return false;
  }

  private static detectVPN(ip: string, headers: IPHeaders): boolean {
    // Check headers for VPN indicators
    const allHeaders = Object.values(headers).filter(Boolean).join(" ");

    for (const pattern of this.VPN_INDICATORS) {
      if (pattern.test(allHeaders)) return true;
    }

    // Check if IP is in known VPN datacenter ranges
    // In production, you'd use a VPN IP database like IPQualityScore
    if (this.detectDatacenter(ip)) {
      // Datacenters are often used by VPNs
      return true;
    }

    return false;
  }

  private static detectTor(ip: string, headers: IPHeaders): boolean {
    // Check headers for Tor indicators
    const allHeaders = Object.values(headers).filter(Boolean).join(" ");

    for (const pattern of this.TOR_INDICATORS) {
      if (pattern.test(allHeaders)) return true;
    }

    // In production, check against Tor exit node list
    // https://check.torproject.org/torbulkexitlist

    return false;
  }

  private static detectDatacenter(ip: string): boolean {
    const validation = this.validateIP(ip);
    if (!validation.isValid || validation.version !== 4) return false;

    const ipNum = this.ipToNumber(ip);

    for (const range of this.DATACENTER_RANGES) {
      const startNum = this.ipToNumber(range.start);
      const endNum = this.ipToNumber(range.end);

      if (ipNum >= startNum && ipNum <= endNum) {
        return true;
      }
    }

    return false;
  }

  private static ipToNumber(ip: string): number {
    const parts = ip.split(".").map(Number);
    return (
      ((parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIDENCE SCORING
  // ─────────────────────────────────────────────────────────────────────────

  private static getConfidenceFromSource(source: string): IPInfo["confidence"] {
    // CDN-specific headers are most reliable
    const highConfidence = [
      "cf-connecting-ip",
      "true-client-ip",
      "x-azure-clientip",
      "fastly-client-ip",
      "x-akamai-client-ip",
      "x-vercel-forwarded-for",
      "x-vercel-ip",
      "x-nf-client-connection-ip",
    ];

    const mediumConfidence = ["x-real-ip", "x-client-ip"];

    if (highConfidence.includes(source)) return "HIGH";
    if (mediumConfidence.includes(source)) return "MEDIUM";
    return "LOW";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  private static toStringOrUndefined(
    value: string | string[] | undefined
  ): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
  }

  /**
   * Check if two IPs are the same (handles IPv4-mapped IPv6)
   */
  static isSameIP(ip1: string, ip2: string): boolean {
    const clean1 = this.cleanIP(ip1);
    const clean2 = this.cleanIP(ip2);

    if (clean1 === clean2) return true;

    // Handle IPv4-mapped IPv6 comparison
    const ipv4Mapped1 = clean1.startsWith("::ffff:")
      ? clean1.substring(7)
      : clean1;
    const ipv4Mapped2 = clean2.startsWith("::ffff:")
      ? clean2.substring(7)
      : clean2;

    return ipv4Mapped1 === ipv4Mapped2;
  }

  /**
   * Anonymize IP for logging (GDPR compliance)
   */
  static anonymizeIP(ip: string): string {
    const validation = this.validateIP(ip);

    if (validation.version === 4) {
      // Zero out last octet: 192.168.1.100 -> 192.168.1.0
      const parts = ip.split(".");
      parts[3] = "0";
      return parts.join(".");
    }

    if (validation.version === 6) {
      // Zero out last 80 bits
      const parts = ip.split(":");
      return parts.slice(0, 3).join(":") + "::";
    }

    return "0.0.0.0";
  }

  /**
   * Hash IP for storage (privacy-preserving)
   */
  static hashIP(ip: string, salt: string = ""): string {
    const data = ip + salt;
    let hash = 0;

    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  /**
   * Check if IP is in CIDR range
   */
  static isInCIDR(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split("/");
    const mask = parseInt(bits, 10);

    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(range);
    const maskNum = ~(2 ** (32 - mask) - 1);

    return (ipNum & maskNum) === (rangeNum & maskNum);
  }

  /**
   * Get IP geolocation (placeholder - integrate with MaxMind/IPInfo in production)
   */
  static async getGeoLocation(ip: string): Promise<GeoInfo | null> {
    // In production, integrate with:
    // - MaxMind GeoIP2
    // - IPInfo.io
    // - IP2Location
    // - IPQualityScore

    // Placeholder implementation using free API
    try {
      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=66846719`
      );
      if (!response.ok) return null;

      const data = await response.json();

      if (data.status === "success") {
        return {
          country: data.country,
          region: data.regionName,
          city: data.city,
          lat: data.lat,
          lon: data.lon,
          timezone: data.timezone,
          isp: data.isp,
          org: data.org,
          asn: data.as,
        };
      }

      return null;
    } catch {
      return null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simple function to get client IP from NextRequest
 */
export function getClientIP(request: NextRequest): string {
  return ClientIPDetector.getIP(request);
}

/**
 * Get detailed IP info from NextRequest
 */
/**
 * Get detailed IP info from NextRequest
 */
export function getClientIPInfo(request: NextRequest): IPInfo {
  return ClientIPDetector.getClientIP(request);
}

/**
 * Check if request is from proxy/VPN
 */
export function isProxied(request: NextRequest): boolean {
  const info = ClientIPDetector.getClientIP(request);
  return info.isProxy || info.isVPN || info.isTor;
}

/**
 * Get anonymized IP for logging
 */
export function getAnonymizedIP(request: NextRequest): string {
  const ip = ClientIPDetector.getIP(request);
  return ClientIPDetector.anonymizeIP(ip);
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Middleware context enrichment
 */
export function enrichRequestWithIP(request: NextRequest): {
  clientIp: string;
  ipInfo: IPInfo;
  isProxied: boolean;
  isSuspicious: boolean;
} {
  const ipInfo = ClientIPDetector.getClientIP(request);

  return {
    clientIp: ipInfo.ip,
    ipInfo,
    isProxied: ipInfo.isProxy || ipInfo.isVPN || ipInfo.isTor,
    isSuspicious:
      ipInfo.isDatacenter ||
      ipInfo.isTor ||
      (ipInfo.isVPN && ipInfo.confidence === "LOW"),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITING HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a consistent key for rate limiting (handles proxies)
 */
export function getRateLimitKey(request: NextRequest): string {
  const ipInfo = ClientIPDetector.getClientIP(request);

  // If behind known CDN, trust their header
  if (ipInfo.confidence === "HIGH") {
    return `ip:${ipInfo.ip}`;
  }

  // If proxied with low confidence, include more context
  if (ipInfo.isProxy && ipInfo.confidence === "LOW") {
    const userAgent = request.headers.get("user-agent") || "";
    const hash = ClientIPDetector.hashIP(ipInfo.ip + userAgent);
    return `proxy:${hash}`;
  }

  return `ip:${ipInfo.ip}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUSTED PROXY CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export class TrustedProxyConfig {
  private static trustedProxies: Set<string> = new Set();
  private static trustedCIDRs: string[] = [];

  /**
   * Add trusted proxy IPs
   */
  static addTrustedProxy(ip: string): void {
    this.trustedProxies.add(ip);
  }

  /**
   * Add trusted CIDR range
   */
  static addTrustedCIDR(cidr: string): void {
    this.trustedCIDRs.push(cidr);
  }

  /**
   * Configure common CDN trusted ranges
   */
  static trustCloudflare(): void {
    // Cloudflare IPv4 ranges
    const cloudflareRanges = [
      "173.245.48.0/20",
      "103.21.244.0/22",
      "103.22.200.0/22",
      "103.31.4.0/22",
      "141.101.64.0/18",
      "108.162.192.0/18",
      "190.93.240.0/20",
      "188.114.96.0/20",
      "197.234.240.0/22",
      "198.41.128.0/17",
      "162.158.0.0/15",
      "104.16.0.0/13",
      "104.24.0.0/14",
      "172.64.0.0/13",
      "131.0.72.0/22",
    ];

    cloudflareRanges.forEach((cidr) => this.addTrustedCIDR(cidr));
  }

  static trustVercel(): void {
    // Vercel doesn't publish IP ranges, but we trust their headers
    // This is handled by header priority in ClientIPDetector
  }

  static trustAWS(): void {
    // In production, fetch from:
    // https://ip-ranges.amazonaws.com/ip-ranges.json
    // and filter by service: "CLOUDFRONT"
  }

  /**
   * Check if IP is a trusted proxy
   */
  static isTrustedProxy(ip: string): boolean {
    if (this.trustedProxies.has(ip)) return true;

    for (const cidr of this.trustedCIDRs) {
      if (ClientIPDetector.isInCIDR(ip, cidr)) return true;
    }

    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IP BLOCKLIST MANAGER
// ─────────────────────────────────────────────────────────────────────────────

export class IPBlocklist {
  private static blockedIPs: Set<string> = new Set();
  private static blockedCIDRs: string[] = [];
  private static temporaryBlocks: Map<string, number> = new Map(); // IP -> expiry timestamp

  /**
   * Block an IP permanently
   */
  static block(ip: string): void {
    this.blockedIPs.add(ip);
    console.log(`[IP BLOCKLIST] 🚫 Permanently blocked: ${ip}`);
  }

  /**
   * Block an IP temporarily
   */
  static blockTemporary(ip: string, durationMs: number): void {
    const expiry = Date.now() + durationMs;
    this.temporaryBlocks.set(ip, expiry);
    console.log(
      `[IP BLOCKLIST] ⏱️ Temporarily blocked: ${ip} until ${new Date(
        expiry
      ).toISOString()}`
    );
  }

  /**
   * Block a CIDR range
   */
  static blockCIDR(cidr: string): void {
    this.blockedCIDRs.push(cidr);
    console.log(`[IP BLOCKLIST] 🚫 Blocked CIDR: ${cidr}`);
  }

  /**
   * Unblock an IP
   */
  static unblock(ip: string): void {
    this.blockedIPs.delete(ip);
    this.temporaryBlocks.delete(ip);
    console.log(`[IP BLOCKLIST] ✅ Unblocked: ${ip}`);
  }

  /**
   * Check if IP is blocked
   */
  static isBlocked(ip: string): boolean {
    // Check permanent blocks
    if (this.blockedIPs.has(ip)) return true;

    // Check temporary blocks
    const tempExpiry = this.temporaryBlocks.get(ip);
    if (tempExpiry) {
      if (Date.now() < tempExpiry) {
        return true;
      } else {
        // Expired, remove it
        this.temporaryBlocks.delete(ip);
      }
    }

    // Check CIDR blocks
    for (const cidr of this.blockedCIDRs) {
      if (ClientIPDetector.isInCIDR(ip, cidr)) return true;
    }

    return false;
  }

  /**
   * Get block statistics
   */
  static getStats(): {
    permanentBlocks: number;
    temporaryBlocks: number;
    cidrBlocks: number;
  } {
    // Clean expired temporary blocks
    const now = Date.now();
    for (const [ip, expiry] of this.temporaryBlocks) {
      if (now >= expiry) {
        this.temporaryBlocks.delete(ip);
      }
    }

    return {
      permanentBlocks: this.blockedIPs.size,
      temporaryBlocks: this.temporaryBlocks.size,
      cidrBlocks: this.blockedCIDRs.length,
    };
  }

  /**
   * Clear all blocks
   */
  static clear(): void {
    this.blockedIPs.clear();
    this.blockedCIDRs = [];
    this.temporaryBlocks.clear();
    console.log(`[IP BLOCKLIST] 🧹 All blocks cleared`);
  }

  /**
   * Export blocklist for persistence
   */
  static export(): string {
    return JSON.stringify({
      blockedIPs: Array.from(this.blockedIPs),
      blockedCIDRs: this.blockedCIDRs,
      temporaryBlocks: Array.from(this.temporaryBlocks.entries()),
      exportedAt: new Date().toISOString(),
    });
  }

  /**
   * Import blocklist
   */
  static import(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.blockedIPs = new Set(parsed.blockedIPs || []);
      this.blockedCIDRs = parsed.blockedCIDRs || [];
      this.temporaryBlocks = new Map(parsed.temporaryBlocks || []);
      console.log(`[IP BLOCKLIST] 📥 Imported blocklist`);
    } catch (error) {
      console.error(`[IP BLOCKLIST] ❌ Failed to import:`, error);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USAGE EXAMPLES
// ─────────────────────────────────────────────────────────────────────────────

/*
// In middleware.ts
import { ClientIPDetector, IPBlocklist, getClientIP } from '@/lib/clientIp';

export function middleware(request: NextRequest) {
  // Simple usage
  const ip = getClientIP(request);
  
  // Check blocklist
  if (IPBlocklist.isBlocked(ip)) {
    return new NextResponse('Blocked', { status: 403 });
  }
  
  // Detailed info
  const ipInfo = ClientIPDetector.getClientIP(request);
  
  console.log(`Request from ${ipInfo.ip} (${ipInfo.source})`);
  console.log(`  Confidence: ${ipInfo.confidence}`);
  console.log(`  Proxy: ${ipInfo.isProxy}`);
  console.log(`  VPN: ${ipInfo.isVPN}`);
  console.log(`  Tor: ${ipInfo.isTor}`);
  console.log(`  Datacenter: ${ipInfo.isDatacenter}`);
  
  // Add to request headers for downstream use
  const response = NextResponse.next();
  response.headers.set('x-client-ip', ipInfo.ip);
  response.headers.set('x-ip-confidence', ipInfo.confidence);
  response.headers.set('x-is-proxy', ipInfo.isProxy.toString());
  
  return response;
}

// In API route
import { ClientIPDetector } from '@/lib/clientIp';

export async function GET(request: NextRequest) {
  const ipInfo = ClientIPDetector.getClientIP(request);
  
  // Get geolocation
  const geo = await ClientIPDetector.getGeoLocation(ipInfo.ip);
  
  return NextResponse.json({
    ip: ipInfo.ip,
    country: geo?.country,
    city: geo?.city,
    isProxy: ipInfo.isProxy,
  });
}

// Configure trusted proxies at startup
import { TrustedProxyConfig } from '@/lib/clientIp';

TrustedProxyConfig.trustCloudflare();
TrustedProxyConfig.addTrustedProxy('10.0.0.1'); // Internal load balancer

// Block suspicious IPs
import { IPBlocklist } from '@/lib/clientIp';

IPBlocklist.block('1.2.3.4'); // Permanent
IPBlocklist.blockTemporary('5.6.7.8', 60 * 60 * 1000); // 1 hour
IPBlocklist.blockCIDR('192.0.2.0/24'); // Entire range
*/
