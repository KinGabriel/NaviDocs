import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDashboardInfoAPI } from "../../api/adminAPI";
import useUser from "../../hooks/useUser";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import Greeting from "../../components/greeting";
import StatCard from "../../components/cards/statcard";
import Table from "../../components/table";
import Loader from "../../components/loader";

export default function AdminDashboard() {
  const user = useUser();
  const navigate = useNavigate();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-col lg:flex-row flex-1">
          <Sidebar user={user} active="Dashboard" />
          <div className="flex-1 flex flex-col bg-white lg:shadow pt-1 pb-4 px-4 sm:px-6 lg:px-8 mx-0 lg:mx-6 mt-4 lg:mt-8 rounded-none lg:rounded-xl w-full max-w-full">
            <div className="flex-1 flex items-center justify-center py-10">
              <Loader message="Loading..." />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardInfo) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-col lg:flex-row flex-1">
          <Sidebar user={user} active="Dashboard" />
          <div className="flex-1 flex flex-col bg-white lg:shadow pt-1 pb-4 px-4 sm:px-6 lg:px-8 mx-0 lg:mx-6 mt-4 lg:mt-8 rounded-none lg:rounded-xl w-full max-w-full">
            <div className="flex-1 flex items-center justify-center text-center py-10">
              <div>
                <h2 className="text-lg lg:text-xl font-semibold text-red-600 mb-2">
                  Unable to load dashboard
                </h2>
                <p className="text-gray-500 text-sm lg:text-base">
                  Please check your connection or try again later.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { title: "School Dean", value: dashboardInfo.dean },
    { title: "Department Head", value: dashboardInfo.deptHead },
    { title: "Faculty Members", value: dashboardInfo.faculty },
    { title: "Total Users", value: dashboardInfo.total },
  ];

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
      <div className="flex flex-col lg:flex-row flex-1">
        <Sidebar user={user} active="Dashboard" />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <main className="flex-1 flex flex-col bg-white lg:shadow pt-1 pb-4 px-4 sm:px-6 lg:px-8 mx-0 lg:mx-6 mt-4 lg:mt-8 rounded-none lg:rounded-xl w-full max-w-full">
            <Greeting name={user?.firstname || "Admin"} />

            {/* stats row */}
            <div className="flex flex-wrap gap-4 items-stretch mt-6">
              {stats.map((stat) => (
                <div key={stat.title} className="flex-1 sm:flex-none min-w-[12rem]">
                  <StatCard title={stat.title} value={stat.value} />
                </div>
              ))}
            </div>

            {/* table header */}
            <div className="mt-10 bg-[#f7faff] rounded-t-xl p-4 sm:p-6">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-semibold tracking-widest text-gray-800 uppercase">
                    Recently Added Users
                  </h2>
                  <div className="w-24 sm:w-30 h-0.5 bg-yellow-400 mt-1 rounded" />
                </div>

                <button
                  onClick={() => navigate("/admin/accounts")}
                  className="ml-auto bg-[#003DA5] text-white text-xs sm:text-sm px-4 py-2 h-9 rounded-md hover:bg-[#002B7F] text-center"
                >
                  View All
                </button>
              </div>
            </div>

            <div className="-mt-2 overflow-x-auto">
              <Table columns={recentUserColumns} data={dashboardInfo.recentUsers} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}