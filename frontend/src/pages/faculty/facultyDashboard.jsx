import React, { useState, useEffect } from "react";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import Table2 from "../../components/table2";
import { StatusBadge } from "../../utils/formatters";
import { CalendarClock, CalendarCheck, CalendarX } from "lucide-react";
import Greeting from "../../components/greeting";
import UpcomingDeadlines from "../../components/upcomingDeadlines";
import Loader from "../../components/loader";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function FacultyDashboard() {
  const user = useUser();
  const [loading, setLoading] = useState(true);

  // Loading simulation — replace later with your API call
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  function formatDate(dateValue) {
    if (!dateValue) return "-";
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />

        <div className="flex flex-1 flex-col md:flex-row">
          <Sidebar user={user} active="Dashboard" />
          <div className="flex-1 flex items-center justify-center bg-white rounded-xl m-4 shadow">
            <Loader message="Loading Dashboard..." />
          </div>
        </div>
      </div>
    );
  }

  // Recently Submitted Templates
  const submittedTemplates = [
    { id: 1, title: "Research Proposal Template", viewedBy: "Admin User", status: "Approved" },
    { id: 2, title: "Thesis Format Guide", viewedBy: "Admin User", status: "Rejected" },
    { id: 3, title: "Internship Report Template", viewedBy: "Admin User", status: "Returned" },
    { id: 4, title: "Course Syllabus Template", viewedBy: "Admin User", status: "Approved" },
    { id: 5, title: "Capstone Project Template", viewedBy: "Admin User", status: "Pending" },
    { id: 6, title: "Department Memo Format", viewedBy: "Admin User", status: "Endorsed" },
    { id: 7, title: "Department Memo Format", viewedBy: "Admin User", status: "Endorsed" },
    { id: 8, title: "Department Memo Format", viewedBy: "Admin User", status: "Endorsed" },
  ];

  const submittedTemplatesColumns = [
    { key: "title", label: "Title", render: (row) => <span className="max-w-xs truncate block">{row.title}</span> },
    { key: "viewedBy", label: "Viewed By" },
    { key: "status", label: "Status", render: (row) => <StatusBadge type={row.status} /> },
    {
      key: "action",
      label: "Action",
      render: () => (
        <button className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200 whitespace-nowrap">
          Review
        </button>
      ),
    },
  ];

  const upcomingDeadlines = [
    { id: 1, title: "Course Syllabi Review", date: "2025-08-01", priority: "Overdue", department: "BS Computer Science" },
    { id: 2, title: "Faculty Performance Reports", date: "2025-08-21", priority: "Due Today", department: "BS Information Technology" },
    { id: 3, title: "Budget Allocation Review", date: "2025-08-31", priority: "Due This Week", department: "Administration" },
    { id: 4, title: "Field Trip Agenda Review", date: "2025-09-23", priority: "Upcoming", department: "BS Information Technology" },
  ];

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />

      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar user={user} active="Dashboard" />

        <main className="flex-1 flex flex-col bg-white shadow rounded-xl mx-4 my-4 md:mx-6 md:mt-8 p-4 md:p-10">
          <Greeting name={user?.firstname || "Department Head"} />

          {/* Stat cards */}
          <div className="flex flex-wrap gap-4 items-stretch mb-8 mt-4">
            {/* Upcoming Deadlines */}
            <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-[12rem] flex-1 sm:flex-none">
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                <CalendarClock className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Upcoming Deadlines</div>
                <div className="text-3xl font-bold text-gray-900">1</div>
              </div>
            </div>

            {/* Due Today */}
            <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-[12rem] flex-1 sm:flex-none">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <CalendarCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Due Today</div>
                <div className="text-3xl font-bold text-gray-900">1</div>
              </div>
            </div>

            {/* Overdue Deadlines */}
            <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-[12rem] flex-1 sm:flex-none">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <CalendarX className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Overdue Deadlines</div>
                <div className="text-3xl font-bold text-gray-900">1</div>
              </div>
            </div>
          </div>

          {/* MAIN GRID SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 flex-1 w-full">
            {/* LEFT SIDE */}
            <div className="md:col-span-3 space-y-6 w-full">
              <div className="bg-[#FBFBFB] shadow p-4 rounded w-full">
                <div className="px-3 py-1 bg-gray-50 flex flex-col gap-4 md:flex-row md:items-start md:justify-between rounded-lg">
                  <div>
                    <h2 className="font-bold text-sm text-gray-800 tracking-wide">RECENTLY SUBMITTED TEMPLATES</h2>
                    <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
                  </div>
                  <button className="lg:mr-4 lg:mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F] w-full sm:w-auto">
                    View All
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    <Table2 columns={submittedTemplatesColumns} data={submittedTemplates} />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="md:col-span-2 w-full flex flex-col">
              <UpcomingDeadlines deadlines={upcomingDeadlines} formatDate={formatDate} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
