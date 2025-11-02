// ========================================
// 🌍 TASK 9: GEO GUARD - Geographic Access Controller
// Responsibility: Block/allow requests based on geographic location
// ========================================

// File: src/lib/middleware/geoGuard.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";

interface GeoLocation {
  country: string;
  region: string;
  city: string;
  countryCode: string;
  regionCode: string;
  latitude?: number;
  longitude?: number;
}

interface GeoRestriction {
  allowedCountries: string[]; // ISO country codes
  blockedCountries: string[]; // ISO country codes
  allowedRegions: string[]; // Region codes
  blockedRegions: string[]; // Region codes
  allowVPN: boolean;
  allowTor: boolean;
}

export class GeoGuard {
  private static readonly DEFAULT_RESTRICTIONS: GeoRestriction = {
    allowedCountries: [], // Empty = allow all
    blockedCountries: ["CN", "RU", "KP"], // Block high-risk countries
    allowedRegions: [],
    blockedRegions: [],
    allowVPN: true,
    allowTor: false,
  };

  private static readonly API_RESTRICTIONS: GeoRestriction = {
    allowedCountries: ["US", "CA", "GB", "AU", "DE", "FR", "NL", "NG"], // Add Nigeria for your location
    blockedCountries: ["CN", "RU", "KP", "IR", "SY"],
    allowedRegions: [],
    blockedRegions: [],
    allowVPN: false, // Stricter for API access
    allowTor: false,
  };

  static async guard(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<NextResponse> {
    try {
      // Skip geo-blocking for localhost/development
      if (
        process.env.NODE_ENV === "development" ||
        context.clientIp === "192.168.0.159" ||
        context.clientIp === "10.68.64.13" ||
        context.clientIp === "localhost" ||
        context.clientIp === "unknown"
      ) {
        return NextResponse.next();
      }

      // Get geolocation data
      const geoData = await this.getGeoLocation(context.clientIp);
      if (!geoData) {
        // If we can't determine location, allow but log
        console.warn(
          `[GEO GUARD] Could not determine location for IP: ${context.clientIp}`
        );
        return NextResponse.next();
      }

      // Determine restrictions based on path
      const restrictions = this.getRestrictionsForPath(
        request.nextUrl.pathname
      );

      // Check country restrictions
      const countryBlocked = this.isCountryBlocked(
        geoData.countryCode,
        restrictions
      );
      if (countryBlocked) {
        console.log(
          `[GEO GUARD] ❌ Blocked request from ${geoData.country} (${geoData.countryCode})`
        );
        return this.createBlockedResponse(geoData, "COUNTRY_BLOCKED");
      }

      // Check region restrictions
      const regionBlocked = this.isRegionBlocked(
        geoData.regionCode,
        restrictions
      );
      if (regionBlocked) {
        console.log(
          `[GEO GUARD] ❌ Blocked request from region ${geoData.region}`
        );
        return this.createBlockedResponse(geoData, "REGION_BLOCKED");
      }

      // Check for VPN/Proxy (basic detection)
      const vpnDetected = await this.detectVPN(context.clientIp);
      if (vpnDetected && !restrictions.allowVPN) {
        console.log(
          `[GEO GUARD] ❌ Blocked VPN/Proxy request from ${context.clientIp}`
        );
        return this.createBlockedResponse(geoData, "VPN_BLOCKED");
      }

      // Add geo headers to response
      const response = NextResponse.next();
      response.headers.set("x-geo-country", geoData.countryCode);
      response.headers.set("x-geo-region", geoData.regionCode);
      response.headers.set("x-geo-city", geoData.city);

      console.log(
        `[GEO GUARD] ✅ Allowed request from ${geoData.city}, ${geoData.country}`
      );
      return response;
    } catch (error) {
      console.error("[GEO GUARD] Error in geo-blocking:", error);
      // On error, allow the request but log the issue
      return NextResponse.next();
    }
  }

  private static async getGeoLocation(ip: string): Promise<GeoLocation | null> {
    try {
      // Using ip-api.com (free tier: 1000 requests/hour)
      // In production, consider using a paid service like MaxMind
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(`http://ip-api.com/json/${ip}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const data = await response.json();

      if (data.status === "fail") return null;

      return {
        country: data.country || "Unknown",
        region: data.regionName || "Unknown",
        city: data.city || "Unknown",
        countryCode: data.countryCode || "XX",
        regionCode: data.region || "XX",
        latitude: data.lat,
        longitude: data.lon,
      };
    } catch (error) {
      console.error("[GEO GUARD] Geo-location lookup failed:", error);
      return null;
    }
  }

  private static getRestrictionsForPath(pathname: string): GeoRestriction {
    // API paths get stricter geo-restrictions
    if (pathname.startsWith("/api/v1")) {
      return this.API_RESTRICTIONS;
    }

    // Admin paths get moderate restrictions
    if (pathname.startsWith("/admin") || pathname.startsWith("/admin")) {
      return {
        ...this.DEFAULT_RESTRICTIONS,
        allowVPN: false, // No VPNs for admin access
      };
    }

    // Public paths get default restrictions
    return this.DEFAULT_RESTRICTIONS;
  }

  private static isCountryBlocked(
    countryCode: string,
    restrictions: GeoRestriction
  ): boolean {
    // If allowedCountries is specified and country is not in it
    if (restrictions.allowedCountries.length > 0) {
      return !restrictions.allowedCountries.includes(countryCode);
    }

    // Check blockedCountries
    return restrictions.blockedCountries.includes(countryCode);
  }

  private static isRegionBlocked(
    regionCode: string,
    restrictions: GeoRestriction
  ): boolean {
    // If allowedRegions is specified and region is not in it
    if (restrictions.allowedRegions.length > 0) {
      return !restrictions.allowedRegions.includes(regionCode);
    }

    // Check blockedRegions
    return restrictions.blockedRegions.includes(regionCode);
  }

  private static async detectVPN(ip: string): Promise<boolean> {
    try {
      // Basic VPN/Proxy detection using ip-api.com
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=proxy`,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) return false;

      const data = await response.json();
      return data.proxy === true;
    } catch (error) {
      // If VPN detection fails, assume no VPN
      return false;
    }
  }

  private static createBlockedResponse(
    geoData: GeoLocation,
    reason: string
  ): NextResponse {
    const errorResponse = {
      success: false,
      error: {
        code: reason,
        message: "Access denied from your location",
        country: geoData.country,
        countryCode: geoData.countryCode,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, {
      status: 403,
      headers: {
        "X-Geo-Block-Reason": reason,
        "X-Geo-Country": geoData.countryCode,
      },
    });
  }
}
