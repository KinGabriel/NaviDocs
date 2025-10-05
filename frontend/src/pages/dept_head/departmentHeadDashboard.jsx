import React, { useState } from "react";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import StatusBadge from "../../components/statusBadge";
import Table from "../../components/table";
import Greeting from "../../components/greeting";
import UpcomingDeadlines from "../../components/upcomingDeadlines";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function DepartmentHeadDashboard() {
  const user = useUser();

  // School identifiers
  const schoolIdentifiers = {
    'University Wide': 'VAA',
    'SAMCIS': 'SMI', 
    'STELA': 'STL',
  };

  // Filtering and sorting states
  const [selectedSchool, setSelectedSchool] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortOrder, setSortOrder] = useState('Sort by');
  const [search, setSearch] = useState('');

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
  const documents = [
    { id: 1, code: "FM-SAA-002", rev: "00", date: "2026-03-16", title: "Graphic Design Course Syllabi 26-27", createdBy: "Daniela Torres", status: "Approved" },
    { id: 2, code: "FM-SAA-002", rev: "00", date: "2026-01-16", title: "Web Technologies Course Syllabi 26-27", createdBy: "Sarah Dela Cruz", status: "Approved" },
    { id: 3, code: "FM-SAA-002", rev: "00", date: "2026-11-23", title: "Special Topics 1 Course Syllabi 26-27", createdBy: "Sarah Dela Cruz", status: "Approved" },
    { id: 4, code: "FM-SAA-002", rev: "00", date: "2026-01-16", title: "AI Course Syllabi 26-27", createdBy: "Mark Gomez", status: "Approved" },
    { id: 5, code: "FM-SAA-002", rev: "00", date: "2026-05-10", title: "Hospitality Course Syllabi 26-27", createdBy: "Jana Aquino", status: "Returned" },
  ];

  const pendingDocs = [
    { id: 1, code: "FM-SAA-003", rev: "00", date: "2025-01-16", title: "3D Modeling and Animation Course Syllabi 26-27", createdBy: "Mae Santos" },
    { id: 2, code: "FM-SAA-001", rev: "00", date: "2025-12-17", title: "Motion Graphics Design Course Syllabi 26-27", createdBy: "Mae Santos" },
    { id: 3, code: "FM-SAA-006", rev: "00", date: "2025-01-26", title: "Special Topics 2 Course Syllabi 26-27", createdBy: "Jennie Zhang" },
    { id: 4, code: "FM-SAA-005", rev: "00", date: "2025-02-12", title: "Current Trends 2 Course Syllabi 26-27", createdBy: "Candice Gomez" },
    { id: 5, code: "FM-SAA-008", rev: "00", date: "2025-04-06", title: "Hospitality Course Syllabi 26-27", createdBy: "Stacey Dixon" },
  
  ];

   const documentColumns = [
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
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge type={row.status} />
    }
  ];

  const pendingDocColumns = [
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

  const chartData = {
    labels: [
      'Submission Rate','Approved Documents','Assigned Documents','Pending Documents','Returned Documents'
    ],
    datasets: [
      {
        data: [56, 36, 5, 7, 15, 5],
        backgroundColor: ['#3B82F6','#10B981', '#6B7280' ,'#F59E0B', '#F97316'],
        borderWidth: 0,
        cutout: '60%',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
  };

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
              {/* Faculty */}
              <div className="bg-[#FBFBFB]  p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-48">
                <div className="w-12 h-12 bg-[#003DA5] rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
                <div>
                  <div className="text-black-600 text-base font-bold">Faculty</div>
                  <div className="text-gray-500 text-xs">106 Members</div>
                </div>
              </div>

               {/* Documents */}
              <div className="bg-[#FBFBFB]  p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-48">
                <div className="w-12 h-12 bg-[#003DA5] rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="1.8em" height="1.8em" viewBox="0 0 256 256"><path fill="#fff" d="m213.66 66.34l-40-40A8 8 0 0 0 168 24H88a16 16 0 0 0-16 16v16H56a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h112a16 16 0 0 0 16-16v-16h16a16 16 0 0 0 16-16V72a8 8 0 0 0-2.34-5.66M136 192H88a8 8 0 0 1 0-16h48a8 8 0 0 1 0 16m0-32H88a8 8 0 0 1 0-16h48a8 8 0 0 1 0 16m64 24h-16v-80a8 8 0 0 0-2.34-5.66l-40-40A8 8 0 0 0 136 56H88V40h76.69L200 75.31Z"/></svg>
                </div>
                <div>
                  <div className="text-black-600 text-base font-bold">Documents</div>
                  <div className="text-gray-500 text-xs">3,564 Files</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-4 gap-6 flex-1">
            <div className="col-span-3 space-y-6">
              {/* Documents Table */}
              <div className="bg-[#FBFBFB] shadow p-4 rounded max-w-6xl w-full">
                <div className="px-3 py-1 bg-gray-50 flex justify-between items-center rounded-lg">
                  <div>
                    <h2 className="font-bold text-sm text-gray-800 tracking-wide">DOCUMENTS</h2>
                   <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
                  </div>
                  <button className=" mr-4 mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F] ">
                    View All
                  </button>
                </div>
                <Table columns={documentColumns} data={documents} />
              </div>

              {/* Pending Documents Table */}
              <div className="bg-[#FBFBFB] shadow p-4 rounded max-w-6xl w-full">
                <div className="px-3 py-1 bg-gray-50 flex justify-between items-center rounded-lg">
                  <div>
                    <h2 className="font-bold text-sm text-gray-800 tracking-wide">PENDING DOCUMENTS</h2>
                    <div className="w-16 h-1 bg-yellow-400 mt-1 mb-6 rounded" />
                  </div>
                  <button className="mr-4 mb-2 bg-[#003DA5] text-white text-sm px-4 py-1 rounded-md hover:bg-[#002B7F]">
                    View All
                  </button>
                </div>
                <Table columns={pendingDocColumns} data={pendingDocs} />
              </div>
            </div>

        {/* Upcoming Deadlines */}
         <div className="col-span-1 space-y-6">
          <UpcomingDeadlines deadlines={upcomingDeadlines} formatDate={formatDate} /> 
  
            {/* Documents Summary Doughnut Chart - all placeholders */}
              <div className="bg-white shadow-sm rounded-lg border border-gray-100">
                <div className="bg-[#FBFBFB] px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-sm text-gray-800">DOCUMENTS SUMMARY</h3>
                </div>
                <div className="p-6 h-107">
                  <div className="relative h-48 mb-4">
                    <Doughnut data={chartData} options={chartOptions} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-gray-600">Submission Rate</span>
                      </div>
                      <span className="font-medium text-gray-800">56</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-gray-600">Approved Documents</span>
                      </div>
                      <span className="font-medium text-gray-800">36</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                        <span className="text-gray-600">Assigned Documents</span>
                      </div>
                      <span className="font-medium text-gray-800">5</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-gray-600">Pending Documents</span>
                      </div>
                      <span className="font-medium text-gray-800">7</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-gray-600">Returned Documents</span>
                      </div>
                      <span className="font-medium text-gray-800">5</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}