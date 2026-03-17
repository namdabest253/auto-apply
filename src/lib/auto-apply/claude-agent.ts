import { generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { InteractiveElement, AgentAction, StepLog, SerializedProfile } from "./types";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("click"),
    selector: z.string(),
    description: z.string(),
  }),
  z.object({
    action: z.literal("fill"),
    selector: z.string(),
    value: z.string(),
    description: z.string(),
  }),
  z.object({
    action: z.literal("select"),
    selector: z.string(),
    value: z.string(),
    description: z.string(),
  }),
  z.object({
    action: z.literal("upload_file"),
    selector: z.string(),
    description: z.string(),
  }),
  z.object({
    action: z.literal("submit"),
    selector: z.string(),
    description: z.string(),
  }),
  z.object({
    action: z.literal("wait"),
    ms: z.number(),
    description: z.string(),
  }),
  z.object({
    action: z.literal("done"),
    description: z.string(),
  }),
  z.object({
    action: z.literal("needs_review"),
    reason: z.string(),
  }),
]);

function buildProfileContext(profile: SerializedProfile): string {
  const lines: string[] = ["## Applicant Profile"];

  if (profile.contactName) lines.push(`Name: ${profile.contactName}`);
  if (profile.contactEmail) lines.push(`Email: ${profile.contactEmail}`);
  if (profile.contactPhone) lines.push(`Phone: ${profile.contactPhone}`);
  if (profile.contactLinkedIn) lines.push(`LinkedIn: ${profile.contactLinkedIn}`);
  if (profile.contactWebsite) lines.push(`Website: ${profile.contactWebsite}`);
  if (profile.contactLocation) lines.push(`Location: ${profile.contactLocation}`);

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

const SYSTEM_PROMPT = `You are a job application agent. You are navigating a web page to fill out and submit a job application on behalf of the user.

You will receive:
1. A screenshot of the current page
2. A list of interactive DOM elements with their selectors
3. The applicant's profile data
4. History of actions you've already taken

Your job is to return exactly ONE action to take next. Analyze the screenshot and DOM to understand the current state of the page.

Rules:
- Fill form fields with the applicant's profile data. Match fields to the most appropriate profile data.
- For screening questions, use the pre-answered QA bank. If a question isn't in the bank, use your best judgment based on the profile.
- For file upload fields (resume), use the "upload_file" action.
- Click "Next", "Continue", or "Submit" buttons to advance through multi-step forms.
- If you see a success/confirmation page (e.g., "Application submitted", "Thank you"), return { action: "done" }.
- If you see a CAPTCHA, return { action: "needs_review", reason: "captcha detected" }.
- If you encounter something you cannot handle (login wall, error page, etc.), return { action: "needs_review", reason: "..." }.
- Use the exact CSS selectors from the DOM list for your actions.
- Only fill one field or click one button per action. Do not try to do multiple things at once.
- If a dropdown/select needs a specific value, look at the available options and pick the best match.
- For checkboxes or radio buttons that need to be selected, use "click".
- If the page is still loading, use { action: "wait", ms: 2000 }.`;

export async function getNextAction(
  screenshot: Buffer,
  domElements: InteractiveElement[],
  currentUrl: string,
  profile: SerializedProfile,
  history: StepLog[]
): Promise<AgentAction> {
  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const historyText =
    history.length > 0
      ? history
          .map(
            (s) =>
              `Step ${s.step}: ${s.action.action} → ${s.result}${s.error ? ` (${s.error})` : ""}`
          )
          .join("\n")
      : "No actions taken yet.";

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: actionSchema,
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

${buildProfileContext(profile)}

## Action History
${historyText}

Analyze the screenshot and DOM elements. Return the next action to take.`,
          },
        ],
      },
    ],
  });

  return object as AgentAction;
}
