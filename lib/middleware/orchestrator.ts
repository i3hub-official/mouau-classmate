// src/lib/middleware/Orchestrator.ts
import { NextRequest, NextResponse } from "next/server";
import { ContextBuilder } from "./contextBuilder";
import { SessionTokenValidator } from "./sessionTokenValidator";
import { SecurityGuard } from "./securityGuard";
import { EncryptionEnforcer } from "./encryptionEnforcer";
import { GeoGuard } from "./geoGuard";
import { TrustedSourceManager } from "./trustedSourceManager";
import { BehaviorAnalyst } from "./behaviorAnalyst";
import { ComplianceMonitor } from "./complianceMonitor";
import { RequestTransformer } from "./requestTransformer";
import { CacheManager } from "./cacheManager";
import { ActivityLogger } from "./activityLogger";
import { ResponseMerger } from "./responseMerger";
import {
  AuthenticatedActionHandler,
  AuthenticatedActionContext,
} from "./authenticatedActionHandler";
import { ComprehensiveHealthMonitor } from "./healthMonitor";
import { enhancedExecute } from "./executionWrapper";
import { type MiddlewareContext } from "./types";

// Import the NEW defense system (singleton)
import { Defense } from "./UnifiedThreatDefenseSystem";

interface MiddlewareResult {
  name: string;
  result: NextResponse;
  logs: string[];
  executionTime: number;
  status: number;
  success: boolean;
  authAdjustments?: { sensitivityReduction: number; trustBonus: number };
  earlyExit?: boolean;
  threatScore?: number;
  decision?: string;
}

export class Orchestrator {
  static async execute(request: NextRequest): Promise<NextResponse> {
    const startTime = performance.now();
    let baseContext: MiddlewareContext = {} as MiddlewareContext;
    let authContext: AuthenticatedActionContext = {
      actionType: "none",
      sensitivity: "low",
      isAuthAction: false,
      authAdjustments: { sensitivityReduction: 0, trustBonus: 0 },
      isPublicPath: false,
      isAuthPath: false,
      isPrivatePath: false,
      hasSession: false,
      userId: null,
      userRole: "guest",
      sessionData: null,
      clientIp: "",
      userAgent: "",
      timestamp: Date.now(),
    };

    const middlewareResults: MiddlewareResult[] = [];
    let finalResponse: NextResponse = NextResponse.next();

    try {
      // Initialize trusted sources
      if (!TrustedSourceManager.getTrustedSources().length) {
        TrustedSourceManager.initialize();
      }

      // STEP 1: Build Context
      const contextResult = await enhancedExecute(
        () => ContextBuilder.build(request),
        {} as MiddlewareContext,
        "ContextBuilder"
      );

      baseContext = contextResult.result;
      authContext = AuthenticatedActionHandler.enhanceContext(
        request,
        baseContext
      );

      middlewareResults.push({
        name: "ContextBuilder",
        result: NextResponse.next(),
        logs: contextResult.logs,
        executionTime: contextResult.executionTime,
        status: 200,
        success: true,
      });

      console.log(
        `[ORCHESTRATOR] Action: ${authContext.actionType} | Sensitivity: ${authContext.sensitivity}`
      );

      // STEP 2: Foundation Security (Critical)
      finalResponse = await this.executeFoundationLayer(
        request,
        authContext,
        middlewareResults
      );
      if (finalResponse.status !== 200 || finalResponse.redirected) {
        return this.finalizeResponse(
          finalResponse,
          middlewareResults,
          startTime,
          authContext.authAdjustments
        );
      }

      // STEP 3: ULTIMATE THREAT DEFENSE (AI-Powered)
      const defenseResponse = await Defense.defend(request, baseContext);

      // Check if defense blocked or challenged
      const defenseAction = defenseResponse.headers.get("x-action") || "ALLOW";
      const finalScore = parseFloat(
        defenseResponse.headers.get("x-threat-final") || "0"
      );

      middlewareResults.push({
        name: "UnifiedThreatDefense",
        result: defenseResponse,
        logs: [`Action: ${defenseAction}`, `Score: ${finalScore.toFixed(1)}`],
        executionTime: 0,
        status: defenseResponse.status,
        success: defenseAction === "ALLOW",
        threatScore: finalScore,
        decision: defenseAction,
        earlyExit: !["ALLOW", "RATE_LIMIT"].includes(defenseAction),
      });

      // BLOCK, CHALLENGE, NEUTRALIZE → return immediately
      if (!["ALLOW", "RATE_LIMIT"].includes(defenseAction)) {
        console.log(
          `[DEFENSE] ${defenseAction} → Blocking request (Score: ${finalScore})`
        );
        return this.finalizeResponse(
          defenseResponse,
          middlewareResults,
          startTime,
          authContext.authAdjustments
        );
      }

      // Optional: Validate PoW if challenge was issued previously
      if (defenseResponse.status === 401) {
        const solved = Defense.validatePoW(request, baseContext.clientIp);
        if (solved) {
          console.log(
            `[DEFENSE] PoW solved by ${baseContext.clientIp} → granting access`
          );
          finalResponse = NextResponse.next();
        } else {
          return this.finalizeResponse(
            defenseResponse,
            middlewareResults,
            startTime,
            authContext.authAdjustments
          );
        }
      }

      // STEP 4: Secondary Layer (Non-critical)
      finalResponse = await this.executeSecondaryLayer(
        request,
        authContext,
        defenseResponse,
        middlewareResults
      );

      // STEP 5: Async Logging
      enhancedExecute(
        () => ActivityLogger.log(request, authContext),
        undefined,
        "ActivityLogger"
      ).catch(() => {});

      return this.finalizeResponse(
        finalResponse,
        middlewareResults,
        startTime,
        authContext.authAdjustments
      );
    } catch (error) {
      console.error(
        `[ORCHESTRATOR] Fatal error after ${(
          performance.now() - startTime
        ).toFixed(1)}ms:`,
        error
      );
      const errorResponse = new NextResponse("Internal Server Error", {
        status: 503,
      });
      return this.finalizeResponse(
        errorResponse,
        middlewareResults,
        startTime,
        authContext.authAdjustments || {
          sensitivityReduction: 0,
          trustBonus: 0,
        }
      );
    }
  }

