import React, { useState } from "react";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import Table from "../../components/table";
import StatusBadge from "../../components/statusBadge";
import { CalendarClock, CalendarCheck, CalendarX } from "lucide-react";
import Greeting from "../../components/greeting";
import UpcomingDeadlines from "../../components/upcomingDeadlines";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function FacultyDashboard() {
  const user = useUser();

  function formatDate(dateValue) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

  // still to be replaced with actual data fetching logic
  // Sample Requested Templates
const requestedTemplates = [
  { id: 1, title: "Graphic Design Course Syllabi 26-27", createdBy: "Daniela Torres", deanStatus: "Yes", secStatus: "No", headStatus: "Yes" },
  { id: 2, title: "Multimedia Design Course Syllabi 26-27", createdBy: "Mae Santos", deanStatus: "No", secStatus: "No", headStatus: "Yes" },
  { id: 3, title: "Photography Course Syllabi 26-27", createdBy: "Jennie Zhang", deanStatus: "Yes", secStatus: "Yes", headStatus: "Yes" },
  { id: 4, title: "Art Direction Course Syllabi 26-27", createdBy: "Candice Gomez", deanStatus: "No", secStatus: "Yes", headStatus: "No" },
  { id: 5, title: "Animation Course Syllabi 26-27", createdBy: "Stacey Dixon", deanStatus: "Yes", secStatus: "Yes", headStatus: "No" },
];

// Requested Templates Table Columns
const requestedTemplatesColumn = [
  {
    key: "title",
    label: "Title",
    render: (row) => <span className="max-w-xs truncate block">{row.title}</span>,
  },
  {
    key: "createdBy",
    label: "Created By",
  },
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

        {/* Secretary Status */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              row.secStatus === "Yes"
                ? "bg-green-500"
                : row.secStatus === "No"
                ? "bg-red-500"
                : "bg-gray-400"
            }`}
          ></span>
          <span>Secretary</span>
        </div>

        {/* Department Head Status */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              row.headStatus === "Yes"
                ? "bg-green-500"
                : row.headStatus === "No"
                ? "bg-red-500"
                : "bg-gray-400"
            }`}
          ></span>
          <span>Dept. Head</span>
        </div>
      </div>
    ),
  },
  {
    key: "action",
    label: "Action",
    render: (row) => (
      <button className="bg-blue-100 text-blue-700 px-4 py-1 rounded text-xs font-semibold hover:bg-blue-200">
        Review
      </button>
    ),
  },
];

  
    const recentlySubmittedTemplates = [
      { id: 1, code: "FM-SAA-003", rev: "00", date: "2025-01-16", title: "3D Modeling and Animation Course Syllabi 26-27", createdBy: "Mae Santos" },
      { id: 2, code: "FM-SAA-001", rev: "00", date: "2025-12-17", title: "Motion Graphics Design Course Syllabi 26-27", createdBy: "Mae Santos" },
      { id: 3, code: "FM-SAA-006", rev: "00", date: "2025-01-26", title: "Special Topics 2 Course Syllabi 26-27", createdBy: "Jennie Zhang" },
      { id: 4, code: "FM-SAA-005", rev: "00", date: "2025-02-12", title: "Current Trends 2 Course Syllabi 26-27", createdBy: "Candice Gomez" },
      { id: 5, code: "FM-SAA-008", rev: "00", date: "2025-04-06", title: "Hospitality Course Syllabi 26-27", createdBy: "Stacey Dixon" },
    ];
  
    const recentlySubmittedTemplatesColumns = [
      {
        key: 'code',
        label: 'Document Code',
        render: (row) => (
          <span className="text-xs text-gray-700">{row.code}</span>
        )
      },
      {
        key: 'rev',
        label: 'Revision No.'
      },
      {
        key: 'date',
        label: 'Effectivity',
        render: (row) => formatDate(row.date) 
      },
      {
        key: 'title',
        label: 'Title',
        render: (row) => (
          <span className="max-w-xs truncate block">{row.title}</span>
        )
      },
      {
        key: 'createdBy',
        label: 'Created By'
      },
      {
        key: 'action',
        label: 'Action',
        render: (row) => (
          <button className="bg-blue-100 text-blue-700 px-4 py-1 rounded text-xs font-semibold hover:bg-blue-200">
            Review
          </button>
        )
      }
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
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Dashboard" />

        {/* Main Content */}
         <main className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl ">
          <Greeting name={user?.firstname || 'Department Head'} />

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
                <button className="mr-4 mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F]">
                View All
                </button>
            </div>
            <Table columns={requestedTemplatesColumn} data={requestedTemplates} />
          </div>
        </div>

        {/* Upcoming Deadlines*/}
            <div className="col-span-1 space-y-6">
                <UpcomingDeadlines deadlines={upcomingDeadlines} formatDate={formatDate} />
            </div>

        {/* Rececently Submitted Templates Table */}
        <div className="col-span-4 bg-[#FBFBFB] shadow p-4 rounded w-full">
            <div className="px-3 py-1 bg-gray-50 flex justify-between items-center rounded-lg">
            <div>
                <h2 className="font-bold text-sm text-gray-800 tracking-wide">RECENTLY SUBMITTED TEMPLATES</h2>
                <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
            </div>
            <button className="mr-12 mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F]">
                View All
            </button>
            </div>
            <Table columns={recentlySubmittedTemplatesColumns} data={recentlySubmittedTemplates} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};