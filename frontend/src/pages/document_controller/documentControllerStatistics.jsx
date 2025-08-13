import { useState, useEffect } from 'react';
import StatCard from '../../components/statcard';
import Header from '../../layout/header';
import Sidebar from '../../layout/sidebar';
import Dropdown from '../../components/dropdown';
import Table from '../../components/table';
import SearchBar from '../../components/searchbar'; 
import { Bar, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function DocumentControllerStatistics() {
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
  const [sortOrder, setSortOrder] = useState('Recent');
  const [search, setSearch] = useState('');

  const tableColumns = [
    { key: "name", label: "Department Name" },
    { key: "head", label: "Department Head" },
    { key: "submitted", label: "No. of Submitted Documents" },
    { key: "assigned", label: "Assigned Documents" },
    { key: "pending", label: "Pending Submissions" }
  ];

  // static data for table and bar chart - still to be replaced with actual data
  const tableData = [
    { name: "BS IT/MMA", head: "Sarah Dela Cruz", submitted: 106, assigned: 89, pending: 10 },
    { name: "BS CS", head: "John Reyes", submitted: 92, assigned: 80, pending: 8 },
    { name: "BS IS", head: "Maria Lopez", submitted: 74, assigned: 68, pending: 6 },
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

  return (
    <div className="min-h-screen bg-gray-200">
      <Header user={user} />
      <div className="flex">
        {/* Sidebar */}
        <Sidebar user={user} />
        {/* Main content */}
        <main className="flex-1 mt-16 px-6 pb-8">
          {/* Stats summary */}
          <div className="flex flex-wrap justify-between items-center mb-6">
            <div className="flex gap-4 flex-wrap">
              <StatCard title="Schools" value={4} />
              <StatCard title="Departments" value={8} />
              <StatCard title="Pending" value={12} />
              <StatCard title="Completed" value={106} />
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
                options={["Recent", "A-Z", "Z-A"]}
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
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-sm font-semibold tracking-widest text-gray-800 uppercase mb-2"> 
                Department Comparison Chart
              </h2>
              <div className="w-30 h-0.5 bg-yellow-400 mb-4 rounded" />
              <div className="h-80">
                <Bar data={barData} options={barOptions} />
              </div>
            </div>

            {/* Table & pie chart */}
            <div className="flex gap-6">
              {/* Table */}
              <div className="bg-white shadow p-4 rounded max-w-5xl w-full">
                <h2 className="text-sm font-semibold tracking-widest text-gray-800 uppercase mb-2">
                  Department Performance Overview
                </h2>
                <div className="w-30 h-0.5 bg-yellow-400 mb-4 rounded" />
                <Table columns={tableColumns} data={tableData} />
              </div>

              {/* Pie chart */}
             

             
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}