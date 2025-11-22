// ========================================
// 🎯 TASK 16: COMPLIANCE MONITOR - Regulatory Compliance Guard
// Responsibility: Ensure GDPR, CCPA, and other privacy law compliance
// ========================================

// src/lib/middleware/complianceMonitor.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";
import { ClientIPDetector } from "@/lib/clientIp";
import { prisma } from "@/lib/server/prisma";

/**
 * ComplianceMonitor — The Legal Shield
 * Enforces GDPR, CCPA, LGPD, HIPAA-ready logging, and global privacy compliance.
 * Never blocks — only observes, logs, and enforces transparency.
 */
export class ComplianceMonitor {
  // ─────────────────────────────────────────────────────────────────────
  // Geo-Jurisdiction Lists (2025)
  // ─────────────────────────────────────────────────────────────────────
  private static readonly JURISDICTIONS = {
    GDPR: new Set([
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
      "IS",
      "LI",
      "NO",
      "CH",
      "GB",
      "GI",
      "JE",
      "GG",
      "IM",
    ]),
    CCPA: new Set(["CA"]),
    LGPD: new Set(["BR"]),
    PIPEDA: new Set(["CA"]),
    APPI: new Set(["JP"]),
    PDPA_SG: new Set(["SG"]),
    PDPA_TH: new Set(["TH"]),
  };

  // Paths that trigger data subject rights (access, deletion, etc.)
  private static readonly DSR_PATHS = new Set([
    "/api/v1/privacy/request-access",
    "/api/v1/privacy/request-deletion",
    "/api/v1/privacy/request-portability",
    "/api/v1/privacy/do-not-sell",
  ]);

  // Sensitive data categories (for audit logs)
  private static readonly DATA_CATEGORIES = {
    AUTH: ["email", "password_hash", "session_token", "ip_address"],
    PROFILE: ["name", "phone", "address", "matric_number"],
    ACADEMIC: ["grades", "attendance", "transcript"],
    HEALTH: ["medical_records", "counseling_notes"],
    FINANCIAL: ["tuition_payments", "scholarships"],
  };

