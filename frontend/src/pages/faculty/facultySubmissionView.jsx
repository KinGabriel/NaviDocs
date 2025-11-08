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
  AlertCircle,
  Eye,
} from "lucide-react";
import { getSubmissionBinAPI, submitSubmissionDocumentAPI } from "../../api/assignmentDocumentsAPI";
import { getTemplateByIdAPI } from "../../api/documentContollerAPI";
import TextEditor from "../../layout/create_template/textEditor";
import Loader from "../../components/loader";

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
  const [templatesInfo, setTemplatesInfo] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTplPreview, setShowTplPreview] = useState(false);
  const [tplToPreview, setTplToPreview] = useState(null);
  const [tplCurrentPage, setTplCurrentPage] = useState(0);

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

  // Load template details
  useEffect(() => {
    const ids = Array.isArray(bin?.template_ids) ? [...new Set(bin.template_ids.map(String))] : [];
    if (!ids.length) { 
      setTemplatesInfo([]); 
      return; 
    }
    
    let cancelled = false;
    (async () => {
      try {
        setLoadingTemplates(true);
        const results = await Promise.allSettled(ids.map(async (id) => {
          try {
            const res = await getTemplateByIdAPI(id);
            const tpl = res?.template || res?.data?.template || res?.data || res;
            return { ...tpl, _id: tpl?._id || tpl?.id || id };
          } catch (e) { 
            return null; 
          }
        }));
        
        if (!cancelled) {
          setTemplatesInfo(results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean));
        }
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    })();
    
    return () => { cancelled = true; };
  }, [bin?.template_ids]);

  const submission = useMemo(() => {
    if (!bin || !assignedItem) return null;

    const assignedAt = bin?.createdAt || bin?.created_at;
    const deadline = bin?.deadline || null;
    const status = assignedItem?.status || 'assigned';
    const submittedAt = assignedItem?.submitted_at || null;
    
    // Ensure submissionMessage is always a string
    const rawMessage = assignedItem?.message || assignedItem?.comment || assignedItem?.notes || '';
    const submissionMessage = typeof rawMessage === 'string' ? rawMessage : String(rawMessage || '');
    
    // Handle multiple documents
    const submittedFiles = assignedItem?.documents || (assignedItem?.document ? [assignedItem.document] : []);
    
    return {
      id: assignedItem?._id,
      title: bin?.title || 'Submission',
      instructions: assignedItem?.instructions || bin?.instructions || '',
      assignedBy: 'Department Head',
      assignedAt,
      deadline,
      status,
      submittedAt,
      submittedFiles, 
      submissionMessage, 
    };
  }, [assignedItem, bin]);

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
      // Extract all document IDs from selected files
      const documentIds = selectedFiles
        .map(file => file._id || file.id)
        .filter(Boolean);
      
      if (documentIds.length === 0) {
        throw new Error('No valid document IDs found in selected files');
      }
      
      // Payload with multiple document IDs
      const payload = {
        documentIds: documentIds // Array of document IDs
      };
      
      // Add message if provided
      if (message.trim()) {
        payload.message = message.trim();
      }
      
      await submitSubmissionDocumentAPI(bin?._id || id, assignedItem?._id, payload);
      
      // Show success message with count
      alert(`Successfully submitted ${documentIds.length} document${documentIds.length !== 1 ? 's' : ''}!`);
      navigate(-1);
    } catch (e) {
      console.error('Submission error:', e);
      alert(e?.responseData?.message || e?.message || 'Failed to submit documents');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => navigate(-1);

  const handleViewSubmission = (submissionId) => {
  navigate(`/submissions/${submissionId}`);
  };

    if (loading) {
    return (
      <div className="min-h-screen bg-gray-200 flex flex-col">
        <Header user={user} />
        <div className="flex flex-1">
          <Sidebar user={user} />
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <FileText size={64} className="text-gray-300 mb-4" />
              <Loader message="Loading..." />
          </div>
        </div>
      </div>
    );
  }

  if (!bin || !assignedItem || !submission) {
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

  const daysUntilDue = Math.ceil(((submission.deadline ? new Date(submission.deadline) : new Date()) - new Date()) / (1000 * 60 * 60 * 24));
  const isOverdue = !!submission.deadline && new Date(submission.deadline) < new Date() && submission.status !== 'submitted';
  const isSubmitted = submission.status === "submitted";

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

          {/* Required Templates Section */}
          {Array.isArray(bin?.template_ids) && bin.template_ids.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-gray-700" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Required Templates for Submission
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  You must submit documents using these templates
                </p>
              </div>

              {loadingTemplates && (
                <div className="flex justify-center py-4">
                  <Loader />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(templatesInfo.length ? templatesInfo : bin.template_ids).map((t) => {
                  const id = typeof t === 'string' ? t : (t._id || t.id);
                  const title = typeof t === 'string' ? String(t) : (t.title || String(id));
                  const docCode = typeof t === 'string' ? '' : (t.document_code || t.docCode || '');
                  const revision = typeof t === 'string' ? '' : (t.revision_no ?? t.revision_number);
                  
                  return (
                    <div 
                      key={String(id)} 
                      className="border border-gray-200 rounded-lg bg-gradient-to-br from-blue-50 to-white p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 mb-2" title={title}>
                          {title}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {docCode && (
                            <span className="text-xs px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md font-medium">
                              {docCode}
                            </span>
                          )}
                          {(revision !== undefined && revision !== null && revision !== '') && (
                            <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-md font-medium">
                              Rev. {String(revision).padStart(2,'0')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => { 
                          setTplToPreview(typeof t === 'string' ? null : t); 
                          setTplCurrentPage(0); 
                          setShowTplPreview(true); 
                        }}
                        disabled={typeof t === 'string'}
                        title={typeof t === 'string' ? 'Loading template details...' : 'Preview template'}
                      >
                        <Eye size={16} />
                        Preview Template
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

              {/* Submission Content */}
              {isSubmitted ? (
              /* Already Submitted View */
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Submission Completed</h3>
                    <p className="text-sm text-gray-600">Submitted on {formatDateTime(submission.submittedAt)}</p>
                  </div>
                </div>

               {/* Display Faculty's Comment */}
                {submission.submissionMessage.trim() && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-2 mb-2">
                      <FileText size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm font-semibold text-gray-900">Your Comment:</p>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap pl-6">
                      {submission.submissionMessage}
                    </p>
                  </div>
                )}

                {/* Display Return Reason (if returned) */}
                {assignedItem?.return_reason && String(assignedItem.return_reason).trim() && (
                  <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertCircle size={18} className="text-orange-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm font-semibold text-gray-900">Return Reason:</p>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap pl-6">
                      {String(assignedItem.return_reason)}
                    </p>
                  </div>
                )}

                {/* Submitted Documents */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700">
                      Submitted Document{submission.submittedFiles.length !== 1 ? 's' : ''} 
                      <span className="ml-2 text-blue-600">({submission.submittedFiles.length})</span>
                    </h4>
                  </div>

                  {submission.submittedFiles.length > 0 ? (
                    <div className="space-y-2">
                      {submission.submittedFiles.map((doc, idx) => {
                        const docId = doc._id || doc.id || doc;
                        const docTitle = doc.title || doc.name || `Document ${idx + 1}`;
                        const docCode = doc.document_code || doc.docCode || '';
                        const school = doc.school || doc.school_identifier || '';
                        const revision = doc.revision_no ?? doc.revision_number;
                        
                        return (
                          <div 
                            key={docId || idx} 
                            className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                                <FileText size={20} className="text-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-900 mb-1">
                                  {docTitle}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {docCode && (
                                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                                      {docCode}
                                    </span>
                                  )}
                                  {(revision !== undefined && revision !== null && revision !== '') && (
                                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                                      Rev. {String(revision).padStart(2,'0')}
                                    </span>
                                  )}
                                  {school && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                                      {school}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors ml-3 flex-shrink-0"
                              onClick={() => {
                                if (typeof docId === "string" || typeof docId === "number") {
                                  handleViewSubmission(docId);
                                } else {
                                  alert("Cannot view this document - invalid ID");
                                }
                              }}
                            >
                              <Eye size={16} className="mr-1" />
                              View
                            </button>

                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 bg-gray-50 rounded-lg border border-gray-200 text-center">
                      <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-600 font-medium">No documents attached</p>
                      <p className="text-sm text-gray-500 mt-1">This submission has no documents</p>
                    </div>
                  )}
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
                        Submitting {selectedFiles.length} document{selectedFiles.length !== 1 ? 's' : ''}...
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        Submit {selectedFiles.length > 0 ? `(${selectedFiles.length}) ` : ''}Document{selectedFiles.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Template Preview Modal */}
        {showTplPreview && tplToPreview && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
            <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-purple-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">Template Preview</h3>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">{tplToPreview.title}</p>
                    <div className="flex flex-wrap gap-2">
                      {tplToPreview.document_code && (
                        <span className="text-xs px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md font-medium">
                          {tplToPreview.document_code}
                        </span>
                      )}
                      {(tplToPreview.revision_number !== undefined || tplToPreview.revision_no !== undefined) && (
                        <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-md font-medium">
                          Rev. {String(tplToPreview.revision_number ?? tplToPreview.revision_no).padStart(2,'0')}
                        </span>
                      )}
                      {(tplToPreview.effectivity || tplToPreview.effectivity_date) && (
                        <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">
                          Eff. {formatDate(tplToPreview.effectivity || tplToPreview.effectivity_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowTplPreview(false)} 
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg p-1 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                {(() => {
                  const baseDoc = tplToPreview?.pages_json?.[0] || { type: 'doc', content: [] };
                  const pageNodes = (baseDoc.content || []).filter((n) => n.type === 'page');
                  const totalPages = pageNodes.length || 0;
                  const pageNode = pageNodes[tplCurrentPage] || pageNodes[0];
                  const contentForEditor = pageNode ? { ...baseDoc, content: [pageNode] } : baseDoc;
                  const src = tplToPreview?.headerConfig || tplToPreview?.logoConfig || tplToPreview?.headerFooter || {};
                  const docCode = tplToPreview?.document_code || tplToPreview?.docCode || src?.documentStamp?.docCode || '';
                  const revisionNo = (tplToPreview?.revision_no ?? tplToPreview?.revision_number ?? src?.documentStamp?.revisionNo ?? 0);
                  const effectivity = tplToPreview?.effectivity || tplToPreview?.effectivity_date || src?.documentStamp?.effectivity || '';
                  
                  const normalizedHeaderConfig = {
                    ...src,
                    showSLULogo: src.showSLULogo ?? src.showSLU ?? !!src.assets?.slu,
                    showCICMLogo: src.showCICMLogo ?? src.showCICM ?? !!src.assets?.cicm,
                    assets: {
                      slu: src?.assets?.slu || src?.slu || "/assets/images/slu-logo.png",
                      cicm: src?.assets?.cicm || src?.cicm || "/assets/images/cicm-logo.png",
                    },
                    center: src.center || {},
                    documentStamp: { docCode, revisionNo, effectivity },
                    document_code: docCode,
                    revision_no: revisionNo,
                    effectivity,
                  };
                  
                  return tplToPreview?.pages_json?.length ? (
                    <div className="bg-white rounded-xl p-5 shadow-lg">
                      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-600">
                          Page {Math.min(tplCurrentPage+1, totalPages || 1)} of {totalPages || 1}
                        </span>
                        {totalPages > 1 && (
                          <div className="flex gap-2">
                            <button 
                              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                              disabled={tplCurrentPage<=0} 
                              onClick={() => setTplCurrentPage(p=>Math.max(0,p-1))}
                            >
                              Prev
                            </button>
                            <button 
                              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                              disabled={tplCurrentPage>=totalPages-1} 
                              onClick={() => setTplCurrentPage(p=>Math.min(totalPages-1,p+1))}
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                      <TextEditor
                        content={contentForEditor}
                        pageSetup={tplToPreview?.pageSetup}
                        className="pointer-events-none opacity-100 w-full"
                        onEditorReady={(editor) => editor && editor.setEditable(false)}
                        mode="template"
                        headerConfig={normalizedHeaderConfig}
                        templateStatus={tplToPreview?.status || 'published'}
                        documentCode={docCode}
                        revisionNo={revisionNo}
                        effectivity={effectivity}
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-white">
                      <FileText size={56} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600 font-semibold mb-1">No preview available</p>
                      <p className="text-sm text-gray-500">This template has no stored page content.</p>
                    </div>
                  );
                })()}
              </div>
              
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
                <button 
                  onClick={() => setShowTplPreview(false)} 
                  className="px-5 py-2.5 rounded-lg bg-gray-600 text-white hover:bg-gray-700 font-medium transition-all shadow-sm hover:shadow-md"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
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