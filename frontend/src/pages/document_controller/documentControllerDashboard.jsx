import React, { useEffect, useState } from "react";
import useUser from "../../hooks/useUser";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import Loader from '../../components/loader';
import { fetchDashboardInfoAPI } from "../../api/documentContollerAPI";
import { FileText, CheckCircle, RotateCcw } from "lucide-react";

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
              <h2 className="text-xl font-semibold text-red-600 mb-2">Unable to load dashboard</h2>
              <p className="text-gray-500">Please check your connection or try again later.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
  const stats = [
    {
      title: "Published Templates",
      value: dashboardInfo.countPublished ?? 0,
      icon: <FileText className="w-10 h-10 text-blue-500" />,
    },
    {
      title: "Submitted Templates",
      value: dashboardInfo.countPendingApproval ?? 0, 
      icon: <RotateCcw className="w-10 h-10 text-yellow-500" />,
    },
    {
      title: "Approved Templates",
      value: dashboardInfo.countApproved ?? 0,
      icon: <CheckCircle className="w-10 h-10 text-green-500" />,
    },
  ];

  // Use real published documents
  const publishedDocs = dashboardInfo.getPublishedTemplates || [];

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Dashboard" />

        {/* main content */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <div className="flex-1 p-10">
            {/* Title + underline */}
            <h1 className="text-3xl font-semibold tracking-wide mb-2">DASHBOARD</h1>
            <div className="w-30 h-1 bg-yellow-400 mb-6 rounded" />

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
              {stats.map((stat) => (
                <div
                  key={stat.title}
                  className="bg-[#F8FAFF] rounded-lg shadow-md flex items-center justify-between p-6"
                >
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-gray-600">{stat.title}</p>
                  </div>
                  <div className="bg-white shadow rounded-full p-3">
                    {stat.icon}
                  </div>
                </div>
              ))}
            </div>

            {/* Published Documents Table */}
            <div className="bg-[#F8FAFF] p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4 uppercase tracking-wide">
                Published Documents
              </h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left text-sm font-medium text-gray-700">
                    <th className="p-3">Document Code</th>
                    <th className="p-3">Revision No.</th>
                    <th className="p-3">Effectivity</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Created By</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {publishedDocs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-4 text-gray-500">
                        No published documents found.
                      </td>
                    </tr>
                  ) : (
                    publishedDocs.map((doc, index) => (
                      <tr
                        key={doc.id}
                        className={`text-sm ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="p-3">{doc.document_code}</td>
                        <td className="p-3">{doc.revision_no}</td>
                        <td className="p-3">{doc.effectivity || 'N/A'}</td>
                        <td className="p-3">{doc.title}</td>
                        <td className="p-3">
                          {doc.created_by_user
                            ? `${doc.created_by_user.firstname} ${doc.created_by_user.lastname}`
                            : doc.created_by}
                        </td>
                        <td className="p-3">
                          <button className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                            Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}