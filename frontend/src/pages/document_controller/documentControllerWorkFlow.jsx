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
  const [tab, setTab] = useState("submitted");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("Recent");
  const [peopleFilter, setPeopleFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table");

  const baseRows = useMemo(
    () =>
      PLACEHOLDER_DOCS.filter((r) =>
        tab === "submitted" ? r.status === "Submitted" : r.status === "Published"
      ),
    [tab]
  );

  const peopleOptions = useMemo(() => {
    const s = new Set();
    baseRows.forEach((r) => s.add(tab === "submitted" ? r.createdBy : r.ownedBy));
    return ["All", ...Array.from(s)];
  }, [baseRows, tab]);

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
    return rows;
  }, [baseRows, peopleFilter, query, sortBy, tab]);

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
            className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
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
        <Sidebar user={user} />

        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-3 md:px-6 mx-3 md:mx-6 mt-4 md:mt-8 rounded-xl">
          <main className="p-4 md:p-5 flex-1 overflow-y-auto">
            <div className="flex-1 px-1 py-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-widest uppercase">
                {tab === "submitted" ? "SUBMITTED DOCUMENTS" : "PUBLISHED DOCUMENTS"}
              </h1>
              <div className="w-24 md:w-28 h-1 bg-yellow-400 mb-4 md:mb-6 rounded" />
            </div>

            {/* Controls */}
            <div className="controls-row flex flex-wrap items-center justify-end gap-2 md:gap-3 mb-2">
              <Dropdown
                options={peopleOptions}
                value={peopleFilter}
                onChange={setPeopleFilter}
                width="w-48 md:w-56"
                label="Filter"
                buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
              />
              <Dropdown
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={setSortBy}
                width="w-32 md:w-36"
                label="Sort"
                buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
              />
              <div className="search w-full sm:w-64 order-3 sm:order-none">
                <SearchBar
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                />
              </div>
              <div className="ml-auto sm:ml-0 order-2 sm:order-none">
                <ViewToggle mode={viewMode} onChange={setViewMode} />
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-4 border-b border-gray-200">
              <div className="flex flex-wrap gap-x-8">
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
              <div className="table-wrapper max-w-full overflow-x-auto md:overflow-visible">
                <div className="min-w-[640px] md:min-w-0">
                  <Table columns={columns} data={pageRows} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-2">
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
                        navigate(`/document-controller/document-workflow/${row.id}`, {
                          state: { from: "workflow", doc: row },
                        })
                      }
                      onRename={() => {}}
                      onDelete={() => {}}
                    />
                  );
                })}
              </div>
            )}

            {/* Pagination */}
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
                  <span key={idx} className="px-2 text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={num}
                    onClick={() => pagination.handlePage(num)}
                    className={`px-3 py-1 rounded border ${
                      pagination.currentPage === num
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-100"
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

      {/* Custom CSS media queries */}
      <style>{`
        @media (max-width: 768px) {
          /* Table: make cells wrap nicely and scroll horizontally */
          .table-wrapper table {
            font-size: 13px;
          }
          .table-wrapper th, .table-wrapper td {
            padding: 6px 8px;
          }
        }
        @media (max-width: 500px) {
          /* Hide less important columns on mobile for better visibility */
          .table-wrapper th:nth-child(2),
          .table-wrapper td:nth-child(2),
          .table-wrapper th:nth-child(6),
          .table-wrapper td:nth-child(6) {
            display: none;
          }
        }
        @media (max-width: 400px) {
          /* tighter controls + search adjustments */
          .controls-row { gap: 6px; }
          .controls-row .search input { font-size: 14px; }
          .table-wrapper table {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
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
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${styles[status]}`}
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

function ViewToggle({ mode = "table", onChange }) {
  const isTable = mode === "table";
  return (
    <div className="inline-flex items-stretch rounded-full border border-gray-300 overflow-hidden">
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
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
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
