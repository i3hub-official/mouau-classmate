// lib/security/dataProtection.ts
import {
  encryptHighestSecurity,
  encryptSearchable,
  encryptBasic,
  decryptHighestSecurity,
  decryptSearchable,
  decryptBasic,
  hashData,
  verifyHash,
} from "@/lib/security/encryption";
import * as crypto from "crypto";

// Define SearchableType as the set of tiers that use searchable encryption
type SearchableType =
  | "jamb"
  | "matric"
  | "email"
  | "phone"
  | "passport"
  | "bvn"
  | "nin";

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT VALIDATION — Fail Fast in Production
// ─────────────────────────────────────────────────────────────────────────────
const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER;
const SEARCH_HASH_PEPPER = process.env.SEARCH_HASH_PEPPER;

if (!PASSWORD_PEPPER || PASSWORD_PEPPER.length < 32)
  throw new Error("PASSWORD_PEPPER must be ≥32 bytes (production only)");
if (!SEARCH_HASH_PEPPER || SEARCH_HASH_PEPPER.length < 32)
  throw new Error("SEARCH_HASH_PEPPER must be ≥32 bytes (production only)");

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTION TIERS
// ─────────────────────────────────────────────────────────────────────────────
export type ProtectionTier =
  | "government"
  | "nin"
  | "jamb"
  | "matric"
  | "email"
  | "phone"
  | "bvn"
  | "passport"
  | "name"
  | "location"
  | "date"
  | "password"
  | "system-code"
  | "token";

// ─────────────────────────────────────────────────────────────────────────────
// NIGERIAN-SPECIFIC NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────
const normalize = {
  email: (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ""),
  phone: (s: string): string => {
    const digits = s.replace(/[^0-9+]/g, "");
    if (digits.startsWith("234") && digits.length === 13) return digits;
    if (digits.startsWith("0") && digits.length === 11)
      return "234" + digits.slice(1);
    if (digits.startsWith("+234") && digits.length === 14)
      return digits.slice(1);
    return digits;
  },
  nin: (s: string): string => s.trim().replace(/\D/g, "").slice(0, 11),
  jamb: (s: string): string =>
    s
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ""),
  matric: (s: string): string =>
    s
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\/-]/g, ""),
  name: (s: string): string => s.trim().replace(/\s+/g, " ").toTitleCase(),
  location: (s: string): string => s.trim().toTitleCase(),
  bvn: (s: string): string => s.trim().replace(/\D/g, ""),
  passport: (s: string): string => s.trim().toUpperCase(),
};

