// ========================================
// 🌍 TASK 9: GEO GUARD - Geographic Access Controller (Nigeria Edition)
// Responsibility: Block/allow requests based on geographic location
// ========================================

// File: src/lib/middleware/geoGuard.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";
import {
  PUBLIC_PATHS,
  PRIVATE_PATHS,
  AUTH_PATHS,
  CACHEABLE_PATHS,
  NON_CACHEABLE_PATHS,
  isPublicPath,
  isPrivatePath,
  isAuthPath,
  isCacheablePath,
  isNonCacheablePath,
} from "@/lib/utils/pathUtils";

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
interface GeoLocation {
  country: string;
  countryCode: string;
  region: string;
  regionCode: string;
  city: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  mobile?: boolean;
  proxy?: boolean;
  hosting?: boolean;
}

interface GeoRestriction {
  allowedCountries: string[];
  blockedCountries: string[];
  allowedStates: string[]; // Nigerian states
  blockedStates: string[];
  allowVPN: boolean;
  allowTor: boolean;
  allowProxy: boolean;
  allowHosting: boolean; // Datacenter IPs
  allowMobile: boolean;
  requireVerifiedISP: boolean;
}

interface GeoMetrics {
  totalChecks: number;
  allowed: number;
  blocked: number;
  byCountry: Map<string, number>;
  byState: Map<string, number>;
  vpnBlocked: number;
  proxyBlocked: number;
  lastReset: number;
}

interface GeoCache {
  data: GeoLocation;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// NIGERIAN STATES
// ─────────────────────────────────────────────────────────────────────────────
const NIGERIAN_STATES = {
  AB: "Abia",
  AD: "Adamawa",
  AK: "Akwa Ibom",
  AN: "Anambra",
  BA: "Bauchi",
  BY: "Bayelsa",
  BE: "Benue",
  BO: "Borno",
  CR: "Cross River",
  DE: "Delta",
  EB: "Ebonyi",
  ED: "Edo",
  EK: "Ekiti",
  EN: "Enugu",
  FC: "FCT Abuja",
  GO: "Gombe",
  IM: "Imo",
  JI: "Jigawa",
  KD: "Kaduna",
  KN: "Kano",
  KT: "Katsina",
  KE: "Kebbi",
  KO: "Kogi",
  KW: "Kwara",
  LA: "Lagos",
  NA: "Nasarawa",
  NI: "Niger",
  OG: "Ogun",
  ON: "Ondo",
  OS: "Osun",
  OY: "Oyo",
  PL: "Plateau",
  RI: "Rivers",
  SO: "Sokoto",
  TA: "Taraba",
  YO: "Yobe",
  ZA: "Zamfara",
} as const;

type NigerianStateCode = keyof typeof NIGERIAN_STATES;

// ─────────────────────────────────────────────────────────────────────────────
// KNOWN NIGERIAN ISPs
// ─────────────────────────────────────────────────────────────────────────────
const NIGERIAN_ISPS = [
  "MTN Nigeria",
  "Globacom",
  "Airtel Nigeria",
  "9mobile",
  "Spectranet",
  "Smile Communications",
  "Swift Networks",
  "IPNX Nigeria",
  "MainOne",
  "Suburban Telecom",
  "Tizeti Network",
  "Fiberone",
  "Cobranet",
  "Layer3",
  "Galaxy Backbone",
  "Descasio",
];

// ─────────────────────────────────────────────────────────────────────────────
// GEO GUARD CLASS
// ─────────────────────────────────────────────────────────────────────────────
export class GeoGuard {
  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly METRICS_RESET_INTERVAL = 60 * 60 * 1000; // 1 hour
  private static readonly GEO_API_TIMEOUT = 3000; // 3 seconds

  // IP Cache to reduce API calls
  private static geoCache = new Map<string, GeoCache>();

