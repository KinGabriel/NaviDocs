import React, { useState } from "react";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import Table from "../../components/table";
import Greeting from "../../components/greeting";
import UpcomingDeadlines from "../../components/upcomingDeadlines";
import { CalendarClock, CalendarCheck, CalendarX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "../../utils/formatters";


export default function DeanDashboard() {
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


  // Sample data
  const templates = [
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
    {
      id: 1,
      title: "Template Review for AY 2025",
      date: "2025-08-15",
      priority: "Overdue",
      department: "Quality Assurance",
    },
    {
      id: 2,
      title: "Annual Document Audit",
      date: "2025-08-28",
      priority: "Due Today",
      department: "Administration",
    },
    {
      id: 3,
      title: "Syllabus Submission Check",
      date: "2025-09-10",
      priority: "Upcoming",
      department: "Academics",
    },
  ];


  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Dashboard" />


        <main className="flex-1 flex flex-col bg-white lg:shadow pt-1 pb-4 px-4 sm:px-6 lg:px-8 mx-0 lg:mx-6 mt-4 lg:mt-8 rounded-none lg:rounded-xl w-full max-w-full">
          <Greeting name={user?.firstname || "Document Controller"} />


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


          {/* Tables and Upcoming Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 w-full">
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-[#FBFBFB] shadow p-4 rounded w-full">
                <div className="px-3 py-1 bg-gray-50 flex flex-col lg:flex-row lg:justify-between lg:items-center rounded-lg gap-4">
                  <div>
                    <h2 className="font-bold text-sm text-gray-800 tracking-wide">
                      RECENTLY SUBMITTED TEMPLATES
                    </h2>
                    <div className="w-16 h-1 bg-yellow-400 mt-1 rounded" />
                  </div>

                  <button
                    onClick={() => navigate("")}
                    className="lg:mr-4 lg:mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F] w-full sm:w-auto"
                  >
                    View All
                  </button>
                </div>


                {/* table wrapper for horizontal scroll on mobile */}
                <div className="overflow-x-auto">
                  <Table columns={templateColumns} data={templates} />
                </div>
              </div>
            </div>


            <div className="lg:col-span-1 space-y-6">
              <UpcomingDeadlines
                deadlines={upcomingDeadlines}
                formatDate={formatDate}
              />
            </div>


            <div className="lg:col-span-4 bg-[#FBFBFB] shadow p-4 rounded w-full">
              <div className="px-3 py-1 bg-gray-50 flex flex-col lg:flex-row lg:justify-between lg:items-center rounded-lg gap-4">
                <div>
                  <h2 className="font-bold text-sm text-gray-800 tracking-wide">
                    RECENTLY PUBLISHED TEMPLATES
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


              <div className="overflow-x-auto">
                <Table
                  columns={publishedTemplatesColumns}
                  data={publishedTemplates}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}



