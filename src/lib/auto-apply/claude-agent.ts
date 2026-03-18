import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { InteractiveElement, AgentAction, StepLog, SerializedProfile } from "./types";

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Rate limit") || msg.includes("429")) {
        const waitMs = Math.min(2000 * Math.pow(2, i), 30000);
        console.log(`[agent] Rate limited, waiting ${waitMs}ms (attempt ${i + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed after ${maxRetries} attempts`);
}

function buildProfileContext(profile: SerializedProfile): string {
  const lines: string[] = ["## Applicant Profile"];

  if (profile.contactName) lines.push(`Name: ${profile.contactName}`);
  if (profile.contactEmail) lines.push(`Email: ${profile.contactEmail}`);
  if (profile.contactPhone) lines.push(`Phone: ${profile.contactPhone}`);
  if (profile.contactLinkedIn) lines.push(`LinkedIn: ${profile.contactLinkedIn}`);
  if (profile.contactWebsite) lines.push(`Website: ${profile.contactWebsite}`);
  if (profile.contactLocation) lines.push(`Location: ${profile.contactLocation}`);

  const addrParts = [profile.addressLine1, profile.addressLine2, profile.city, profile.state, profile.zipCode, profile.country].filter(Boolean);
  if (addrParts.length > 0) {
    lines.push("\n### Address");
    if (profile.addressLine1) lines.push(`Street: ${profile.addressLine1}`);
    if (profile.addressLine2) lines.push(`Apt/Suite: ${profile.addressLine2}`);
    if (profile.city) lines.push(`City: ${profile.city}`);
    if (profile.state) lines.push(`State: ${profile.state}`);
    if (profile.zipCode) lines.push(`ZIP: ${profile.zipCode}`);
    if (profile.country) lines.push(`Country: ${profile.country}`);
  }

  if (profile.workdayPassword) lines.push(`\nWorkday Account Password: ${profile.workdayPassword}`);

  if (profile.education.length > 0) {
    lines.push("\n### Education");
    for (const edu of profile.education) {
      const parts = [edu.school, edu.degree, edu.fieldOfStudy].filter(Boolean);
      lines.push(`- ${parts.join(", ")}${edu.gpa ? ` (GPA: ${edu.gpa})` : ""}`);
      if (edu.startDate || edu.endDate)
        lines.push(`  ${edu.startDate || "?"} - ${edu.endDate || "Present"}`);
    }
  }

  if (profile.workHistory.length > 0) {
    lines.push("\n### Work Experience");
    for (const work of profile.workHistory) {
      lines.push(`- ${work.title || "Role"} at ${work.company}`);
      if (work.startDate || work.endDate)
        lines.push(`  ${work.startDate || "?"} - ${work.endDate || "Present"}`);
      for (const bullet of work.bullets) {
        lines.push(`  • ${bullet}`);
      }
    }
  }

  if (profile.skills.length > 0) {
    lines.push(`\n### Skills: ${profile.skills.map((s) => s.name).join(", ")}`);
  }

  if (profile.qaEntries.length > 0) {
    lines.push("\n### Pre-answered Questions (use these for screening questions)");
    for (const qa of profile.qaEntries) {
      lines.push(`Q: ${qa.question}`);
      lines.push(`A: ${qa.answer}`);
    }
  }

  return lines.join("\n");
}

function buildDomSummary(elements: InteractiveElement[]): string {
  return elements
    .map((el, i) => {
      const parts = [`[${i}] <${el.tag}`];
      if (el.type) parts.push(`type="${el.type}"`);
      if (el.name) parts.push(`name="${el.name}"`);
      if (el.id) parts.push(`id="${el.id}"`);
      if (el.placeholder) parts.push(`placeholder="${el.placeholder}"`);
      if (el.ariaLabel) parts.push(`aria-label="${el.ariaLabel}"`);
      if ((el as any).dataAutomationId) parts.push(`data-automation-id="${(el as any).dataAutomationId}"`);
      if (el.labelText) parts.push(`label="${el.labelText}"`);
      if (el.value) parts.push(`value="${el.value}"`);
      if (el.isCaptcha) parts.push("CAPTCHA");
      parts.push(`selector="${el.selector}">`);
      if (el.options) {
        const optStr = el.options
          .slice(0, 10)
          .map((o) => `${o.value}:${o.text}`)
          .join(", ");
        parts.push(`options=[${optStr}]`);
      }
      return parts.join(" ");
    })
    .join("\n");
}

