/**
 * Format a date value to a readable date and time string (e.g., Aug 21, 2025, 2:30 PM)
 * @param {string|Date} dateValue
 * @param {Object} [options] - Intl.DateTimeFormat options (optional)
 * @returns {string}
 */
export function formatDateTime(dateValue, options) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return dateValue;
  // Default: e.g., Aug 21, 2025, 2:30 PM
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options
  });
}
/**
 * Format a date value to a readable time string (e.g., 2:30 PM)
 * @param {string|Date} dateValue
 * @param {Object} [options] - Intl.DateTimeFormat options (optional)
 * @returns {string}
 */
export function formatTime(dateValue, options) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return dateValue;
  // Default: hour:minute, 12-hour with AM/PM
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options
  });
}

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

/**
 * Normalize various date representations to an ISO YYYY-MM-DD string for inputs.
 * Accepts: ISO string, Date object, or { $date: 'ISO' }.
 * Returns empty string on invalid input.
 * @param {string|Date|Object} val
 * @returns {string}
 */
export function toISODate(val) {
  if (!val) return '';
  try {
    if (typeof val === 'object' && val !== null && ('$date' in val)) {
      const d = new Date(val.$date);
      return !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
    }
    const d = new Date(val);
    return !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
  } catch (e) {
    return '';
  }
}

/** FOR TEMPLATES
 * Renders a colored status badge with a dot and label for template/document status.
 * Supported types: Approved, Pending, Late, Returned, OnGoing, Published (case-insensitive).
 *
 * @param {Object} props
 * @param {string} props.type - The status type to display
 * @returns {JSX.Element}
 */
export function StatusBadge({ type }) {
  const status = String(type).toLowerCase();

  const styles = {
    approved: "bg-green-50 text-green-700 border border-green-200",
    pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    late: "bg-red-50 text-red-700 border border-red-200",
    rejected: "bg-red-50 text-red-700 border border-red-200",
    returned: "bg-orange-50 text-orange-700 border border-orange-200",
    ongoing: "bg-gray-50 text-gray-700 border border-gray-200",
    published: "bg-blue-50 text-blue-700 border border-blue-200",
  };

  const dotColors = {
    approved: "bg-green-500",
    pending: "bg-yellow-500",
    late: "bg-red-500",
    rejected: "bg-red-500",
    returned: "bg-orange-500",
    ongoing: "bg-gray-500",
    published: "bg-blue-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
        styles[status] || "bg-gray-50 text-gray-700 border border-gray-200"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          dotColors[status] || "bg-gray-500"
        }`}
      />
      {type}
    </span>
  );
}
