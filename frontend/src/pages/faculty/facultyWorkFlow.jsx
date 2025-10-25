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
import { StatusBadge} from '../../utils/formatters';
import { FileText, Send, AlertCircle } from "lucide-react";

// Placeholder documents with different statuses
const PLACEHOLDER_DOCS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  code: `FM-CS-${String(i + 1).padStart(3, "0")}`,
  rev: `0${i % 3}`,
  eff: "2025-01-15",
  title: `Document Title ${i + 1}`,
  createdBy: i % 3 === 0 ? "John Doe" : i % 3 === 1 ? "Jane Smith" : "Mike Johnson",
  ownedBy: i % 2 === 0 ? "Dept Head" : "Dean",
  due: "2025-12-31",
  status: i % 4 === 0 ? "Draft" : i % 4 === 1 ? "Submitted" : i % 4 === 2 ? "Published" : "Pending Review",
  pdfUrl: `/documents/${i + 1}.pdf`,
  submittedTo: i % 3 === 0 ? "Department Head" : i % 3 === 1 ? "Secretary" : "Dean",
  submittedDate: "2025-10-20",
  currentHolder: i % 4 === 1 ? "Department Head" : i % 4 === 2 ? "Secretary" : null,
}));

const SORT_OPTIONS = ["Recent", "A–Z", "Z–A", "Status"];
const STATUS_FILTERS = ["All", "Draft", "Submitted", "Published", "Pending Review"];

export default function FacultyWorkflow() {
  const user = useUser();
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("Recent");
  const [statusFilter, setStatusFilter] = useState("All");
  const [creatorFilter, setcreatorFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Filter base rows by tab
  const baseRows = useMemo(() => {
    if (tab === "draft") {
      return PLACEHOLDER_DOCS.filter((r) => r.status === "Draft");
    } else if (tab === "submitted") {
      return PLACEHOLDER_DOCS.filter((r) => r.status === "Submitted" || r.status === "Pending Review");
    } else if (tab === "published") {
      return PLACEHOLDER_DOCS.filter((r) => r.status === "Published");
    }
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

    // Status filter
    if (statusFilter !== "All") {
      rows = rows.filter((r) => r.status === statusFilter);
    }

    // creator filter
    if (creatorFilter !== "All") {
      rows = rows.filter((r) => r.createdBy === creatorFilter);
    }

    // Search
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) =>
        (r.code + r.title + r.createdBy).toLowerCase().includes(q)
      );
    }

    // Sort
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
    () =>
      filtered.slice(
        (pagination.currentPage - 1) * pageSize,
        pagination.currentPage * pageSize
      ),
    [filtered, pagination.currentPage]
  );

  // Dynamic columns for table view
  const columns = useMemo(() => {
    return [
      { key: "code", label: "Document Code" },
      { key: "rev", label: "Rev" },
      { key: "eff", label: "Effectivity" },
      { key: "title", label: "Title" },
      { key: "createdBy", label: "Created By" },
      {
        key: "currentHolder",
        label: "Current Holder",
        render: (row) => row.currentHolder ? (
          <span className="text-blue-600 font-medium">{row.currentHolder}</span>
        ) : (
          <span className="text-gray-400">—</span>
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
                navigate(`/document-controller/document-workflow/${row.id}`, {
                  state: { from: "workflow", doc: row },
                })
              }
              className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
            >
              View
            </button>
            {row.status === "Draft" && (
              <button
                onClick={() => {
                  setSelectedDoc(row);
                  setShowSubmitModal(true);
                }}
                className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Submit
              </button>
            )}
          </div>
        ),
      },
    ];
  }, [navigate]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: PLACEHOLDER_DOCS.length,
    drafts: PLACEHOLDER_DOCS.filter((d) => d.status === "Draft").length,
    submitted: PLACEHOLDER_DOCS.filter((d) => d.status === "Submitted" || d.status === "Pending Review").length,
    published: PLACEHOLDER_DOCS.filter((d) => d.status === "Published").length,
  }), []);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />

        {/* Main content wrapper */}
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-3 mx-6 mt-8 rounded-xl">
          <main className="p-5 flex-1 overflow-y-auto">
            {/* Heading */}
            <div className="flex-1 px-1 py-3 mb-2">
              <h1 className="text-3xl font-bold tracking-widest uppercase">
                DOCUMENT WORKFLOW
              </h1>
               <p className="text-sm text-gray-600 mb-2 ">Manage and track your documents</p>
              <div className="w-28 h-1 bg-yellow-400 rounded" />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-end gap-2 mb-3">
              {/* Status Filter */}
              <Dropdown
                options={STATUS_FILTERS}
                value={statusFilter}
                onChange={setStatusFilter}
                width="w-48"
                label="Status"
                buttonClass="bg-[#0035DA] hover:bg-[#043485] text-white"
              />

              {/* creator filter */}
              <Dropdown
                options={creatorOptions}
                value={creatorFilter}
                onChange={setcreatorFilter}
                width="w-48"
                label="creator"
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
                  placeholder="Search documents..."
                />
              </div>

              {/* View toggle */}
              <ViewToggle mode={viewMode} onChange={setViewMode} />
            </div>

            {/* Tabs */}
            <div className="mb-4 border-b border-gray-200">
              <div className="flex space-x-8">
                <TabButton
                  active={tab === "all"}
                  onClick={() => setTab("all")}
                  label="All Documents"
                  count={PLACEHOLDER_DOCS.length}
                />
                <TabButton
                  active={tab === "draft"}
                  onClick={() => setTab("draft")}
                  label="Drafts"
                  count={stats.drafts}
                />
                <TabButton
                  active={tab === "submitted"}
                  onClick={() => setTab("submitted")}
                  label="Submitted"
                  count={stats.submitted}
                />
                <TabButton
                  active={tab === "published"}
                  onClick={() => setTab("published")}
                  label="Published"
                  count={stats.published}
                />
              </div>
            </div>

           {/* Table or Grid View */}
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
                    currentHolder: row.currentHolder,
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
                      showSubmitButton={row.status === "Draft"}
                      onSubmit={() => {
                        setSelectedDoc(row);
                        setShowSubmitModal(true);
                      }}
                    />
                  );
                })}
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

            {/* Pagination Controls */}
            {filtered.length > 0 && (
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
            )}
          </main>
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && selectedDoc && (
        <SubmitModal
          doc={selectedDoc}
          onClose={() => {
            setShowSubmitModal(false);
            setSelectedDoc(null);
          }}
        />
      )}
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 relative ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
        className={`px-3 py-2 flex items-center ${
          isTable ? "bg-blue-100 text-blue-700" : "bg-white text-gray-700"
        }`}
        aria-label="List view"
        title="List view"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
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

