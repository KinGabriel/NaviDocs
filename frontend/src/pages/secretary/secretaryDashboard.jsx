import React, { useEffect, useState } from "react";
import useUser from "../../hooks/useUser";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import Loader from "../../components/loader";
import Greeting from "../../components/greeting";
import StatCard from "../../components/statcard";
import Table from "../../components/table";

export default function SecretaryDashboard() {
  const user = useUser();
  const [loading, setLoading] = useState(true);
  const [dashboardInfo, setDashboardInfo] = useState(null);

  useEffect(() => {
    // simulate fetching data (dummy)
    setTimeout(() => {
      setDashboardInfo({
        countPendingTemplates: 5,
        countReturnedTemplates: 2,
        countMyDocuments: 7,
        countApproved: 10,
        receivedTemplates: [
          {
            document_code: "TMP-001",
            revision_no: "1",
            effectivity: "2025-08-01",
            title: "Annual Budget Report",
            created_by: "Juan Dela Cruz",
          },
          {
            document_code: "TMP-002",
            revision_no: "3",
            effectivity: "2025-08-05",
            title: "Meeting Minutes",
            created_by: "Maria Santos",
          },
          {
            document_code: "TMP-003",
            revision_no: "2",
            effectivity: "2025-08-10",
            title: "Project Proposal",
            created_by: "Jose Rizal",
          },
        ],
      });
      setLoading(false);
    }, 1000);
  }, []);

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

  const stats = [
    { title: "Pending Templates", value: dashboardInfo.countPendingTemplates },
    { title: "Returned Templates", value: dashboardInfo.countReturnedTemplates },
    { title: "My Documents", value: dashboardInfo.countMyDocuments },
    { title: "Approved Templates", value: dashboardInfo.countApproved },
  ];

  // Define table columns (ID removed)
  const receivedTemplatesColumns = [
    { key: "document_code", label: "Document Code" },
    { key: "revision_no", label: "Revision No." },
    { key: "effectivity", label: "Effectivity" },
    { key: "title", label: "Title" },
    { key: "created_by", label: "Created By" },
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

  const receivedTemplates = dashboardInfo.receivedTemplates || [];

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <main className="p-8 flex-1 overflow-y-auto">
            <Greeting name={user?.firstname || "Secretary"} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {stats.map((stat) => (
                <StatCard key={stat.title} title={stat.title} value={stat.value} />
              ))}
            </div>

            <div className="mt-10 bg-[#f7faff] rounded-t-xl p-6">
              <div>
                <h2 className="text-sm font-semibold tracking-widest text-gray-800 uppercase">
                  Templates Received
                </h2>
                <div className="w-30 h-0.5 bg-yellow-400 mt-1 rounded" />
              </div>
            </div>

            <div className="-mt-2">
              <Table columns={receivedTemplatesColumns} data={receivedTemplates} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
