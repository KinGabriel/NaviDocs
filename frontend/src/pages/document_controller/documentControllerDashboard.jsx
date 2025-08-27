import React from "react";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import Table from "../../components/table";
import StatusBadge from "../../components/statusBadge";
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

  // Example data
  const documents = [
    { id: 1, code: "DC-001", rev: "01", date: "2025-08-15", title: "Course Syllabi 2025", createdBy: "Alice Ramos", status: "Published" },
    { id: 2, code: "DC-002", rev: "02", date: "2025-07-20", title: "Web Technologies Curriculum", createdBy: "John Dela Cruz", status: "Approved" },
    { id: 3, code: "DC-003", rev: "01", date: "2025-06-30", title: "Graphic Design Curriculum", createdBy: "Maria Lopez", status: "Returned" },
  ];

  const documentColumns = [
    { key: "code", label: "Document Code", render: (row) => <span className="text-xs text-gray-700">{row.code}</span> },
    { key: "rev", label: "Revision No." },
    { key: "date", label: "Effectivity", render: (row) => formatDate(row.date) },
    { key: "title", label: "Title", render: (row) => <span className="max-w-xs truncate block">{row.title}</span> },
    { key: "createdBy", label: "Created By" },
    { key: "action", label: "Action", render: (row) => <button className="bg-blue-100 text-blue-700 px-4 py-1 rounded text-xs font-semibold hover:bg-blue-200">Review</button> },
  ];

  const upcomingDeadlines = [
    { id: 1, title: "Syllabi Submission", date: "2025-08-10", priority: "Overdue", department: "BS Computer Science" },
    { id: 2, title: "Curriculum Review", date: "2025-08-21", priority: "Due Today", department: "BS Information Technology" },
    { id: 3, title: "Budget Approval", date: "2025-08-31", priority: "Due This Week", department: "Administration" },
    { id: 4, title: "Field Trip Agenda", date: "2025-09-23", priority: "Upcoming", department: "BS Information Technology" },
  ];

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Dashboard" />

        <main className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <Greeting name={user?.firstname || "Document Controller"} />

          {/* Stat Cards */}
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
                  <div className="text-3xl font-bold text-gray-900">12</div>
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
              {/* Published Documents Table */}
              <div className="bg-[#FBFBFB] shadow p-4 rounded w-full">
                <div className="px-3 py-1 bg-gray-50 flex justify-between items-center rounded-lg">
                  <div>
                    <h2 className="font-bold text-sm text-gray-800 tracking-wide">PUBLISHED DOCUMENTS</h2>
                    <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
                  </div>
                  <button className="mr-4 mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F]">
                    View All
                  </button>
                </div>
                <Table columns={documentColumns} data={documents} />
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="col-span-1 space-y-6">
              <UpcomingDeadlines deadlines={upcomingDeadlines} formatDate={formatDate} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
