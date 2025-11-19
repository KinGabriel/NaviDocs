import { useState, useMemo } from "react";
import { CalendarDays, Clock } from "lucide-react";
import StatusBadge from "./statusBadge";


export default function UpcomingDeadlines({
  deadlines = [],
  title = "DEADLINES",
  icon = "📌",
  formatDate,
  className = "",
  emptyMessage = "No deadlines found",
  navigate
}) {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [filterDate, setFilterDate] = useState("");

  const filteredDeadlines = useMemo(() => {
    return deadlines
      .filter((d) => {
        if (activeTab === "overdue") return d.priority === "Overdue";
        if (activeTab === "today") return d.priority === "Due Today";
        return d.priority === "Upcoming";
      })
      .filter((d) => {
        if (!filterDate) return true;
        const deadlineDate = new Date(d.date).toISOString().split("T")[0];
        return deadlineDate === filterDate;
      });
  }, [activeTab, deadlines, filterDate]);

  const tabs = [
    { key: "upcoming", label: "Upcoming" },
    { key: "today", label: "Due Today" },
    { key: "overdue", label: "Overdue" },
  ];

  return (
    <div className={`space-y-6 w-full md:w-[32rem] lg:w-full ${className}`}>
      <div className="bg-white shadow-sm rounded-lg border border-gray-100 h-[22rem] flex flex-col">

        {/* Header */}
        <div className="bg-[#FBFBFB] px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-red-100 rounded-lg flex items-center justify-center text-sm md:text-base">
              {icon}
            </div>
            <h3 className="font-semibold text-xs md:text-sm text-gray-800">{title}</h3>
          </div>

          {/* Calendar filter */}
          <div className="relative">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white shadow-sm transition duration-200"
            />
            <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-2 md:px-4 border-b border-gray-100 flex text-[11px] md:text-xs font-medium justify-between gap-1 md:gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`flex-1 min-w-0 text-center py-2 transition truncate ${activeTab === tab.key
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
                }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="p-3 md:p-4 space-y-3 flex-1 overflow-y-auto">
          {filteredDeadlines.length > 0 ? (
            filteredDeadlines.map((deadline) => (
              <button
                key={deadline.id}
                onClick={() =>
                  navigate(`/submission-details/${deadline.id}`, { state: { deadline } })
                }
                className="w-full text-left border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow"
              >

                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-xs md:text-sm text-gray-800 flex-1">
                    {deadline.title}
                  </h4>
                  <StatusBadge type={deadline.priority} />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-500">
                    <CalendarDays className="w-3 h-3" />
                    <span>{formatDate(deadline.date)}</span>
                  </div>
                  <div className="text-[10px] md:text-xs text-gray-500">
                    {deadline.department}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-10">
              <Clock className="w-7 h-7 md:w-8 md:h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-xs md:text-sm">{emptyMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}