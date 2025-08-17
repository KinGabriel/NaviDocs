import React from "react";
import useUser from "../../hooks/useUser";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import { FileText, CheckCircle, RotateCcw } from "lucide-react";

export default function DocumentControllerDashboard() {
  const user = useUser();

  const stats = [
    {
      title: "Published Documents",
      value: 8,
      icon: <FileText className="w-10 h-10 text-blue-500" />,
    },
    {
      title: "Returned Documents",
      value: 5,
      icon: <RotateCcw className="w-10 h-10 text-yellow-500" />,
    },
    {
      title: "Approved Documents",
      value: 7,
      icon: <CheckCircle className="w-10 h-10 text-green-500" />,
    },
  ];

  const publishedDocs = [
    {
      id: "D100",
      code: "FM-SA-003",
      revision: "00",
      date: "26-01-16",
      title: "3D Modeling and Animation Course Syllabus 26-27",
      author: "Mae Santos",
    },
    {
      id: "D200",
      code: "FM-SA-001",
      revision: "00",
      date: "26-01-16",
      title: "Motion Graphics Design Course Syllabus 26-27",
      author: "Mae Santos",
    },
    {
      id: "D300",
      code: "FM-SA-006",
      revision: "00",
      date: "26-01-16",
      title: "Special Topics 2 Course Syllabus 26-27",
      author: "Jennie Zhang",
    },
  ];

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
                    <th className="p-3">ID</th>
                    <th className="p-3">Document Code</th>
                    <th className="p-3">Revision No.</th>
                    <th className="p-3">Effectivity</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Created By</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {publishedDocs.map((doc, index) => (
                    <tr
                      key={doc.id}
                      className={`text-sm ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <td className="p-3">{doc.id}</td>
                      <td className="p-3">{doc.code}</td>
                      <td className="p-3">{doc.revision}</td>
                      <td className="p-3">{doc.date}</td>
                      <td className="p-3">{doc.title}</td>
                      <td className="p-3">{doc.author}</td>
                      <td className="p-3">
                        <button className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}