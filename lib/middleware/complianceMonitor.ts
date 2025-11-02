// ========================================
// 🎯 TASK 16: COMPLIANCE MONITOR - Regulatory Compliance Guard
// Responsibility: Ensure GDPR, CCPA, and other privacy law compliance
// ========================================

// File: src/lib/middleware/complianceMonitor.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";

interface ComplianceFlags {
  requiresCookieConsent: boolean;
  requiresDataProcessingConsent: boolean;
  subjectToGDPR: boolean;
  subjectToCCPA: boolean;
  requiresAuditLog: boolean;
}

export class ComplianceMonitor {
  private static readonly GDPR_COUNTRIES = [
    "AT",
    "BE",
    "BG",
    "HR",
    "CY",
    "CZ",
    "DK",
    "EE",
    "FI",
    "FR",
    "DE",
    "GR",
    "HU",
    "IE",
    "IT",
    "LV",
    "LT",
    "LU",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SK",
    "SI",
    "ES",
    "SE",
  ];

  private static readonly CCPA_STATES = ["CA"]; // California

  static monitor(
    request: NextRequest,
    context: MiddlewareContext
  ): NextResponse {
    try {
      const flags = this.determineComplianceFlags(request, context);

      // Check for required consents
      if (flags.requiresCookieConsent && !this.hasCookieConsent(request)) {
        console.log(`[COMPLIANCE MONITOR] ⚠️ Cookie consent required`);
      }

      if (flags.subjectToGDPR && this.isDataProcessingRequest(request)) {
        if (!this.hasDataProcessingConsent(request)) {
          console.log(
            `[COMPLIANCE MONITOR] ⚠️ GDPR data processing consent missing`
          );
        }
      }

      // Add compliance headers
      const response = NextResponse.next();
      this.addComplianceHeaders(response, flags);

      // Log data processing activities for audit trail
      if (flags.requiresAuditLog) {
        this.logDataProcessingActivity(request, context, flags);
      }

      return response;
    } catch (error) {
      console.error(
        "[COMPLIANCE MONITOR] Error in compliance monitoring:",
        error
      );
      return NextResponse.next();
    }
  }

  private static determineComplianceFlags(
    request: NextRequest,
    context: MiddlewareContext
  ): ComplianceFlags {
    const geoCountry = request.headers.get("x-geo-country") || "";
    const geoRegion = request.headers.get("x-geo-region") || "";

    return {
      requiresCookieConsent: true, // Always require for safety
      requiresDataProcessingConsent: this.GDPR_COUNTRIES.includes(geoCountry),
      subjectToGDPR: this.GDPR_COUNTRIES.includes(geoCountry),
      subjectToCCPA:
        geoCountry === "US" && this.CCPA_STATES.includes(geoRegion),
      requiresAuditLog: this.isDataSensitivePath(request.nextUrl.pathname),
    };
  }

  private static hasCookieConsent(request: NextRequest): boolean {
    return (
      request.cookies.has("cookie-consent") &&
      request.cookies.get("cookie-consent")?.value === "accepted"
    );
  }

  private static hasDataProcessingConsent(request: NextRequest): boolean {
    return (
      request.cookies.has("data-processing-consent") &&
      request.cookies.get("data-processing-consent")?.value === "granted"
    );
  }

  private static isDataProcessingRequest(request: NextRequest): boolean {
    return (
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) ||
      request.nextUrl.pathname.includes("/api/")
    );
  }

  private static isDataSensitivePath(pathname: string): boolean {
    const sensitivePaths = [
      "/api/v1/audit",
      "/api/v1/auth",
      "/api/v2",
      "/api/auth",
      "/admin",
    ];

    return sensitivePaths.some((path) => pathname.startsWith(path));
  }

  private static addComplianceHeaders(
    response: NextResponse,
    flags: ComplianceFlags
  ): void {
    response.headers.set("x-gdpr-applicable", flags.subjectToGDPR.toString());
    response.headers.set("x-ccpa-applicable", flags.subjectToCCPA.toString());
    response.headers.set(
      "x-cookie-consent-required",
      flags.requiresCookieConsent.toString()
    );

    if (flags.subjectToGDPR) {
      response.headers.set("x-data-processing-basis", "consent");
      response.headers.set(
        "x-gdpr-rights",
        "access,rectification,erasure,portability,restrict,object"
      );
    }
  }

  private static logDataProcessingActivity(
    request: NextRequest,
    context: MiddlewareContext,
    flags: ComplianceFlags
  ): void {
    const activity = {
      timestamp: new Date().toISOString(),
      method: request.method,
      path: request.nextUrl.pathname,
      userIP: context.clientIp,
      gdprApplicable: flags.subjectToGDPR,
      ccpaApplicable: flags.subjectToCCPA,
      legalBasis: flags.subjectToGDPR ? "consent" : "legitimate_interest",
      dataCategories: this.identifyDataCategories(request.nextUrl.pathname),
    };

    console.log(
      `[COMPLIANCE MONITOR] 📋 Data processing logged:`,
      JSON.stringify(activity)
    );
  }

  private static identifyDataCategories(pathname: string): string[] {
    if (pathname.includes("/audit")) return ["audit_logs", "user_activity"];
    if (pathname.includes("/auth"))
      return ["authentication_data", "session_data"];
    if (pathname.includes("/admin")) return ["administrative_data"];
    return ["general_usage"];
  }
}
