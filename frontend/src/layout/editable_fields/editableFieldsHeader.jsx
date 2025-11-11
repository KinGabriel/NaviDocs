import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import naviLogo from '../../assets/images/navilogo.png';
import defaultProfile from '../../assets/images/profile_picture.png';
import DownloadingModal from "../../components/modals/downloadingModal";
import DocumentVersionHistory from '../../pages/version_history/documentVersionHistory';
import ShareDocumentModal from "../../components/modals/shareDocumentModal";
import { shareDocumentAPI } from "../../api/documentsAPI";
import { ChevronDown, Copy, Send, FileDown, MoreHorizontal, Share2, FolderPlus, Menu } from "lucide-react";
import StoragePickerModal from "../../components/modals/storagePickerModal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function EditableFieldsHeader({ 
  title = "Course Syllabus FTS", 
  user,
  setTitle, 
  onSave,
  onArchive,
  onExportPDF,
  saving = false, 
  lastSavedAt, 
  dirty = false,
  documentId,
  documentData, 
  onDocumentUpdate,

  // for mobile sidebar toggle
  mobileSidebarOpen,
  setMobileSidebarOpen,
}) {
  const navigate = useNavigate();
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const [editing, setEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(title || '');
  const inputRef = useRef(null);

  const [dlOpen, setDlOpen] = useState(false);
  const [dlErr, setDlErr] = useState("");

  const [shareOpen, setShareOpen] = useState(false);
  const [shareSelectedIds, setShareSelectedIds] = useState([]);
  const [shareSubmitting, setShareSubmitting] = useState(false);

  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const shareMenuRef = useRef(null);
  const quickMenuRef = useRef(null);

  const [showStoragePicker, setShowStoragePicker] = useState(false);

  const roleName = user?.role?.name || "";
  const canSeeSubmit = !["Dean", "Secretary", "Department Head"].includes(roleName);

  useEffect(() => {
    setLocalTitle(title || '');
  }, [title]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitTitle = () => {
    setEditing(false);
    const t = (localTitle || '').trim();
    if (setTitle) setTitle(t);
  };

  const onKeyDownTitle = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTitle();
      if (onSave) onSave();
    } else if (e.key === 'Escape') {
      setEditing(false);
      setLocalTitle(title || '');
    }
  };

  const handleArchive = () => {
    if (onArchive) onArchive();
  };

  async function handleExportPDF(options = { store: true }) {
    setDlErr("");
    setDlOpen(true);
    try {
      await onExportPDF?.(options);
      setDlOpen(false);
    } catch (err) {
      setDlErr(
        err?.response?.data?.message ||
        err?.message ||
        "We couldn’t generate the PDF right now. Please try again."
      );
    }
  }

  return (
    <div className="sticky top-0 z-50 bg-[#f3f3f3] shadow-sm">
      <div className="h-4 bg-[#063c8d] w-full" /> 

      <div className="flex flex-wrap items-center justify-between bg-[#f3f3f3] px-4 lg:px-8 py-3 border-b border-gray-200">
        {/* LEFT CLUSTER: logo, hamburger (mobile), back (desktop), title */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo */}
          <img 
            title="Navidocs home"
            src={naviLogo} 
            alt="Logo" 
            className="w-15 h-10 cursor-pointer flex-shrink-0" 
            onClick={() => {
              const role = user?.role?.name;
              if (role === "Secretary") navigate("/documents");
              else if (role === "Dean") navigate("/documents");
              else if (role === "Lead Document Controller") navigate("/documents");
              else if (role === "Document Control Officer") navigate("/documents");
              else if (role === "Department Head") navigate("/documents");
              else if (role === "Faculty") navigate("/documents");
              else if (role === "Document Controller") navigate("/documents")
            }}
          />

          {/* Hamburger (mobile only) */}
          <button
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
            title="Toggle sidebar"
            onClick={() => setMobileSidebarOpen?.(!mobileSidebarOpen)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Back button (desktop only) */}
          <button
            onClick={() => navigate("/documents")}
            className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
            aria-label="Back"
            title="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Divider (desktop aesthetic only) */}
          <span
            aria-hidden="true"
            className="h-6 w-px bg-gray-300 mx-1 hidden lg:inline-block"
          />

          {/* Title / inline edit */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center min-w-0">
              {editing ? (
                <input
                  ref={inputRef}
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={onKeyDownTitle}
                  className="text-xl font-medium text-gray-800 border-b border-gray-300 focus:outline-none px-1 py-0.5 bg-transparent min-w-0"
                />
              ) : (
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-xl font-medium text-gray-800 truncate max-w-[160px] sm:max-w-[240px] md:max-w-[320px] lg:max-w-none">
                    {title}
                  </span>
                  <button
                    title="Edit title"
                    onClick={() => setEditing(true)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"
                      className="lucide lucide-square-pen-icon lucide-square-pen">
                      <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT CLUSTER: status, buttons, avatar */}
        <div className="flex flex-wrap items-center gap-3 mt-3 lg:mt-0">
          {/* Save status */}
          <div className="flex flex-col items-start leading-tight">
            {lastSavedAt && (
              <span className="text-[10px] text-gray-500">
                Saved {lastSavedAt.toLocaleTimeString()}
              </span>
            )}
            {dirty && !saving && (
              <span className="text-[10px] text-amber-600">
                Unsaved changes
              </span>
            )}
            {saving && (
              <span className="text-[10px] text-blue-600">
                Saving...
              </span>
            )}
          </div>

          {/* Version History btn */}
          <button 
            onClick={() => setShowVersionHistory(true)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded" 
            title="History"
          > 
            <svg xmlns="http://www.w3.org/2000/svg" width="1.9em" height="1.9em" viewBox="0 0 24 24">
              <path fill="#7D7D7D" 
                d="M12 21q-3.45 0-6.012-2.287T3.05 13H5.1q.35 2.6 2.313 4.3T12 19q2.925 0 4.963-2.037T19 12t-2.037-4.962T12 5q-1.725 0-3.225.8T6.25 8H9v2H3V4h2v2.35q1.275-1.6 3.113-2.475T12 3q1.875 0 3.513.713t2.85 1.924t1.925 2.85T21 12t-.712 3.513t-1.925 2.85t-2.85 1.925T12 21m2.8-4.8L11 12.4V7h2v4.6l3.2 3.2z"
              />
            </svg> 
          </button>

          {/* Share */}
          <div className="relative" ref={shareMenuRef}>
            <button
              onClick={() => {
                const extractId = (a) => {
                  if (!a) return null;
                  if (typeof a === "string" || typeof a === "number") return String(a);
                  if (typeof a === "object")
                    return String(a.userId || a.id || a._id || a.user || "");
                  return null;
                };

                const src = Array.isArray(documentData?.assigned)
                  ? documentData.assigned
                  : Array.isArray(documentData?.from_template?.assigned)
                  ? documentData.from_template.assigned
                  : [];

                const assigned = Array.isArray(src)
                  ? src.map(extractId).filter(Boolean)
                  : [];

                setShareSelectedIds(assigned);
                setShareOpen(true);
              }}
              className="flex items-center space-x-2 bg-[#063c8d] text-white rounded text-sm font-semibold hover:bg-[#052c6d] px-4 py-2.5 shadow-sm transition-all"
            >
              <div className="w-4 h-4 rounded flex items-center justify-center">
                <Share2 color="#ffffff" />
              </div>
              <div className="text-left">
                <div className="font-medium text-white text-sm font-semibold">
                  Share
                </div>
              </div>
            </button>
          </div>

          {/* Quick Actions dropdown */}
          <div className="relative" ref={quickMenuRef}>
            <button
              onClick={() => setIsQuickOpen((o) => !o)}
              className="bg-gray-700 hover:bg-gray-800 text-white rounded px-5 py-2.5 text-sm font-medium flex items-center gap-2 shadow-lg"
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="font-semibold whitespace-nowrap">Quick Actions</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isQuickOpen ? 'rotate-180' : ''}`} />
            </button>

            {isQuickOpen && (
              <div className="absolute right-0 mt-2 w-64 z-50">
                <div className="bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                  <button className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3" onClick={() => setIsQuickOpen(false)}>
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Copy className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">Make a Copy</div>
                      <div className="text-xs text-gray-500">Duplicate this document</div>
                    </div>
                  </button>

                  {/* SHOW "Submit" ONLY IF not Dean/Secretary/Dept Head */}
                  {canSeeSubmit && (
                    <button className="w-full text-left px-4 py-3 hover:bg-green-50 flex items-center gap-3" onClick={() => setIsQuickOpen(false)}>
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Send className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">Submit</div>
                        <div className="text-xs text-gray-500">Send to department head</div>
                      </div>
                    </button>
                  )}

                  <div className="px-2 py-2">
                    <button
                      className="w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center gap-3 rounded-md" 
                      onClick={async () => {
                        setIsQuickOpen(false);
                        await handleExportPDF({ store: false });
                      }}
                    >
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <FileDown className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">Export & Download</div>
                        <div className="text-xs text-gray-500">Generate PDF and download directly to your browser</div>
                      </div>
                    </button>

                    <button
                      className="w-full text-left mt-2 px-4 py-3 hover:bg-blue-50 flex items-center gap-3 rounded-md" 
                      onClick={() => {
                        setIsQuickOpen(false);
                        setShowStoragePicker(true);
                      }}
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FolderPlus className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">Export to Storage & Download…</div>
                        <div className="text-xs text-gray-500">Choose folder or create new, then save and download</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

           {/* Profile picture */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow overflow-hidden bg-white border border-gray-200">
              <img
                src={
                  user?.profile_picture
                    ? `${API_URL}${user.profile_picture}`
                    : defaultProfile
                }
                alt="Profile"
                className={`object-cover ${
                  user?.profile_picture ? "w-full h-full" : "w-8 h-8 object-contain opacity-90"
                }`}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = defaultProfile;
                }}
              />
            </div>
        </div>
      </div>

      {/* Version History */}
      {showVersionHistory && (
        <div className="fixed inset-0 z-[100] bg-white">
          <DocumentVersionHistory onClose={() => setShowVersionHistory(false)} documentId={documentId} />
        </div>
      )}

      {/* Downloading Modal */}
      <DownloadingModal
        open={dlOpen || !!dlErr}
        onClose={() => { setDlOpen(false); setDlErr(""); }}
        isError={!!dlErr}
        title="Downloading PDF…"
        message={`"${(title || "Document")}" is being prepared as a PDF. This may take a few seconds.`}
        errorText={dlErr}
      />

      {/* Share Modal */}
      <ShareDocumentModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        template={documentData || {}}
        selectedIds={shareSelectedIds}
        setSelectedIds={setShareSelectedIds}
        onShare={async ({ assignees }) => {
          try {
            setShareSubmitting(true);
            await shareDocumentAPI(documentId, assignees);
            if (onDocumentUpdate) {
              onDocumentUpdate({ assigned: Array.isArray(assignees) ? assignees : [] });
            }
            setShareOpen(false);
          } catch (err) {
            console.error('Failed to share document', err);
            const serverMsg = err.responseData?.message || err.message || 'Failed to share document';
            try { toast.error(serverMsg); } catch(e) { /* ignore toast failures */ }
          } finally {
            setShareSubmitting(false);
          }
        }}
        submitting={shareSubmitting}
      />

      {/* Storage Picker Modal */}
      <StoragePickerModal
        open={showStoragePicker}
        onClose={() => setShowStoragePicker(false)}
        user={user}
        onConfirm={async (folderId) => {
          setDlErr("");
          setDlOpen(true);
          try {
            await onExportPDF?.({ store: true, folderId });
            setDlOpen(false);
          } catch (err) {
            setDlErr(
              err?.response?.data?.message ||
              err?.message ||
              "We couldn’t generate the PDF right now. Please try again."
            );
          }
        }}
      />
    </div>
  );
}