  // ... (keep your foundation & secondary layer methods unchanged below)
  // Only minor improvements below:

  private static async executeFoundationLayer(
    request: NextRequest,
    authContext: AuthenticatedActionContext,
    results: MiddlewareResult[]
  ): Promise<NextResponse> {
    let response = NextResponse.next();

    const layers = [
      {
        name: "SecurityGuard",
        fn: () => SecurityGuard.apply(request, authContext),
        critical: true,
      },
      {
        name: "EncryptionEnforcer",
        fn: () => EncryptionEnforcer.enforce(request, authContext),
        critical: true,
      },
      {
        name: "SessionTokenValidator",
        fn: () => SessionTokenValidator.validate(request, authContext),
        critical: false,
      },
    ];

    for (const layer of layers) {
      if (
        AuthenticatedActionHandler.shouldSkipMiddleware(layer.name, authContext)
      )
        continue;

      const res = await enhancedExecute(
        layer.fn,
        NextResponse.next(),
        layer.name,
        authContext
      );
      results.push({
        ...res,
        name: layer.name,
        status: res.result.status,
        earlyExit: res.result.status !== 200,
      });

      if (layer.critical && res.result.status !== 200) return res.result;
      if (res.result.redirected) return res.result;

      response = ResponseMerger.merge(response, res.result);
    }

    return response;
  }

  private static async executeSecondaryLayer(
    request: NextRequest,
    authContext: AuthenticatedActionContext,
    current: NextResponse,
    results: MiddlewareResult[]
  ): Promise<NextResponse> {
    let response = current;

    const layers = [
      { name: "GeoGuard", fn: () => GeoGuard.guard(request, authContext) },
      {
        name: "CacheManager",
        fn: () => CacheManager.manage(request, authContext),
      },
      {
        name: "BehaviorAnalyst",
        fn: () => BehaviorAnalyst.analyze(request, authContext),
      },
      {
        name: "ComplianceMonitor",
        fn: () => ComplianceMonitor.monitor(request, authContext),
      },
      {
        name: "RequestTransformer",
        fn: () => RequestTransformer.transform(request, authContext),
      },
    ];

    for (const layer of layers) {
      if (
        AuthenticatedActionHandler.shouldSkipMiddleware(layer.name, authContext)
      ) {
        continue;
      }

      try {
        const res = await enhancedExecute(
          layer.fn,
          NextResponse.next(),
          layer.name,
          authContext
        );

        results.push({
          ...res,
          name: layer.name,
          status: res.result.status,
          executionTime: res.executionTime,
        });

        // Early cache hit?
        if (res.result.headers.get("x-cache")?.startsWith("HIT")) {
          return res.result;
        }

        // Hard reject?
        if (res.result.status >= 400 && res.result.status < 500) {
          return res.result;
        }

        response = ResponseMerger.merge(response, res.result);
      } catch (err) {
        console.error(`[ORCHESTRATOR] ${layer.name} crashed:`, err);
        // Don't let one bad module kill everything
        continue;
      }
    }

    return response;
  }

  private static finalizeResponse(
    response: NextResponse,
    results: MiddlewareResult[],
    startTime: number,
    adjustments: { sensitivityReduction: number; trustBonus: number }
  ): NextResponse {
    const totalTime = performance.now() - startTime;
    response = ResponseMerger.addSystemHeaders(response, Math.round(totalTime));

    const defenseResult = results.find(
      (r) => r.name === "UnifiedThreatDefense"
    );
    if (defenseResult) {
      response.headers.set(
        "X-Threat-Final",
        defenseResult.threatScore?.toFixed(1) || "0"
      );
      response.headers.set(
        "X-Defense-Action",
        defenseResult.decision || "ALLOW"
      );
    }

    this.printSummary(results, totalTime, adjustments);
    return response;
  }

  private static printSummary(
    results: MiddlewareResult[],
    totalTime: number,
    adj: any
  ) {
    console.log("\n[ORCHESTRATOR] EXECUTION COMPLETE");
    console.log("=".repeat(80));
    results.forEach((r, i) => {
      const icon = r.success ? "Success" : "Failed";
      if (r.name === "UnifiedThreatDefense") {
        console.log(
          `${i + 1}. ${icon} ${r.name.padEnd(28)} → ${
            r.decision
          } (Score: ${r.threatScore?.toFixed(1)})`
        );
      } else {
        console.log(
          `${i + 1}. ${icon} ${r.name.padEnd(28)} → ${
            r.status
          } ${r.executionTime.toFixed(1)}ms`
        );
      }
    });
    console.log("=".repeat(80));
    console.log(`Completed in ${totalTime.toFixed(1)}ms | Mode: AI-DEFENDED\n`);
  }
}
