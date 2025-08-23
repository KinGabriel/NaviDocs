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
  const [sortOrder, setSortOrder] = useState('Sort by');
  const [search, setSearch] = useState('');

  // replace with the actual data fetching logic
  const tableColumns = [
    { key: "faculty", label: "Faculty Member" },
    { key: "submitted", label: "Submitted Documents" },
    { key: "approved", label: "Approved Documents" },
    { key: "pending", label: "Pending Review" },
    { key: "completionRate", label: "Completion Rate (%)" }
  ];

  const tableData = [
    { faculty: "Prof. Mark Santos", submitted: 25, approved: 22, pending: 2, completionRate: "88%" },
    { faculty: "Prof. Anna Rivera", submitted: 18, approved: 17, pending: 1, completionRate: "94%" },
    { faculty: "Prof. Daniel Cruz", submitted: 20, approved: 19, pending: 0, completionRate: "95%" },
    { faculty: "Prof. Lea Gonzales", submitted: 15, approved: 12, pending: 3, completionRate: "80%" },
    { faculty: "Prof. Daniel Cruz", submitted: 20, approved: 19, pending: 0, completionRate: "25%" },
    { faculty: "Prof. Lea Gonzales", submitted: 15, approved: 12, pending: 3, completionRate: "80%" }
  ];

  const barData = {
  labels: ["Prof. Mark Santos", "Prof. Anna Rivera", "Prof. Daniel Cruz", "Prof. Lea Gonzales", "Prof. Mark Santos", "Prof. Anna Rivera", "Prof. Daniel Cruz", "Prof. Lea Gonzales "],
  datasets: [
    {
      label: "Submission %",
      data: [88, 94, 95, 80, 48, 74, 95, 84], // completion/submission percentages per faculty
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
    tooltip: {
      callbacks: {
        label: (context) => `${context.raw}% Submitted`
      }
    }
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
  { 
    name: "1ST YEAR", 
    data: [56, 36, 5, 7, 5] // Submission Rate, Approved, Assigned, Pending, Returned
  },
  { 
    name: "2ND YEAR", 
    data: [40, 30, 10, 12, 8] 
  },
  { 
    name: "3RD YEAR", 
    data: [70, 20, 15, 5, 10] 
  },
  { 
    name: "4TH YEAR", 
    data: [50, 25, 20, 10, 15] 
  },
];

const [currentDeptIndex, setCurrentDeptIndex] = useState(0);
const currentDept = departmentData[currentDeptIndex];

const nextDepartment = () => 
  setCurrentDeptIndex((prev) => (prev + 1) % departmentData.length);

const prevDepartment = () => 
  setCurrentDeptIndex((prev) => (prev - 1 + departmentData.length) % departmentData.length);

const chartData = {
  labels: [
    "Submission Rate", 
    "Approved Documents", 
    "Assigned Documents", 
    "Pending Documents", 
    "Returned Documents"
  ],
  datasets: [
    {
      data: currentDept.data, 
      backgroundColor: ["#3B82F6","#10B981","#6B7280","#F59E0B","#F97316"],
      borderWidth: 0,
    },
  ],
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
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
              <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-48">
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
              <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-48">
                <div className="w-12 h-12 bg-[#003DA5] rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="1.8em" height="1.8em" viewBox="0 0 256 256"><path fill="#fff" d="m213.66 66.34l-40-40A8 8 0 0 0 168 24H88a16 16 0 0 0-16 16v16H56a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h112a16 16 0 0 0 16-16v-16h16a16 16 0 0 0 16-16V72a8 8 0 0 0-2.34-5.66M136 192H88a8 8 0 0 1 0-16h48a8 8 0 0 1 0 16m0-32H88a8 8 0 0 1 0-16h48a8 8 0 0 1 0 16m64 24h-16v-80a8 8 0 0 0-2.34-5.66l-40-40A8 8 0 0 0 136 56H88V40h76.69L200 75.31Z"/></svg>
                </div>
                <div>
                  <div className="text-black-600 text-base font-bold">Documents</div>
                  <div className="text-gray-500 text-xs">3,564 Files</div>
                </div>
              </div>

              {/* Late Submissions */}
              <div className="bg-[#FBFBFB] p-4 rounded-lg shadow-sm flex items-center gap-3 min-w-48">
                <div className="w-12 h-12 bg-[#E53737] rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <div className="text-black-600 text-base font-bold">Late Submissions</div>
                  <div className="text-gray-500 text-xs">23 Overdue</div>
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
            <div className="bg-[#FBFBFB] p-4 rounded shadow">
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
                  <button onClick={prevDepartment} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-800">{currentDept.name}</div>
                  </div>
                  <button onClick={nextDepartment} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <div className="relative h-48 mb-4">
                  <Doughnut data={chartData} options={chartOptions} />
                </div>

                {/* Legend values */}
            <div className="space-y-3">
              {chartData.labels.map((label, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: chartData.datasets[0].backgroundColor[index] }}
                    ></div>
                    <span className="text-gray-600">{label}</span>
                  </div>
                  <span className="font-medium text-gray-800">
                    {chartData.datasets[0].data[index]}
                  </span>
                </div>
              ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}