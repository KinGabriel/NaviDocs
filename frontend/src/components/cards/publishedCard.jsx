import { useState, useEffect } from 'react';
import AssignMembersModal from "../modals/assignMembersModal";
import UnpublishModal from '../modals/unpublishModal';
import { assignControllersToTemplateAPI } from "../../api/documentContollerAPI";

const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");
const API_URL =
  API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0];

export default function PublishedCard({ template, onSelect, user, onApprove, onPublish, onAssign }) {

  const [showMenu, setShowMenu] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [unpublishError, setUnpublishError] = useState("");

  const isAnyModalOpen = assignOpen || unpublishOpen;

  const [modalCloseTs, setModalCloseTs] = useState(0);
  const justClosedModal = () => setModalCloseTs(Date.now());
  const ignoreClickNow = () => (Date.now() - modalCloseTs) < 300;

  const [selectedIds, setSelectedIds] = useState(() => {
    try {
      return Array.isArray(template?.assigned) ? [...template.assigned] : (Array.isArray(template?.assignees) ? [...template.assignees] : []);
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    setSelectedIds(Array.isArray(template?.assigned) ? [...template.assigned] : (Array.isArray(template?.assignees) ? [...template.assignees] : []));
  }, [template?.assigned, template?.assignees]);

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
      case 'assigned': return 'bg-purple-100 text-purple-800';
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
    
    switch (action) {
      case 'assign':
        setSelectedIds(Array.isArray(template?.assigned) ? [...template.assigned] : (Array.isArray(template?.assignees) ? [...template.assignees] : []));
        setAssignOpen(true);
        break;
      case 'unpublish':
        setUnpublishError("");
        setUnpublishOpen(true);
        break;
      default:
        break;
    }
  };

  const status = getTemplateStatus(template);
  const approvalMeta = template.approvalMeta || {};
  const rawRole = (typeof user?.role === 'string') ? user.role : user?.role?.name;
  const userRole = (rawRole || '').toString().toLowerCase();
  const roleKey = userRole === 'secretary' ? 'secretary' : userRole === 'dean' ? 'dean' : null;
  const canApprove = !!(roleKey && approvalMeta && !approvalMeta[`${roleKey}Approved`] && ['pending','draft','approved'].includes(status) && template.status !== 'published');
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
      setUnpublishError("");
      console.log("Unpublishing template:", template._id);
      setUnpublishOpen(false);
      justClosedModal();
    } catch (err) {
      setUnpublishError(err?.message || 'Error unpublishing template');
    } finally {
      setUnpublishing(false);
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
        onClick={guardClick}
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

        {/*  Document Preview or Thumbnail */}
        <div 
          className="w-full h-[310px] bg-gray-50 flex items-center justify-center border-b border-gray-300 hover:bg-gray-100 transition-colors rounded-t-lg"
          onMouseDown={guardMouseDown}
          onClick={guardClick}
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
              <p className="text-xs text-gray-300 mt-1">{template.document_size || 'A4'}</p>
            </div>
          )}
        </div>

        {/*  Footer with dynamic content */}
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
            
            {/*  School and Date Info */}
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4z"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>{extractSchoolFromCode(template.document_code)}</span>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>Created {formatDate(template.createdAt || template.created_at)}</span>
            </div>

            {/* Approval role indicators */}
            {approvalMeta && (
              <div className="flex items-center gap-2 mt-2">
                {['secretary','dean'].map(r => {
                  const approved = approvalMeta[`${r}Approved`];
                  return (
                    <div key={r} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${approved ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-500'}`} title={`${r.charAt(0).toUpperCase()+r.slice(1)} ${approved ? 'approved' : 'pending'}`}> 
                      <span className={`w-2 h-2 rounded-full ${approved ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      {r === 'secretary' ? 'Sec' : 'Dean'}
                    </div>
                  );
                })}
                {approvalMeta.isFullyApproved && !['published'].includes(status) && (
                  <div className="text-[10px] text-green-600 font-semibold" title="Fully approved awaiting publish">2/2</div>
                )}
              </div>
            )}
          </div>

          {/* 3-dot menu with dropdown */}
<div className="relative">
  <button
    className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
    onClick={(e) => {
      e.stopPropagation();
      setShowMenu(!showMenu);
    }}
  >
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm0 5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
    </svg>
  </button>

  {/* Dropdown Menu */}
  {showMenu && (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[40]"
        onClick={() => setShowMenu(false)}
      />

      {/* Menu */}
      <div className="absolute right-0 top-8 z-[9999] w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
        {/* Assign */}
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

{/* Unpublish */}
<button
  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
  onClick={(e) => handleMenuAction('unpublish', e)} // <-- fix here
>
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M16 16l-4 4-4-4" />     
    <path d="M12 12v8" />           
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 0 0 4 14.9" /> {/* Cloud */}
  </svg>
  Unpublish
</button>

      </div>
    </>
  )}
</div>

        </div>
      </div>

      {/* Assign Modal */}
      <AssignMembersModal
        open={assignOpen}
        onClose={() => { setAssignOpen(false); justClosedModal(); }}
        template={template}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        setTheDocController={(id) => console.log("Set controller:", id)}
        onAssign={async (payload) => {
          try {
            const controllers = Array.isArray(payload)
              ? payload
              : (payload && (payload.assignees || payload.controllers)) || [];

            const resp = await assignControllersToTemplateAPI(template._id, controllers);
            if (resp && resp.success) {
              if (typeof onAssign === 'function') {
                onAssign(resp.template || template);
              } else if (typeof onDelete === 'function') {
                // backward compatibility: call onDelete if present
                onDelete(resp.template || template);
              } else if (typeof window !== 'undefined') {
                // fallback: reload to reflect changes
                window.location.reload();
              }
            } else {
              alert(resp?.message || 'Failed to assign controllers');
            }
          } catch (err) {
            console.error('Assign controllers error', err);
            alert(err.response?.data?.message || 'Error assigning controllers');
          } finally {
            setAssignOpen(false);
            justClosedModal();
          }
        }}
      />
      
      {/* Unpublish Modal */}
      <UnpublishModal
        open={unpublishOpen}
        onClose={() => { setUnpublishOpen(false); justClosedModal(); }}
        itemType="template"
        itemTitle={template.title}
        onConfirm={confirmUnpublish}
        submitting={unpublishing}
        error={unpublishError}
      />
    </>
  )};
