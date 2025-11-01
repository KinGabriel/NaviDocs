import React from "react";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import Table from "../../components/table";
import Greeting from "../../components/greeting";
import UpcomingDeadlines from "../../components/upcomingDeadlines";
import { CalendarClock, CalendarCheck, CalendarX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "../../utils/formatters";

export default function SecretaryDashboard() {
  const user = useUser();
  const navigate = useNavigate();

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

  // Example data
  const requestedTemplates = [
    {
      id: 1,
      title: "Research Proposal Template",
      createdBy: "Admin User",
      status: "Approved",
    },
    {
      id: 2,
      title: "Thesis Format Guide",
      createdBy: "Admin User",
      status: "Rejected",
    },
    {
      id: 3,
      title: "Internship Report Template",
      createdBy: "Admin User",
      status: "Returned",
    },
    {
      id: 4,
      title: "Course Syllabus Template",
      createdBy: "Admin User",
      status: "Approved",
    },
    {
      id: 5,
      title: "Capstone Project Template",
      createdBy: "Admin User",
      status: "Pending",
    },
    {
      id: 6,
      title: "Department Memo Format",
      createdBy: "Admin User",
      status: "Endorsed",
    },
  ];


  const recentlySubmittedTemplates = [
    {
      id: 1,
      code: "DOC-001",
      rev: "00",
      date: "2025-01-21",
      title: "BSCS Capstone Guidelines",
      createdBy: "Daniel Cruz",
    },
    {
      id: 2,
      code: "DOC-002",
      rev: "01",
      date: "2025-02-14",
      title: "Student Handbook 2025",
      createdBy: "Sarah Dela Cruz",
    },
    {
      id: 3,
      code: "DOC-003",
      rev: "00",
      date: "2025-03-09",
      title: "Faculty Manual",
      createdBy: "Mae Santos",
    },
    {
      id: 4,
      code: "DOC-004",
      rev: "00",
      date: "2025-03-09",
      title: "Faculty Manual (Updated)",
      createdBy: "Mae Santos",
    },
    {
      id: 5,
      code: "DOC-005",
      rev: "00",
      date: "2025-03-09",
      title: "Faculty Manual (Sec Dept)",
      createdBy: "Mae Santos",
    },
  ];

  const requestedTemplatesColumn = [
    { key: "title", label: "Title" },
    { key: "createdBy", label: "Created By" },
   {
         key: "status",
         label: "Status",
         render: (row) => <StatusBadge type={row.status} />,
       },
    {
      key: "action",
      label: "Action",
      render: () => (
        <button
          onClick={() => navigate("")}
          className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200 whitespace-nowrap"
        >
          Review
        </button>
      ),
    },
  ];

  const recentlySubmittedTemplatesColumn = [
    { key: "code", label: "Document Code" },
    { key: "rev", label: "Revision No." },
    {
      key: "date",
      label: "Effectivity",
      render: (row) => formatDate(row.date),
    },
    {
      key: "title",
      label: "Title",
      render: (row) => (
        <span className="truncate block max-w-xs">{row.title}</span>
      ),
    },
    { key: "createdBy", label: "Created By" },
    {
      key: "action",
      label: "Action",
      render: () => (
        <button
          onClick={() => navigate("")}
          className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200 whitespace-nowrap"
        >
          Review
        </button>
      ),
    },
  ];

  const upcomingDeadlines = [
    {
      id: 1,
      title: "Template Review",
      date: "2025-08-01",
      priority: "Overdue",
      department: "BS Computer Science",
    },
    {
      id: 2,
      title: "Faculty Performance Reports",
      date: "2025-08-21",
      priority: "Due Today",
      department: "BS Information Technology",
    },
    {
      id: 3,
      title: "Budget Allocation Review",
      date: "2025-08-31",
      priority: "Due This Week",
      department: "Administration",
    },
    {
      id: 4,
      title: "Field Trip Agenda Review",
      date: "2025-09-23",
      priority: "Upcoming",
      department: "BS Information Technology",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      {/* header full width */}
      <Header user={user} />

      {/* body wrapper: column on mobile, row on desktop */}
      <div className="flex flex-1 flex-col md:flex-row">
        {/* leave sidebar behavior as-is (you said it's already responsive) */}
        <Sidebar user={user} active="Dashboard" />

        {/* main content card */}
        <main className="flex-1 flex flex-col bg-white shadow rounded-xl mx-4 my-4 md:mx-6 md:mt-8 p-4 md:p-10">
          <Greeting name={user?.firstname || "Secretary"} />

          {/* STAT CARDS */}
          {/* stack vertically on mobile, wrap nicely on tablet, row on desktop */}
          <div className="w-full mb-8">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:gap-4 gap-4">
              {/* Upcoming Deadlines */}
              <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-[12rem] flex-1">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                  <CalendarClock className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    Upcoming Deadlines
                  </div>
                  <div className="text-3xl font-bold text-gray-900 leading-tight">
                    1
                  </div>
                </div>
              </div>

              {/* Due Today */}
              <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-[12rem] flex-1">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                  <CalendarCheck className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    Due Today
                  </div>
                  <div className="text-3xl font-bold text-gray-900 leading-tight">
                    1
                  </div>
                </div>
              </div>

              {/* Overdue Deadlines */}
              <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-[12rem] flex-1">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                  <CalendarX className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-600 mb-1">
                    Overdue Deadlines
                  </div>
                  <div className="text-3xl font-bold text-gray-900 leading-tight">
                    1
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN GRID SECTION */}
          {/* mobile: stack vertically
              md+: 3/1 split (requested templates + deadlines)
              then recently submitted full width */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 w-full">
            {/* Requested Templates (left block) */}
            <div className="md:col-span-3 space-y-6 w-full">
              <div className="bg-[#FBFBFB] shadow p-4 rounded w-full">
                {/* header + legend */}
                <div className="px-3 py-1 bg-gray-50 flex flex-col gap-4 md:flex-row md:items-start md:justify-between rounded-lg">
                  {/* left: title */}
                  <div>
                    <h2 className="font-bold text-sm text-gray-800 tracking-wide">
                      REQUESTED TEMPLATES
                    </h2>
                    <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
                  </div>

         <button
                    onClick={() => navigate("")}
                    className="lg:mr-4 lg:mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F] w-full sm:w-auto"
                  >
                    View All
                  </button>
                </div>

                {/* table with horizontal scroll support on mobile */}
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    <Table
                      columns={requestedTemplatesColumn}
                      data={requestedTemplates}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Deadlines (right block) */}
            <div className="md:col-span-1 space-y-6 w-full">
              <UpcomingDeadlines
                deadlines={upcomingDeadlines}
                formatDate={formatDate}
              />
            </div>

            {/* Recently Submitted Templates (full width row) */}
            <div className="md:col-span-4 bg-[#FBFBFB] shadow p-4 rounded w-full">
              <div className="px-3 py-1 bg-gray-50 flex flex-col gap-4 md:flex-row md:items-start md:justify-between rounded-lg">
                <div>
                  <h2 className="font-bold text-sm text-gray-800 tracking-wide">
                    RECENTLY SUBMITTED TEMPLATES
                  </h2>
                  <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
                </div>

               <button
                    onClick={() => navigate("")}
                    className="lg:mr-4 lg:mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F] w-full sm:w-auto"
                  >
                    View All
                  </button>
              </div>

              {/* scrollable on mobile */}
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <Table
                    columns={recentlySubmittedTemplatesColumn}
                    data={recentlySubmittedTemplates}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* END MAIN GRID */}
        </main>
      </div>
    </div>
  );
}
