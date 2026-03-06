import { describe, it, expect } from "vitest"
import { hashPassword, verifyPassword } from "@/lib/password"

describe("password utilities", () => {
  it("hashPassword returns a bcrypt hash string", async () => {
    const hash = await hashPassword("test123")
    expect(hash).toMatch(/^\$2[ab]\$/)
  })

  it("verifyPassword returns true for correct password", async () => {
    const hash = await hashPassword("test123")
    const result = await verifyPassword("test123", hash)
    expect(result).toBe(true)
  })

  it("verifyPassword returns false for wrong password", async () => {
    const hash = await hashPassword("test123")
    const result = await verifyPassword("wrong", hash)
    expect(result).toBe(false)
  })

  it("hashPassword produces different hashes for same input (salt uniqueness)", async () => {
    const hash1 = await hashPassword("test123")
    const hash2 = await hashPassword("test123")
    expect(hash1).not.toBe(hash2)
  })
})
