import React, { useState } from "react";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import Table from "../../components/table";
import Greeting from "../../components/greeting";
import UpcomingDeadlines from "../../components/upcomingDeadlines";
import { FileText, CheckCircle, AlertCircle } from "lucide-react";

export default function DocumentControllerDashboard() {
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

  // Sample data
  const templates = [
    { id: 1, code: "TMP-001", rev: "01", date: "2025-03-11", title: "Template for Research Proposal", createdBy: "Admin User" },
    { id: 2, code: "TMP-002", rev: "02", date: "2025-02-05", title: "Template for Internship Report", createdBy: "Admin User" },
    { id: 3, code: "TMP-003", rev: "00", date: "2025-04-22", title: "Template for Syllabus Format", createdBy: "Admin User" },
  ];

  const documents = [
    { id: 1, code: "DOC-001", rev: "00", date: "2025-01-21", title: "BSCS Capstone Guidelines", createdBy: "Daniel Cruz" },
    { id: 2, code: "DOC-002", rev: "01", date: "2025-02-14", title: "Student Handbook 2025", createdBy: "Sarah Dela Cruz" },
    { id: 3, code: "DOC-003", rev: "00", date: "2025-03-09", title: "Faculty Manual", createdBy: "Mae Santos" },
  ];

  const templateColumns = [
    { key: "code", label: "Document Code" },
    { key: "rev", label: "Revision No." },
    { key: "date", label: "Effectivity", render: (row) => formatDate(row.date) },
    { key: "title", label: "Title", render: (row) => <span className="truncate block max-w-xs">{row.title}</span> },
    { key: "createdBy", label: "Created By" },
    {
      key: "action",
      label: "Action",
      render: () => (
        <button className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200">
          Review
        </button>
      ),
    },
  ];

  const documentColumns = [
    { key: "code", label: "Document Code" },
    { key: "rev", label: "Revision No." },
    { key: "date", label: "Effectivity", render: (row) => formatDate(row.date) },
    { key: "title", label: "Title", render: (row) => <span className="truncate block max-w-xs">{row.title}</span> },
    { key: "createdBy", label: "Created By" },
    {
      key: "action",
      label: "Action",
      render: () => (
        <button className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200">
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

        <main className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <Greeting name={user?.firstname || "Document Controller"} />

          {/* Stat cards */}
          <div className="flex flex-wrap justify-between items-center mb-8">
            <div className="flex gap-4 flex-wrap mt-4">
              {/* Published Documents */}
              <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-48">
                <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Published Documents</div>
                  <div className="text-3xl font-bold text-gray-900">15</div>
                </div>
              </div>

              {/* Approved Documents */}
              <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-48">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Approved Documents</div>
                  <div className="text-3xl font-bold text-gray-900">8</div>
                </div>
              </div>

              {/* Returned Documents */}
              <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-48">
                <div className="w-12 h-12 bg-[#EB5B00] rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-1">Returned Documents</div>
                  <div className="text-3xl font-bold text-gray-900">3</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tables and Upcoming Deadlines */}
          <div className="grid grid-cols-4 gap-6 flex-1">
            <div className="col-span-3 space-y-6">
              {/* Templates Table */}
              <div className="bg-[#FBFBFB] shadow p-4 rounded w-full">
                <div className="px-3 py-1 bg-gray-50 flex justify-between items-center rounded-lg">
                  <div>
                    <h2 className="font-bold text-sm text-gray-800 tracking-wide">TEMPLATES</h2>
                    <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
                  </div>
                </div>
                <Table columns={templateColumns} data={templates} />
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="col-span-1 space-y-6">
              <UpcomingDeadlines deadlines={upcomingDeadlines} formatDate={formatDate} />
            </div>

            {/* Documents Table */}
            <div className="col-span-4 bg-[#FBFBFB] shadow p-4 rounded w-full">
              <div className="px-3 py-1 bg-gray-50 flex justify-between items-center rounded-lg">
                <div>
                  <h2 className="font-bold text-sm text-gray-800 tracking-wide">DOCUMENTS</h2>
                  <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
                </div>
              </div>
              <Table columns={documentColumns} data={documents} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
