/**
 * Captcha handling for auto-apply.
 *
 * Current approach: stealth browser (rebrowser-playwright + anti-detection)
 * prevents most captchas. When one is detected, we mark the application
 * as "needs_review" so the user can apply manually.
 *
 * Future: integrate 2captcha/capsolver if captchas become frequent.
 */

export async function solveCaptcha(): Promise<{
  solved: boolean;
  reason: string;
}> {
  // Placeholder — always returns unsolved, triggering needs_review
  return {
    solved: false,
    reason: "Captcha solving not yet implemented. Please apply manually.",
  };
}
