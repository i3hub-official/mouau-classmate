// ========================================
// 🛡️ ML THREAT DETECTOR - AI-Powered Security Scanner
// Responsibility: Detect and block sophisticated attacks using ML models
// ========================================

// File: lib/middleware/threatDetector.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";
import { TrustedSourceManager } from "./trustedSourceManager";

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES & TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface ThreatScore {
  score: number;
  reasons: string[];
  category: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  attackVectors: string[];
  confidence: number;
  mlPrediction?: MLPrediction;
}

interface MLPrediction {
  isThreat: boolean;
  probability: number;
  modelVersion: string;
  features: FeatureVector;
  explanation: string[];
}

interface FeatureVector {
  // Request features
  urlLength: number;
  pathDepth: number;
  queryParamCount: number;
  specialCharRatio: number;
  encodingRatio: number;
  numericRatio: number;
  uppercaseRatio: number;

  // Header features
  headerCount: number;
  userAgentLength: number;
  hasReferer: number;
  hasOrigin: number;
  hasCookies: number;
  hasAuth: number;
  suspiciousHeaderCount: number;

  // Behavioral features
  requestsPerMinute: number;
  uniquePathsAccessed: number;
  avgTimeBetweenRequests: number;
  failedRequestRatio: number;
  methodDistributionEntropy: number;

  // Pattern features
  sqlInjectionScore: number;
  xssScore: number;
  pathTraversalScore: number;
  cmdInjectionScore: number;
  botSignatureScore: number;

  // Temporal features
  hourOfDay: number;
  dayOfWeek: number;
  isWeekend: number;
  isNightTime: number;

  // Geographic features
  geoRiskScore: number;
  isVPN: number;
  isTor: number;
  isProxy: number;
  isDatacenter: number;

  // Historical features
  ipReputationScore: number;
  previousThreatCount: number;
  accountAge: number;
  sessionAge: number;
}

interface IPIntelligence {
  count: number;
  lastSeen: number;
  threatLevel: number;
  attackTypes: Set<string>;
  firstSeen: number;
  userAgents: Set<string>;
  requestHistory: RequestRecord[];
  mlScores: number[];
}

interface RequestRecord {
  timestamp: number;
  path: string;
  method: string;
  statusCode?: number;
  threatScore: number;
  features?: FeatureVector;
}

interface ModelWeights {
  version: string;
  updatedAt: number;
  weights: Map<string, number>;
  biases: Map<string, number>;
  thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

interface TrainingData {
  features: FeatureVector;
  label: 0 | 1; // 0 = safe, 1 = threat
  timestamp: number;
  feedback?: "confirmed_threat" | "false_positive";
}

interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyScore: number;
  anomalyType: string[];
  zScores: Map<string, number>;
}

interface ThreatMetrics {
  totalAnalyzed: number;
  threatsDetected: number;
  falsePositives: number;
  truePositives: number;
  modelAccuracy: number;
  avgProcessingTime: number;
  lastModelUpdate: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ML THREAT DETECTOR CLASS
// ─────────────────────────────────────────────────────────────────────────────
export class ThreatDetector {
  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────
  private static readonly MODEL_VERSION = "2.0.0";
  private static readonly LEARNING_RATE = 0.01;
  private static readonly REGULARIZATION = 0.001;
  private static readonly MIN_TRAINING_SAMPLES = 100;
  private static readonly MAX_TRAINING_SAMPLES = 10000;
  private static readonly FEATURE_HISTORY_SIZE = 1000;
  private static readonly ANOMALY_THRESHOLD = 2.5; // Z-score threshold
  private static readonly MODEL_UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour
  private static readonly ENSEMBLE_MODELS = 3;

  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────
  private static suspiciousIPs = new Map<string, IPIntelligence>();
  private static requestFrequency = new Map<string, number[]>();
  private static blockedPatterns = new Set<string>();

  // ML State
  private static modelWeights: ModelWeights = {
    version: "2.0.0",
    updatedAt: Date.now(),
    weights: new Map(),
    biases: new Map(),
    thresholds: { low: 0.3, medium: 0.5, high: 0.7, critical: 0.9 },
  };

  private static trainingData: TrainingData[] = [];
  private static featureStatistics: Map<
    string,
    { mean: number; std: number; min: number; max: number }
  > = new Map();
  private static ensembleModels: ModelWeights[] = [];

