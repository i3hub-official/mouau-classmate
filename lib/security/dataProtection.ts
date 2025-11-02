// fILE: src\lib\security\dataProtection.ts
import {
  encryptHighestSecurity,
  encryptSearchable,
  encryptBasic,
  decryptHighestSecurity,
  decryptSearchable,
  decryptBasic,
  hashData,
  verifyHash,
  generateSearchHash,
} from "@/lib/security/encryption";

export type ProtectionTier =
  | "government" // Highest security, AES-GCM w/ random IV
  | "email" // Deterministic searchable encryption (fixed IV AES-CBC)
  | "phone" // Same as email tier, but no lowercase normalization
  | "nin" // Deterministic searchable encryption (fixed IV AES-CBC)
  | "gender" // Random-IV AES-CBC
  | "date" // Random-IV AES-CBC
  | "location" // Random-IV AES-CBC
  | "name" // Random-IV AES-CBC
  | "system-code" // One-way hash (bcrypt), not reversible
  | "general"; // General purpose encryption

/**
 * Protect sensitive data according to its tier.
 * Returns encrypted data and, for searchable tiers, a hash for index/search.
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
    case "nin":
      return {
        encrypted: encryptSearchable(data, "nin"),
        searchHash: generateSearchHash(data),
      };
    case "gender":
      return { encrypted: encryptBasic(data) };

    case "date":
      return { encrypted: encryptBasic(data) };

    case "location":
      return { encrypted: encryptBasic(data) };

    case "name":
      return { encrypted: encryptBasic(data) };

    case "system-code":
      return { encrypted: await hashData(data) };
    case "general":
      return { encrypted: encryptBasic(data) };

    default:
      return { encrypted: data };
  }
}

/**
 * Reverse the protection applied, if possible.
 * For one-way hashes (system-code), returns the original hash string.
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
      return decryptBasic(encryptedData);

    case "date":
      return decryptBasic(encryptedData);

    case "location":
      return decryptBasic(encryptedData);
    case "name":
      return decryptBasic(encryptedData);

    case "system-code":
      return encryptedData; // Not reversible
    case "general":
      return decryptBasic(encryptedData);

    default:
      return encryptedData;
  }
}

export async function generateSearchableHash(input: string): Promise<string> {
  if (!input) throw new Error("No input provided for hash");

  // Normalize for consistent hashing
  const normalised = input.trim().toLowerCase();

  // Encode to Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(normalised);

  // Use correct hashing depending on environment
  let hashBuffer: ArrayBuffer;

  if (typeof window !== "undefined" && window.crypto?.subtle) {
    // Browser environment
    hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  } else {
    // Node.js environment (API routes, server)
    const crypto = await import("crypto");
    const hash = crypto.createHash("sha256").update(data).digest();
    hashBuffer = new Uint8Array(hash).buffer;
  }

  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
/**
 * Verify hash (system-code) or perform round-trip decrypt + compare.
 * For searchable tiers (email, phone), also verify the searchHash if provided.
 */
export async function verifyProtectedData(
  plainText: string,
  protectedData: string,
  tier: ProtectionTier,
  storedSearchHash?: string
): Promise<boolean> {
  if (!plainText || !protectedData) return false;

  if (tier === "system-code") {
    return verifyHash(plainText, protectedData);
  }

  try {
    const decrypted = await unprotectData(protectedData, tier);
    if (decrypted !== plainText) return false;

    // For searchable fields, verify hash if provided
    if (
      storedSearchHash &&
      (tier === "email" ||
        tier === "phone" ||
        tier === "general" ||
        tier === "nin")
    ) {
      const recomputedHash =
        tier === "email"
          ? generateSearchHash(plainText.trim().toLowerCase())
          : tier === "phone"
            ? generateSearchHash(plainText.trim())
            : tier === "general"
              ? generateSearchHash(plainText.trim())
              : tier === "nin"
                ? generateSearchHash(plainText.trim())
                : generateSearchHash(plainText.trim());

      if (recomputedHash !== storedSearchHash) return false;
    }

    return true;
  } catch (error) {
    console.error("Data verification failed:", error);
    return false;
  }
}

// Export verifyHash in case you want to manually verify hashes outside this module
export { verifyHash };
export { hashData}
