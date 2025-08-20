import React, { useEffect, useState } from "react";
import useUser from "../../hooks/useUser";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import Loader from "../../components/loader";
import Greeting from "../../components/greeting";
import StatCard from "../../components/statcard";
import Table from "../../components/table";
import { fetchDashboardInfoAPI } from "../../api/documentContollerAPI";

export default function DocumentControllerDashboard() {
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
                <h2 className="text-xl font-semibold text-red-600 mb-2">
                  Unable to load dashboard
                </h2>
                <p className="text-gray-500">
                  Please check your connection or try again later.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Stats to display on the dashboard
  const stats = [
    { title: "Published Templates", value: dashboardInfo.countPublished ?? 0 },
    { title: "Submitted Templates", value: dashboardInfo.countPendingApproval ?? 0 },
    { title: "Approved Templates", value: dashboardInfo.countApproved ?? 0 },
  ];

  // Define columns for Published Documents
  const publishedDocsColumns = [
    { key: "id", label: "ID" }, 
    { key: "document_code", label: "Document Code" },
    { key: "revision_no", label: "Revision No." },
    { key: "effectivity", label: "Effectivity", render: (row) => row.effectivity || "N/A" },
    { key: "title", label: "Title" },
    {
      key: "created_by",
      label: "Created By",
      render: (row) =>
        row.created_by_user
          ? `${row.created_by_user.firstname} ${row.created_by_user.lastname}`
          : row.created_by,
    },
    {
      key: "action",
      label: "Action",
      render: () => (
        <button className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
          Review
        </button>
      ),
    },
  ];

  const publishedDocs = (dashboardInfo.getPublishedTemplates || []).map((doc, index) => ({
    ...doc,
    id: index + 1, 
  }));

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <main className="p-8 flex-1 overflow-y-auto">
            {/* Greeting */}
            <Greeting name={user?.name || "Document Controller"} />

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {stats.map((stat) => (
                <StatCard key={stat.title} title={stat.title} value={stat.value} />
              ))}
            </div>

            {/* Table Section */}
            <div className="mt-10 bg-[#f7faff] rounded-t-xl p-6">
              <div>
                <h2 className="text-sm font-semibold tracking-widest text-gray-800 uppercase">
                  Published Documents
                </h2>
                <div className="w-30 h-0.5 bg-yellow-400 mt-1 rounded" />
              </div>
            </div>

            <div className="-mt-2">
              <Table columns={publishedDocsColumns} data={publishedDocs} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
