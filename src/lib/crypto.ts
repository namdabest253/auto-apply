import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

/**
 * Reads the ENCRYPTION_KEY environment variable and returns a 32-byte Buffer.
 * The env var must be a 64-character hex string (32 bytes).
 * Generate with: openssl rand -hex 32
 */
export function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. Generate with: openssl rand -hex 32"
    );
  }
  if (keyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyHex)) {
    throw new Error(
      "ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a string in format: iv:authTag:ciphertext (all hex-encoded).
 */
export function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a string produced by encrypt().
 * Input format: iv:authTag:ciphertext (all hex-encoded).
 */
export function decrypt(data: string, key: Buffer): string {
  const [ivHex, authTagHex, ciphertext] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
