import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock dependencies before importing the module
vi.mock("@/lib/prisma", () => ({
  prisma: {
    careerPageUrl: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}))

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => "mock-model"),
}))

vi.mock("./stealth", () => ({
  createStealthBrowser: vi.fn(),
  randomDelay: vi.fn(() => Promise.resolve()),
  getRandomUserAgent: vi.fn(() => "MockAgent/1.0"),
}))

vi.mock("./filters", () => ({
  isInternshipRole: vi.fn(() => true),
  isUSLocation: vi.fn(() => true),
}))

import {
  CareerPageCrawler,
  extractMainContent,
  isMinimalContent,
  identifyJobLinks,
} from "./career-page"
import { prisma } from "@/lib/prisma"
import { generateObject } from "ai"

describe("CareerPageCrawler", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("implements ScraperAdapter with platform='career-page'", () => {
    const crawler = new CareerPageCrawler("user-123")
    expect(crawler.platform).toBe("career-page")
    expect(typeof crawler.discover).toBe("function")
  })

  it("returns empty array when no career page URLs configured", async () => {
    vi.mocked(prisma.careerPageUrl.findMany).mockResolvedValue([])
    const crawler = new CareerPageCrawler("user-123")
    const results = await crawler.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    })
    expect(results).toEqual([])
  })

  it("continues to next URL on extraction error (partial-safe)", async () => {
    vi.mocked(prisma.careerPageUrl.findMany).mockResolvedValue([
      { id: "1", userId: "user-123", url: "https://bad.example.com/careers", label: "Bad Co", createdAt: new Date(), updatedAt: new Date() },
      { id: "2", userId: "user-123", url: "https://good.example.com/careers", label: "Good Co", createdAt: new Date(), updatedAt: new Date() },
    ])

    // Mock fetch: first URL fails, second succeeds
    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue(
        new Response("<html><body><h1>Jobs</h1><p>No jobs currently available.</p></body></html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        })
      )
    vi.stubGlobal("fetch", mockFetch)

    vi.mocked(generateObject).mockResolvedValue({
      object: { jobs: [] },
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: "stop",
      rawResponse: undefined,
      toJsonResponse: vi.fn(),
      warnings: [],
      request: {},
      response: {},
      experimental_providerMetadata: undefined,
      providerMetadata: undefined,
      logprobs: undefined,
    } as any)

    const crawler = new CareerPageCrawler("user-123")
    // Should not throw even though first URL fails
    const results = await crawler.discover({
      keywords: [],
      locations: [],
      roleTypes: [],
    })
    expect(results).toEqual([])
    // The first URL should have been attempted
    expect(mockFetch).toHaveBeenCalled()
  })
})

describe("extractMainContent", () => {
  it("strips scripts, styles, nav, footer, header tags and caps at 30K chars", () => {
    const html = `
      <html>
        <head><style>body { color: red; }</style></head>
        <body>
          <header><nav>Navigation</nav></header>
          <script>console.log("evil")</script>
          <main><p>Job listing content here</p></main>
          <footer>Footer stuff</footer>
        </body>
      </html>
    `
    const result = extractMainContent(html)
    expect(result).not.toContain("console.log")
    expect(result).not.toContain("color: red")
    expect(result).not.toContain("Navigation")
    expect(result).not.toContain("Footer stuff")
    expect(result).toContain("Job listing content here")
    expect(result.length).toBeLessThanOrEqual(30000)
  })

  it("caps content at 30000 characters", () => {
    const longContent = "<html><body>" + "A".repeat(50000) + "</body></html>"
    const result = extractMainContent(longContent)
    expect(result.length).toBeLessThanOrEqual(30000)
  })
})

