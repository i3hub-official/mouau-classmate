// src/lib/server/jwt.ts
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface TokenPayload extends JWTPayload {
  type?: string;
  userId?: string;
  schoolId?: string;
  email?: string;
  role?: string;
  schoolNumber?: string;
  [key: string]: unknown;
}

export interface TokenOptions {
  expiresIn?: string;
  issuer?: string;
  audience?: string;
  subject?: string;
}

class JWTError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "JWTError";
  }
}

export class JWTUtils {
  private static getSecretKey(): Uint8Array {
    // This will only work on the server side
    // Try JWT_SECRET first (for compatibility with existing tokens), then JWT_SUPER_SECRET
    const secret = process.env.JWT_SECRET || process.env.JWT_SUPER_SECRET;

    // Debugging - remove in production
    if (process.env.NODE_ENV === "development") {
      console.log("JWT Secret check:", {
        hasJWT_SECRET: !!process.env.JWT_SECRET,
        hasJWT_SUPER_SECRET: !!process.env.JWT_SUPER_SECRET,
        usingSecret:
          secret === process.env.JWT_SECRET ? "JWT_SECRET" : "JWT_SUPER_SECRET",
        nodeEnv: process.env.NODE_ENV,
        allEnvKeys: Object.keys(process.env).filter((key) =>
          key.includes("JWT")
        ),
      });
    }

    if (!secret) {
      throw new JWTError(
        "JWT_SECRET or JWT_SUPER_SECRET environment variable is not set",
        "MISSING_SECRET"
      );
    }
    return new TextEncoder().encode(secret);
  }

  private static getDefaultOptions(): Required<TokenOptions> {
    return {
      expiresIn: "24h",
      issuer: "cecms-system",
      audience: "cecms-users",
      subject: "auth-token",
    };
  }

  /**
   * Generate a JWT token with the provided payload
   * SERVER-SIDE ONLY
   */
  static async generateToken(
    payload: TokenPayload,
    options: TokenOptions = {}
  ): Promise<string> {
    try {
      const secretKey = this.getSecretKey();
      const defaultOptions = this.getDefaultOptions();
      const finalOptions = { ...defaultOptions, ...options };

      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer(finalOptions.issuer)
        .setAudience(finalOptions.audience)
        .setSubject(finalOptions.subject)
        .setExpirationTime(finalOptions.expiresIn)
        .sign(secretKey);

      return jwt;
    } catch (error) {
      console.error("JWT generation error:", error);
      throw new JWTError("Failed to generate JWT token", "GENERATION_FAILED");
    }
  }

  /**
   * Verify and decode a JWT token
   * SERVER-SIDE ONLY
   */
  static async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const secretKey = this.getSecretKey();

      const { payload } = await jwtVerify(token, secretKey, {
        issuer: "cecms-system",
        audience: "cecms-users",
      });

