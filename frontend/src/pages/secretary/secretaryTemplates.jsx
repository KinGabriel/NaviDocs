import { useState } from "react";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import Dropdown from "../../components/dropdown";
import SearchBar from "../../components/searchBar"; 

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
  const [activeTab, setActiveTab] = useState("Pending Approvals");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const user = useUser();
  const tabs = ["Pending Approvals", "Approved", "Returned"];

  // still to be replaced with actual data fetching logic 
  const templatesData = [
    { templateName: "Student Form", createdBy: "Jomar Castillo", department: "Chemical Engineering", school: "SEA", role: "Faculty" },
    { templateName: "Course Syllabi 2026-2027", createdBy: "Trisha Mae Ramos", department: "Psychology", school: "STELA", role: "Faculty" },
    { templateName: "Course Syllabi 2026-2027", createdBy: "Lea Francis Abad", department: "Pharmacy", school: "SONAHBS", role: "Faculty" },
    { templateName: "Course Syllabi 2026-2027", createdBy: "Alex Santiago", department: "Civil Engineering", school: "SEA", role: "Faculty" },
    { templateName: "Course Syllabi 2026-2027", createdBy: "Casey Medina", department: "Nursing", school: "SONAHBS", role: "Faculty" },
    { templateName: "Course Syllabi 2026-2027", createdBy: "Jules Navarro", department: "Political Science", school: "STELA", role: "Faculty" },
    { templateName: "Course Syllabi 2026-2027", createdBy: "Sam Llorente", department: "Philosophy and Humanities", school: "STELA", role: "Faculty" },
    { templateName: "Course Syllabi 2026-2027", createdBy: "Angel Morales", department: "Accountancy", school: "SAMCIS", role: "Faculty" },
    { templateName: "Course Syllabi 2026-2027", createdBy: "Jamie dela Rosa", department: "Financial Management", school: "SAMCIS", role: "Faculty" },
    { templateName: "Course Syllabi 2026-2027", createdBy: "Kris Manalo", department: "Information Technology", school: "SAMCIS", role: "Faculty" },
    { templateName: "Course Syllabi 2026-2027", createdBy: "Morgan Javier", department: "Computer Science", school: "SAMCIS", role: "Faculty" },
  ];

  const columns = [
    { key: "templateName", label: "Template Name" },
    { key: "createdBy", label: "Created By" },
    { key: "department", label: "Department" },
    { key: "school", label: "School" },
    { key: "role", label: "Role" },
    { 
      key: "actions", 
      label: "Actions",
      render: () => (
        <button className="text-white hover:text-white font-medium transition-colors rounded-sm  bg-blue-500 h-7 w-15 duration-200">
          View
        </button>
      )
    }
  ];

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
  const totalPages = Math.ceil(templatesData.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const currentData = templatesData.slice(startIdx, startIdx + itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Templates" />

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <div className="flex-1 p-2">
            <h1 className="text-3xl font-bold text-black-800 tracking-widest uppercase mt-8 ">Templates</h1>
            <div className="w-30 h-1 bg-yellow-400 mt-1 rounded" />
          </div>

           <div className="flex items-center justify-end gap-2 mb-4">
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
            <div className="w-64">
              <SearchBar
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab
                      ? "border-[#003DA5] text-[#003DA5]"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          
          {/* Table */}
          <Table columns={columns} data={currentData} />

          {/* Pagination */}
          <div className="flex justify-center items-center mt-6 gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => setCurrentPage(num)}
                className={`px-3 py-1 rounded border ${
                  currentPage === num
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}