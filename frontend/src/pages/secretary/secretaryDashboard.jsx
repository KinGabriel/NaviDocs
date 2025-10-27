import React from "react";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import Table from "../../components/table";
import Greeting from "../../components/greeting";
import UpcomingDeadlines from "../../components/upcomingDeadlines";
import { CalendarClock, CalendarCheck, CalendarX } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
 { id: 1, title: "Template for Research Proposal", createdBy: "Admin User", deanStatus: "Yes"},
    { id: 2, title: "Template for Research Proposal", createdBy: "Admin User", deanStatus: "Yes"},
    { id: 3, title: "Template for Research Proposal", createdBy: "Admin User", deanStatus: "No" },
        { id: 3, title: "Template for Research Proposal", createdBy: "Admin User", deanStatus: "No" },
  ];

  const recentlySubmittedTemplates = [
    { id: 1, code: "DOC-001", rev: "00", date: "2025-01-21", title: "BSCS Capstone Guidelines", createdBy: "Daniel Cruz" },
    { id: 2, code: "DOC-002", rev: "01", date: "2025-02-14", title: "Student Handbook 2025", createdBy: "Sarah Dela Cruz" },
    { id: 3, code: "DOC-003", rev: "00", date: "2025-03-09", title: "Faculty Manual", createdBy: "Mae Santos" },
    { id: 3, code: "DOC-003", rev: "00", date: "2025-03-09", title: "Faculty Manual", createdBy: "Mae Santos" },
    { id: 3, code: "DOC-003", rev: "00", date: "2025-03-09", title: "Faculty Manual", createdBy: "Mae Santos" },
  ];

  const requestedTemplatesColumn = [
     { key: "title", label: "Title" },
  { key: "createdBy", label: "Created By" },
  {
    key: "approvalStatus",
    label: "Approval Status",
    render: (row) => (
      <div className="flex flex-col text-xs font-medium text-gray-700 space-y-1">
        {/* Dean Status */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              row.deanStatus === "Yes"
                ? "bg-green-500"
                : row.deanStatus === "No"
                ? "bg-red-500"
                : "bg-gray-400"
            }`}
          ></span>
          <span>Dean</span>
        </div>
      </div>
    ),
  },
  {
    key: "action",
    label: "Action",
    render: () => (
      <button
        onClick={() => navigate("/document-controller/templates")}
        className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200"
      >
        Review
      </button>
    ),
  },
];

    const recentlySubmittedTemplatesColumn = [
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
      onClick={() => navigate("/document-controller/templates")}
      className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200"
      >
        Review
      </button>
      ),
    },
  ];

  const upcomingDeadlines = [
    { id: 1, title: "Template Review", date: "2025-08-01", priority: "Overdue", department: "BS Computer Science" },
    { id: 2, title: "Faculty Performance Reports", date: "2025-08-21", priority: "Due Today", department: "BS Information Technology" },
    { id: 3, title: "Budget Allocation Review", date: "2025-08-31", priority: "Due This Week", department: "Administration" },
    { id: 4, title: "Field Trip Agenda Review", date: "2025-09-23", priority: "Upcoming", department: "BS Information Technology" },
  ];

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Dashboard" />

        <main className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <Greeting name={user?.firstname || "Secretary"} />

       
                 {/* Stat cards */}
       <div className="flex flex-wrap justify-between items-center mb-8">
         <div className="flex gap-4 flex-wrap mt-4">
           
           {/* Upcoming Deadlines */}
           <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-48">
             <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
               <CalendarClock className="h-6 w-6 text-white" />
             </div>
             <div>
               <div className="text-sm font-medium text-gray-600 mb-1">Upcoming Deadlines</div>
               <div className="text-3xl font-bold text-gray-900">1</div>
             </div>
           </div>
       
           {/* Due Today */}
           <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-48">
             <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
               <CalendarCheck className="h-6 w-6 text-white" />
             </div>
             <div>
               <div className="text-sm font-medium text-gray-600 mb-1">Due Today</div>
               <div className="text-3xl font-bold text-gray-900">1</div>
             </div>
           </div>
       
           {/* Overdue Deadlines */}
           <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-48">
             <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
               <CalendarX className="h-6 w-6 text-white" />
             </div>
             <div>
               <div className="text-sm font-medium text-gray-600 mb-1">Overdue Deadlines</div>
               <div className="text-3xl font-bold text-gray-900">1</div>
             </div>
           </div>
       
         </div>
       </div>

          {/* Tables and Upcoming Deadlines */}
          <div className="grid grid-cols-4 gap-6 flex-1">
            <div className="col-span-3 space-y-6">
              {/* Requested Templates Table */}
              <div className="bg-[#FBFBFB] shadow p-4 rounded w-full">
                <div className="px-3 py-1 bg-gray-50 flex justify-between items-center rounded-lg">
                  <div>
                    <h2 className="font-bold text-sm text-gray-800 tracking-wide">REQUESTED TEMPLATES</h2>
                    <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
                  </div>
                  <button
                  onClick={() => navigate("/secretary/templates")}
                  className="mr-4 mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F]"
                  >
                    View All
                  </button>
                </div>
                <Table columns={requestedTemplatesColumn} data={requestedTemplates} />
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="col-span-1 space-y-6">
              <UpcomingDeadlines deadlines={upcomingDeadlines} formatDate={formatDate} />
            </div>
             {/* Recently Submitted Templates Table */}
                        <div className="col-span-4 bg-[#FBFBFB] shadow p-4 rounded w-full">
                          <div className="px-3 py-1 bg-gray-50 flex justify-between items-center rounded-lg">
                            <div>
                              <h2 className="font-bold text-sm text-gray-800 tracking-wide">RECENTLY SUBMITTED TEMPLATES</h2>
                              <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
                            </div>
                          </div>
                          <Table columns={recentlySubmittedTemplatesColumn} data={recentlySubmittedTemplates} />
                        </div>
          </div>
        </main>
      </div>
    </div>
  );
}
