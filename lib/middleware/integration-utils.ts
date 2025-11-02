// lib/middleware/integration-utils.ts
export class IntegrationUtils {
  static async safeExecute(middlewareFn: () => Promise<any>, fallback: any) {
    try {
      return await middlewareFn();
    } catch (error) {
      console.error(`[INTEGRATION] Middleware execution failed:`, error);
      return fallback;
    }
  }

  static mergeContexts(baseContext: any, additionalContext: any) {
    return {
      ...baseContext,
      ...additionalContext,
      integratedAt: Date.now(),
      contextSources: [...(baseContext.contextSources || []), ...(additionalContext.contextSources || [])]
    };
  }

  static calculateAggregatedThreatScore(scores: number[]): number {
    if (scores.length === 0) return 0;
    
    // Use weighted average with higher weights for higher scores
    const weightedSum = scores.reduce((sum, score, index) => {
      const weight = score > 70 ? 2 : 1; // Higher weight for high threat scores
      return sum + (score * weight);
    }, 0);
    
    const totalWeight = scores.reduce((sum, score) => {
      const weight = score > 70 ? 2 : 1;
      return sum + weight;
    }, 0);
    
    return Math.min(weightedSum / totalWeight, 100);
  }
}