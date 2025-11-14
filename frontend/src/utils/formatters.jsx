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

/**
 * Convert status string to Pascal Case for display
 * Examples: "active" -> "Active", "overdue" -> "Overdue", "pending_review" -> "Pending Review"
 * @param {string} status
 * @returns {string}
 */
function toPascalCase(status) {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * StatusBadge Component
 *
 * Renders a colored badge with a dot and label for various status types.
 * Supports:
 *  - Document/Template Statuses: Approved, Submitted, Pending, Late, Returned, Ongoing, Published, Rejected, Draft
 *  - Submission Statuses: Active, Completed, Overdue
 *  - Priority/Delay Statuses: Severe Delay, Significant Delay, Moderate Delay, Minor Delay
 *  - Deadline Statuses: Overdue, Due Today, Due This Week, Upcoming, Future Deadline
 *  - Review Statuses: Pending Review
 *
 * @param {Object} props
 * @param {string} props.type - The status type to display
 * @returns {JSX.Element}
 */
export function StatusBadge({ type }) {
  const status = String(type).toLowerCase().replace(/\s+/g, "_");

  const styles = {
    // Document/Template statuses
    approved: "bg-green-50 text-green-700 border border-green-200",
    submitted: "bg-green-50 text-green-700 border border-green-200",
    resubmitted: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    late: "bg-red-50 text-red-700 border border-red-200",
    rejected: "bg-red-50 text-red-700 border border-red-200",
    returned: "bg-orange-50 text-orange-700 border border-orange-200",
    draft: "bg-gray-50 text-gray-700 border border-gray-200",
    published: "bg-blue-50 text-blue-700 border border-blue-200",
    endorsed: "bg-purple-50 text-purple-700 border border-purple-200",

    // Submission statuses
    active: "bg-blue-50 text-blue-700 border border-blue-200", // The submission has been published/sent out, Faculty members can now submit their documents
    completed: "bg-green-50 text-green-700 border border-green-200",
    overdue: "bg-red-50 text-red-700 border border-red-200",

    // Priority/Delay statuses
    severe_delay: "bg-red-50 text-red-700 border border-red-200",
    significant_delay: "bg-orange-50 text-orange-700 border border-orange-200",
    moderate_delay: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    minor_delay: "bg-blue-50 text-blue-700 border border-blue-200",

    // Deadline statuses
    overdue: "bg-red-50 text-red-700 border border-red-200",
    due_today: "bg-orange-50 text-orange-700 border border-orange-200",
    due_this_week: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    upcoming: "bg-blue-50 text-blue-700 border border-blue-200",
    future_deadline: "bg-green-50 text-green-700 border border-green-200",
  };

  const dotColors = {
    // Document/Template statuses
    approved: "bg-green-500",
    submitted: "bg-green-500",
    resubmitted: "bg-indigo-500",
    pending: "bg-yellow-500",
    late: "bg-red-500",
    rejected: "bg-red-500",
    returned: "bg-orange-500",
    draft: "bg-gray-500",
    published: "bg-blue-500",
    endorsed: "bg-purple-500",

    // Submission statuses
    active: "bg-blue-500",
    completed: "bg-green-500",
    overdue: "bg-red-500",

    // Priority/Delay statuses
    severe_delay: "bg-red-500",
    significant_delay: "bg-orange-500",
    moderate_delay: "bg-yellow-500",
    minor_delay: "bg-blue-500",

    // Deadline statuses
    overdue: "bg-red-500",
    due_today: "bg-orange-500",
    due_this_week: "bg-yellow-500",
    upcoming: "bg-blue-500",
    future_deadline: "bg-green-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || "bg-gray-50 text-gray-700 border border-gray-200"
        }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${dotColors[status] || "bg-gray-500"
          }`}
      />
      {toPascalCase(status)}
    </span>
  );
}