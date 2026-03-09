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
