// ========================================
// 🧠 TASK 14: BEHAVIOR ANALYST - AI-Powered Anomaly Detection
// Responsibility: Learn normal patterns and detect behavioral anomalies
// ========================================

// File: src/lib/middleware/behaviorAnalyst.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
interface UserBehaviorProfile {
  userId: string;
  typicalPaths: Map<string, number>; // path -> access count
  requestTimestamps: number[]; // Recent request timestamps
  averageRequestInterval: number;
  commonTimeRanges: Map<number, number>; // hour -> access count
  typicalPayloadSizes: number[];
  geographicPattern: Map<string, number>; // country -> access count
  deviceFingerprints: Set<string>;
  failedAuthAttempts: number;
  successfulAuthCount: number;
  lastRequestTime: number;
  firstSeen: number;
  lastAnalysis: number;
  riskScore: number;
}

interface BehaviorAnomaly {
  type: AnomalyType;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number; // 0-100
  description: string;
  metadata?: Record<string, unknown>;
}

type AnomalyType =
  | "UNUSUAL_TIME"
  | "UNUSUAL_PATH"
  | "GEOGRAPHIC_ANOMALY"
  | "VELOCITY_ANOMALY"
  | "DEVICE_CHANGE"
  | "BRUTE_FORCE_ATTEMPT"
  | "SESSION_ANOMALY"
  | "PAYLOAD_ANOMALY"
  | "IMPOSSIBLE_TRAVEL"
  | "BEHAVIORAL_DRIFT";

interface BehaviorMetrics {
  totalAnalyzed: number;
  anomaliesDetected: number;
  highSeverityCount: number;
  profilesActive: number;
  averageRiskScore: number;
  lastReset: number;
}

interface GeoLocation {
  country: string;
  city?: string;
  lat?: number;
  lon?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// BEHAVIOR ANALYST CLASS
// ─────────────────────────────────────────────────────────────────────────────
export class BehaviorAnalyst {
  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────
  private static readonly LEARNING_PERIOD = 3 * 24 * 60 * 60 * 1000; // 3 days
  private static readonly MAX_PROFILES = 10000;
  private static readonly PROFILE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
  private static readonly MAX_TIMESTAMPS = 100;
  private static readonly METRICS_RESET_INTERVAL = 60 * 60 * 1000; // 1 hour
  private static readonly VELOCITY_WINDOW = 60 * 1000; // 1 minute
  private static readonly MAX_REQUESTS_PER_MINUTE = 60;
  private static readonly IMPOSSIBLE_TRAVEL_SPEED = 1000; // km/h (faster than commercial flights)

  private static readonly COMMON_PATHS = [
    "/",
    "/auth/login",
    "/auth/register",
    "/dashboard",
    "/api/health",
    "/api/auth",
    "/_next",
    "/favicon.ico",
  ];

