// ========================================
// 🎭 MODULAR ORCHESTRATOR ARCHITECTURE
// Clean separation of concerns with middleware registry
// ========================================

import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "@/lib/middleware/types";

// 🔧 MIDDLEWARE INTERFACE
interface MiddlewareHandler {
  name: string;
  execute: (request: NextRequest, context: MiddlewareContext) => Promise<NextResponse> | NextResponse;
  isAsync: boolean;
  isConditional?: boolean;
  condition?: (request: NextRequest, context: MiddlewareContext) => boolean;
  priority: number; // 1 = highest priority
  canRunInParallel: boolean;
  fallback?: NextResponse;
}

// 💊 HEALTH MONITORING (Extracted)
class HealthMonitor {
  private static metrics = new Map<string, {
    failures: number;
    lastFailure: number;
    avgLatency: number;
    successRate: number;
    circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  }>();

  static recordSuccess(name: string, latency: number): void {
    const metrics = this.metrics.get(name);
    if (metrics) {
      metrics.avgLatency = (metrics.avgLatency + latency) / 2;
      metrics.failures = Math.max(0, metrics.failures - 1);
      metrics.successRate = Math.min(100, metrics.successRate + 1);
    }
  }

  static recordFailure(name: string): void {
    const metrics = this.metrics.get(name);
    if (metrics) {
      metrics.failures++;
      metrics.lastFailure = Date.now();
      metrics.successRate = Math.max(0, metrics.successRate - 5);
      
      if (metrics.failures >= 5 && metrics.circuitState === 'CLOSED') {
        metrics.circuitState = 'OPEN';
        console.log(`[HEALTH] 🔥 Circuit breaker OPEN for ${name}`);
      }
    }
  }

