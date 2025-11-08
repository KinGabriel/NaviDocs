import React, { useState } from "react";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import Table2 from "../../components/table2";
import { StatusBadge } from "../../utils/formatters";
import { CalendarClock, CalendarCheck, CalendarX } from "lucide-react";
import Greeting from "../../components/greeting";
import UpcomingDeadlines from "../../components/upcomingDeadlines";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
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

  // Recently Submitted Templates
  const submittedTemplates = [
    {
      id: 1,
      title: "Research Proposal Template",
      viewedBy: "Admin User",
      status: "Approved",
    },
    {
      id: 2,
      title: "Thesis Format Guide",
      viewedBy: "Admin User",
      status: "Rejected",
    },
    {
      id: 3,
      title: "Internship Report Template",
      viewedBy: "Admin User",
      status: "Returned",
    },
    {
      id: 4,
      title: "Course Syllabus Template",
      viewedBy: "Admin User",
      status: "Approved",
    },
    {
      id: 5,
      title: "Capstone Project Template",
      viewedBy: "Admin User",
      status: "Pending",
    },
    {
      id: 6,
      title: "Department Memo Format",
      viewedBy: "Admin User",
      status: "Endorsed",
    },
    {
      id: 7,
      title: "Department Memo Format",
      viewedBy: "Admin User",
      status: "Endorsed",
    },
    {
      id: 8,
      title: "Department Memo Format",
      viewedBy: "Admin User",
      status: "Endorsed",
    },
  ];

  // Recently Submitted Templates Columns
  const submittedTemplatesColumns = [
    {
      key: "title",
      label: "Title",
      render: (row) => (
        <span className="max-w-xs truncate block">{row.title}</span>
      ),
    },
    {
      key: "viewedBy",
      label: "Viewed By",
    },
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

  const recentlySubmittedTemplates = [
    {
      id: 1,
      code: "FM-SAA-003",
      rev: "00",
      date: "2025-01-16",
      title: "3D Modeling and Animation Course Syllabi 26-27",
      createdBy: "Mae Santos",
    },
    {
      id: 2,
      code: "FM-SAA-001",
      rev: "00",
      date: "2025-12-17",
      title: "Motion Graphics Design Course Syllabi 26-27",
      createdBy: "Mae Santos",
    },
    {
      id: 3,
      code: "FM-SAA-006",
      rev: "00",
      date: "2025-01-26",
      title: "Special Topics 2 Course Syllabi 26-27",
      createdBy: "Jennie Zhang",
    },
    {
      id: 4,
      code: "FM-SAA-005",
      rev: "00",
      date: "2025-02-12",
      title: "Current Trends 2 Course Syllabi 26-27",
      createdBy: "Candice Gomez",
    },
    {
      id: 5,
      code: "FM-SAA-008",
      rev: "00",
      date: "2025-04-06",
      title: "Hospitality Course Syllabi 26-27",
      createdBy: "Stacey Dixon",
    },
  ];

  const recentlySubmittedTemplatesColumns = [
    {
      key: "code",
      label: "Document Code",
      render: (row) => <span className="text-xs text-gray-700">{row.code}</span>,
    },
    {
      key: "rev",
      label: "Revision No.",
    },
    {
      key: "date",
      label: "Effectivity",
      render: (row) => formatDate(row.date),
    },
    {
      key: "title",
      label: "Title",
      render: (row) => (
        <span className="max-w-xs truncate block">{row.title}</span>
      ),
    },
    {
      key: "createdBy",
      label: "Created By",
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

  const upcomingDeadlines = [
    {
      id: 1,
      title: "Course Syllabi Review",
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

      {/* body: column on mobile, row on desktop. we DON'T touch Sidebar responsiveness */}
      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar user={user} active="Dashboard" />

        {/* main content card */}
        <main className="flex-1 flex flex-col bg-white shadow rounded-xl mx-4 my-4 md:mx-6 md:mt-8 p-4 md:p-10">
          {/* greeting */}
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
          {/* mobile: stack vertically
              md+: 3/1 split (tables left, deadlines right) */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 flex-1 w-full">
            {/* LEFT SIDE: Requested Templates */}
            <div className="md:col-span-3 space-y-6 w-full">
              {/* Requested Templates card */}
              <div className="bg-[#FBFBFB] shadow p-4 rounded w-full">
                {/* header row with legend */}
                <div className="px-3 py-1 bg-gray-50 flex flex-col gap-4 md:flex-row md:items-start md:justify-between rounded-lg">
                  {/* Title + underline */}
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

                {/* table wrapper with horizontal scroll on mobile */}
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    <Table2
                      columns={submittedTemplatesColumns}
                      data={submittedTemplates}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Deadlines */}
            <div className="md:col-span-2 w-full flex flex-col">

              <UpcomingDeadlines
                deadlines={upcomingDeadlines}
                formatDate={formatDate}
              />
            </div>
          </div>
          {/* END GRID */}
        </main>
      </div>
    </div>
  );
}
