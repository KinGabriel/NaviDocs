import { useState } from 'react';

export default function TemplateCard({ template, onSelect, user, onApprove, onPublish }) {
  const [showMenu, setShowMenu] = useState(false);

  // Helper function to get template status
  const getTemplateStatus = (template) => {
    if (typeof template.status === 'string') {
      // Treat fully approved "pending" as approved for clearer UX in grid
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

  // Helper function to get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'published': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to extract school from document code
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

  //  Format date helper
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

  // Handle menu actions
  const handleMenuAction = (action, e) => {
    e.stopPropagation(); // Prevent card click
    setShowMenu(false);
    
    switch (action) {
      case 'edit':
        onSelect();
        break;
      case 'duplicate':
        // Handle duplicate logic
        console.log('Duplicate template:', template._id);
        break;
      case 'delete':
        // Handle delete logic
        console.log('Delete template:', template._id);
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

  return (
 <div className="relative w-[280px] bg-white rounded-lg shadow border border-gray-500 flex flex-col overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer">
      
      {/*  Status & actions cluster */}
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

      {/*  Document Preview*/}
      <div 
        className="w-full h-[310px] bg-gray-50 flex items-center justify-center border-b border-gray-500 hover:bg-gray-100 transition-colors"
        onClick={onSelect}
      >
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
      </div>

      {/*  Footer with dynamic content */}
      <div className="flex items-start justify-between px-4 py-3">
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

        {/*  3-dot menu with dropdown */}
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

          {/*  Dropdown Menu */}
          {showMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-[40]" 
                onClick={() => setShowMenu(false)}
              />
              
              {/* Menu */}
              <div className="absolute right-0 top-8 z-[60] w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  onClick={(e) => handleMenuAction('edit', e)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  onClick={(e) => handleMenuAction('duplicate', e)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Duplicate
                </button>
                
                <button
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  onClick={(e) => handleMenuAction('delete', e)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
