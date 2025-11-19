// String-related helpers for template-service

/**
 * Create a URL/identifier-safe slug from any string.
 * - Lowercases
 * - Trims
 * - Replaces non [a-z0-9-_] with '-'
 * - Trims leading/trailing '-'
 * @param {string} v
 * @returns {string}
 */
export const slug = (v) => String(v || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-_]+/g, '-')
  .replace(/^-+|-+$/g, '');