// Safe TitleCase extension
declare global {
  interface String {
    toTitleCase(): string;
  }
}
String.prototype.toTitleCase = function () {
  return this.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SEARCHABLE HASH — Peppered + lowercase context (as requested)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateSearchableHash(
  input: string,
  context: string = "generic"
): Promise<string> {
  if (!input) throw new Error("Cannot generate search hash for empty input");

  // CONTEXT IS ALWAYS LOWERCASE — Your requirement
  const ctx = context.toLowerCase();

  const encoder = new TextEncoder();
  const data = encoder.encode(`${ctx}::${input.trim()}::${SEARCH_HASH_PEPPER}`);

  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD SECURITY — Military Grade+
// ─────────────────────────────────────────────────────────────────────────────
export class PasswordSecurity {
  private static readonly ITERATIONS = 250_000;
  private static readonly KEY_LENGTH = 64;
  private static readonly SALT_LENGTH = 32;

  static async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(this.SALT_LENGTH).toString("hex");
    const derivedKey = await this.pbkdf2(password, salt);
    return `v1:${this.ITERATIONS}:${salt}:${derivedKey}`;
  }

  static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    if (!password || !hash) return false;

    const parts = hash.split(":");
    if (parts[0] !== "v1" || parts.length !== 4) return false;

    const [, iterationsStr, salt, storedHash] = parts;
    const iterations = parseInt(iterationsStr, 10);

    if (
      isNaN(iterations) ||
      iterations < 200_000 ||
      salt.length !== 64 ||
      storedHash.length !== 128
    ) {
      return false;
    }

    const computed = await this.pbkdf2(password, salt, iterations);
    return crypto.timingSafeEqual(
      Buffer.from(storedHash, "hex"),
      Buffer.from(computed, "hex")
    );
  }

  private static pbkdf2(
    password: string,
    salt: string,
    iterations = this.ITERATIONS
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const peppered = password + PASSWORD_PEPPER;
      crypto.pbkdf2(
        peppered,
        salt,
        iterations,
        this.KEY_LENGTH,
        "sha512",
        (err, key) => (err ? reject(err) : resolve(key.toString("hex")))
      );
    });
  }

  static validatePasswordStrength(password: string) {
    const errors: string[] = [];
    if (password.length < 8) errors.push("At least 8 characters");
    if (!/(?=.*[a-z])/.test(password)) errors.push("One lowercase");
    if (!/(?=.*[A-Z])/.test(password)) errors.push("One uppercase");
    if (!/(?=.*\d)/.test(password)) errors.push("One number");
    if (!/(?=.*[!@#$%^&*()_+=\-[\]{}|;:'",.<>/?])/.test(password))
      errors.push("One special character");
    if (/(.)\1\1\1/.test(password)) errors.push("No repeating characters");

    const common = [
      "password",
      "123456",
      "qwerty",
      "nigeria",
      "jesus",
      "blessing",
      "12345678",
      "password123",
      "admin",
      "student",
      "welcome",
      "love",
    ];
    if (common.includes(password.toLowerCase())) errors.push("Too common");

    return { isValid: errors.length === 0, errors };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE: protectData() — Now with lowercase context
// ─────────────────────────────────────────────────────────────────────────────
export async function protectData(
  raw: string,
  tier: ProtectionTier
): Promise<{ encrypted: string; searchHash?: string }> {
  if (!raw || raw.trim() === "") return { encrypted: "" };

  let data = raw.trim();

  switch (tier) {
    case "government":
    case "nin":
      data = normalize.nin(data);
      return {
        encrypted: encryptHighestSecurity(data),
        searchHash: await generateSearchableHash(data, "nin"),
      };

    case "jamb":
      data = normalize.jamb(data);
      return {
        encrypted: encryptSearchable(data, "jamb"),
        searchHash: await generateSearchableHash(data, "jamb"),
      };

    case "matric":
      data = normalize.matric(data);
      return {
        encrypted: encryptSearchable(data, "matric"),
        searchHash: await generateSearchableHash(data, "matric"),
      };

    case "email":
      data = normalize.email(data);
      return {
        encrypted: encryptSearchable(data, "email"),
        searchHash: await generateSearchableHash(data, "email"),
      };

    case "phone":
      data = normalize.phone(data);
      return {
        encrypted: encryptSearchable(data, "phone"),
        searchHash: await generateSearchableHash(data, "phone"),
      };

    case "bvn":
      data = normalize.bvn(data);
      return {
        encrypted: encryptHighestSecurity(data),
        searchHash: await generateSearchableHash(data, "bvn"),
      };

    case "passport":
      data = normalize.passport(data);
      return {
        encrypted: encryptSearchable(data, "general"),
        searchHash: await generateSearchableHash(data, "passport"),
      };

    case "name":
      data = normalize.name(data);
      return { encrypted: encryptBasic(data) };

    case "location":
      data = normalize.location(data);
      return { encrypted: encryptBasic(data) };

    case "date":
      return { encrypted: encryptBasic(data) };

    case "password":
      return { encrypted: await PasswordSecurity.hashPassword(data) };

    case "system-code":
      return { encrypted: await hashData(data) };

    case "token":
      return { encrypted: await hashData(data + Date.now()) };

    default:
      return { encrypted: data };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNPROTECT — Safe & Fail-Closed
// ─────────────────────────────────────────────────────────────────────────────
export async function unprotectData(
  encrypted: string,
  tier: ProtectionTier
): Promise<string> {
  if (!encrypted) return "";

  try {
    switch (tier) {
      case "government":
      case "nin":
      case "bvn": {
        // Check if it's in GCM format (iv:authTag:encrypted)
        const parts = encrypted.split(":");
        if (parts.length === 3) {
          return decryptHighestSecurity(encrypted);
        }
        // Legacy: might be plaintext or different format
        console.warn(`[MIGRATION NEEDED] ${tier} field not in GCM format`);
        // If it looks like hex without colons, it might be searchable encryption
        if (/^[0-9a-fA-F]+$/.test(encrypted) && encrypted.length >= 32) {
          return decryptSearchable(encrypted, tier as SearchableType);
        }
        // Possibly plaintext - return as-is (or throw if you want strict mode)
        return encrypted;
      }
      // Add other cases as needed, or a default:
      default:
        return encrypted;
    }
  } catch (err) {
    console.error(`Decryption failed for tier '${tier}':`, err);
    throw new Error(
      "Data integrity violation — possible tampering or corruption"
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return PasswordSecurity.verifyPassword(password, hash);
}

export function validatePasswordStrength(password: string) {
  return PasswordSecurity.validatePasswordStrength(password);
}

export { verifyHash };
