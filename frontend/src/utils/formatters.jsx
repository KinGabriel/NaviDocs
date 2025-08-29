
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
    returned: "bg-orange-50 text-red-700 border border-orange-200",
    ongoing: "bg-gray-50 text-gray-700 border border-gray-200",
    published: "bg-blue-50 text-blue-700 border border-blue-200",
  };
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]||''}`}>
      <span className={`h-2 w-2 rounded-full ${status==='approved'?'bg-green-500':status==='pending'?'bg-yellow-500':status==='late'?'bg-red-500':status==='published'?'bg-blue-500':status==='ongoing'?'bg-gray-500':'bg-orange-500'}`}/>
      {type}
    </span>
  );
}