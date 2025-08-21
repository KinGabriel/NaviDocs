import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import usePagination from "../../hooks/usePagination";
import Table from "../../components/table";
import Dropdown from "../../components/dropdown";
import SearchBar from "../../components/searchBar";

// Placeholder rows instead of real documents
const PLACEHOLDER_DOCS = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  code: "DOC-XXX-000",
  rev: "--",
  eff: "---- -- --",
  title: "Placeholder Document Title",
  createdBy: "User Name",
  due: "-- -- --",
  status: i % 3 === 0 ? "Approved" : i % 3 === 1 ? "Pending" : "Returned",
}));

const STATUS_OPTIONS = ["All", "Approved", "Pending", "Returned"];
const SORT_OPTIONS = ["Recent", "A–Z", "Z–A"];

export default function DocumentControllerDocuments() {
  const user = useUser();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("Recent");
  const [statusFilter, setStatusFilter] = useState("All");

  // filter + search + sort
  const filtered = useMemo(() => {
    let rows = [...PLACEHOLDER_DOCS];

    if (statusFilter !== "All") {
      rows = rows.filter((r) => r.status === statusFilter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) =>
        (r.code + r.title + r.createdBy).toLowerCase().includes(q)
      );
    }

    if (sortBy === "A–Z") rows.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "Z–A") rows.sort((a, b) => b.title.localeCompare(a.title));
    // "Recent" is a no-op for placeholders (no dates); backend can sort by updatedAt later
    return rows;
  }, [query, sortBy, statusFilter]);

  // pagination
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const { currentPage, handlePrev, handleNext, handlePage, getPageNumbers } =
    usePagination(totalPages, 1);

  const pageRows = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage]
  );

  // table columns
  const columns = [
    { key: "code", label: "Document Code" },
    { key: "rev", label: "Revision No." },
    { key: "eff", label: "Effectivity" },
    { key: "title", label: "Title" },
    { key: "createdBy", label: "Created By" },
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
            navigate(`/document-controller/documents/${row.id}`, {
              state: { from: "documents", doc: row },
            })
          }
          className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <main className="p-10 flex-1 overflow-y-auto">
            {/* Page Heading */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-widest uppercase">
                DOCUMENTS
              </h1>
              <div className="w-28 h-1 bg-yellow-400 mt-2 rounded" />
            </div>

            {/* Controls (use shared components) */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-6">
              {/* Filter by Status */}
              <Dropdown
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                width="w-44"
                label="Filter"
                buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
              />

              {/* Sort order */}
              <Dropdown
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={setSortBy}
                width="w-36"
                label="Sort"
                buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
              />

              {/* Search */}
              <div className="flex-1 md:ml-auto w-full md:w-96">
                <SearchBar
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  width="w-40"
                />
              </div>
            </div>

            {/* Reusable Table */}
            <Table columns={columns} data={pageRows} />

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
                  currentPage === totalPages
                    ? "text-gray-400"
                    : "hover:bg-gray-100"
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

// Reusable status pill
function StatusBadge({ type }) {
  const status = String(type).toLowerCase();
  const styles = {
    approved: "bg-green-50 text-green-700 border border-green-200",
    pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    returned: "bg-orange-50 text-red-700 border border-red-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
        styles[status] || ""
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          status === "approved"
            ? "bg-green-500"
            : status === "pending"
            ? "bg-yellow-500"
            : "bg-orange-500"
        }`}
      />
      {type}
    </span>
  );
}
