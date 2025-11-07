import React, { useEffect, useMemo, useState } from "react";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import Loader from "../../components/loader";
import SearchBar from "../../components/searchbar";
import Dropdown from "../../components/dropdowns/dropdown";
import useUser from "../../hooks/useUser";
import { fetchLoginActivityAPI } from "../../api/adminAPI";

export default function AdminLoginActivity() {
  const user = useUser();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const statusOptions = ["All Status", "Active", "Logged Out"];
  const [statusFilter, setStatusFilter] = useState("All Status");

  const roleOptions = [
    "All Roles",
    "Lead Document Controller",
    "Unit Document Controller",
    "Document Controller Officer"
  ];
  const [roleFilter, setRoleFilter] = useState("All Roles");

  const apiParams = useMemo(() => {
    const params = { page: currentPage, limit: itemsPerPage };
    if (search && search.trim()) params.search = search.trim();
    if (selectedDate) params.date = selectedDate;
    if (statusFilter === "Active") params.status = "active";
    else if (statusFilter === "Logged Out") params.status = "inactive";
    if (roleFilter && roleFilter !== "All Roles") params.role = roleFilter;
    return params;
  }, [search, selectedDate, statusFilter, roleFilter, currentPage]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetchLoginActivityAPI(apiParams);
        const items = Array.isArray(res?.data) ? res.data : [];
        if (!cancelled) {
          const mapped = items.map((it, idx) => ({
            id: it._id || `${it.email}-${it.login_time || idx}`,
            email: it.email,
            role: it.role,
            ip: it.ip,
            login_time: it.login_time,
            logout_time: it.logout_time,
          }));
          setLogs(mapped);
          setTotalPages(Number(res?.pages || 1));
          setTotalItems(Number(res?.total || mapped.length)); // ✅ Total logs tracking
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Failed to fetch login activity");
          setLogs([]);
          setTotalPages(1);
          setTotalItems(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [apiParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedDate, statusFilter, roleFilter]);

  const currentLogs = logs;

  const formatTimestamp = (ts) => {
    if (!ts) return null;
    try {
      const d = new Date(ts);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return null;
    }
  };

  const handlePrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  /** ✅ Pagination with Ellipsis */
  const getPageNumbers = () => {
    const total = totalPages;
    const current = currentPage;
    const maxDisplayed = 5;
    let pages = [];

    if (total <= maxDisplayed) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 3) {
        pages = [1, 2, 3, "...", total];
      } else if (current >= total - 2) {
        pages = [1, "...", total - 2, total - 1, total];
      } else {
        pages = [1, "...", current - 1, current, current + 1, "...", total];
      }
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">

        <Sidebar user={user} active="Login Activity" />

        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-10">

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-black tracking-widest uppercase mb-2">
              Login Activity
            </h2>
            <div className="h-1 bg-yellow-500 mb-6 rounded w-20 sm:w-24"></div>

            {/* Filter Row */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap sm:items-center gap-3 mb-4">
              
              <Dropdown
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
                options={statusOptions}
                width="w-full sm:w-52"
              />

              <Dropdown
                value={roleFilter}
                onChange={(value) => {
                  setRoleFilter(value);
                  setCurrentPage(1);
                }}
                options={roleOptions}
                width="w-full sm:w-64"
              />

              <input
                type="date"
                className="h-10 w-full sm:w-36 border border-gray-300 rounded-lg px-3 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1);
                }}
              />

              <div className="w-full sm:flex-1 flex sm:justify-end">
                <div className="w-full sm:w-64">
                  <SearchBar
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="min-h-[200px] flex items-center justify-center">
                <Loader message="Fetching Activity Logs..." />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Email Address</th>
                        <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Role</th>
                        <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">IP Address</th>
                        <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Login Time</th>
                        <th className="text-left px-4 sm:px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Logout Time</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentLogs.length > 0 ? (
                        currentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-blue-50 transition-colors text-sm">
                            <td className="px-4 sm:px-6 py-4 text-gray-900 font-medium break-all">{log.email}</td>
                            <td className="px-4 sm:px-6 py-4 text-gray-700 whitespace-nowrap">{log.role}</td>
                            <td className="px-4 sm:px-6 py-4 text-gray-700 break-all">{log.ip}</td>
                            <td className="px-4 sm:px-6 py-4 text-gray-700 whitespace-nowrap">{formatTimestamp(log.login_time) || '—'}</td>
                            <td className="px-4 sm:px-6 py-4 text-gray-700 whitespace-nowrap">
                              {log.logout_time ? (
                                formatTimestamp(log.logout_time)
                              ) : (
                                <span className="text-blue-700 font-medium">Active</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-4 text-gray-500 text-sm">
                            No results found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ✅ Results Indicator */}
                <div className="text-center text-gray-600 text-sm mt-4">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–
                  {(currentPage - 1) * itemsPerPage + currentLogs.length} of {totalItems} logs
                </div>

                {/* ✅ Updated Pagination */}
                <div className="flex flex-wrap justify-center items-center mt-6 gap-2 text-sm">
                  <button
                    onClick={handlePrev}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Prev
                  </button>

                  {getPageNumbers().map((num, idx) =>
                    num === "..." ? (
                      <span key={idx} className="px-2 text-gray-400">...</span>
                    ) : (
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
                    )
                  )}

                  <button
                    onClick={handleNext}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
