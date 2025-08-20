import React, { useState } from "react";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import Dropdown from "../../components/dropdown";
import SearchBar from "../../components/searchBar"; 
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js";
import { CalendarDays, Clock, FileText, AlertCircle } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function DeanDashboard() {
  const user = useUser();

  function Table({ columns, data }) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-[#F4F6FF] border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="py-4 px-6 text-left font-semibold text-gray-700 tracking-wide"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, idx) => (
              <tr
                key={row.id || idx}
                className="hover:bg-[#F4F6FF]/50 transition-colors duration-150"
              >
                {columns.map((col) => (
                  <td key={col.key} className="py-4 px-6 text-gray-600">
                    {typeof col.render === "function"
                      ? col.render(row)
                      : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

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

  // still to be replaced with actual data fetching logic
  const documents = [
    { id: 1, code: "FM-SAA-002", rev: "00", date: "26-01-16", title: "Graphic Design Course Syllabi 26-27", createdBy: "Daniela Torres", status: "Approved" },
    { id: 2, code: "FM-SAA-002", rev: "00", date: "26-01-16", title: "Web Technologies Course Syllabi 26-27", createdBy: "Sarah Dela Cruz", status: "Approved" },
    { id: 3, code: "FM-SAA-002", rev: "00", date: "26-01-16", title: "Special Topics 1 Course Syllabi 26-27", createdBy: "Sarah Dela Cruz", status: "Approved" },
    { id: 4, code: "FM-SAA-002", rev: "00", date: "26-01-16", title: "AI Course Syllabi 26-27", createdBy: "Mark Gomez", status: "Approved" },
    { id: 5, code: "FM-SAA-002", rev: "00", date: "26-01-16", title: "Hospitality Course Syllabi 26-27", createdBy: "Jana Aquino", status: "Returned" },
  ];

  const pendingDocs = [
    { id: 1, code: "FM-SAA-003", rev: "00", date: "26-01-16", title: "3D Modeling and Animation Course Syllabi 26-27", createdBy: "Mae Santos" },
    { id: 2, code: "FM-SAA-001", rev: "00", date: "26-01-16", title: "Motion Graphics Design Course Syllabi 26-27", createdBy: "Mae Santos" },
    { id: 3, code: "FM-SAA-006", rev: "00", date: "26-01-16", title: "Special Topics 2 Course Syllabi 26-27", createdBy: "Jennie Zhang" },
    { id: 4, code: "FM-SAA-005", rev: "00", date: "26-01-16", title: "Current Trends 2 Course Syllabi 26-27", createdBy: "Candice Gomez" },
    { id: 5, code: "FM-SAA-008", rev: "00", date: "26-01-16", title: "Hospitality Course Syllabi 26-27", createdBy: "Stacey Dixon" },
    { id: 6, code: "FM-SAA-008", rev: "00", date: "26-01-16", title: "Illustration Course Syllabi 26-27", createdBy: "Nicole Bautista" },
    { id: 7, code: "FM-SAA-009", rev: "00", date: "26-01-16", title: "Animation Course Syllabi 26-27", createdBy: "Clint Garcia" },
  ];

  const documentColumns = [
    {
      key: 'code',
      label: 'Document Code',
      render: (row) => (
        <span className="font-mono text-xs text-gray-700">{row.code}</span>
      )
    },
    {
      key: 'rev',
      label: 'Revision No.'
    },
    {
      key: 'date',
      label: 'Effectivity'
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
      render: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.status === "Approved" 
            ? "bg-green-100 text-green-800" 
            : "bg-red-100 text-red-800"
        }`}>
          {row.status}
        </span>
      )
    }
  ];

  const pendingDocColumns = [
    {
      key: 'code',
      label: 'Document Code',
      render: (row) => (
        <span className="font-mono text-xs text-gray-700">{row.code}</span>
      )
    },
    {
      key: 'rev',
      label: 'Revision No.'
    },
    {
      key: 'date',
      label: 'Effectivity'
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
        <button className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline">
          Review
        </button>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Dashboard" />

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl ">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-[#003DA5] mt-5">Welcome back, Kyla!</h1>
            <p className="text-gray-600">Dashboard Overview</p>
          </div>

          {/* Stat cards and filters */}
          <div className="flex flex-wrap justify-between items-center mb-8">
            <div className="flex gap-4 flex-wrap mt-4">
              {/* Departments */}
              <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-48">
                <div className="w-12 h-12 bg-[#003DA5] rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="1.8em" height="1.8em" viewBox="0 0 24 24"><g fill="none"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"/><path fill="#fff" d="M12 3a3 3 0 0 0-1 5.83V11H8a3 3 0 0 0-3 3v1.17a3.001 3.001 0 1 0 2 0V14a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1.17a3.001 3.001 0 1 0 2 0V14a3 3 0 0 0-3-3h-3V8.83A3.001 3.001 0 0 0 12 3"/></g></svg>
                </div>
                <div>
                  <div className="text-black-600 text-base font-bold">Departments</div>
                  <div className="text-gray-500 text-xs">6 Department Heads</div>
                </div>
              </div>

              {/* Faculty */}
              <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-48">
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
              <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-48">
                <div className="w-12 h-12 bg-[#003DA5] rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="1.8em" height="1.8em" viewBox="0 0 256 256"><path fill="#fff" d="m213.66 66.34l-40-40A8 8 0 0 0 168 24H88a16 16 0 0 0-16 16v16H56a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h112a16 16 0 0 0 16-16v-16h16a16 16 0 0 0 16-16V72a8 8 0 0 0-2.34-5.66M136 192H88a8 8 0 0 1 0-16h48a8 8 0 0 1 0 16m0-32H88a8 8 0 0 1 0-16h48a8 8 0 0 1 0 16m64 24h-16v-80a8 8 0 0 0-2.34-5.66l-40-40A8 8 0 0 0 136 56H88V40h76.69L200 75.31Z"/></svg>
                </div>
                <div>
                  <div className="text-black-600 text-base font-bold">Documents</div>
                  <div className="text-gray-500 text-xs">3,564 Files</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              {/* School Filter */}
              <Dropdown
                options={["All", ...Object.keys(schoolIdentifiers)]}
                value={selectedSchool}
                onChange={setSelectedSchool}
                width="w-50"
              />

              {/* Sort Order */}
              <Dropdown
                options={["A-Z", "Z-A"]}
                value={sortOrder}
                onChange={setSortOrder}
                width="w-36"
              />

              {/* Search Bar */}
              <div className="flex-1 flex justify-start m-1">
                <div className="w-64">
                  <SearchBar
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search templates..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-4 gap-6 flex-1">
            <div className="col-span-3 space-y-6">
              {/* Documents Table */}
              <div className="bg-white shadow-sm rounded-lg border border-gray-100 overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-700">DOCUMENTS</h2>
                  <a href="#" className="text-blue-600 text-sm hover:text-blue-700 font-medium">View All</a>
                </div>
                <Table columns={documentColumns} data={documents} />
              </div>

              {/* Pending Documents Table */}
              <div className="bg-white shadow-sm rounded-lg border border-gray-100 overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-700">PENDING DOCUMENTS</h2>
                  <a href="#" className="text-blue-600 text-sm hover:text-blue-700 font-medium">View All</a>
                </div>
                <Table columns={pendingDocColumns} data={pendingDocs} />
              </div>
            </div>

            <div className="space-y-6">
              {/*  Upcoming Deadlines */}
              <div className="bg-white shadow-sm rounded-lg border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      📌
                    </div>
                    <h3 className="font-semibold text-sm text-gray-800">Upcoming Deadlines</h3>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  
                </div>
              </div>

              {/* Doughnut Chart */}
            



            </div>
          </div>
        </main>
      </div>
    </div>
  );
}