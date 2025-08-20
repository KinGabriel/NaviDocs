import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import usePagination from "../../hooks/usePagination";

// Placeholder rows for now
const PLACEHOLDER_DOCS = Array.from({ length: 15 }, (_, i) => ({
  id: `D${100 + i}`,
  code: "FM-XXX-000",
  rev: "00",
  eff: "YY-MM-DD",
  title: "Document Title Placeholder",
  createdBy: "Name Placeholder",
  due: "YY-MM-DD",
  status: ["Approved", "Pending", "Returned"][i % 3], // cycle statuses
}));

export default function DocumentControllerDocuments() {
  const user = useUser();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  const filtered = useMemo(() => {
    let rows = [...PLACEHOLDER_DOCS];
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => (r.id + r.code + r.title + r.createdBy).toLowerCase().includes(q));
    }
    if (sortBy === "az") rows.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "za") rows.sort((a, b) => b.title.localeCompare(a.title));
    return rows;
  }, [query, sortBy]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const { currentPage, handlePrev, handleNext, handlePage, getPageNumbers } = usePagination(totalPages, 1);

  const pageRows = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage]
  );

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <main className="p-8 flex-1 overflow-y-auto">
            {/* Page Heading */}
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold tracking-wide">DOCUMENTS</h1>
              <div className="w-28 h-1 bg-yellow-400 mt-2 rounded" />
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-6">
              <button className="px-4 py-2 rounded-md bg-[#0E43A0] text-white font-semibold flex items-center gap-2">
                Filter by
                <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
              </button>
              <button className="px-4 py-2 rounded-md bg-[#0E43A0] text-white font-semibold flex items-center gap-2">
                Sort by
                <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
              </button>
              <div className="flex-1 md:ml-auto">
                <div className="relative">
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="w-full md:w-96 border border-gray-300 rounded-md pl-10 pr-3 py-2 bg-white" />
                  <svg className="absolute left-3 top-2.5" width="18" height="18" viewBox="0 0 24 24"><path fill="#0E43A0" d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 001.48-4.23C15.91 6.01 12.9 3 9.45 3A6.46 6.46 0 003 9.45c0 3.45 3.01 6.46 6.45 6.46 1.61 0 3.09-.59 4.23-1.48l.27.28v.79l4.99 4.98L20.49 19 15.5 14zm-6.05 0C6.47 14 4 11.53 4 8.95S6.47 4 9.05 4 14.1 6.47 14.1 9.05 11.63 14 9.45 14z"/></svg>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow border overflow-hidden">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <Th>ID</Th><Th>Document Code</Th><Th>Revision No.</Th><Th>Effectivity</Th><Th>Title</Th>
                    <Th>Created By</Th><Th>Due Date</Th><Th>Status</Th><Th className="text-right pr-4">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-gray-500">No results.</td></tr>}
                  {pageRows.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <Td>{r.id}</Td>
                      <Td className="text-[#003DA5] font-medium underline">{r.code}</Td>
                      <Td>{r.rev}</Td>
                      <Td>{r.eff}</Td>
                      <Td className="max-w-[360px] truncate">{r.title}</Td>
                      <Td>{r.createdBy}</Td>
                      <Td>{r.due}</Td>
                      <Td><StatusBadge type={r.status} /></Td>
                      <Td className="text-right pr-4">
                        <button className="px-3 py-1.5 rounded border text-sm font-medium hover:bg-gray-100">View</button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 text-sm">
              <button onClick={handlePrev} disabled={currentPage === 1} className={`flex items-center gap-2 px-2 py-1 rounded ${currentPage === 1 ? "text-gray-400" : "hover:bg-gray-100"}`}>
                <span className="text-lg">←</span> Previous
              </button>
              <div className="flex items-center gap-1">
                {getPageNumbers().map((n, idx) =>
                  n === "..." ? <span key={`dots-${idx}`} className="px-2">…</span> : (
                    <button key={n} onClick={() => handlePage(n)} className={`h-8 w-8 rounded-full grid place-items-center ${n === currentPage ? "bg-black text-white" : "hover:bg-gray-100"}`}>{n}</button>
                  )
                )}
              </div>
              <button onClick={handleNext} disabled={currentPage === totalPages} className={`flex items-center gap-2 px-2 py-1 rounded ${currentPage === totalPages ? "text-gray-400" : "hover:bg-gray-100"}`}>
                Next <span className="text-lg">→</span>
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}
function StatusBadge({ type }) {
  const status = String(type).toLowerCase();
  const styles = {
    approved: "bg-green-50 text-green-700 border border-green-200",
    pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    returned: "bg-red-50 text-red-700 border border-red-200",
  };
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || ""}`}>
      <span className={`h-2 w-2 rounded-full ${status === "approved" ? "bg-green-500" : status === "pending" ? "bg-yellow-500" : "bg-red-500"}`} />
      {type}
    </span>
  );
}
