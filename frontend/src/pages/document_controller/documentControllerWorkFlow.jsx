import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import usePagination from "../../hooks/usePagination";
import Table from "../../components/table";
import Dropdown from "../../components/dropdowns/dropdown";
import SearchBar from "../../components/searchbar";

// --- placeholder docs (now with id) ---
const PLACEHOLDER_DOCS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  code: "FM-XXX-000",
  rev: "00",
  eff: "YY-MM-DD",
  title: "Document Title Placeholder",
  createdBy: "Creator Placeholder",
  ownedBy: "Owner Placeholder",
  due: "YY-MM-DD",
  status: i % 2 === 0 ? "Submitted" : "Published",
}));

const SORT_OPTIONS = ["Recent", "A–Z", "Z–A"];

export default function DocumentControllerWorkflow() {
  const user = useUser();
  const navigate = useNavigate();
  const [tab, setTab] = useState("submitted"); // 'submitted' | 'published'
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("Recent");
  const [peopleFilter, setPeopleFilter] = useState("All");

  // rows for current tab
  const baseRows = useMemo(
    () =>
      PLACEHOLDER_DOCS.filter((r) =>
        tab === "submitted" ? r.status === "Submitted" : r.status === "Published"
      ),
    [tab]
  );

  // People options update with tab
  const peopleOptions = useMemo(() => {
    const s = new Set();
    baseRows.forEach((r) => s.add(tab === "submitted" ? r.createdBy : r.ownedBy));
    return ["All", ...Array.from(s)];
  }, [baseRows, tab]);

  // filter + search + sort
  const filtered = useMemo(() => {
    let rows = [...baseRows];

    if (peopleFilter !== "All") {
      rows = rows.filter((r) =>
        tab === "submitted" ? r.createdBy === peopleFilter : r.ownedBy === peopleFilter
      );
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) =>
        (r.code + r.title + (tab === "submitted" ? r.createdBy : r.ownedBy))
          .toLowerCase()
          .includes(q)
      );
    }

    if (sortBy === "A–Z") rows.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "Z–A") rows.sort((a, b) => b.title.localeCompare(a.title));
    // "Recent" is a no-op for placeholders
    return rows;
  }, [baseRows, peopleFilter, query, sortBy, tab]);

  // pagination
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagination = usePagination(totalPages, 1);

  const pageRows = useMemo(
    () =>
      filtered.slice(
        (pagination.currentPage - 1) * pageSize,
        pagination.currentPage * pageSize
      ),
    [filtered, pagination.currentPage]
  );


  // dynamic columns based on tab (Created By vs Owned By)
  const columns = useMemo(() => {
    const common = [
      { key: "code", label: "Document Code" },
      { key: "rev", label: "Revision No." },
      { key: "eff", label: "Effectivity" },
      { key: "title", label: "Title" },
      ...(tab === "submitted"
        ? [{ key: "createdBy", label: "Created By" }]
        : [{ key: "ownedBy", label: "Owned By" }]),
      { key: "due", label: "Due Date" },
      {
        key: "status",
        label: "Status",
        render: (row) => <StatusBadge type={row.status} />,
      },
      {
        key: "actions",
        label: "Actions",
        render: (row) => (
          <button
            onClick={() =>
              navigate(`/document-controller/document-workflow/${row.id}`, {
                state: { from: "workflow", doc: row },
              })
            }
            className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            View
          </button>
        ),
      },
    ];
    return common;
  }, [navigate, tab]);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        {/* Sidebar fixed width */}
          <Sidebar user={user} />

        {/* Main content wrapper (aligned with other pages) */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-3 mx-6 mt-8 rounded-xl">
          <main className="p-5 flex-1 overflow-y-auto">
            {/* Heading */}
         <div className="flex-1 px-1 py-3">
              <h1 className="text-3xl font-bold tracking-widest uppercase">
                {tab === "submitted" ? "SUBMITTED DOCUMENTS" : "PUBLISHED DOCUMENTS"}
              </h1>
              <div className="w-28 h-1 bg-yellow-400 mb-6 rounded" />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-end gap-2 mb-1">
              {/* People filter */}
              <Dropdown
                options={peopleOptions}
                value={peopleFilter}
                onChange={setPeopleFilter}
                width="w-56"
                label="Filter"
                buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
              />

              {/* Sort */}
              <Dropdown
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={setSortBy}
                width="w-36"
                label="Sort"
                buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
              />

              {/* Search */}
              <div className="w-40 md:w-64">
                <SearchBar
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-5">
              <div className="inline-flex bg-gray-100 rounded p-1">
                <button
                  onClick={() => setTab("submitted")}
                  className={`px-4 py-2 rounded-md text-sm font-semibold ${
                    tab === "submitted"
                      ? "bg-white shadow text-[#0035DA]"
                      : "text-gray-600"
                  }`}
                >
                  Submitted
                </button>
                <button
                  onClick={() => setTab("published")}
                  className={`px-4 py-2 rounded-md text-sm font-semibold ${
                    tab === "published"
                      ? "bg-white shadow text-[#0035DA]"
                      : "text-gray-600"
                  }`}
                >
                  Published
                </button>
              </div>
            </div>

            {/* Reusable Table */}
            <Table columns={columns} data={pageRows} />

            {/* Pagination Controls */}
            <div className="flex justify-center items-center mt-6 gap-2">
              <button
                onClick={pagination.handlePrev}
                disabled={pagination.currentPage === 1}
                className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Prev
              </button>
              {pagination.getPageNumbers().map((num, idx) =>
                num === "..." ? (
                  <span key={idx} className="px-2 text-gray-400">...</span>
                ) : (
                  <button
                    key={num}
                    onClick={() => pagination.handlePage(num)}
                    className={`px-3 py-1 rounded border ${pagination.currentPage === num ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
                  >
                    {num}
                  </button>
                )
              )}
              <button
                onClick={pagination.handleNext}
                disabled={pagination.currentPage === totalPages}
                className="px-3 py-1 rounded border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Status pill (Submitted / Published)
function StatusBadge({ type }) {
  const status = String(type).toLowerCase();
  const styles = {
    submitted: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    published: "bg-green-50 text-green-700 border border-green-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}
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
