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
  UnifiedThreatSystem,
  ThreatDetectionResult,
} from "./UnifiedThreatSystem";
import {
  AuthenticatedActionHandler,
  AuthenticatedActionContext,
} from "./authenticatedActionHandler";
import { ComprehensiveHealthMonitor } from "./healthMonitor";
import { enhancedExecute } from "./executionWrapper";
import { type MiddlewareContext } from "./types";

/**
 * Defines the comprehensive result object returned by each middleware component.
 */
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

// 🚀 MAIN ORCHESTRATOR - Component Coordination
// ========================================

export class Orchestrator {
  static async execute(request: NextRequest): Promise<NextResponse> {
    const startTime = performance.now();
    let baseContext: MiddlewareContext;
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
    let response = NextResponse.next();

    const middlewareResults: MiddlewareResult[] = [];
    let threatDetectionResult: ThreatDetectionResult | null = null;

    try {
      // Initialize trusted sources
      if (!TrustedSourceManager.getTrustedSources().length) {
        TrustedSourceManager.initialize();
      }

      // STEP 1: Build Enhanced Context
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
        success: contextResult.success,
      });

      console.log(
        `[ORCHESTRATOR] Auth-aware execution: ${authContext.actionType} (${authContext.sensitivity})`
      );

      // STEP 2: Foundation Security Layer (SecurityGuard, EncryptionEnforcer, SessionTokenValidator)
      response = await this.executeFoundationLayer(
        request,
        authContext,
        middlewareResults
      );

      // Check if foundation layer returned a final response (e.g., redirect or block)
      if (response.status !== 200 || response.redirected) {
        return this.finalizeResponse(
          response,
          middlewareResults,
          startTime,
          threatDetectionResult,
          authContext.authAdjustments
        );
      }

      // STEP 3: Threat Detection
      threatDetectionResult = await this.executeThreatDetection(
        request,
        authContext,
        middlewareResults
      );

      // Note: Threat detection throws an error on block, handled by the catch block.

      // STEP 4: Secondary Security & Processing (GeoGuard, Cache, Behavior, Compliance, Transformer)
      response = await this.executeSecondaryLayer(
        request,
        authContext,
        response,
        middlewareResults
      );

      // STEP 5: Request passes all gates - Process the request, then log and finalize the response.

      // STEP 6: Activity Logging (Asynchronous, best effort)
      enhancedExecute(
        () => ActivityLogger.log(request, authContext),
        undefined,
        "ActivityLogger",
        authContext
      ).catch(() => {});

      return this.finalizeResponse(
        response,
        middlewareResults,
        startTime,
        threatDetectionResult,
        authContext.authAdjustments
      );
    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.error(
        `[ORCHESTRATOR] CRITICAL ERROR after ${Math.round(totalTime)}ms:`,
        error
      );

