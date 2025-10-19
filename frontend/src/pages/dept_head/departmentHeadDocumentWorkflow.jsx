import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import Dropdown from "../../components/dropdowns/dropdown";
import SearchBar from "../../components/searchbar";
import Table from "../../components/table";
import usePagination from "../../hooks/usePagination";
import DocumentCard from "../../components/cards/documentCard"; 

// ---------- PLACEHOLDER DATA ----------
const SUBMITTED = Array.from({ length: 20 }, (_, i) => ({
  id: `DH-SUB-${(i + 1).toString().padStart(3, "0")}`,
  code: "DOC-XXX-000",
  rev: "--",
  eff: "YY-MM-DD",
  title: "Document Title Placeholder",
  createdBy: "Faculty Placeholder",
  due: "YY-MM-DD",
  status: "Submitted",
}));

const PUBLISHED = Array.from({ length: 20 }, (_, i) => ({
  id: `DH-PUB-${(i + 1).toString().padStart(3, "0")}`,
  code: "DOC-XXX-000",
  rev: "--",
  eff: "YY-MM-DD",
  title: "Document Title Placeholder",
  ownedBy: "Owner Placeholder",
  due: "YY-MM-DD",
  status: "Published",
}));

export default function DepartmentHeadDocumentWorkflow() {
  const user = useUser();
  const navigate = useNavigate();

  const [tab, setTab] = useState("submitted"); // submitted | published
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("Recent");

  // NEW: list/grid view
  const [viewMode, setViewMode] = useState("table"); // "table" | "grid"

  const rows = tab === "submitted" ? SUBMITTED : PUBLISHED;

  const filtered = useMemo(() => {
    let out = [...rows];
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((r) =>
        (r.id + r.code + r.title + (tab === "submitted" ? r.createdBy : r.ownedBy || ""))
          .toLowerCase()
          .includes(q)
      );
    }
    if (sortBy === "A-Z") out.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "Z-A") out.sort((a, b) => b.title.localeCompare(a.title));
    return out;
  }, [rows, query, sortBy, tab]);

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

  // columns
  const submittedColumns = [
    { key: "id", label: "ID" },
    { key: "code", label: "Document Code" },
    { key: "rev", label: "Revision No." },
    { key: "eff", label: "Effectivity" },
    { key: "title", label: "Title" },
    { key: "createdBy", label: "Created By" },
    { key: "due", label: "Due Date" },
    { key: "status", label: "Status", render: () => <StatusBadge type="Submitted" /> },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          onClick={() =>
            navigate(`/department-head/documents/${row.id}`, { state: { from: "workflow" } })
          }
          // UPDATED: blue rounded button like your screenshot
          className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
        >
          View
        </button>
      ),
    },
  ];

  const publishedColumns = [
    { key: "id", label: "ID" },
    { key: "code", label: "Document Code" },
    { key: "rev", label: "Revision No." },
    { key: "eff", label: "Effectivity" },
    { key: "title", label: "Title" },
    { key: "ownedBy", label: "Owned By" },
    { key: "due", label: "Due Date" },
    { key: "status", label: "Status", render: () => <StatusBadge type="Published" /> },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          onClick={() =>
            navigate(`/department-head/documents/${row.id}`, { state: { from: "workflow" } })
          }
          // UPDATED: blue rounded button like your screenshot
          className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
        >
          View
        </button>
      ),
    },
  ];

  const columns = tab === "submitted" ? submittedColumns : publishedColumns;

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} active="Document Workflow" />

        {/* Wrapper */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-3 mx-6 mt-8 rounded-xl">
          <main className="p-5 flex-1 overflow-y-auto">
            {/* Title */}
            <div className="flex-1 px-1 py-3">
              <h1 className="text-3xl font-bold tracking-widest uppercase">
                {tab === "submitted" ? "SUBMITTED DOCUMENTS" : "PUBLISHED DOCUMENTS"}
              </h1>
              <div className="w-28 h-1 bg-yellow-400 mb-6 rounded" />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-end gap-2 mb-1">
              <Dropdown
                options={["Filter by", "All", "SAMCIS", "STELA", "University Wide"]}
                value={"Filter by"}
                onChange={() => {}}
                width="w-44"
                buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
              />
              <Dropdown
                options={["Sort by", "Recent", "A-Z", "Z-A"]}
                value={"Sort by"}
                onChange={(v) => {
                  if (v === "Recent" || v === "A-Z" || v === "Z-A") setSortBy(v);
                }}
                width="w-36"
                buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
              />
              <div className="w-40 md:w-64">
                <SearchBar
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                />
              </div>

              {/* NEW: view toggle pill */}
              <ViewToggle mode={viewMode} onChange={setViewMode} />
            </div>

            {/* Tabs — UPDATED to blue underline style */}
            <div className="mb-4 border-b border-gray-200">
              <div className="flex space-x-8">
                <button
                  onClick={() => setTab("submitted")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    tab === "submitted"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Submitted
                </button>
                <button
                  onClick={() => setTab("published")}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    tab === "published"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Published
                </button>
              </div>
            </div>

            {/* Table OR Cards */}
            {viewMode === "table" ? (
              <Table columns={columns} data={pageRows} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 mt-2">
                {pageRows.map((row, i) => {
                  const docForCard = {
                    _id: row.id || i,
                    id: row.id || i,
                    title: row.title,
                    code: row.code,
                    revision: row.rev,
                    rev: row.rev,
                    effectivity: row.eff,
                    eff: row.eff,
                    createdByName: row.createdBy,
                    ownedByName: row.ownedBy,
                    status: row.status,
                    updatedAt: new Date().toISOString(),
                  };
                  return (
                    <DocumentCard
                      key={docForCard._id}
                      document={docForCard}
                      user={user}
                      onSelect={() =>
                        navigate(`/department-head/documents/${row.id}`, {
                          state: { from: "workflow" },
                        })
                      }
                      onRename={() => {}}
                      onDelete={() => {}}
                    />
                  );
                })}
              </div>
            )}

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
                    className={`px-3 py-1 rounded border ${
                      pagination.currentPage === num ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
                    }`}
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

// ---------- STATUS PILL ----------
function StatusBadge({ type }) {
  return (
    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      {type}
    </span>
  );
}

/* ---------- Inline helper: Toggle pill ---------- */
function ViewToggle({ mode = "table", onChange }) {
  const isTable = mode === "table";
  return (
    <div className="inline-flex items-stretch rounded-full border border-gray-300 overflow-hidden">
      {/* List / Table */}
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`px-3 py-2 flex items-center ${
          isTable ? "bg-blue-100 text-blue-700" : "bg-white text-gray-700"
        }`}
        aria-label="List view"
        title="List view"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      {/* Grid */}
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={`px-3 py-2 flex items-center ${
          !isTable ? "bg-blue-100 text-blue-700" : "bg-white text-gray-700"
        }`}
        aria-label="Grid view"
        title="Grid view"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="4" y="4" width="6" height="6" rx="1"></rect>
          <rect x="14" y="4" width="6" height="6" rx="1"></rect>
          <rect x="4" y="14" width="6" height="6" rx="1"></rect>
          <rect x="14" y="14" width="6" height="6" rx="1"></rect>
        </svg>
      </button>
    </div>
  );
}
