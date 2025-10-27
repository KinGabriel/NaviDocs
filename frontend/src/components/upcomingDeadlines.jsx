import { CalendarDays, Clock } from "lucide-react";
import StatusBadge from "./statusBadge";

export default function UpcomingDeadlines({ 
  deadlines = [], 
  title = "Deadlines",
  icon = "📌",
  maxHeight = "max-h-80",
  formatDate,
  className = "",
  emptyMessage = "No upcoming deadlines"
}) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white shadow-sm rounded-lg border border-gray-100">
        {/* Header */}
        <div className="bg-[#FBFBFB] px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              {icon}
            </div>
            <h3 className="font-semibold text-sm text-gray-800">
              {title}
            </h3>
          </div>
        </div>

        {/* Scrollable List */}
        <div className={`p-4 space-y-3 ${maxHeight} overflow-y-auto`}>
          {deadlines.length > 0 ? (
            deadlines.map((deadline) => (
              <div
                key={deadline.id}
                className="border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-sm text-gray-800 flex-1">
                    {deadline.title}
                  </h4>
                  <StatusBadge type={deadline.priority} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <CalendarDays className="w-3 h-3" />
                    <span>{formatDate(deadline.date)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {deadline.department}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">{emptyMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}