  private static readonly SENSITIVE_PATHS = [
    "/admin",
    "/settings/security",
    "/api/admin",
    "/api/s/signup",
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────
  private static userProfiles = new Map<string, UserBehaviorProfile>();
  private static recentGeoLocations = new Map<string, GeoLocation>(); // userId -> last location

  private static metrics: BehaviorMetrics = {
    totalAnalyzed: 0,
    anomaliesDetected: 0,
    highSeverityCount: 0,
    profilesActive: 0,
    averageRiskScore: 0,
    lastReset: Date.now(),
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN ANALYSIS METHOD
  // ─────────────────────────────────────────────────────────────────────────
  static analyze(
    request: NextRequest,
    context: MiddlewareContext
  ): NextResponse {
    try {
      this.updateMetrics();
      this.cleanupStaleProfiles();

      // Generate user identifier
      const userId = this.getUserIdentifier(request, context);

      // Skip analysis for certain conditions
      if (this.shouldSkipAnalysis(request, context)) {
        return NextResponse.next();
      }

      this.metrics.totalAnalyzed++;

      // Get or create user profile
      const profile = this.getOrCreateProfile(userId);
      const isLearning = this.isInLearningPhase(profile);

      // Detect anomalies
      const anomalies = isLearning
        ? []
        : this.detectAnomalies(request, context, profile);

      // Update user profile with current request
      this.updateUserProfile(request, context, profile);

      // Calculate risk score
      const riskScore = this.calculateRiskScore(anomalies, profile);
      profile.riskScore = riskScore;

      // Handle anomalies based on severity
      const response = this.handleAnomalies(anomalies, riskScore, profile);

      // Log significant events
      this.logAnalysis(userId, anomalies, riskScore, isLearning);

      return response;
    } catch (error) {
      console.error("[BEHAVIOR ANALYST] ❌ Error:", error);
      return NextResponse.next();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ANOMALY DETECTION
  // ─────────────────────────────────────────────────────────────────────────
  private static detectAnomalies(
    request: NextRequest,
    context: MiddlewareContext,
    profile: UserBehaviorProfile
  ): BehaviorAnomaly[] {
    const anomalies: BehaviorAnomaly[] = [];

    // 1. Time-based anomaly
    const timeAnomaly = this.detectTimeAnomaly(profile);
    if (timeAnomaly) anomalies.push(timeAnomaly);

    // 2. Path anomaly
    const pathAnomaly = this.detectPathAnomaly(request, profile);
    if (pathAnomaly) anomalies.push(pathAnomaly);

    // 3. Geographic anomaly
    const geoAnomaly = this.detectGeographicAnomaly(request, profile);
    if (geoAnomaly) anomalies.push(geoAnomaly);

    // 4. Velocity anomaly (too many requests)
    const velocityAnomaly = this.detectVelocityAnomaly(profile);
    if (velocityAnomaly) anomalies.push(velocityAnomaly);

    // 5. Device fingerprint change
    const deviceAnomaly = this.detectDeviceAnomaly(request, profile);
    if (deviceAnomaly) anomalies.push(deviceAnomaly);

    // 6. Impossible travel detection
    const travelAnomaly = this.detectImpossibleTravel(request, profile);
    if (travelAnomaly) anomalies.push(travelAnomaly);

    // 7. Brute force detection
    const bruteForceAnomaly = this.detectBruteForce(request, profile);
    if (bruteForceAnomaly) anomalies.push(bruteForceAnomaly);

    // 8. Behavioral drift
    const driftAnomaly = this.detectBehavioralDrift(profile);
    if (driftAnomaly) anomalies.push(driftAnomaly);

    // Update metrics
    this.metrics.anomaliesDetected += anomalies.length;
    this.metrics.highSeverityCount += anomalies.filter(
      (a) => a.severity === "HIGH" || a.severity === "CRITICAL"
    ).length;

    return anomalies;
  }

  private static detectTimeAnomaly(
    profile: UserBehaviorProfile
  ): BehaviorAnomaly | null {
    const currentHour = new Date().getHours();
    const hourCount = profile.commonTimeRanges.get(currentHour) || 0;
    const totalAccess = Array.from(profile.commonTimeRanges.values()).reduce(
      (a, b) => a + b,
      0
    );

    if (totalAccess < 10) return null; // Not enough data

    const hourPercentage = (hourCount / totalAccess) * 100;

    // If this hour represents less than 1% of their activity
    if (hourPercentage < 1 && totalAccess > 50) {
      return {
        type: "UNUSUAL_TIME",
        severity: "MEDIUM",
        confidence: Math.min(90, 70 + (50 - hourPercentage)),
        description: `Access at unusual time: ${currentHour}:00 (${hourPercentage.toFixed(
          1
        )}% of normal activity)`,
        metadata: { hour: currentHour, percentage: hourPercentage },
      };
    }

    return null;
  }

  private static detectPathAnomaly(
    request: NextRequest,
    profile: UserBehaviorProfile
  ): BehaviorAnomaly | null {
    const requestPath = request.nextUrl.pathname;

    // Skip common paths
    if (this.isCommonPath(requestPath)) return null;

    const pathCount = profile.typicalPaths.get(requestPath) || 0;
    const totalPaths = Array.from(profile.typicalPaths.values()).reduce(
      (a, b) => a + b,
      0
    );

    // New path for this user
    if (pathCount === 0 && totalPaths > 20) {
      const isSensitive = this.isSensitivePath(requestPath);

      return {
        type: "UNUSUAL_PATH",
        severity: isSensitive ? "HIGH" : "LOW",
        confidence: isSensitive ? 85 : 60,
        description: `First access to ${
          isSensitive ? "sensitive " : ""
        }path: ${requestPath}`,
        metadata: { path: requestPath, sensitive: isSensitive },
      };
    }

    return null;
  }

  private static detectGeographicAnomaly(
    request: NextRequest,
    profile: UserBehaviorProfile
  ): BehaviorAnomaly | null {
    const geoCountry = request.headers.get("x-geo-country");
    const geoCity = request.headers.get("x-geo-city");

    if (!geoCountry) return null;

    const countryCount = profile.geographicPattern.get(geoCountry) || 0;
    const totalGeo = Array.from(profile.geographicPattern.values()).reduce(
      (a, b) => a + b,
      0
    );

    // New country for this user
    if (countryCount === 0 && totalGeo > 5) {
      return {
        type: "GEOGRAPHIC_ANOMALY",
        severity: "HIGH",
        confidence: 90,
        description: `Access from new country: ${geoCountry}${
          geoCity ? ` (${geoCity})` : ""
        }`,
        metadata: { country: geoCountry, city: geoCity },
      };
    }

    return null;
  }

  private static detectVelocityAnomaly(
    profile: UserBehaviorProfile
  ): BehaviorAnomaly | null {
    const now = Date.now();
    const recentRequests = profile.requestTimestamps.filter(
      (ts) => now - ts < this.VELOCITY_WINDOW
    );

    if (recentRequests.length > this.MAX_REQUESTS_PER_MINUTE) {
      return {
        type: "VELOCITY_ANOMALY",
        severity: "HIGH",
        confidence: 95,
        description: `Unusual request velocity: ${recentRequests.length} requests in 1 minute`,
        metadata: { count: recentRequests.length, window: "1 minute" },
      };
    }

    return null;
  }

  private static detectDeviceAnomaly(
    request: NextRequest,
    profile: UserBehaviorProfile
  ): BehaviorAnomaly | null {
    const fingerprint = this.generateDeviceFingerprint(request);

    if (
      profile.deviceFingerprints.size > 0 &&
      !profile.deviceFingerprints.has(fingerprint)
    ) {
      // New device detected
      const deviceCount = profile.deviceFingerprints.size;

      return {
        type: "DEVICE_CHANGE",
        severity: deviceCount > 3 ? "HIGH" : "MEDIUM",
        confidence: 75,
        description: `New device detected (${deviceCount + 1} total devices)`,
        metadata: { totalDevices: deviceCount + 1 },
      };
    }

    return null;
  }

  private static detectImpossibleTravel(
    request: NextRequest,
    profile: UserBehaviorProfile
  ): BehaviorAnomaly | null {
    const currentLat = parseFloat(request.headers.get("x-geo-lat") || "0");
    const currentLon = parseFloat(request.headers.get("x-geo-lon") || "0");
    const currentCountry = request.headers.get("x-geo-country");

    if (!currentLat || !currentLon || !currentCountry) return null;

    const lastLocation = this.recentGeoLocations.get(profile.userId);
    const timeSinceLastRequest = Date.now() - profile.lastRequestTime;

    if (lastLocation && lastLocation.lat && lastLocation.lon) {
      const distance = this.calculateDistance(
        lastLocation.lat,
        lastLocation.lon,
        currentLat,
        currentLon
      );

      const hoursElapsed = timeSinceLastRequest / (1000 * 60 * 60);
      const impliedSpeed = distance / hoursElapsed;

      if (impliedSpeed > this.IMPOSSIBLE_TRAVEL_SPEED && hoursElapsed < 24) {
        return {
          type: "IMPOSSIBLE_TRAVEL",
          severity: "CRITICAL",
          confidence: 95,
          description: `Impossible travel detected: ${Math.round(
            distance
          )}km in ${hoursElapsed.toFixed(1)}h (${Math.round(
            impliedSpeed
          )}km/h)`,
          metadata: {
            distance: Math.round(distance),
            hours: hoursElapsed,
            speed: Math.round(impliedSpeed),
            from: lastLocation.country,
            to: currentCountry,
          },
        };
      }
    }

    // Update last location
    this.recentGeoLocations.set(profile.userId, {
      country: currentCountry,
      lat: currentLat,
      lon: currentLon,
    });

    return null;
  }

  private static detectBruteForce(
    request: NextRequest,
    profile: UserBehaviorProfile
  ): BehaviorAnomaly | null {
    const path = request.nextUrl.pathname;

    // Only check auth-related paths
    if (!path.includes("/auth") && !path.includes("/login")) {
      return null;
    }

    if (profile.failedAuthAttempts > 5) {
      return {
        type: "BRUTE_FORCE_ATTEMPT",
        severity: profile.failedAuthAttempts > 10 ? "CRITICAL" : "HIGH",
        confidence: Math.min(99, 70 + profile.failedAuthAttempts * 2),
        description: `Potential brute force: ${profile.failedAuthAttempts} failed auth attempts`,
        metadata: { attempts: profile.failedAuthAttempts },
      };
    }

    return null;
  }

  private static detectBehavioralDrift(
    profile: UserBehaviorProfile
  ): BehaviorAnomaly | null {
    // Calculate how much current behavior differs from historical patterns
    const now = Date.now();
    const profileAge = now - profile.firstSeen;

    // Only check for drift after sufficient history
    if (profileAge < this.LEARNING_PERIOD * 2) return null;

    // Calculate path diversity change
    const recentPaths = profile.typicalPaths.size;
    const avgPathsExpected = 10; // Baseline

    if (recentPaths > avgPathsExpected * 3) {
      return {
        type: "BEHAVIORAL_DRIFT",
        severity: "MEDIUM",
        confidence: 65,
        description: `Unusual increase in accessed paths: ${recentPaths} unique paths`,
        metadata: { pathCount: recentPaths },
      };
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROFILE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  private static getOrCreateProfile(userId: string): UserBehaviorProfile {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = {
        userId,
        typicalPaths: new Map(),
        requestTimestamps: [],
        averageRequestInterval: 0,
        commonTimeRanges: new Map(),
        typicalPayloadSizes: [],
        geographicPattern: new Map(),
        deviceFingerprints: new Set(),
        failedAuthAttempts: 0,
        successfulAuthCount: 0,
        lastRequestTime: Date.now(),
        firstSeen: Date.now(),
        lastAnalysis: Date.now(),
        riskScore: 0,
      };
      this.userProfiles.set(userId, profile);
    }

    return profile;
  }

  private static updateUserProfile(
    request: NextRequest,
    context: MiddlewareContext,
    profile: UserBehaviorProfile
  ): void {
    const now = Date.now();
    const currentHour = new Date().getHours();
    const currentPath = request.nextUrl.pathname;
    const geoCountry = request.headers.get("x-geo-country") || "unknown";
    const deviceFingerprint = this.generateDeviceFingerprint(request);

    // Update request timestamps
    profile.requestTimestamps.push(now);
    if (profile.requestTimestamps.length > this.MAX_TIMESTAMPS) {
      profile.requestTimestamps = profile.requestTimestamps.slice(
        -this.MAX_TIMESTAMPS
      );
    }

    // Update average request interval
    if (profile.requestTimestamps.length > 1) {
      const intervals = [];
      for (let i = 1; i < profile.requestTimestamps.length; i++) {
        intervals.push(
          profile.requestTimestamps[i] - profile.requestTimestamps[i - 1]
        );
      }
      profile.averageRequestInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }

    // Update path frequency
    const pathCount = profile.typicalPaths.get(currentPath) || 0;
    profile.typicalPaths.set(currentPath, pathCount + 1);

    // Limit path entries
    if (profile.typicalPaths.size > 50) {
      const sorted = Array.from(profile.typicalPaths.entries()).sort(
        (a, b) => b[1] - a[1]
      );
      profile.typicalPaths = new Map(sorted.slice(0, 50));
    }

    // Update time ranges
    const hourCount = profile.commonTimeRanges.get(currentHour) || 0;
    profile.commonTimeRanges.set(currentHour, hourCount + 1);

    // Update geographic pattern
    const countryCount = profile.geographicPattern.get(geoCountry) || 0;
    profile.geographicPattern.set(geoCountry, countryCount + 1);

    // Update device fingerprints
    profile.deviceFingerprints.add(deviceFingerprint);
    if (profile.deviceFingerprints.size > 10) {
      // Keep only most recent devices (convert to array, slice, convert back)
      const devices = Array.from(profile.deviceFingerprints).slice(-10);
      profile.deviceFingerprints = new Set(devices);
    }

    // Update timestamps
    profile.lastRequestTime = now;
    profile.lastAnalysis = now;

    this.userProfiles.set(profile.userId, profile);
    this.metrics.profilesActive = this.userProfiles.size;
  }

  private static cleanupStaleProfiles(): void {
    const now = Date.now();

    // Only cleanup periodically
    if (this.userProfiles.size < this.MAX_PROFILES) return;

    for (const [userId, profile] of this.userProfiles) {
      if (now - profile.lastAnalysis > this.PROFILE_TTL) {
        this.userProfiles.delete(userId);
        this.recentGeoLocations.delete(userId);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESPONSE HANDLING
  // ─────────────────────────────────────────────────────────────────────────
  private static handleAnomalies(
    anomalies: BehaviorAnomaly[],
    riskScore: number,
    profile: UserBehaviorProfile
  ): NextResponse {
    const response = NextResponse.next();

    // Add behavior headers
    response.headers.set("x-behavior-score", riskScore.toFixed(2));
    response.headers.set("x-anomaly-count", anomalies.length.toString());

    // Handle critical anomalies
    const criticalAnomalies = anomalies.filter(
      (a) => a.severity === "CRITICAL"
    );
    if (criticalAnomalies.length > 0) {
      response.headers.set("x-behavior-anomaly", "CRITICAL");
      response.headers.set("x-require-additional-auth", "true");
      response.headers.set("x-block-sensitive-actions", "true");
      return response;
    }

    // Handle high severity anomalies
    const highAnomalies = anomalies.filter(
      (a) => a.severity === "HIGH" && a.confidence > 80
    );
    if (highAnomalies.length > 0) {
      response.headers.set("x-behavior-anomaly", "HIGH");
      response.headers.set("x-require-additional-auth", "true");
      return response;
    }

    // Handle elevated risk
    if (riskScore > 50) {
      response.headers.set("x-behavior-anomaly", "ELEVATED");
      response.headers.set("x-enhanced-logging", "true");
    }

    return response;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────
  private static getUserIdentifier(
    request: NextRequest,
    context: MiddlewareContext
  ): string {
    // Prefer session token if available
    if (context.sessionToken) {
      return `session:${context.sessionToken.substring(0, 16)}`;
    }

    // Fall back to IP + user agent hash
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ua = request.headers.get("user-agent") || "unknown";

    return `anon:${this.simpleHash(ip + ua)}`;
  }

  private static generateDeviceFingerprint(request: NextRequest): string {
    const ua = request.headers.get("user-agent") || "";
    const acceptLang = request.headers.get("accept-language") || "";
    const acceptEnc = request.headers.get("accept-encoding") || "";

    return this.simpleHash(ua + acceptLang + acceptEnc);
  }

  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).substring(0, 12);
  }

  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private static isCommonPath(path: string): boolean {
    return this.COMMON_PATHS.some(
      (common) => path === common || path.startsWith(common + "/")
    );
  }

  private static isSensitivePath(path: string): boolean {
    return this.SENSITIVE_PATHS.some(
      (sensitive) => path === sensitive || path.startsWith(sensitive + "/")
    );
  }

  private static isInLearningPhase(profile: UserBehaviorProfile): boolean {
    return Date.now() - profile.firstSeen < this.LEARNING_PERIOD;
  }

  private static shouldSkipAnalysis(
    request: NextRequest,
    context: MiddlewareContext
  ): boolean {
    const path = request.nextUrl.pathname;

    // Skip static assets
    if (
      path.startsWith("/_next") ||
      path.startsWith("/static") ||
      path.includes("favicon")
    ) {
      return true;
    }

    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCORING
  // ─────────────────────────────────────────────────────────────────────────
  private static calculateRiskScore(
    anomalies: BehaviorAnomaly[],
    profile: UserBehaviorProfile
  ): number {
    let score = 0;

    // Base score from anomalies
    for (const anomaly of anomalies) {
      const severityMultiplier =
        anomaly.severity === "CRITICAL"
          ? 4
          : anomaly.severity === "HIGH"
          ? 3
          : anomaly.severity === "MEDIUM"
          ? 2
          : 1;

      score += (anomaly.confidence * severityMultiplier) / 100;
    }

    // Add historical risk factors
    if (profile.failedAuthAttempts > 0) {
      score += Math.min(20, profile.failedAuthAttempts * 2);
    }

    // Normalize to 0-100
    return Math.min(100, score * 10);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // METRICS & LOGGING
  // ─────────────────────────────────────────────────────────────────────────
  private static updateMetrics(): void {
    if (Date.now() - this.metrics.lastReset > this.METRICS_RESET_INTERVAL) {
      console.log(`[BEHAVIOR ANALYST] 📊 Hourly Stats:`, {
        analyzed: this.metrics.totalAnalyzed,
        anomalies: this.metrics.anomaliesDetected,
        highSeverity: this.metrics.highSeverityCount,
        activeProfiles: this.metrics.profilesActive,
      });

      this.metrics = {
        totalAnalyzed: 0,
        anomaliesDetected: 0,
        highSeverityCount: 0,
        profilesActive: this.userProfiles.size,
        averageRiskScore: 0,
        lastReset: Date.now(),
      };
    }
  }

  private static logAnalysis(
    userId: string,
    anomalies: BehaviorAnomaly[],
    riskScore: number,
    isLearning: boolean
  ): void {
    if (isLearning) return;

    if (anomalies.length === 0 && riskScore < 20) return;

    const icon =
      riskScore >= 70
        ? "🚨"
        : riskScore >= 40
        ? "⚠️"
        : riskScore >= 20
        ? "📊"
        : "ℹ️";

    console.log(
      `[BEHAVIOR ANALYST] ${icon} User: ${userId.substring(
        0,
        12
      )}... | Risk: ${riskScore.toFixed(0)} | Anomalies: ${anomalies.length}`
    );

    anomalies
      .filter((a) => a.severity === "HIGH" || a.severity === "CRITICAL")
      .forEach((a) => {
        console.log(
          `  └─ ${a.severity}: ${a.type} (${a.confidence}% confidence) - ${a.description}`
        );
      });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────
  static getMetrics(): BehaviorMetrics {
    return { ...this.metrics };
  }

  static getUserProfile(userId: string): UserBehaviorProfile | undefined {
    return this.userProfiles.get(userId);
  }

  static recordFailedAuth(userId: string): void {
    const profile = this.getOrCreateProfile(userId);
    profile.failedAuthAttempts++;
    this.userProfiles.set(userId, profile);
  }

  static recordSuccessfulAuth(userId: string): void {
    const profile = this.getOrCreateProfile(userId);
    profile.successfulAuthCount++;
    profile.failedAuthAttempts = 0; // Reset on success
    this.userProfiles.set(userId, profile);
  }

  static resetUserProfile(userId: string): void {
    this.userProfiles.delete(userId);
    this.recentGeoLocations.delete(userId);
  }
}
