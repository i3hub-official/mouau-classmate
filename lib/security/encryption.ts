// src/lib/security/encryption.ts
import crypto from "crypto";
import bcrypt from "bcryptjs";

// ─────────────────────────────────────────────────────────────────────────────
// STRICT ENVIRONMENT VALIDATION — Fail Fast, Fail Loud
// ─────────────────────────────────────────────────────────────────────────────
function mustHexEnv(name: string, bytes: number): Buffer {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} is missing`);
  if (raw.length !== bytes * 2)
    throw new Error(`${name} must be ${bytes * 2} hex chars (${bytes} bytes)`);

  const buf = Buffer.from(raw, "hex");
  if (buf.length !== bytes) throw new Error(`${name} is not valid hex`);
  return buf;
}

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

// Master key — NEVER changes without full re-encryption
const ENCRYPTION_KEY = mustHexEnv("ENCRYPTION_KEY", 32);

// Fixed IVs — One per field type (prevents cross-linkability attacks)
const FIXED_IV = {
  email: mustHexEnv("FIXED_IV_EMAIL", 16),
  phone: mustHexEnv("FIXED_IV_PHONE", 16),
  nin: mustHexEnv("FIXED_IV_NIN", 16),
  jamb: mustHexEnv("FIXED_IV_JAMB", 16),
  matric: mustHexEnv("FIXED_IV_MATRIC", 16),
  bvn: mustHexEnv("FIXED_IV_BVN", 16),
  passport: mustHexEnv("FIXED_IV_PASSPORT", 16),
  general: mustHexEnv("FIXED_IV_GENERAL", 16),
};

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS ?? 13);
const HASH_PEPPER = mustEnv("HASH_PEPPER");

// ─────────────────────────────────────────────────────────────────────────────
// STRICT HEX VALIDATION — Stops DB Truncation & Injection Cold
// ─────────────────────────────────────────────────────────────────────────────
function assertValidHex(str: string, field: string): void {
  if (!str || str.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(str)) {
    throw new Error(
      `Corrupted/Truncated encrypted data [${field}]. ` +
        `Expected valid hex. Got "${str?.slice(0, 50)}..." (len: ${
          str?.length || 0
        })`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier 1: AES-256-GCM — Highest Security (NIN, BVN, Government IDs)
// ─────────────────────────────────────────────────────────────────────────────
export function encryptHighestSecurity(data: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString(
    "hex"
  )}`;
}

export function decryptHighestSecurity(encryptedData: string): string {
  const parts = encryptedData.split(":");
  if (parts.length !== 3)
    throw new Error("Invalid GCM format: expected iv:auth:encrypted");

  const [ivHex, authTagHex, encryptedHex] = parts;

  assertValidHex(ivHex, "GCM IV");
  assertValidHex(authTagHex, "GCM AuthTag");
  assertValidHex(encryptedHex, "GCM Encrypted");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted, undefined, "utf8") + decipher.final("utf8");
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier 2: Deterministic Searchable (AES-256-CBC + Fixed IV per type)
// Supports: email, phone, nin, jamb, matric, bvn, passport
// ─────────────────────────────────────────────────────────────────────────────
export type SearchableType =
  | "email"
  | "phone"
  | "nin"
  | "jamb"
  | "matric"
  | "bvn"
  | "passport"
  | "general";

export function encryptSearchable(data: string, type: SearchableType): string {
  const iv = FIXED_IV[type];
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ]);
  return encrypted.toString("hex");
}

export function decryptSearchable(
  encryptedData: string,
  type: SearchableType
): string {
  assertValidHex(encryptedData, `${type} encrypted data`);

  const iv = FIXED_IV[type];
  const encrypted = Buffer.from(encryptedData, "hex");

  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  return decipher.update(encrypted, undefined, "utf8") + decipher.final("utf8");
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier 3: Basic Random-IV Encryption (Names, Locations, Dates)
// ─────────────────────────────────────────────────────────────────────────────
export function encryptBasic(data: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptBasic(encryptedData: string): string {
  const sep = encryptedData.indexOf(":");
  if (sep === -1) throw new Error("Invalid basic encryption format");

  const ivHex = encryptedData.slice(0, sep);
  const encryptedHex = encryptedData.slice(sep + 1);

  assertValidHex(ivHex, "Basic IV");
  assertValidHex(encryptedHex, "Basic Encrypted");

  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  return decipher.update(encrypted, undefined, "utf8") + decipher.final("utf8");
}

// ─────────────────────────────────────────────────────────────────────────────
// One-Way Hashing (bcrypt) — For tokens, codes, etc.
// ─────────────────────────────────────────────────────────────────────────────
export async function hashData(data: string): Promise<string> {
  return bcrypt.hash(data, SALT_ROUNDS);
}

export async function verifyHash(data: string, hash: string): Promise<boolean> {
  return bcrypt.compare(data, hash);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY: Only for migration — new code uses dataProtection.ts
// ─────────────────────────────────────────────────────────────────────────────
export function generateSearchHash(data: string): string {
  return crypto
    .createHash("sha256")
    .update(data + HASH_PEPPER)
    .digest("hex");
}

export function verifySearchHash(data: string, hash: string): boolean {
  return generateSearchHash(data) === hash;
}
