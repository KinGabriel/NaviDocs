import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import usePagination from "../../hooks/usePagination";
import Dropdown from "../../components/dropdowns/dropdown";
import SearchBar from "../../components/searchbar";
import TaskAssignmentModal from "../../components/modals/taskAssignmentModal";
import { StatusBadge, formatDate } from "../../utils/formatters";
import { Plus, Calendar, Users, FileText, Clock, CheckCircle, AlertCircle, Eye, TrendingUp } from 'lucide-react';

// Dummy data for submissions - FOR DEMO PURPOSES ONLY
const MOCK_SUBMISSIONS = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  title: `Submission Bin Title ${i + 1}`,
  instructions: "Please review and provide feedback on the attached documents.",
  createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
  deadline: new Date(Date.now() + Math.random() * 10000000000).toISOString(),
  assignedTo: Math.floor(Math.random() * 5) + 1,
  submitted: Math.floor(Math.random() * 4),
  status: i % 4 === 0 ? "overdue" : i % 4 === 1 ? "active" : i % 4 === 2 ? "completed" : "draft",
}));

const STATUS_OPTIONS = ["All Status", "Active", "Completed", "Overdue", "Draft"];
const SORT_OPTIONS = ["Recent", "Oldest", "Due Soon", "A–Z"];

export default function SecretarySubmissions() {
  const user = useUser();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortBy, setSortBy] = useState("Recent");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  // Filter and sort submissions
  const filtered = useMemo(() => {
    let rows = [...MOCK_SUBMISSIONS];
    
    // Status filter
    if (statusFilter !== "All Status") {
      rows = rows.filter(r => r.status.toLowerCase() === statusFilter.toLowerCase());
    }
    
    // Search filter
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(r =>
        r.title.toLowerCase().includes(q)
      );
    }
    
    // Sort
    if (sortBy === "Recent") {
      rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === "Oldest") {
      rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === "Due Soon") {
      rows.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    } else if (sortBy === "A–Z") {
      rows.sort((a, b) => a.title.localeCompare(b.title));
    }
    
    return rows;
  }, [query, statusFilter, sortBy]);

  // Stats calculation
  const stats = useMemo(() => {
    const active = MOCK_SUBMISSIONS.filter(s => s.status === "active").length;
    const completed = MOCK_SUBMISSIONS.filter(s => s.status === "completed").length;
    const overdue = MOCK_SUBMISSIONS.filter(s => s.status === "overdue").length;
    const totalAssigned = MOCK_SUBMISSIONS.reduce((sum, s) => sum + s.assignedTo, 0);
    
    return { active, completed, overdue, totalAssigned };
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
    navigate(`/submission-details/${submissionId}`);
  };

  const handleAssignComplete = (result) => {
    console.log("Assignment created:", result);
    setShowAssignModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-3 mx-6 mt-8 rounded-xl">
          <div className="w-full px-4 max-w-8xl">
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {/* Header Section */}
            <div className="mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                    Submission Bin
                  </h1>
                  <p className="text-gray-600 mt-1">Manage and track all document submissions</p>
                </div>
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Plus size={20} />
                  Assign a Submission
                </button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={TrendingUp}
                  label="Active"
                  value={stats.active}
                  color="blue"
                />
                <StatCard
                  icon={CheckCircle}
                  label="Completed"
                  value={stats.completed}
                  color="green"
                />
                <StatCard
                  icon={AlertCircle}
                  label="Overdue"
                  value={stats.overdue}
                  color="red"
                />
                <StatCard
                  icon={Users}
                  label="Total Assigned"
                  value={stats.totalAssigned}
                  color="purple"
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
                    placeholder="Search submissions by title or creator..."
                  />
                </div>
                <div className="flex gap-3">
                  <Dropdown
                    options={STATUS_OPTIONS}
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
                <p className="text-gray-600 mb-6">
                  {query || statusFilter !== "All Status"
                    ? "Try adjusting your filters"
                    : "Create your first submission to get started"}
                </p>
                {!query && statusFilter === "All Status" && (
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={20} />
                    Create New Submission
                  </button>
                )}
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
          </main>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 backdrop-blur-[2px] bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <TaskAssignmentModal
              templateId={selectedSubmissionId}
              isOpen={showAssignModal}
              onClose={() => setShowAssignModal(false)}
              onAssign={handleAssignComplete}
            />
          </div>
        </div>
      )}
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
    purple: "bg-purple-50 text-purple-600 border-purple-100",
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all hover:border-blue-300 overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
              {submission.title}
            </h3>
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
            {daysUntilDue > 0 && daysUntilDue <= 3 && (
              <span className="text-orange-600 font-semibold">({daysUntilDue}d left)</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock size={16} className="text-gray-400" />
            <span>Created {formatDate(submission.createdAt)}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Submission Progress</span>
            <span className="text-sm font-semibold text-gray-900">
              {submission.submitted}/{submission.assignedTo}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all"
              style={{ width: `${(submission.submitted / submission.assignedTo) * 100}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users size={16} className="text-gray-400" />
            <span>{submission.assignedTo} assigned</span>
          </div>
          <button
            onClick={onView}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Eye size={16} />
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}