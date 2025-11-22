// src/lib/middleware/executionWrapper.ts
import { performance } from "perf_hooks";
import { ComprehensiveHealthMonitor } from "./healthMonitor";
import type { AuthenticatedActionContext } from "./authenticatedActionHandler";

/**
 * enhancedExecute — The Ultimate Safe Executor
 * Zero-crash, observable, circuit-breaker aware, auth-smart.
 */
export async function enhancedExecute<T>(
  operation: () => Promise<T> | T,
  options: {
    fallback: T;
    name: string;
    context?: AuthenticatedActionContext;
    request?: Request;
  }
): Promise<{
  result: T;
  logs: string[];
  executionTime: number;
  success: boolean;
  threatScore?: number;
  authAdjustments?: {
    sensitivityReduction: number;
    trustBonus: number;
  };
}> {
  const start = performance.now();
  const logs: string[] = [];
  let threatScore: number | undefined;
  let success = false;

  const { fallback, name, context } = options;

  // Circuit breaker check
  if (ComprehensiveHealthMonitor.shouldSkip(name)) {
    logs.push(`[CIRCUIT] ${name} skipped — circuit breaker open`);
    return {
      result: fallback,
      logs,
      executionTime: 0,
      success: false,
      authAdjustments: { sensitivityReduction: 0, trustBonus: 0 },
    };
  }

  // Auth-aware adjustments
  const authAdjustments = { sensitivityReduction: 0, trustBonus: 0 };
  if (context) {
    if (context.sensitivity === "critical") {
      authAdjustments.sensitivityReduction = 25;
      logs.push(`[AUTH] Critical action → reducing threat sensitivity by 25`);
    } else if (context.sensitivity === "high") {
      authAdjustments.sensitivityReduction = 12;
    }

    if (
      context.userContext &&
      typeof context.userContext.trustScore === "number" &&
      context.userContext.trustScore >= 85
    ) {
      authAdjustments.trustBonus = 20;
      logs.push(
        `[AUTH] Trusted user (score: ${context.userContext.trustScore}) → +20 trust bonus`
      );
    } else if (
      context.userContext &&
      typeof context.userContext.trustScore === "number" &&
      context.userContext.trustScore >= 70
    ) {
      authAdjustments.trustBonus = 10;
    }
  }

  // Capture console logs (safe & scoped)
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  const capture =
    (level: "LOG" | "WARN" | "ERROR") =>
    (...args: any[]) => {
      const msg = args
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
        .join(" ");
      logs.push(`[${level}] [${name}] ${msg}`);

      // Extract threat scores
      const match = msg.match(/(?:threat|risk|score)[\s:]*(\d+(?:\.\d+)?)/i);
      if (match) threatScore = parseFloat(match[1]);

      // Forward to real console
      if (level === "ERROR") originalError(...args);
      else if (level === "WARN") originalWarn(...args);
      else originalLog(...args);
    };

  console.log = capture("LOG");
  console.warn = capture("WARN");
  console.error = capture("ERROR");

  try {
    const result = await Promise.resolve(operation());
    success = true;
    const duration = performance.now() - start;

    logs.push(`[SUCCESS] ${name} → ${duration.toFixed(2)}ms`);
    ComprehensiveHealthMonitor.recordExecution(
      name,
      duration,
      threatScore ?? 0,
      true
    );

    return {
      result,
      logs,
      executionTime: duration,
      success,
      threatScore,
      authAdjustments,
    };
  } catch (error: any) {
    const duration = performance.now() - start;
    const errMsg = error?.message || String(error);
    logs.push(`[FAIL] ${name} → ${duration.toFixed(2)}ms | ${errMsg}`);
    ComprehensiveHealthMonitor.recordExecution(
      name,
      duration,
      threatScore ?? 0,
      false
    );

    return {
      result: fallback,
      logs,
      executionTime: duration,
      success: false,
      threatScore,
      authAdjustments,
    };
  } finally {
    // Always restore console
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
}