  static shouldSkip(name: string): boolean {
    const metrics = this.metrics.get(name);
    if (!metrics) return false;
    
    if (metrics.circuitState === 'OPEN') {
      // Try to recover after 30 seconds
      if (Date.now() - metrics.lastFailure > 30000) {
        metrics.circuitState = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    return false;
  }

  static initialize(name: string): void {
    this.metrics.set(name, {
      failures: 0,
      lastFailure: 0,
      avgLatency: 0,
      successRate: 100,
      circuitState: 'CLOSED'
    });
  }

  static getReport(): Record<string, { 
    failures: number; 
    lastFailure: number; 
    avgLatency: number; 
    successRate: number; 
    circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN'; 
  }> {
    return Object.fromEntries(this.metrics);
  }
}

// 🧪 A/B TESTING (Extracted)
class ABTestManager {
  private static tests = new Map<string, { variant: 'A' | 'B'; percentage: number }>();

  static initialize(): void {
    this.tests.set('parallelStrategy', {
      variant: Math.random() < 0.5 ? 'A' : 'B',
      percentage: 50
    });
  }

  static getVariant(testName: string): 'A' | 'B' {
    return this.tests.get(testName)?.variant || 'A';
  }
}

// 🏭 MIDDLEWARE REGISTRY
class MiddlewareRegistry {
  private static handlers = new Map<string, MiddlewareHandler>();

  static register(handler: MiddlewareHandler): void {
    this.handlers.set(handler.name, handler);
    HealthMonitor.initialize(handler.name);
  }

  static getAll(): MiddlewareHandler[] {
    return Array.from(this.handlers.values()).sort((a, b) => a.priority - b.priority);
  }

  static get(name: string): MiddlewareHandler | undefined {
    return this.handlers.get(name);
  }

  static getParallel(): MiddlewareHandler[] {
    return this.getAll().filter(h => h.canRunInParallel);
  }

  static getSequential(): MiddlewareHandler[] {
    return this.getAll().filter(h => !h.canRunInParallel);
  }
}

// 🚀 EXECUTION ENGINE
class ExecutionEngine {
  static async safeExecute(
    handler: MiddlewareHandler,
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<NextResponse> {
    const startTime = performance.now();

    try {
      // Circuit breaker check
      if (HealthMonitor.shouldSkip(handler.name)) {
        console.log(`[HEALTH] ⚡ Skipping ${handler.name} (circuit open)`);
        return handler.fallback || NextResponse.next();
      }

      // Conditional execution
      if (handler.isConditional && handler.condition) {
        if (!handler.condition(request, context)) {
          return NextResponse.next();
        }
      }

      const result = await Promise.resolve(handler.execute(request, context));
      const latency = performance.now() - startTime;
      
      HealthMonitor.recordSuccess(handler.name, latency);
      return result;

    } catch (error) {
      HealthMonitor.recordFailure(handler.name);
      console.warn(`[ENGINE] ⚠️ ${handler.name} failed:`, (error as Error).message);
      return handler.fallback || NextResponse.next();
    }
  }

  static async executeParallel(
    handlers: MiddlewareHandler[],
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<NextResponse[]> {
    const promises = handlers.map(handler => 
      this.safeExecute(handler, request, context)
    );
    
    const results = await Promise.allSettled(promises);
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : NextResponse.next()
    );
  }

  static async executeSequential(
    handlers: MiddlewareHandler[],
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<NextResponse[]> {
    const results: NextResponse[] = [];
    
    for (const handler of handlers) {
      const result = await this.safeExecute(handler, request, context);
      results.push(result);
      
      // Early exit on critical failures
      if (result.status === 403 || result.status === 400) {
        break;
      }
    }
    
    return results;
  }
}

// 🎭 CLEAN ORCHESTRATOR (Pure orchestration logic)
export class Orchestrator {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) return;

    // Initialize systems
    ABTestManager.initialize();
    
    // Register middleware will happen in separate files
    this.initialized = true;
    console.log('[ORCHESTRATOR] 🎭 Modular orchestrator initialized');
  }

  static async execute(request: NextRequest): Promise<NextResponse> {
    this.initialize();
    
    const startTime = performance.now();
    let context: MiddlewareContext = {} as MiddlewareContext; // Will be built by ContextBuilder
    let response = NextResponse.next();

    try {
      // Get middleware from registry
      const allMiddleware = MiddlewareRegistry.getAll();
      const parallelMiddleware = MiddlewareRegistry.getParallel();
      const sequentialMiddleware = MiddlewareRegistry.getSequential();

      // PHASE 1: Critical sequential middleware (highest priority)
      const criticalMiddleware = sequentialMiddleware.filter(m => m.priority <= 3);
      const criticalResults = await ExecutionEngine.executeSequential(
        criticalMiddleware, 
        request, 
        context
      );

      // Build context from first result (ContextBuilder should be priority 1)
      if (criticalResults[0]) {
        // Context should be attached to the response by ContextBuilder
        context = (criticalResults[0] as { context?: MiddlewareContext }).context || context;
      }

      // Merge critical results
      for (const result of criticalResults) {
        if (result.status !== 200 && result.status !== 304) {
          return result; // Early exit on critical failure
        }
        response = this.mergeResponses(response, result);
      }

      // PHASE 2: A/B Test - Parallel vs Sequential for remaining middleware
      const remainingMiddleware = allMiddleware.filter(m => m.priority > 3);
      const abVariant = ABTestManager.getVariant('parallelStrategy');
      
      let remainingResults: NextResponse[];
      
      if (abVariant === 'A') {
        // Conservative: Some parallel, some sequential
        const canParallel = remainingMiddleware.filter(m => m.canRunInParallel).slice(0, 3);
        const mustSequential = remainingMiddleware.filter(m => !m.canRunInParallel);
        
        const parallelResults = await ExecutionEngine.executeParallel(canParallel, request, context);
        const sequentialResults = await ExecutionEngine.executeSequential(mustSequential, request, context);
        
        remainingResults = [...parallelResults, ...sequentialResults];
      } else {
        // Aggressive: Maximum parallel processing
        const canParallel = remainingMiddleware.filter(m => m.canRunInParallel);
        const mustSequential = remainingMiddleware.filter(m => !m.canRunInParallel);
        
        const parallelResults = await ExecutionEngine.executeParallel(canParallel, request, context);
        const sequentialResults = await ExecutionEngine.executeSequential(mustSequential, request, context);
        
        remainingResults = [...parallelResults, ...sequentialResults];
      }

      // Process results with early exits
      for (const result of remainingResults) {
        // Cache hit - return immediately
        if (result.headers.get("x-cache") === "HIT") {
          return this.mergeResponses(response, result);
        }
        
        // Critical errors - return immediately
        if (result.status === 403 || result.status === 429) {
          return this.mergeResponses(response, result);
        }
        
        // Redirects - return immediately
        if ((result as NextResponse & { redirected?: boolean }).redirected) {
          return this.mergeResponses(response, result);
        }
        
        response = this.mergeResponses(response, result);
      }

      // Finalize
      const processingTime = performance.now() - startTime;
      response.headers.set('X-Processing-Time', Math.round(processingTime).toString());
      response.headers.set('X-AB-Variant', abVariant);
      response.headers.set('X-Middleware-Count', allMiddleware.length.toString());

      console.log(`[ORCHESTRATOR] ✅ ${allMiddleware.length} middleware completed in ${Math.round(processingTime)}ms`);
      console.log(`[ORCHESTRATOR] 🧪 A/B Variant: ${abVariant} | Status: Modular Mode`);

      return response;

    } catch (error) {
      console.error('[ORCHESTRATOR] ❌ Critical error:', error);
      
      return new NextResponse("Service Unavailable", {
        status: 503,
        headers: {
          "X-Fortress-Status": "EMERGENCY_MODE",
          "Retry-After": "30"
        }
      });
    }
  }

  private static mergeResponses(base: NextResponse, addition: NextResponse): NextResponse {
    // Simple merge - in real implementation, use your ResponseMerger
    addition.headers.forEach((value, key) => {
      base.headers.set(key, value);
    });
    return base;
  }

  // 📊 Public API for monitoring
  static getStatus() {
    return {
      middleware: MiddlewareRegistry.getAll().map(h => ({
        name: h.name,
        priority: h.priority,
        canParallel: h.canRunInParallel
      })),
      health: HealthMonitor.getReport(),
      abTests: {
        parallelStrategy: ABTestManager.getVariant('parallelStrategy')
      }
    };
  }
}

// 📦 EXPORT REGISTRY FOR MIDDLEWARE REGISTRATION
export { MiddlewareRegistry, type MiddlewareHandler };