import { useState, useEffect } from 'react';
import UnpublishModal from '../modals/unpublishModal';

const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");
const API_URL =
  API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0];

export default function PublishedCard({
  template,
  onSelect,
  user,
  onApprove,
  onPublish,
  onUnpublish,
  onRenameRequest,        // (template) => void
  onDuplicateRequest,     // (template) => void
  onUnpublishRequest,     // (template) => void
}) {

  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modalCloseTs, setModalCloseTs] = useState(0);

  const justClosedModal = () => setModalCloseTs(Date.now());
  const ignoreClickNow = () => (Date.now() - modalCloseTs) < 300;
  const isAnyModalOpen = false;

  // the real permission check; removed the buggy top-level placeholders 
  const canUnpublish = () => {
    if (!user || !template) return false;

    const userId = user._id || user.id;
    const userRole = (typeof user?.role === 'string') ? user.role : user?.role?.name;

    if (userRole === 'Document Controller') return true;

    const ownerId = template.created_by?._id || template.created_by?.id || template.created_by;
    if (ownerId && String(ownerId) === String(userId)) return true;

    const assigned = template.assigned || template.assignees || [];
    return assigned.some(a => {
      const assignedId = (typeof a === 'string')
        ? a
        : (a._id || a.id || a.userId || a.user);
      return assignedId && String(assignedId) === String(userId);
    });
  };

  const getTemplateStatus = (template) => {
    if (typeof template.status === 'string') {
      if (template.status === 'pending' && template.approvalMeta?.isFullyApproved) return 'approved';
      return template.status;
    }
    if (template.computed_status) return template.computed_status;
    if (template.status?.published) return 'published';
    if (template.status?.pending_approval) {
      if (template.approvalMeta?.isFullyApproved) return 'approved';
      return 'pending';
    }
    if (template.status?.approved) return 'approved';
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
      case 'endorsed': return 'bg-purple-100 text-purple-800';
      case 'disapproved': return 'bg-rose-100 text-rose-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const extractSchoolFromCode = (documentCode) => {
    if (!documentCode) return 'Unknown';
    const parts = documentCode.split('-');
    if (parts.length >= 2) {
      const schoolCode = parts[1];
      const schoolMap = {
        'VAA': 'University Wide',
        'SMI': 'SAMCIS',
        'STL': 'STELA'
      };
      return schoolMap[schoolCode] || schoolCode;
    }
    return 'Unknown';
  };

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

  const handleMenuAction = (action, e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (action === "rename") onRenameRequest?.(template);
    if (action === "duplicate") onDuplicateRequest?.(template);
    if (action === "unpublish") onUnpublishRequest?.(template);
  };

  const status = getTemplateStatus(template);
  const approvalMeta = template.approvalMeta || {};
  const rawRole = (typeof user?.role === 'string') ? user.role : user?.role?.name;
  const userRole = (rawRole || '').toString().toLowerCase();
  const roleKey = userRole === 'secretary' ? 'secretary' : userRole === 'dean' ? 'dean' : null;
  const canApprove = !!(roleKey && approvalMeta && !approvalMeta[`${roleKey}Approved`] && ['pending', 'draft', 'approved'].includes(status) && template.status !== 'published');
  const canPublish = !!(approvalMeta && (approvalMeta.canPublish || (approvalMeta.isFullyApproved && status !== 'published')));

  const handleApproveClick = (e) => {
    e.stopPropagation();
    if (onApprove) onApprove(template);
  };
  const handlePublishClick = (e) => {
    e.stopPropagation();
    if (onPublish) onPublish(template);
  };

  const confirmUnpublish = async () => {
    try {
      setUnpublishing(true);
      setIsLoading(true);
      setUnpublishError("");
      if (onUnpublish) {
        await onUnpublish(template._id);
      }
      setUnpublishOpen(false);
      justClosedModal();
    } catch (err) {
      setUnpublishError(err?.response?.data?.message || err?.message || 'Error unpublishing template');
    } finally {
      setUnpublishing(false);
      setIsLoading(false);
    }
  };

  const guardMouseDown = (e) => {
    if (isAnyModalOpen || ignoreClickNow()) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  const guardClick = (e) => {
    if (isAnyModalOpen || ignoreClickNow()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (typeof onSelect === 'function') onSelect();
  };

  return (
    <>
      <div
        className={`relative w-[280px] bg-white rounded-lg shadow-md border border-gray-300 flex flex-col hover:shadow-lg transition-all duration-200 cursor-pointer overflow-visible ${isAnyModalOpen ? 'pointer-events-none' : ''}`}
        onMouseDown={guardMouseDown}
        onClick={(e) => {
          if (showMenu) { e.stopPropagation(); return; }
          guardClick(e);
        }}
      >
        <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(status)}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
          {canPublish && (
            <button
              onClick={handlePublishClick}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow"
              title="Publish template"
            >
              Publish
            </button>
          )}
          {canApprove && !canPublish && (
            <button
              onClick={handleApproveClick}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-600 text-white hover:bg-green-700 shadow"
              title="Approve as your role"
            >
              Approve
            </button>
          )}
        </div>

        {/* Document Preview or Thumbnail */}
        <div
          className="w-full h-[310px] bg-gray-50 flex items-center justify-center border-b border-gray-300 hover:bg-gray-100 transition-colors rounded-t-lg"
          onMouseDown={guardMouseDown}
          onClick={(e) => {
            if (showMenu) { e.stopPropagation(); return; }
            guardClick(e);
          }}
        >
          {template.thumbnailUrl ? (
            <img
              src={
                template.thumbnailUrl.startsWith('http')
                  ? template.thumbnailUrl
                  : API_URL.replace(/\/$/, '') + (template.thumbnailUrl.startsWith('/') ? template.thumbnailUrl : '/' + template.thumbnailUrl)
              }
              alt="Template Thumbnail"
              className="object-contain w-full h-full rounded-t-lg"
              loading="lazy"
            />
          ) : (
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-gray-400 text-sm">Document Preview</span>
              <p className="text-xs text-gray-300 mt-1">{template.document_size || 'A4'}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-start justify-between px-4 py-3 relative overflow-visible">
          <div className="flex-1 min-w-0">
            {/*  Template Title */}
            <p className="text-sm font-medium text-gray-900 leading-tight truncate" title={template.title}>
              {template.title || 'Untitled Template'}
            </p>

            {/* Document Code */}
            <p className="text-xs text-blue-600 font-mono mt-1">
              {template.document_code || 'No Code'}
            </p>
            {/* School and Date Info */}
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4z" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{extractSchoolFromCode(template.document_code)}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Created {formatDate(template.createdAt || template.created_at)}</span>
            </div>
          </div>

          {/* 3-dot button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu((prev) => !prev);
              }}
              className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
              title="More options"
              aria-haspopup="menu"
              aria-expanded={showMenu ? "true" : "false"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-[40]"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
                />
                <div
                  className="absolute right-0 top-8 z-[9999] w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Rename */}
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={(e) => { e.stopPropagation(); handleMenuAction("rename", e); }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></svg>
                    Rename
                  </button>
                  {/* Duplicate */}
                  <button
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={(e) => { e.stopPropagation(); handleMenuAction("duplicate", e); }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Make a Copy
                  </button>
                  {/* Unpublish (gated by permission) */}
                  {canUnpublish() && (
                    <button
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      onClick={(e) => { e.stopPropagation(); handleMenuAction("unpublish", e); }}
                      disabled={isLoading}
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {/* box */}
                        <path d="M4 10v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7" />
                        <path d="M7 10V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v3" />
                        {/* arrow down to box (unpublish) */}
                        <path d="M12 6v8" />
                        <path d="M9.5 11.5 12 14l2.5-2.5" />
                      </svg>

                      Unpublish
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

    </>
  );
}