  static monitor(
    request: NextRequest,
    context: MiddlewareContext
  ): NextResponse {
    const response = NextResponse.next();
    const ipInfo = ClientIPDetector.getClientIP(request);
    const pathname = request.nextUrl.pathname;

    try {
      // Fixed: Use ComplianceMonitor.evaluateCompliance instead of this.evaluateCompliance
      const compliance = ComplianceMonitor.evaluateCompliance(
        request,
        context,
        ipInfo
      );

      // Add compliance transparency headers
      ComplianceMonitor.applyComplianceHeaders(response, compliance);

      // Fire-and-forget audit trail (never blocks request)
      ComplianceMonitor.recordDataProcessingActivity(
        request,
        context,
        compliance,
        ipInfo
      ).catch(() => {});

      // DSR Request Detection (Data Subject Rights)
      if (ComplianceMonitor.DSR_PATHS.has(pathname)) {
        response.headers.set("x-dsr-request", "true");
        response.headers.set(
          "x-dsr-type",
          pathname.split("/").pop() || "unknown"
        );
      }

      return response;
    } catch (error) {
      console.error("[COMPLIANCE MONITOR] Critical error:", error);
      return response;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Compliance Evaluation Engine
  // ─────────────────────────────────────────────────────────────────────
  private static evaluateCompliance(
    request: NextRequest,
    context: MiddlewareContext,
    ipInfo: any
  ): ComplianceProfile {
    const country = ipInfo.country || "XX";
    const region = ipInfo.region || "";

    const isGDPR = ComplianceMonitor.JURISDICTIONS.GDPR.has(country);
    const isCCPA =
      country === "US" && ComplianceMonitor.JURISDICTIONS.CCPA.has(region);
    const isLGPD = country === "BR";
    const isHighRisk = isGDPR || isCCPA || isLGPD;

    const consent = ComplianceMonitor.readConsentState(request);

    return {
      jurisdiction: {
        country,
        region,
        gdpr: isGDPR,
        ccpa: isCCPA,
        lgpd: isLGPD,
        pipeda: ComplianceMonitor.JURISDICTIONS.PIPEDA.has(country),
        appi: ComplianceMonitor.JURISDICTIONS.APPI.has(country),
      },
      consent,
      requiresCookieConsent: isHighRisk || !consent.cookies,
      requiresProcessingConsent: isGDPR && !consent.processing,
      dataCategories: ComplianceMonitor.identifyDataCategories(request),
      legalBasis: ComplianceMonitor.determineLegalBasis(
        request,
        consent,
        isGDPR
      ),
      retentionPeriodDays: ComplianceMonitor.getRetentionPeriod(request),
      isDSR: ComplianceMonitor.DSR_PATHS.has(request.nextUrl.pathname),
      requiresAudit:
        Boolean(context.isPrivatePath) ||
        isHighRisk ||
        Boolean(context.isAuthenticated),
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Consent Detection (Multi-Standard)
  // ─────────────────────────────────────────────────────────────────────
  private static readConsentState(request: NextRequest): {
    cookies: boolean;
    analytics: boolean;
    processing: boolean;
    marketing: boolean;
    version: string;
    timestamp?: number;
  } {
    const consentCookie = request.cookies.get("privacy-consent");
    if (!consentCookie?.value) {
      return {
        cookies: false,
        analytics: false,
        processing: false,
        marketing: false,
        version: "none",
      };
    }

    try {
      const parsed = JSON.parse(decodeURIComponent(consentCookie.value));
      return {
        cookies: parsed.cookies === true,
        analytics: parsed.analytics === true,
        processing: parsed.processing === true,
        marketing: parsed.marketing === true,
        version: parsed.v || "legacy",
        timestamp: parsed.ts,
      };
    } catch {
      return {
        cookies: false,
        analytics: false,
        processing: false,
        marketing: false,
        version: "invalid",
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Data Classification
  // ─────────────────────────────────────────────────────────────────────
  private static identifyDataCategories(request: NextRequest): string[] {
    const path = request.nextUrl.pathname.toLowerCase();
    const categories: string[] = [];

    if (path.includes("auth") || path.includes("session"))
      categories.push("authentication");
    if (
      path.includes("profile") ||
      path.includes("student") ||
      path.includes("teacher")
    ) {
      categories.push("personal_data", "educational_records");
    }
    if (path.includes("grade") || path.includes("exam"))
      categories.push("academic_performance");
    if (path.includes("payment") || path.includes("billing"))
      categories.push("financial_data");
    if (path.includes("health") || path.includes("counseling"))
      categories.push("health_data");

    return categories.length > 0 ? categories : ["general_usage"];
  }

  private static determineLegalBasis(
    request: NextRequest,
    consent: any,
    isGDPR: boolean
  ): "consent" | "contract" | "legitimate_interest" | "legal_obligation" {
    if (consent.processing && isGDPR) return "consent";
    if (request.nextUrl.pathname.includes("/auth/")) return "contract";
    if (request.nextUrl.pathname.includes("/gradebook")) return "contract";
    return "legitimate_interest";
  }

  private static getRetentionPeriod(request: NextRequest): number {
    const path = request.nextUrl.pathname;
    if (path.includes("session")) return 30;
    if (path.includes("audit")) return 2555; // 7 years
    if (path.includes("grade")) return 2555;
    return 730; // 2 years default
  }

  // ─────────────────────────────────────────────────────────────────────
  // Compliance Headers (Transparency)
  // ─────────────────────────────────────────────────────────────────────
  private static applyComplianceHeaders(
    response: NextResponse,
    profile: ComplianceProfile
  ): void {
    response.headers.set(
      "x-privacy-jurisdiction",
      `${profile.jurisdiction.country}-${
        profile.jurisdiction.gdpr ? "GDPR" : "NON-GDPR"
      }`
    );
    response.headers.set(
      "x-gdpr-applies",
      profile.jurisdiction.gdpr.toString()
    );
    response.headers.set(
      "x-ccpa-applies",
      profile.jurisdiction.ccpa.toString()
    );
    response.headers.set(
      "x-consent-cookies",
      profile.consent.cookies.toString()
    );
    response.headers.set(
      "x-consent-processing",
      profile.consent.processing.toString()
    );
    response.headers.set("x-legal-basis", profile.legalBasis);
    response.headers.set(
      "x-data-retention-days",
      profile.retentionPeriodDays.toString()
    );
    response.headers.set("x-data-categories", profile.dataCategories.join(","));

    if (profile.isDSR) {
      response.headers.set("x-dsr-processing", "true");
      response.headers.set("x-dsr-response-time", "30-days");
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Audit Trail (GDPR Art. 30, CCPA §1798.105)
  // ─────────────────────────────────────────────────────────────────────
  private static async recordDataProcessingActivity(
    request: NextRequest,
    context: MiddlewareContext,
    profile: ComplianceProfile,
    ipInfo: any
  ): Promise<void> {
    if (!profile.requiresAudit) return;

    try {
      await prisma.dataProcessingLog.create({
        data: {
          requestId: context.requestId || "unknown",
          userId: context.userId || null,
          timestamp: new Date(),
          method: request.method,
          path: request.nextUrl.pathname,
          ipAddress: ipInfo.ip,
          country: ipInfo.country || "unknown",
          jurisdiction: {
            gdpr: profile.jurisdiction.gdpr,
            ccpa: profile.jurisdiction.ccpa,
            lgpd: profile.jurisdiction.lgpd,
          },
          dataCategories: profile.dataCategories,
          legalBasis: profile.legalBasis,
          consentGiven: profile.consent.processing,
          retentionDays: profile.retentionPeriodDays,
          purpose: profile.dataCategories.join(", "),
        },
      });
    } catch {
      // Never block request
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────
interface ComplianceProfile {
  jurisdiction: {
    country: string;
    region: string;
    gdpr: boolean;
    ccpa: boolean;
    lgpd: boolean;
    pipeda: boolean;
    appi: boolean;
  };
  consent: {
    cookies: boolean;
    analytics: boolean;
    processing: boolean;
    marketing: boolean;
    version: string;
  };
  requiresCookieConsent: boolean;
  requiresProcessingConsent: boolean;
  dataCategories: string[];
  legalBasis:
    | "consent"
    | "contract"
    | "legitimate_interest"
    | "legal_obligation";
  retentionPeriodDays: number;
  isDSR: boolean;
  requiresAudit: boolean;
}
