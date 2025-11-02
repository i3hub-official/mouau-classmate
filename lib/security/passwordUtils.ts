// lib/security/passwordUtils.ts
import * as crypto from "crypto";

/**
 * Utility functions for password hashing and verification
 * Uses PBKDF2 for secure password hashing
 */

export interface PasswordHashResult {
  hash: string;
  salt: string;
  iterations: number;
}

export class PasswordUtils {
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
      // Generate random salt
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
            // Format: iterations:salt:hash
            const hash = derivedKey.toString(this.ENCODING);
            const result = `${this.ITERATIONS}:${salt}:${hash}`;
            resolve(result);
          }
        }
      );
    });
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
        // Parse the stored hash
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
              resolve(computedHash === storedHash);
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

    // Check for common passwords (basic check)
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
   * Checks if a password needs rehashing (if iterations have changed)
   */
  static needsRehash(hashedPassword: string): boolean {
    try {
      const parts = hashedPassword.split(":");
      if (parts.length !== 3) {
        return true; // Invalid format, needs rehash
      }

      const iterations = parseInt(parts[0], 10);
      return iterations !== this.ITERATIONS;
    } catch {
      return true; // Error parsing, needs rehash
    }
  }

  /**
   * Securely compares two strings in constant time
   * Prevents timing attacks
   */
  static constantTimeCompare(a: string, b: string): boolean {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(a, "utf8"),
        Buffer.from(b, "utf8")
      );
    } catch {
      return false;
    }
  }
}

// Convenience functions for backward compatibility
export async function hashData(data: string): Promise<string> {
  return PasswordUtils.hashPassword(data);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return PasswordUtils.verifyPassword(password, hashedPassword);
}

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  return PasswordUtils.validatePasswordStrength(password);
}

// For compatibility with your existing code
export { PasswordUtils as default };
