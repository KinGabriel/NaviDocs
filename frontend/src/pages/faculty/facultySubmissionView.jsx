import React, { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../layout/headers/header";
import Sidebar from "../../layout/sidebars/sidebar";
import useUser from "../../hooks/useUser";
import { StatusBadge, formatDate, formatDateTime } from "../../utils/formatters";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  FileText,
  Upload,
  X,
  CheckCircle,
  Download,
  AlertCircle
} from "lucide-react";

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

export default function FacultySubmissionView() {
  const user = useUser();
  const navigate = useNavigate();
  const { id } = useParams();

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find the submission by ID
  const submission = useMemo(() => 
    MOCK_ASSIGNED_SUBMISSIONS.find(s => s.id === parseInt(id)),
    [id]
  );

  // If submission not found
  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} />
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <FileText size={64} className="text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Not Found</h2>
            <p className="text-gray-600 mb-6">The submission you're looking for doesn't exist.</p>
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

  const daysUntilDue = Math.ceil((new Date(submission.deadline) - new Date()) / (1000 * 60 * 60 * 24));
  const isOverdue = submission.status === "overdue";
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
      alert("Please select at least one file to submit");
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      const fileNames = selectedFiles.map(f => f.name).join(', ');
      alert(
        `Submission successful!\n\nFiles: ${fileNames}\nTotal: ${selectedFiles.length} file(s)\nConverted to: PDF\nMessage: ${message || "None"}`
      );
      setIsSubmitting(false);
      navigate(-1);
    }, 2000);
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
                      {isOverdue
                        ? `Overdue by ${Math.abs(daysUntilDue)} day${
                            Math.abs(daysUntilDue) !== 1 ? "s" : ""
                          }`
                        : `${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""} remaining`}
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
                  <Upload size={20} className="text-blue-600" />
                  Submit Your Work
                </h3>

                {/* Warning for overdue */}
                {isOverdue && (
                  <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-900">
                        <p className="font-medium">This submission is overdue</p>
                        <p className="text-red-700">Please submit as soon as possible to avoid further penalties.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* File Upload Area */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Documents <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      accept=".doc,.docx,.txt,.xlsx,.xls"
                      multiple
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload size={48} className="text-gray-400 mb-3" />
                      <span className="text-sm font-medium text-gray-700">
                        Click to upload 
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        DOC, DOCX, TXT, XLSX (will be converted to PDF)
                      </span>
                    </label>
                  </div>

                  {/* Selected Files List */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Selected Files ({selectedFiles.length})
                        </span>
                        <span className="text-xs text-gray-500">
                          Total: {getTotalSize()}
                        </span>
                      </div>
                      
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText size={20} className="text-blue-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatFileSize(file.size)} • Ready for PDF conversion
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

                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600">
                    <strong>Note:</strong> All uploaded documents will be automatically converted to PDF format. Once submitted, you cannot edit your submission. Please review all files before submitting.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}