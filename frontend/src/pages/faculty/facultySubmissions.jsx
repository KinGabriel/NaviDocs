import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import usePagination from "../../hooks/usePagination";
import Dropdown from "../../components/dropdowns/dropdown";
import SearchBar from "../../components/searchbar";
import { StatusBadge, formatDate } from "../../utils/formatters";
import { 
  Calendar, 
  Clock, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Eye,
  Upload,
  User
} from 'lucide-react';

// Dummy data for submissions - FOR DEMO PURPOSES ONLY
export const MOCK_ASSIGNED_SUBMISSIONS = Array.from({ length: 12 }, (_, i) => {
  const createdDate = new Date('2025-10-01');
  createdDate.setDate(createdDate.getDate() + i * 2);
  
  const deadlineDate = new Date('2025-11-15');
  deadlineDate.setDate(deadlineDate.getDate() + (i * 3) - 15);
  
  const now = new Date();
  const daysUntilDue = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
  
  let status;
  if (i % 5 === 0) {
    status = "submitted";
  } else if (daysUntilDue < 0) {
    status = "overdue";
  } else {
    status = "pending";
  }
  
  return {
    id: i + 1,
    title: `Submission Bin ${i + 1}`,
    instructions: `Please review and provide feedback on the attached documents for submission ${i + 1}. Ensure all requirements are met before the deadline.`,
    assignedBy: "Department Head Luka Doncic",
    assignedAt: createdDate.toISOString(),
    deadline: deadlineDate.toISOString(),
    status: status,
    submittedAt: status === "submitted" ? new Date(deadlineDate.getTime() - 86400000 * 3).toISOString() : null,
    submittedFiles: status === "submitted" ? [
      { name: `Document-${i + 1}.pdf`, size: 2456789, uploadedAt: new Date(deadlineDate.getTime() - 86400000 * 3).toISOString() },
    ] : []
  };
});

const STATUS_FILTERS = ["All Status", "Pending", "Submitted", "Overdue"];
const SORT_OPTIONS = ["Recent", "Due Soon", "Oldest", "A–Z"];

export default function FacultySubmissions() {
  const user = useUser();
  const navigate = useNavigate();
  
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortBy, setSortBy] = useState("Due Soon");

  // Filter and sort
  const filtered = useMemo(() => {
    let rows = [...MOCK_ASSIGNED_SUBMISSIONS];
    
    if (statusFilter !== "All Status") {
      rows = rows.filter(r => r.status.toLowerCase() === statusFilter.toLowerCase());
    }
    
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.assignedBy.toLowerCase().includes(q)
      );
    }
    
    if (sortBy === "Recent") {
      rows.sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));
    } else if (sortBy === "Oldest") {
      rows.sort((a, b) => new Date(a.assignedAt) - new Date(b.assignedAt));
    } else if (sortBy === "Due Soon") {
      rows.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sortBy === "A–Z") {
      rows.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    return rows;
  }, [query, statusFilter, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const pending = MOCK_ASSIGNED_SUBMISSIONS.filter(s => s.status === "pending").length;
    const submitted = MOCK_ASSIGNED_SUBMISSIONS.filter(s => s.status === "submitted").length;
    const overdue = MOCK_ASSIGNED_SUBMISSIONS.filter(s => s.status === "overdue").length;
    
    return { total: MOCK_ASSIGNED_SUBMISSIONS.length, pending, submitted, overdue };
  }, []);

  // Pagination
  const pageSize = 8;
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

  const handleViewSubmission = (submissionId) => {
    navigate(`/faculty/document-workflow/${submissionId}`);
  };

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-4 md:px-8 mx-3 md:mx-6 mt-4 md:mt-8 rounded-xl overflow-x-hidden">
          <div className="flex-1 px-1 py-5">
            
            {/* Header Section */}
            <div className="mb-6">
              <div className="mb-4">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                  My Submission Bins
                </h1>
                <p className="text-gray-600 mt-1">Track and manage your assignments</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={FileText}
                  label="Total Assigned"
                  value={stats.total}
                  color="blue"
                />
                <StatCard
                  icon={Clock}
                  label="Pending"
                  value={stats.pending}
                  color="orange"
                />
                <StatCard
                  icon={CheckCircle}
                  label="Submitted"
                  value={stats.submitted}
                  color="green"
                />
                <StatCard
                  icon={AlertCircle}
                  label="Overdue"
                  value={stats.overdue}
                  color="red"
                />
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <SearchBar
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search submissions by title..."
                  />
                </div>
                <div className="flex gap-3">
                  <Dropdown
                    options={STATUS_FILTERS}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    width="w-40"
                    label="Status"
                    buttonClass="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                  />
                  <Dropdown
                    options={SORT_OPTIONS}
                    value={sortBy}
                    onChange={setSortBy}
                    width="w-36"
                    label="Sort"
                    buttonClass="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Submissions Grid */}
            {pageRows.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No submissions found</h3>
                <p className="text-gray-600">
                  {query || statusFilter !== "All Status"
                    ? "Try adjusting your filters"
                    : "No submissions have been assigned to you yet"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {pageRows.map((submission) => (
                  <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    onView={() => handleViewSubmission(submission.id)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pageRows.length > 0 && (
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
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    red: "bg-red-50 text-red-600 border-red-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function SubmissionCard({ submission, onView }) {
  const daysUntilDue = Math.ceil((new Date(submission.deadline) - new Date()) / (1000 * 60 * 60 * 24));
  const isOverdue = submission.status === "overdue";
  const isSubmitted = submission.status === "submitted";

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300 overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
              {submission.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User size={14} className="text-gray-400" />
              <span>Assigned by {submission.assignedBy}</span>
            </div>
          </div>
          <StatusBadge type={submission.status} />
        </div>

        {/* Instructions */}
        {submission.instructions && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {submission.instructions}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={16} className="text-gray-400" />
            <span>Due {formatDate(submission.deadline)}</span>
            {!isSubmitted && daysUntilDue > 0 && daysUntilDue <= 3 && (
              <span className="text-orange-600 font-semibold">({daysUntilDue}d left)</span>
            )}
            {isOverdue && (
              <span className="text-red-600 font-semibold">(Overdue)</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock size={16} className="text-gray-400" />
            <span>Assigned {formatDate(submission.assignedAt)}</span>
          </div>
          <button
            onClick={onView}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
              isSubmitted
                ? "bg-gray-600 text-white hover:bg-gray-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isSubmitted ? (
              <>
                <Eye size={16} />
                View Submission
              </>
            ) : (
              <>
                <Upload size={16} />
                Submit Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}