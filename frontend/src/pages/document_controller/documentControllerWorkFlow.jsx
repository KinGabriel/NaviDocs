import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import usePagination from "../../hooks/usePagination";

// --- placeholder docs ---
const PLACEHOLDER_DOCS = Array.from({ length: 20 }, (_, i) => ({
  code: "FM-XXX-000",
  rev: "00",
  eff: "YY-MM-DD",
  title: "Document Title Placeholder",
  createdBy: "Creator Placeholder",
  ownedBy: "Owner Placeholder",
  due: "YY-MM-DD",
  status: i % 2 === 0 ? "Submitted" : "Published",
}));

export default function DocumentControllerWorkflow() {
  const user = useUser();
  const navigate = useNavigate();

  const [tab, setTab] = useState("submitted");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [peopleFilter, setPeopleFilter] = useState(null);

  const baseRows = PLACEHOLDER_DOCS.filter((r) =>
    tab === "submitted" ? r.status === "Submitted" : r.status === "Published"
  );

  const filtered = useMemo(() => {
    let rows = [...baseRows];
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) =>
        (r.code + r.title + (tab === "submitted" ? r.createdBy : r.ownedBy))
          .toLowerCase()
          .includes(q)
      );
    }
    if (peopleFilter) {
      rows = rows.filter((r) =>
        tab === "submitted" ? r.createdBy === peopleFilter : r.ownedBy === peopleFilter
      );
    }
    if (sortBy === "az") rows.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "za") rows.sort((a, b) => b.title.localeCompare(a.title));
    return rows;
  }, [baseRows, query, sortBy, peopleFilter, tab]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const { currentPage, handlePrev, handleNext, handlePage, getPageNumbers } =
    usePagination(totalPages, 1);
  const pageRows = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage]
  );

  const filterRef = useRef(null);
  const sortRef = useRef(null);
  useEffect(() => {
    const onClick = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const peopleList = useMemo(() => {
    const s = new Set();
    (tab === "submitted" ? PLACEHOLDER_DOCS : PLACEHOLDER_DOCS).forEach((r) =>
      s.add(tab === "submitted" ? r.createdBy : r.ownedBy)
    );
    return Array.from(s);
  }, [tab]);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        {/* Sidebar fixed width */}
        <div className="flex-none">
          <Sidebar user={user} />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <main className="p-8 flex-1 overflow-y-auto">
            {/* Heading */}
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold tracking-wide">
                {tab === "submitted" ? "SUBMITTED DOCUMENTS" : "PUBLISHED DOCUMENTS"}
              </h1>
              <div className="w-28 h-1 bg-yellow-400 mt-2 rounded" />
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-6">
              {/* Filter */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setFilterOpen((v) => !v)}
                  className="px-4 py-2 rounded-md bg-[#0035DA] hover:bg-[#043485] text-white font-semibold flex items-center gap-2"
                >
                  Filter by
                  <svg width="14" height="14" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M7 10l5 5 5-5z" />
                  </svg>
                </button>
                {filterOpen && (
                  <div className="absolute z-20 mt-2 w-60 bg-white rounded-lg shadow-lg border p-3">
                    <div className="text-xs text-gray-500 font-semibold mb-2">People</div>
                    <div className="max-h-56 overflow-auto space-y-1">
                      <button
                        className={`w-full text-left px-2 py-1 rounded ${
                          !peopleFilter ? "bg-gray-100" : "hover:bg-gray-50"
                        }`}
                        onClick={() => setPeopleFilter(null)}
                      >
                        All
                      </button>
                      {peopleList.map((p) => (
                        <button
                          key={p}
                          className={`w-full text-left px-2 py-1 rounded ${
                            peopleFilter === p ? "bg-gray-100" : "hover:bg-gray-50"
                          }`}
                          onClick={() => setPeopleFilter(p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sort */}
              <div className="relative" ref={sortRef}>
                <button
                  onClick={() => setSortOpen((v) => !v)}
                  className="px-4 py-2 rounded-md bg-[#0035DA] hover:bg-[#043485] text-white font-semibold flex items-center gap-2"
                >
                  Sort by
                  <svg width="14" height="14" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M7 10l5 5 5-5z" />
                  </svg>
                </button>
                {sortOpen && (
                  <div className="absolute z-20 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                    {[
                      { key: "recent", label: "Recent" },
                      { key: "az", label: "Title A–Z" },
                      { key: "za", label: "Title Z–A" },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setSortBy(opt.key);
                          setSortOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm ${
                          sortBy === opt.key ? "bg-gray-100" : "hover:bg-gray-50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="flex-1 md:ml-auto">
                <div className="relative">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full md:w-96 border border-gray-300 rounded-md pl-10 pr-3 py-2 bg-white"
                  />
                  <svg
                    className="absolute left-3 top-2.5"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#0035DA"
                      d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 001.48-4.23C15.91 6.01 12.9 3 9.45 3A6.46 6.46 0 003 9.45c0 3.45 3.01 6.46 6.45 6.46 1.61 0 3.09-.59 4.23-1.48l.27.28v.79l4.99 4.98L20.49 19 15.5 14zm-6.05 0C6.47 14 4 11.53 4 8.95S6.47 4 9.05 4 14.1 6.47 14.1 9.05 11.63 14 9.45 14z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-5">
              <div className="inline-flex bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => setTab("submitted")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    tab === "submitted"
                      ? "bg-white shadow text-[#0035DA]"
                      : "text-gray-600"
                  }`}
                >
                  Submitted
                </button>
                <button
                  onClick={() => setTab("published")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    tab === "published"
                      ? "bg-white shadow text-[#0035DA]"
                      : "text-gray-600"
                  }`}
                >
                  Published
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow border overflow-x-auto">
              <table className="min-w-full table-fixed border-separate border-spacing-0">
                <thead className="bg-gray-50">
                  <tr className="text-gray-600 text-left">
                    <Th className="w-32">Document Code</Th>
                    <Th className="w-28">Revision No.</Th>
                    <Th className="w-28">Effectivity</Th>
                    <Th className="w-72">Title</Th>
                    {tab === "submitted" ? (
                      <Th className="w-40">Created By</Th>
                    ) : (
                      <Th className="w-40">Owned By</Th>
                    )}
                    <Th className="w-28">Due Date</Th>
                    <Th className="w-32">Status</Th>
                    <Th className="w-28 text-right pr-4">Actions</Th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-gray-500">
                        No results.
                      </td>
                    </tr>
                  )}

                  {pageRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <Td>{r.code}</Td>
                      <Td>{r.rev}</Td>
                      <Td>{r.eff}</Td>
                      <Td className="truncate">{r.title}</Td>
                      <Td>{tab === "submitted" ? r.createdBy : r.ownedBy}</Td>
                      <Td>{r.due}</Td>
                      <Td>
                        <StatusBadge type={r.status} />
                      </Td>
                      <Td className="text-right pr-4">
                        <button
                          className="px-3 py-1.5 rounded border text-sm font-medium hover:bg-gray-100"
                          onClick={() =>
                            navigate(`/document-controller/documents/${idx}`)
                          }
                        >
                          View
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 text-sm">
              <button
                onClick={handlePrev}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-2 py-1 rounded ${
                  currentPage === 1 ? "text-gray-400" : "hover:bg-gray-100"
                }`}
              >
                <span className="text-lg">←</span> Previous
              </button>
              <div className="flex items-center gap-1">
                {getPageNumbers().map((n, idx) =>
                  n === "..." ? (
                    <span key={`dots-${idx}`} className="px-2">
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => handlePage(n)}
                      className={`h-8 w-8 rounded-full grid place-items-center ${
                        n === currentPage
                          ? "bg-[#0035DA] text-white"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-2 px-2 py-1 rounded ${
                  currentPage === totalPages ? "text-gray-400" : "hover:bg-gray-100"
                }`}
              >
                Next <span className="text-lg">→</span>
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Table helpers
function Th({ children, className = "" }) {
  return (
    <th
      className={`px-4 py-3 text-sm font-semibold uppercase tracking-wider align-middle border-b border-gray-200 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return (
    <td
      className={`px-4 py-4 text-sm align-middle leading-6 whitespace-normal break-words border-t border-gray-200 ${className}`}
    >
      {children}
    </td>
  );
}

function StatusBadge({ type }) {
  const status = String(type).toLowerCase();
  const styles = {
    submitted: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    published: "bg-green-50 text-green-700 border border-green-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-sm font-semibold ${styles[status]}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          status === "published" ? "bg-green-500" : "bg-emerald-500"
        }`}
      />
      {type}
    </span>
  );
}
