import React from 'react';

const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");
const API_URL =
  API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0];

export default function DocumentCard({ document, onSelect, user, onRename, onDelete }) {
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
  const creator = document?.created_by ? String(document.created_by) : (document?.created_by?._id ? String(document.created_by._id) : null);
  const title = getTitle(document);

  return (
    <div className="m-2">
      <div className="relative w-[280px] bg-white rounded-lg shadow-md border border-gray-300 flex flex-col hover:shadow-lg transition-all duration-200 cursor-pointer overflow-visible">
        <div className="absolute top-2 right-2 z-10">
          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(status)}`}>
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

            <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>Created {formatDate(document.createdAt || document.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h12a2 2 0 012 2z" />
              </svg>
              <span>{notesCount} note{notesCount !== 1 ? 's' : ''}</span>
            </div>
            {school ? (
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 6 2-7L2 9h7z" />
                </svg>
                <span>{school}</span>
              </div>
            ) : null}

            {creator ? (
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM6 20v-1a4 4 0 014-4h4a4 4 0 014 4v1" />
                </svg>
                <span>By {creator.length > 8 ? creator.slice(0,8) + '...' : creator}</span>
              </div>
            ) : null}
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              onClick={(e) => { e.stopPropagation(); /* simple menu placeholder */ const confirmed = window.confirm('Rename document?'); if (confirmed && onRename) onRename(document); }}
              title="Actions"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm0 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm0 5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
