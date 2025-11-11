import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import Table from "../../components/table";
import { StatusBadge } from "../../utils/formatters";
import Greeting from "../../components/greeting";
import UpcomingDeadlines from "../../components/upcomingDeadlines";
import { CalendarClock, CalendarCheck, CalendarX } from "lucide-react";
import { Doughnut } from "react-chartjs-2";
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

// Add the page import as requested (file path route)
import SubmissionBins from "../../pages/submissionBins.jsx";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function DeanDashboard() {
  const user = useUser();
  const navigate = useNavigate();

  // URL route used by react-router for navigation (keep this pointing to your route path)
  const SUBMISSION_BINS_ROUTE = "/submission-bins";
  const DOC_CONTROLLER_TEMPLATES_ROUTE = "/templates?status=Published";

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

  // placeholder data
  const templates = [
    { id: 1, title: "Research Proposal Template", createdBy: "Admin User", status: "Approved" },
    { id: 2, title: "Thesis Format Guide", createdBy: "Admin User", status: "Rejected" },
    { id: 3, title: "Internship Report Template", createdBy: "Admin User", status: "Returned" },
    { id: 4, title: "Course Syllabus Template", createdBy: "Admin User", status: "Approved" },
    { id: 5, title: "Capstone Project Template", createdBy: "Admin User", status: "Pending" },
    { id: 6, title: "Department Memo Format", createdBy: "Admin User", status: "Endorsed" },
  ];

  const publishedTemplates = [
    { id: 1, code: "DOC-001", rev: "00", date: "2025-01-21", title: "BSCS Capstone Guidelines", createdBy: "Daniel Cruz" },
    { id: 2, code: "DOC-002", rev: "01", date: "2025-02-14", title: "Student Handbook 2025", createdBy: "Sarah Dela Cruz" },
    { id: 3, code: "DOC-003", rev: "00", date: "2025-03-09", title: "Faculty Manual", createdBy: "Mae Santos" },
    { id: 3, code: "DOC-003", rev: "00", date: "2025-03-09", title: "Faculty Manual", createdBy: "Mae Santos" },
    { id: 3, code: "DOC-003", rev: "00", date: "2025-03-09", title: "Faculty Manual", createdBy: "Mae Santos" },
  ];

  const templateColumns = [
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
          className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200"
        >
          Review
        </button>
      ),
    },
  ];

  const publishedTemplatesColumns = [
    { key: "code", label: "Document Code" },
    { key: "rev", label: "Revision No." },
    { key: "date", label: "Effectivity", render: (row) => formatDate(row.date) },
    { key: "title", label: "Title", render: (row) => <span className="truncate block max-w-xs">{row.title}</span> },
    { key: "createdBy", label: "Created By" },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <button
          onClick={() => navigate("")}
          className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200"
        >
          Review
        </button>
      ),
    },
  ];

  const upcomingDeadlines = [
    { id: 1, title: "Template Review for AY 2025", date: "2025-08-15", priority: "Overdue", department: "Quality Assurance" },
    { id: 2, title: "Annual Document Audit", date: "2025-08-28", priority: "Due Today", department: "Administration" },
    { id: 3, title: "Syllabus Submission Check", date: "2025-09-10", priority: "Upcoming", department: "Academics" },
  ];

  const submissionBin = [
    { id: 1, name: "Syllabus AY 2025", totalDocs: 50, department: 35, date: 10 },
    { id: 2, name: "Syllabus AY 2025", totalDocs: 50, department: 35, date: 10 },
    { id: 3, name: "Syllabus AY 2025", totalDocs: 50, department: 35, date: 10 },
    { id: 4, name: "Syllabus AY 2025", totalDocs: 50, department: 35, date: 10 },
    { id: 5, name: "Syllabus AY 2025", totalDocs: 50, department: 35, date: 10 },
  ];

  const submissionBinColumns = [
    { key: "name", label: "Submission Bin Name" },
    { key: "totalDocs", label: "Total Docs" },
    { key: "department", label: "Department" },
    { key: "date", label: "Date" },
  ];

  const chartData = {
    labels: ["Computing and Information Studies", "Management", "Accountancy"],
    datasets: [
      {
        data: [56, 36, 5],
        backgroundColor: ["#3B82F6", "#10B981", "#F59E0B"],
        borderWidth: 0,
        cutout: "60%",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      {/* Global header always on top */}
      <Header user={user} />

      {/* Layout: stack on mobile, row on large screens */}
      <div className="flex flex-col lg:flex-row flex-1">
        <Sidebar user={user} active="Dashboard" />

        {/* Main content panel with responsive padding/card treatment */}
        <main
          className="
          flex-1 flex flex-col bg-white
          lg:shadow
          pt-1 pb-4
          px-4 sm:px-6 lg:px-8
          mx-0 lg:mx-6
          mt-4 lg:mt-8
          rounded-none lg:rounded-xl
          w-full max-w-full
        "
        >
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

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 w-full">
            {/* Left side: tables */}
            <div className="lg:col-span-3 space-y-6">
              {/* Templates Table */}
              <div className="bg-[#FBFBFB] shadow p-4 rounded w-full">
                <div className="px-3 py-1 bg-gray-50 flex flex-col lg:flex-row lg:justify-between lg:items-center rounded-lg gap-4">
                  <div>
                    <h2 className="font-bold text-sm text-gray-800 tracking-wide">
                      RECENTLY SUBMITTED TEMPLATES
                    </h2>
                    <div className="w-16 h-1 bg-yellow-400 mt-1 rounded" />
                  </div>

                  <button
                    onClick={() => navigate(SUBMISSION_BINS_ROUTE)}
                    className="lg:mr-4 lg:mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F] w-full sm:w-auto"
                  >
                    View All
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <Table columns={templateColumns} data={templates} />
                </div>
              </div>

              <div className="lg:col-span-4 bg-[#FBFBFB] shadow p-4 rounded w-full">
                <div className="px-3 py-1 bg-gray-50 flex flex-col lg:flex-row lg:justify-between lg:items-center rounded-lg gap-4">
                  <div>
                    <h2 className="font-bold text-sm text-gray-800 tracking-wide">
                      RECENTLY SUBMITTED BIN
                    </h2>
                    <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table columns={submissionBinColumns} data={submissionBin} />
                </div>
              </div>
            </div>

            {/* Right side: deadlines + chart */}
            <div className="lg:col-span-1 space-y-6">
              <UpcomingDeadlines deadlines={upcomingDeadlines} formatDate={formatDate} />

              {/* Deadlines Summary Doughnut Chart */}
              <div className="bg-white shadow-sm rounded-lg border border-gray-100">
                <div className="bg-[#FBFBFB] px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-sm text-gray-800">
                    SUBMISSION OVERVIEW
                  </h3>
                </div>

                <div className="p-6">
                  {/* chart container gets fixed height for responsiveness */}
                  <div className="relative h-40 mb-4">
                    <Doughnut data={chartData} options={chartOptions} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-gray-600">Department of Computing and Information Studies</span>
                      </div>
                      <span className="font-medium text-gray-800">56</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-600">Department of Management</span>
                      </div>
                      <span className="font-medium text-gray-800">36</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-gray-600">Department of Accountancy</span>
                      </div>
                      <span className="font-medium text-gray-800">7</span>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* if you ever add more bottom-wide sections, use:
              <div className="lg:col-span-4 ..."> ... </div>
          */}
          </div>

          {/* Recently Published Table */}
          <div className="bg-[#FBFBFB] shadow p-4 rounded w-full mt-6">
            <div className="px-3 py-1 bg-gray-50 flex flex-col lg:flex-row lg:justify-between lg:items-center rounded-lg gap-4">
              <div>
                <h2 className="font-bold text-sm text-gray-800 tracking-wide">
                  RECENTLY PUBLISHED TEMPLATES
                </h2>
                <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
              </div>

              <button
                onClick={() => navigate(DOC_CONTROLLER_TEMPLATES_ROUTE)}
                className="lg:mr-4 lg:mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F] w-full sm:w-auto"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              <Table columns={publishedTemplatesColumns} data={publishedTemplates} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
