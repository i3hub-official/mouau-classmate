// src/lib/security/encryption.ts
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

function mustHexEnv(name: string, expectedBytes: number): Buffer {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} not set`);
  const buf = Buffer.from(raw, 'hex');
  if (buf.length !== expectedBytes) {
    throw new Error(`${name} must be ${expectedBytes} bytes (hex). Got ${buf.length} bytes`);
  }
  return buf;
}
function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set`);
  return v;
}

const ENCRYPTION_KEY = mustHexEnv('ENCRYPTION_KEY', 32); // 32 bytes for AES-256
const FIXED_IV_EMAIL = mustHexEnv('FIXED_IV_EMAIL', 16);
const FIXED_IV_PHONE = mustHexEnv('FIXED_IV_PHONE', 16);
 const FIXED_GENERAL = mustHexEnv('FIXED_GENERAL', 16);
const FIXED_IV_NIN = mustHexEnv('FIXED_IV_NIN', 16);
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS ?? 12);
const HASH_PEPPER = mustEnv('HASH_PEPPER');

// Tier 1: AES-256-GCM (random 12-byte IV)
export function encryptHighestSecurity(data: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptHighestSecurity(encryptedData: string): string {
  // parse iv:auth:content safely
  const firstSep = encryptedData.indexOf(':');
  const secondSep = encryptedData.indexOf(':', firstSep + 1);
  if (firstSep === -1 || secondSep === -1) throw new Error('Invalid encrypted format for GCM');
  const ivHex = encryptedData.slice(0, firstSep);
  const authTagHex = encryptedData.slice(firstSep + 1, secondSep);
  const content = encryptedData.slice(secondSep + 1);

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(content, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Tier 2: Deterministic / Searchable (FIXED IV used intentionally)
export function encryptSearchable(data: string, type: 'email' | 'phone' | 'general' | 'nin'): string {
  const iv = type === 'email' ? FIXED_IV_EMAIL : type === 'phone' ? FIXED_IV_PHONE : type === 'nin' ? FIXED_IV_NIN : FIXED_GENERAL;
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  return cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
}

export function decryptSearchable(encryptedData: string, type: 'email' | 'phone' | 'general' | 'nin'): string {
  const iv = type === 'email' ? FIXED_IV_EMAIL : type === 'phone' ? FIXED_IV_PHONE : type === 'nin' ? FIXED_IV_NIN : FIXED_GENERAL;
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  return decipher.update(encryptedData, 'hex', 'utf8') + decipher.final('utf8');
}

// Tier 3: Basic (random-IV AES-CBC)
export function encryptBasic(data: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const encrypted = cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptBasic(encryptedData: string): string {
  const sep = encryptedData.indexOf(':');
  if (sep === -1) throw new Error('Invalid encrypted format for basic');
  const ivHex = encryptedData.slice(0, sep);
  const content = encryptedData.slice(sep + 1);
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  return decipher.update(content, 'hex', 'utf8') + decipher.final('utf8');
}

// Hashing Utilities (bcryptjs callback wrapped as Promise)
export async function hashData(data: string): Promise<string> {
  return new Promise((resolve, reject) => {
    bcrypt.hash(data, SALT_ROUNDS, (err, hash) => {
      if (err) return reject(err);
      if (typeof hash !== 'string') return reject(new Error('Hash generation failed'));
      resolve(hash);
    });
  });
}

export async function verifyHash(data: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    bcrypt.compare(data, hash, (err, same) => {
      if (err) return reject(err);
      resolve(same === true);
    });
  });
}

export function generateSearchHash(data: string): string {
  return crypto.createHash('sha256').update(data + HASH_PEPPER).digest('hex');
}

export function verifySearchHash(data: string, hash: string): boolean {
  return generateSearchHash(data) === hash;
}