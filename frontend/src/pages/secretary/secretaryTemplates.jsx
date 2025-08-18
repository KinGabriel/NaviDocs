import { useState } from "react";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";

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

export default function SecretaryTemplates() {
  const user = useUser();

  const templatesData = [
    { id: "T001", templateName: "Student Form", createdBy: "Jomar Castillo", department: "Chemical Engineering", school: "SEA", role: "Faculty" },
    { id: "T001", templateName: "Course Syllabi 2026-2027", createdBy: "Trisha Mae Ramos", department: "Psychology", school: "STELA", role: "Faculty" },
    { id: "T001", templateName: "Course Syllabi 2026-2027", createdBy: "Lea Francis Abad", department: "Pharmacy", school: "SONAHBS", role: "Faculty" },
    { id: "T001", templateName: "Course Syllabi 2026-2027", createdBy: "Alex Santiago", department: "Civil Engineering", school: "SEA", role: "Faculty" },
    { id: "T001", templateName: "Course Syllabi 2026-2027", createdBy: "Casey Medina", department: "Nursing", school: "SONAHBS", role: "Faculty" },
  ];

  const columns = [
    { key: "id", label: "ID" },
    { key: "templateName", label: "Template Name" },
    { key: "createdBy", label: "Created By" },
    { key: "department", label: "Department" },
    { key: "school", label: "School" },
    { key: "role", label: "Role" },
    { 
      key: "actions", 
      label: "Actions",
      render: () => (
        <button className="text-[#003DA5] hover:text-[#002A7A] font-medium transition-colors duration-200">
          View
        </button>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Templates" />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold tracking-widest text-gray-800 uppercase">Templates</h1>
              <div className="w-30 h-1 bg-yellow-400 mt-1 rounded" />
            </div>
            {/* Table */}
            <Table columns={columns} data={templatesData} />
          </div>
        </main>
      </div>
    </div>
  );
}