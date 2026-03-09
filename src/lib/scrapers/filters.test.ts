import { describe, it, expect } from "vitest";
import { isInternshipRole, filterInternships } from "./filters";

describe("isInternshipRole", () => {
  describe("positive matching", () => {
    it("matches 'Software Engineering Intern'", () => {
      expect(isInternshipRole("Software Engineering Intern")).toBe(true);
    });

    it("matches 'Internship - Data Science'", () => {
      expect(isInternshipRole("Internship - Data Science")).toBe(true);
    });

    it("matches 'Summer Co-op Engineer'", () => {
      expect(isInternshipRole("Summer Co-op Engineer")).toBe(true);
    });

    it("matches 'co-op' without hyphen ('coop')", () => {
      expect(isInternshipRole("Summer Coop Engineer")).toBe(true);
    });

    it("matches via department when title is generic", () => {
      expect(isInternshipRole("Software Engineer", "Internship Program")).toBe(
        true
      );
    });
  });

  describe("negative rejection (no word boundary match)", () => {
    it("rejects 'Internal Tools Engineer'", () => {
      expect(isInternshipRole("Internal Tools Engineer")).toBe(false);
    });

    it("rejects 'International Sales'", () => {
      expect(isInternshipRole("International Sales")).toBe(false);
    });
  });

  describe("negative exclusion (negative keywords)", () => {
    it("excludes 'Senior Software Engineer Intern'", () => {
      expect(isInternshipRole("Senior Software Engineer Intern")).toBe(false);
    });

    it("excludes 'PhD Research Intern'", () => {
      expect(isInternshipRole("PhD Research Intern")).toBe(false);
    });

    it("excludes 'MBA Intern'", () => {
      expect(isInternshipRole("MBA Intern")).toBe(false);
    });

    it("excludes 'Staff Engineer'", () => {
      expect(isInternshipRole("Staff Engineer")).toBe(false);
    });

    it("excludes 'Principal Engineer'", () => {
      expect(isInternshipRole("Principal Engineer")).toBe(false);
    });

    it("excludes 'Lead Developer'", () => {
      expect(isInternshipRole("Lead Developer")).toBe(false);
    });

    it("excludes 'Director of Engineering'", () => {
      expect(isInternshipRole("Director of Engineering")).toBe(false);
    });

    it("excludes 'VP of Product'", () => {
      expect(isInternshipRole("VP of Product")).toBe(false);
    });

    it("excludes 'Head of Design'", () => {
      expect(isInternshipRole("Head of Design")).toBe(false);
    });

    it("excludes 'Fellow'", () => {
      expect(isInternshipRole("Fellow")).toBe(false);
    });
  });

  describe("no match (no intern keyword)", () => {
    it("rejects 'Software Engineer'", () => {
      expect(isInternshipRole("Software Engineer")).toBe(false);
    });
  });
});

describe("filterInternships", () => {
  it("filters array correctly using title", () => {
    const jobs = [
      { title: "Software Engineering Intern", company: "Acme" },
      { title: "Senior Engineer", company: "Acme" },
      { title: "Data Science Internship", company: "Acme" },
      { title: "Internal Tools Engineer", company: "Acme" },
    ];

    const result = filterInternships(jobs);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("Software Engineering Intern");
    expect(result[1].title).toBe("Data Science Internship");
  });

  it("filters using optional department getter", () => {
    const jobs = [
      { title: "Software Engineer", dept: "Internship Program" },
      { title: "Software Engineer", dept: "Engineering" },
    ];

    const result = filterInternships(jobs, (j) => j.dept);
    expect(result).toHaveLength(1);
    expect(result[0].dept).toBe("Internship Program");
  });
});
