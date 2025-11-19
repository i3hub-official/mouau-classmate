// lib/security/dataProtection.ts
import {
  encryptHighestSecurity,
  encryptSearchable,
  encryptBasic,
  decryptHighestSecurity,
  decryptSearchable,
  decryptBasic,
  hashData as encryptHash,
  verifyHash,
  generateSearchHash,
} from "@/lib/security/encryption";
import * as crypto from "crypto";

export type ProtectionTier =
  | "government"
  | "email"
  | "phone"
  | "nin"
  | "gender"
  | "date"
  | "location"
  | "name"
  | "system-code"
  | "password"
  | "general";

/**
 * Password-specific utilities using PBKDF2
 */
export class PasswordSecurity {
  private static readonly SALT_LENGTH = 32;
  private static readonly KEY_LENGTH = 64;
  private static readonly ITERATIONS = 100000;
  private static readonly ALGORITHM = "sha256";
  private static readonly ENCODING = "hex";

  /**
   * Hashes a password using PBKDF2
   */
  static async hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(this.SALT_LENGTH).toString(this.ENCODING);

      crypto.pbkdf2(
        password,
        salt,
        this.ITERATIONS,
        this.KEY_LENGTH,
        this.ALGORITHM,
        (err, derivedKey) => {
          if (err) {
            reject(err);
          } else {
            const hash = derivedKey.toString(this.ENCODING);
            const result = `${this.ITERATIONS}:${salt}:${hash}`;
            resolve(result);
          }
        }
      );
    });
  }

  /**
   * Generates a random secure password
   */
  static generateSecurePassword(length: number = 16): string {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    let password = "";

    // Ensure at least one of each required character type
    password += this.getRandomChar("abcdefghijklmnopqrstuvwxyz"); // lowercase
    password += this.getRandomChar("ABCDEFGHIJKLMNOPQRSTUVWXYZ"); // uppercase
    password += this.getRandomChar("0123456789"); // number
    password += this.getRandomChar("!@#$%^&*()_+-=[]{}|;:,.<>?"); // special

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += this.getRandomChar(charset);
    }

    // Shuffle the password
    return this.shuffleString(password);
  }

  private static getRandomChar(charset: string): string {
    const randomIndex = crypto.randomInt(0, charset.length);
    return charset[randomIndex];
  }

  private static shuffleString(str: string): string {
    const array = str.split("");
    for (let i = array.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join("");
  }

  /**
   * Verifies a password against a hash
   */
  static async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const parts = hashedPassword.split(":");
        if (parts.length !== 3) {
          resolve(false);
          return;
        }

        const iterations = parseInt(parts[0], 10);
        const salt = parts[1];
        const storedHash = parts[2];

        crypto.pbkdf2(
          password,
          salt,
          iterations,
          this.KEY_LENGTH,
          this.ALGORITHM,
          (err, derivedKey) => {
            if (err) {
              reject(err);
            } else {
              const computedHash = derivedKey.toString(this.ENCODING);
              // Use timing-safe comparison
              const storedBuffer = Buffer.from(storedHash, "hex");
              const computedBuffer = Buffer.from(computedHash, "hex");

              if (storedBuffer.length !== computedBuffer.length) {
                resolve(false);
                return;
              }

              const isValid = crypto.timingSafeEqual(
                storedBuffer,
                computedBuffer
              );
              resolve(isValid);
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Validates password strength
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    const commonPasswords = [
      "password",
      "123456",
      "password123",
      "admin",
      "qwerty",
      "letmein",
      "welcome",
      "monkey",
      "abc123",
      "password1",
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push("Password is too common. Please choose a stronger password.");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Checks if a password needs rehashing
   */
  static needsRehash(hashedPassword: string): boolean {
    try {
      const parts = hashedPassword.split(":");
      if (parts.length !== 3) {
        return true;
      }
      const iterations = parseInt(parts[0], 10);
      return iterations !== this.ITERATIONS;
    } catch {
      return true;
    }
  }
}

/**
 * Protect sensitive data according to its tier.
 */
export async function protectData(
  data: string,
  tier: ProtectionTier
): Promise<{ encrypted: string; searchHash?: string }> {
  if (!data) return { encrypted: "" };

  switch (tier) {
    case "government":
      return { encrypted: encryptHighestSecurity(data) };

    case "email": {
      const normalized = data.trim().toLowerCase();
      return {
        encrypted: encryptSearchable(normalized, "email"),
        searchHash: generateSearchHash(normalized),
      };
    }

    case "phone": {
      const normalized = data.trim();
      return {
        encrypted: encryptSearchable(normalized, "phone"),
        searchHash: generateSearchHash(normalized),
      };
    }

    case "nin": {
      const normalized = data.trim();
      return {
        encrypted: encryptSearchable(normalized, "nin"),
        searchHash: generateSearchHash(normalized),
      };
    }

    case "password":
      // Use PBKDF2 for password hashing
      return { encrypted: await PasswordSecurity.hashPassword(data) };

    case "gender":
    case "date":
    case "location":
    case "name":
    case "general":
      return { encrypted: encryptBasic(data) };

    case "system-code":
      return { encrypted: await encryptHash(data) };

    default:
      return { encrypted: data };
  }
}

/**
 * Reverse the protection applied, if possible.
 */
export async function unprotectData(
  encryptedData: string,
  tier: ProtectionTier
): Promise<string> {
  if (!encryptedData) return "";

  switch (tier) {
    case "government":
      return decryptHighestSecurity(encryptedData);

    case "email":
      return decryptSearchable(encryptedData, "email");

    case "phone":
      return decryptSearchable(encryptedData, "phone");

    case "nin":
      return decryptSearchable(encryptedData, "nin");

    case "gender":
    case "date":
    case "location":
    case "name":
    case "general":
      return decryptBasic(encryptedData);

    case "password":
    case "system-code":
      return encryptedData; // Not reversible

    default:
      return encryptedData;
  }
}

/**
 * Verify protected data or passwords
 */
export async function verifyProtectedData(
  plainText: string,
  protectedData: string,
  tier: ProtectionTier,
  storedSearchHash?: string
): Promise<boolean> {
  if (!plainText || !protectedData) return false;

  if (tier === "password") {
    return PasswordSecurity.verifyPassword(plainText, protectedData);
  }

  if (tier === "system-code") {
    return verifyHash(plainText, protectedData);
  }

  try {
    const decrypted = await unprotectData(protectedData, tier);
    if (decrypted !== plainText) return false;

    // For searchable fields, verify hash if provided
    if (
      storedSearchHash &&
      (tier === "email" || tier === "phone" || tier === "nin")
    ) {
      const recomputedHash =
        tier === "email"
          ? generateSearchHash(plainText.trim().toLowerCase())
          : generateSearchHash(plainText.trim());

      if (recomputedHash !== storedSearchHash) return false;
    }

    return true;
  } catch (error) {
    console.error("Data verification failed:", error);
    return false;
  }
}

/**
 * Hash data (for system codes and general hashing)
 */
export async function hashData(data: string): Promise<string> {
  return encryptHash(data);
}

/**
 * Verify password (convenience function for auth)
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return PasswordSecurity.verifyPassword(password, hashedPassword);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  return PasswordSecurity.validatePasswordStrength(password);
}

// Re-export from encryption for compatibility
export { verifyHash, generateSearchHash };
