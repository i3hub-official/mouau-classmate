// generate-secrets.ts
// Run with: npx tsx generate-secrets.ts
// Or: node generate-secrets.js (after converting to .js)

import crypto from "crypto";

const $ = (bytes: number) => crypto.randomBytes(bytes).toString("hex");
const line = () => console.log("");
const header = (text: string) =>
  console.log(`\n# ${"=".repeat(30)} ${text} ${"=".repeat(30)}`);

// ─────────────────────────────────────────────────────────────────────────────
// FINAL 2025+ SECRETS GENERATOR — NIGERIAN UNIVERSITY / BANK GRADE
// ─────────────────────────────────────────────────────────────────────────────
console.log("#" + "=".repeat(80));
console.log("# ULTRA-SECURE CRYPTOGRAPHIC SECRETS — AUTO-GENERATED");
console.log("# Generated on:", new Date().toISOString());
console.log("# Environment: PRODUCTION / STAGING / DEV — DO NOT COMMIT OUTPUT");
console.log("# Store in Vault, Doppler, AWS Secrets Manager, or .env.vault");
console.log("#" + "=".repeat(80));
line();

header("MASTER ENCRYPTION KEY (AES-256)");
console.log(`ENCRYPTION_KEY=${$(32)}`);
line();

header("FIXED IVs — ONE PER FIELD (16 bytes each) — NEVER REUSE");
console.log(`FIXED_IV_EMAIL=${$(16)}`);
console.log(`FIXED_IV_PHONE=${$(16)}`);
console.log(`FIXED_IV_NIN=${$(16)}`);
console.log(`FIXED_IV_JAMB=${$(16)}`);
console.log(`FIXED_IV_MATRIC=${$(16)}`);
console.log(`FIXED_IV_BVN=${$(16)}`);
console.log(`FIXED_IV_PASSPORT=${$(16)}`);
console.log(`FIXED_IV_GENERAL=${$(16)}`);
line();

header("PEPPERS — 48–96 bytes (make brute force impossible)");
console.log(`PASSWORD_PEPPER=${$(64)}`);
console.log(`SEARCH_HASH_PEPPER=${$(96)}`);
console.log(`HASH_PEPPER=${$(48)}`); // legacy
line();

header("JWT & SESSION SECRETS (use for cookies, email tokens, etc.)");
console.log(`JWT_SECRET=${$(64)}`);
console.log(`SESSION_SECRET=${$(48)}`);
line();

header("DATABASE & BACKUP ENCRYPTION (optional but recommended)");
console.log(`DB_ENCRYPTION_KEY=${$(32)}`);
console.log(`BACKUP_ENCRYPTION_KEY=${$(32)}`);
line();

header("SECURITY SETTINGS");
console.log(`SALT_ROUNDS=13`);
console.log(`NODE_ENV=production`);
console.log(`LOG_LEVEL=info`);
line();

header("RATE LIMITING & BRUTE FORCE PROTECTION");
console.log(`RATE_LIMIT_WINDOW_MS=900000`);
console.log(`RATE_LIMIT_MAX_REQUESTS=100`);
console.log(`LOGIN_RATE_LIMIT_MAX=5`);
line();

console.log("#" + "=".repeat(80));
console.log("# ALL SECRETS GENERATED SUCCESSFULLY");
console.log("# Copy this output NOW — it will NOT be shown again");
console.log(
  "# Run this script again only when rotating keys (with migration plan)"
);
console.log("#" + "=".repeat(80));
