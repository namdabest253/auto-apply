import { describe, it, expect } from "vitest";
import { GREENHOUSE_COMPANIES, LEVER_COMPANIES } from "./constants";

describe("GREENHOUSE_COMPANIES", () => {
  it("has at least 50 entries", () => {
    expect(GREENHOUSE_COMPANIES.length).toBeGreaterThanOrEqual(50);
  });

  it("all entries have non-empty slug and name", () => {
    for (const c of GREENHOUSE_COMPANIES) {
      expect(c.slug.length).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate slugs", () => {
    const slugs = GREENHOUSE_COMPANIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("LEVER_COMPANIES", () => {
  it("has at least 15 entries", () => {
    expect(LEVER_COMPANIES.length).toBeGreaterThanOrEqual(15);
  });

  it("all entries have non-empty slug and name", () => {
    for (const c of LEVER_COMPANIES) {
      expect(c.slug.length).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate slugs", () => {
    const slugs = LEVER_COMPANIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
