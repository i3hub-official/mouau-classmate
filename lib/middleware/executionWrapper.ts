// ========================================
// 🔥 EXECUTION WRAPPER - Fixed
// ========================================

import { ComprehensiveHealthMonitor } from "./healthMonitor";
import { AuthenticatedActionContext } from "./authenticatedActionHandler";

export const enhancedExecute = async <T>(
  fn: () => Promise<T> | T,
  fallback: T,
  name: string,
  authContext?: AuthenticatedActionContext
): Promise<{
  result: T;
  logs: string[];
  executionTime: number;
  threatScore?: number;
  success: boolean;
  authAdjustments?: {
    sensitivityReduction: number;
    trustBonus: number;
  };
}> => {
  const startTime = performance.now();
  const logs: string[] = [];
  let threatScore: number | undefined;
  let success = false;
  const authAdjustments = { sensitivityReduction: 0, trustBonus: 0 };

  const originalMethods = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  const logCapture =
    (level: string) =>
    (...args: unknown[]) => {
      const message = args.join(" ");
      logs.push(
        `[${level}] [${name}] ${authContext ? `[${authContext.actionType}] ` : ""}${message}`
      );

      // Extract threat scores from logs
      const scoreMatch = message.match(/(?:threat|score).*?(\d+)/i);
      if (scoreMatch) threatScore = parseInt(scoreMatch[1]);

      // Fix: Convert level to lowercase to match originalMethods properties
      const methodName = level.toLowerCase() as keyof typeof originalMethods;
      originalMethods[methodName](...args);
    };

  console.log = logCapture("LOG");
  console.warn = logCapture("WARN");
  console.error = logCapture("ERROR");

  try {
    if (ComprehensiveHealthMonitor.shouldSkip(name)) {
      logs.push(`[CIRCUIT] ${name} skipped due to circuit breaker`);
      return { result: fallback, logs, executionTime: 0, success: false };
    }

    // Apply authentication-aware adjustments
    if (authContext) {
      if (authContext.sensitivity === "critical") {
        authAdjustments.sensitivityReduction = 20;
        logs.push(`[AUTH] Critical action - reducing threat sensitivity by 20`);
      } else if (authContext.sensitivity === "high") {
        authAdjustments.sensitivityReduction = 10;
      }

      if (authContext.userContext && authContext.userContext.trustLevel > 70) {
        authAdjustments.trustBonus = 15;
        logs.push(`[AUTH] High trust user - applying bonus`);
      }
    }

    const result = await Promise.resolve(fn());
    success = true;

    const executionTime = performance.now() - startTime;
    ComprehensiveHealthMonitor.recordExecution(
      name,
      executionTime,
      threatScore,
      success
    );
    logs.push(`[SUCCESS] ${name} completed in ${executionTime.toFixed(2)}ms`);

    return {
      result,
      logs,
      executionTime,
      threatScore,
      success,
      authAdjustments,
    };
  } catch (error) {
    const executionTime = performance.now() - startTime;
    ComprehensiveHealthMonitor.recordExecution(
      name,
      executionTime,
      threatScore,
      false
    );
    logs.push(`[ERROR] ${name} failed: ${error}`);

    return {
      result: fallback,
      logs,
      executionTime,
      threatScore,
      success: false,
      authAdjustments,
    };
  } finally {
    // Restore original methods properly
    console.log = originalMethods.log;
    console.warn = originalMethods.warn;
    console.error = originalMethods.error;
  }
};
