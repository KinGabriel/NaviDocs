import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import { StatusBadge, formatDate, formatDateTime } from "../../utils/formatters";
import SelectDocumentsModal from "../../components/modals/selectDocumentsModal"; 
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  FileText,
  Plus,
  X,
  Upload,
  CheckCircle,
} from "lucide-react";
import { getSubmissionBinAPI, submitSubmissionDocumentAPI } from "../../api/assignmentDocumentsAPI";

export default function FacultySubmissionView() {
  const user = useUser();
  const navigate = useNavigate();
  const { id } = useParams();
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bin, setBin] = useState(null);
  const [assignedItem, setAssignedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the bin by ID and find the student's/faculty's assigned submission item
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getSubmissionBinAPI(id);
        if (!mounted) return;
        setBin(data);
        const uid = user?._id || user?.id;
        const item = Array.isArray(data?.submissions)
          ? data.submissions.find(s => String(s.faculty) === String(uid))
          : null;
        setAssignedItem(item || null);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load submission bin");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [id, user?._id, user?.id]);

  // If submission not found
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} />
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <FileText size={64} className="text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading…</h2>
            <p className="text-gray-600">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  if (!bin || !assignedItem) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} />
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <FileText size={64} className="text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Not Found</h2>
            <p className="text-gray-600 mb-6">{error || "The submission you're looking for doesn't exist."}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const submission = useMemo(() => {
    const assignedAt = bin?.createdAt || bin?.created_at;
    const deadline = bin?.deadline || null;
    const status = assignedItem?.status || 'assigned';
    const submittedAt = assignedItem?.submitted_at || null;
    return {
      id: assignedItem?._id,
      title: bin?.title || 'Submission',
      instructions: assignedItem?.instructions || bin?.instructions || '',
      assignedBy: 'Department Head',
      assignedAt,
      deadline,
      status,
      submittedAt,
      submittedFiles: [],
    };
  }, [assignedItem, bin]);

  const daysUntilDue = Math.ceil(((submission.deadline ? new Date(submission.deadline) : new Date()) - new Date()) / (1000 * 60 * 60 * 24));
  const isOverdue = !!submission.deadline && new Date(submission.deadline) < new Date() && submission.status !== 'submitted';
  const isSubmitted = submission.status === "submitted";

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getTotalSize = () => {
    const total = selectedFiles.reduce((acc, file) => acc + file.size, 0);
    return formatFileSize(total);
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select at least one document to submit");
      return;
    }

    setIsSubmitting(true);

    try {
      const first = selectedFiles[0];
      const docId = first?._id || first?.id;
      if (!docId) throw new Error('Selected document has no id');
      await submitSubmissionDocumentAPI(bin?._id || id, assignedItem?._id, { documentId: docId });
      alert('Submission successful!');
      navigate(-1);
    } catch (e) {
      alert(e?.responseData?.message || e?.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => navigate(-1);

  const handleViewSubmission = (submissionId) => {
  navigate(`/submissions/${submissionId}`);
  };


  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <div className="flex-1 flex flex-col bg-white shadow pt-1 pb-4 px-4 md:px-8 mx-3 md:mx-6 mt-4 md:mt-8 rounded-xl overflow-x-hidden">
          <div className="flex-1 px-1 py-5">
            
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="inline-flex items-center px-4 py-2 gap-2 text-[#0035DA] hover:bg-blue-50 rounded-lg mb-6 font-medium transition-colors"
            >
              <ArrowLeft size={20} />
              Back
            </button>

            {/* Header Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText size={24} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {submission.title}
                      </h1>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User size={16} />
                          <span>Assigned by <span className="font-medium">{submission.assignedBy}</span></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={16} />
                          <span>Assigned {formatDate(submission.assignedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{submission.points}</div>
                  </div>
                  <StatusBadge type={submission.status} />
                </div>
              </div>

              {/* Instructions and Deadline */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Instructions Banner */}
                {submission.instructions && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Instructions:</p>
                    <p className="text-sm text-gray-600">{submission.instructions}</p>
                  </div>
                )}

                {/* Deadline Banner */}
                <div
                  className={`p-4 rounded-lg flex items-center gap-3 ${
                    isOverdue
                      ? "bg-red-50 border border-red-200"
                      : daysUntilDue <= 3
                      ? "bg-orange-50 border border-orange-200"
                      : "bg-blue-50 border border-blue-200"
                  }`}
                >
                  <Calendar
                    size={20}
                    className={
                      isOverdue
                        ? "text-red-600"
                        : daysUntilDue <= 3
                        ? "text-orange-600"
                        : "text-blue-600"
                    }
                  />
                  <div className="flex-1">
                    <p
                      className={`font-semibold ${
                        isOverdue
                          ? "text-red-900"
                          : daysUntilDue <= 3
                          ? "text-orange-900"
                          : "text-blue-900"
                      }`}
                    >
                      Due {formatDateTime(submission.deadline)}
                    </p>
                    <p
                      className={`text-sm ${
                        isOverdue
                          ? "text-red-700"
                          : daysUntilDue <= 3
                          ? "text-orange-700"
                          : "text-blue-700"
                      }`}
                    >
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Content */}
            {isSubmitted ? (
              /* Already Submitted View */
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Submission Completed</h3>
                    <p className="text-sm text-gray-600">Submitted on {formatDateTime(submission.submittedAt)}</p>
                  </div>
                </div>

                {submission.submissionMessage && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Your Comment:</p>
                    <p className="text-sm text-gray-600">{submission.submissionMessage}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Submitted Files:</h4>
                  {submission.submittedFiles.map((file, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText size={20} className="text-blue-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatFileSize(file.size)} • Uploaded {formatDateTime(file.uploadedAt)}
                          </div>
                        </div>
                      </div>
                      <button
                            className="inline-flex items-center justify-center px-4 py-1.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                            onClick={() => handleViewSubmission(submission.id)}
                        >
                      View
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Upload Form */
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Plus size={20} className="text-blue-600" />
                  Submit Your Work
                </h3>

                {/* File Upload Section */}
             <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Documents <span className="text-red-500">*</span>
              </label>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition">
                <Plus size={48} className="text-gray-400 mb-3 mx-auto" />
                <p className="text-sm text-gray-600 mb-4">
                  Choose documents from your library to submit
                </p>
                <button
                  type="button"
                  onClick={() => setShowDocumentModal(true)}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <FileText size={18} />
                  Browse Documents
                </button>
              </div>

              {/* Selected Documents List */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Selected Documents ({selectedFiles.length})
                    </span>
                  </div>
                  
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText size={20} className="text-blue-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {file.title || file.name || 'Untitled Document'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {file.school && `${file.school} • `}
                            {file.status || 'Document'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="ml-3 text-gray-400 hover:text-red-600 flex-shrink-0 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

                {/* Message */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add a comment (optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add any notes or comments..."
                    rows="4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This message will be visible to the reviewer
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    onClick={handleBack}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || selectedFiles.length === 0}
                    className={`px-6 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                      isSubmitting || selectedFiles.length === 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        Submit Work
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Select Documents Modal */ }
      <SelectDocumentsModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        onSelectDocuments={(docs) => {
          setSelectedFiles(docs);
        }}
        userId={user?._id || user?.id}
      />
    </div>
  );
}