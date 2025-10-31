import React, { useEffect, useState } from "react";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import Loader from "../../components/loader";
import SearchBar from "../../components/searchbar";
import Dropdown from "../../components/dropdowns/dropdown";
import useUser from "../../hooks/useUser";

const mockLogs = [
  { id: 1, name: "johndoe@gmail.com", ip: "192.168.0.21", loginAt: "2025-10-28 09:10 AM", logoutAt: "2025-10-28 10:05 AM" },
  { id: 2, name: "hello@gmail.com", ip: "172.16.15.42", loginAt: "2025-10-28 08:50 AM", logoutAt: "2025-10-28 09:30 AM" },
  { id: 3, name: "maria@gmail.com", ip: "203.84.119.88", loginAt: "2025-10-27 04:15 PM", logoutAt: "—" },
    { id: 4, name: "john@gmail.com", ip: "192.168.0.21", loginAt: "2025-10-28 09:10 AM", logoutAt: "2025-10-28 10:05 AM" },
  { id: 5, name: "doe@gmail.com", ip: "172.16.15.42", loginAt: "2025-10-28 08:50 AM", logoutAt: "2025-10-28 09:30 AM" },
  { id: 6, name: "smith@gmail.com", ip: "203.84.119.88", loginAt: "2025-10-27 04:15 PM", logoutAt: "—" },
    { id: 7, name: "low@gmail.com", ip: "192.168.0.21", loginAt: "2025-10-28 09:10 AM", logoutAt: "2025-10-28 10:05 AM" },
  { id: 8, name: "test@gmail.com", ip: "172.16.15.42", loginAt: "2025-10-28 08:50 AM", logoutAt: "2025-10-28 09:30 AM" },
  { id: 9, name: "name@gmail.com", ip: "203.84.119.88", loginAt: "2025-10-27 04:15 PM", logoutAt: "—" },
    { id: 10, name: "hi@gmail.com", ip: "192.168.0.21", loginAt: "2025-10-28 09:10 AM", logoutAt: "2025-10-28 10:05 AM" },
  { id: 11, name: "pety@gmail.com", ip: "172.16.15.42", loginAt: "2025-10-28 08:50 AM", logoutAt: "2025-10-28 09:30 AM" },
  { id: 12, name: "betty@gmail.com", ip: "203.84.119.88", loginAt: "2025-10-27 04:15 PM", logoutAt: "—" },
    { id: 13, name: "l@gmail.com", ip: "192.168.0.21", loginAt: "2025-10-28 09:10 AM", logoutAt: "2025-10-28 10:05 AM" },
  { id: 14, name: "ss@gmail.com", ip: "172.16.15.42", loginAt: "2025-10-28 08:50 AM", logoutAt: "2025-10-28 09:30 AM" },
  { id: 15, name: "sf@gmail.com", ip: "203.84.119.88", loginAt: "2025-10-27 04:15 PM", logoutAt: "—" },
];

export default function AdminLoginActivity() {
  const user = useUser();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(""); // Calendar filter
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const statusOptions = ["All Status", "Active", "Logged Out"];
  const [statusFilter, setStatusFilter] = useState("All Status");

  useEffect(() => {
    setTimeout(() => {
      setLogs(mockLogs);
      setLoading(false);
    }, 800);
  }, []);

  // Search filter
  const searchedLogs = search
    ? logs.filter(
        (log) =>
          log.name.toLowerCase().includes(search.toLowerCase()) ||
          log.ip.toLowerCase().includes(search.toLowerCase()) ||
          log.loginAt.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  // Status filter
  const filteredLogs = searchedLogs.filter((log) => {
    if (statusFilter === "Active") return log.logoutAt === "—";
    if (statusFilter === "Logged Out") return log.logoutAt !== "—";
    return true;
  });

  // Date filter
  const dateFilteredLogs = selectedDate
    ? filteredLogs.filter((log) =>
        log.loginAt.startsWith(selectedDate)
      )
    : filteredLogs;

  const totalPages = Math.ceil(dateFilteredLogs.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const currentLogs = dateFilteredLogs.slice(startIdx, startIdx + itemsPerPage);

  const handlePrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Login Activity" />

        <main className="flex-1 p-10">
          <div className="bg-white rounded-xl shadow-lg p-10 h-230">

            <h2 className="text-3xl font-bold text-black tracking-widest uppercase mb-2">
              Login Activity
            </h2>
            <div className="w-25 h-1 bg-yellow-500 mb-8"></div>

            {/* Filter, Calendar, Search */}
            <div className="flex items-center gap-2 mb-4">
              <Dropdown
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
                options={statusOptions}
                width="w-52"
              />

              {/* Calendar date filter */}
              <input
                type="date"
                className="h-10 w-36 border border-gray-300 rounded-lg px-3 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1);
                }}
              />

              <div className="flex-1 flex justify-end">
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
              <Loader message="Fetching Activity Logs..." />
            ) : (
              <>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Email Address</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">IP Address</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Login Time</th>
                        <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-600">Logout Time</th>
                      </tr>
                    </thead>

                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentLogs.length > 0 ? (
                        currentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-blue-50 transition-colors">
                            <td className="px-6 py-4 text-gray-900 font-medium">{log.name}</td>
                            <td className="px-6 py-4 text-gray-700">{log.ip}</td>
                            <td className="px-6 py-4 text-gray-700">{log.loginAt}</td>
                            <td className="px-6 py-4 text-gray-700">
                              {log.logoutAt === "—"
                                ? <span className="text-blue-700 font-medium">Active</span>
                                : log.logoutAt}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center py-4 text-gray-500">
                            No results found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-center items-center mt-6 gap-2">
                  <button
                    onClick={handlePrev}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-1 rounded border ${
                        currentPage === i + 1
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}

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