      return payload as TokenPayload;
    } catch (error) {
      console.error("JWT verification error:", error);

      if (error instanceof Error) {
        if (error.message.includes("expired")) {
          throw new JWTError("Token has expired", "TOKEN_EXPIRED");
        } else if (error.message.includes("invalid")) {
          throw new JWTError("Invalid token", "INVALID_TOKEN");
        } else if (error.message.includes("signature")) {
          throw new JWTError("Invalid token signature", "INVALID_SIGNATURE");
        }
      }

      throw new JWTError("Token verification failed", "VERIFICATION_FAILED");
    }
  }

  /**
   * Generate email verification token
   * SERVER-SIDE ONLY
   */
  static async generateEmailVerificationToken(data: {
    type: "school" | "admin";
    email: string;
    entityId: string;
    schoolNumber?: string;
  }): Promise<string> {
    const payload: TokenPayload = {
      type: "email_verification",
      verifyType: data.type,
      email: data.email,
      entityId: data.entityId,
      schoolNumber: data.schoolNumber,
    };

    return this.generateToken(payload, {
      expiresIn: "24h",
      subject: "email-verification",
    });
  }

  /**
   * Generate password reset token
   * SERVER-SIDE ONLY
   */
  static async generatePasswordResetToken(data: {
    userId: string;
    email: string;
  }): Promise<string> {
    const payload: TokenPayload = {
      type: "password_reset",
      userId: data.userId,
      email: data.email,
    };

    return this.generateToken(payload, {
      expiresIn: "1h",
      subject: "password-reset",
    });
  }

  /**
   * Generate authentication token for login
   * SERVER-SIDE ONLY
   */
  static async generateAuthToken(data: {
    userId: string;
    email: string;
    schoolId: string;
    role: string;
    schoolNumber: string;
  }): Promise<string> {
    const payload: TokenPayload = {
      type: "auth",
      userId: data.userId,
      email: data.email,
      schoolId: data.schoolId,
      role: data.role,
      schoolNumber: data.schoolNumber,
    };

    return this.generateToken(payload, {
      expiresIn: "8h",
      subject: "authentication",
    });
  }

  /**
   * Generate refresh token
   * SERVER-SIDE ONLY
   */
  static async generateRefreshToken(userId: string): Promise<string> {
    const payload: TokenPayload = {
      type: "refresh",
      userId,
    };

    return this.generateToken(payload, {
      expiresIn: "7d",
      subject: "refresh-token",
    });
  }

  /**
   * Verify email verification token
   * SERVER-SIDE ONLY
   */
  static async verifyEmailToken(token: string): Promise<{
    type: "school" | "admin";
    email: string;
    entityId: string;
    schoolNumber?: string;
  }> {
    const payload = await this.verifyToken(token);

    if (payload.type !== "email_verification") {
      throw new JWTError(
        "Invalid token type for email verification",
        "INVALID_TOKEN_TYPE"
      );
    }

    return {
      type: payload.verifyType as "school" | "admin",
      email: payload.email as string,
      entityId: payload.entityId as string,
      schoolNumber: payload.schoolNumber as string,
    };
  }

  /**
   * Verify password reset token
   * SERVER-SIDE ONLY
   */
  static async verifyPasswordResetToken(token: string): Promise<{
    userId: string;
    email: string;
  }> {
    const payload = await this.verifyToken(token);

    if (payload.type !== "password_reset") {
      throw new JWTError(
        "Invalid token type for password reset",
        "INVALID_TOKEN_TYPE"
      );
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
    };
  }

  /**
   * Verify authentication token
   * SERVER-SIDE ONLY
   */
  static async verifyAuthToken(token: string): Promise<{
    userId: string;
    email: string;
    schoolId: string;
    role: string;
    schoolNumber: string;
  }> {
    const payload = await this.verifyToken(token);

    if (payload.type !== "auth") {
      throw new JWTError(
        "Invalid token type for authentication",
        "INVALID_TOKEN_TYPE"
      );
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      schoolId: payload.schoolId as string,
      role: payload.role as string,
      schoolNumber: payload.schoolNumber as string,
    };
  }
}

// Client-safe utilities that don't need the secret
export class JWTClientUtils {
  /**
   * Extract token from Authorization header
   * CLIENT-SAFE
   */
  static extractTokenFromHeader(authorization: string | null): string | null {
    if (!authorization) return null;

    const [bearer, token] = authorization.split(" ");
    if (bearer !== "Bearer" || !token) return null;

    return token;
  }

  /**
   * Decode JWT payload without verification (CLIENT-SAFE but INSECURE)
   * Only use this for reading non-sensitive data from tokens
   * NEVER trust this data for security decisions
   */
  static decodeTokenUnsafe(token: string): TokenPayload | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if token appears to be expired (CLIENT-SAFE but INSECURE)
   * This only checks the exp claim without verification
   * NEVER trust this for security - always verify on server
   */
  static isTokenApparentlyExpired(token: string): boolean {
    const payload = this.decodeTokenUnsafe(token);
    if (!payload?.exp) return true;

    return Date.now() >= payload.exp * 1000;
  }
}

export { JWTError };