const SYSTEM_PROMPT = `You are a job application agent. You navigate web pages to fill out and submit job applications.

You will receive a screenshot, interactive DOM elements with CSS selectors, and the applicant's profile.

Return ONLY a JSON object (no markdown, no code fences) with exactly these fields:
{
  "action": "click" | "fill" | "select" | "upload_file" | "submit" | "wait" | "done" | "needs_review",
  "selector": "CSS selector or null",
  "value": "text value or null",
  "ms": number or null,
  "description": "what this action does",
  "reason": "why needs_review, or null"
}

Rules:
- Fill form fields with the applicant's profile data. Match fields to the most appropriate data.
- For screening questions, use the pre-answered QA bank. If not in the bank, use best judgment.
- For file uploads (resume), use "upload_file".
- Click "Next", "Continue", or "Submit" to advance through multi-step forms.
- If you see a success/confirmation page, return action "done".
- If you see a CAPTCHA, return action "needs_review" with reason.
- Use exact CSS selectors from the DOM list.
- One action per response.
- For dropdowns, pick the best matching option value.
- For checkboxes/radio buttons, use "click".

CRITICAL — AVOID LOOPS:
- Check the Action History carefully. If a field already has a value (shown in the DOM element list), DO NOT fill it again.
- If you see you have already filled a field or clicked a button in previous steps, DO NOT repeat that action.
- If fields are already filled, look for a "Next", "Continue", "Submit", "Save and Continue" button to advance to the next page.
- If you cannot find a submit/next button, try scrolling down — use action "click" on the page body or a scroll target.
- If you are stuck repeating the same actions for 3+ steps, return { action: "needs_review", reason: "stuck in loop" }.
- If page is loading, use action "wait" with ms: 2000.

WORKDAY SIGN-IN HANDLING:
- Workday sites require an account. If you see a sign-in page, DO NOT return needs_review.
- Use the applicant's email address to sign in or create an account.
- If there is a "Create Account" or "Sign Up" option, click it and create an account using the email and the Workday Account Password from the profile.
- If there is a "Sign In" form, enter the email and Workday Account Password.
- If you see "Forgot Password" or account verification steps, proceed through them.
- After signing in or creating an account, continue with the application form as normal.
- Only return needs_review for sign-in if no email or Workday password is available in the profile.

WORKDAY SELECTORS:
- Workday elements have data-automation-id attributes. Prefer selectors like [data-automation-id="..."] over long nth-of-type paths.
- For file uploads on Workday, the visible element is a button, not an input. Use "upload_file" with the file input selector (input[type="file"]), NOT the button selector.
- If you see an input[type="file"] in the DOM (even if hidden), use that selector for upload_file actions.`;

export async function getNextAction(
  screenshot: Buffer,
  domElements: InteractiveElement[],
  currentUrl: string,
  profile: SerializedProfile,
  history: StepLog[]
): Promise<AgentAction> {
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const historyText =
    history.length > 0
      ? history
          .slice(-15) // Only send last 15 steps to avoid token bloat
          .map((s) => {
            const a = s.action;
            let detail = `Step ${s.step}: ${a.action}`;
            if (a.selector) detail += ` on "${a.selector}"`;
            if (a.value) detail += ` value="${a.value}"`;
            if (a.description) detail += ` (${a.description})`;
            detail += ` → ${s.result}`;
            if (s.error) detail += ` ERROR: ${s.error}`;
            return detail;
          })
          .join("\n")
      : "No actions taken yet.";

  const { text } = await callWithRetry(() => generateText({
    model: openai("gpt-4o-mini"),
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "image",
            image: screenshot,
          },
          {
            type: "text",
            text: `Current URL: ${currentUrl}

## Interactive Elements
${buildDomSummary(domElements)}

## Fields Already Filled (DO NOT fill these again)
${domElements.filter((el) => el.value && (el.tag === "input" || el.tag === "textarea" || el.tag === "select")).map((el) => `- "${el.labelText || el.name || el.placeholder || el.selector}": "${el.value}"`).join("\n") || "None yet."}

${buildProfileContext(profile)}

## Action History (recent)
${historyText}

IMPORTANT: Look at "Fields Already Filled" above. Do NOT re-fill any field that already has a value. Instead, find a "Next", "Continue", "Submit", or "Save and Continue" button to advance. If all visible fields are filled, you MUST click the submit/next button.

Return the next action as a JSON object.`,
          },
        ],
      },
    ],
  }));

  // Parse the JSON response, stripping any markdown fences
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);

  return {
    action: parsed.action,
    selector: parsed.selector ?? null,
    value: parsed.value ?? null,
    ms: parsed.ms ?? null,
    description: parsed.description ?? null,
    reason: parsed.reason ?? null,
  };
}
