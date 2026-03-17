/**
 * Shared internship filtering utilities.
 *
 * Positive patterns match intern/internship/co-op roles using word boundaries.
 * Negative patterns exclude senior/staff/principal/etc. titles.
 */

export const INTERN_POSITIVE_PATTERNS: RegExp[] = [
  /\bintern\b/i,
  /\binternship\b/i,
  /\bco-?op\b/i,
];

export const INTERN_NEGATIVE_PATTERNS: RegExp[] = [
  /\bsenior\b/i,
  /\bstaff\b/i,
  /\bprincipal\b/i,
  /\blead\b/i,
  /\bmanager\b/i,
  /\bdirector\b/i,
  /\bphd\b/i,
  /\bmba\b/i,
  /\bvp\b/i,
  /\bhead of\b/i,
  /\bfellow\b/i,
];

/**
 * Check if a role title (optionally combined with department) is an internship.
 *
 * Positive match is checked against title + department combined.
 * Negative match is checked against title only.
 */
export function isInternshipRole(
  title: string,
  department?: string
): boolean {
  const combined = department ? `${title} ${department}` : title;

  const hasPositive = INTERN_POSITIVE_PATTERNS.some((p) => p.test(combined));
  if (!hasPositive) return false;

  const hasNegative = INTERN_NEGATIVE_PATTERNS.some((p) => p.test(title));
  if (hasNegative) return false;

  return true;
}

/**
 * Filter an array of jobs to only internship roles.
 */
export function filterInternships<T extends { title: string }>(
  jobs: T[],
  getDepartment?: (job: T) => string | undefined
): T[] {
  return jobs.filter((job) =>
    isInternshipRole(job.title, getDepartment?.(job))
  );
}

const US_STATE_ABBREVS =
  /\b(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/;

const US_LOCATION_PATTERNS: RegExp[] = [
  /united states/i,
  /\bUS\b/,
  /\bUSA\b/i,
  US_STATE_ABBREVS,
  /\bCalifornia\b/i,
  /\bNew York\b/i,
  /\bTexas\b/i,
  /\bWashington\b/i,
  /\bMassachusetts\b/i,
  /\bIllinois\b/i,
  /\bOhio\b/i,
  /\bPennsylvania\b/i,
  /\bVirginia\b/i,
  /\bColorado\b/i,
  /\bGeorgia\b/i,
  /\bFlorida\b/i,
  /\bOregon\b/i,
  /\bArizona\b/i,
  /\bNorth Carolina\b/i,
  /\bMaryland\b/i,
  /\bMichigan\b/i,
  /\bMinnesota\b/i,
  /\bNew Jersey\b/i,
  /\bConnecticut\b/i,
  /\bTennessee\b/i,
  /\bIndiana\b/i,
  /\bMissouri\b/i,
  /\bWisconsin\b/i,
];

/**
 * Check if a location string refers to a US location.
 * Returns true for null/empty locations and generic "Remote"/"In-Office" (ambiguous = keep).
 */
export function isUSLocation(location: string | null | undefined): boolean {
  if (!location || !location.trim()) return true;
  const trimmed = location.trim();
  if (/^(?:remote|in-office|hybrid)$/i.test(trimmed)) return true;
  return US_LOCATION_PATTERNS.some((p) => p.test(trimmed));
}
