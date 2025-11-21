// File: lib/services/ninVerificationService.ts

import { prisma } from "@/lib/server/prisma";
import { protectData } from "@/lib/security/dataProtection";

interface NINVerificationResult {
  exists: boolean;
  data?: {
    surname?: string;
    firstName?: string;
    otherName?: string;
    gender?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    state?: string;
    lga?: string;
    residenceAddress?: string;
    photo?: string;
  };
  requiresManualEntry?: boolean;
}

interface BalanceResponse {
  status: "success" | "error" | string;
  balance?: number;
  currency?: string;
  message?: string;
  raw?: any;
}

export class NINVerificationService {
  private static readonly API_BASE_URL = "https://checkmyninbvn.com.ng/api";

  private static getApiKey(): string | undefined {
    return process.env.NIN_VERIFICATION_API_KEY;
  }

  /**
   * Check API service balance and availability
   * Returns normalized BalanceResponse
   */
  static async checkBalance(): Promise<BalanceResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      console.error("NIN verification API key not configured");
      throw new Error("API key not configured");
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/balance`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        signal: AbortSignal.timeout(10000), // 10 seconds timeout
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("Balance check API error:", {
          status: response.status,
          statusText: response.statusText,
          data,
        });
        throw new Error(
          data.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Normalize response structure
      if (data && data.status === "success" && data.data) {
        return {
          status: "success",
          balance:
            typeof data.data.balance === "number"
              ? data.data.balance
              : Number(data.data.balance || 0),
          currency: data.data.currency || "NGN",
          message: data.message || "Balance retrieved successfully",
          raw: data,
        };
      }

      // Handle error response
      if (data && data.status === "error") {
        return {
          status: "error",
          message: data.message || "Balance check failed",
          raw: data,
        };
      }

      // Fallback for unexpected response
      return {
        status: "error",
        message: "Unexpected balance API response",
        raw: data,
      };
    } catch (error) {
      console.error("Balance check failed:", error);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Service timeout - please try again");
        }
        if (error.message.includes("fetch")) {
          throw new Error("Service unreachable - please check connection");
        }
      }

      throw new Error("Unable to verify service availability");
    }
  }

  /**
   * Check if service is available and has sufficient balance
   * Currently disabled since we're not using the external API
   */
  static async isServiceAvailable(
    minimumBalance: number = 200
  ): Promise<boolean> {
    // Temporarily return true since we're not using the external API
    // This can be re-enabled when the external API is needed again
    return true;
  }

  /**
   * Get cached NIN data from our database if available
   */
  static async getCachedNINData(nin: string): Promise<NINVerificationResult> {
    try {
      if (!nin) {
        return { exists: false, requiresManualEntry: false };
      }

      const cachedRecord = await prisma.nINCache.findUnique({
        where: { nin },
      });

      if (cachedRecord) {
        return {
          exists: true,
          data: {
            surname: cachedRecord.surname,
            firstName: cachedRecord.firstName,
            otherName: cachedRecord.otherName || "",
            gender: cachedRecord.gender,
            dateOfBirth: cachedRecord.dateOfBirth,
            phoneNumber: cachedRecord.phoneNumber,
            state: cachedRecord.state || "",
            lga: cachedRecord.lga || "",
            residenceAddress: cachedRecord.residenceAddress || "",
            photo: cachedRecord.photo || "",
          },
        };
      }

      return {
        exists: false,
        requiresManualEntry: false, // Don't require manual entry just because cache is empty
      };
    } catch (error) {
      console.error("Failed to get cached NIN data:", error);
      return {
        exists: false,
        requiresManualEntry: false,
      };
    }
  }

  /**
   * Check if NIN exists in our student database
   */
  static async checkStudentDBForNIN(
    nin: string
  ): Promise<{ exists: boolean; studentData?: any }> {
    try {
      if (!nin) {
        return { exists: false };
      }

      // Find all students with NIN (encrypted)
      const studentsWithNIN = await prisma.student.findMany({
        where: {
          nin: {
            not: "",
          },
        },
        select: {
          id: true,
          nin: true,
          userId: true,
          firstName: true,
          surname: true,
          otherName: true,
          gender: true,
          dateOfBirth: true,
          phone: true,
          state: true,
          lga: true,
        },
      });

      // Check each student's decrypted NIN
      for (const student of studentsWithNIN) {
        try {
          const decryptedNIN = await protectData(student.nin || "", "nin");
          if (
            decryptedNIN.encrypted === nin ||
            decryptedNIN.searchHash === nin
          ) {
            return {
              exists: true,
              studentData: student,
            };
          }
        } catch (decryptError) {
          console.error("Error decrypting NIN:", decryptError);
          continue;
        }
      }

      return { exists: false };
    } catch (error) {
      console.error("Failed to check student DB for NIN:", error);
      return { exists: false };
    }
  }

  /**
   * Save verified NIN data to our database for future reference
   */
  static async saveVerifiedNINData(nin: string, ninData: any): Promise<void> {
    try {
      if (!nin) {
        console.warn("Cannot save NIN data: NIN is empty");
        return;
      }

      // Check if we already have this NIN in our cache
      const existingRecord = await prisma.nINCache.findUnique({
        where: { nin },
      });

      if (existingRecord) {
        // Update existing record
        await prisma.nINCache.update({
          where: { nin },
          data: {
            surname: ninData.surname,
            firstName: ninData.firstname,
            otherName: ninData.middlename,
            gender: ninData.gender,
            dateOfBirth: ninData.birthdate,
            phoneNumber: ninData.telephoneno,
            state: ninData.birthstate,
            lga: ninData.birthlga,
            residenceAddress: ninData.residence_address,
            photo: ninData.photo,
            lastVerified: new Date(),
          },
        });
      } else {
        // Create new record
        await prisma.nINCache.create({
          data: {
            nin,
            surname: ninData.surname,
            firstName: ninData.firstname,
            otherName: ninData.middlename,
            gender: ninData.gender,
            dateOfBirth: ninData.birthdate,
            phoneNumber: ninData.telephoneno,
            state: ninData.birthstate,
            lga: ninData.birthlga,
            residenceAddress: ninData.residence_address,
            photo: ninData.photo,
            firstVerified: new Date(),
            lastVerified: new Date(),
          },
        });
      }

      console.log(`NIN data cached: ${nin}`);
    } catch (error) {
      console.error("Failed to cache NIN data:", error);
      // Don't throw error here as this is not critical for the main flow
    }
  }

  /**
   * TEMPORARILY DISABLED: Verify NIN with official NIN verification API
   * This method is disabled to check database first
   */
  static async verifyNIN(nin: string): Promise<NINVerificationResult> {
    // Temporarily return that NIN doesn't exist to force database check
    return {
      exists: false,
      requiresManualEntry: true,
    };
  }

  /**
   * TEMPORARILY DISABLED: Search NIN by phone number
   * This method is disabled to check database first
   */
  static async searchNINByPhone(phone: string): Promise<NINVerificationResult> {
    // Temporarily return that NIN doesn't exist to force database check
    return {
      exists: false,
      requiresManualEntry: true,
    };
  }
}