      // If an error occurred (e.g., threat block or critical failure), return a 503/error response
      return this.finalizeResponse(
        new NextResponse("Service Temporarily Unavailable", { status: 503 }),
        middlewareResults,
        startTime,
        threatDetectionResult,
        authContext?.authAdjustments || {
          sensitivityReduction: 0,
          trustBonus: 0,
        }
      );
    }
  }

  /**
   * Executes the critical, foundational security middleware.
   * Execution stops and the response is returned immediately if a critical middleware fails.
   */
  private static async executeFoundationLayer(
    request: NextRequest,
    authContext: AuthenticatedActionContext,
    middlewareResults: MiddlewareResult[]
  ): Promise<NextResponse> {
    let response = NextResponse.next();

    const foundationMiddleware = [
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
        critical: false, // Non-critical as it primarily updates authContext
      },
    ];

    for (const middleware of foundationMiddleware) {
      if (
        AuthenticatedActionHandler.shouldSkipMiddleware(
          middleware.name,
          authContext
        )
      ) {
        console.log(
          `[ORCHESTRATOR] Skipping ${middleware.name} for ${authContext.actionType}`
        );
        continue;
      }

      const executionResult = await enhancedExecute(
        middleware.fn,
        NextResponse.next(),
        middleware.name,
        authContext
      );

      middlewareResults.push({
        name: middleware.name,
        result: executionResult.result,
        logs: executionResult.logs,
        executionTime: executionResult.executionTime,
        status: executionResult.result.status,
        success: executionResult.success,
        authAdjustments: executionResult.authAdjustments,
        earlyExit: executionResult.result.status !== 200,
      });

      // Critical failure check
      if (middleware.critical && executionResult.result.status !== 200) {
        return executionResult.result;
      }

      // Handle redirect or early exit
      if (
        executionResult.result.redirected ||
        executionResult.result.status === 302
      ) {
        return executionResult.result;
      }

      response = ResponseMerger.merge(response, executionResult.result);
    }

    return response;
  }

  /**
   * Executes the Unified Threat System (UTS) to score the request.
   * Throws an error if the threat score exceeds the adaptive threshold.
   */
  private static async executeThreatDetection(
    request: NextRequest,
    authContext: AuthenticatedActionContext,
    middlewareResults: MiddlewareResult[]
  ): Promise<ThreatDetectionResult> {
    const threatSystem = UnifiedThreatSystem.getInstance();
    const totalAuthAdjustments =
      authContext.authAdjustments.sensitivityReduction +
      authContext.authAdjustments.trustBonus;

    const threatResult = await enhancedExecute(
      () =>
        threatSystem.analyzeRequest(request, authContext, totalAuthAdjustments),
      {
        threatScore: 0,
        decision: "ALLOW",
        details: {},
        response: NextResponse.next(),
      },
      "UnifiedThreatSystem",
      authContext
    );

    middlewareResults.push({
      name: "UnifiedThreatSystem",
      result: threatResult.result.response,
      logs: threatResult.logs,
      executionTime: threatResult.executionTime,
      status: threatResult.result.response.status,
      success: threatResult.success,
      threatScore: threatResult.result.threatScore,
      decision: threatResult.result.decision,
      earlyExit:
        threatResult.result.threatScore >
        AuthenticatedActionHandler.getThreatThreshold(authContext),
    });

    // Check for early exit due to high threat
    const blockThreshold =
      AuthenticatedActionHandler.getThreatThreshold(authContext);
    if (
      threatResult.result.threatScore > blockThreshold ||
      threatResult.result.response.redirected
    ) {
      console.log(
        `[ORCHESTRATOR] Threat block: ${threatResult.result.decision} (Score: ${threatResult.result.threatScore} / Threshold: ${blockThreshold})`
      );
      // Throw an error to trigger the main try/catch block for graceful exit
      throw new Error(
        "Threat detected: Request blocked by UnifiedThreatSystem."
      );
    }

    return threatResult.result;
  }

  /**
   * Executes the secondary, non-critical middleware components.
   * Checks for Cache Hit or Geo-block early exits.
   */
  private static async executeSecondaryLayer(
    request: NextRequest,
    authContext: AuthenticatedActionContext,
    currentResponse: NextResponse,
    middlewareResults: MiddlewareResult[]
  ): Promise<NextResponse> {
    let response = currentResponse;

    const secondaryMiddleware = [
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

    for (const middleware of secondaryMiddleware) {
      if (
        AuthenticatedActionHandler.shouldSkipMiddleware(
          middleware.name,
          authContext
        )
      ) {
        console.log(
          `[ORCHESTRATOR] Skipping ${middleware.name} for auth action`
        );
        continue;
      }

      const executionResult = await enhancedExecute(
        middleware.fn,
        NextResponse.next(),
        middleware.name,
        authContext
      );

      middlewareResults.push({
        name: middleware.name,
        result: executionResult.result,
        logs: executionResult.logs,
        executionTime: executionResult.executionTime,
        status: executionResult.result.status,
        success: executionResult.success,
      });

      // Handle early exits: Cache Hit or Geo-block
      if (
        executionResult.result.headers.get("x-cache") === "HIT" &&
        !authContext.isAuthAction
      ) {
        console.log(`[ORCHESTRATOR] Cache hit early exit.`);
        return executionResult.result;
      }

      if (executionResult.result.status === 403) {
        console.log(`[ORCHESTRATOR] ${middleware.name} 403 early exit.`);
        return executionResult.result;
      }

      response = ResponseMerger.merge(response, executionResult.result);
    }

    return response;
  }

  /**
   * Adds final headers and prints the comprehensive execution summary.
   */
  private static finalizeResponse(
    response: NextResponse,
    middlewareResults: MiddlewareResult[],
    startTime: number,
    threatResult: ThreatDetectionResult | null,
    authAdjustments: { sensitivityReduction: number; trustBonus: number }
  ): NextResponse {
    const totalTime = performance.now() - startTime;

    response = ResponseMerger.addSystemHeaders(response, Math.round(totalTime));

    // Add comprehensive intelligence headers
    if (threatResult) {
      response.headers.set(
        "X-Total-Threat-Score",
        threatResult.threatScore.toString()
      );
      response.headers.set("X-Threat-Decision", threatResult.decision);
    }

    const totalAuthAdjustments =
      authAdjustments.sensitivityReduction + authAdjustments.trustBonus;
    response.headers.set("X-Auth-Adjustments", totalAuthAdjustments.toString());
    response.headers.set(
      "X-Middleware-Count",
      middlewareResults.length.toString()
    );

    this.addComprehensiveLogsToResponse(response, middlewareResults);
    this.printComprehensiveExecutionSummary(
      middlewareResults,
      totalTime,
      threatResult,
      authAdjustments
    );

    return response;
  }

  /**
   * Adds a compressed summary of middleware execution to a response header.
   */
  private static addComprehensiveLogsToResponse(
    response: NextResponse,
    results: MiddlewareResult[]
  ): void {
    try {
      const summary = results.map((result) => ({
        name: result.name,
        status: result.status,
        executionTime: Math.round(result.executionTime * 100) / 100,
        threatScore: result.threatScore || 0,
        success: result.success,
        decision: result.decision,
        earlyExit: result.earlyExit,
      }));

      const summaryString = JSON.stringify(summary);
      if (summaryString.length <= 4000) {
        response.headers.set("X-Comprehensive-Summary", summaryString);
      } else {
        // Truncate if too long for a single header
        response.headers.set(
          "X-Comprehensive-Summary",
          summaryString.substring(0, 3997) + "..."
        );
        response.headers.set("X-Summary-Truncated", "true");
      }
    } catch (error) {
      console.error("[ORCHESTRATOR] Error adding logs:", error);
    }
  }

  /**
   * Prints a clean, console-based summary of the request execution flow.
   */
  private static printComprehensiveExecutionSummary(
    results: MiddlewareResult[],
    totalTime: number,
    threatResult: ThreatDetectionResult | null,
    authAdjustments: { sensitivityReduction: number; trustBonus: number }
  ): void {
    console.log("\n[ORCHESTRATOR] COMPREHENSIVE EXECUTION SUMMARY:");
    console.log("=".repeat(100));

    results.forEach((result, index) => {
      const statusIcon = result.success ? "✅" : "❌";
      const threatIcon = (result.threatScore || 0) > 50 ? "⚠️" : "";

      console.log(
        `${(index + 1).toString().padStart(2)}. ${statusIcon}${threatIcon} ` +
          `${result.name.padEnd(25)} | ` +
          `Status: ${result.status.toString().padStart(3)} | ` +
          `Time: ${result.executionTime.toFixed(2).padStart(8)}ms | ` +
          `Threat: ${(result.threatScore || 0).toString().padStart(2)} | ` +
          `Decision: ${(result.decision || "N/A").padEnd(10)}`
      );

      // console.info(`\n    Logs: ${result.logs.join(" | ")}`);
    });

    console.log("=".repeat(100));

    if (threatResult) {
      console.log(
        `[INTELLIGENCE] Total Threat: ${threatResult.threatScore}, ` +
          `Decision: ${threatResult.decision}, ` +
          `Auth Adjustments: ${
            authAdjustments.sensitivityReduction + authAdjustments.trustBonus
          }`
      );
    }

    const healthStatus = ComprehensiveHealthMonitor.getComprehensiveStatus();
    const unhealthyCount = Object.values(healthStatus).filter(
      (h: { healthy: boolean }) => !h.healthy
    ).length;

    console.log(
      `[ORCHESTRATOR] ✅ ${results.length} MIDDLEWARE COMPLETED in ${Math.round(
        totalTime
      )}ms | ` +
        `Health: ${
          unhealthyCount === 0
            ? "✅ ALL HEALTHY"
            : `⚠️ ${unhealthyCount} ISSUES`
        } | ` +
        `Mode: COMPONENT-COORDINATED`
    );
  }

  /**
   * Provides a comprehensive report on the Orchestrator's status and capabilities.
   */
  static getComprehensiveReport() {
    return {
      health: ComprehensiveHealthMonitor.getComprehensiveStatus(),
      features: {
        comprehensiveThreatDetection: true,
        authenticatedActionHandling: true,
        trustedSourceManagement: true,
        adaptiveLearning: true,
        authAwareExecution: true,
        circuitBreaker: true,
        enhancedLogging: true,
        detailedResponseHeaders: true,
        componentCoordination: true,
        performanceOptimizations: true,
        modularArchitecture: true,
        unifiedThreatSystem: true,
        executionWrapper: true,
        contextBuilder: true,
        sessionTokenValidator: true,
        securityGuard: true,
        encryptionEnforcer: true,
        geoGuard: true,
        trustedSourceManager: true,
        behaviorAnalyst: true,
        complianceMonitor: true,
        requestTransformer: true,
        cacheManager: true,
        apiAccessGuardian: true,
        enhancedRateEnforcer: true,
        activityLogger: true,
        accessController: true,
        responseMerger: true,
        authenticatedActionHandler: true,
        healthMonitor: true,
        orchestrator: true,
      },
      version: "2.0.0",
      timestamp: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
      generatedBy: "Orchestrator v2.0.0",
      environment: process.env.NODE_ENV || "development",
      // Optional runtime environment details are commented out as they rely on node-specific globals:
      // nodeVersion: process.version,
      // platform: process.platform,
      // memoryUsage: process.memoryUsage(),
    };
  }
}
