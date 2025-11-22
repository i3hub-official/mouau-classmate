// ========================================
// 💊 COMPREHENSIVE HEALTH MONITOR - System Health & Performance Tracker
// Responsibility: Monitor middleware health, performance, and system resources
// ========================================

// File: src/lib/middleware/healthMonitor.ts

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
interface ExecutionRecord {
  timestamp: number;
  duration: number;
  success: boolean;
  threatScore?: number;
  errorType?: string;
}

interface ComponentHealth {
  name: string;
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "CRITICAL" | "UNKNOWN";
  failures: number;
  successRate: number;
  avgExecutionTime: number;
  p50ExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  maxExecutionTime: number;
  minExecutionTime: number;
  avgThreatScore: number;
  executionCount: number;
  lastExecution: number;
  lastFailure: number | null;
  lastError: string | null;
  uptime: number;
  circuitBreakerOpen: boolean;
}

interface SystemHealth {
  overall: "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "CRITICAL";
  score: number; // 0-100
  components: Record<string, ComponentHealth>;
  memory: MemoryStatus;
  uptime: number;
  startTime: number;
  lastCheck: number;
  alerts: Alert[];
}

interface MemoryStatus {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  heapUsedPercent: number;
  status: "OK" | "WARNING" | "CRITICAL";
}

interface Alert {
  id: string;
  type: "ERROR" | "WARNING" | "INFO";
  component: string;
  message: string;
  timestamp: number;
  resolved: boolean;
}

interface HealthCheckResult {
  healthy: boolean;
  message: string;
  latency?: number;
}

interface CircuitBreakerState {
  isOpen: boolean;
  failures: number;
  lastFailure: number;
  openedAt: number | null;
  halfOpenAttempts: number;
}

type HealthCheckFn = () => Promise<HealthCheckResult>;

// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE HEALTH MONITOR CLASS
// ─────────────────────────────────────────────────────────────────────────────
export class ComprehensiveHealthMonitor {
  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────
  private static readonly MAX_RECORDS = 1000;
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private static readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  private static readonly HALF_OPEN_MAX_ATTEMPTS = 3;
  private static readonly DEGRADED_THRESHOLD = 0.9; // 90% success rate
  private static readonly UNHEALTHY_THRESHOLD = 0.7; // 70% success rate
  private static readonly CRITICAL_THRESHOLD = 0.5; // 50% success rate
  private static readonly SLOW_EXECUTION_THRESHOLD = 1000; // 1 second
  private static readonly MEMORY_WARNING_THRESHOLD = 0.7; // 70%
  private static readonly MEMORY_CRITICAL_THRESHOLD = 0.9; // 90%
  private static readonly METRICS_RETENTION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly ALERT_RETENTION = 100;

  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────
  private static executions = new Map<string, ExecutionRecord[]>();
  private static circuitBreakers = new Map<string, CircuitBreakerState>();
  private static healthChecks = new Map<string, HealthCheckFn>();
  private static alerts: Alert[] = [];
  private static startTime = Date.now();
  private static lastHealthCheck = Date.now();

