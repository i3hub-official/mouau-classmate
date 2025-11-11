// src/lib/security/encryption.ts
import crypto from "crypto";
import bcrypt from "bcryptjs";

/* ------------------------------------
 * Utility loaders
 * ------------------------------------ */

function mustHexEnv(name: string, expectedBytes: number): Buffer {
  const raw = process.env[name];
  if (!raw)
    throw new Error(`❌ Missing required environment variable: ${name}`);
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== expectedBytes) {
    throw new Error(
      `❌ ${name} must be ${expectedBytes} bytes in hex (${
        expectedBytes * 2
      } chars). Got ${buf.length} bytes.`
    );
  }
  return buf;
}

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`❌ Missing required environment variable: ${name}`);
  return v;
}

/* ------------------------------------
 * Key material (lazy load)
 * ------------------------------------ */
let _ENCRYPTION_KEY: Buffer | null = null;
let _FIXED_IV_EMAIL: Buffer | null = null;
let _FIXED_IV_PHONE: Buffer | null = null;
let _FIXED_IV_NIN: Buffer | null = null;
let _FIXED_GENERAL: Buffer | null = null;
let _SALT_ROUNDS: number | null = null;
let _HASH_PEPPER: string | null = null;

function getKeys() {
  if (!_ENCRYPTION_KEY) {
    _ENCRYPTION_KEY = mustHexEnv("ENCRYPTION_KEY", 32);
    _FIXED_IV_EMAIL = mustHexEnv("FIXED_IV_EMAIL", 16);
    _FIXED_IV_PHONE = mustHexEnv("FIXED_IV_PHONE", 16);
    _FIXED_IV_NIN = mustHexEnv("FIXED_IV_NIN", 16);
    _FIXED_GENERAL = mustHexEnv("FIXED_GENERAL", 16);
    _SALT_ROUNDS = Number(process.env.SALT_ROUNDS ?? 12);
    _HASH_PEPPER = mustEnv("HASH_PEPPER");
  }
  return {
    ENCRYPTION_KEY: _ENCRYPTION_KEY!,
    FIXED_IV_EMAIL: _FIXED_IV_EMAIL!,
    FIXED_IV_PHONE: _FIXED_IV_PHONE!,
    FIXED_IV_NIN: _FIXED_IV_NIN!,
    FIXED_GENERAL: _FIXED_GENERAL!,
    SALT_ROUNDS: _SALT_ROUNDS!,
    HASH_PEPPER: _HASH_PEPPER!,
  };
}

/* ------------------------------------
 * Tier 1: AES-256-GCM (authenticated)
 * ------------------------------------ */
export function encryptHighestSecurity(plaintext: string): string {
  const { ENCRYPTION_KEY } = getKeys();
  const iv = crypto.randomBytes(12); // 96-bit nonce
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Encode compactly as base64: iv.authTag.ciphertext
  return `${iv.toString("base64")}.${authTag.toString(
    "base64"
  )}.${encrypted.toString("base64")}`;
}

export function decryptHighestSecurity(ciphertext: string): string {
  const { ENCRYPTION_KEY } = getKeys();
  const parts = ciphertext.split(".");
  if (parts.length !== 3)
    throw new Error("Invalid encrypted format for AES-GCM");
  const [ivB64, authTagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

/* ------------------------------------
 * Tier 2: Deterministic (Searchable)
 * ------------------------------------ */
export function encryptSearchable(
  data: string,
  type: "email" | "phone" | "general" | "nin"
): string {
  const {
    ENCRYPTION_KEY,
    FIXED_IV_EMAIL,
    FIXED_IV_PHONE,
    FIXED_IV_NIN,
    FIXED_GENERAL,
  } = getKeys();

  const iv =
    type === "email"
      ? FIXED_IV_EMAIL
      : type === "phone"
      ? FIXED_IV_PHONE
      : type === "nin"
      ? FIXED_IV_NIN
      : FIXED_GENERAL;

  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ]);
  return encrypted.toString("base64");
}

export function decryptSearchable(
  ciphertext: string,
  type: "email" | "phone" | "general" | "nin"
): string {
  const {
    ENCRYPTION_KEY,
    FIXED_IV_EMAIL,
    FIXED_IV_PHONE,
    FIXED_IV_NIN,
    FIXED_GENERAL,
  } = getKeys();

  const iv =
    type === "email"
      ? FIXED_IV_EMAIL
      : type === "phone"
      ? FIXED_IV_PHONE
      : type === "nin"
      ? FIXED_IV_NIN
      : FIXED_GENERAL;

  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/* ------------------------------------
 * Tier 3: AES-CBC (random IV)
 * ------------------------------------ */
export function encryptBasic(data: string): string {
  const { ENCRYPTION_KEY } = getKeys();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(data, "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptBasic(encryptedData: string): string {
  const { ENCRYPTION_KEY } = getKeys();
  const [ivB64, dataB64] = encryptedData.split(".");
  if (!ivB64 || !dataB64)
    throw new Error("Invalid encrypted format for AES-CBC");
  const iv = Buffer.from(ivB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

/* ------------------------------------
 * Hashing Utilities
 * ------------------------------------ */
export async function hashData(data: string): Promise<string> {
  const { SALT_ROUNDS, HASH_PEPPER } = getKeys();
  return bcrypt.hash(data + HASH_PEPPER, SALT_ROUNDS);
}

export async function verifyHash(data: string, hash: string): Promise<boolean> {
  const { SALT_ROUNDS, HASH_PEPPER } = getKeys();
  // Constant-time compare for safety
  const hashed = await bcrypt.hash(data + HASH_PEPPER, SALT_ROUNDS);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashed));
}

/* ------------------------------------
 * Deterministic Search Hash (SHA-256)
 * ------------------------------------ */
export function generateSearchHash(data: string): string {
  const { HASH_PEPPER } = getKeys();
  return crypto
    .createHash("sha256")
    .update(data + HASH_PEPPER)
    .digest("hex");
}

export function verifySearchHash(data: string, hash: string): boolean {
  const candidate = generateSearchHash(data);
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}
