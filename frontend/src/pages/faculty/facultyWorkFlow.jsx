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
import React, { useState, useEffect, useMemo } from "react";
import { FileText, Clock, CheckCircle, Send, Eye, AlertCircle, Filter, Grid, List, Search, ChevronDown } from "lucide-react";

// Mock user data
const mockUser = {
  name: "Faculty User",
  role: "faculty",
  department: "Computer Science"
};

// Placeholder documents with different statuses
const PLACEHOLDER_DOCS = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  code: `FM-CS-${String(i + 1).padStart(3, '0')}`,
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
  currentHolder: i % 4 === 1 ? "Department Head" : i % 4 === 2 ? "Secretary" : null
}));

const SORT_OPTIONS = ["Recent", "A–Z", "Z–A", "Status"];
const STATUS_FILTERS = ["All", "Draft", "Submitted", "Published", "Pending Review"];

export default function FacultyWorkflow() {
  const [user] = useState(mockUser);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("Recent");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Filter documents based on tab and filters
  const filteredDocs = useMemo(() => {
    let docs = [...PLACEHOLDER_DOCS];

    // Tab filtering
    if (tab === "draft") {
      docs = docs.filter(d => d.status === "Draft");
    } else if (tab === "submitted") {
      docs = docs.filter(d => d.status === "Submitted" || d.status === "Pending Review");
    } else if (tab === "published") {
      docs = docs.filter(d => d.status === "Published");
    }

    // Status filter
    if (statusFilter !== "All") {
      docs = docs.filter(d => d.status === statusFilter);
    }

    // Search
    if (query.trim()) {
      const q = query.toLowerCase();
      docs = docs.filter(d =>
        d.code.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.createdBy.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === "A–Z") {
      docs.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "Z–A") {
      docs.sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortBy === "Status") {
      docs.sort((a, b) => a.status.localeCompare(b.status));
    }

    return docs;
  }, [tab, query, sortBy, statusFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Document Workflow</h1>
              <p className="text-sm text-gray-600 mt-1">Manage and track your documents</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.department}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<FileText className="w-6 h-6" />}
            label="Total Documents"
            value={PLACEHOLDER_DOCS.length}
            color="blue"
          />
          <StatCard
            icon={<Clock className="w-6 h-6" />}
            label="Drafts"
            value={PLACEHOLDER_DOCS.filter(d => d.status === "Draft").length}
            color="yellow"
          />
          <StatCard
            icon={<Send className="w-6 h-6" />}
            label="Submitted"
            value={PLACEHOLDER_DOCS.filter(d => d.status === "Submitted").length}
            color="purple"
          />
          <StatCard
            icon={<CheckCircle className="w-6 h-6" />}
            label="Published"
            value={PLACEHOLDER_DOCS.filter(d => d.status === "Published").length}
            color="green"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <TabButton
              active={tab === "all"}
              onClick={() => setTab("all")}
              label="All Documents"
            />
            <TabButton
              active={tab === "draft"}
              onClick={() => setTab("draft")}
              label="Drafts"
              count={PLACEHOLDER_DOCS.filter(d => d.status === "Draft").length}
            />
            <TabButton
              active={tab === "submitted"}
              onClick={() => setTab("submitted")}
              label="Submitted"
              count={PLACEHOLDER_DOCS.filter(d => d.status === "Submitted" || d.status === "Pending Review").length}
            />
            <TabButton
              active={tab === "published"}
              onClick={() => setTab("published")}
              label="Published"
              count={PLACEHOLDER_DOCS.filter(d => d.status === "Published").length}
            />
          </div>

          {/* Controls */}
          <div className="p-4 flex flex-wrap items-center gap-3 bg-gray-50">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>

            {/* Filters */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {STATUS_FILTERS.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="flex bg-white border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2.5 ${viewMode === "grid" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2.5 border-l border-gray-300 ${viewMode === "list" ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Documents Display */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map(doc => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onView={() => setSelectedDoc(doc)}
                onSubmit={() => {
                  setSelectedDoc(doc);
                  setShowSubmitModal(true);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Created By</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDocs.map(doc => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onView={() => setSelectedDoc(doc)}
                    onSubmit={() => {
                      setSelectedDoc(doc);
                      setShowSubmitModal(true);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredDocs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-500">Try adjusting your filters or search query</p>
          </div>
        )}
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

function StatCard({ icon, label, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    green: "bg-green-50 text-green-600 border-green-200"
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg border ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-6 py-4 text-sm font-medium transition-colors relative ${
        active
          ? "text-blue-600 bg-blue-50"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
          active ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-700"
        }`}>
          {count}
        </span>
      )}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
      )}
    </button>
  );
}

function DocumentCard({ doc, onView, onSubmit }) {
  const statusColors = {
    "Draft": "bg-yellow-50 text-yellow-700 border-yellow-200",
    "Submitted": "bg-blue-50 text-blue-700 border-blue-200",
    "Published": "bg-green-50 text-green-700 border-green-200",
    "Pending Review": "bg-purple-50 text-purple-700 border-purple-200"
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-mono text-gray-600">{doc.code}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{doc.title}</h3>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <span className="w-20 font-medium">Revision:</span>
            <span>{doc.rev}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <span className="w-20 font-medium">Created:</span>
            <span>{doc.createdBy}</span>
          </div>
          {doc.currentHolder && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="w-20 font-medium">With:</span>
              <span className="font-medium text-blue-600">{doc.currentHolder}</span>
            </div>
          )}
        </div>

        <div className="mb-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[doc.status]}`}>
            {doc.status}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onView}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
          {doc.status === "Draft" && (
            <button
              onClick={onSubmit}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentRow({ doc, onView, onSubmit }) {
  const statusColors = {
    "Draft": "bg-yellow-50 text-yellow-700 border-yellow-200",
    "Submitted": "bg-blue-50 text-blue-700 border-blue-200",
    "Published": "bg-green-50 text-green-700 border-green-200",
    "Pending Review": "bg-purple-50 text-purple-700 border-purple-200"
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm font-mono text-gray-900">{doc.code}</td>
      <td className="px-6 py-4 text-sm text-gray-900">{doc.title}</td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[doc.status]}`}>
          {doc.status}
        </span>
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">{doc.createdBy}</td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <button
            onClick={onView}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            View
          </button>
          {doc.status === "Draft" && (
            <button
              onClick={onSubmit}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Submit
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function SubmitModal({ doc, onClose }) {
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");

  const recipients = [
    { value: "dept-head", label: "Department Head", description: "Submit to your department head for review" },
    { value: "secretary", label: "Secretary", description: "Submit directly to the secretary" },
    { value: "dean", label: "Dean", description: "Submit directly to the dean" }
  ];

  const handleSubmit = () => {
    if (!recipient) {
      alert("Please select a recipient");
      return;
    }
    
    alert(`Document "${doc.title}" submitted to ${recipients.find(r => r.value === recipient)?.label}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Submit Document</h2>
              <p className="text-sm text-gray-600 mt-1">Choose who to submit this document to</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                <p className="text-sm text-gray-600">Code: {doc.code} • Rev: {doc.rev}</p>
              </div>
            </div>
          </div>

          {/* Recipient Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Select Recipient <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {recipients.map(r => (
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
                  You can also submit directly to Secretary or Dean if needed.
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