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
const SUBMITTED = Array.from({ length: 28 }, (_, i) => ({
  id: `D${(i + 1).toString().padStart(3, "0")}`,
  code: "FM-SAA-002",
  rev: "00",
  eff: "26-01-16",
  title:
    i % 5 === 0
      ? "Data Mining Course Syllabi 26-27"
      : i % 5 === 1
      ? "Web Technologies Course Syllabi 26-27"
      : i % 5 === 2
      ? "Special Topics 1 Course Syllabi 26-27"
      : i % 5 === 3
      ? "Applications Development Course Syllabi"
      : "IT Capstone Project 1 Course Syllabi",
  createdBy:
    i % 5 === 0
      ? "Daniela Torres"
      : i % 5 === 1
      ? "Sarah Dela Cruz"
      : i % 5 === 2
      ? "Sarah Dela Cruz"
      : i % 5 === 3
      ? "Mark Gomez"
      : "Jana Aquino",
  due: "26-01-10",
  status: "Submitted",
}));

const PUBLISHED = Array.from({ length: 28 }, (_, i) => ({
  id: `D${(i + 1).toString().padStart(3, "0")}`,
  code: "FM-SAA-002",
  rev: "00",
  eff: "26-01-16",
  title:
    i % 5 === 0
      ? "Data Mining Course Syllabi 26-27"
      : i % 5 === 1
      ? "Web Technologies Course Syllabi 26-27"
      : i % 5 === 2
      ? "Special Topics 1 Course Syllabi 26-27"
      : i % 5 === 3
      ? "Human Computer Interaction Course Syllabi"
      : "Computer Architecture Course Syllabi",
  ownedBy:
    i % 5 === 0
      ? "Daniela Torres"
      : i % 5 === 1
      ? "Sarah Dela Cruz"
      : i % 5 === 2
      ? "Sarah Dela Cruz"
      : i % 5 === 3
      ? "Oliver Bearman"
      : "Alisha Cruz",
  due: "26-01-10",
  status: "Published",
}));

export default function DeanDocumentWorkflow() {
  const user = useUser();
  const navigate = useNavigate();

  const [tab, setTab] = useState("submitted"); // submitted | published
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("Recent"); // Recent | A-Z | Z-A

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
            navigate(`/dean/documents/${row.id}`, { state: { from: "workflow" } })
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
            navigate(`/dean/documents/${row.id}`, { state: { from: "workflow" } })
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

        {/* WRAPPER + MAIN SPACING MATCH Dean Documents */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-8 mx-6 mt-8 rounded-xl">
          <main className="p-10 flex-1 overflow-y-auto">
            {/* Title block (same margin + underline) */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-widest uppercase">
                {tab === "submitted" ? "SUBMITTED FORMS" : "PUBLISHED FORMS"}
              </h1>
              <div className="w-28 h-1 bg-yellow-400 mt-2 rounded" />
            </div>

            {/* Controls row */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-6">
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
            <div className="mb-6">
              <div className="inline-flex bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => {
                    setTab("submitted");
                    pagination.handlePage(1);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    tab === "submitted" ? "bg-white shadow text-[#0035DA]" : "text-gray-600"
                  }`}
                >
                  Submitted
                </button>
                <button
                  onClick={() => {
                    setTab("published");
                    pagination.handlePage(1);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    tab === "published" ? "bg-white shadow text-[#0035DA]" : "text-gray-600"
                  }`}
                >
                  Published
                </button>
              </div>
            </div>

            {/* Table (placeholders) */}
            <Table columns={columns} data={pageRows} />

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 text-sm">
              <button
                onClick={pagination.handlePrev}
                disabled={pagination.currentPage === 1}
                className={`flex items-center gap-2 px-2 py-1 rounded ${
                  pagination.currentPage === 1 ? "text-gray-400" : "hover:bg-gray-100"
                }`}
              >
                <span className="text-lg">←</span> Previous
              </button>
              <div className="flex items-center gap-1">
                {pagination.getPageNumbers().map((n, idx) =>
                  n === "..." ? (
                    <span key={`dots-${idx}`} className="px-2">
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => pagination.handlePage(n)}
                      className={`h-8 w-8 rounded-full grid place-items-center ${
                        n === pagination.currentPage ? "bg-[#0035DA] text-white" : "hover:bg-gray-100"
                      }`}
                    >
                      {n}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={pagination.handleNext}
                disabled={pagination.currentPage === totalPages}
                className={`flex items-center gap-2 px-2 py-1 rounded ${
                  pagination.currentPage === totalPages ? "text-gray-400" : "hover:bg-gray-100"
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

// ---------- STATUS PILL ----------
function StatusBadge({ type }) {
  const t = String(type).toLowerCase();
  const isPublished = t === "published";
  // Submitted should be green per your spec
  const styles = "bg-green-50 text-green-700 border border-green-200";
  const dot = "bg-green-500";
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${styles}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {isPublished ? "Published" : "Submitted"}
    </span>
  );
}
