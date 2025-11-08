import React, { useMemo, useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import HeaderSubmittedFilesView from "../layout/headers/headerSubmittedFilesView";
import useUser from "../hooks/useUser";
import { getTemplateByIdAPI } from "../api/documentContollerAPI";
import { createDocumentAPI, deleteDocumentAPI } from "../api/documentsAPI";
import { exportDocumentPdfAPI } from "../api/assignmentDocumentsAPI";
import TextEditor from "../layout/create_template/textEditor";
import DownloadingModal from "../components/modals/downloadingModal";
import StoragePickerModal from "../components/modals/storagePickerModal";
import { StatusBadge } from "../utils/formatters";
import Loader from "../components/loader";
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  MessageSquare, 
  Clock,
  User,
  AlertCircle,
  FileText
} from "lucide-react";
import { getSubmissionBinAPI, updateSubmissionBinAPI, returnSubmissionAPI, listSubmissionBinsByDocumentAPI } from "../api/assignmentDocumentsAPI";

const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");

const API_URL =
  API_URLS.find((url) => url.includes(window.location.hostname)) || API_URLS[0];

// Helper: create a temporary document from the template, export via the document exporter, then cleanup
async function exportTemplateViaDocument({ templateDoc, store = false, folderId, filename, html }) {
  const payload = {
    title: `${templateDoc.title || "Template"} (Export)`,
    template_id: templateDoc._id || templateDoc.id,
    pages_json: templateDoc.pages_json,
    pageSetup: templateDoc.pageSetup,
    field_values: templateDoc.field_values || {},
  };

  const createdRes = await createDocumentAPI(payload);
  const created = createdRes?.document || createdRes;
  const createdId = created?._id || created?.id || created?.document?._id;
  if (!createdId) throw new Error("Failed to create a temporary document for export");

  try {
    const resp = await exportDocumentPdfAPI(createdId, {
      store: !!store,
      folderId,
      filename,
      ...(html ? { html, pageSetup: templateDoc.pageSetup } : {}),
    });

    if (resp && resp.filePath) {
      const path = String(resp.filePath);
      const url = /^https?:\/\//i.test(path) || path.startsWith("data:")
        ? path
        : `${API_URL.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
      window.open(url, "_blank");
      try {
        const r = await fetch(url, { credentials: 'include' });
        if (r.ok) {
          const blob = await r.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(blobUrl);
        }
      } catch {}
      return;
    }

    if (!store && resp && (resp.data || resp.base64)) {
      const b64 = resp.data || resp.base64;
      const contentType = resp.contentType || 'application/pdf';
      const dataUrl = b64.startsWith('data:') ? b64 : `data:${contentType};base64,${b64}`;
      const fetched = await fetch(dataUrl);
      const blob = await fetched.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      return;
    }

    const snapshot = resp && typeof resp === 'object' ? JSON.stringify({ keys: Object.keys(resp), filePath: resp.filePath || null }) : String(resp);
    throw new Error('Export did not return a file: ' + snapshot);
  } finally {
    try { await deleteDocumentAPI(createdId); } catch (e) { /* ignore */ }
  }
}

const FALLBACK_DOC = {
  title: "Submitted File Title",
  updatedAgo: "about 2 hours ago",
  document_code: "FM-DEPT-001",
  revision_no: 0,
  effectivity: "2023-09-01",
  pages: 1,
  document_size: "8.5 x 13",
};

export default function SubmittedFilesView() {
  const user = useUser();
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [fetchedDoc, setFetchedDoc] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [actionNote, setActionNote] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null); // 'submit', 'return'
  const [selectedFileIndex, setSelectedFileIndex] = useState(0); // For multi-file navigation
  const [previewDocument, setPreviewDocument] = useState(null);
  const tpl = state?.doc || {};
  const [template, setTemplate] = useState(tpl);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [showStoragePicker, setShowStoragePicker] = useState(false);
  const previewRef = useRef(null);
  const [error, setError] = useState("");

  // Fetch submission data
  useEffect(() => {
    if (id) {
      setLoading(true);
      
      const fetchSubmissionData = async () => {
        try {
          // Fetch the actual submitted document by ID
          const documentRes = await getTemplateByIdAPI(id);
          const actualDocument = documentRes?.template || documentRes?.data?.template || documentRes?.data || documentRes;
          
          // Set the actual document for preview
          setFetchedDoc(actualDocument);
          
          // Fetch the submission bin data to get submission metadata
          const bins = await listSubmissionBinsByDocumentAPI(id);
          
          if (!bins || bins.length === 0) {
            setLoading(false);
            return;
          }
          
          const binData = await getSubmissionBinAPI(bins[0]._id || bins[0].id);
          
          // Find the submission item that contains this document
          const submissionItem = binData.submissions?.find(sub => 
            (Array.isArray(sub.documents) && sub.documents.some(doc => 
              String(doc._id || doc.id || doc) === String(id)
            )) ||
            String(sub.document?._id || sub.document?.id || sub.document) === String(id)
          );
          
          if (!submissionItem) {
            setLoading(false);
            return;
          }
          
          // Get all submitted documents with full details
          const submittedDocs = [];
          if (Array.isArray(submissionItem.documents)) {
            for (const doc of submissionItem.documents) {
              const docId = doc._id || doc.id || doc;
              try {
                const docRes = await getTemplateByIdAPI(docId);
                const docData = docRes?.template || docRes?.data?.template || docRes?.data || docRes;
                submittedDocs.push({
                  id: docId,
                  name: docData.title || "Untitled Document",
                  url: docData.filePath || "",
                  size: docData.size || 0,
                  uploadedAt: doc.createdAt || doc.created_at || submissionItem.submitted_at,
                  _fullData: docData
                });
              } catch (err) {
                console.error(`Failed to fetch document ${docId}:`, err);
              }
            }
          }
          
          // Map the real submission data
          const mappedSubmission = {
            id: submissionItem._id || submissionItem.id,
            title: binData.title,
            submittedBy: {
              name: submissionItem.faculty_name || 
                    submissionItem.faculty_user?.name || 
                    submissionItem.faculty_user?.fullname ||
                    `${submissionItem.faculty_user?.firstname || ''} ${submissionItem.faculty_user?.lastname || ''}`.trim(),
              role: submissionItem.faculty_user?.role?.name || "Faculty",
              email: submissionItem.faculty_user?.email || ""
            },
            submittedAt: submissionItem.submitted_at,
            status: submissionItem.status || (submissionItem.submitted_at ? "submitted" : "pending"),
            files: submittedDocs,
            viewedBy: submissionItem.viewed_by || [],
            comments: submissionItem.comments || [],
            deadline: binData.deadline
          };
          
          setSubmission(mappedSubmission);
          
        } catch (err) {
          console.error("Error fetching submission:", err);
          setError(err.message || "Failed to load submission");
        } finally {
          setLoading(false);
        }
      };
      
      fetchSubmissionData();
    }
  }, [id, state]);

  // To update the preview when file selection changes
  useEffect(() => {
    if (submission?.files && submission.files.length > 0) {
      const selectedFile = submission.files[selectedFileIndex];
      if (selectedFile?._fullData) {
        setPreviewDocument(selectedFile._fullData);
      } else if (selectedFile?.id) {
        // Fetch the document if not already loaded
        getTemplateByIdAPI(selectedFile.id)
          .then(res => {
            const docData = res?.template || res?.data?.template || res?.data || res;
            setPreviewDocument(docData);
          })
          .catch(err => console.error("Failed to fetch preview:", err));
      }
    }
  }, [selectedFileIndex, submission?.files]);

  const d = state?.doc || fetchedDoc || {};
  const doc = {
    title: submission?.title || d.title || FALLBACK_DOC.title,
    updatedAgo: d.updatedAgo || FALLBACK_DOC.updatedAgo,
    document_code: d.document_code || d.code || FALLBACK_DOC.document_code,
    revision_no: d.revision_no ?? d.rev ?? FALLBACK_DOC.revision_no,
    effectivity: d.effectivity || d.eff || FALLBACK_DOC.effectivity,
    pages: d.pages ?? FALLBACK_DOC.pages,
    document_size: d.document_size || FALLBACK_DOC.document_size,
  };

  // Check user role permissions
    const roleName = user?.role?.name || user?.role || '';
    const userRole = typeof roleName === 'string' ? roleName.toLowerCase() : '';
    const isDean = userRole === 'dean';
    const isSecretary = userRole === 'secretary';
    const isDeptHead = userRole === 'department head' || userRole === 'department_head' || userRole === 'dept-head' || userRole === 'Department Head';
    const isFaculty = userRole === 'faculty';

    // Role-based action permissions
    const canReturnOnly = (isDean || isSecretary) && !isDeptHead; // Can only return with comment
    const canSubmitOrReturn = isDeptHead; // Can submit or return with comment
    const canViewStatus = isFaculty; // Can view status and comments

  const handleActionClick = (action) => {
    setSelectedAction(action);
    setShowActionModal(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedAction) return;
    
    setIsSubmittingAction(true);
    
    try {
      // Fetch bins for this document
      const bins = await listSubmissionBinsByDocumentAPI(id);
      if (!bins || bins.length === 0) throw new Error("Bin not found");
      
      const binId = bins[0]._id || bins[0].id;
      const submissionId = submission.id;
      
      if (selectedAction === 'return') {
        // Return the submission with reason
        await returnSubmissionAPI(binId, submissionId, { 
          reason: actionNote || 'Document returned for revision' 
        });
      } else if (selectedAction === 'submit') {
        // Update submission status or forward bin
        await updateSubmissionBinAPI(binId, { 
          status: 'completed'
        });
      }
      
      // Refresh the data
      const updatedBin = await getSubmissionBinAPI(binId);
      const updatedItem = updatedBin.submissions?.find(s => String(s._id || s.id) === String(submissionId));
      
      if (updatedItem) {
        setSubmission(prev => ({
          ...prev,
          status: updatedItem.status,
          comments: updatedItem.comments || prev.comments
        }));
      }
      
      setShowActionModal(false);
      setActionNote("");
      setSelectedAction(null);
      
      alert(`Successfully ${selectedAction === 'submit' ? 'submitted' : 'returned'} the document!`);
      
    } catch (err) {
      console.error("Action error:", err);
      alert(err?.responseData?.message || err?.message || `Failed to ${selectedAction} document`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExportDownload = async () => {
    setDownloadError("");
    setDownloading(true);
    try {
      const safeTitle = (template.title || "Template").replace(/[^a-z0-9\-_. ]/gi, "_");
      const html = buildExportHtmlFromPreview();
      await exportTemplateViaDocument({
        templateDoc: d,
        store: false,
        html: html || undefined,
        filename: `${safeTitle}.pdf`,
      });
      setDownloading(false);
    } catch (err) {
      console.error("Download failed:", err);
      setDownloadError(
        err?.response?.data?.message ||
          "We couldn't generate the PDF right now. Please try again."
      );
    }
  };

  const [currentPage, setCurrentPage] = useState(0);

  const pageNodes = useMemo(() => {
    const activeDoc = previewDocument || d;
    const baseDoc = activeDoc?.pages_json?.[0] || { type: "doc", content: [] };
    const pages = (baseDoc.content || []).filter((n) => n.type === "page");
    return pages.length > 0 ? pages : [];
  }, [previewDocument, d]);

  const contentForEditor = useMemo(() => {
    const activeDoc = previewDocument || d;
    const baseDoc = activeDoc?.pages_json?.[0] || { type: "doc", content: [] };
    if (pageNodes.length > 0) {
      const pageNode = pageNodes[currentPage];
      if (pageNode) return { ...baseDoc, content: [pageNode] };
    }
    return baseDoc;
  }, [previewDocument, d, pageNodes, currentPage]);

  const buildExportHtmlFromPreview = () => {
    try {
      const node = previewRef.current;
      if (!node) return null;

      const headParts = [];
      const baseHref = window.location.origin + "/";
      headParts.push(`<base href="${baseHref}">`);
      const styleNodes = Array.from(document.querySelectorAll('head style, head link[rel="stylesheet"]'));
      for (const el of styleNodes) {
        if (el.tagName.toLowerCase() === 'style') {
          headParts.push(`<style>${el.innerHTML}</style>`);
        } else if (el.tagName.toLowerCase() === 'link') {
          const href = el.getAttribute('href');
          if (href) {
            const abs = href.startsWith('http') ? href : new URL(href, baseHref).href;
            headParts.push(`<link rel="stylesheet" href="${abs}">`);
          }
        }
      }

      const canvas = node.querySelector('.rm-with-pagination') || node;

      const exportCss = `
        @page { margin: 0; }
        html, body { margin: 0; padding: 0; background: #fff; }
        body { display: flex; justify-content: center; align-items: flex-start; }
        :root, .rm-with-pagination { --pageGap: 0px !important; --pageGapBorderSize: 0px !important; }
        .rm-pagination-separator, .rm-page-gap { display: none !important; }
        .rm-page-break, .rm-page-container { background: #fff !important; box-shadow: none !important; border: 0 !important; outline: none !important; }
        .rm-page-break::before, .rm-page-break::after, .rm-page-container::before, .rm-page-container::after { display: none !important; content: none !important; }
        .rm-first-page-header, .rm-page-header { border: 0 !important; box-shadow: none !important; }
        .rm-first-page-header .nv-header-line,
        .rm-page-header .nv-header-line,
        .nv-header-line { display: none !important; }
        .rm-page-break:first-child .ProseMirror > *:first-child { margin-top: 0 !important; padding-top: 0 !important; }
        .rm-page-break:last-child .ProseMirror > *:last-child { margin-bottom: 0 !important; padding-bottom: 0 !important; }
        .rm-page-break:last-child .rm-pagination-separator,
        .rm-page-break:last-child .rm-page-gap { display: none !important; }
        .rm-page-break:last-child::before,
        .rm-page-break:last-child::after,
        .rm-page-break:last-child .rm-page-container::before,
        .rm-page-break:last-child .rm-page-container::after { display: none !important; content: none !important; }
        .ProseMirror p,
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6,
        .ProseMirror ul, .ProseMirror ol,
        .ProseMirror li,
        .ProseMirror blockquote,
        .ProseMirror table,
        .ProseMirror tr,
        .ProseMirror figure,
        .ProseMirror pre,
        .ProseMirror code {
          page-break-inside: avoid !important;
          break-inside: avoid-page !important;
          widows: 3; orphans: 3;
          break-before: auto !important;
          break-after: auto !important;
        }
      `;

      const html = `<!doctype html><html><head>${headParts.join('\n')}<style>${exportCss}</style></head><body>${canvas.outerHTML}</body></html>`;
      return html;
    } catch (e) {
      console.warn('Failed to capture preview HTML:', e);
      return null;
    }
  };

  const normalizedHeaderConfig = (() => {
    const src = d?.headerConfig || d?.logoConfig || d?.headerFooter || {};
    const docCode = d?.document_code || d?.docCode || d?.documentCode || src?.documentStamp?.docCode || src?.document_code || src?.docCode || "";
    const revisionNo = (d?.revision_no ?? d?.revisionNo ?? src?.documentStamp?.revisionNo ?? src?.revision_no ?? src?.revisionNo ?? 0);
    const effectivity = d?.effectivity || d?.effectivity_date || d?.effectivity_date_iso || src?.documentStamp?.effectivity || src?.effectivity || "";
    return {
      ...src,
      showSLULogo: src.showSLULogo ?? src.showSLU ?? !!src.assets?.slu,
      showCICMLogo: src.showCICMLogo ?? src.showCICM ?? !!src.assets?.cicm,
      assets: {
        slu: src?.assets?.slu || src?.slu || "/assets/images/slu-logo.png",
        cicm: src?.assets?.cicm || src?.cicm || "/assets/images/cicm-logo.png",
      },
      center: src.center || {},
      documentStamp: {
        docCode,
        revisionNo,
        effectivity,
      },
      document_code: docCode,
      revision_no: revisionNo,
      effectivity,
    };
  })();

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <HeaderSubmittedFilesView
        title={doc.title}
        onExportDownload={handleExportDownload}
        onExportToStorage={() => setShowStoragePicker(true)}
        user={user}
      />
      
      {/* Storage Picker */}
      <StoragePickerModal
        open={showStoragePicker}
        onClose={() => setShowStoragePicker(false)}
        user={user}
        onConfirm={async (folderId) => {
          setShowStoragePicker(false);
          setDownloadError("");
          setDownloading(true);
          try {
            const safeTitle = (template.title || "Template").replace(/[^a-z0-9\-_. ]/gi, "_");
            const html = buildExportHtmlFromPreview();
            await exportTemplateViaDocument({
              templateDoc: d,
              store: true,
              folderId,
              html: html || undefined,
              filename: `${safeTitle}.pdf`,
            });
            setDownloading(false);
          } catch (err) {
            console.error('Export to storage failed:', err);
            setDownloadError(err?.message || 'Failed to export and save to storage.');
          }
        }}
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:pl-2">
        <main className="p-8 flex-1 overflow-y-auto">
          <div className="grid grid-cols-12 gap-6">
            {/* Document Preview Section */}
           <section className="col-span-12 lg:col-span-8">
              {(previewDocument || d) && (
                <div className="w-full">
                  <div ref={previewRef} id="template-preview-capture">
                    <TextEditor
                      content={contentForEditor}
                      pageSetup={(previewDocument || d)?.pageSetup}
                      className="pointer-events-none opacity-100 w-full"
                      onEditorReady={(editor) =>
                        editor && editor.setEditable(false)
                      }
                      mode="template"
                      headerConfig={normalizedHeaderConfig}
                      templateStatus={(previewDocument || d)?.status || "published"}
                      documentCode={
                        (previewDocument || d)?.document_code || 
                        (previewDocument || d)?.docCode || 
                        (previewDocument || d)?.documentCode
                      }
                      revisionNo={(previewDocument || d)?.revision_no ?? (previewDocument || d)?.revisionNo}
                      effectivity={
                        (previewDocument || d)?.effectivity ||
                        (previewDocument || d)?.effectivity_date ||
                        (previewDocument || d)?.effectivity_date_iso
                      }
                    />
                  </div>
                </div>
              )}
              {!(previewDocument || d) && (
                <div className="h-full w-full flex items-center justify-center text-gray-400" style={{ minHeight: 400 }}>
                  <div className="text-center">
                    <div className="text-lg font-medium mb-1">Document Preview</div>
                    <Loader message="Loading preview..." />
                  </div>
                </div>
              )}
            </section>
            {/* Actions/Details Sidebar */}
            <aside className="col-span-12 lg:col-span-4">
              <div className="bg-white border rounded-lg shadow-sm">
                <div className="p-5">
                  {canReturnOnly || canSubmitOrReturn ? (
                    /* Actions for Dean, Secretary, Department Head */
                    <>
                      <h3 className="text-sm font-semibold tracking-widest text-gray-900 uppercase">
                        Review Submission
                      </h3>
                      <div className="w-24 h-0.5 bg-yellow-400 mt-2 mb-4 rounded" />

                      {/* Submission Info */}
                      <div className="mb-4 pb-4 border-b">
                        <div className="flex items-start gap-3 mb-3">
                          <User size={18} className="text-gray-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 mb-0.5">Submitted by</p>
                            <p className="text-sm font-medium text-gray-900">
                                {submission?.submittedBy?.name || "Loading..." }
                            </p>
                            <p className="text-xs text-gray-500">
                              {submission?.submittedBy?.role}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Clock size={18} className="text-gray-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 mb-0.5">Submitted on</p>
                            <p className="text-sm font-medium text-gray-900">
                              {submission?.submittedAt ? formatDateTime(submission.submittedAt) : "Loading..." }
                            </p>
                          </div>
                        </div>
                      </div>

                  {/* Submitted Files */}
                  {submission?.files && submission.files.length > 0 && (
                    <div className="mb-4 pb-4 border-b">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FileText size={16} />
                        Submitted Files ({submission.files.length})
                      </h4>
                      
                      {/* Files List - clickable to switch preview */}
                      <div className="space-y-2">
                        {submission.files.map((file, index) => (
                          <button
                            key={file.id}
                            onClick={() => setSelectedFileIndex(index)}
                            className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                              index === selectedFileIndex
                                ? 'bg-blue-50 border-blue-400 shadow-sm'
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <FileText size={16} className={index === selectedFileIndex ? 'text-blue-600' : 'text-gray-600'} />
                              <span className={`text-sm font-medium truncate ${
                                index === selectedFileIndex ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                {file.name}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 ml-5">
                              {formatFileSize(file.size)} • {formatDateTime(file.uploadedAt)}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                      {/* Comments/Notes */}
                      {submission?.comments && submission.comments.length > 0 && (
                        <div className="mb-4 pb-4 border-b">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <MessageSquare size={16} />
                            Comments & Notes ({submission.comments.length})
                          </h4>
                          <div className="space-y-3">
                            {submission.comments.map((comment) => (
                              <div key={comment.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-start gap-2 mb-2">
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-gray-900">
                                      {comment.author}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {comment.role} • {formatDateTime(comment.createdAt)}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700">{comment.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons Based on Role */}
                      {submission?.status === 'submitted' && (
                        <div className="space-y-3">
                          {/* Department Head can Submit or Return */}
                          {canSubmitOrReturn && (
                            <>
                              <button
                                onClick={() => handleActionClick('submit')}
                                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-sm"
                              >
                                <CheckCircle size={20} />
                                Submit Document
                              </button>
                              
                              <button
                                onClick={() => handleActionClick('return')}
                                className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-sm"
                              >
                                <XCircle size={20} />
                                Return for Revision
                              </button>
                            </>
                            
                          )}

                          {/* Dean and Secretary can only Return */}
                          {canReturnOnly && (
                            <button
                              onClick={() => handleActionClick('return')}
                              className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-sm"
                            >
                              <XCircle size={20} />
                              Return for Revision
                            </button>
                          )}
                        </div>
                        
                      )}


                     {(submission?.status === 'pending' || submission?.status === 'returned') && (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                        <div className="flex justify-center mb-3">
                          <StatusBadge type={submission?.status} />
                        </div>
                        {submission?.status === 'pending' && (
                          <p className="text-xs text-gray-600">This document has been submitted by Department Head</p>
                        )}
                        {submission?.status === 'returned' && (
                          <p className="text-xs text-gray-600">Returned for revision</p>
                        )}
                      </div>
                    )}
                    </>
                  ) : canViewStatus ? (
                    /* Details for Faculty */
                    <>
                      <h3 className="text-sm font-semibold tracking-widest text-gray-900 uppercase">
                        Submission Status
                      </h3>
                      <div className="w-24 h-0.5 bg-yellow-400 mt-2 mb-4 rounded" />

                      {/* Status Badge */}
                        <div className="mb-4 pb-4 border-b">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500">Current Status</span>
                            <StatusBadge type={submission?.status || 'submitted'} />
                          </div>
                          <p className="text-xs text-gray-600">
                            Submitted on {submission?.submittedAt ? formatDateTime(submission.submittedAt) : "Loading..." }
                          </p>
                        </div>

                      {/* Your Submitted Files with Navigation */}
                      {submission?.files && submission.files.length > 0 && (
                        <div className="mb-4 pb-4 border-b">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <FileText size={16} />
                            Your Submitted Files ({submission.files.length})
                          </h4>
                          
                          {/* Files List - Clickable */}
                          <div className="space-y-2">
                            {submission.files.map((file, index) => (
                              <button
                                key={file.id}
                                onClick={() => setSelectedFileIndex(index)}
                                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                                  index === selectedFileIndex
                                    ? 'bg-blue-50 border-blue-400 shadow-sm'
                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <FileText size={16} className={index === selectedFileIndex ? 'text-blue-600' : 'text-gray-600'} />
                                  <span className={`text-sm font-medium truncate ${
                                    index === selectedFileIndex ? 'text-blue-900' : 'text-gray-900'
                                  }`}>
                                    {file.name}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 ml-5">
                                  {formatFileSize(file.size)} • Uploaded {formatDateTime(file.uploadedAt)}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Viewed By */}
                      {submission?.viewedBy && submission.viewedBy.length > 0 && (
                        <div className="mb-4 pb-4 border-b">
                          <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Eye size={16} />
                            Viewed By ({submission.viewedBy.length})
                          </h4>
                          <div className="space-y-2">
                            {submission.viewedBy.map((viewer, idx) => (
                              <div key={idx} className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                                <div className="p-1.5 bg-blue-100 rounded-full">
                                  <Eye size={14} className="text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {viewer.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {viewer.role} • {formatDateTime(viewer.viewedAt)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comments/Feedback from Reviewers */}
                      {submission?.comments && submission.comments.length > 0 && (
                        <div className="mb-4 pb-4 border-b">
                          <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <MessageSquare size={16} />
                            Feedback & Comments ({submission.comments.length})
                          </h4>
                          <div className="space-y-3">
                            {submission.comments.map((comment) => (
                              <div key={comment.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <div className="flex items-start gap-2 mb-2">
                                  <MessageSquare size={16} className="text-amber-600 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-gray-900">
                                      {comment.author}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {comment.role} • {formatDateTime(comment.createdAt)}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700 ml-6">{comment.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Deadline Info */}
                      {submission?.deadline && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock size={16} className="text-blue-600" />
                            <span className="text-xs font-semibold text-blue-900">Deadline</span>
                          </div>
                          <p className="text-sm text-blue-800">
                            {formatDateTime(submission.deadline)}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Fallback for other roles */
                    <>
                      <h3 className="text-sm font-semibold tracking-widest text-gray-900 uppercase">
                        Submission Details
                      </h3>
                      <div className="w-24 h-0.5 bg-yellow-400 mt-2 mb-4 rounded" />
                      <Loader message="Loading submission details..." />
                    </>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* Action Confirmation Modal */}
      {showActionModal && (
        <div className="fixed inset-0 backdrop-blur-[2px] bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedAction === 'submit' ? 'Submit Document' : 'Return for Revision'}
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              {selectedAction === 'submit' 
                ? 'Are you sure you want to submit this document? You can add an optional note.'
                : 'Please provide feedback for the faculty member to revise their submission.'}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {selectedAction === 'submit' ? 'Add a note (optional)' : 'Feedback (required)'}
              </label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={
                  selectedAction === 'submit' 
                    ? 'Add any comments or notes...'
                    : 'Explain what needs to be revised...'
                }
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setActionNote("");
                  setSelectedAction(null);
                }}
                disabled={isSubmittingAction}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAction}
                disabled={isSubmittingAction || (selectedAction === 'return' && !actionNote.trim())}
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  selectedAction === 'submit'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmittingAction ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    {selectedAction === 'submit' ? (
                      <>
                        <CheckCircle size={18} />
                        Confirm Submission
                      </>
                    ) : (
                      <>
                        <XCircle size={18} />
                        Return Document
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Downloading Modal */}
      <DownloadingModal
        open={downloading || !!downloadError}
        onClose={() => {
          setDownloading(false);
          setDownloadError("");
        }}
        isError={!!downloadError}
        title="Downloading PDF…"
        message={`"${
          template.title || "Template"
        }" is being prepared as a PDF. This may take a few seconds.`}
        errorText={downloadError}
      />
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm text-gray-900 ml-4 text-right">{value}</span>
    </div>
  );
}