import { useState, useEffect } from 'react';
import Header from '../../layout/header';
import Sidebar from '../../layout/sidebar';
import Dropdown from '../../components/dropdown';
import Table from '../../components/table';
import SearchBar from '../../components/searchBar'; 
import { Bar, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function DepartmentHeadStatistics() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

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

  const tableColumns = [
    { key: "name", label: "Department" },
    { key: "head", label: "Department Head" },
    { key: "submitted", label: "No. of Submitted Documents" },
    { key: "assigned", label: "Assigned Documents" },
    { key: "pending", label: "Pending Submissions" }
  ];

  // static data for table, pie and bar chart - still to be replaced with actual data
  const tableData = [
    { name: "BS IT/MMA", head: "Sarah Dela Cruz", submitted: 106, assigned: 89, pending: 10 },
    { name: "BS CS", head: "John Reyes", submitted: 92, assigned: 80, pending: 8 },
    { name: "BS HM", head: "Maria Lopez", submitted: 74, assigned: 68, pending: 6 },
    { name: "BS CS", head: "John Reyes", submitted: 92, assigned: 80, pending: 8 },
    { name: "BS HM", head: "Maria Lopez", submitted: 74, assigned: 68, pending: 6 },
    { name: "BS HM", head: "Maria Lopez", submitted: 74, assigned: 68, pending: 6 },
  ];

  const barData = {
    labels: ["IT", "CS", "FINMAN", "ACCT", "MMA", "HM", "ENTREP", "BA"],
    datasets: [
      {
        label: "Submission %",
        data: [80, 65, 40, 70, 90, 45, 50, 60],
        backgroundColor: "#1E40AF",
        borderRadius: 5,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false }, 
      tooltip: { enabled: true } 
    },
    scales: { 
      y: { 
        beginAtZero: true, 
        max: 100, 
        ticks: { stepSize: 20 } 
      } 
    },
  };

  const departmentData = [
    { name: "1ST YEAR", onTime: 100, late: 35, total: 135 },
    { name: "2ND YEAR", onTime: 67, late: 35, total: 102 },
    { name: "3RD YEAR", onTime: 85, late: 7, total: 92 },
    { name: "4TH YEAR", onTime: 68, late: 6, total: 74 },
  ];

  const [currentDeptIndex, setCurrentDeptIndex] = useState(0);
  const currentDept = departmentData[currentDeptIndex];

  const nextDepartment = () => {
    setCurrentDeptIndex((prev) => (prev + 1) % departmentData.length);
  };

  const prevDepartment = () => {
    setCurrentDeptIndex((prev) => (prev - 1 + departmentData.length) % departmentData.length);
  };

  const pieData = {
    labels: ['On Time', 'Late'],
    datasets: [
      {
        data: [currentDept.onTime, currentDept.late],
        backgroundColor: ['#3B82F6', '#E53737'], // Blue for on time, red for late
        borderWidth: 0,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            return `${label}: ${value}`;
          },
        },
      },
    },
    cutout: '50%', // Creates the doughnut effect
  };

  return (
    <div className="min-h-screen bg-gray-200">
      <Header user={user} />
      <div className="flex">
        {/* Sidebar */}
        <Sidebar user={user} />
        {/* Main content */}
        <main className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          {/* Stat cards */}
          <div className="flex flex-wrap justify-between items-center mt-6 mb-8">
            <div className="flex gap-4 flex-wrap">
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

            <div className="flex gap-2">
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

          {/* Charts */}
          <div className="space-y-6">
            {/* Bar chart */}
            <div className="bg-[#FBFBFB]  p-4 rounded shadow">
              <h2 className="text-sm font-semibold tracking-widest text-gray-800 uppercase mb-2"> 
               Faculty Submission Performance
              </h2>
              <div className="w-30 h-0.5 bg-yellow-400 mb-4 rounded" />
              <div className="h-80">
                <Bar data={barData} options={barOptions} />
              </div>
            </div>

            {/* Table & pie chart */}
            <div className="flex gap-6 mt-6">
              {/* Table */}
              <div className="bg-[#FBFBFB] shadow p-4 rounded max-w-5xl w-full ">
                <h2 className="text-sm font-semibold tracking-widest text-gray-800 uppercase mb-2">
                 Faculty Performance Overview
                </h2>
                <div className="w-30 h-0.5 bg-yellow-400 mb-4 rounded" />
                <Table columns={tableColumns} data={tableData} />
              </div>

              {/* Pie chart */}
              <div className="bg-[#FBFBFB] shadow p-4 rounded w-120 flex flex-col">
                <h2 className="text-sm font-semibold tracking-widest text-gray-800 uppercase mb-8">
                  YEAR LEVEL DOCUMENT SUMMARY
                </h2>
                
                {/* Department navigations */}
                <div className="flex items-center justify-between mb-4">
                  <button 
                    onClick={prevDepartment}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-800">{currentDept.name}</div>
                  </div>
                  
                  <button 
                    onClick={nextDepartment}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 relative">
                  <div className="h-64 relative">
                    <Doughnut data={pieData} options={pieOptions} />
                    {/* total submissions */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-9">
                      <div className="text-2xl font-bold text-gray-800">{currentDept.total}</div>
                      <div className="text-sm text-gray-500">Total</div>
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