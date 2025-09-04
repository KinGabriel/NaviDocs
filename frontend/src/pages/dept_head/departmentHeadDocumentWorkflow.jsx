import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/header";
import Sidebar from "../../layout/sidebar";
import useUser from "../../hooks/useUser";
import Dropdown from "../../components/dropdown";
import SearchBar from "../../components/searchBar";
import Table from "../../components/table";
import usePagination from "../../hooks/usePagination";

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
          className="inline-flex items-center gap-2 px-3 py-1 bg-[#0035DA] text-white rounded-md hover:bg-[#043485] transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.57 3.09-1.52 4.24l4.89 4.89l-1.41 1.41l-4.89-4.89A6.47 6.47 0 0 1 9.5 16A6.5 6.5 0 1 1 9.5 3m0 2A4.5 4.5 0 1 0 14 9.5A4.5 4.5 0 0 0 9.5 5Z"
            />
          </svg>
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
          className="inline-flex items-center gap-2 px-3 py-1 bg-[#0035DA] text-white rounded-md hover:bg-[#043485] transition"
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.57 3.09-1.52 4.24l4.89 4.89l-1.41 1.41l-4.89-4.89A6.47 6.47 0 0 1 9.5 16A6.5 6.5 0 1 1 9.5 3m0 2A4.5 4.5 0 1 0 14 9.5A4.5 4.5 0 0 0 9.5 5Z"
            />
          </svg>
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
             <div className="flex items-center gap-2 mb-4">
              <Dropdown
                options={["All", "SAMCIS", "STELA", "University Wide"]}
                value={"All"}
                onChange={() => {}}
                width="w-44"
                label="Filter"
                buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
              />
              <Dropdown
                options={["Recent", "A-Z", "Z-A"]}
                value={sortBy}
                onChange={(v) => setSortBy(v)}
                width="w-36"
                label="Sort"
                buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
              />
              <div className="flex-1 md:ml-auto w-full md:w-96">
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

            {/* Table */}
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

// ---------- STATUS PILL ----------
function StatusBadge({ type }) {
  return (
    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
      <span className="h-2 w-2 rounded-full bg-green-500" />
      {type}
    </span>
  );
}
