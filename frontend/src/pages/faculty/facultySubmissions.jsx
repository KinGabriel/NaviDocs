import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import usePagination from "../../hooks/usePagination";
import Dropdown from "../../components/dropdowns/dropdown";
import SearchBar from "../../components/searchbar";
import { StatusBadge, formatDate } from "../../utils/formatters";
import Loader from "../../components/loader";
import { listSubmissionBinsAPI} from "../../api/assignmentDocumentsAPI";
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


const STATUS_FILTERS = ["All Status", "Pending", "Submitted", "Overdue"];
const SORT_OPTIONS = ["Recent", "Due Soon", "Oldest", "A–Z"];

export default function FacultySubmissions() {
  const user = useUser();
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);  
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortBy, setSortBy] = useState("Recent");
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch ALL bins and filter on frontend
        const response = await listSubmissionBinsAPI();
        
        const bins = Array.isArray(response) ? response : (response.data || []);
        
        // Transform bins into submission items for the current user
        const transformedSubmissions = bins.flatMap(bin => {
                 
          // Find submissions in this bin that belong to current user
          const userSubmissions = (bin.submissions || []).filter(sub => {
            const facultyId = sub.faculty?._id || sub.faculty?.id || sub.faculty;
            const userId = user?._id || user?.id;
            
            return facultyId === userId;
          });
          
          return userSubmissions.map(sub => {
            // Determine status
            let status = 'pending';
            if (sub.document && sub.submitted_at) {
              status = 'submitted';
            } else if (new Date(bin.deadline) < new Date()) {
              status = 'overdue';
            }
            
            return {
              id: sub._id || sub.id,
              binId: bin._id || bin.id,
              title: bin.title || 'Submission Bin',
              instructions: sub.instructions || bin.instructions || '',
              assignedBy: bin.createdBy?.name || bin.createdBy?.email || "Department Head",
              assignedAt: bin.createdAt || new Date().toISOString(),
              deadline: bin.deadline || new Date().toISOString(),
              status: status,
              submittedAt: sub.submitted_at || null,
              submittedFiles: sub.document ? [{ 
                id: sub.document,
                name: 'Document.pdf', 
                uploadedAt: sub.submitted_at 
              }] : [],
              templateId: sub.template,
              documentId: sub.document
            };
          });
        });
        
        setSubmissions(transformedSubmissions);
      } catch (err) {
        console.error('Failed to fetch submissions:', err);
        setError(err.message || 'Failed to load submissions');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSubmissions();
    }
  }, [user]);

  // Filter and sort
  const filtered = useMemo(() => {
    let rows = [...submissions];
    
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
  }, [query, statusFilter, sortBy, submissions]);

  // Stats
  const stats = useMemo(() => {
  const pending = submissions.filter(s => s.status === "pending").length; 
  const submitted = submissions.filter(s => s.status === "submitted").length;
  const overdue = submissions.filter(s => s.status === "overdue").length;
  
  return { total: submissions.length, pending, submitted, overdue };
  }, [submissions]); 

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

  const handleViewSubmission = (binId, submissionId) => {
    navigate(`/faculty/document-workflow/${binId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader message="Loading submissions..." />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);

    if (files.length === 0) return;
    
    // Add files directly 
    setUploadedFiles(prev => [
      ...prev,
      ...files.map((file, index) => ({
        id: Date.now() + index,
        file: file,
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString()
      }))
    ]);
  };

  // Remove file handler
  const handleRemoveFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSubmitFiles = async () => {
    if (uploadedFiles.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      uploadedFiles.forEach((fileObj) => {
        formData.append('files', fileObj.file);
      });
      formData.append('submissionId', id);
      
      // TODO: Replace with your actual API call
      
      // Simulate API call for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update submission state
      setSubmission(prev => ({
        ...prev,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        files: uploadedFiles.map(f => ({
          id: f.id,
          name: f.name,
          size: f.size,
          uploadedAt: f.uploadedAt,
          url: `/uploaded/${f.name}` 
        }))
      }));
      
      setUploadedFiles([]);
      alert('Files submitted successfully!');
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
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
                    onView={() => handleViewSubmission(submission.binId, submission.id)}
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
        <div className="mb-4 min-h-[2.5rem]">
          {submission.instructions ? (
            <p className="text-sm text-gray-600 line-clamp-2">
              {submission.instructions}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No instructions provided
            </p>
          )}
        </div>

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