  // ─────────────────────────────────────────────────────────────────────────
  // CIRCUIT BREAKER
  // ─────────────────────────────────────────────────────────────────────────
  private static getCircuitBreaker(name: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, {
        isOpen: false,
        failures: 0,
        lastFailure: 0,
        openedAt: null,
        halfOpenAttempts: 0,
      });
    }
    return this.circuitBreakers.get(name)!;
  }

  static recordRequest(total: number, status: number): void {
    // Record total requests and status code metrics for system-wide tracking
    const name = "RequestMetrics";
    const executionTime = 0; // Not applicable for simple request count
    const success = status < 500; // Treat status codes < 500 as success

    // Record execution for request metrics
    this.recordExecution(
      name,
      executionTime,
      undefined,
      success,
      status >= 400 ? `HTTP_${status}` : undefined
    );

    // Optionally log request info
    console.log(`[HEALTH MONITOR] Request: status=${status}, total=${total}`);
  }

  private static updateCircuitBreaker(name: string, success: boolean): void {
    const cb = this.getCircuitBreaker(name);

    if (success) {
      // Reset on success
      cb.failures = 0;
      cb.isOpen = false;
      cb.openedAt = null;
      cb.halfOpenAttempts = 0;
    } else {
      cb.failures++;
      cb.lastFailure = Date.now();

      // Open circuit if threshold exceeded
      if (cb.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
        if (!cb.isOpen) {
          cb.isOpen = true;
          cb.openedAt = Date.now();
          this.addAlert(
            "WARNING",
            name,
            `Circuit breaker opened after ${cb.failures} failures`
          );
          console.log(`[HEALTH MONITOR] ⚡ Circuit breaker OPEN for: ${name}`);
        }
      }
    }
  }

  /**
   * Check if a component should be skipped (circuit breaker)
   */
  static shouldSkip(name: string): boolean {
    const cb = this.getCircuitBreaker(name);

    if (!cb.isOpen) return false;

    const timeSinceOpen = Date.now() - (cb.openedAt || 0);

    // Allow half-open attempts after timeout
    if (timeSinceOpen >= this.CIRCUIT_BREAKER_TIMEOUT) {
      if (cb.halfOpenAttempts < this.HALF_OPEN_MAX_ATTEMPTS) {
        cb.halfOpenAttempts++;
        console.log(
          `[HEALTH MONITOR] 🔄 Half-open attempt ${cb.halfOpenAttempts}/${this.HALF_OPEN_MAX_ATTEMPTS} for: ${name}`
        );
        return false;
      }
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXECUTION RECORDING
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Record a middleware execution
   */
  static recordExecution(
    name: string,
    executionTime: number,
    threatScore?: number,
    success: boolean = true,
    errorType?: string
  ): void {
    // Get or create records array
    const records = this.executions.get(name) || [];

    // Add new record
    records.push({
      timestamp: Date.now(),
      duration: executionTime,
      success,
      threatScore,
      errorType,
    });

    // Trim old records
    if (records.length > this.MAX_RECORDS) {
      records.splice(0, records.length - this.MAX_RECORDS);
    }

    // Clean old records by time
    const cutoff = Date.now() - this.METRICS_RETENTION;
    const filtered = records.filter((r) => r.timestamp > cutoff);

    this.executions.set(name, filtered);

    // Update circuit breaker
    this.updateCircuitBreaker(name, success);

    // Check for slow execution
    if (executionTime > this.SLOW_EXECUTION_THRESHOLD) {
      this.addAlert("WARNING", name, `Slow execution: ${executionTime}ms`);
    }

    // Log failures
    if (!success) {
      console.log(
        `[HEALTH MONITOR] ❌ Failure in ${name}: ${
          errorType || "Unknown error"
        }`
      );
    }
  }

  /**
   * Record a failure (shorthand)
   */
  static recordFailure(name: string, errorType?: string): void {
    this.recordExecution(name, 0, undefined, false, errorType);
  }

  /**
   * Record success (shorthand)
   */
  static recordSuccess(
    name: string,
    executionTime: number,
    threatScore?: number
  ): void {
    this.recordExecution(name, executionTime, threatScore, true);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HEALTH CHECKS
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Register a health check function for a component
   */
  static registerHealthCheck(name: string, checkFn: HealthCheckFn): void {
    this.healthChecks.set(name, checkFn);
  }

  /**
   * Run all registered health checks
   */
  static async runHealthChecks(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>();

    for (const [name, checkFn] of this.healthChecks) {
      try {
        const start = Date.now();
        const result = await checkFn();
        result.latency = Date.now() - start;
        results.set(name, result);

        if (!result.healthy) {
          this.addAlert(
            "ERROR",
            name,
            `Health check failed: ${result.message}`
          );
        }
      } catch (error) {
        results.set(name, {
          healthy: false,
          message: `Health check error: ${(error as Error).message}`,
          latency: 0,
        });
      }
    }

    this.lastHealthCheck = Date.now();
    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATISTICS CALCULATION
  // ─────────────────────────────────────────────────────────────────────────
  private static calculatePercentile(
    values: number[],
    percentile: number
  ): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private static getComponentHealth(name: string): ComponentHealth {
    const records = this.executions.get(name) || [];
    const cb = this.getCircuitBreaker(name);

    if (records.length === 0) {
      return {
        name,
        status: "UNKNOWN",
        failures: 0,
        successRate: 1,
        avgExecutionTime: 0,
        p50ExecutionTime: 0,
        p95ExecutionTime: 0,
        p99ExecutionTime: 0,
        maxExecutionTime: 0,
        minExecutionTime: 0,
        avgThreatScore: 0,
        executionCount: 0,
        lastExecution: 0,
        lastFailure: null,
        lastError: null,
        uptime: 100,
        circuitBreakerOpen: cb.isOpen,
      };
    }

    // Calculate statistics
    const successCount = records.filter((r) => r.success).length;
    const failureCount = records.length - successCount;
    const successRate = successCount / records.length;

    const durations = records.map((r) => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    const threatScores = records
      .filter((r) => r.threatScore !== undefined)
      .map((r) => r.threatScore!);
    const avgThreatScore =
      threatScores.length > 0
        ? threatScores.reduce((a, b) => a + b, 0) / threatScores.length
        : 0;

    const lastRecord = records[records.length - 1];
    const lastFailureRecord = [...records].reverse().find((r) => !r.success);

    // Determine status
    let status: ComponentHealth["status"] = "HEALTHY";
    if (cb.isOpen) {
      status = "CRITICAL";
    } else if (successRate < this.CRITICAL_THRESHOLD) {
      status = "CRITICAL";
    } else if (successRate < this.UNHEALTHY_THRESHOLD) {
      status = "UNHEALTHY";
    } else if (successRate < this.DEGRADED_THRESHOLD) {
      status = "DEGRADED";
    }

    // Calculate uptime (based on recent records)
    const recentRecords = records.slice(-100);
    const recentSuccess = recentRecords.filter((r) => r.success).length;
    const uptime = (recentSuccess / recentRecords.length) * 100;

    return {
      name,
      status,
      failures: failureCount,
      successRate,
      avgExecutionTime: Math.round(avgDuration * 100) / 100,
      p50ExecutionTime: this.calculatePercentile(durations, 50),
      p95ExecutionTime: this.calculatePercentile(durations, 95),
      p99ExecutionTime: this.calculatePercentile(durations, 99),
      maxExecutionTime: Math.max(...durations),
      minExecutionTime: Math.min(...durations),
      avgThreatScore: Math.round(avgThreatScore * 100) / 100,
      executionCount: records.length,
      lastExecution: lastRecord.timestamp,
      lastFailure: lastFailureRecord?.timestamp || null,
      lastError: lastFailureRecord?.errorType || null,
      uptime: Math.round(uptime * 100) / 100,
      circuitBreakerOpen: cb.isOpen,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MEMORY MONITORING
  // ─────────────────────────────────────────────────────────────────────────
  private static getMemoryStatus(): MemoryStatus {
    const memory = process.memoryUsage();
    const heapUsedPercent = memory.heapUsed / memory.heapTotal;

    let status: MemoryStatus["status"] = "OK";
    if (heapUsedPercent >= this.MEMORY_CRITICAL_THRESHOLD) {
      status = "CRITICAL";
    } else if (heapUsedPercent >= this.MEMORY_WARNING_THRESHOLD) {
      status = "WARNING";
    }

    return {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      external: Math.round(memory.external / 1024 / 1024),
      rss: Math.round(memory.rss / 1024 / 1024),
      heapUsedPercent: Math.round(heapUsedPercent * 100),
      status,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ALERTS
  // ─────────────────────────────────────────────────────────────────────────
  private static addAlert(
    type: Alert["type"],
    component: string,
    message: string
  ): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type,
      component,
      message,
      timestamp: Date.now(),
      resolved: false,
    };

    this.alerts.unshift(alert);

    // Trim old alerts
    if (this.alerts.length > this.ALERT_RETENTION) {
      this.alerts = this.alerts.slice(0, this.ALERT_RETENTION);
    }

    // Log alert
    const icon = type === "ERROR" ? "🚨" : type === "WARNING" ? "⚠️" : "ℹ️";
    console.log(`[HEALTH MONITOR] ${icon} ${type}: ${component} - ${message}`);
  }

  static resolveAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  static getActiveAlerts(): Alert[] {
    return this.alerts.filter((a) => !a.resolved);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Get comprehensive system health status
   */
  static getComprehensiveStatus(): SystemHealth {
    const components: Record<string, ComponentHealth> = {};
    let totalScore = 0;
    let componentCount = 0;

    // Get health for all tracked components
    for (const name of this.executions.keys()) {
      const health = this.getComponentHealth(name);
      components[name] = health;

      // Calculate component score
      let componentScore = health.successRate * 100;
      if (health.circuitBreakerOpen) componentScore *= 0.5;
      if (health.avgExecutionTime > this.SLOW_EXECUTION_THRESHOLD)
        componentScore *= 0.9;

      totalScore += componentScore;
      componentCount++;
    }

    // Calculate overall score
    const overallScore = componentCount > 0 ? totalScore / componentCount : 100;

    // Determine overall status
    let overall: SystemHealth["overall"] = "HEALTHY";
    const memory = this.getMemoryStatus();

    if (memory.status === "CRITICAL" || overallScore < 50) {
      overall = "CRITICAL";
    } else if (memory.status === "WARNING" || overallScore < 70) {
      overall = "UNHEALTHY";
    } else if (overallScore < 90) {
      overall = "DEGRADED";
    }

    // Check for any critical components
    if (Object.values(components).some((c) => c.status === "CRITICAL")) {
      overall = "CRITICAL";
    } else if (
      Object.values(components).some((c) => c.status === "UNHEALTHY")
    ) {
      if (overall === "HEALTHY") overall = "UNHEALTHY";
    }

    return {
      overall,
      score: Math.round(overallScore),
      components,
      memory,
      uptime: Date.now() - this.startTime,
      startTime: this.startTime,
      lastCheck: this.lastHealthCheck,
      alerts: this.getActiveAlerts(),
    };
  }

  /**
   * Get simple status (backwards compatible)
   */
  static getStatus(): Record<
    string,
    {
      failures: number;
      healthy: boolean;
      avgExecutionTime: number;
      avgThreatScore: number;
      executionCount: number;
    }
  > {
    const status: Record<
      string,
      {
        failures: number;
        healthy: boolean;
        avgExecutionTime: number;
        avgThreatScore: number;
        executionCount: number;
      }
    > = {};

    for (const name of this.executions.keys()) {
      const health = this.getComponentHealth(name);
      status[name] = {
        failures: health.failures,
        healthy: health.status === "HEALTHY" || health.status === "DEGRADED",
        avgExecutionTime: health.avgExecutionTime,
        avgThreatScore: health.avgThreatScore,
        executionCount: health.executionCount,
      };
    }

    return status;
  }

  /**
   * Get health summary as string
   */
  static getHealthSummary(): string {
    const status = this.getComprehensiveStatus();
    const icon =
      status.overall === "HEALTHY"
        ? "✅"
        : status.overall === "DEGRADED"
        ? "⚠️"
        : status.overall === "UNHEALTHY"
        ? "❌"
        : "🚨";

    const componentSummary = Object.values(status.components)
      .map((c) => `${c.name}: ${c.status}`)
      .join(", ");

    return `${icon} System: ${status.overall} (${status.score}/100) | Memory: ${status.memory.heapUsedPercent}% | Components: ${componentSummary}`;
  }

  /**
   * Reset all metrics
   */
  static reset(): void {
    this.executions.clear();
    this.circuitBreakers.clear();
    this.alerts = [];
    this.startTime = Date.now();
    console.log("[HEALTH MONITOR] 🔄 All metrics reset");
  }

  /**
   * Reset a specific component
   */
  static resetComponent(name: string): void {
    this.executions.delete(name);
    this.circuitBreakers.delete(name);
    console.log(`[HEALTH MONITOR] 🔄 Reset metrics for: ${name}`);
  }

  /**
   * Force close circuit breaker
   */
  static closeCircuitBreaker(name: string): void {
    const cb = this.getCircuitBreaker(name);
    cb.isOpen = false;
    cb.failures = 0;
    cb.openedAt = null;
    cb.halfOpenAttempts = 0;
    console.log(
      `[HEALTH MONITOR] ✅ Circuit breaker manually closed for: ${name}`
    );
  }

  /**
   * Get component names being tracked
   */
  static getTrackedComponents(): string[] {
    return Array.from(this.executions.keys());
  }

  /**
   * Check if system is healthy enough to proceed
   */
  static isSystemHealthy(): boolean {
    const status = this.getComprehensiveStatus();
    return status.overall === "HEALTHY" || status.overall === "DEGRADED";
  }

  /**
   * Export metrics for external monitoring
   */
  static exportMetrics(): object {
    const status = this.getComprehensiveStatus();

    return {
      timestamp: Date.now(),
      system: {
        status: status.overall,
        score: status.score,
        uptime: status.uptime,
        memory: status.memory,
      },
      components: Object.fromEntries(
        Object.entries(status.components).map(([name, health]) => [
          name,
          {
            status: health.status,
            successRate: health.successRate,
            avgLatency: health.avgExecutionTime,
            p95Latency: health.p95ExecutionTime,
            p99Latency: health.p99ExecutionTime,
            executions: health.executionCount,
            circuitBreaker: health.circuitBreakerOpen ? "OPEN" : "CLOSED",
          },
        ])
      ),
      alerts: status.alerts.length,
    };
  }

  /**
   * Log health status to console
   */
  static logStatus(): void {
    const status = this.getComprehensiveStatus();

    console.log("\n" + "═".repeat(60));
    console.log("💊 HEALTH MONITOR STATUS");
    console.log("═".repeat(60));

    const overallIcon =
      status.overall === "HEALTHY"
        ? "✅"
        : status.overall === "DEGRADED"
        ? "⚠️"
        : status.overall === "UNHEALTHY"
        ? "❌"
        : "🚨";

    console.log(
      `\n${overallIcon} Overall: ${status.overall} (Score: ${status.score}/100)`
    );
    console.log(
      `📊 Memory: ${status.memory.heapUsed}MB / ${status.memory.heapTotal}MB (${status.memory.heapUsedPercent}%)`
    );
    console.log(`⏱️  Uptime: ${Math.round(status.uptime / 1000 / 60)} minutes`);

    console.log("\n📦 Components:");
    for (const [name, health] of Object.entries(status.components)) {
      const icon =
        health.status === "HEALTHY"
          ? "✅"
          : health.status === "DEGRADED"
          ? "⚠️"
          : health.status === "UNHEALTHY"
          ? "❌"
          : "🚨";

      const cb = health.circuitBreakerOpen ? " [CB:OPEN]" : "";
      console.log(
        `   ${icon} ${name}: ${health.status}${cb} | ` +
          `${(health.successRate * 100).toFixed(1)}% success | ` +
          `avg: ${health.avgExecutionTime.toFixed(0)}ms | ` +
          `p95: ${health.p95ExecutionTime.toFixed(0)}ms | ` +
          `count: ${health.executionCount}`
      );
    }

    if (status.alerts.length > 0) {
      console.log(`\n🚨 Active Alerts: ${status.alerts.length}`);
      status.alerts.slice(0, 5).forEach((alert) => {
        const icon =
          alert.type === "ERROR"
            ? "🔴"
            : alert.type === "WARNING"
            ? "🟡"
            : "🔵";
        console.log(`   ${icon} [${alert.component}] ${alert.message}`);
      });
    }

    console.log("\n" + "═".repeat(60) + "\n");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE WRAPPER HELPER
// ─────────────────────────────────────────────────────────────────────────────
export function withHealthMonitoring<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    // Check circuit breaker
    if (ComprehensiveHealthMonitor.shouldSkip(name)) {
      reject(new Error(`Circuit breaker open for: ${name}`));
      return;
    }

    const start = Date.now();

    try {
      const result = await fn();
      ComprehensiveHealthMonitor.recordSuccess(name, Date.now() - start);
      resolve(result);
    } catch (error) {
      ComprehensiveHealthMonitor.recordFailure(name, (error as Error).message);
      reject(error);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// USAGE EXAMPLES
// ─────────────────────────────────────────────────────────────────────────────
/*
// In middleware:
import { ComprehensiveHealthMonitor } from './healthMonitor';

// Record execution
const start = Date.now();
try {
  // ... middleware logic
  ComprehensiveHealthMonitor.recordExecution(
    'ThreatDetector',
    Date.now() - start,
    threatScore,
    true
  );
} catch (error) {
  ComprehensiveHealthMonitor.recordExecution(
    'ThreatDetector',
    Date.now() - start,
    undefined,
    false,
    error.message
  );
}

// Check if should skip (circuit breaker)
if (ComprehensiveHealthMonitor.shouldSkip('ThreatDetector')) {
  return NextResponse.next(); // Skip this middleware
}

// Register health check
ComprehensiveHealthMonitor.registerHealthCheck('Database', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true, message: 'Database connected' };
  } catch (error) {
    return { healthy: false, message: error.message };
  }
});

// Get status
const status = ComprehensiveHealthMonitor.getComprehensiveStatus();
console.log(status);

// Log status
ComprehensiveHealthMonitor.logStatus();

// Export for monitoring
const metrics = ComprehensiveHealthMonitor.exportMetrics();

// Use wrapper
const result = await withHealthMonitoring('MyOperation', async () => {
  return await someAsyncOperation();
});
*/