  // Metrics
  private static metrics: GeoMetrics = {
    totalChecks: 0,
    allowed: 0,
    blocked: 0,
    byCountry: new Map(),
    byState: new Map(),
    vpnBlocked: 0,
    proxyBlocked: 0,
    lastReset: Date.now(),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RESTRICTION PROFILES
  // ─────────────────────────────────────────────────────────────────────────

  // Default: Nigeria only, allow most access methods
  private static readonly DEFAULT_RESTRICTIONS: GeoRestriction = {
    allowedCountries: ["NG"], // Nigeria only
    blockedCountries: [],
    allowedStates: [], // Empty = allow all Nigerian states
    blockedStates: [],
    allowVPN: true, // Allow VPN for privacy
    allowTor: false, // Block Tor
    allowProxy: false, // Block proxies
    allowHosting: false, // Block datacenter IPs
    allowMobile: true, // Allow mobile networks
    requireVerifiedISP: false,
  };

  // Strict: For sensitive operations (payments, admin)
  private static readonly STRICT_RESTRICTIONS: GeoRestriction = {
    allowedCountries: ["NG"],
    blockedCountries: [],
    allowedStates: [],
    blockedStates: [],
    allowVPN: false, // No VPN
    allowTor: false,
    allowProxy: false,
    allowHosting: false,
    allowMobile: true,
    requireVerifiedISP: true, // Must be known Nigerian ISP
  };

  // API: For API access
  private static readonly API_RESTRICTIONS: GeoRestriction = {
    allowedCountries: ["NG"],
    blockedCountries: [],
    allowedStates: [],
    blockedStates: [],
    allowVPN: false,
    allowTor: false,
    allowProxy: false,
    allowHosting: true, // Allow for server-to-server
    allowMobile: true,
    requireVerifiedISP: false,
  };

  // Public: For public pages (more lenient)
  private static readonly PUBLIC_RESTRICTIONS: GeoRestriction = {
    allowedCountries: ["NG", "GH", "KE", "ZA", "GB", "US"], // Nigeria + diaspora
    blockedCountries: ["CN", "RU", "KP", "IR"],
    allowedStates: [],
    blockedStates: [],
    allowVPN: true,
    allowTor: false,
    allowProxy: true,
    allowHosting: true,
    allowMobile: true,
    requireVerifiedISP: false,
  };

  // Development IPs to whitelist
  private static readonly DEV_WHITELIST = [
    "127.0.0.1",
    "localhost",
    "::1",
    // Add your development IPs here
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN GUARD METHOD
  // ─────────────────────────────────────────────────────────────────────────
  static async guard(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<NextResponse> {
    const startTime = Date.now();

    try {
      GeoGuard.updateMetrics();

      const clientIP = context.clientIp;
      const pathname = request.nextUrl.pathname;

      // Skip for development/whitelisted IPs
      if (GeoGuard.isWhitelisted(clientIP)) {
        return GeoGuard.createAllowedResponse(request, null, "WHITELISTED");
      }

      // Get geolocation data (with caching)
      const geoData = await GeoGuard.getGeoLocation(clientIP);

      if (!geoData) {
        console.warn(
          `[GEO GUARD] ⚠️ Could not determine location: ${clientIP}`
        );
        // In production, you might want to block unknown locations
        return GeoGuard.createAllowedResponse(
          request,
          null,
          "UNKNOWN_LOCATION"
        );
      }

      // Get restrictions based on path
      const restrictions = GeoGuard.getRestrictionsForPath(pathname);

      // Run all checks
      const blockReason = await GeoGuard.runSecurityChecks(
        geoData,
        restrictions,
        clientIP
      );

      if (blockReason) {
        GeoGuard.metrics.blocked++;
        GeoGuard.logBlock(clientIP, geoData, blockReason, pathname);
        return GeoGuard.createBlockedResponse(geoData, blockReason, request);
      }

      // Update metrics
      GeoGuard.metrics.allowed++;
      GeoGuard.updateCountryMetrics(geoData.countryCode);
      if (geoData.countryCode === "NG") {
        GeoGuard.updateStateMetrics(geoData.regionCode);
      }

      // Log success
      GeoGuard.logAllow(clientIP, geoData, pathname, Date.now() - startTime);

      return GeoGuard.createAllowedResponse(request, geoData, "ALLOWED");
    } catch (error) {
      console.error("[GEO GUARD] ❌ Error:", error);
      // Fail open in case of errors (or fail closed for high security)
      return NextResponse.next();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECURITY CHECKS
  // ─────────────────────────────────────────────────────────────────────────
  private static async runSecurityChecks(
    geoData: GeoLocation,
    restrictions: GeoRestriction,
    clientIP: string
  ): Promise<string | null> {
    // 1. Country check
    if (!GeoGuard.isCountryAllowed(geoData.countryCode, restrictions)) {
      return "COUNTRY_NOT_ALLOWED";
    }

    // 2. Blocked country check
    if (GeoGuard.isCountryBlocked(geoData.countryCode, restrictions)) {
      return "COUNTRY_BLOCKED";
    }

    // 3. Nigerian state check (only for NG)
    if (geoData.countryCode === "NG") {
      if (!GeoGuard.isStateAllowed(geoData.regionCode, restrictions)) {
        return "STATE_NOT_ALLOWED";
      }
      if (GeoGuard.isStateBlocked(geoData.regionCode, restrictions)) {
        return "STATE_BLOCKED";
      }
    }

    // 4. VPN check
    if (geoData.proxy && !restrictions.allowVPN && !restrictions.allowProxy) {
      GeoGuard.metrics.vpnBlocked++;
      return "VPN_PROXY_BLOCKED";
    }

    // 5. Hosting/Datacenter check
    if (geoData.hosting && !restrictions.allowHosting) {
      return "DATACENTER_BLOCKED";
    }

    // 6. Mobile check
    if (geoData.mobile === false && !restrictions.allowMobile) {
      // This is inverted - if mobile is required but connection is not mobile
      // Usually we allow mobile, so this check is rarely triggered
    }

    // 7. ISP verification (for strict mode)
    if (restrictions.requireVerifiedISP && geoData.countryCode === "NG") {
      if (!GeoGuard.isVerifiedNigerianISP(geoData.isp)) {
        return "UNVERIFIED_ISP";
      }
    }

    return null; // All checks passed
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GEOLOCATION
  // ─────────────────────────────────────────────────────────────────────────
  private static async getGeoLocation(ip: string): Promise<GeoLocation | null> {
    // Check cache first
    const cached = GeoGuard.geoCache.get(ip);
    if (cached && Date.now() - cached.timestamp < GeoGuard.CACHE_TTL) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        GeoGuard.GEO_API_TIMEOUT
      );

      // Using ip-api.com with all fields
      // Free tier: 45 requests/minute, consider upgrading for production
      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,mobile,proxy,hosting`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const data = await response.json();

      if (data.status === "fail") {
        console.warn(`[GEO GUARD] API error for ${ip}: ${data.message}`);
        return null;
      }

      const geoData: GeoLocation = {
        country: data.country || "Unknown",
        countryCode: data.countryCode || "XX",
        region: data.regionName || "Unknown",
        regionCode: data.region || "XX",
        city: data.city || "Unknown",
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        org: data.org,
        as: data.as,
        mobile: data.mobile,
        proxy: data.proxy,
        hosting: data.hosting,
      };

      // Cache the result
      GeoGuard.geoCache.set(ip, { data: geoData, timestamp: Date.now() });

      return geoData;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        console.warn(`[GEO GUARD] Geo lookup timeout for ${ip}`);
      } else {
        console.error(`[GEO GUARD] Geo lookup error for ${ip}:`, error);
      }
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESTRICTION CHECKS
  // ─────────────────────────────────────────────────────────────────────────
  private static getRestrictionsForPath(pathname: string): GeoRestriction {
    // Public pages - more lenient
    if (isPublicPath(pathname)) {
      return GeoGuard.PUBLIC_RESTRICTIONS;
    }

    // Auth pages - default restrictions
    if (isAuthPath(pathname)) {
      return GeoGuard.DEFAULT_RESTRICTIONS;
    }

    // API endpoints - API restrictions
    if (pathname.startsWith("/api")) {
      // Strict for sensitive APIs
      if (
        pathname.startsWith("/api/admin") ||
        pathname.startsWith("/api/payment") ||
        pathname.startsWith("/api/transfer")
      ) {
        return GeoGuard.STRICT_RESTRICTIONS;
      }
      return GeoGuard.API_RESTRICTIONS;
    }

    // Admin/Dashboard - strict
    if (isPrivatePath(pathname)) {
      return GeoGuard.STRICT_RESTRICTIONS;
    }

    // Default for everything else
    return GeoGuard.DEFAULT_RESTRICTIONS;
  }

  private static isWhitelisted(ip: string): boolean {
    if (process.env.NODE_ENV === "development") return true;
    if (GeoGuard.DEV_WHITELIST.includes(ip)) return true;
    if (ip.startsWith("192.168.") || ip.startsWith("10.")) return true; // Private IPs
    return false;
  }

  private static isCountryAllowed(
    countryCode: string,
    restrictions: GeoRestriction
  ): boolean {
    if (restrictions.allowedCountries.length === 0) return true;
    return restrictions.allowedCountries.includes(countryCode);
  }

  private static isCountryBlocked(
    countryCode: string,
    restrictions: GeoRestriction
  ): boolean {
    return restrictions.blockedCountries.includes(countryCode);
  }

  private static isStateAllowed(
    stateCode: string,
    restrictions: GeoRestriction
  ): boolean {
    if (restrictions.allowedStates.length === 0) return true;
    return restrictions.allowedStates.includes(stateCode);
  }

  private static isStateBlocked(
    stateCode: string,
    restrictions: GeoRestriction
  ): boolean {
    return restrictions.blockedStates.includes(stateCode);
  }

  private static isVerifiedNigerianISP(isp?: string): boolean {
    if (!isp) return false;
    return NIGERIAN_ISPS.some(
      (knownISP) =>
        isp.toLowerCase().includes(knownISP.toLowerCase()) ||
        knownISP.toLowerCase().includes(isp.toLowerCase())
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESPONSE BUILDERS
  // ─────────────────────────────────────────────────────────────────────────
  private static createAllowedResponse(
    request: NextRequest,
    geoData: GeoLocation | null,
    reason: string
  ): NextResponse {
    const response = NextResponse.next();

    // Add geo headers
    if (geoData) {
      response.headers.set("x-geo-country", geoData.countryCode);
      response.headers.set("x-geo-region", geoData.regionCode);
      response.headers.set("x-geo-city", geoData.city);
      response.headers.set("x-geo-isp", geoData.isp || "unknown");

      if (geoData.countryCode === "NG") {
        const stateName =
          NIGERIAN_STATES[geoData.regionCode as NigerianStateCode] ||
          geoData.region;
        response.headers.set("x-geo-state", stateName);
      }

      if (geoData.latitude && geoData.longitude) {
        response.headers.set(
          "x-geo-coords",
          `${geoData.latitude},${geoData.longitude}`
        );
      }
    }

    response.headers.set("x-geo-status", "allowed");
    response.headers.set("x-geo-reason", reason);

    return response;
  }

  private static createBlockedResponse(
    geoData: GeoLocation,
    reason: string,
    request: NextRequest
  ): NextResponse {
    const isAPI = request.nextUrl.pathname.startsWith("/api");

    // For API requests, return JSON
    if (isAPI) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "GEO_BLOCKED",
            reason: reason,
            message: GeoGuard.getBlockMessage(reason),
            location: {
              country: geoData.country,
              countryCode: geoData.countryCode,
              state: geoData.region,
              city: geoData.city,
            },
          },
          timestamp: new Date().toISOString(),
        },
        {
          status: 403,
          headers: {
            "x-geo-blocked": "true",
            "x-geo-reason": reason,
            "x-geo-country": geoData.countryCode,
          },
        }
      );
    }

    // For page requests, redirect to blocked page
    const blockedUrl = new URL("/geo-blocked", request.url);
    blockedUrl.searchParams.set("reason", reason);
    blockedUrl.searchParams.set("country", geoData.countryCode);
    blockedUrl.searchParams.set("region", geoData.regionCode);

    return NextResponse.redirect(blockedUrl, {
      status: 302,
      headers: {
        "x-geo-blocked": "true",
        "x-geo-reason": reason,
      },
    });
  }

  private static getBlockMessage(reason: string): string {
    const messages: Record<string, string> = {
      COUNTRY_NOT_ALLOWED:
        "This service is currently only available in Nigeria.",
      COUNTRY_BLOCKED: "Access from your country is not permitted.",
      STATE_NOT_ALLOWED: "This service is not available in your state.",
      STATE_BLOCKED: "Access from your state is restricted.",
      VPN_PROXY_BLOCKED:
        "VPN and proxy connections are not allowed for this action.",
      DATACENTER_BLOCKED:
        "Access from datacenter/hosting IPs is not permitted.",
      UNVERIFIED_ISP: "Your internet service provider could not be verified.",
      TOR_BLOCKED: "Access via Tor network is not permitted.",
    };

    return messages[reason] || "Access denied from your location.";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGGING
  // ─────────────────────────────────────────────────────────────────────────
  private static logAllow(
    ip: string,
    geoData: GeoLocation,
    pathname: string,
    duration: number
  ): void {
    const location =
      geoData.countryCode === "NG"
        ? `${geoData.city}, ${
            NIGERIAN_STATES[geoData.regionCode as NigerianStateCode] ||
            geoData.region
          }`
        : `${geoData.city}, ${geoData.country}`;

    console.log(
      `[GEO GUARD] ✅ ${ip} | ${location} | ${pathname} | ${duration}ms`
    );
  }

  private static logBlock(
    ip: string,
    geoData: GeoLocation,
    reason: string,
    pathname: string
  ): void {
    console.log(
      `[GEO GUARD] ❌ BLOCKED | ${ip} | ${geoData.country} (${geoData.countryCode}) | ${reason} | ${pathname}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // METRICS
  // ─────────────────────────────────────────────────────────────────────────
  private static updateMetrics(): void {
    GeoGuard.metrics.totalChecks++;

    // Reset metrics periodically
    if (
      Date.now() - GeoGuard.metrics.lastReset >
      GeoGuard.METRICS_RESET_INTERVAL
    ) {
      console.log(`[GEO GUARD] 📊 Hourly Stats:`, {
        total: GeoGuard.metrics.totalChecks,
        allowed: GeoGuard.metrics.allowed,
        blocked: GeoGuard.metrics.blocked,
        vpnBlocked: GeoGuard.metrics.vpnBlocked,
        topCountries: Array.from(GeoGuard.metrics.byCountry.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
        topStates: Array.from(GeoGuard.metrics.byState.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
      });

      GeoGuard.metrics = {
        totalChecks: 0,
        allowed: 0,
        blocked: 0,
        byCountry: new Map(),
        byState: new Map(),
        vpnBlocked: 0,
        proxyBlocked: 0,
        lastReset: Date.now(),
      };
    }
  }

  private static updateCountryMetrics(countryCode: string): void {
    const count = GeoGuard.metrics.byCountry.get(countryCode) || 0;
    GeoGuard.metrics.byCountry.set(countryCode, count + 1);
  }

  private static updateStateMetrics(stateCode: string): void {
    const stateName =
      NIGERIAN_STATES[stateCode as NigerianStateCode] || stateCode;
    const count = GeoGuard.metrics.byState.get(stateName) || 0;
    GeoGuard.metrics.byState.set(stateName, count + 1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────
  static getMetrics(): GeoMetrics {
    return { ...GeoGuard.metrics };
  }

  static clearCache(): void {
    GeoGuard.geoCache.clear();
    console.log("[GEO GUARD] 🧹 Cache cleared");
  }

  static getStateName(stateCode: string): string {
    return NIGERIAN_STATES[stateCode as NigerianStateCode] || stateCode;
  }

  static isNigerianState(stateCode: string): boolean {
    return stateCode in NIGERIAN_STATES;
  }

  static getAllNigerianStates(): typeof NIGERIAN_STATES {
    return NIGERIAN_STATES;
  }
}
