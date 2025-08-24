import React, { useEffect, useState } from "react";
import { fetchDashboardInfoAPI } from "../../api/adminAPI";
import useUser from '../../hooks/useUser';
import Header from '../../layout/header'; 
import Sidebar from '../../layout/sidebar'; 
import Greeting from '../../components/greeting';
import StatCard from '../../components/statcard';
import Table from '../../components/table';
import Loader from '../../components/loader';

export default function AdminDashboard() {
  const user = useUser();
  const [dashboardInfo, setDashboardInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardInfo = async () => {
      try {
        const data = await fetchDashboardInfoAPI();
        setDashboardInfo(data);
      } catch (err) {
        setDashboardInfo(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardInfo();
  }, []);

    // loading animation
 if (loading) {
  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <div className="flex-1 flex items-center justify-center">
            <Loader message="Loading..." />
          </div>
        </div>
      </div>
    </div>
  );
}

  // error state
  if (!dashboardInfo) {
  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <h2 className="text-xl font-semibold text-red-600 mb-2">Unable to load dashboard</h2>
              <p className="text-gray-500">Please check your connection or try again later.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

  // Stats to display on the dashboard
  const stats = [
    { title: 'School Dean', value: dashboardInfo.dean },
    { title: 'Department Head', value: dashboardInfo.deptHead },
    { title: 'Faculty Members', value: dashboardInfo.faculty },
    { title: 'Total Users', value: dashboardInfo.total },
  ];


  // Define columns for recent users
  const recentUserColumns = [
    { key: "email", label: "Email" },
    {
      key: "department",
      label: "Department",
      render: (row) => row.role?.department || "N/A",
    },
    {
      key: "school",
      label: "School",
      render: (row) => row.role?.school || "N/A",
    },
    {
      key: "role",
      label: "Role",
      render: (row) => row.role?.name || "N/A",
    },
    {
      key: "createdAt",
      label: "Created At",
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      {/* sidebar & content area */}
      <div className="flex flex-1">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
        <main className="p-1 flex-1 overflow-y-auto">
          <Greeting name={user?.firstname || 'Admin'} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {stats.map((stat) => (
              <StatCard key={stat.title} title={stat.title} value={stat.value} />
            ))}
          </div>

      {/* table */}
          <div className="mt-10 bg-[#f7faff] rounded-t-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold tracking-widest text-gray-800 uppercase">
                Recently Added Users
              </h2>
              <div className="w-30 h-0.5 bg-yellow-400 mt-1 rounded" />
            </div>
            <button className="bg-[#003DA5] text-white text-sm px-4 py-2 h-9 w-30 rounded-md hover:bg-[#002B7F]">
              View All
            </button>
          </div>
        </div>
            <div className="-mt-2">
              <Table columns={recentUserColumns} data={dashboardInfo.recentUsers} />
            </div>
  
        </main>
      </div>
      </div>
    </div>
  );
}
