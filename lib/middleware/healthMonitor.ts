// ========================================
// 💊 HEALTH MONITOR
// ========================================

export class ComprehensiveHealthMonitor {
  private static failures = new Map<string, number>();
  private static lastCheck = new Map<string, number>();
  private static threatScores = new Map<string, number[]>();
  private static executionTimes = new Map<string, number[]>();

  static shouldSkip(name: string): boolean {
    const failures = this.failures.get(name) || 0;
    const lastCheck = this.lastCheck.get(name) || 0;

    if (failures > 3 && Date.now() - lastCheck < 60000) {
      return true;
    }

    return false;
  }

  static recordExecution(
    name: string,
    executionTime: number,
    threatScore?: number,
    success: boolean = true
  ): void {
    // Record execution time
    const times = this.executionTimes.get(name) || [];
    times.push(executionTime);
    if (times.length > 100) times.shift(); // Keep last 100
    this.executionTimes.set(name, times);

    // Record threat score
    if (threatScore !== undefined) {
      const scores = this.threatScores.get(name) || [];
      scores.push(threatScore);
      if (scores.length > 100) scores.shift();
      this.threatScores.set(name, scores);
    }

    if (success) {
      this.failures.set(name, 0);
    } else {
      this.recordFailure(name);
    }
  }

  static recordFailure(name: string): void {
    this.failures.set(name, (this.failures.get(name) || 0) + 1);
    this.lastCheck.set(name, Date.now());
  }

  static getComprehensiveStatus() {
    const status: Record<string, { 
      failures: number; 
      healthy: boolean; 
      avgExecutionTime: number; 
      avgThreatScore: number; 
      executionCount: number; 
    }> = {};

    for (const [name, failures] of this.failures.entries()) {
      const times = this.executionTimes.get(name) || [];
      const scores = this.threatScores.get(name) || [];

      status[name] = {
        failures,
        healthy: failures <= 3,
        avgExecutionTime:
          times.length > 0
            ? times.reduce((a, b) => a + b, 0) / times.length
            : 0,
        avgThreatScore:
          scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0,
        executionCount: times.length,
      };
    }

    return status;
  }
}
