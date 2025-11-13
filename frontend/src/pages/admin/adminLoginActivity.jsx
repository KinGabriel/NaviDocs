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
  const [browserFilter, setBrowserFilter] = useState("");
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const statusOptions = ["All Status", "Active", "Logged Out"];
  const [statusFilter, setStatusFilter] = useState("All Status");

  const roleOptions = [
    "All Roles",
    "Admin",
    "Dean",
    "Department Head",
    "Document Controller Officer",
    "Faculty",
    "Lead Document Controller",
    "Secretary",
    "Unit Document Controller",
  ];
  const [roleFilter, setRoleFilter] = useState("All Roles");

  const apiParams = useMemo(() => {
    const params = { page: currentPage, limit: itemsPerPage };
    if (search && search.trim()) params.search = search.trim();
    if (selectedDate) params.date = selectedDate;
    if (browserFilter && browserFilter.trim()) params.browser = browserFilter.trim();
    if (statusFilter === "Active") params.status = "active";
    else if (statusFilter === "Logged Out") params.status = "inactive";
    if (roleFilter && roleFilter !== "All Roles") params.role = roleFilter;
    return params;
  }, [search, selectedDate, statusFilter, roleFilter, currentPage, browserFilter]);

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
            browser: it.browser,
            userAgent: it.userAgent,
            login_time: it.login_time,
            logout_time: it.logout_time,
          }));
          setLogs(mapped);
          setTotalPages(Number(res?.pages || 1));
          setTotalItems(Number(res?.total || mapped.length));
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
  }, [search, selectedDate, statusFilter, roleFilter, browserFilter]);

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

        <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-10 min-h-[900px]">

            <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-black tracking-widest uppercase mb-2">
              Login Activity
            </h2>
            <div className="h-1 bg-yellow-500 mb-5 sm:mb-6 rounded w-20 sm:w-24"></div>

            {/* Filter Row */}
            <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap md:items-center gap-3 mb-4">
              {/* 1) Status */}
              <div className="order-1 w-full md:w-auto">
                <Dropdown
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}
                  options={statusOptions}
                  width="w-full md:w-52"
                />
              </div>

              {/* 4) Browser filter */}
              <div className="order-4 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Browser (Chrome, Firefox...)"
                  className="h-10 w-full md:w-56 border border-gray-300 rounded-lg px-3 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={browserFilter}
                  onChange={(e) => {
                    setBrowserFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* 2) Role */}
              <div className="order-2 w-full md:w-auto">
                <Dropdown
                  value={roleFilter}
                  onChange={(value) => {
                    setRoleFilter(value);
                    setCurrentPage(1);
                  }}
                  options={roleOptions}
                  width="w-full md:w-64"
                />
              </div>

              {/* 3) Date */}
              <div className="order-3 w-full md:w-auto">
                <input
                  type="date"
                  className="h-10 w-full md:w-40 border border-gray-300 rounded-lg px-3 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* 4) Search BELOW all dropdowns on < lg, same width as desktop */}
              <div className="order-4 lg:hidden">
                <div className="w-64">
                  <SearchBar
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              {/* 5) Desktop/Large: Search on the right (>= lg) */}
              <div className="order-5 hidden lg:flex lg:flex-1 lg:justify-end">
                <div className="w-64">
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

            {loading ? (
              <div className="min-h-[200px] flex items-center justify-center">
                <Loader message="Fetching Activity Logs..." />
              </div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : (
              <>
                {/* Mobile: Card list (shows on < md) */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {currentLogs.length > 0 ? (
                    currentLogs.map((log) => {
                      const isActive = !log.logout_time;
                      return (
                        <div
                          key={log.id}
                          className="rounded-lg border border-gray-200 p-4 bg-white"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 break-all">
                                {log.email}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5">
                                {log.role || "—"} • {log.browser || log.userAgent || "—"}
                              </p>
                            </div>
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                                !log.logout_time
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-gray-50 text-gray-700 border border-gray-200"
                              }`}
                            >
                              {!log.logout_time ? "Active" : "Logged Out"}
                            </span>
                          </div>

                          <div className="mt-3 space-y-1.5 text-xs">
                            <div className="flex justify-between gap-3">
                              <span className="text-gray-500">Login</span>
                              <span className="text-gray-900">
                                {formatTimestamp(log.login_time) || "—"}
                              </span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="text-gray-500">Logout</span>
                              <span className="text-gray-900">
                                {log.logout_time
                                  ? formatTimestamp(log.logout_time)
                                  : "—"}
                              </span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="text-gray-500">IP</span>
                              <span className="text-gray-900 break-all text-right">
                                {log.ip || "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-gray-500 text-sm">
                      No results found
                    </div>
                  )}
                </div>

                {/* Desktop: Table (md+) */}
                <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full min-w-[760px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Email Address
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Role
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
                          IP Address
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Browser
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Login Time
                        </th>
                        <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
                          Logout Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentLogs.length > 0 ? (
                        currentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-blue-50 transition-colors text-sm">
                            <td className="px-5 py-4 text-gray-900 font-medium break-all">
                              {log.email}
                            </td>
                            <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                              {log.role}
                            </td>
                            <td className="px-5 py-4 text-gray-700 break-all">
                              {log.ip}
                            </td>
                            <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                              {log.browser || log.userAgent || '—'}
                            </td>
                            <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                              {formatTimestamp(log.login_time) || "—"}
                            </td>
                            <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
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
                          <td colSpan="6" className="text-center py-6 text-gray-500 text-sm">
                            No results found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Results Indicator */}
                <div className="text-center text-gray-600 text-xs sm:text-sm mt-4">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–
                  {(currentPage - 1) * itemsPerPage + currentLogs.length} of {totalItems} logs
                </div>

                {/* Pagination */}
                <div className="flex flex-wrap justify-center items-center mt-5 gap-2 text-xs sm:text-sm">
                  <button
                    onClick={handlePrev}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Prev
                  </button>

                  {getPageNumbers().map((num, idx) =>
                    num === "..." ? (
                      <span key={idx} className="px-2 text-gray-400 select-none">…</span>
                    ) : (
                      <button
                        key={num}
                        onClick={() => setCurrentPage(num)}
                        className={`px-3 py-1.5 rounded border ${
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
                    className="px-3 py-1.5 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
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
