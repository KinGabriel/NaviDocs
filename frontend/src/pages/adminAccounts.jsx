import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../layout/sidebar';
import Header from '../layout/header';
import SearchBar from '../components/searchbar';
import Table from '../components/table';

const columns = [
  {
    key: "name",
    label: "Name",
    render: (row) => `${row.firstname} ${row.lastname}`,
  },
  { key: "email", label: "School Email" },
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
    render: (row) => row.role?.name || "",
  },
  {
    key: "actions",
    label: "Actions",
    render: (row) => (
      <div className="flex gap-2">
        <button className="bg-blue-100 text-blue-700 px-4 py-1 rounded text-xs font-semibold hover:bg-blue-200">
          Edit
        </button>
        <button className="bg-red-100 text-red-500 px-4 py-1 rounded text-xs font-semibold hover:bg-red-200">
          Delete
        </button>
      </div>
    ),
  },
];

export default function AdminAccounts() {
  const user = JSON.parse(localStorage.getItem('user'));
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 8;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:8000/api/admin/get-users', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log(res.data);
        setUsers(res.data || []);
      } catch (err) {
        setUsers([]);
      }
    };
    fetchUsers();
  }, []);

  const totalPages = Math.ceil(users.length / usersPerPage);
  const startIdx = (currentPage - 1) * usersPerPage;
  const endIdx = startIdx + usersPerPage;
  const currentUsers = users.slice(startIdx, endIdx);

  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const handlePage = (n) => setCurrentPage(n);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages - 1, totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, 2, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="User Accounts" />
        <div className="flex-1 flex flex-col bg-white shadow pt-8 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <div className="flex-1 p-10">
            <h2 className="text-3xl font-extrabold mb-2 tracking-wide">NAVIDOCS USERS</h2>
            <div className="w-24 h-1 bg-yellow-400 mb-6 rounded" />

            {/* Filter, Sort, Search */}
            <div className="flex items-center gap-2 mb-4">
              <button className="bg-blue-700 text-white px-5 py-2 rounded font-semibold text-sm">Filter by</button>
              <button className="bg-blue-700 text-white px-5 py-2 rounded font-semibold text-sm flex items-center gap-1">
                Sort by
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="flex-1 flex justify-end">
                <div className="w-64">
                  <SearchBar />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded shadow p-0 overflow-x-auto">
              <Table columns={columns} data={currentUsers} />
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-8">
              <button
                className="text-gray-600 text-base flex items-center gap-1 px-3 py-2 rounded hover:bg-gray-100 disabled:opacity-50"
                onClick={handlePrev}
                disabled={currentPage === 1}
              >
                &larr; Previous
              </button>
              <div className="flex items-center gap-1 text-base">
                {getPageNumbers().map((n, i) =>
                  n === "..." ? (
                    <span key={i} className="px-2 text-gray-400">...</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => handlePage(n)}
                      className={`px-4 py-2 rounded font-semibold ${
                        n === currentPage
                          ? "bg-gray-300 text-black shadow"
                          : "bg-white border border-gray-300 text-black hover:bg-gray-100"
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}
              </div>
              <button
                className="text-gray-600 text-base flex items-center gap-1 px-3 py-2 rounded hover:bg-gray-100 disabled:opacity-50"
                onClick={handleNext}
                disabled={currentPage === totalPages}
              >
                Next &rarr;
              </button>
            </div>
            {/* End Pagination */}
          </div>
        </div>
      </div>
    </div>
  );
}
