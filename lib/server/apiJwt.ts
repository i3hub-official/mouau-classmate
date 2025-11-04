// File: src/lib/server/apiJwt.ts
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export interface ApiTokenPayload extends JWTPayload {
  type: "api_access";
  clientId: string;
  accessCode: string;
  scopes: string[];
  schoolId?: string;
  ipAddress?: string;
}

export interface ApiTokenOptions {
  expiresIn?: string;
  scopes?: string[];
  ipAddress?: string;
}

class ApiJWTError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "ApiJWTError";
  }
}

export class ApiJWTUtils {
  private static getSecretKey(secretKey: string): Uint8Array {
    return new TextEncoder().encode(secretKey);
  }

  /**
   * Generate API access token
   * SERVER-SIDE ONLY
   */
  static async generateApiToken(
    clientData: {
      clientId: string;
      accessCode: string;
      secretKey: string;
      scopes: string[];
      schoolId?: string;
    },
    options: ApiTokenOptions = {}
  ): Promise<string> {
    try {
      const secretKey = this.getSecretKey(clientData.secretKey);

      const payload: ApiTokenPayload = {
        type: "api_access",
        clientId: clientData.clientId,
        accessCode: clientData.accessCode,
        scopes: options.scopes || clientData.scopes,
        schoolId: clientData.schoolId,
        ipAddress: options.ipAddress,
      };

      const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer("mouaucm-api-system")
        .setAudience("mouaucm-api-clients")
        .setSubject("api-access-token")
        .setExpirationTime(options.expiresIn || "1h")
        .sign(secretKey);

      return jwt;
    } catch (error) {
      console.error("API JWT generation error:", error);
      throw new ApiJWTError("Failed to generate API JWT token", "GENERATION_FAILED");
    }
  }

  /**
   * Verify API access token
   * SERVER-SIDE ONLY
   */
  static async verifyApiToken(token: string, secretKey: string): Promise<ApiTokenPayload> {
    try {
      const key = this.getSecretKey(secretKey);

      const { payload } = await jwtVerify(token, key, {
        issuer: "mouaucm-api-system",
        audience: "mouaucm-api-clients",
      });

      const apiPayload = payload as ApiTokenPayload;

      if (apiPayload.type !== "api_access") {
        throw new ApiJWTError("Invalid token type for API access", "INVALID_TOKEN_TYPE");
      }

      return apiPayload;
    } catch (error) {
      console.error("API JWT verification error:", error);

      if (error instanceof Error) {
        if (error.message.includes("expired")) {
          throw new ApiJWTError("API token has expired", "TOKEN_EXPIRED");
        } else if (error.message.includes("invalid")) {
          throw new ApiJWTError("Invalid API token", "INVALID_TOKEN");
        } else if (error.message.includes("signature")) {
          throw new ApiJWTError("Invalid API token signature", "INVALID_SIGNATURE");
        }
      }

      throw new ApiJWTError("API token verification failed", "VERIFICATION_FAILED");
    }
  }
}

export { ApiJWTError };