describe("isMinimalContent", () => {
  it("detects JS-rendered pages with less than 200 chars of text", () => {
    const minimal = '<html><body><div id="root"></div></body></html>'
    expect(isMinimalContent(minimal)).toBe(true)
  })

  it("detects SPA mount indicators", () => {
    const spa = '<html><body><div id="app"></div><script src="bundle.js"></script></body></html>'
    expect(isMinimalContent(spa)).toBe(true)
  })

  it("returns false for pages with sufficient content", () => {
    const content =
      "<html><body><div>" +
      "Software Engineer Intern - Join our team to work on cutting edge technology. " +
      "We are looking for passionate developers who want to make a difference. " +
      "Requirements include experience with React, Node.js, and cloud services. " +
      "</div></body></html>"
    expect(isMinimalContent(content)).toBe(false)
  })
})

describe("identifyJobLinks", () => {
  it("extracts links matching job-related URL patterns", () => {
    const html = `
      <a href="/jobs/123">Software Engineer</a>
      <a href="/position/456">Product Manager</a>
      <a href="/about">About Us</a>
      <a href="/careers/openings/789">Designer</a>
      <a href="/apply/101">Apply Now</a>
      <a href="/blog/news">Blog</a>
    `
    const links = identifyJobLinks(html, "https://example.com")
    expect(links).toContain("https://example.com/jobs/123")
    expect(links).toContain("https://example.com/position/456")
    expect(links).toContain("https://example.com/careers/openings/789")
    expect(links).toContain("https://example.com/apply/101")
    expect(links).not.toContain("https://example.com/about")
    expect(links).not.toContain("https://example.com/blog/news")
  })

  it("resolves relative URLs against baseUrl", () => {
    const html = '<a href="/jobs/123">Job</a>'
    const links = identifyJobLinks(html, "https://example.com/careers")
    expect(links[0]).toBe("https://example.com/jobs/123")
  })

  it("deduplicates and caps at 20 links", () => {
    let html = ""
    for (let i = 0; i < 30; i++) {
      html += `<a href="/jobs/${i}">Job ${i}</a>`
    }
    // Add a duplicate
    html += '<a href="/jobs/0">Duplicate Job</a>'
    const links = identifyJobLinks(html, "https://example.com")
    expect(links.length).toBeLessThanOrEqual(20)
    // Check uniqueness
    expect(new Set(links).size).toBe(links.length)
  })

  it("handles numeric ID patterns in URLs", () => {
    const html = '<a href="/opening/12345">Position</a>'
    const links = identifyJobLinks(html, "https://example.com")
    expect(links).toContain("https://example.com/opening/12345")
  })
})

describe("CareerPageCrawler - AI extraction mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("maps AI extraction output to DiscoveredJob format with company label", async () => {
    vi.mocked(prisma.careerPageUrl.findMany).mockResolvedValue([
      { id: "1", userId: "user-123", url: "https://example.com/careers", label: "Acme Corp", createdAt: new Date(), updatedAt: new Date() },
    ])

    const mockHtml = `
      <html><body>
        <h1>Careers at Acme</h1>
        <div class="job">
          <a href="/jobs/123"><h2>Software Engineer Intern</h2></a>
          <p>Location: San Francisco, CA</p>
          <p>Posted: 2026-01-15</p>
        </div>
      </body></html>
    `
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(mockHtml, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    ))

    vi.mocked(generateObject).mockResolvedValue({
      object: {
        jobs: [
          {
            title: "Software Engineer Intern",
            url: "/jobs/123",
            location: "San Francisco, CA",
            department: "Engineering",
            datePosted: "2026-01-15",
          },
        ],
      },
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      finishReason: "stop",
      rawResponse: undefined,
      toJsonResponse: vi.fn(),
      warnings: [],
      request: {},
      response: {},
      experimental_providerMetadata: undefined,
      providerMetadata: undefined,
      logprobs: undefined,
    } as any)

    const crawler = new CareerPageCrawler("user-123")
    const results = await crawler.discover({
      keywords: ["intern"],
      locations: ["CA"],
      roleTypes: ["internship"],
    })

    expect(results.length).toBeGreaterThanOrEqual(1)
    const job = results[0]
    expect(job.company).toBe("Acme Corp")
    expect(job.platform).toBe("career-page")
    expect(job.title).toBe("Software Engineer Intern")
    expect(job.location).toBe("San Francisco, CA")
    expect(job.externalUrl).toContain("/jobs/123")
  })
})
