import { createHash, randomBytes } from "crypto";

const API_KEY_PREFIX = "aa_sk_";
const API_KEY_RANDOM_BYTES = 24; // 32 base64url chars

/**
 * Generate a new API key with its hash.
 * Returns the plaintext key (shown once) and its SHA-256 hash (stored in DB).
 */
export function generateApiKey(): { key: string; hash: string } {
  const random = randomBytes(API_KEY_RANDOM_BYTES)
    .toString("base64url")
    .slice(0, 32);
  const key = `${API_KEY_PREFIX}${random}`;
  const hash = hashApiKey(key);
  return { key, hash };
}

/**
 * Hash an API key using SHA-256.
 * Used for both storage and lookup.
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Validate that a string looks like a valid API key format.
 */
export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith(API_KEY_PREFIX) && key.length === API_KEY_PREFIX.length + 32;
}