// Submit Modal Component
function SubmitModal({ doc, onClose }) {
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");

  const recipients = [
    {
      value: "dept-head",
      label: "Department Head",
      description: "Submit to your department head for review",
    },
    {
      value: "secretary",
      label: "Secretary",
      description: "Submit directly to the secretary",
    },
    {
      value: "dean",
      label: "Dean",
      description: "Submit directly to the dean",
    },
  ];

  const handleSubmit = () => {
    if (!recipient) {
      alert("Please select a recipient");
      return;
    }

    alert(
      `Document "${doc.title}" submitted to ${
        recipients.find((r) => r.value === recipient)?.label
      }`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-[2px] bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Submit Document</h2>
              <p className="text-sm text-gray-600 mt-1">
                Choose who to submit this document to
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Document Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <FileText className="w-10 h-10 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{doc.title}</h3>
                <p className="text-sm text-gray-600">
                  Code: {doc.code} • Rev: {doc.rev}
                </p>
              </div>
            </div>
          </div>

          {/* Recipient Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Select Recipient <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {recipients.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    recipient === r.value
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="recipient"
                    value={r.value}
                    checked={recipient === r.value}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="mt-1 w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{r.label}</div>
                    <div className="text-sm text-gray-600 mt-0.5">{r.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message for the recipient..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Important Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Submission Flow</h4>
                <p className="text-sm text-blue-800">
                  If you submit to Department Head, they can forward it to Secretary or Dean.
                  You can also submit directly to Secretary or Dean if needed. Document must be
                  in PDF format.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Submit Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}