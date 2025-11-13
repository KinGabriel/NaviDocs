import React, { useMemo, useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import HeaderSubmittedFilesView from "../layout/headers/headerSubmittedFilesView";
import useUser from "../hooks/useUser";
import { getTemplateByIdAPI } from "../api/documentContollerAPI";
import { createDocumentAPI, deleteDocumentAPI, getDocumentByIdAPI } from "../api/documentsAPI";
import { exportDocumentPdfAPI } from "../api/assignmentDocumentsAPI";
import TextEditor from "../layout/create_template/textEditor";
import DownloadingModal from "../components/modals/downloadingModal";
import StoragePickerModal from "../components/modals/storagePickerModal";
import { StatusBadge } from "../utils/formatters";
import Loader from "../components/loader";
import toast from "react-hot-toast";

import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  MessageSquare, 
  Clock,
  User,
  AlertCircle,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from "lucide-react";
import { getSubmissionBinAPI, updateSubmissionBinAPI, returnSubmissionAPI, listSubmissionBinsByDocumentAPI, getDocumentContentAPI, addSubmissionCommentAPI } from "../api/assignmentDocumentsAPI";
import fetchAndNormalizeDocument from "../utils/documentLoader";
import { getUsersInfoByIdsAPI } from "../api/userAPI"; 

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

// Local helper: normalize a raw document object (from content API) into the
// shape used by components (matches fetchAndNormalizeDocument output partially)
// Deduplicate and normalize view events into viewedBy (latest per user)
function normalizeRawDocument(doc) {
  if (!doc) return null;
  const document = doc;
  const _id = doc._id || doc.id;
  const title = doc.title || doc.name || 'Untitled Document';
  const createdAt = doc.createdAt || doc.created_at || null;

  const from_template = doc.from_template || null;
  const pages_json = Array.isArray(doc.pages_json)
    ? doc.pages_json
    : (doc.pages_json ? [doc.pages_json] : (from_template && Array.isArray(from_template.pages_json) ? from_template.pages_json : []));
  const pageSetup = doc.pageSetup || from_template?.pageSetup || null;
  const headerConfig = doc.headerConfig || from_template?.headerConfig || doc.logoConfig || from_template?.logoConfig || null;
  const field_values = doc.field_values || {};
  const body = doc.body || doc.content || null;

  return {
    document,
    _id,
    title,
    createdAt,
    from_template,
    pages_json,
    pageSetup,
    headerConfig,
    logoConfig: headerConfig,
    field_values,
    body,
  };
}

export default function SubmittedFilesView() {
  const user = useUser();
  const params = useParams();
  // Params may be registered as /submissions/:id or /submission/:binId/:docId
  const id = params.docId || params.id || params.documentId || null;
  const routeBinId = params.binId || params.submissionBinId || params.bid || null;
  const navigate = useNavigate();
  const { state } = useLocation();
  const navBinId = state?.binId || state?.bin?._id || state?.submissionBinId || null;
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
  const [currentBinId, setCurrentBinId] = useState(null);
  const tpl = state?.doc || {};
  const [template, setTemplate] = useState(tpl);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [showStoragePicker, setShowStoragePicker] = useState(false);
  const previewRef = useRef(null);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const previewContainerRef = useRef(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [reviewerUsers, setReviewerUsers] = useState({}); 
  const [showRawViews, setShowRawViews] = useState(false);
  const [expandedViewerId, setExpandedViewerId] = useState(null);


  // Fetch submission data
useEffect(() => {
  if (!id) {
    setError("No document ID provided");
    setLoading(false);
    return;
  }
  
  let mounted = true;
  
  const fetchSubmissionData = async () => {
    try {
      setLoading(true);
      console.log('Fetching document with ID:', id);

      // If a bin id was supplied via the route or navigation state (preferred), use it directly and skip listing bins
      let bins = null;
      const preferredBinId = routeBinId || navBinId || null;
      if (preferredBinId) {
        console.debug && console.debug('Using binId from route params or navigation state:', preferredBinId);
      } else {
        // First: fetch submission bins for this document so we have the bin context
        bins = await listSubmissionBinsByDocumentAPI(id);
        console.log('Bins response:', bins);
      }

      // If we didn't fetch bins and a preferredBinId exists, try to load that bin; otherwise handle no-bins case
      if ((!bins || bins.length === 0) && preferredBinId) {
        // Load the specific bin provided via route/state
        try {
          const binData = await getSubmissionBinAPI(preferredBinId);
          if (!binData) throw new Error('Bin not found');
          setCurrentBinId(preferredBinId);
          // proceed using binData below by assigning bins to [binData]
          bins = [binData];
        } catch (e) {
          console.warn('Preferred binId provided but failed to load bin', preferredBinId, e?.message || e);
          // fall through to existing no-bins behavior
        }
      }

      if (!bins || bins.length === 0) {
        console.warn('No bins found for document', id);
        // No submission bin context: do not attempt direct GET if we lack explicit bin info
        // Show a friendly error to the user instead of trying to GET protected document
        throw new Error('No submission bin found for this document');
      }

      // Determine binId: prefer routeBinId -> chosen bin from bins -> fallback first bin
      const normalizeId = (b) => b?._id || b?.id || b;
      let chosenBin = null;
      let binId = routeBinId || null;

      if (!binId) {
        if (!bins || bins.length === 0) {
          // handled above (no bins case)
        } else {
          // Prefer a bin that explicitly contains a submission entry for this document
          for (const b of bins) {
            const subs = Array.isArray(b.submissions) ? b.submissions : [];
            const found = subs.find(s => {
              if (Array.isArray(s.documents) && s.documents.some(dd => String(dd?._id || dd?.id || dd) === String(id))) return true;
              if (s.document && String(s.document?._id || s.document?.id || s.document) === String(id)) return true;
              return false;
            });
            if (found) { chosenBin = b; break; }
          }

          // If still not chosen and user is faculty, prefer bin assigned to them
          if (!chosenBin) {
            try {
              const uid = user?._id || user?.id || null;
              if (uid) {
                for (const b of bins) {
                  const subs = Array.isArray(b.submissions) ? b.submissions : [];
                  if (subs.some(s => String(s.faculty) === String(uid))) { chosenBin = b; break; }
                }
              }
            } catch (_) {}
          }

          // If still not chosen, prefer bin created by current user
          if (!chosenBin) {
            const uid = user?._id || user?.id || null;
            for (const b of bins) {
              if (uid && String(b.created_by || b.createdBy || '') === String(uid)) { chosenBin = b; break; }
            }
          }

          // fallback to any forwarded bin or the first bin
          if (!chosenBin) chosenBin = bins.find(b => b.is_forwarded) || bins[0];
        }

        binId = normalizeId(chosenBin);
        if (binId) setCurrentBinId(binId);
      } else {
        // routeBinId present
        setCurrentBinId(binId);
      }

      const binData = await getSubmissionBinAPI(binId);
      console.log('Bin data:', binData);

      // Enforce frontend restriction: if current user is Dean/Secretary and bin not forwarded, show friendly error
      try {
        const roleNameLocal = (user?.role?.name || user?.role || '').toString().toLowerCase();
        const isDeanLocal = roleNameLocal === 'dean';
        const isSecretaryLocal = roleNameLocal === 'secretary';
        if ((isDeanLocal || isSecretaryLocal) && !binData.is_forwarded) {
          if (mounted) {
            setError('This submission has not been forwarded to your office.');
            setLoading(false);
          }
          return;
        }
      } catch (e) {
        // ignore role parse errors and proceed
      }

      // submission-aware content endpoint using the bin context
      let actualDocument = null;
      try {
        const documentRes = await getDocumentContentAPI(id, binId);
        actualDocument = documentRes?.document || documentRes?.data?.document || documentRes?.data || documentRes;
        if (mounted) setFetchedDoc(actualDocument);
      } catch (docErr) {
        console.warn('Could not fetch document via submission API, falling back to document API:', docErr?.message || docErr);
        try {
          const documentRes = await getDocumentByIdAPI(id);
          actualDocument = documentRes?.document || documentRes?.data?.document || documentRes?.data || documentRes;
          if (mounted) setFetchedDoc(actualDocument);
        } catch (fallbackErr) {
          console.warn('Fallback direct document fetch failed:', fallbackErr?.message || fallbackErr);
        }
      }

      // Find the submission item that contains this document
      const submissionItem = binData.submissions?.find(sub => {
        const hasInDocuments = Array.isArray(sub.documents) && sub.documents.some(doc => 
          String(doc._id || doc.id || doc) === String(id)
        );
        const hasInDocument = String(sub.document?._id || sub.document?.id || sub.document) === String(id);
        return hasInDocuments || hasInDocument;
      });
      
      if (!submissionItem) {
        console.warn('Submission item not found for document', id);
        throw new Error('Submission item not found for this document');
      }
      
      console.log('Submission item:', submissionItem);
      
      // Get all submitted documents with full details
      const submittedDocs = [];
      
      // Handle single document
      if (submissionItem.document) { 
        const docId = submissionItem.document._id || submissionItem.document.id || submissionItem.document;
        try {
          // Prefer submission-aware content endpoint to avoid protected direct GETs
          let docFromApi = null;
          try {
            const resp = await getDocumentContentAPI(docId, binId);
            docFromApi = resp?.document || resp?.data?.document || resp?.data || resp;
          } catch (e) {
            // Fallback to existing loader
            docFromApi = null;
          }

          if (docFromApi) {
            const normalizedDoc = normalizeRawDocument(docFromApi);
            submittedDocs.push({
              id: docId,
              name: normalizedDoc.title,
              url: normalizedDoc.document?.filePath || "",
              size: normalizedDoc.document?.size || 0,
              uploadedAt: normalizedDoc.createdAt || submissionItem.submitted_at,
              _fullData: normalizedDoc
            });
          } else {
            const normalizedDoc = await fetchAndNormalizeDocument(docId);
            submittedDocs.push({
              id: docId,
              name: normalizedDoc.title,
              url: normalizedDoc.document.filePath || "",
              size: normalizedDoc.document.size || 0,
              uploadedAt: normalizedDoc.createdAt || submissionItem.submitted_at,
              _fullData: normalizedDoc
            });
          }
        } catch (err) {
          console.error(`Failed to fetch document ${docId}:`, err);
          // Use placeholder if can't fetch the document
          submittedDocs.push({
            id: docId,
            name: `Document ${docId}`,
            url: "",
            size: 0,
            uploadedAt: submissionItem.submitted_at,
            _fullData: null
          });
        }
      } 

      // Handle multiple documents
      if (Array.isArray(submissionItem.documents) && submissionItem.documents.length > 0) {  
        for (const doc of submissionItem.documents) {
          const docId = doc._id || doc.id || doc;
          try {
            let docFromApi = null;
            try {
              const resp = await getDocumentContentAPI(docId, binId);
              docFromApi = resp?.document || resp?.data?.document || resp?.data || resp;
            } catch (_) { docFromApi = null; }

            if (docFromApi) {
              const normalizedDoc = normalizeRawDocument(docFromApi);
              submittedDocs.push({
                id: docId,
                name: normalizedDoc.title,
                url: normalizedDoc.document?.filePath || "",
                size: normalizedDoc.document?.size || 0,
                uploadedAt: normalizedDoc.createdAt || submissionItem.submitted_at,
                _fullData: normalizedDoc
              });
            } else {
              const normalizedDoc = await fetchAndNormalizeDocument(docId);
              submittedDocs.push({
                id: docId,
                name: normalizedDoc.title,
                url: normalizedDoc.document.filePath || "",
                size: normalizedDoc.document.size || 0,
                uploadedAt: normalizedDoc.createdAt || submissionItem.submitted_at,
                _fullData: normalizedDoc
              });
            }
          } catch (err) {
            console.error(`Failed to fetch document ${docId}:`, err);
            // Use placeholder if can't fetch the document
            submittedDocs.push({
              id: docId,
              name: `Document ${docId}`,
              url: "",
              size: 0,
              uploadedAt: submissionItem.submitted_at,
              _fullData: null
            });
          }
        }
      }
        
        // Ensure we have at least the current document in the list
        if (submittedDocs.length === 0 && actualDocument) {
          submittedDocs.push({
            id: id,
            name: actualDocument.title || "Untitled Document",
            url: actualDocument.filePath || "",
            size: actualDocument.size || 0,
            uploadedAt: submissionItem.submitted_at,
            _fullData: actualDocument
          });
        }
      
      // Set the first document for preview
      if (submittedDocs.length > 0) {
        const firstDoc = submittedDocs[0]._fullData;
        if (mounted) {
          setFetchedDoc(firstDoc);
          setPreviewDocument(firstDoc);
          setSelectedFileIndex(0);
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
                    `${submissionItem.faculty_user?.firstname || ''} ${submissionItem.faculty_user?.lastname || ''}`.trim() ||
                    "Unknown User",
              role: submissionItem.faculty_user?.role?.name || "Faculty",
              email: submissionItem.faculty_user?.email || ""
            },
            submittedAt: submissionItem.submitted_at,
            status: submissionItem.status || (submissionItem.submitted_at ? "submitted" : "pending"),
            files: submittedDocs && submittedDocs.length > 0 ? submittedDocs : [],
            // Normalize view events from multiple possible shapes (views, viewed_by, _rawViews)
            // Keep raw events for debugging and fallback rendering
            rawViews: submissionItem._rawViews || submissionItem.views || submissionItem.viewed_by || [],
            // viewedBy will be populated from rawViews after dedupe (keep latest per user)
            viewedBy: [],
            notes: Array.isArray(submissionItem.notes) 
            ? submissionItem.notes.map(note => {
                let userInfo = null;
                
                // If note.by is already a populated object
                if (note.by && typeof note.by === 'object') {
                  userInfo = note.by;
                } 
                // If note.by is just an ID string, try to match it
                else if (typeof note.by === 'string') {
                  const noteById = String(note.by);
                  
                  // Check if it matches the submitting faculty
                  if (submissionItem.faculty_user && 
                      String(submissionItem.faculty_user._id || submissionItem.faculty_user.id) === noteById) {
                    userInfo = {
                      ...submissionItem.faculty_user,
                      role: { name: 'Faculty' } // Override role to ensure it shows "Faculty"
                    };
                  }
                  // Check if it matches current user (dept head/dean/secretary)
                  else if (user && String(user._id || user.id) === noteById) {
                    userInfo = user;
                  }
                  // Check if it matches bin creator
                  else if (binData.created_by && typeof binData.created_by === 'object' &&
                          String(binData.created_by._id || binData.created_by.id) === noteById) {
                    userInfo = binData.created_by;
                  }
                }
                
                return {
                  ...note,
                  id: note._id || note.id,
                  at: note.createdAt || note.created_at || note.at || note.timestamp,
                  by: userInfo, 
                  message: note.message || note.text || note.comment || note.reason || ''
                };
              })
            : [],
              deadline: binData.deadline
            };
      
      if (mounted) {
      // Deduplicate and normalize view events into viewedBy (latest per user)
      try {
        const raw = Array.isArray(mappedSubmission.rawViews) ? mappedSubmission.rawViews : [];
        const normalized = raw.map(rv => ({
          userId: rv.user || rv.userId || (rv.by && (rv.by._id || rv.by.id)) || null,
          at: rv.at || rv.timestamp || rv.viewedAt || null,
          _id: rv._id || rv.id || null,
          raw: rv
        })).filter(r => r.userId);

        // Keep latest per user (by at)
        const byUser = {};
        normalized.forEach(n => {
          const prev = byUser[n.userId];
          if (!prev) byUser[n.userId] = n;
          else {
            const prevT = prev.at ? new Date(prev.at).getTime() : 0;
            const curT = n.at ? new Date(n.at).getTime() : 0;
            if (curT >= prevT) byUser[n.userId] = n;
          }
        });

        // Sort by most recent first
        const deduped = Object.values(byUser)
          .map(v => ({ id: v.userId, viewedAt: v.at, _id: v._id }))
          .sort((a, b) => {
            const timeA = a.viewedAt ? new Date(a.viewedAt).getTime() : 0;
            const timeB = b.viewedAt ? new Date(b.viewedAt).getTime() : 0;
            return timeB - timeA; // Most recent first
          });
          
        mappedSubmission.viewedBy = deduped;
      } catch (e) {
        mappedSubmission.viewedBy = mappedSubmission.viewedBy || [];
      }

      setSubmission(mappedSubmission);
      setError("");
    }
      
    } catch (err) {
      console.error("Error fetching submission:", err);
      if (mounted) {
        setError(err.message || "Failed to load submission");
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };
  
  fetchSubmissionData();
  
  return () => { mounted = false; };
}, [id, state]);

// Fetch reviewer user information from notes
useEffect(() => {
  if (!submission?.notes || !Array.isArray(submission.notes)) return;
  
  const userIds = submission.notes
    .map(note => {
      if (typeof note.by === 'string') return note.by;
      if (note.by && typeof note.by === 'object') return note.by._id || note.by.id;
      return null;
    })
    .filter(Boolean);
  
  if (userIds.length === 0) return;
  
  // Remove duplicates
  const uniqueIds = [...new Set(userIds)];
  
  let mounted = true;
  
  getUsersInfoByIdsAPI(uniqueIds)
    .then(users => {
      if (!mounted || !users) return;
      
      // Create a map of userId -> user object
      const userMap = {};
      users.forEach(user => {
        const id = user.userId || user._id || user.id;
        if (id) {
          userMap[id] = {
            name: user.name || 
                  user.fullname || 
                  `${user.firstname || ''} ${user.lastname || ''}`.trim() || 
                  user.email || 
                  'Unknown User',
            role: user.role?.name || user.role || 'Reviewer',
            email: user.email
          };
        }
      });
      
      setReviewerUsers(userMap);
    })
    .catch(err => {
      console.error('Failed to fetch reviewer info:', err);
    });
  
  return () => { mounted = false; };
}, [submission?.notes]);

// Fetch user info for viewers (from views/rawViews) so we can show names/roles
useEffect(() => {
  if (!submission) return;

  // Collect viewer ids from the deduped viewedBy if present, otherwise try rawViews
  const ids = [];
  if (Array.isArray(submission.viewedBy) && submission.viewedBy.length > 0) {
    submission.viewedBy.forEach(v => { if (v && v.id) ids.push(v.id); });
  } else if (Array.isArray(submission.rawViews) && submission.rawViews.length > 0) {
    submission.rawViews.forEach(rv => {
      const uid = rv.user || rv.userId || (rv.by && (rv.by._id || rv.by.id));
      if (uid) ids.push(uid);
    });
  }

  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return;

  let mounted = true;
  getUsersInfoByIdsAPI(unique)
    .then(users => {
      if (!mounted || !users) return;
      const userMap = {};
      users.forEach(u => {
        const id = u.userId || u._id || u.id;
        if (!id) return;
        userMap[id] = {
          name: u.name || u.fullname || `${u.firstname || ''} ${u.lastname || ''}`.trim() || u.email || 'Unknown User',
          role: u.role?.name || u.role || 'Reviewer',
          email: u.email
        };
      });

      // Merge into reviewerUsers so existing note-rendering code can reuse it
      setReviewerUsers(prev => ({ ...prev, ...userMap }));
    })
    .catch(err => console.error('Failed to fetch viewer user info:', err));

  return () => { mounted = false; };
}, [submission?.viewedBy, submission?.rawViews]);

const handleSubmitComment = async () => {
  if (!commentText.trim()) {
    toast.error('Please enter a comment');
    return;
  }
  
  setIsSubmittingComment(true);
  
  try {
    const binId = currentBinId;
    const submissionId = submission.id;
    
    if (!binId || !submissionId) {
      throw new Error("Missing submission information");
    }
    
    // Add the comment
    await addSubmissionCommentAPI(binId, submissionId, {
      message: commentText.trim(),
      type: 'comment'
    });
    
    // Refresh the submission data to show the new comment
    const updatedBin = await getSubmissionBinAPI(binId);
    const updatedItem = updatedBin.submissions?.find(s => String(s._id || s.id) === String(submissionId));
    
    if (updatedItem) {
      // Map the notes properly - keep the 'by' field as is so useEffect can fetch user data
      const mappedNotes = Array.isArray(updatedItem.notes) 
        ? updatedItem.notes.map(note => ({
            ...note,
            id: note._id || note.id,
            at: note.createdAt || note.created_at || note.at || note.timestamp,
            by: note.by, // Keep the by field as-is (could be ID string or object)
            message: note.message || note.text || note.comment || note.reason || ''
          }))
        : [];
      
      setSubmission(prev => ({
        ...prev,
        notes: mappedNotes
      }));
      
      // Fetch user info for new notes
      const userIds = mappedNotes
        .map(note => {
          if (typeof note.by === 'string') return note.by;
          if (note.by && typeof note.by === 'object') return note.by._id || note.by.id;
          return null;
        })
        .filter(Boolean);
      
      if (userIds.length > 0) {
        const uniqueIds = [...new Set(userIds)];
        try {
          const users = await getUsersInfoByIdsAPI(uniqueIds);
          if (users) {
            const userMap = {};
            users.forEach(user => {
              const id = user.userId || user._id || user.id;
              if (id) {
                userMap[id] = {
                  name: user.name || 
                        user.fullname || 
                        `${user.firstname || ''} ${user.lastname || ''}`.trim() || 
                        user.email || 
                        'Unknown User',
                  role: user.role?.name || user.role || 'Reviewer',
                  email: user.email
                };
              }
            });
            setReviewerUsers(prev => ({ ...prev, ...userMap }));
          }
        } catch (err) {
          console.error('Failed to fetch user info for new comments:', err);
        }
      }
    }
    
    setShowCommentModal(false);
    setCommentText("");
    toast.success('Comment added successfully!');
    
  } catch (err) {
    console.error("Failed to add comment:", err);
    toast.error(err?.responseData?.message || err?.message || 'Failed to add comment');
  } finally {
    setIsSubmittingComment(false);
  }
};

const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3));
const handleZoomFit = () => {
  if (previewContainerRef.current) {
    const containerWidth = previewContainerRef.current.offsetWidth - 64;
    const estimatedPageWidth = isLandscape ? 1400 : 900;
    const autoZoom = Math.min((containerWidth / estimatedPageWidth), 1);
    setZoom(autoZoom);
  }
};
const handleZoomReset = () => setZoom(1);

  // To update the preview when file selection changes
    useEffect(() => {
      if (submission?.files && submission.files.length > 0) {
        const selectedFile = submission.files[selectedFileIndex];
        if (selectedFile?._fullData) {
          setPreviewDocument(selectedFile._fullData);
        } else if (selectedFile?.id) {
          // Fetch the document if not already loaded
          console.log('Fetching preview for document:', selectedFile.id);
          // Prefer the submission-aware content API to avoid protected direct GETs
          (currentBinId ? getDocumentContentAPI(selectedFile.id, currentBinId) : Promise.reject(new Error('no binId')))
            .then(res => {
              const docData = res?.document || res?.data?.document || res?.data || res;
              let pagesJson = docData.pages_json;
              if (!pagesJson && docData.from_template?.pages_json) {
                pagesJson = docData.from_template.pages_json;
              }
              const normalizedData = {
                ...docData,
                pages_json: pagesJson || docData.pages_json,
                pageSetup: docData.pageSetup || docData.from_template?.pageSetup,
                headerConfig: docData.headerConfig || docData.from_template?.headerConfig,
                logoConfig: docData.logoConfig || docData.from_template?.logoConfig,
              };
              console.log('Fetched document (content API):', normalizedData);
              setPreviewDocument(normalizedData);
            })
            .catch(() => {
              // Fallback to legacy GET when content API isn't available for this document/user
              getDocumentByIdAPI(selectedFile.id)
                .then(res => {
                  const docData = res?.document || res?.data?.document || res?.data || res;
                  let pagesJson = docData.pages_json;
                  if (!pagesJson && docData.from_template?.pages_json) {
                    pagesJson = docData.from_template.pages_json;
                  }
                  const normalizedData = {
                    ...docData,
                    pages_json: pagesJson || docData.pages_json,
                    pageSetup: docData.pageSetup || docData.from_template?.pageSetup,
                    headerConfig: docData.headerConfig || docData.from_template?.headerConfig,
                    logoConfig: docData.logoConfig || docData.from_template?.logoConfig,
                  };
                  console.log('Fetched document (fallback):', normalizedData);
                  setPreviewDocument(normalizedData);
                })
                .catch(err => console.error("Failed to fetch preview (both content API and fallback):", err));
            });
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

  const isLandscape = useMemo(() => {
  const activeDoc = previewDocument || fetchedDoc || d;
  if (!activeDoc?.pageSetup) return false;
  
  const pageSetup = activeDoc.pageSetup;
  
  if (pageSetup.orientation) {
    return pageSetup.orientation.toLowerCase() === 'landscape';
  }
  
  const width = parseFloat(pageSetup.width) || 0;
  const height = parseFloat(pageSetup.height) || 0;
  
  return width > height;
}, [previewDocument, fetchedDoc, d]);

  // Check user role permissions
  const roleName = user?.role?.name || user?.role || "";
  const userRole =
    typeof roleName === "string" ? roleName.toLowerCase() : "";

  const isDean = userRole === "dean";
  const isSecretary = userRole === "secretary";
  const isDeptHead =
    userRole === "department head" ||
    userRole === "department_head" ||
    userRole === "dept-head" ||
    userRole === "department head"; // in case backend sends this exact string
  const isFaculty = userRole === "faculty";

  // Role-based action permissions
  const canReturnOnly = (isDean || isSecretary) && !isDeptHead; // Dean / Sec only
  const canSubmitOrReturn = isDeptHead; // Dept Head
  const canViewStatus = isFaculty; // Faculty

  // Faculty view = faculty sidebar (they should see all viewers, including themselves)
  // Non-faculty view (Dept Head / Dean / Sec) uses filtered lists without faculty
  const isFacultyView = canViewStatus && !(canReturnOnly || canSubmitOrReturn);

  const nonFacultyViewedBy = useMemo(() => {
    if (!submission || !Array.isArray(submission.viewedBy)) return [];

    return submission.viewedBy.filter((viewer) => {
      const uid =
        viewer.id ||
        viewer.userId ||
        viewer._id ||
        viewer.user ||
        null;

      const meta = uid ? reviewerUsers[uid] : null;
      const roleName = (meta?.role || viewer.role || "")
        .toString()
        .toLowerCase();

      // hide faculty in reviewer view
      return !roleName.includes("faculty");
    });
  }, [submission?.viewedBy, reviewerUsers]);

  const nonFacultyRawViews = useMemo(() => {
    if (!submission || !Array.isArray(submission.rawViews)) return [];

    return submission.rawViews.filter((rv) => {
      const uid =
        rv.user ||
        rv.userId ||
        (rv.by && (rv.by._id || rv.by.id)) ||
        null;

      const meta = uid ? reviewerUsers[uid] : null;
      const roleName = (meta?.role || rv.role || "")
        .toString()
        .toLowerCase();

      return !roleName.includes("faculty");
    });
  }, [submission?.rawViews, reviewerUsers]);


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
          notes: updatedItem.notes || prev.notes
        }));
      }
      
      setShowActionModal(false);
      setActionNote("");
      setSelectedAction(null);
      
      toast.success(`Successfully ${selectedAction === 'submit' ? 'submitted' : 'returned'} the document!`);
      
    } catch (err) {
      console.error("Action error:", err);
      toast.error(err?.responseData?.message || err?.message || `Failed to ${selectedAction} document`);
    } finally {
      setIsSubmittingAction(false);
    }
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
      const activeDoc = previewDocument || fetchedDoc || d;
      if (!activeDoc || !activeDoc.pages_json) return [];
      
      const baseDoc = activeDoc.pages_json[0] || { type: "doc", content: [] };
      const pages = (baseDoc.content || []).filter((n) => n.type === "page");
      return pages.length > 0 ? pages : [];
    }, [previewDocument, fetchedDoc, d]);

    const contentForEditor = useMemo(() => {
      const activeDoc = previewDocument || fetchedDoc || d;
      if (!activeDoc || !activeDoc.pages_json) return { type: "doc", content: [] };
      
      const baseDoc = activeDoc.pages_json[0] || { type: "doc", content: [] };
      const fieldValues = activeDoc?.field_values || {};
      
      // Build ID-to-Label mapping from template fields
      const idToLabel = {};
      const fieldsList = activeDoc?.fields || activeDoc?.from_template?.fields || [];
      
      fieldsList.forEach(group => {
        if (group.fields && Array.isArray(group.fields)) {
          group.fields.forEach(field => {
            const fieldId = field.key || field.id || field._id;
            const fieldLabel = field.name || field.label;
            if (fieldId && fieldLabel) {
              idToLabel[fieldId] = fieldLabel; // maps field_values key to label ("fld-hvruhlnj0q" to "Civil status")
            }
          });
        } else if (group.key || group.id || group._id) {
          const fieldId = group.key || group.id || group._id;
          const fieldLabel = group.name || group.label;
          if (fieldId && fieldLabel) {
            idToLabel[fieldId] = fieldLabel;
          }
        }
      });
      
      const cloned = JSON.parse(JSON.stringify(baseDoc));
      
      // Apply field values to editableField nodes
      const walk = (node) => {
        if (!node) return;
        if (node.type === 'editableField') {
          // Get the field ID from the node
          const fieldId = node.attrs?.key || node.attrs?.name;
          
          // Map ID to label
          const fieldLabel = idToLabel[fieldId] || fieldId;
          
          // Get value using the label
          const value = fieldValues[fieldLabel];
          
          if (value !== undefined && value !== null && String(value) !== '') {
            // Inject the value into the node's content
            node.content = [{ type: 'text', text: String(value) }];
          } else {
            // Keep existing content or empty
            node.content = node.content || [];
          }
        }
        if (Array.isArray(node.content)) node.content.forEach(walk);
      };
      
      if (Array.isArray(cloned.content)) {
        cloned.content.forEach(walk);
      }
      
      if (pageNodes.length > 0) {
        const pageNode = pageNodes[currentPage];
        if (pageNode) {
          const withPage = JSON.parse(JSON.stringify({ ...cloned, content: [pageNode] }));
          if (Array.isArray(withPage.content)) {
            withPage.content.forEach(walk);
          }
          return withPage;
        }
      }
      
      return cloned;
    }, [previewDocument, fetchedDoc, d, pageNodes, currentPage]);

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

    const normalizedHeaderConfig = useMemo(() => {
      const activeDoc = previewDocument || fetchedDoc || d;
      if (!activeDoc) return {};
      
      // For documents, get template metadata from template_id reference
      const templateMeta = activeDoc?.template_id || activeDoc?.template || {};
      
      const src = activeDoc?.headerConfig || 
                  templateMeta?.headerConfig || 
                  activeDoc?.logoConfig || 
                  templateMeta?.logoConfig || 
                  activeDoc?.headerFooter || 
                  templateMeta?.headerFooter || 
                  {};
                  
      const docCode = activeDoc?.document_code || 
                      templateMeta?.document_code || 
                      activeDoc?.docCode || 
                      templateMeta?.docCode || 
                      src?.documentStamp?.docCode || 
                      "";
                      
      const revisionNo = activeDoc?.revision_no ?? 
                        templateMeta?.revision_no ?? 
                        activeDoc?.revisionNo ?? 
                        templateMeta?.revisionNo ?? 
                        src?.documentStamp?.revisionNo ?? 
                        0;
                        
      const effectivity = activeDoc?.effectivity || 
                          templateMeta?.effectivity || 
                          activeDoc?.effectivity_date || 
                          templateMeta?.effectivity_date || 
                          src?.documentStamp?.effectivity || 
                          "";
                          
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
  }, [previewDocument, fetchedDoc, d]);

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <HeaderSubmittedFilesView
        title={previewDocument?.title || fetchedDoc?.title || d?.title || "Submitted Document"}
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
            console.error("Export to storage failed:", err);
            setDownloadError(err?.message || "Failed to export and save to storage.");
          }
        }}
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:pl-2">
        <main className="p-8 flex-1 overflow-y-auto">
          <div className="grid grid-cols-12 gap-6">
          {/* Document Preview Section */}
          <section className="col-span-12 lg:col-span-8">
              {/* Zoom Controls */}
              <div className="sticky top-0 z-10 mb-3 px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleZoomOut}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-300"
                      title="Zoom Out"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <button
                      onClick={handleZoomIn}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-300"
                      title="Zoom In"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-300">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={handleZoomFit}
                      className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-300"
                    >
                      Fit
                    </button>
                    <button
                      onClick={handleZoomReset}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-300 transition-colors"
                      title="Reset"
                    >
                      <RotateCcw size={16} className="text-gray-600" />
                      Reset
                    </button>
                  </div>
                  <div className="text-sm text-gray-600">
                    Scroll to navigate • Use zoom controls
                  </div>
                </div>
              </div>

              {loading ? (
                <div
                  className="h-full w-full flex items-center justify-center bg-white rounded-lg border border-gray-200 shadow-sm"
                  style={{ minHeight: 600 }}
                >
                  <div className="text-center">
                    <Loader message="Loading document preview..." />
                  </div>
                </div>
              ) : error ? (
                <div
                  className="h-full w-full flex items-center justify-center bg-white rounded-lg border border-red-200 shadow-sm"
                  style={{ minHeight: 600 }}
                >
                  <div className="text-center p-8">
                    <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Failed to Load Document
                    </h3>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (previewDocument || fetchedDoc || d)?.pages_json ? (
                <div
                  ref={previewContainerRef}
                  className="w-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg shadow-sm overflow-auto"
                  style={{
                    padding: "2rem",
                    minHeight: "600px",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                      paddingBottom: "2rem",
                    }}
                  >
                    <div
                      style={{
                        width: isLandscape ? "1200px" : "900px",
                        maxWidth: "none",
                      }}
                    >
                      <div
                        style={{
                          transform: `scale(${zoom})`,
                          transformOrigin: "top center",
                        }}
                        className="transition-transform duration-200"
                      >
                        <div ref={previewRef} id="template-preview-capture">
                          <TextEditor
                            content={contentForEditor}
                            pageSetup={(previewDocument || d)?.pageSetup}
                            className="pointer-events-none opacity-100 w-full"
                            onEditorReady={(editor) =>
                              editor && editor.setEditable(false)
                            }
                            mode="document"
                            headerConfig={normalizedHeaderConfig}
                            templateStatus={
                              (previewDocument || d)?.status || "published"
                            }
                            documentCode={normalizedHeaderConfig.document_code}
                            revisionNo={normalizedHeaderConfig.revision_no}
                            effectivity={normalizedHeaderConfig.effectivity}
                            fieldValues={(() => {
                              const activeDoc = previewDocument || d;
                              const rawValues = activeDoc?.field_values || {};
                              return rawValues;
                            })()}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="h-full w-full flex items-center justify-center bg-white rounded-lg border border-gray-200 shadow-sm"
                  style={{ minHeight: 600 }}
                >
                  <div className="text-center p-8">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Document Content
                    </h3>
                    <p className="text-gray-600">
                      The document does not have any content to display.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Actions/Details Sidebar */}
            <aside className="col-span-12 lg:col-span-4">
              <div className="bg-white border rounded-lg shadow-sm">
                <div className="p-5">
                  {canReturnOnly || canSubmitOrReturn ? (
                    <>
                      <h3 className="text-sm font-semibold tracking-widest text-gray-900 uppercase">
                        Review Submission
                      </h3>
                      <div className="w-24 h-0.5 bg-yellow-400 mt-2 mb-4 rounded" />

                      {/* Submission Info */}
                      {submission ? (
                        <div className="mb-4 pb-4 border-b">
                          <div className="flex items-start gap-3 mb-3">
                            <User size={18} className="text-gray-500 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-0.5">
                                Submitted by
                              </p>
                              <p className="text-sm font-medium text-gray-900">
                                {submission?.submittedBy?.name || "Unknown"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {submission?.submittedBy?.role}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <Clock size={18} className="text-gray-500 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-0.5">
                                Submitted on
                              </p>
                              <p className="text-sm font-medium text-gray-900">
                                {submission?.submittedAt
                                  ? formatDateTime(submission.submittedAt)
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4 pb-4 border-b">
                          <Loader message="Loading submission info..." />
                        </div>
                      )}

                  {/* Submitted Files */}
                  {submission?.files && submission.files.length > 0 && (
                        <div className="mb-4 pb-4 border-b">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <FileText size={16} />
                            Submitted Files ({submission.files.length})
                          </h4>

                          <div className="space-y-2">
                            {submission.files.map((file, index) => (
                              <button
                                key={file.id}
                                onClick={() => setSelectedFileIndex(index)}
                                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                                  index === selectedFileIndex
                                    ? "bg-blue-50 border-blue-400 shadow-sm"
                                    : "bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <FileText
                                    size={16}
                                    className={
                                      index === selectedFileIndex
                                        ? "text-blue-600"
                                        : "text-gray-600"
                                    }
                                  />
                                  <span
                                    className={`text-sm font-medium truncate ${
                                      index === selectedFileIndex
                                        ? "text-blue-900"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {file.name}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comments / Notes from reviewers (Dean / Dept Head view) */}
                      {submission?.notes && submission.notes.length > 0 && (
                        <div className="mb-4 pb-4 border-b">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <MessageSquare size={16} />
                            Comments &amp; Notes ({submission.notes.length})
                          </h4>
                          <div className="space-y-3">
                            {submission.notes.map((note) => {
                              let userName = "Unknown User";
                              let userRole = "User";
                              let userEmail = "";

                              const userId =
                                typeof note.by === "string"
                                  ? note.by
                                  : note.by?._id || note.by?.id;

                              if (userId && reviewerUsers[userId]) {
                                const fetchedUser = reviewerUsers[userId];
                                userName = fetchedUser.name;
                                userRole = fetchedUser.role;
                                userEmail = fetchedUser.email;
                              } else if (
                                note.by &&
                                typeof note.by === "object"
                              ) {
                                const firstName =
                                  note.by.firstname ||
                                  note.by.first_name ||
                                  note.by.firstName ||
                                  "";
                                const lastName =
                                  note.by.lastname ||
                                  note.by.last_name ||
                                  note.by.lastName ||
                                  "";

                                userName =
                                  note.by.name ||
                                  note.by.fullname ||
                                  note.by.full_name ||
                                  (firstName && lastName
                                    ? `${firstName} ${lastName}`.trim()
                                    : "") ||
                                  note.by.username ||
                                  note.by.email ||
                                  "Unknown User";

                                if (note.by.role) {
                                  if (typeof note.by.role === "object") {
                                    userRole =
                                      note.by.role.name ||
                                      note.by.role.title ||
                                      note.by.role.role_name ||
                                      "User";
                                  } else if (
                                    typeof note.by.role === "string"
                                  ) {
                                    userRole = note.by.role;
                                  }
                                } else {
                                  userRole =
                                    note.by.role_name ||
                                    note.by.position ||
                                    "User";
                                }

                                userEmail = note.by.email || "";
                              }

                              return (
                                <div
                                  key={note.id || note._id || note.at}
                                  className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                                >
                                  <div className="flex items-start gap-2 mb-2">
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-gray-900">
                                        {userName}
                                      </p>
                                      {userEmail && (
                                        <p className="text-xs text-gray-400 truncate">
                                          {userEmail}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-500">
                                        {userRole} •{" "}
                                        {note.at
                                          ? formatDateTime(note.at)
                                          : "Recently"}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-700">
                                    {note.message}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    {/* Viewed By (Reviewer view – Dean / Dept Head / Secretary) */}
                      {submission && (
                        <div className="mb-4 pb-4 border-b">
                          <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Eye size={16} />
                            Viewed By (
                            {(nonFacultyViewedBy && nonFacultyViewedBy.length) ||
                              (nonFacultyRawViews && nonFacultyRawViews.length) ||
                              0}
                            )
                          </h4>

                          <div className="space-y-2">
                            {nonFacultyViewedBy && nonFacultyViewedBy.length > 0 ? (
                            nonFacultyViewedBy.map((viewer, idx) => {
                              const uid = viewer.id || viewer.userId || viewer._id || viewer.user || null;
                              const fetchedUser = uid ? reviewerUsers[uid] : null;
                              const displayName = fetchedUser?.name || viewer.name || uid || "Unknown";
                              const displayRole = fetchedUser?.role || viewer.role || "";
                              
                              // Get all views for this user from rawViews
                              const userViews = (submission.rawViews || [])
                                .filter(rv => {
                                  const rvUid = rv.user || rv.userId || (rv.by && (rv.by._id || rv.by.id)) || null;
                                  return String(rvUid) === String(uid);
                                })
                                .map(rv => ({
                                  at: rv.at || rv.timestamp || rv.viewedAt || null,
                                  _id: rv._id || rv.id
                                }))
                                .filter(v => v.at)
                                .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
                              
                              const isExpanded = expandedViewerId === uid;
                              
                              return (
                                <div key={uid || idx} className="bg-gray-50 rounded-lg overflow-hidden">
                                  <button
                                    onClick={() => setExpandedViewerId(isExpanded ? null : uid)}
                                    className="w-full flex items-start gap-3 p-2 hover:bg-gray-100 transition-colors"
                                  >
                                    <div className="p-1.5 bg-blue-100 rounded-full">
                                      <Eye size={14} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {displayName}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {displayRole} • {viewer.viewedAt ? formatDateTime(viewer.viewedAt) : ""}
                                        {userViews.length > 1 && (
                                          <span className="ml-1 text-blue-600">({userViews.length} views)</span>
                                        )}
                                      </p>
                                    </div>
                                  </button>
                                  
                                  {isExpanded && userViews.length > 1 && (
                                    <div className="px-2 pb-2 space-y-1">
                                      <div className="ml-9 pt-1 border-t border-gray-200">
                                        <p className="text-xs font-semibold text-gray-600 mb-1">View History:</p>
                                        {userViews.map((view, vIdx) => (
                                          <div key={view._id || vIdx} className="text-xs text-gray-500 py-0.5">
                                            • {formatDateTime(view.at)}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : 
                             nonFacultyRawViews && nonFacultyRawViews.length > 0 ? (
                              nonFacultyRawViews.map((rv, idx) => {
                                const uid =
                                  rv.user ||
                                  rv.userId ||
                                  (rv.by && (rv.by._id || rv.by.id)) ||
                                  null;
                                const at =
                                  rv.at || rv.timestamp || rv.viewedAt || null;
                                const fetchedUser = uid ? reviewerUsers[uid] : null;
                                const displayName =
                                  fetchedUser?.name || uid || "Unknown";
                                const displayRole = fetchedUser?.role || "";
                                return (
                                  <div
                                    key={rv._id || idx}
                                    className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg"
                                  >
                                    <div className="p-1.5 bg-blue-100 rounded-full">
                                      <Eye size={14} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {displayName}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {displayRole} {at ? "• " + formatDateTime(at) : ""}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-600">
                                No views recorded for this document.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {submission?.status === "submitted" && (
                        <div className="space-y-3">
                          {canSubmitOrReturn && (
                            <>
                              <button
                                onClick={() => setShowCommentModal(true)}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-sm"
                              >
                                <MessageSquare size={20} />
                                Add Comment
                              </button>

                              <button
                                onClick={() => handleActionClick("return")}
                                className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-sm"
                              >
                                <XCircle size={20} />
                                Return for Revision
                              </button>
                            </>
                          )}

                          {canReturnOnly && (
                            <>
                              <button
                                onClick={() => setShowCommentModal(true)}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-sm"
                              >
                                <MessageSquare size={20} />
                                Add Comment
                              </button>

                              <button
                                onClick={() => handleActionClick("return")}
                                className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-semibold transition-all shadow-sm"
                              >
                                <XCircle size={20} />
                                Return for Revision
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {(submission?.status === "pending" ||
                        submission?.status === "returned") && (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center mt-4">
                          <div className="flex justify-center mb-3">
                            <StatusBadge type={submission?.status} />
                          </div>
                          {submission?.status === "pending" && (
                            <p className="text-xs text-gray-600">
                              This document has been submitted by Department
                              Head.
                            </p>
                          )}
                          {submission?.status === "returned" && (
                            <p className="text-xs text-gray-600">
                              Returned for revision.
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  ) : canViewStatus ? (
                    <>
                      <h3 className="text-sm font-semibold tracking-widest text-gray-900 uppercase">
                        Submission Status
                      </h3>
                      <div className="w-24 h-0.5 bg-yellow-400 mt-2 mb-4 rounded" />

                      {/* Status Badge */}
                      <div className="mb-4 pb-4 border-b">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">
                            Current Status
                          </span>
                          <StatusBadge
                            type={submission?.status || "submitted"}
                          />
                        </div>
                        <p className="text-xs text-gray-600">
                          Submitted on{" "}
                          {submission?.submittedAt
                            ? formatDateTime(submission.submittedAt)
                            : "Loading..."}
                        </p>
                      </div>

                      {/* Your Submitted Files */}
                      {submission?.files && submission.files.length > 0 && (
                        <div className="mb-4 pb-4 border-b">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <FileText size={16} />
                            Your Submitted Files ({submission.files.length})
                          </h4>

                          <div className="space-y-2">
                            {submission.files.map((file, index) => (
                              <button
                                key={file.id}
                                onClick={() => setSelectedFileIndex(index)}
                                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                                  index === selectedFileIndex
                                    ? "bg-blue-50 border-blue-400 shadow-sm"
                                    : "bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <FileText
                                    size={16}
                                    className={
                                      index === selectedFileIndex
                                        ? "text-blue-600"
                                        : "text-gray-600"
                                    }
                                  />
                                  <span
                                    className={`text-sm font-medium truncate ${
                                      index === selectedFileIndex
                                        ? "text-blue-900"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {file.name}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 ml-5">
                                  Uploaded {formatDateTime(file.uploadedAt)}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Viewed By (Faculty) */}
                      {submission && (
                        <div className="mb-4 pb-4 border-b">
                          <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Eye size={16} />
                            Viewed By (
                            {(submission.viewedBy &&
                              submission.viewedBy.length) ||
                              (submission.rawViews &&
                                submission.rawViews.length) ||
                              0}
                            )
                          </h4>
                         

                          <div className="space-y-2">
                           {submission.viewedBy && submission.viewedBy.length > 0 ? (
                            submission.viewedBy.map((viewer, idx) => {
                              const uid = viewer.id || viewer.userId || viewer._id || null;
                              const fetchedUser = uid ? reviewerUsers[uid] : null;
                              const displayName = fetchedUser?.name || viewer.name || uid || "Unknown";
                              const displayRole = fetchedUser?.role || viewer.role || "";
                              
                              // Get all views for this user from rawViews
                              const userViews = (submission.rawViews || [])
                                .filter(rv => {
                                  const rvUid = rv.user || rv.userId || (rv.by && (rv.by._id || rv.by.id)) || null;
                                  return String(rvUid) === String(uid);
                                })
                                .map(rv => ({
                                  at: rv.at || rv.timestamp || rv.viewedAt || null,
                                  _id: rv._id || rv.id
                                }))
                                .filter(v => v.at)
                                .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
                              
                              const isExpanded = expandedViewerId === uid;
                              
                              return (
                                <div key={uid || idx} className="bg-gray-50 rounded-lg overflow-hidden">
                                  <button
                                    onClick={() => setExpandedViewerId(isExpanded ? null : uid)}
                                    className="w-full flex items-start gap-3 p-2 hover:bg-gray-100 transition-colors"
                                  >
                                    <div className="p-1.5 bg-blue-100 rounded-full">
                                      <Eye size={14} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {displayName}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {displayRole} • {viewer.viewedAt ? formatDateTime(viewer.viewedAt) : ""}
                                        {userViews.length > 1 && (
                                          <span className="ml-1 text-blue-600">({userViews.length} views)</span>
                                        )}
                                      </p>
                                    </div>
                                  </button>
                                  
                                  {isExpanded && userViews.length > 1 && (
                                    <div className="px-2 pb-2 space-y-1">
                                      <div className="ml-9 pt-1 border-t border-gray-200">
                                        <p className="text-xs font-semibold text-gray-600 mb-1">View History:</p>
                                        {userViews.map((view, vIdx) => (
                                          <div key={view._id || vIdx} className="text-xs text-gray-500 py-0.5">
                                            • {formatDateTime(view.at)}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : submission.rawViews &&
                              submission.rawViews.length > 0 ? (
                              submission.rawViews.map((rv, idx) => {
                                const uid =
                                  rv.user ||
                                  rv.userId ||
                                  (rv.by &&
                                    (rv.by._id || rv.by.id)) ||
                                  null;
                                const at =
                                  rv.at ||
                                  rv.timestamp ||
                                  rv.viewedAt ||
                                  null;
                                const fetchedUser = uid
                                  ? reviewerUsers[uid]
                                  : null;
                                const displayName =
                                  fetchedUser?.name || uid || "Unknown";
                                const displayRole =
                                  fetchedUser?.role || "";
                                return (
                                  <div
                                    key={rv._id || idx}
                                    className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg"
                                  >
                                    <div className="p-1.5 bg-blue-100 rounded-full">
                                      <Eye
                                        size={14}
                                        className="text-blue-600"
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {displayName}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {displayRole}{" "}
                                        {at
                                          ? "• " + formatDateTime(at)
                                          : ""}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-600">
                                No views recorded for this document.
                              </div>
                            )}

                            {showRawViews &&
                              submission.rawViews &&
                              submission.rawViews.length > 0 && (
                                <div className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded text-xs text-gray-600">
                                  <pre className="font-mono text-[11px] leading-snug whitespace-pre-wrap">
                                    {JSON.stringify(
                                      submission.rawViews,
                                      null,
                                      2
                                    )}
                                  </pre>
                                </div>
                              )}
                          </div>
                        </div>
                      )}

                      {/* Feedback & Comments (Faculty view) */}
                      {submission?.notes && submission.notes.length > 0 && (
                        <div className="mb-4 pb-4 border-b">
                          <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <MessageSquare size={16} />
                            Feedback &amp; Comments (
                            {submission.notes.length})
                          </h4>
                          <div className="space-y-3">
                            {submission.notes.map((note) => {
                              let userName = "Unknown User";
                              let userRole = "User";
                              let userEmail = "";

                              const userId =
                                typeof note.by === "string"
                                  ? note.by
                                  : note.by?._id || note.by?.id;

                              if (userId && reviewerUsers[userId]) {
                                const fetchedUser = reviewerUsers[userId];
                                userName = fetchedUser.name;
                                userRole = fetchedUser.role;
                                userEmail = fetchedUser.email;
                              } else if (
                                note.by &&
                                typeof note.by === "object"
                              ) {
                                const firstName =
                                  note.by.firstname ||
                                  note.by.first_name ||
                                  note.by.firstName ||
                                  "";
                                const lastName =
                                  note.by.lastname ||
                                  note.by.last_name ||
                                  note.by.lastName ||
                                  "";

                                userName =
                                  note.by.name ||
                                  note.by.fullname ||
                                  note.by.full_name ||
                                  (firstName && lastName
                                    ? `${firstName} ${lastName}`.trim()
                                    : "") ||
                                  note.by.username ||
                                  note.by.email ||
                                  "Unknown User";

                                if (note.by.role) {
                                  if (typeof note.by.role === "object") {
                                    userRole =
                                      note.by.role.name ||
                                      note.by.role.title ||
                                      note.by.role.role_name ||
                                      "User";
                                  } else if (
                                    typeof note.by.role === "string"
                                  ) {
                                    userRole = note.by.role;
                                  }
                                } else {
                                  userRole =
                                    note.by.role_name ||
                                    note.by.position ||
                                    "User";
                                }

                                userEmail = note.by.email || "";
                              }

                              return (
                                <div
                                  key={note.id || note.at}
                                  className="p-3 bg-amber-50 rounded-lg border border-amber-200"
                                >
                                  <div className="flex items-start gap-2 mb-2">
                                    <MessageSquare
                                      size={16}
                                      className="text-amber-600 mt-0.5 flex-shrink-0"
                                    />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-gray-900">
                                        {userName}
                                      </p>
                                      {userEmail && (
                                        <p className="text-xs text-gray-400 truncate">
                                          {userEmail}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-500">
                                        {userRole} •{" "}
                                        {note.at
                                          ? formatDateTime(note.at)
                                          : "Recently"}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-700 ml-6">
                                    {note.message}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Deadline Info */}
                      {submission?.deadline && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock size={16} className="text-blue-600" />
                            <span className="text-xs font-semibold text-blue-900">
                              Deadline
                            </span>
                          </div>
                          <p className="text-sm text-blue-800">
                            {formatDateTime(submission.deadline)}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
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
              {selectedAction === "submit"
                ? "Submit Document"
                : "Return for Revision"}
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              {selectedAction === "submit"
                ? "Are you sure you want to submit this document? You can add an optional note."
                : "Please provide feedback for the faculty member to revise their submission."}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {selectedAction === "submit"
                  ? "Add a note (optional)"
                  : "Feedback (required)"}
              </label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={
                  selectedAction === "submit"
                    ? "Add any comments or notes..."
                    : "Explain what needs to be revised..."
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
                disabled={
                  isSubmittingAction ||
                  (selectedAction === "return" && !actionNote.trim())
                }
                className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                  selectedAction === "submit"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-orange-600 hover:bg-orange-700 text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmittingAction ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : selectedAction === "submit" ? (
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
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 backdrop-blur-[2px] bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Comment
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              Add a comment or feedback for the faculty member. This will be
              visible to them.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Comment
              </label>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Enter your comment or feedback..."
                rows="5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setCommentText("");
                }}
                disabled={isSubmittingComment}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitComment}
                disabled={isSubmittingComment || !commentText.trim()}
                className="px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingComment ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Posting...
                  </>
                ) : (
                  <>
                    <MessageSquare size={18} />
                    Post Comment
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