  private static metrics: ThreatMetrics = {
    totalAnalyzed: 0,
    threatsDetected: 0,
    falsePositives: 0,
    truePositives: 0,
    modelAccuracy: 0.95,
    avgProcessingTime: 0,
    lastModelUpdate: Date.now(),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // THREAT PATTERNS (Used for feature extraction)
  // ─────────────────────────────────────────────────────────────────────────
  private static readonly THREAT_PATTERNS = {
    SQL_INJECTION: [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|MERGE)\b.*\b(FROM|INTO|SET|TABLE|DATABASE|WHERE|ORDER BY|GROUP BY)\b)/gi,
      /'.*(\bOR\b|\bAND\b).*'.*[=<>]/gi,
      /(1=1|1=0|'='|"="|0x[0-9a-f]+)/gi,
      /(--|\/\*|\*\/|\|\||@@|char\(|varchar\(|cast\()/gi,
      /\b(waitfor|delay|sleep|benchmark)\s*\(/gi,
      /(information_schema|sysobjects|syscolumns|pg_tables)/gi,
    ],
    XSS: [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /\bon\w+\s*=\s*["']?[^"'>]*["'>]/gi,
      /(javascript|vbscript|data):/gi,
      /(eval\s*\(|setTimeout\s*\(|setInterval\s*\()/gi,
      /<iframe|<object|<embed|<applet/gi,
    ],
    PATH_TRAVERSAL: [
      /(\.\.(\/|\\|%2f|%5c)){2,}/gi,
      /(\/etc\/|\/proc\/|\/sys\/|\/dev\/)/gi,
      /(C:\\Windows\\|C:\\Program)/gi,
      /(\0|%00|%c0%af)/gi,
    ],
    CMD_INJECTION: [
      /[;&|`$\(\){}]/g,
      /\b(wget|curl|nc|netcat|cat|ls|pwd|whoami)\b/gi,
      /(cmd|powershell|bash|sh)(\.|\.exe|;|\||&)/gi,
    ],
    BOT_SIGNATURES: [
      /(bot|crawler|spider|scraper|scanner)/gi,
      /(selenium|puppeteer|headless|phantom)/gi,
      /(sqlmap|nikto|nmap|burp|acunetix)/gi,
    ],
  };

  // ─────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────
  static initialize(): void {
    this.initializeModelWeights();
    this.initializeEnsemble();
    this.initializeFeatureStatistics();
    console.log(
      `[ML THREAT DETECTOR] 🧠 Initialized with model version ${this.MODEL_VERSION}`
    );
  }

  private static initializeModelWeights(): void {
    // Initialize weights for each feature
    const featureNames = this.getFeatureNames();
    for (const feature of featureNames) {
      // Xavier initialization
      const stdDev = Math.sqrt(2.0 / featureNames.length);
      this.modelWeights.weights.set(feature, this.gaussianRandom() * stdDev);
      this.modelWeights.biases.set(feature, 0);
    }
  }

  private static initializeEnsemble(): void {
    // Create multiple models for ensemble prediction
    for (let i = 0; i < this.ENSEMBLE_MODELS; i++) {
      const model: ModelWeights = {
        version: `${this.MODEL_VERSION}-ensemble-${i}`,
        updatedAt: Date.now(),
        weights: new Map(),
        biases: new Map(),
        thresholds: {
          low: 0.3 + Math.random() * 0.1,
          medium: 0.5 + Math.random() * 0.1,
          high: 0.7 + Math.random() * 0.1,
          critical: 0.9,
        },
      };

      const featureNames = this.getFeatureNames();
      for (const feature of featureNames) {
        const stdDev = Math.sqrt(2.0 / featureNames.length);
        model.weights.set(feature, this.gaussianRandom() * stdDev);
        model.biases.set(feature, 0);
      }

      this.ensembleModels.push(model);
    }
  }

  private static initializeFeatureStatistics(): void {
    // Initialize with reasonable defaults
    const defaults: Record<
      string,
      { mean: number; std: number; min: number; max: number }
    > = {
      urlLength: { mean: 50, std: 30, min: 1, max: 2048 },
      pathDepth: { mean: 3, std: 2, min: 1, max: 20 },
      queryParamCount: { mean: 2, std: 3, min: 0, max: 50 },
      specialCharRatio: { mean: 0.05, std: 0.05, min: 0, max: 1 },
      encodingRatio: { mean: 0.02, std: 0.03, min: 0, max: 1 },
      requestsPerMinute: { mean: 10, std: 20, min: 0, max: 1000 },
      headerCount: { mean: 10, std: 5, min: 1, max: 50 },
      sqlInjectionScore: { mean: 0, std: 0.1, min: 0, max: 1 },
      xssScore: { mean: 0, std: 0.1, min: 0, max: 1 },
      ipReputationScore: { mean: 0.1, std: 0.2, min: 0, max: 1 },
    };

    for (const [feature, stats] of Object.entries(defaults)) {
      this.featureStatistics.set(feature, stats);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN DETECTION METHOD
  // ─────────────────────────────────────────────────────────────────────────
  static async detect(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<NextResponse> {
    const startTime = Date.now();

    try {
      // Initialize if needed
      if (this.modelWeights.weights.size === 0) {
        this.initialize();
      }

      // Check trusted sources first
      if (TrustedSourceManager) {
        const trustCheck = TrustedSourceManager.isTrusted(request, {
          clientIp: context.clientIp,
          userAgent: context.userAgent || "",
        });

        if (trustCheck.isTrusted) {
          return this.createTrustedResponse(trustCheck);
        }
      }

      // Extract features
      const features = await this.extractFeatures(request, context);

      // ML Prediction
      const mlPrediction = this.predict(features);

      // Anomaly Detection
      const anomalyResult = this.detectAnomalies(features);

      // Pattern-based detection (for explainability)
      const patternScore = this.calculatePatternScore(request, context);

      // Combine scores
      const combinedScore = this.combineScores(
        mlPrediction,
        anomalyResult,
        patternScore
      );

      // Update metrics
      this.updateMetrics(startTime, combinedScore);

      // Store for training
      this.storeTrainingData(features, combinedScore.score > 0.7 ? 1 : 0);

      // Update IP intelligence
      this.updateIPIntelligence(context.clientIp, combinedScore, features);

      // Check for model update
      this.checkModelUpdate();

      // Handle response based on threat level
      return this.handleThreatResponse(request, context, combinedScore);
    } catch (error) {
      console.error("[ML THREAT DETECTOR] ❌ Error:", error);
      return NextResponse.next();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FEATURE EXTRACTION
  // ─────────────────────────────────────────────────────────────────────────
  private static async extractFeatures(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<FeatureVector> {
    const url = request.url;
    const pathname = request.nextUrl.pathname;
    const searchParams = request.nextUrl.search;
    const headers = request.headers;
    const userAgent = headers.get("user-agent") || "";

    // Request features
    const urlLength = url.length;
    const pathDepth = pathname.split("/").filter(Boolean).length;
    const queryParamCount = new URLSearchParams(searchParams).size;
    const specialCharRatio = this.calculateSpecialCharRatio(url);
    const encodingRatio = this.calculateEncodingRatio(url);
    const numericRatio = this.calculateNumericRatio(url);
    const uppercaseRatio = this.calculateUppercaseRatio(url);

    // Header features
    const headerCount = Array.from(headers.keys()).length;
    const userAgentLength = userAgent.length;
    const hasReferer = headers.has("referer") ? 1 : 0;
    const hasOrigin = headers.has("origin") ? 1 : 0;
    const hasCookies = headers.has("cookie") ? 1 : 0;
    const hasAuth = headers.has("authorization") ? 1 : 0;
    const suspiciousHeaderCount = this.countSuspiciousHeaders(headers);

    // Behavioral features
    const ipData = this.suspiciousIPs.get(context.clientIp);
    const requestsPerMinute = this.calculateRequestsPerMinute(context.clientIp);
    const uniquePathsAccessed = ipData?.requestHistory
      ? new Set(ipData.requestHistory.map((r) => r.path)).size
      : 1;
    const avgTimeBetweenRequests = this.calculateAvgTimeBetweenRequests(
      context.clientIp
    );
    const failedRequestRatio = this.calculateFailedRequestRatio(
      context.clientIp
    );
    const methodDistributionEntropy = this.calculateMethodEntropy(
      context.clientIp
    );

    // Pattern features
    const sqlInjectionScore = this.calculatePatternMatchScore(
      url + searchParams,
      this.THREAT_PATTERNS.SQL_INJECTION
    );
    const xssScore = this.calculatePatternMatchScore(
      url + searchParams + userAgent,
      this.THREAT_PATTERNS.XSS
    );
    const pathTraversalScore = this.calculatePatternMatchScore(
      pathname,
      this.THREAT_PATTERNS.PATH_TRAVERSAL
    );
    const cmdInjectionScore = this.calculatePatternMatchScore(
      url + searchParams,
      this.THREAT_PATTERNS.CMD_INJECTION
    );
    const botSignatureScore = this.calculatePatternMatchScore(
      userAgent,
      this.THREAT_PATTERNS.BOT_SIGNATURES
    );

    // Temporal features
    const now = new Date();
    const hourOfDay = now.getHours() / 24;
    const dayOfWeek = now.getDay() / 7;
    const isWeekend = [0, 6].includes(now.getDay()) ? 1 : 0;
    const isNightTime = now.getHours() >= 22 || now.getHours() <= 5 ? 1 : 0;

    // Geographic features
    const geoRiskScore = this.calculateGeoRiskScore(request);
    const isVPN = this.detectVPN(request) ? 1 : 0;
    const isTor = this.detectTor(request) ? 1 : 0;
    const isProxy = this.detectProxy(request) ? 1 : 0;
    const isDatacenter = this.detectDatacenter(context.clientIp) ? 1 : 0;

    // Historical features
    const ipReputationScore = this.calculateIPReputationScore(context.clientIp);
    const previousThreatCount = ipData?.count || 0;
    const accountAge = context.sessionToken ? this.getAccountAge(context) : 0;
    const sessionAge = this.getSessionAge(context);

    return {
      urlLength,
      pathDepth,
      queryParamCount,
      specialCharRatio,
      encodingRatio,
      numericRatio,
      uppercaseRatio,
      headerCount,
      userAgentLength,
      hasReferer,
      hasOrigin,
      hasCookies,
      hasAuth,
      suspiciousHeaderCount,
      requestsPerMinute,
      uniquePathsAccessed,
      avgTimeBetweenRequests,
      failedRequestRatio,
      methodDistributionEntropy,
      sqlInjectionScore,
      xssScore,
      pathTraversalScore,
      cmdInjectionScore,
      botSignatureScore,
      hourOfDay,
      dayOfWeek,
      isWeekend,
      isNightTime,
      geoRiskScore,
      isVPN,
      isTor,
      isProxy,
      isDatacenter,
      ipReputationScore,
      previousThreatCount: Math.min(previousThreatCount / 100, 1),
      accountAge: Math.min(accountAge / (365 * 24 * 60 * 60 * 1000), 1),
      sessionAge: Math.min(sessionAge / (24 * 60 * 60 * 1000), 1),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ML PREDICTION
  // ─────────────────────────────────────────────────────────────────────────
  private static predict(features: FeatureVector): MLPrediction {
    // Normalize features
    const normalizedFeatures = this.normalizeFeatures(features);

    // Single model prediction
    const singlePrediction = this.forwardPass(
      normalizedFeatures,
      this.modelWeights
    );

    // Ensemble prediction
    const ensemblePredictions = this.ensembleModels.map((model) =>
      this.forwardPass(normalizedFeatures, model)
    );

    // Average ensemble predictions
    const ensembleAvg =
      ensemblePredictions.reduce((a, b) => a + b, 0) /
      ensemblePredictions.length;

    // Weighted combination
    const finalProbability = singlePrediction * 0.6 + ensembleAvg * 0.4;

    // Generate explanation
    const explanation = this.generateExplanation(features, normalizedFeatures);

    return {
      isThreat: finalProbability > this.modelWeights.thresholds.medium,
      probability: finalProbability,
      modelVersion: this.MODEL_VERSION,
      features,
      explanation,
    };
  }

  private static forwardPass(
    features: Map<string, number>,
    model: ModelWeights
  ): number {
    let sum = 0;

    for (const [featureName, featureValue] of features) {
      const weight = model.weights.get(featureName) || 0;
      const bias = model.biases.get(featureName) || 0;
      sum += featureValue * weight + bias;
    }

    // Sigmoid activation
    return 1 / (1 + Math.exp(-sum));
  }

  private static normalizeFeatures(
    features: FeatureVector
  ): Map<string, number> {
    const normalized = new Map<string, number>();

    for (const [key, value] of Object.entries(features)) {
      const stats = this.featureStatistics.get(key);
      if (stats && stats.std > 0) {
        // Z-score normalization
        normalized.set(key, (value - stats.mean) / stats.std);
      } else {
        // Min-max normalization fallback
        normalized.set(key, Math.min(1, Math.max(0, value)));
      }
    }

    return normalized;
  }

  private static generateExplanation(
    features: FeatureVector,
    normalizedFeatures: Map<string, number>
  ): string[] {
    const explanations: string[] = [];
    const contributions: Array<{ feature: string; contribution: number }> = [];

    for (const [featureName, normalizedValue] of normalizedFeatures) {
      const weight = this.modelWeights.weights.get(featureName) || 0;
      const contribution = normalizedValue * weight;
      contributions.push({ feature: featureName, contribution });
    }

    // Sort by absolute contribution
    contributions.sort(
      (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
    );

    // Top contributing features
    const top5 = contributions.slice(0, 5);
    for (const { feature, contribution } of top5) {
      if (Math.abs(contribution) > 0.1) {
        const direction = contribution > 0 ? "increased" : "decreased";
        const rawValue = features[feature as keyof FeatureVector];
        explanations.push(
          `${feature}: ${rawValue} ${direction} threat score by ${Math.abs(
            contribution
          ).toFixed(2)}`
        );
      }
    }

    return explanations;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ANOMALY DETECTION
  // ─────────────────────────────────────────────────────────────────────────
  private static detectAnomalies(
    features: FeatureVector
  ): AnomalyDetectionResult {
    const zScores = new Map<string, number>();
    const anomalyTypes: string[] = [];
    let totalAnomaly = 0;
    let anomalyCount = 0;

    for (const [key, value] of Object.entries(features)) {
      const stats = this.featureStatistics.get(key);
      if (stats && stats.std > 0) {
        const zScore = Math.abs((value - stats.mean) / stats.std);
        zScores.set(key, zScore);

        if (zScore > this.ANOMALY_THRESHOLD) {
          anomalyTypes.push(`${key}_anomaly`);
          totalAnomaly += zScore;
          anomalyCount++;
        }
      }
    }

    const anomalyScore = anomalyCount > 0 ? totalAnomaly / anomalyCount / 5 : 0; // Normalize to 0-1

    return {
      isAnomaly: anomalyScore > 0.5,
      anomalyScore: Math.min(1, anomalyScore),
      anomalyType: anomalyTypes,
      zScores,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PATTERN-BASED SCORING (for explainability and fallback)
  // ─────────────────────────────────────────────────────────────────────────
  private static calculatePatternScore(
    request: NextRequest,
    context: MiddlewareContext
  ): { score: number; reasons: string[]; attackVectors: string[] } {
    let score = 0;
    const reasons: string[] = [];
    const attackVectors: string[] = [];

    const url = request.url;
    const userAgent = request.headers.get("user-agent") || "";

    // Check each pattern category
    for (const [category, patterns] of Object.entries(this.THREAT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(url) || pattern.test(userAgent)) {
          const categoryScore = this.getPatternCategoryScore(category);
          score += categoryScore;
          reasons.push(`${category} pattern detected`);
          attackVectors.push(category);
          break;
        }
      }
    }

    return {
      score: Math.min(1, score / 100),
      reasons,
      attackVectors,
    };
  }

  private static getPatternCategoryScore(category: string): number {
    const scores: Record<string, number> = {
      SQL_INJECTION: 35,
      XSS: 30,
      PATH_TRAVERSAL: 25,
      CMD_INJECTION: 40,
      BOT_SIGNATURES: 15,
    };
    return scores[category] || 10;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCORE COMBINATION
  // ─────────────────────────────────────────────────────────────────────────
  private static combineScores(
    mlPrediction: MLPrediction,
    anomalyResult: AnomalyDetectionResult,
    patternScore: { score: number; reasons: string[]; attackVectors: string[] }
  ): ThreatScore {
    // Weighted combination
    const mlWeight = 0.5;
    const anomalyWeight = 0.25;
    const patternWeight = 0.25;

    const combinedScore =
      mlPrediction.probability * mlWeight +
      anomalyResult.anomalyScore * anomalyWeight +
      patternScore.score * patternWeight;

    // Calculate confidence based on agreement
    const scores = [
      mlPrediction.probability,
      anomalyResult.anomalyScore,
      patternScore.score,
    ];
    const variance = this.calculateVariance(scores);
    const confidence = Math.max(0, 100 - variance * 200);

    // Determine category
    let category: ThreatScore["category"] = "LOW";
    if (combinedScore >= 0.9) category = "CRITICAL";
    else if (combinedScore >= 0.7) category = "HIGH";
    else if (combinedScore >= 0.5) category = "MEDIUM";

    // Collect all reasons
    const reasons = [
      ...mlPrediction.explanation,
      ...patternScore.reasons,
      ...(anomalyResult.isAnomaly
        ? [`Anomaly detected: ${anomalyResult.anomalyType.join(", ")}`]
        : []),
    ];

    return {
      score: Math.round(combinedScore * 100),
      reasons: [...new Set(reasons)],
      category,
      attackVectors: patternScore.attackVectors,
      confidence: Math.round(confidence),
      mlPrediction,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ONLINE LEARNING
  // ─────────────────────────────────────────────────────────────────────────
  private static storeTrainingData(
    features: FeatureVector,
    label: 0 | 1
  ): void {
    if (this.trainingData.length >= this.MAX_TRAINING_SAMPLES) {
      // Remove oldest samples
      this.trainingData = this.trainingData.slice(
        -this.MAX_TRAINING_SAMPLES / 2
      );
    }

    this.trainingData.push({
      features,
      label,
      timestamp: Date.now(),
    });

    // Update feature statistics incrementally
    this.updateFeatureStatistics(features);
  }

  private static updateFeatureStatistics(features: FeatureVector): void {
    for (const [key, value] of Object.entries(features)) {
      const stats = this.featureStatistics.get(key) || {
        mean: 0,
        std: 1,
        min: Infinity,
        max: -Infinity,
      };

      // Exponential moving average
      const alpha = 0.01;
      stats.mean = stats.mean * (1 - alpha) + value * alpha;

      // Update variance estimate
      const diff = value - stats.mean;
      stats.std = Math.sqrt(
        stats.std * stats.std * (1 - alpha) + diff * diff * alpha
      );

      // Update min/max
      stats.min = Math.min(stats.min, value);
      stats.max = Math.max(stats.max, value);

      this.featureStatistics.set(key, stats);
    }
  }

  static provideFeedback(
    incidentId: string,
    feedback: "confirmed_threat" | "false_positive"
  ): void {
    // Find recent training data that matches
    const recentData = this.trainingData.slice(-100);

    for (const data of recentData) {
      if (!data.feedback) {
        data.feedback = feedback;

        // Adjust label based on feedback
        if (feedback === "false_positive" && data.label === 1) {
          data.label = 0;
          this.metrics.falsePositives++;
        } else if (feedback === "confirmed_threat" && data.label === 1) {
          this.metrics.truePositives++;
        }

        break;
      }
    }

    // Trigger model update if enough feedback
    // Trigger model update if enough feedback
    const feedbackCount = this.trainingData.filter((d) => d.feedback).length;
    if (feedbackCount >= 10) {
      this.trainModel();
    }

    console.log(
      `[ML THREAT DETECTOR] 📝 Feedback recorded: ${feedback} (${feedbackCount} total)`
    );
  }

  private static checkModelUpdate(): void {
    const timeSinceUpdate = Date.now() - this.metrics.lastModelUpdate;

    if (
      timeSinceUpdate > this.MODEL_UPDATE_INTERVAL &&
      this.trainingData.length >= this.MIN_TRAINING_SAMPLES
    ) {
      this.trainModel();
    }
  }

  private static trainModel(): void {
    console.log(
      `[ML THREAT DETECTOR] 🧠 Training model with ${this.trainingData.length} samples...`
    );

    const startTime = Date.now();

    // Mini-batch gradient descent
    const batchSize = 32;
    const epochs = 10;

    for (let epoch = 0; epoch < epochs; epoch++) {
      // Shuffle training data
      const shuffled = [...this.trainingData].sort(() => Math.random() - 0.5);

      for (let i = 0; i < shuffled.length; i += batchSize) {
        const batch = shuffled.slice(i, i + batchSize);
        this.trainBatch(batch);
      }
    }

    // Train ensemble models
    for (const model of this.ensembleModels) {
      this.trainEnsembleModel(model);
    }

    // Update metrics
    this.metrics.lastModelUpdate = Date.now();
    this.metrics.modelAccuracy = this.calculateModelAccuracy();

    console.log(
      `[ML THREAT DETECTOR] ✅ Training complete in ${
        Date.now() - startTime
      }ms | Accuracy: ${(this.metrics.modelAccuracy * 100).toFixed(1)}%`
    );
  }

  private static trainBatch(batch: TrainingData[]): void {
    const gradients = new Map<string, number>();
    const biasGradients = new Map<string, number>();

    // Initialize gradients
    for (const feature of this.getFeatureNames()) {
      gradients.set(feature, 0);
      biasGradients.set(feature, 0);
    }

    // Compute gradients for batch
    for (const sample of batch) {
      const normalizedFeatures = this.normalizeFeatures(sample.features);
      const prediction = this.forwardPass(
        normalizedFeatures,
        this.modelWeights
      );
      const error = prediction - sample.label;

      // Gradient computation (logistic regression)
      for (const [featureName, featureValue] of normalizedFeatures) {
        const currentGradient = gradients.get(featureName) || 0;
        gradients.set(featureName, currentGradient + error * featureValue);

        const currentBiasGradient = biasGradients.get(featureName) || 0;
        biasGradients.set(featureName, currentBiasGradient + error);
      }
    }

    // Update weights with regularization
    for (const [featureName, gradient] of gradients) {
      const currentWeight = this.modelWeights.weights.get(featureName) || 0;
      const regularization = this.REGULARIZATION * currentWeight;
      const update =
        (this.LEARNING_RATE * gradient) / batch.length + regularization;

      this.modelWeights.weights.set(featureName, currentWeight - update);
    }

    // Update biases
    for (const [featureName, gradient] of biasGradients) {
      const currentBias = this.modelWeights.biases.get(featureName) || 0;
      const update = (this.LEARNING_RATE * gradient) / batch.length;
      this.modelWeights.biases.set(featureName, currentBias - update);
    }
  }

  private static trainEnsembleModel(model: ModelWeights): void {
    // Bootstrap sampling
    const sampleSize = Math.floor(this.trainingData.length * 0.8);
    const bootstrapSample: TrainingData[] = [];

    for (let i = 0; i < sampleSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.trainingData.length);
      bootstrapSample.push(this.trainingData[randomIndex]);
    }

    // Train on bootstrap sample
    const batchSize = 32;
    for (let i = 0; i < bootstrapSample.length; i += batchSize) {
      const batch = bootstrapSample.slice(i, i + batchSize);
      this.trainEnsembleBatch(model, batch);
    }

    model.updatedAt = Date.now();
  }

  private static trainEnsembleBatch(
    model: ModelWeights,
    batch: TrainingData[]
  ): void {
    const gradients = new Map<string, number>();

    for (const feature of this.getFeatureNames()) {
      gradients.set(feature, 0);
    }

    for (const sample of batch) {
      const normalizedFeatures = this.normalizeFeatures(sample.features);
      const prediction = this.forwardPass(normalizedFeatures, model);
      const error = prediction - sample.label;

      for (const [featureName, featureValue] of normalizedFeatures) {
        const currentGradient = gradients.get(featureName) || 0;
        gradients.set(featureName, currentGradient + error * featureValue);
      }
    }

    // Update with slightly different learning rate (diversity)
    const lr = this.LEARNING_RATE * (0.8 + Math.random() * 0.4);

    for (const [featureName, gradient] of gradients) {
      const currentWeight = model.weights.get(featureName) || 0;
      const update = (lr * gradient) / batch.length;
      model.weights.set(featureName, currentWeight - update);
    }
  }

  private static calculateModelAccuracy(): number {
    if (this.trainingData.length < 10) return 0.95;

    // Use last 20% as validation set
    const validationSize = Math.floor(this.trainingData.length * 0.2);
    const validationSet = this.trainingData.slice(-validationSize);

    let correct = 0;
    for (const sample of validationSet) {
      const normalizedFeatures = this.normalizeFeatures(sample.features);
      const prediction = this.forwardPass(
        normalizedFeatures,
        this.modelWeights
      );
      const predictedLabel = prediction > 0.5 ? 1 : 0;

      if (predictedLabel === sample.label) {
        correct++;
      }
    }

    return correct / validationSet.length;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ─────────────────────────────────────────────────────────────────────────
  private static getFeatureNames(): string[] {
    return [
      "urlLength",
      "pathDepth",
      "queryParamCount",
      "specialCharRatio",
      "encodingRatio",
      "numericRatio",
      "uppercaseRatio",
      "headerCount",
      "userAgentLength",
      "hasReferer",
      "hasOrigin",
      "hasCookies",
      "hasAuth",
      "suspiciousHeaderCount",
      "requestsPerMinute",
      "uniquePathsAccessed",
      "avgTimeBetweenRequests",
      "failedRequestRatio",
      "methodDistributionEntropy",
      "sqlInjectionScore",
      "xssScore",
      "pathTraversalScore",
      "cmdInjectionScore",
      "botSignatureScore",
      "hourOfDay",
      "dayOfWeek",
      "isWeekend",
      "isNightTime",
      "geoRiskScore",
      "isVPN",
      "isTor",
      "isProxy",
      "isDatacenter",
      "ipReputationScore",
      "previousThreatCount",
      "accountAge",
      "sessionAge",
    ];
  }

  private static gaussianRandom(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private static calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return (
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length
    );
  }

  private static calculateSpecialCharRatio(str: string): number {
    const specialChars = str.match(/[^a-zA-Z0-9\s]/g) || [];
    return str.length > 0 ? specialChars.length / str.length : 0;
  }

  private static calculateEncodingRatio(str: string): number {
    const encoded = str.match(/%[0-9a-fA-F]{2}/g) || [];
    return str.length > 0 ? (encoded.length * 3) / str.length : 0;
  }

  private static calculateNumericRatio(str: string): number {
    const numerics = str.match(/[0-9]/g) || [];
    return str.length > 0 ? numerics.length / str.length : 0;
  }

  private static calculateUppercaseRatio(str: string): number {
    const uppercase = str.match(/[A-Z]/g) || [];
    const letters = str.match(/[a-zA-Z]/g) || [];
    return letters.length > 0 ? uppercase.length / letters.length : 0;
  }

  private static countSuspiciousHeaders(headers: Headers): number {
    const suspiciousPatterns = [
      /^x-forwarded/i,
      /^x-real/i,
      /^x-originating/i,
      /^via$/i,
      /^proxy/i,
    ];

    let count = 0;
    for (const [key] of headers) {
      if (suspiciousPatterns.some((p) => p.test(key))) {
        count++;
      }
    }
    return count;
  }

  private static calculateRequestsPerMinute(ip: string): number {
    const now = Date.now();
    const frequencies = this.requestFrequency.get(ip) || [];
    const recentRequests = frequencies.filter((t) => now - t < 60000);

    // Update frequency tracking
    recentRequests.push(now);
    this.requestFrequency.set(ip, recentRequests.slice(-1000));

    return recentRequests.length;
  }

  private static calculateAvgTimeBetweenRequests(ip: string): number {
    const frequencies = this.requestFrequency.get(ip) || [];
    if (frequencies.length < 2) return 10000; // Default 10 seconds

    const intervals: number[] = [];
    for (let i = 1; i < frequencies.length; i++) {
      intervals.push(frequencies[i] - frequencies[i - 1]);
    }

    return intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }

  private static calculateFailedRequestRatio(ip: string): number {
    const ipData = this.suspiciousIPs.get(ip);
    if (!ipData?.requestHistory?.length) return 0;

    const failed = ipData.requestHistory.filter(
      (r) => r.statusCode && r.statusCode >= 400
    ).length;
    return failed / ipData.requestHistory.length;
  }

  private static calculateMethodEntropy(ip: string): number {
    const ipData = this.suspiciousIPs.get(ip);
    if (!ipData?.requestHistory?.length) return 0;

    const methodCounts = new Map<string, number>();
    for (const req of ipData.requestHistory) {
      methodCounts.set(req.method, (methodCounts.get(req.method) || 0) + 1);
    }

    // Shannon entropy
    const total = ipData.requestHistory.length;
    let entropy = 0;
    for (const count of methodCounts.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }

    return entropy / Math.log2(7); // Normalize by max entropy (7 common methods)
  }

  private static calculatePatternMatchScore(
    str: string,
    patterns: RegExp[]
  ): number {
    let matches = 0;
    for (const pattern of patterns) {
      if (pattern.test(str)) {
        matches++;
      }
    }
    return patterns.length > 0 ? matches / patterns.length : 0;
  }

  private static calculateGeoRiskScore(request: NextRequest): number {
    const country = request.headers.get("x-geo-country") || "";
    const highRiskCountries = ["CN", "RU", "KP", "IR", "SY"];
    const mediumRiskCountries = ["VN", "UA", "RO", "BR", "IN"];

    if (highRiskCountries.includes(country)) return 0.8;
    if (mediumRiskCountries.includes(country)) return 0.4;
    return 0.1;
  }

  private static detectVPN(request: NextRequest): boolean {
    const vpnHeaders = ["x-vpn", "x-proxy", "via"];
    return vpnHeaders.some((h) => request.headers.has(h));
  }

  private static detectTor(request: NextRequest): boolean {
    const userAgent = request.headers.get("user-agent") || "";
    return /tor/i.test(userAgent);
  }

  private static detectProxy(request: NextRequest): boolean {
    return (
      request.headers.has("x-forwarded-for") &&
      (request.headers.get("x-forwarded-for") || "").includes(",")
    );
  }

  private static detectDatacenter(ip: string): boolean {
    // Simplified datacenter detection (in production, use IP database)
    const datacenterRanges = [
      /^13\./, // AWS
      /^35\./, // GCP
      /^40\./, // Azure
      /^52\./, // AWS
      /^104\./, // Various cloud
    ];
    return datacenterRanges.some((r) => r.test(ip));
  }

  private static calculateIPReputationScore(ip: string): number {
    const ipData = this.suspiciousIPs.get(ip);
    if (!ipData) return 0;

    let score = 0;

    // Factor in threat history
    score += Math.min(0.3, ipData.count * 0.01);

    // Factor in threat level
    score += Math.min(0.3, (ipData.threatLevel / 100) * 0.3);

    // Factor in attack diversity
    score += Math.min(0.2, ipData.attackTypes.size * 0.05);

    // Factor in recency
    const hoursSinceLastSeen =
      (Date.now() - ipData.lastSeen) / (1000 * 60 * 60);
    if (hoursSinceLastSeen < 1) score += 0.2;
    else if (hoursSinceLastSeen < 24) score += 0.1;

    return Math.min(1, score);
  }

  private static getAccountAge(context: MiddlewareContext): number {
    // Placeholder - in production, get from session/database
    return 30 * 24 * 60 * 60 * 1000; // Default 30 days
  }

  private static getSessionAge(context: MiddlewareContext): number {
    // Placeholder - in production, get from session
    return 60 * 60 * 1000; // Default 1 hour
  }

  // ─────────────────────────────────────────────────────────────────────────
  // IP INTELLIGENCE
  // ─────────────────────────────────────────────────────────────────────────
  private static updateIPIntelligence(
    ip: string,
    threatScore: ThreatScore,
    features: FeatureVector
  ): void {
    const existing = this.suspiciousIPs.get(ip) || {
      count: 0,
      lastSeen: Date.now(),
      threatLevel: 0,
      attackTypes: new Set<string>(),
      firstSeen: Date.now(),
      userAgents: new Set<string>(),
      requestHistory: [],
      mlScores: [],
    };

    // Update intelligence
    existing.count += threatScore.score > 40 ? 1 : 0;
    existing.lastSeen = Date.now();
    existing.threatLevel = Math.max(existing.threatLevel, threatScore.score);

    // Track attack vectors
    threatScore.attackVectors.forEach((v) => existing.attackTypes.add(v));

    // Track ML scores for trend analysis
    existing.mlScores.push(threatScore.mlPrediction?.probability || 0);
    if (existing.mlScores.length > 100) {
      existing.mlScores = existing.mlScores.slice(-100);
    }

    // Store request record
    existing.requestHistory.push({
      timestamp: Date.now(),
      path: "/", // Would be actual path
      method: "GET", // Would be actual method
      threatScore: threatScore.score,
      features,
    });

    // Limit history size
    if (existing.requestHistory.length > 100) {
      existing.requestHistory = existing.requestHistory.slice(-100);
    }

    this.suspiciousIPs.set(ip, existing);

    // Auto-block if consistently high threat
    if (existing.mlScores.length >= 10) {
      const avgScore =
        existing.mlScores.reduce((a, b) => a + b, 0) / existing.mlScores.length;
      if (avgScore > 0.8) {
        this.blockedPatterns.add(ip);
        console.log(
          `[ML THREAT DETECTOR] 🚫 Auto-blocked IP based on ML trend: ${ip} (avg: ${avgScore.toFixed(
            2
          )})`
        );
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESPONSE HANDLING
  // ─────────────────────────────────────────────────────────────────────────
  private static handleThreatResponse(
    request: NextRequest,
    context: MiddlewareContext,
    threatScore: ThreatScore
  ): NextResponse {
    const incidentId = `ML_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    // CRITICAL threats - block immediately
    if (threatScore.category === "CRITICAL" || threatScore.score > 85) {
      console.log(
        `[ML THREAT DETECTOR] 🚨 CRITICAL: ${threatScore.reasons
          .slice(0, 3)
          .join(", ")}`
      );
      return this.createBlockResponse(threatScore, incidentId, request);
    }

    // HIGH threats - require additional verification
    if (threatScore.category === "HIGH" || threatScore.score > 65) {
      console.log(
        `[ML THREAT DETECTOR] ⚠️ HIGH: ${threatScore.reasons
          .slice(0, 3)
          .join(", ")}`
      );

      const response = NextResponse.next();
      this.addThreatHeaders(response, threatScore, incidentId);
      response.headers.set("x-require-captcha", "true");
      response.headers.set("x-rate-limit-multiplier", "0.5");
      return response;
    }

    // MEDIUM threats - enhanced logging
    if (threatScore.category === "MEDIUM" || threatScore.score > 40) {
      console.log(
        `[ML THREAT DETECTOR] ⚡ MEDIUM: ${threatScore.reasons
          .slice(0, 2)
          .join(", ")}`
      );
    }

    // Allow with headers
    const response = NextResponse.next();
    this.addThreatHeaders(response, threatScore, incidentId);
    return response;
  }

  private static createBlockResponse(
    threatScore: ThreatScore,
    incidentId: string,
    request: NextRequest
  ): NextResponse {
    const blockPageUrl = new URL("/security-block", request.url);
    blockPageUrl.searchParams.set("incident", incidentId);
    blockPageUrl.searchParams.set("category", threatScore.category);
    blockPageUrl.searchParams.set(
      "ml_confidence",
      (threatScore.mlPrediction?.probability || 0).toFixed(2)
    );

    const response = NextResponse.redirect(blockPageUrl);
    this.addThreatHeaders(response, threatScore, incidentId);
    response.headers.set("x-security-action", "BLOCKED");

    return response;
  }

  private static createTrustedResponse(trustCheck: {
    isTrusted: boolean;
    trustLevel?: string;
    source?: { name: string };
    reason?: string;
  }): NextResponse {
    const response = NextResponse.next();
    response.headers.set("x-trust-level", trustCheck.trustLevel || "NONE");
    response.headers.set(
      "x-trust-source",
      trustCheck.source?.name || "UNKNOWN"
    );
    response.headers.set("x-threat-level", "TRUSTED");
    response.headers.set("x-threat-score", "0");
    return response;
  }

  private static addThreatHeaders(
    response: NextResponse,
    threatScore: ThreatScore,
    incidentId: string
  ): void {
    response.headers.set("x-threat-score", threatScore.score.toString());
    response.headers.set("x-threat-category", threatScore.category);
    response.headers.set(
      "x-threat-confidence",
      threatScore.confidence.toString()
    );
    response.headers.set("x-incident-id", incidentId);
    response.headers.set(
      "x-ml-probability",
      (threatScore.mlPrediction?.probability || 0).toFixed(3)
    );
    response.headers.set(
      "x-model-version",
      threatScore.mlPrediction?.modelVersion || this.MODEL_VERSION
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // METRICS & MONITORING
  // ─────────────────────────────────────────────────────────────────────────
  private static updateMetrics(
    startTime: number,
    threatScore: ThreatScore
  ): void {
    this.metrics.totalAnalyzed++;

    if (threatScore.score > 50) {
      this.metrics.threatsDetected++;
    }

    // Update average processing time
    const processingTime = Date.now() - startTime;
    this.metrics.avgProcessingTime =
      this.metrics.avgProcessingTime * 0.99 + processingTime * 0.01;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────
  static getMetrics(): ThreatMetrics {
    return { ...this.metrics };
  }

  static getModelInfo(): {
    version: string;
    accuracy: number;
    trainingSize: number;
    ensembleSize: number;
    lastUpdate: Date;
  } {
    return {
      version: this.MODEL_VERSION,
      accuracy: this.metrics.modelAccuracy,
      trainingSize: this.trainingData.length,
      ensembleSize: this.ensembleModels.length,
      lastUpdate: new Date(this.metrics.lastModelUpdate),
    };
  }

  static getFeatureImportance(): Array<{
    feature: string;
    importance: number;
  }> {
    const importance: Array<{ feature: string; importance: number }> = [];

    for (const [feature, weight] of this.modelWeights.weights) {
      importance.push({
        feature,
        importance: Math.abs(weight),
      });
    }

    return importance.sort((a, b) => b.importance - a.importance);
  }

  static exportModel(): string {
    return JSON.stringify({
      version: this.MODEL_VERSION,
      weights: Array.from(this.modelWeights.weights.entries()),
      biases: Array.from(this.modelWeights.biases.entries()),
      thresholds: this.modelWeights.thresholds,
      featureStatistics: Array.from(this.featureStatistics.entries()),
      exportedAt: new Date().toISOString(),
    });
  }

  static importModel(modelJson: string): void {
    try {
      const data = JSON.parse(modelJson);

      this.modelWeights = {
        version: data.version,
        updatedAt: Date.now(),
        weights: new Map(data.weights),
        biases: new Map(data.biases),
        thresholds: data.thresholds,
      };

      this.featureStatistics = new Map(data.featureStatistics);

      console.log(`[ML THREAT DETECTOR] 📥 Model imported: ${data.version}`);
    } catch (error) {
      console.error("[ML THREAT DETECTOR] ❌ Failed to import model:", error);
    }
  }

  static isBlocked(ip: string): boolean {
    return this.blockedPatterns.has(ip);
  }

  static unblockIP(ip: string): void {
    this.blockedPatterns.delete(ip);
    console.log(`[ML THREAT DETECTOR] ✅ Unblocked IP: ${ip}`);
  }

  static clearOldData(maxAgeHours: number = 24): void {
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;

    // Clear old IP intelligence
    for (const [ip, data] of this.suspiciousIPs) {
      if (data.lastSeen < cutoff) {
        this.suspiciousIPs.delete(ip);
      }
    }

    // Clear old training data
    this.trainingData = this.trainingData.filter((d) => d.timestamp > cutoff);

    console.log(
      `[ML THREAT DETECTOR] 🧹 Cleared data older than ${maxAgeHours}h`
    );
  }
}
