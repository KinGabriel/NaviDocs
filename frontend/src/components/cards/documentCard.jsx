import { useState, useEffect } from 'react';
import RenameModal from '../modals/renameModal';
import ShareDocumentModal from '../modals/shareDocumentModal';
import DuplicateModal from '../modals/duplicateModal';
import DeleteModal from '../modals/deleteModal';
import { toast } from 'react-hot-toast';

import { assignControllersToTemplateAPI } from "../../api/documentContollerAPI";
import { renameDocumentAPI, deleteDocumentAPI,duplicateDocumentAPI, shareDocumentAPI } from "../../api/documentsAPI";

const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");

const API_URL =
  API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0];

export default function DocumentCard({ 
  document, 
  onSelect, 
  user, 
  onRename, 
  onDelete,
  onAssign,
}) {
  
  // Helper to safely read DB-backed fields with common fallbacks
  const getTitle = (doc) => doc?.title || doc?.from_template?.title || 'Untitled Document';

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  {/* Get creator/Owner name */}
    const getCreatorName = () => {
      if (!user) return "Unknown";
      if (user.firstname && user.lastname) {
        return `${user.firstname} ${user.lastname}`;
      }
      // Try name or username as fallback
      return user.name || user.username || "Unknown";
    };

  const getStatus = (doc) => {
    if (!doc) return 'draft';
    if (typeof doc.status === 'string') return doc.status;
    if (doc.status?.published) return 'published';
    if (doc.status?.pending_approval) return 'pending';
    if (doc.status?.approved) return 'approved';
    return 'draft';
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'published': return 'bg-blue-100 text-blue-800';
      case 'returned': return 'bg-orange-100 text-orange-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const status = getStatus(document);
  const notesCount = Array.isArray(document.notes) ? document.notes.length : 0;
  const school = document?.school || document?.from_template?.school || '';
  const title = getTitle(document);

  // ---------- menu & modals state ----------
  const [showMenu, setShowMenu] = useState(false);

  // Rename
  const [renameOpen, setRenameOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);

  // Assign
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => {
    try {
      const extractId = (a) => {
        if (!a) return null;
        if (typeof a === 'string' || typeof a === 'number') return String(a);
        if (typeof a === 'object') return String(a.userId || a.id || a._id || a.user || '');
        return null;
      };
      const src = Array.isArray(document?.assigned) ? document.assigned
        : (Array.isArray(document?.assignees) ? document.assignees
          : (Array.isArray(document?.collaborators) ? document.collaborators : []));
      return Array.isArray(src) ? src.map(extractId).filter(Boolean) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    const extractId = (a) => {
      if (!a) return null;
      if (typeof a === 'string' || typeof a === 'number') return String(a);
      if (typeof a === 'object') return String(a.userId || a.id || a._id || a.user || '');
      return null;
    };
    const src = Array.isArray(document?.assigned) ? document.assigned
      : (Array.isArray(document?.assignees) ? document.assignees
        : (Array.isArray(document?.collaborators) ? document.collaborators : []));
    setSelectedIds(Array.isArray(src) ? src.map(extractId).filter(Boolean) : []);
  }, [document?.assigned, document?.assignees, document?.collaborators]);

  // Duplicate
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ---------- menu actions ----------
  const handleMenuAction = (action, e) => {
    e.stopPropagation();
    setShowMenu(false);
    switch (action) {
      case 'rename':
        setRenameOpen(true);
        break;
      case 'assign':
        setAssignOpen(true);
        break;
      case 'duplicate':
        setDuplicateOpen(true);
        break;
      case 'delete':
        setDeleteError("");
        setDeleteOpen(true);
        break;
      default:
        break;
    }
  };

  // ---------- API handlers ----------
  const handleRename = async (newTitle) => {
    try {
      setRenaming(true);
      const resp = await renameDocumentAPI(document._id, newTitle);
      if (resp && (resp.success || resp.document)) {
        toast.success('Document renamed');
        if (typeof onRename === 'function') {
          onRename(resp.document || { ...document, title: newTitle });
        } else if (typeof window !== 'undefined') {
          window.location.reload();
        }
        setRenameOpen(false);
      } else {
        throw new Error(resp?.message || 'Failed to rename document');
      }
    } catch (err) {
      console.error('Rename document error:', err);
      alert(err?.response?.data?.message || err?.message || 'An error occurred while renaming.');
    } finally {
      setRenaming(false);
    }
  };

  const handleAssign = async (payload) => {
    try {
      const members = Array.isArray(payload)
        ? payload
        : (payload?.assignees || payload?.controllers || payload?.members || []);
      const resp = await assignControllersToTemplateAPI(document._id, members);
      if (resp && resp.success) {
        toast.success('Assigned members updated');
        const updated = resp.template || document;
        if (typeof onAssign === 'function') onAssign(updated);
        else if (typeof onRename === 'function') onRename(updated); // bubble up if parent manages list
        else window.location.reload();
      } else {
        toast.error(resp?.message || 'Failed to assign members');
      }
      } catch (err) {
      console.error('Assign error:', err);
      toast.error(err?.response?.data?.message || 'Error assigning members');
    } finally {
      setAssignOpen(false);
    }
  };

  const handleShare = async (payload) => {
    try {
      const members = Array.isArray(payload)
        ? payload
        : (payload?.assignees || payload?.controllers || payload?.members || []);
      const resp = await shareDocumentAPI(document._id, members);
      if (resp && (resp.success || resp.document)) {
        toast.success('Document shared');
        const updated = resp.document || document;
        if (typeof onAssign === 'function') onAssign(updated);
        else if (typeof onRename === 'function') onRename(updated);
        else window.location.reload();
      } else {
        toast.error(resp?.message || 'Failed to share document');
      }
    } catch (err) {
      console.error('Share error:', err);
      toast.error(err?.response?.data?.message || 'Error sharing document');
    } finally {
      setAssignOpen(false);
    }
  };

  const handleDuplicate = async (newDoc) => {
    try {
      setDuplicating(true);
      const newTitle = newDoc?.title || `${title} (Copy)`;
  const resp = await duplicateDocumentAPI(document._id, newTitle);
      if (resp && resp.success) {
        toast.success('Document duplicated');
        // optional: navigate/open
        setDuplicateOpen(false);
        if (typeof onSelect === 'function') {
          onSelect(resp.document || resp.data || document);
        } else if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } else {
        toast.error(resp?.message || 'Failed to duplicate document');
      }
    } catch (err) {
      console.error('Duplicate document error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Error duplicating document');
    } finally {
      setDuplicating(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      setDeleteError("");
  const resp = await deleteDocumentAPI(document._id);
      if (resp && resp.success) {
        toast.success('Document deleted');
        if (typeof onDelete === 'function') onDelete({ _id: document._id || document.id });
        else window.location.reload();
        setDeleteOpen(false);
      } else {
        setDeleteError(resp?.message || 'Failed to delete');
        toast.error(resp?.message || 'Failed to delete');
      }
    } catch (err) {
      setDeleteError(err?.response?.data?.message || err?.message || 'Error deleting');
    } finally { setDeleting(false); }
  };

  function getStatusStyle(status) {
  const normalized = String(status).toLowerCase().replace(/\s+/g, "_");
  const styles = {
    approved: "bg-green-50 text-green-700 border border-green-200",
    submitted: "bg-green-50 text-green-700 border border-green-200",
    pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    late: "bg-red-50 text-red-700 border border-red-200",
    rejected: "bg-red-50 text-red-700 border border-red-200",
    returned: "bg-orange-50 text-orange-700 border border-orange-200",
    draft: "bg-gray-50 text-gray-700 border border-gray-200",
    published: "bg-blue-50 text-blue-700 border border-blue-200",
    pending_review: "bg-purple-50 text-purple-700 border border-purple-200",
  };

  return styles[normalized] || "bg-gray-50 text-gray-700 border border-gray-200";
}
  
  return (
    <div className="m-2">
      <div className="relative w-[280px] bg-white rounded-lg shadow-md border border-gray-300 flex flex-col hover:shadow-lg transition-all duration-200 cursor-pointer overflow-visible">
        <div className="absolute top-2 right-2 z-10">
          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyle(status)}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        </div>
        {/* Preview */}
        <div 
          className="w-full h-[310px] bg-gray-50 flex items-center justify-center border-b border-gray-300 hover:bg-gray-100 transition-colors rounded-t-lg"
          onClick={onSelect}
        >
          {document.thumbnailUrl ? (
            <img
              src={
                document.thumbnailUrl.startsWith('http')
                  ? document.thumbnailUrl
                  : API_URL.replace(/\/$/, '') + (document.thumbnailUrl.startsWith('/') ? document.thumbnailUrl : '/' + document.thumbnailUrl)
              }
              alt="Document Thumbnail"
              className="object-contain w-full h-full rounded-t-lg"
              style={{ maxHeight: 310, maxWidth: 280, background: '#f9fafb' }}
              loading="lazy"
            />
          ) : (
            <div className="text-center">
              <svg 
                className="mx-auto h-16 w-16 text-gray-300 mb-3" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
              <span className="text-gray-400 text-sm">Document Preview</span>
              <p className="text-xs text-gray-300 mt-1">{document.document_size || 'A4'}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-start justify-between px-4 py-3 relative overflow-visible">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 leading-tight truncate" title={title}>
              {title}
            </p>

            {/* Created date */}
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>Created {formatDate(document.createdAt || document.created_at)}</span>
            </div>

            {/* Notes count */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h12a2 2 0 012 2z" />
              </svg>
              <span>{notesCount} note{notesCount !== 1 ? 's' : ''}</span>
            </div>

            {/* School */}
            {school && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
                </svg>
                <span>{school}</span>
              </div>
            )}

            {/* Creator/Owner */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>By {getCreatorName()}</span>
            </div>
          </div>

          {/* 3-dot menu */}
          <div className="relative">
            <button
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              title="Actions"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm0 5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
              </svg>
            </button>

            {showMenu && (
              <>
                {/* backdrop to close menu */}
                <div
                  className="fixed inset-0 z-[40]"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-8 z-[9999] w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={(e) => handleMenuAction('rename', e)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>
                    Rename
                  </button>

                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={(e) => handleMenuAction('assign', e)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 21a8 8 0 0 0-16 0"/>
                      <circle cx="10" cy="8" r="5"/>
                      <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>
                    </svg>
                    Assign
                  </button>

                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={(e) => handleMenuAction('duplicate', e)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Make a Copy
                  </button>

                  <button
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    onClick={(e) => handleMenuAction('delete', e)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Archive  
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Rename Modal */}
      <RenameModal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        currentTitle={title}
        submitting={renaming}
        onSubmit={handleRename}
      />

      {/* Share Modal (replaces Assign) */}
      <ShareDocumentModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        template={document}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        onShare={handleShare}
        submitting={false}
      />

      {/* Duplicate Modal */} 
      <DuplicateModal
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        type="document"
        item={document}
        submitting={duplicating}
        onDuplicate={handleDuplicate}
      />

      {/* Delete Modal */}
      <DeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        itemType="document"
        itemTitle={title}
        onConfirm={confirmDelete}
        submitting={deleting}
        error={deleteError}
      />
    </div>
  );
}
