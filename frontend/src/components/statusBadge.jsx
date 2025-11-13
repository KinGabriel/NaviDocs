/** FOR DOCUMENTS/PRIORITY/DEADLINES
 * Renders a colored status badge with a dot and label for template/document status.
 * Additional types for priority/delay and deadlines are also supported.
 */

export default function StatusBadge({ type }) {
  const status = String(type).toLowerCase().replace(/\s+/g, '_');

  const styles = {
    // Document statuses
    approved: "bg-green-50 text-green-700 border border-green-200",
    pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    late: "bg-red-50 text-red-700 border border-red-200",
    returned: "bg-orange-50 text-red-700 border border-orange-200",
    resubmitted: "bg-purple-50 text-purple-700 border border-purple-200",
    submitted: "bg-green-50 text-green-700 border border-green-200",
    ongoing: "bg-gray-50 text-gray-700 border border-gray-200",
    published: "bg-blue-50 text-blue-700 border border-blue-200",
    
    // Priority/delay statuses
    severe_delay: "bg-red-50 text-red-700 border border-red-200",
    significant_delay: "bg-orange-50 text-orange-700 border border-orange-200",
    moderate_delay: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    minor_delay: "bg-blue-50 text-blue-700 border border-blue-200",
    
    // Deadline priority statuses
    overdue: "bg-red-50 text-red-700 border border-red-200",
    due_today: "bg-orange-50 text-orange-700 border border-orange-200",
    due_this_week: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    upcoming: "bg-blue-50 text-blue-700 border border-blue-200",
    future_deadline: "bg-green-50 text-green-700 border border-green-200",
  };

  const dotColors = {
    // Document statuses
    approved: "bg-green-500",
    pending: "bg-yellow-500",
    returned: "bg-orange-500",
    
    // Priority/delay statuses
    severe_delay: "bg-red-500",
    significant_delay: "bg-orange-500",
    moderate_delay: "bg-yellow-500",
    minor_delay: "bg-blue-500",
    
    // Deadline priority statuses
    overdue: "bg-red-500",
    due_today: "bg-orange-500",
    due_this_week: "bg-yellow-500",
    upcoming: "bg-blue-500",
    future_deadline: "bg-green-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        styles[status] || "bg-gray-50 text-gray-700 border border-gray-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          dotColors[status] || "bg-gray-500"
        }`}
      />
      {type}
    </span>
  );
}