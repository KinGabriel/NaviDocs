import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronDown, ChevronRight, MoreVertical, Clock, Copy, RotateCcw, X, FileText, User } from 'lucide-react';
import TextEditor from "../../layout/create_template/textEditor";
import fetchAndNormalizeDocument from "../../utils/documentLoader";
import BookmarkModal from './bookmarkModal';
import {
  listVersionDataByDocumentAPI,
  patchVersionBookmarkAPI,
  restoreDocumentVersionAPI,
} from '../../api/documentsAPI';

export default function DocumentVersionHistory({ 
  onClose, 
  documentId,
  currentFields = {},
  currentContent = null,
  pageSetup = null
}) {
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [expandedDates, setExpandedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [menuOpen, setMenuOpen] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [highlightChanges, setHighlightChanges] = useState(true);
  // UI refs / extra state used by this component
  const [versionContent, setVersionContent] = useState(null);
  const [docData, setDocData] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [docError, setDocError] = useState(null);
  const [docPage, setDocPage] = useState(0);
  const menuRef = useRef(null);
  const editorRef = useRef(null);
  const isApplyingRef = useRef(false);
  // Bookmark modal state
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkTarget, setBookmarkTarget] = useState(null);
  const [bookmarkName, setBookmarkName] = useState('');
  // Helper: format a raw field key into a human label (Title Case)
  const formatFieldLabel = (key) => {
    if (!key) return '';
    // convert camelCase or snake_case to Title Case
    const spaced = key.replace(/([A-Z])/g, ' $1').replace(/[_\-]/g, ' ');
    return spaced.replace(/^./, s => s.toUpperCase());
  };

  // Helper: normalize keys for stable comparison (removes separators, lowercases)
  const normalizeKey = (k) => {
    if (!k && k !== 0) return '';
    const s = String(k);
    // Replace underscores/dashes with spaces, insert spaces before capitals, remove non-alphanum, then lowercase
    const withSpaces = s.replace(/[_\-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
    return withSpaces.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  };

  // Load the actual document data
  useEffect(() => {
    if (!documentId) return;
    
    let ignore = false;
    const load = async () => {
      setLoadingDoc(true);
      setDocError(null);
      try {
        const normalized = await fetchAndNormalizeDocument(documentId);
        console.debug('DocumentVersionHistory: fetched normalized document', normalized);
        
        // Fallback logic for pages_json
        if ((!normalized.pages_json || normalized.pages_json.length === 0) && normalized.document && normalized.document.pages_json) {
          normalized.pages_json = Array.isArray(normalized.document.pages_json) ? normalized.document.pages_json : [normalized.document.pages_json];
        }
        
        if ((!normalized.pages_json || normalized.pages_json.length === 0) && (normalized.document?.pages_html || normalized.document?.html || normalized.pages_html)) {
          const html = normalized.document?.pages_html || normalized.document?.html || normalized.pages_html;
          normalized.pages_json = Array.isArray(html) ? html : [html];
        }
        
        if (!ignore) {
          setDocData(normalized);
        }
      } catch (err) {
        console.error('Failed to load document:', err);
        if (!ignore) setDocError(err?.message || "Failed to load document");
      } finally {
        if (!ignore) setLoadingDoc(false);
      }
    };
    
    load();
    return () => { ignore = true; };
  }, [documentId]);

  // Fetch versions helper (used on mount and after restore)
  const fetchVersions = async () => {
    setLoading(true);
    try {
      const resp = await listVersionDataByDocumentAPI(documentId, { group: true });

      // Backend may return groupedVersions or items; prefer groupedVersions
      let rawItems = [];
      if (resp && resp.groupedVersions) {
        for (const g of resp.groupedVersions) {
          rawItems.push(...(g.versions || []));
        }
      } else if (resp && resp.items) {
        rawItems = resp.items;
      }

      // Ensure items are sorted newest-first. Prefer numeric version_no, fallback to created_at.
      rawItems.sort((a, b) => {
        const aNo = Number(a.version_no || a.versionNo || a.version || NaN);
        const bNo = Number(b.version_no || b.versionNo || b.version || NaN);
        if (!Number.isNaN(aNo) && !Number.isNaN(bNo)) return bNo - aNo;
        const aMs = a.created_at ? new Date(a.created_at).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const bMs = b.created_at ? new Date(b.created_at).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return bMs - aMs;
      });

      const mapped = rawItems.map((v, idx) => {
        const id = v.id || v._id || String(v.version_no || '');
        const timestamp = v.created_at ? new Date(v.created_at) : (v.createdAt ? new Date(v.createdAt) : new Date());
        const author = v.created_by_name || v.author || null;
        const versionName = typeof v.note === 'string' ? v.note : (Array.isArray(v.notes) && v.notes.length ? (v.notes[0].message || '') : '');

        const currentSnapshot = (v.snapshot && typeof v.snapshot === 'object') ? v.snapshot : (v.field_values && typeof v.field_values === 'object' ? v.field_values : {});
        const prevRaw = rawItems[idx + 1];
        const prevSnapshot = prevRaw ? ((prevRaw.snapshot && typeof prevRaw.snapshot === 'object') ? prevRaw.snapshot : (prevRaw.field_values && typeof prevRaw.field_values === 'object' ? prevRaw.field_values : {})) : {};

        const delta = v.field_values && typeof v.field_values === 'object' ? v.field_values : {};
        const changeKeys = Object.keys(delta);
        const changes = changeKeys.map(key => {
          const newValue = currentSnapshot && Object.prototype.hasOwnProperty.call(currentSnapshot, key) ? currentSnapshot[key] : undefined;
          const oldValue = prevSnapshot && Object.prototype.hasOwnProperty.call(prevSnapshot, key) ? prevSnapshot[key] : undefined;
          let type = 'modified';
          if ((oldValue === undefined || oldValue === null || oldValue === '') && (newValue !== undefined && newValue !== null && newValue !== '')) type = 'added';
          else if ((newValue === undefined || newValue === null || newValue === '') && (oldValue !== undefined && oldValue !== null && oldValue !== '')) type = 'deleted';
          else if (String(oldValue) === String(newValue)) type = 'modified';
          return { field: formatFieldLabel(key), key, oldValue, newValue, type };
        });

        return {
          id,
          timestamp,
          author,
          versionName,
          is_current: false,
          isBookmarked: !!v.isBookmarked,
          changes,
          fields: currentSnapshot || {}
        };
      });

      // Small delay to keep UI feeling consistent
      await new Promise(resolve => setTimeout(resolve, 200));

      const grouped = groupVersionsByDate(mapped);
      setVersions(grouped);
      const latest = grouped[0]?.items?.[0];
      if (latest) setSelectedVersion(latest.id);
      const expanded = {};
      grouped.forEach(group => { expanded[group.date] = true; });
      setExpandedDates(expanded);
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  };

  // run on mount / documentId change
  useEffect(() => { if (documentId) fetchVersions(); }, [documentId]);

  const groupVersionsByDate = (versionList) => {
    const grouped = {};
    const now = new Date();
    
    versionList.forEach(version => {
      const dateKey = getRelativeDate(version.timestamp, now);
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push({
        ...version,
        time: formatDateTime(version.timestamp)
      });
    });

    // Sort grouped items by predefined order
    return Object.entries(grouped)
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => {
          // Bookmarked items first
          if ((a.isBookmarked ? 1 : 0) !== (b.isBookmarked ? 1 : 0)) {
            return (b.isBookmarked ? 1 : 0) - (a.isBookmarked ? 1 : 0);
          }
          // Then newest first by timestamp
          return new Date(b.timestamp) - new Date(a.timestamp);
        })
      }))
      .sort((a, b) => {
        const order = ['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month'];
        const aIndex = order.indexOf(a.date);
        const bIndex = order.indexOf(b.date);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.date.localeCompare(b.date);
      });
  };

  // Determines relative date group name (e.g., Today, This Week)
  const getRelativeDate = (date, now) => {
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return 'This Week';
    if (diffDays <= 14) return 'Last Week';
    if (diffDays <= 30) return 'This Month';
    if (diffDays <= 60) return 'Last Month';
    
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Formats date and time into a readable string
  const formatDateTime = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  // Toggles visibility of date sections
  const toggleDate = (date) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  // Sets the currently selected version for preview
  const handleVersionSelect = (version) => {
    setSelectedVersion(version.id);
    setVersionContent(version.fields);
    
    // Update editor with new version content
    if (editorRef.current && version.fields) {
      try {
        isApplyingRef.current = true;
        const editor = editorRef.current;
        const state = editor.state;
        const tr = state.tr;
        let changed = false;

        state.doc.descendants((node, pos) => {
          if (node.type && node.type.name === 'editableField') {
            const origKey = node.attrs?.key;
            if (!origKey) return;
            
            const newVal = version.fields[origKey] ?? '';
            const existing = node.textContent || '';
            
            if (String(existing) !== String(newVal)) {
              const from = pos + 1;
              const to = pos + node.nodeSize - 1;
              tr.replaceWith(from, to, state.schema.text(String(newVal)));
              changed = true;
            }
          }
        });

        if (changed) {
          editor.view.dispatch(tr);
        }
      } catch (err) {
        console.debug('Error updating editor with version content:', err);
      } finally {
        setTimeout(() => { isApplyingRef.current = false; }, 50);
      }
    }
  };

   // TODO: IMPLEMENT API CALL FOR COPY --------------------------------------------------------
  const handleCopyVersion = (version) => {
    console.log('Copying version:', version);
    setMenuOpen(null);
    alert('Version copied!');
  };

  const handleBookmarkVersion = (version) => {
    // If already bookmarked -> unbookmark immediately
    if (version.isBookmarked) {
      (async () => {
        try {
          const resp = await patchVersionBookmarkAPI(version.id, { isBookmarked: false });
          if (resp?.success) {
            const returnedNote = resp?.version?.note ?? resp?.data?.version?.note ?? resp?.note ?? '';
            updateLocalBookmark(version.id, false, returnedNote);
            alert('Version unbookmarked');
          } else {
            alert(resp?.message || 'Unbookmark failed');
          }
        } catch (e) {
          console.error('Failed to unbookmark', e);
          alert('Failed to unbookmark version');
        } finally {
          setMenuOpen(null);
        }
      })();
      return;
    }

    // Not bookmarked yet -> open modal to prompt for bookmark name
    setBookmarkTarget(version);
    setBookmarkName(version.versionName || '');
    setShowBookmarkModal(true);
    setMenuOpen(null);
  };

  // Update local bookmark state and reorder items (bookmarked first)
  const updateLocalBookmark = (versionId, isBookmarked, note) => {
    setVersions(prev => prev.map(group => {
      if (!group.items.some(item => item.id === versionId)) return group;
      const items = group.items.map(item => item.id === versionId
        ? { ...item, isBookmarked: !!isBookmarked, versionName: (typeof note !== 'undefined' ? note : item.versionName) }
        : item
      );

      items.sort((a, b) => {
        if ((a.isBookmarked ? 1 : 0) !== (b.isBookmarked ? 1 : 0)) {
          return (b.isBookmarked ? 1 : 0) - (a.isBookmarked ? 1 : 0);
        }
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      return { ...group, items };
    }));
  };

  const confirmBookmark = async () => {
    if (!bookmarkTarget) return;
    try {
  const resp = await patchVersionBookmarkAPI(bookmarkTarget.id, { isBookmarked: true, note: bookmarkName });
      if (resp?.success) {
        const returnedNote = resp?.version?.note ?? resp?.data?.version?.note ?? resp?.note ?? bookmarkName;
        updateLocalBookmark(bookmarkTarget.id, true, returnedNote);
        setShowBookmarkModal(false);
        setBookmarkTarget(null);
        setBookmarkName('');
        alert('Version bookmarked');
      } else {
        alert(resp?.message || 'Bookmark failed');
      }
    } catch (e) {
      console.error('Bookmark confirm failed', e);
      alert('Failed to bookmark version');
    }
  };

  const filteredVersions = versions.map(group => ({
    ...group,
    items: group.items.filter(item => 
      filterType === 'all' || (filterType === 'named' && item.versionName)
    )
  })).filter(group => group.items.length > 0);

  const currentVersionDetails = versions
    .flatMap(g => g.items)
    .find(v => v.id === selectedVersion);

  const totalVersions = filteredVersions.reduce((sum, group) => sum + group.items.length, 0);

  // Extract page nodes from document
  const pageNodes = useMemo(() => {
    const base = docData?.pages_json?.[0];
    if (!base) return [];
    if (typeof base === 'string') return [];
    return (base.content || []).filter(n => n.type === 'page');
  }, [docData]);

  // Apply version field values to document content for preview
  const contentForEditor = useMemo(() => {
    if (!docData || !versionContent) return null;
    
    const base = docData?.pages_json?.[0];
    
    // Handle HTML string format
    if (typeof base === 'string') {
      return base.replace(/\{\{([A-Za-z0-9_\-]+)\}\}/g, (_, key) => {
        const v = versionContent[key];
        return v === undefined || v === null ? '' : String(v);
      });
    }
    
    // Handle ProseMirror/TipTap format
    const pageNode = pageNodes[docPage] || (base && (base.content || []).find(n => n.type === 'page'));
    if (!pageNode) return base || { type: 'doc', content: [] };
    
    // Deep clone and inject version values
    const cloned = JSON.parse(JSON.stringify(pageNode));
    const walk = (node) => {
      if (!node) return;
      if (node.type === 'editableField') {
        const origKey = node.attrs?.key;
        const val = versionContent?.[origKey];
        if (val !== undefined && val !== null && String(val) !== '') {
          node.content = [{ type: 'text', text: String(val) }];
        } else {
          node.content = node.content || [];
        }
      }
      if (Array.isArray(node.content)) node.content.forEach(walk);
    };
    walk(cloned);
    
    return { type: 'doc', content: [cloned] };
  }, [docData, pageNodes, docPage, versionContent]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRestoreVersion = async () => {
    if (!selectedVersion) return;
    setIsRestoring(true);
    try {
      const resp = await restoreDocumentVersionAPI(documentId, selectedVersion);
      if (resp && resp.success) {
        // Refresh versions and document preview
        try { await fetchVersions(); } catch (e) { console.warn('Failed to refresh versions after restore', e); }
        try { const normalized = await fetchAndNormalizeDocument(documentId); setDocData(normalized); } catch (e) { console.warn('Failed to reload document after restore', e); }
        setShowRestoreModal(false);
        alert('Version restored successfully!');
      } else {
        alert(resp?.message || 'Failed to restore version');
      }
    } catch (e) {
      console.error('Restore failed', e);
      alert(e?.message || 'Failed to restore version');
    } finally {
      setIsRestoring(false);
    }
  };

return (
  <div className="flex h-screen bg-white overflow-hidden">
    {/* Main Content */}
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            onClick={onClose}
            aria-label="Close version history"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-900">
              {currentVersionDetails?.time || 'Select a version'}
            </span>
                {/* {!loading && totalVersions > 0 && (
                      <span className="ml-2 text-xs text-gray-500">Loaded {totalVersions} {totalVersions === 1 ? 'version' : 'versions'}</span>
                )} */}
               {currentVersionDetails?.is_current && (
                <span className="px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 rounded-full">
                  Current
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <span>Total: {totalVersions} {totalVersions === 1 ? 'version' : 'versions'}</span>
            </div>
            
            <button
              disabled={!selectedVersion}
              onClick={() => setShowRestoreModal(true)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-all
                ${selectedVersion
                  ? 'text-white bg-gradient-to-r from-[#0035DA] to-[#043485] hover:from-[#043485] hover:to-[#0035DA] active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
            >
              <RotateCcw className="w-4 h-4" />
              {selectedVersion ? 'Restore this version' : 'Select a version to restore'}
            </button>
          </div>
        </div>

      {/* Editable Fields Preview - Scrollable Main Body */}
      <div className="flex flex-1 pt-[57px] overflow-hidden">
        {/* Left Panel */}
        <div className="w-96 flex flex-col border-r border-gray-200 bg-gray-50 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-blue-600 mx-auto mb-4"></div>
                  <p className="text-sm text-gray-600">Loading version history...</p>
                </div>
              </div>
            ) : currentVersionDetails ? (
              <div className="space-y-6 pb-20">


              {/* Field Values - Dynamic based on version data */}
              <div className="space-y-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Field Values</h3>
                
                <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                  {Object.entries(currentVersionDetails.fields).map(([fieldKey, fieldValue]) => {
                    // Convert camelCase to Title Case for display
                    const fieldLabel = fieldKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    // Find a matching change entry by original key or formatted field label
                    const changeEntry = (currentVersionDetails?.changes || []).find(c => {
                      const ck = normalizeKey(c.key || c.field || '');
                      const fk = normalizeKey(fieldKey);
                      return ck === fk;
                    });
                    const badgeType = changeEntry?.type;
                    const badgeClass = badgeType === 'added'
                      ? 'text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded'
                      : badgeType === 'modified'
                      ? 'text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded'
                      : badgeType === 'deleted'
                      ? 'text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded'
                      : '';
                    const isModified = badgeType === 'modified';
                    
                    return (
                      <div 
                        key={fieldKey}
                        className={`p-5 ${highlightChanges && isModified ? 'bg-amber-50' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {fieldLabel}
                            </label>
                            <p className="text-base text-gray-900 whitespace-pre-wrap">
                              {fieldValue || '—'}
                            </p>
                          </div>
                          {highlightChanges && badgeType && (
                            <span className={badgeClass}>
                              {badgeType === 'added' ? 'Added' : badgeType === 'modified' ? 'Modified' : 'Deleted'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

                {/* Changes */}
                {currentVersionDetails.changes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                      Changes Made
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                      {currentVersionDetails.changes.map((change, idx) => (
                        <div key={idx} className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <span className="font-medium text-gray-900">{change.field}</span>
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded ${
                                change.type === 'added'
                                  ? 'bg-green-100 text-green-700'
                                  : change.type === 'modified'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {change.type === 'added'
                                ? 'Added'
                                : change.type === 'modified'
                                ? 'Modified'
                                : 'Deleted'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">
                    Select a version to view details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Document Preview */}
        <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
          {/* <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">Document Preview</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Viewing {currentVersionDetails?.is_current ? 'current' : 'historical'} version
            </p>
          </div> */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {loadingDoc ? (
              <div className="text-center py-12 text-gray-400 italic">
                Loading document preview…
              </div>
            ) : docError ? (
              <div className="text-center py-12 text-red-600 font-medium">{docError}</div>
            ) : docData && contentForEditor ? (
              <TextEditor
                content={contentForEditor}
                pageSetup={docData?.pageSetup || pageSetup}
                mode="document"
                editable={false}
                onEditorReady={(editor) => (editorRef.current = editor)}
                onContentChange={() => {}}
              />
            ) : (
              <div className="text-center py-12 text-gray-400 italic">
                No document preview available.
              </div>
            )}
          </div>
        </div>

      {/* Version History Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <h2 className="font-semibold text-gray-900">Version history</h2>
          <select 
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All versions</option>
            <option value="named">Named versions</option>
          </select>
        </div>

        {/* Version List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm">Loading versions...</p>
            </div>
          ) : filteredVersions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No versions found</p>
            </div>
          ) : (
            filteredVersions.map((group) => (
              <div key={group.date}>
                {/* Date Header */}
                <button
                  onClick={() => toggleDate(group.date)}
                  className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">{group.date}</span>
                  {expandedDates[group.date] ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {/* Version Items */}
                {expandedDates[group.date] && (
                  <div className="border-l-2 border-gray-200 ml-4">
                    {group.items.map((version) => (
                      <div
                        key={version.id}
                        onClick={() => handleVersionSelect(version)}
                        className={`relative px-4 py-3 cursor-pointer transition-colors ${
                          selectedVersion === version.id 
                            ? 'bg-blue-50 border-l-2 border-blue-500 -ml-0.5' 
                            : 'hover:bg-gray-50'
                        }`}
                      >

                        {/* Timeline dot - TEAL for current version, BLUE for others */}
                        <div
                          className={`absolute left-3 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                            version.is_current ? 'bg-teal-500' : 'bg-blue-500'
                          }`}
                        />

                        <div className="flex items-start justify-between ml-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {version.time}
                              </span>
                              {version.versionName && (
                                <span className="block text-xs text-gray-500 truncate">{version.versionName}</span>
                              )}
                            </div>
                          {/* Current Version Label - Only shows for current version */}
                            {version.is_current && (
                              <span className="block text-xs text-teal-600 font-medium mt-1">
                                Current version
                              </span>
                            )}
                            
                            <div className="mt-2 flex items-center gap-2">
                              {/* Creator Avatar (initials) */}
                              <div className="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white text-[10px] font-bold rounded-full shadow-sm ring-2 ring-white">
                                {version.author
                                  ? version.author
                                      .split(' ')
                                      .map(word => word[0])
                                      .join('')
                                      .slice(0, 2)
                                      .toUpperCase()
                                  : 'U'}
                              </div>

                              {/* Author Name */}
                              <span className="text-xs text-gray-600 font-medium truncate hover:text-gray-900 transition-colors">
                                {version.author || 'Unknown User'}
                              </span>
                            </div>

                            {version.changes && version.changes.length > 0 && (
                              <div className="mt-2 text-xs text-gray-500">
                                {version.changes.length} {version.changes.length === 1 ? 'change' : 'changes'}
                              </div>
                            )}
                          </div>
                          
                          {/* Bookmark star + 3-dot button */}
                          <div className="relative flex items-center gap-2" ref={menuOpen === version.id ? menuRef : null}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleBookmarkVersion(version); }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              aria-label={version.isBookmarked ? 'Unbookmark version' : 'Bookmark version'}
                              title={version.isBookmarked ? 'Bookmarked' : 'Bookmark'}
                            >
                              {version.isBookmarked ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.163c.969 0 1.371 1.24.588 1.81l-3.37 2.455a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.455a1 1 0 00-1.176 0l-3.37 2.455c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.06 9.384c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.287-3.957z" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5v14l7-5 7 5V5a2 2 0 00-2-2H7a2 2 0 00-2 2z" />
                                </svg>
                              )}
                            </button>

                            <button
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpen(menuOpen === version.id ? null : version.id);
                              }}
                            >
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>

                            {/* Dropdown Menu */}
                            {menuOpen === version.id && (
                              <div className="absolute right-0 mt-2 w-45 bg-white shadow-lg rounded-lg border border-gray-200 z-50">
                                {/* Make a Copy */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyVersion(version);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg transition-all"
                                >
                                  <Copy className="w-4 h-4 mr-2 text-gray-500" />
                                  Make a Copy
                                </button>

                                {/* Bookmark Version */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBookmarkVersion(version); 
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg transition-all"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-4 h-4 mr-2 text-gray-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 5v14l7-5 7 5V5a2 2 0 00-2-2H7a2 2 0 00-2 2z"
                                    />
                                  </svg>
                                  Bookmark Version
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Highlight Changes Toggle */}
        <div className="p-4 border-t border-gray-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={highlightChanges}
              onChange={(e) => setHighlightChanges(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-sm text-gray-700">Highlight changes</span>
          </label>
        </div>
      </div>

      {/* Bookmark Modal */}
      <BookmarkModal
        show={showBookmarkModal}
        onClose={() => { 
          setShowBookmarkModal(false); 
          setBookmarkTarget(null); 
          setBookmarkName('');
        }}
        bookmarkName={bookmarkName}
        setBookmarkName={setBookmarkName}
        onConfirm={confirmBookmark}
      />
          
      {/* Restore Confirmation Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 backdrop-blur-[2px] bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Restore Version</h1>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="mb-6 space-y-3">
              <p className="text-md text-gray-700">
                Are you sure you want to restore this document to this version?
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {currentVersionDetails?.time}
                  </span>
                </div>
                {currentVersionDetails?.versionName && (
                  <p className="text-xs text-blue-700 ml-6">
                    {currentVersionDetails.versionName}
                  </p>
                )}
                <p className="text-xs text-blue-600 ml-6 mt-1">
                  By {currentVersionDetails?.author || "Unknown User"}
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  <strong>Note:</strong> This action will create a new version capturing the restore.
                  Your current version will still be preserved in the version history.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowRestoreModal(false)}
                disabled={isRestoring}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
             <button
            disabled={!selectedVersion || currentVersionDetails?.is_current || isRestoring}
            onClick={handleRestoreVersion}
            className={`flex-1 px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium rounded-lg shadow-sm transition-all
              ${
                !selectedVersion
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : currentVersionDetails?.is_current
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "text-white bg-gradient-to-r from-[#0035DA] to-[#043485] hover:from-[#043485] hover:to-[#0035DA] active:scale-95"
              }`}
          >
            <RotateCcw className="w-4 h-4" />
            {isRestoring ? 'Restoring…' : (
              !selectedVersion
                ? 'Select a version to restore'
                : currentVersionDetails?.is_current
                ? 'Current Version'
                : 'Restore'
            )}
          </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  </div>
  );
}