// ========================================
// 🛡️ ENHANCED THREAT DETECTOR - Military-Grade Security Scanner
// Responsibility: Detect and block sophisticated attacks with advanced patterns
// ========================================

// File: src/lib/middleware/threatDetector.ts
import { NextRequest, NextResponse } from "next/server";
import type { MiddlewareContext } from "./types";
import { TrustedSourceManager } from "./trustedSourceManager";

interface ThreatScore {
  score: number; // 0-100, higher = more dangerous
  reasons: string[];
  category: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  attackVectors: string[];
  confidence: number; // 0-100, how confident we are in the detection
}

interface IPIntelligence {
  count: number;
  lastSeen: number;
  threatLevel: number;
  attackTypes: Set<string>;
  firstSeen: number;
  userAgents: Set<string>;
}

export class ThreatDetector {
  private static suspiciousIPs = new Map<string, IPIntelligence>();
  private static requestFrequency = new Map<string, number[]>();
  private static blockedPatterns = new Set<string>();

  private static readonly ADVANCED_THREAT_PATTERNS = {
    // SQL Injection - Enhanced patterns
    SQL_INJECTION: [
      // Classic patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|MERGE)\b.*\b(FROM|INTO|SET|TABLE|DATABASE|WHERE|ORDER BY|GROUP BY)\b)/gi,
      /'.*(\bOR\b|\bAND\b).*'.*[=<>]/gi,
      /(1=1|1=0|'='|"="|0x[0-9a-f]+)/gi,
      /(--|\/\*|\*\/|\|\||@@|char\(|varchar\(|cast\()/gi,

      // Advanced evasion
      /\b(waitfor|delay|sleep|benchmark)\s*\(/gi,
      /(load_file|into\s+outfile|into\s+dumpfile)/gi,
      /(information_schema|sysobjects|syscolumns|pg_tables)/gi,
      /(concat|substring|ascii|hex|unhex|md5|sha1)/gi,
      /(xp_cmdshell|sp_execute|openrowset|opendatasource)/gi,

      // Time-based and blind injection
      /(if\s*\(|case\s+when|iif\s*\()/gi,
      /(extractvalue|updatexml|exp\(|pow\(|floor\()/gi,
      /(\+|%2B)(select|union|insert|update|delete)/gi,
    ],

    // XSS - Comprehensive patterns
    XSS: [
      // Classic script injection
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^>]*>/gi,
      /<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi,

      // Event handlers
      /\bon\w+\s*=\s*["']?[^"'>]*["'>]/gi,
      /(onload|onerror|onclick|onmouseover|onfocus|onblur|onkeyup|onkeydown|onchange|onsubmit)\s*=/gi,

      // Protocol handlers
      /(javascript|vbscript|data|file|ftp):/gi,
      /(expression\s*\(|url\s*\(|@import)/gi,

      // Advanced evasion
      /(&#x?[0-9a-f]+;?|%[0-9a-f]{2}|\\u[0-9a-f]{4}|\\x[0-9a-f]{2})/gi,
      /(\+ADw-|\+ADs-|\+AD4-)/gi, // UTF-7 encoding
      /(eval\s*\(|setTimeout\s*\(|setInterval\s*\()/gi,
      /(String\.fromCharCode|unescape|decodeURI)/gi,
    ],

    // Command Injection - Enhanced
    COMMAND_INJECTION: [
      // Shell metacharacters
      /[;&|`$\(\){}]/g,
      /(&&|\|\||;;|&|\|)/g,
      /(\$\(|\`|%[0-9a-f]{2})/gi,

      // Common commands
      /\b(wget|curl|nc|netcat|telnet|ssh|scp|rsync|tar|zip|unzip)\b/gi,
      /\b(cat|ls|pwd|whoami|id|uname|ps|kill|chmod|chown|su|sudo)\b/gi,
      /\b(rm|mv|cp|mkdir|rmdir|touch|find|grep|awk|sed)\b/gi,

      // Windows commands
      /(cmd|command|powershell|bash|sh|zsh|fish|csh|tcsh)(\.|\.exe|;|\||&)/gi,
      /\b(dir|type|copy|del|move|attrib|icacls|net|sc|wmic)\b/gi,

      // Path traversal in commands
      /(\.\.\/|\.\.\\|\.\.%2f|\.\.%5c)/gi,
      /(\.\/)|(\.\\)/gi,

      // Base64 and encoded commands
      /\b(base64|echo|printf)\b.*[A-Za-z0-9+\/=]{20,}/gi,
      /(IEX|Invoke-Expression|powershell\s+-e)/gi,
    ],

    // Path Traversal - Advanced
    PATH_TRAVERSAL: [
      // Classic traversal
      /(\.\.(\/|\\|%2f|%5c)){2,}/gi,
      /(\.\/|\.\\|%2e%2f|%2e%5c)/gi,

      // System paths
      /(\/etc\/|\/proc\/|\/sys\/|\/dev\/|\/tmp\/|\/var\/)/gi,
      /(C:\\Windows\\|C:\\Program|D:\\|E:\\)/gi,
      /(\$HOME|\$USER|\%USERPROFILE\%|\%APPDATA\%)/gi,

      // Null bytes and encoding
      /(\0|%00|%c0%af|%e0%80%af)/gi,

      // Double encoding
      /(%252e|%252f|%255c)/gi,

      // Unicode normalization
      /(\.%u002e|%uff0e)/gi,
    ],

    // LDAP Injection
    LDAP_INJECTION: [
      /(\*|\(|\)|&|\||\!|=|<|>|~)/g,
      /(objectClass|cn=|ou=|dc=)/gi,
      /(\(\w*=\*\)|\(\|\(\w*=)/gi,
    ],

    // XXE (XML External Entity)
    XXE: [
      /(<!ENTITY|<!DOCTYPE)/gi,
      /(SYSTEM|PUBLIC).*["'](file|http|ftp):/gi,
      /(&\w+;|%\w+;)/gi,
    ],

    // SSRF (Server-Side Request Forgery)
    SSRF: [
      /(file:\/\/|ftp:\/\/|gopher:\/\/|dict:\/\/)/gi,
      /(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.)/gi,
      /(metadata\.google|169\.254\.169\.254)/gi,
      /(@|%40)(localhost|127\.0\.0\.1)/gi,
    ],

    // NoSQL Injection
    NOSQL_INJECTION: [
      /(\$gt|\$lt|\$ne|\$in|\$nin|\$regex|\$where)/gi,
      /(true|false|null).*[,\]]/gi,
      /(\{|\}|\[|\]|;|:).*(\$|javascript)/gi,
    ],

    // Template Injection
    TEMPLATE_INJECTION: [
      /(\{\{|\}\}|\{%|%\}|\$\{|\})/g,
      /(config|self|request|subprocess|os|sys)/gi,
      /(__.*__|\[\[|\]\])/gi,
    ],

    // Bot and Scanner Signatures
    BOT_SIGNATURES: [
      // Common bots
      /(bot|crawler|spider|scraper|scanner)/gi,
      /(automated|headless|phantom|selenium|puppeteer)/gi,
      /(curl|wget|python-requests|postman|insomnia)/gi,
      /(nmap|sqlmap|nikto|dirb|gobuster|wfuzz|burp)/gi,

      // Security tools
      /(acunetix|nessus|openvas|qualys|rapid7)/gi,
      /(metasploit|cobalt|beef|zap|w3af)/gi,
      /(masscan|zmap|nuclei|httpx|subfinder)/gi,

      // Malicious user agents
      /(badbot|spambot|harvester|emailcollector)/gi,
    ],

    // Cryptocurrency Mining
    CRYPTO_MINING: [
      /(monero|bitcoin|ethereum|mining|miner|hash|cryptonight)/gi,
      /(xmrig|cpuminer|cgminer|bfgminer)/gi,
      /(stratum|pool\.|coinhive|jsecoin)/gi,
    ],

    // Data Exfiltration
    DATA_EXFILTRATION: [
      /(password|passwd|pwd|secret|key|token|auth)/gi,
      /(credit|card|ssn|social|security|bank)/gi,
      /(email|phone|address|personal|private)/gi,
      /(\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b)/g, // Credit card pattern
      /(\b\d{3}-\d{2}-\d{4}\b)/g, // SSN pattern
    ],

    // Denial of Service
    DOS_PATTERNS: [
      /(stress|flood|ddos|dos|attack)/gi,
      /(slowloris|hulk|torshammer)/gi,
      /(\.{1000,}|A{1000,}|X{1000,})/gi, // Long strings
    ],

    // Advanced Evasion
    EVASION_TECHNIQUES: [
      // Encoding variations
      /(%[0-9a-f]{2}){5,}/gi,
      /(&#x?[0-9a-f]+;?){3,}/gi,
      /(\\u[0-9a-f]{4}){2,}/gi,

      // Case variations
      /(SeLeCt|InSeRt|UnIoN|WhErE)/gi,

      // Comment variations
      /(\/\*.*?\*\/|--.*$|#.*$)/gi,

      // String concatenation
      /('.*'\+.*'|".*"\+.*"|CONCAT\(|CHR\(|CHAR\()/gi,
    ],
  };

  private static readonly THREAT_SCORING = {
    SQL_INJECTION: 35,
    XSS: 30,
    COMMAND_INJECTION: 40,
    PATH_TRAVERSAL: 25,
    LDAP_INJECTION: 30,
    XXE: 35,
    SSRF: 40,
    NOSQL_INJECTION: 30,
    TEMPLATE_INJECTION: 35,
    BOT_SIGNATURES: 15,
    CRYPTO_MINING: 25,
    DATA_EXFILTRATION: 45,
    DOS_PATTERNS: 30,
    EVASION_TECHNIQUES: 20,
  };

  static async detect(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<NextResponse> {
    try {
      // Initialize trusted sources if not already done
      if (!TrustedSourceManager.getTrustedSources().length) {
        TrustedSourceManager.initialize();
        console.info("[THREAT DETECTOR] 🛡️ Trusted sources initialized");
      }

      // Check if source is trusted FIRST
      const trustCheck = TrustedSourceManager.isTrusted(request, {
        clientIp: context.clientIp,
        userAgent: context.userAgent,
      });

      if (trustCheck.isTrusted) {
        const response = NextResponse.next();
        response.headers.set("x-trust-level", trustCheck.trustLevel!);
        response.headers.set("x-trust-source", trustCheck.source!.name);
        response.headers.set("x-threat-level", "TRUSTED");
        response.headers.set("x-threat-score", "0");

        // Still do minimal logging for trusted sources
        if (trustCheck.trustLevel !== "ABSOLUTE") {
          console.log(
            `[THREAT DETECTOR] 🛡️ Trusted source: ${trustCheck.reason}`
          );
        }

        return response;
      }

      // Proceed with normal threat detection for untrusted sources
      const threatScore = await this.calculateAdvancedThreatScore(
        request,
        context
      );

      // Update IP intelligence
      this.updateIPIntelligence(context.clientIp, threatScore);

      // Block critical threats immediately with enhanced page
      if (threatScore.category === "CRITICAL" || threatScore.score > 85) {
        console.log(
          `[THREAT DETECTOR] ❌ CRITICAL threat blocked: ${threatScore.reasons.join(", ")}`
        );
        await this.logThreatIncident(request, context, threatScore, "BLOCKED");
        return this.createEnhancedThreatResponse(
          threatScore,
          "BLOCKED",
          request
        );
      }

      // High threats get extra scrutiny and rate limiting
      if (threatScore.category === "HIGH" || threatScore.score > 65) {
        console.log(
          `[THREAT DETECTOR] ⚠️ HIGH threat detected: ${threatScore.reasons.join(", ")}`
        );
        await this.logThreatIncident(request, context, threatScore, "FLAGGED");

        const response = NextResponse.next();
        response.headers.set("x-threat-level", threatScore.category);
        response.headers.set("x-threat-score", threatScore.score.toString());
        response.headers.set(
          "x-threat-confidence",
          threatScore.confidence.toString()
        );
        response.headers.set("x-extra-rate-limit", "true");
        response.headers.set("x-security-review", "required");
        return response;
      }

      // Medium threats are logged but allowed
      if (threatScore.category === "MEDIUM" || threatScore.score > 40) {
        console.log(
          `[THREAT DETECTOR] ⚡ MEDIUM threat logged: ${threatScore.reasons.join(", ")}`
        );
        await this.logThreatIncident(request, context, threatScore, "LOGGED");
      }

      const response = NextResponse.next();
      response.headers.set("x-threat-level", threatScore.category);
      response.headers.set("x-threat-score", threatScore.score.toString());
      response.headers.set(
        "x-threat-confidence",
        threatScore.confidence.toString()
      );

      return response;
    } catch (error) {
      console.error("[THREAT DETECTOR] Error in threat detection:", error);
      return NextResponse.next();
    }
  }

  private static createEnhancedThreatResponse(
    threatScore: ThreatScore,
    action: string,
    request: NextRequest
  ): NextResponse {
    const incidentId = `THR_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Create URL for security block page with details
    const blockPageUrl = new URL("/security-block", request.url);
    blockPageUrl.searchParams.set(
      "reason",
      threatScore.reasons[0] || "Security policy violation"
    );
    blockPageUrl.searchParams.set("incident_id", incidentId);
    blockPageUrl.searchParams.set("category", threatScore.category);
    blockPageUrl.searchParams.set(
      "confidence",
      threatScore.confidence.toString()
    );
    blockPageUrl.searchParams.set(
      "vectors",
      threatScore.attackVectors.join(",")
    );

    const response = NextResponse.redirect(blockPageUrl);

    // Add security headers
    response.headers.set("X-Threat-Score", threatScore.score.toString());
    response.headers.set("X-Threat-Category", threatScore.category);
    response.headers.set(
      "X-Threat-Confidence",
      threatScore.confidence.toString()
    );
    response.headers.set(
      "X-Attack-Vectors",
      threatScore.attackVectors.join(",")
    );
    response.headers.set("X-Security-Action", action);
    response.headers.set("X-Incident-ID", incidentId);

    return response;
  }

  private static async calculateAdvancedThreatScore(
    request: NextRequest,
    context: MiddlewareContext
  ): Promise<ThreatScore> {
    let score = 0;
    const reasons: string[] = [];
    const attackVectors: string[] = [];
    let confidence = 0;

    // Analyze multiple request components
    const components = {
      url: request.url,
      userAgent: request.headers.get("user-agent") || "",
      referer: request.headers.get("referer") || "",
      authorization: request.headers.get("authorization") || "",
      contentType: request.headers.get("content-type") || "",
      accept: request.headers.get("accept") || "",
      acceptEncoding: request.headers.get("accept-encoding") || "",
      xForwardedFor: request.headers.get("x-forwarded-for") || "",
      origin: request.headers.get("origin") || "",
      host: request.headers.get("host") || "",
    };

    // Pattern matching across all components
    for (const [componentName, componentValue] of Object.entries(components)) {
      if (!componentValue) continue;

      const componentThreat = this.analyzeComponent(
        componentValue,
        componentName
      );
      score += componentThreat.score;
      reasons.push(...componentThreat.reasons);
      attackVectors.push(...componentThreat.attackVectors);
      confidence += componentThreat.confidence;
    }

    // Advanced behavioral analysis
    const behaviorThreat = this.analyzeBehavior(request, context);
    score += behaviorThreat.score;
    reasons.push(...behaviorThreat.reasons);
    attackVectors.push(...behaviorThreat.attackVectors);

    // IP reputation analysis
    const ipThreat = this.analyzeIPReputation(context.clientIp);
    score += ipThreat.score;
    reasons.push(...ipThreat.reasons);

    // Request frequency analysis
    const frequencyThreat = this.analyzeRequestFrequency(context.clientIp);
    score += frequencyThreat.score;
    reasons.push(...frequencyThreat.reasons);

    // Calculate final confidence
    confidence = Math.min(100, confidence / Object.keys(components).length);

    // Determine category with confidence weighting
    let category: ThreatScore["category"] = "LOW";
    const adjustedScore = score * (confidence / 100);

    if (adjustedScore >= 85) category = "CRITICAL";
    else if (adjustedScore >= 65) category = "HIGH";
    else if (adjustedScore >= 40) category = "MEDIUM";

    return {
      score: Math.min(100, score),
      reasons: [...new Set(reasons)], // Remove duplicates
      category,
      attackVectors: [...new Set(attackVectors)],
      confidence: Math.round(confidence),
    };
  }

  private static analyzeComponent(
    value: string,
    componentName: string
  ): {
    score: number;
    reasons: string[];
    attackVectors: string[];
    confidence: number;
  } {
    let score = 0;
    const reasons: string[] = [];
    const attackVectors: string[] = [];
    let matchCount = 0;
    let totalPatterns = 0;

    for (const [category, patterns] of Object.entries(
      this.ADVANCED_THREAT_PATTERNS
    )) {
      totalPatterns += patterns.length;
      for (const pattern of patterns) {
        if (pattern.test(value)) {
          const points =
            this.THREAT_SCORING[category as keyof typeof this.THREAT_SCORING] ||
            5;
          score += points;
          reasons.push(`${category} in ${componentName}`);
          attackVectors.push(category);
          matchCount++;
          break; // Avoid double-counting same category
        }
      }
    }

    const confidence =
      matchCount > 0
        ? Math.min(100, (matchCount / totalPatterns) * 100 + 50)
        : 0;

    return { score: Math.min(100, score), reasons, attackVectors, confidence };
  }

  private static analyzeBehavior(
    request: NextRequest,
    context: MiddlewareContext
  ): {
    score: number;
    reasons: string[];
    attackVectors: string[];
  } {
    let score = 0;
    const reasons: string[] = [];
    const attackVectors: string[] = [];

    // Unusual HTTP methods
    if (
      !["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"].includes(
        request.method
      )
    ) {
      score += 15;
      reasons.push("Unusual HTTP method");
      attackVectors.push("METHOD_ABUSE");
    }

    // Missing critical headers
    const userAgent = request.headers.get("user-agent");
    if (!userAgent || userAgent.length < 10) {
      score += 20;
      reasons.push("Missing or suspicious User-Agent");
      attackVectors.push("HEADER_ANOMALY");
    }

    // Suspicious accept headers
    const accept = request.headers.get("accept");
    if (accept && accept.includes("*/*") && !accept.includes("text/html")) {
      score += 10;
      reasons.push("Non-browser accept header");
      attackVectors.push("AUTOMATED_REQUEST");
    }

    // API access without proper authentication
    if (request.nextUrl.pathname.startsWith("/api/v1")) {
      if (
        !request.headers.get("authorization") &&
        !request.cookies.get("session-token")
      ) {
        score += 15;
        reasons.push("API access without authentication");
        attackVectors.push("API_ABUSE");
      }
    }

    // Unusual content-length for method
    const contentLength = request.headers.get("content-length");
    if (
      request.method === "GET" &&
      contentLength &&
      parseInt(contentLength) > 0
    ) {
      score += 10;
      reasons.push("GET request with body");
      attackVectors.push("PROTOCOL_ABUSE");
    }

    // Check for common attack paths
    const suspiciousPaths = [
      /\/admin|\/wp-admin|\/phpmyadmin|\/config|\/backup/gi,
      /\.(env|config|ini|log|bak|sql|txt)$/gi,
      /\/\./gi, // Hidden files
    ];

    for (const pathPattern of suspiciousPaths) {
      if (pathPattern.test(request.nextUrl.pathname)) {
        score += 20;
        reasons.push("Access to sensitive path");
        attackVectors.push("RECONNAISSANCE");
        break;
      }
    }

    return { score, reasons, attackVectors };
  }

  private static analyzeIPReputation(ip: string): {
    score: number;
    reasons: string[];
  } {
    const intelligence = this.suspiciousIPs.get(ip);
    let score = 0;
    const reasons: string[] = [];

    if (intelligence) {
      // High frequency of past threats
      if (intelligence.count > 20) {
        score += 30;
        reasons.push("High threat history from IP");
      } else if (intelligence.count > 10) {
        score += 20;
        reasons.push("Moderate threat history from IP");
      } else if (intelligence.count > 5) {
        score += 10;
        reasons.push("Some threat history from IP");
      }

      // Recent activity
      const hoursSinceLastSeen =
        (Date.now() - intelligence.lastSeen) / (1000 * 60 * 60);
      if (hoursSinceLastSeen < 1 && intelligence.count > 5) {
        score += 15;
        reasons.push("Recent repeated suspicious activity");
      }

      // Diverse attack types indicate sophisticated threat
      if (intelligence.attackTypes.size > 3) {
        score += 20;
        reasons.push("Multiple attack vectors from IP");
      }

      // Multiple user agents indicate potential bot
      if (intelligence.userAgents.size > 5) {
        score += 15;
        reasons.push("Multiple user agents from IP");
      }
    }

    return { score, reasons };
  }

  private static analyzeRequestFrequency(ip: string): {
    score: number;
    reasons: string[];
  } {
    const now = Date.now();
    const frequencies = this.requestFrequency.get(ip) || [];

    // Remove old entries (older than 1 hour)
    const recentFrequencies = frequencies.filter(
      (time) => now - time < 3600000
    );
    this.requestFrequency.set(ip, recentFrequencies);

    let score = 0;
    const reasons: string[] = [];

    // High frequency in last hour
    if (recentFrequencies.length > 1000) {
      score += 40;
      reasons.push("Extremely high request frequency");
    } else if (recentFrequencies.length > 500) {
      score += 30;
      reasons.push("Very high request frequency");
    } else if (recentFrequencies.length > 200) {
      score += 20;
      reasons.push("High request frequency");
    } else if (recentFrequencies.length > 100) {
      score += 10;
      reasons.push("Elevated request frequency");
    }

    // Add current request
    recentFrequencies.push(now);

    return { score, reasons };
  }

  private static updateIPIntelligence(
    ip: string,
    threatScore: ThreatScore
  ): void {
    if (threatScore.score > 40) {
      const intelligence = this.suspiciousIPs.get(ip) || {
        count: 0,
        lastSeen: 0,
        threatLevel: 0,
        attackTypes: new Set<string>(),
        firstSeen: Date.now(),
        userAgents: new Set<string>(),
      };

      intelligence.count += 1;
      intelligence.lastSeen = Date.now();
      intelligence.threatLevel = Math.max(
        intelligence.threatLevel,
        threatScore.score
      );

      // Track attack types
      threatScore.attackVectors.forEach((vector) =>
        intelligence.attackTypes.add(vector)
      );

      this.suspiciousIPs.set(ip, intelligence);

      // Auto-block IPs with very high threat scores
      if (threatScore.score > 90) {
        this.blockedPatterns.add(ip);
        console.log(`[THREAT DETECTOR] 🚫 Auto-blocked IP: ${ip}`);
      }
    }
  }

  private static async logThreatIncident(
    request: NextRequest,
    context: MiddlewareContext,
    threatScore: ThreatScore,
    action: string
  ): Promise<void> {
    try {
      // In a real implementation, you'd log to your security system
      const incident = {
        timestamp: new Date().toISOString(),
        ip: context.clientIp,
        userAgent: context.userAgent,
        url: request.url,
        method: request.method,
        threatScore: threatScore.score,
        category: threatScore.category,
        confidence: threatScore.confidence,
        reasons: threatScore.reasons,
        attackVectors: threatScore.attackVectors,
        action,
        headers: Object.fromEntries(request.headers.entries()),
      };

      console.log(
        `[THREAT DETECTOR] 📊 Security incident logged:`,
        JSON.stringify(incident, null, 2)
      );

      // TODO: Send to SIEM, security dashboard, or alert system
    } catch (error) {
      console.error("[THREAT DETECTOR] Error logging incident:", error);
    }
  }

  private static createThreatResponse(
    threatScore: ThreatScore,
    action: string
  ): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "THREAT_DETECTED",
          message: "Request blocked due to security concerns",
          category: threatScore.category,
          confidence: threatScore.confidence,
          action,
          incident_id: `THR_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        },
      },
      {
        status: 403,
        headers: {
          "X-Threat-Score": threatScore.score.toString(),
          "X-Threat-Category": threatScore.category,
          "X-Threat-Confidence": threatScore.confidence.toString(),
          "X-Attack-Vectors": threatScore.attackVectors.join(","),
          "X-Security-Action": action,
        },
      }
    );
  }

  // Public methods for monitoring and management
  static getThreatStatistics() {
    const now = Date.now();
    const stats = {
      trackedIPs: this.suspiciousIPs.size,
      blockedPatterns: this.blockedPatterns.size,
      highThreatIPs: 0,
      recentThreats: 0,
      topAttackVectors: new Map<string, number>(),
    };

    for (const [ip, intelligence] of this.suspiciousIPs.entries()) {
      if (intelligence.threatLevel > 60) stats.highThreatIPs++;
      if (now - intelligence.lastSeen < 3600000) stats.recentThreats++; // Last hour

      // Count attack vectors
      intelligence.attackTypes.forEach((vector) => {
        stats.topAttackVectors.set(
          vector,
          (stats.topAttackVectors.get(vector) || 0) + 1
        );
      });
    }

    return stats;
  }

  static clearIPIntelligence(olderThanHours: number = 24): void {
    const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
    let cleared = 0;

    for (const [ip, intelligence] of this.suspiciousIPs.entries()) {
      if (intelligence.lastSeen < cutoff) {
        this.suspiciousIPs.delete(ip);
        cleared++;
      }
    }

    console.log(
      `[THREAT DETECTOR] 🧹 Cleared ${cleared} old IP intelligence entries`
    );
  }

  static isBlocked(ip: string): boolean {
    return this.blockedPatterns.has(ip);
  }

  static unblockIP(ip: string): void {
    this.blockedPatterns.delete(ip);
    console.log(`[THREAT DETECTOR] ✅ Unblocked IP: ${ip}`);
  }
}
