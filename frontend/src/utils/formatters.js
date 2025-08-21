/**
 * Format a date value to a readable string (e.g., Aug 21, 2025)
 * @param {string|Date} dateValue
 * @returns {string}
 */
export function formatDate(dateValue) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
