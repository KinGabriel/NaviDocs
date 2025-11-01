import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import usePagination from "../../hooks/usePagination";
import Table from "../../components/table";
import Dropdown from "../../components/dropdowns/dropdown";
import SearchBar from "../../components/searchbar";
import DocumentCard from "../../components/cards/documentCard";
import { StatusBadge } from "../../utils/formatters";
import { FileText } from "lucide-react";

const PLACEHOLDER_DOCS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  code: `FM-CS-${String(i + 1).padStart(3, "0")}`,
  rev: `0${i % 3}`,
  eff: "2025-01-15",
  title: `Document Title ${i + 1}`,
  createdBy: i % 3 === 0 ? "Nikola Jokic" : i % 3 === 1 ? "Luka Doncic" : "Alyas Pogi",
  ownedBy: i % 2 === 0 ? "Dept Head" : "Dean",
  due: "2025-12-31",
  status: i % 2 === 0 ? "Draft" : "Submitted",
  pdfUrl: `/documents/${i + 1}.pdf`,
  submittedTo: i % 3 === 0 ? "Department Head" : i % 3 === 1 ? "Secretary" : "Dean",
  submittedDate: "2025-10-20",
  currentHolder: i % 4 === 1 ? "Department Head" : i % 4 === 2 ? "Secretary" : "Dean", // refers to the person or role who currently has possession or control of the document
}));

const SORT_OPTIONS = ["Recent", "A–Z", "Z–A", "Status"];
const STATUS_FILTERS = ["All", "Draft", "Submitted"];

export default function FacultySubmissions() {
  const user = useUser();
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("Recent");
  const [statusFilter, setStatusFilter] = useState("All");
  const [creatorFilter, setCreatorFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table");

  // Filter base rows by tab
  const baseRows = useMemo(() => {
    if (tab === "draft") return PLACEHOLDER_DOCS.filter((r) => r.status === "Draft");
    if (tab === "submitted") return PLACEHOLDER_DOCS.filter((r) => r.status === "Submitted" || r.status === "Pending Review");
    return PLACEHOLDER_DOCS;
  }, [tab]);

  // creator options based on current rows
  const creatorOptions = useMemo(() => {
    const s = new Set();
    baseRows.forEach((r) => s.add(r.createdBy));
    return ["All", ...Array.from(s)];
  }, [baseRows]);

  // Apply filters, search, and sorting
  const filtered = useMemo(() => {
    let rows = [...baseRows];

    if (statusFilter !== "All") rows = rows.filter((r) => r.status === statusFilter);
    if (creatorFilter !== "All") rows = rows.filter((r) => r.createdBy === creatorFilter);

    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => (r.code + r.title + r.createdBy).toLowerCase().includes(q));
    }

    if (sortBy === "A–Z") rows.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "Z–A") rows.sort((a, b) => b.title.localeCompare(a.title));
    if (sortBy === "Status") rows.sort((a, b) => a.status.localeCompare(b.status));

    return rows;
  }, [baseRows, statusFilter, creatorFilter, query, sortBy]);

  // Pagination
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagination = usePagination(totalPages, 1);

  const pageRows = useMemo(
    () => filtered.slice((pagination.currentPage - 1) * pageSize, pagination.currentPage * pageSize),
    [filtered, pagination.currentPage]
  );

  // Dynamic columns for table view
  const columns = useMemo(
  () => [
    { key: "code", label: "Document Code" },
    { key: "rev", label: "Rev" },
    { key: "eff", label: "Effectivity" },
    { key: "title", label: "Title" },
    { key: "createdBy", label: "Created By" },
    {
      key: "currentHolder",
      label: "Current Holder",
      render: (row) =>
        row.currentHolder ? (
          <span className="text-blue-600 font-medium">{row.currentHolder}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "due",
      label: "Due On",
      render: (row) => (
        <span className="text-gray-900 font-medium">
          {new Date(row.due).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge type={row.status} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() =>
              navigate(`/faculty/document-workflow/${row.id}`, {
                state: { from: "workflow", doc: row },
              })
            }
            className="inline-flex items-center justify-center px-4 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            View
          </button>
        </div>
      ),
    },
  ],
  [navigate]
);


  const stats = useMemo(
    () => ({
      total: PLACEHOLDER_DOCS.length,
      drafts: PLACEHOLDER_DOCS.filter((d) => d.status === "Draft").length,
      submitted: PLACEHOLDER_DOCS.filter((d) => d.status === "Submitted" || d.status === "Pending Review").length,
    }),
    []
  );

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />

        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-3 mx-6 mt-8 rounded-xl">
          <main className="p-5 flex-1 overflow-y-auto">
            {/* Heading */}
            <div className="flex-1 px-1 py-2 mb-2">
              <h1 className="text-3xl font-bold tracking-widest uppercase">Assigned Tasks</h1>
              <p className="text-sm text-gray-600 mb-2">Manage and track your assignments</p>
              <div className="w-28 h-1 bg-yellow-400 rounded" />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-end gap-2 mb-3">
              <Dropdown options={STATUS_FILTERS} value={statusFilter} onChange={setStatusFilter} width="w-48" label="Status" buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white" />

              <Dropdown options={creatorOptions} value={creatorFilter} onChange={setCreatorFilter} width="w-48" label="Creator" buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white" />

              <Dropdown options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} width="w-36" label="Sort" buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white" />

              <div className="w-40 md:w-64">
                <SearchBar value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents..." />
              </div>

              <ViewToggle mode={viewMode} onChange={setViewMode} />
            </div>

            {/* Tabs */}
            <div className="mb-4 border-b border-gray-200">
              <div className="flex space-x-8">
                <TabButton active={tab === "all"} onClick={() => setTab("all")} label="All Documents" count={stats.total} />
                <TabButton active={tab === "draft"} onClick={() => setTab("draft")} label="Drafts" count={stats.drafts} />
                <TabButton active={tab === "submitted"} onClick={() => setTab("submitted")} label="Submitted" count={stats.submitted} />
              </div>
            </div>

            {/* Table or Grid */}
            {viewMode === "table" ? (
              <Table columns={columns} data={pageRows} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 mt-2">
                {pageRows.map((row, i) => (
                  <DocumentCard
                    key={row.id || i}
                    document={{
                      _id: row.id,
                      id: row.id,
                      title: row.title,
                      code: row.code,
                      rev: row.rev,
                      eff: row.eff,
                      createdByName: row.createdBy,
                      ownedByName: row.ownedBy,
                      status: row.status,
                      currentHolder: row.currentHolder,
                      updatedAt: new Date().toISOString(),
                    }}
                    user={user}
                    onSelect={() =>
                      navigate(`/faculty/document-workflow/${row.id}`, {
                        state: { from: "workflow", doc: row },
                      })
                    }
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {filtered.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-500">Try adjusting your filters or search query</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 relative ${
        active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
            active ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-700"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// View Toggle Component
function ViewToggle({ mode = "table", onChange }) {
  const isTable = mode === "table";
  return (
    <div className="inline-flex items-stretch rounded-full border border-gray-300 overflow-hidden">
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`px-3 py-2 flex items-center ${isTable ? "bg-blue-100 text-blue-700" : "bg-white text-gray-700"}`}
        aria-label="List view"
        title="List view"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={`px-3 py-2 flex items-center ${!isTable ? "bg-blue-100 text-blue-700" : "bg-white text-gray-700"}`}
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
