import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";

describe("crypto utilities", () => {
  const testKey = crypto.randomBytes(32);
  const testKeyHex = testKey.toString("hex");

  describe("encrypt/decrypt", () => {
    it("encrypt returns string in format iv:authTag:ciphertext (all hex)", async () => {
      const { encrypt } = await import("./crypto");
      const result = encrypt("hello world", testKey);
      const parts = result.split(":");
      expect(parts).toHaveLength(3);
      // Each part should be valid hex
      for (const part of parts) {
        expect(part).toMatch(/^[0-9a-f]+$/);
      }
      // IV should be 16 bytes = 32 hex chars
      expect(parts[0]).toHaveLength(32);
      // Auth tag should be 16 bytes = 32 hex chars
      expect(parts[1]).toHaveLength(32);
    });

    it("decrypt returns original plaintext", async () => {
      const { encrypt, decrypt } = await import("./crypto");
      const plaintext = "sensitive data with special chars: !@#$%^&*()";
      const encrypted = encrypt(plaintext, testKey);
      const decrypted = decrypt(encrypted, testKey);
      expect(decrypted).toBe(plaintext);
    });

    it("different plaintexts produce different ciphertexts (randomized IV)", async () => {
      const { encrypt } = await import("./crypto");
      const enc1 = encrypt("same text", testKey);
      const enc2 = encrypt("same text", testKey);
      // Even with same plaintext, IVs should differ
      expect(enc1).not.toBe(enc2);
    });

    it("decrypt with wrong key throws an error", async () => {
      const { encrypt, decrypt } = await import("./crypto");
      const wrongKey = crypto.randomBytes(32);
      const encrypted = encrypt("secret", testKey);
      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });

    it("decrypt with tampered ciphertext throws an error (GCM auth tag verification)", async () => {
      const { encrypt, decrypt } = await import("./crypto");
      const encrypted = encrypt("secret", testKey);
      const parts = encrypted.split(":");
      // Tamper with the ciphertext portion
      const tampered = parts[0] + ":" + parts[1] + ":ff" + parts[2].slice(2);
      expect(() => decrypt(tampered, testKey)).toThrow();
    });
  });

  describe("getEncryptionKey", () => {
    const originalEnv = process.env.ENCRYPTION_KEY;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.ENCRYPTION_KEY = originalEnv;
      } else {
        delete process.env.ENCRYPTION_KEY;
      }
    });

    it("reads ENCRYPTION_KEY env var and returns 32-byte Buffer", async () => {
      process.env.ENCRYPTION_KEY = testKeyHex;
      const { getEncryptionKey } = await import("./crypto");
      const key = getEncryptionKey();
      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32);
      expect(key.toString("hex")).toBe(testKeyHex);
    });

    it("throws if ENCRYPTION_KEY is not set", async () => {
      delete process.env.ENCRYPTION_KEY;
      const { getEncryptionKey } = await import("./crypto");
      expect(() => getEncryptionKey()).toThrow(/ENCRYPTION_KEY/);
    });

    it("throws if ENCRYPTION_KEY is wrong length", async () => {
      process.env.ENCRYPTION_KEY = "abcd1234"; // too short
      const { getEncryptionKey } = await import("./crypto");
      expect(() => getEncryptionKey()).toThrow(/64 hex/i);
    });
  });
});
