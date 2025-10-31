import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronDown, ChevronRight, MoreVertical, Clock, Copy, RotateCcw, X} from 'lucide-react';
import { listTemplateVersionsAPI, getTemplateVersionAPI, restoreTemplateVersionAPI, updateTemplateVersionBookmarkAPI, duplicateTemplateAPI, duplicateTemplateFromVersionAPI } from '../../api/documentContollerAPI';
import TextEditor from '../../layout/create_template/textEditor';
import BookmarkModal from './bookmarkModal';
import DuplicateModal from '../../components/modals/duplicateModal';
import { toast } from 'react-hot-toast';
import Loader from '../../components/loader'; 

export default function TemplateVersionHistory({ 
  onClose, 
  templateId,
  documentId, 
  currentContent,
  pageSetup,
  previousName, 
}) {
  const id = templateId || documentId; // use whichever is provided
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [highlightChanges, setHighlightChanges] = useState(true);
  const [expandedDates, setExpandedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [versionContent, setVersionContent] = useState(null);
  const [versionHeaderConfig, setVersionHeaderConfig] = useState(null);
  const [versionPageSetup, setVersionPageSetup] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' or 'named'
  const [menuOpen, setMenuOpen] = useState(null);
  const menuRef = useRef(null);
  const [rawResponse, setRawResponse] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  // Bookmark modal state
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkTarget, setBookmarkTarget] = useState(null);
  const [bookmarkName, setBookmarkName] = useState('');
  // Duplicate modal state
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateItem, setDuplicateItem] = useState(null);
  const [duplicating, setDuplicating] = useState(false);
 
  // Fetch version history from API (extracting the function so it can be reused elsewhere)
  const fetchVersions = async () => {
    setLoading(true);
    let data = null;
    try {
      if (id) {
        // primary: template-service
        data = await listTemplateVersionsAPI(id);


        // Support multiple shapes: array, { versions: [...] }, or nested
        let rawVersions = Array.isArray(data)
          ? data
          : Array.isArray(data.versions)
            ? data.versions
            : Array.isArray(data.data && data.data.versions)
              ? data.data.versions
              : [];

        if (rawVersions && rawVersions.length > 0) {
          const normalized = rawVersions.map((v, index) => {
            // parse created_at: accept { $date: ... }, ISO string, or numeric timestamp
            let createdAt = null;
            if (v?.created_at) {
              if (typeof v.created_at === 'string' || typeof v.created_at === 'number') createdAt = v.created_at;
              else if (v.created_at.$date) createdAt = v.created_at.$date;
            } else if (v?.createdAt) {
              if (typeof v.createdAt === 'string' || typeof v.createdAt === 'number') createdAt = v.createdAt;
              else if (v.createdAt.$date) createdAt = v.createdAt.$date;
            } else if (v.timestamp) {
              createdAt = v.timestamp;
            }

            // parse last_activity_at: accept { $date: ... } or ISO string
            let lastActivity = null;
            if (v?.last_activity_at) {
              if (typeof v.last_activity_at === 'string' || typeof v.last_activity_at === 'number') lastActivity = v.last_activity_at;
              else if (v.last_activity_at.$date) lastActivity = v.last_activity_at.$date;
            } else if (v?.lastActivityAt) {
              if (typeof v.lastActivityAt === 'string' || typeof v.lastActivityAt === 'number') lastActivity = v.lastActivityAt;
              else if (v.lastActivityAt.$date) lastActivity = v.lastActivityAt.$date;
            }

            // parse created_by / author: prefer backend-normalized fields first
            let author = 'Unknown';
            if (v?.author) {
              author = v.author;
            } else if (v?.created_by_name) {
              author = v.created_by_name;
            } else if (v?.created_by) {
              const cb = v.created_by;
              if (typeof cb === 'object' && cb !== null) {
                if (cb.name) author = String(cb.name).trim();
                else if (cb.first_name || cb.last_name) author = [cb.first_name, cb.last_name].filter(Boolean).join(' ').trim();
                else if (cb.firstname || cb.lastname) author = [cb.firstname, cb.lastname].filter(Boolean).join(' ').trim();
                else if (cb.email) author = String(cb.email).split('@')[0];
                else author = 'Unknown';
              } else if (typeof cb === 'string') {
                // Unpopulated ID — prefer not to show raw ID
                author = 'Unknown';
              }
            }
         

            // Determine if this is the current version
            // Check multiple indicators: is_current flag, isCurrent, or if it's the first/latest version
            const isCurrent = v.is_current === true || 
                             v.isCurrent === true || 
                             v.current === true ||
                             index === 0; // Fallback: treat first version as current

            // prefer the first page from pages_json (TextEditor expects a single doc/page)
            const firstPage = Array.isArray(v.snapshot?.pages_json) && v.snapshot.pages_json.length > 0
              ? v.snapshot.pages_json[0]
              : null;

            // extract headerConfig and pageSetup from snapshot (with legacy fallbacks)
            const snapshotHeaderConfig = v?.snapshot?.headerConfig || v?.snapshot?.logoConfig || null;
            const snapshotPageSetup = v?.snapshot?.pageSetup || v?.snapshot?.page_setup || null;

            // optional stamp fields if present in snapshot
            const snap = v?.snapshot || {};
            const stampSrc = snap?.documentStamp || {};
            const stampDocCode = stampSrc.docCode || stampSrc.document_code || snap.document_code || v.document_code || '';
            const stampRevisionNo = stampSrc.revisionNo || stampSrc.revision_no || snap.revision_no || v.revision_no || '';
            const stampEffectivity = stampSrc.effectivity || stampSrc.effectivity_date || snap.effectivity || snap.effectivity_date || v.effectivity || '';

            // bookmark flag support (various shapes)
            const isBookmarked = v.isBookmarked === true || v.is_bookmarked === true || v.bookmarked === true || false;

            return {
              ...v,
              id: v._id || v.id,
              created_at: createdAt,
              last_activity_at: lastActivity,
              content: firstPage || v.content || null,
              headerConfig: snapshotHeaderConfig,
              pageSetup: snapshotPageSetup,
              stampDocCode,
              stampRevisionNo,
              stampEffectivity,
              author,
              isBookmarked,
              versionName: v.name || v.note || '',
              is_current: isCurrent
            };
          });

          const grouped = groupVersionsByDate(normalized);
          setVersions(grouped);

          const latestFromGroup = grouped?.[0]?.items?.[0] || normalized[0];
          setSelectedVersion(latestFromGroup.id);
          setVersionContent(latestFromGroup.content);
          // inject stamps into headerConfig if available
          const baseCfg = latestFromGroup.headerConfig || null;
          const injectedCfg = baseCfg
            ? { ...baseCfg, documentStamp: { ...(baseCfg.documentStamp || {}), docCode: latestFromGroup.stampDocCode || '', revisionNo: latestFromGroup.stampRevisionNo || '', effectivity: latestFromGroup.stampEffectivity || '' } }
            : (latestFromGroup.stampDocCode || latestFromGroup.stampRevisionNo || latestFromGroup.stampEffectivity)
              ? { documentStamp: { docCode: latestFromGroup.stampDocCode || '', revisionNo: latestFromGroup.stampRevisionNo || '', effectivity: latestFromGroup.stampEffectivity || '' } }
              : null;
          setVersionHeaderConfig(injectedCfg);
          setVersionPageSetup(latestFromGroup.pageSetup || null);
          
          const expanded = {};
          grouped.forEach(group => { expanded[group.date] = true; });
          setExpandedDates(expanded);

          setRawResponse(data || null);
          setLoading(false);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to fetch versions', error);
    }

    // No versions returned or API failed — set to empty (UI shows 'No versions found')
    setRawResponse(data || null);
    setVersions([]);
    setSelectedVersion(null);
    setVersionContent(null);
    setExpandedDates({});
    setLoading(false);
  };

  useEffect(() => {
    fetchVersions();
  }, [templateId, documentId, currentContent]);

  // debug: log versions when they change
  useEffect(() => {
    console.debug('VersionHistory - versions state updated:', versions);
  }, [versions]);
// ---------------------------------------------------------------------

  // Group versions by relative date
  const groupVersionsByDate = (versionList) => {
    const grouped = {};
    const now = new Date();
    
    
    versionList.forEach(version => {
      const versionDate = new Date(version.last_activity_at || version.updated_at || version.created_at || version.createdAt || Date.now());
      const dateKey = getRelativeDate(versionDate, now);
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push({
        id: version.id || version._id,
        time: formatDateTime(versionDate),
        timestamp: versionDate,
        isCurrent: version.is_current || false,
        author: version.created_by?.name || 
                version.created_by?.first_name && version.created_by?.last_name 
                  ? `${version.created_by.first_name} ${version.created_by.last_name}`.trim()
                  : version.created_by?.email?.split('@')[0] || 
                    version.author || 'Unknown',
        content: version.content,
        headerConfig: version.headerConfig || null,
        pageSetup: version.pageSetup || null,
        stampDocCode: version.stampDocCode || '',
        stampRevisionNo: version.stampRevisionNo || '',
        stampEffectivity: version.stampEffectivity || '',
        fieldValues: version.field_values,
        isBookmarked: !!version.isBookmarked,
        versionName: version.versionName || version.name || version.note || '',
        changes: version.changes || []
      });
    });

    // Convert to array and sort
    return Object.entries(grouped)
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => {
          // bookmarked items first
          if ((a.isBookmarked ? 1 : 0) !== (b.isBookmarked ? 1 : 0)) {
            return (b.isBookmarked ? 1 : 0) - (a.isBookmarked ? 1 : 0);
          }
          // then newest first by timestamp
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

  // Get relative date string
  const getRelativeDate = (date, now) => {
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return 'This Week';
    if (diffDays <= 14) return 'Last Week';
    if (diffDays <= 30) return 'This Month';
    if (diffDays <= 60) return 'Last Month';
    
    // Return actual month/year for older versions
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Format date and time
  const formatDateTime = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Toggle date group expansion
  const toggleDate = (date) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  // Handle version selection
  const handleVersionSelect = async (version) => {
    setSelectedVersion(version.id);
    
    // If version has content, use it; otherwise fetch it
    if (version.content) {
      setVersionContent(version.content);
      const baseCfg = version.headerConfig || null;
      const injectedCfg = baseCfg
        ? { ...baseCfg, documentStamp: { ...(baseCfg.documentStamp || {}), docCode: version.stampDocCode || '', revisionNo: version.stampRevisionNo || '', effectivity: version.stampEffectivity || '' } }
        : (version.stampDocCode || version.stampRevisionNo || version.stampEffectivity)
          ? { documentStamp: { docCode: version.stampDocCode || '', revisionNo: version.stampRevisionNo || '', effectivity: version.stampEffectivity || '' } }
          : null;
      setVersionHeaderConfig(injectedCfg);
      setVersionPageSetup(version.pageSetup || null);
      } else {
      try {
        const data = await getTemplateVersionAPI(id, version.id);
        // unwrap pages_json array to the first element for editor
        const fetchedFirst = Array.isArray(data?.version?.snapshot?.pages_json) && data.version.snapshot.pages_json.length > 0
          ? data.version.snapshot.pages_json[0]
          : null;
        const snap = data?.version?.snapshot || {};
        const fetchedHeaderCfg = snap?.headerConfig || snap?.logoConfig || null;
        const fetchedPageSetup = snap?.pageSetup || snap?.page_setup || null;
        const stampSrc = snap?.documentStamp || {};
        const stampDocCode = stampSrc.docCode || stampSrc.document_code || snap.document_code || '';
        const stampRevisionNo = stampSrc.revisionNo || stampSrc.revision_no || snap.revision_no || '';
        const stampEffectivity = stampSrc.effectivity || stampSrc.effectivity_date || snap.effectivity || snap.effectivity_date || '';
        setVersionContent(fetchedFirst || data.version?.snapshot || currentContent);
        const injectedCfg = fetchedHeaderCfg
          ? { ...fetchedHeaderCfg, documentStamp: { ...(fetchedHeaderCfg.documentStamp || {}), docCode: stampDocCode || '', revisionNo: stampRevisionNo || '', effectivity: stampEffectivity || '' } }
          : (stampDocCode || stampRevisionNo || stampEffectivity)
            ? { documentStamp: { docCode: stampDocCode || '', revisionNo: stampRevisionNo || '', effectivity: stampEffectivity || '' } }
            : null;
        setVersionHeaderConfig(injectedCfg);
        setVersionPageSetup(fetchedPageSetup || null);
      } catch (error) {
        console.error('Failed to fetch version content:', error);
        // Fallback to current content
        setVersionContent(currentContent);
        setVersionHeaderConfig(null);
        setVersionPageSetup(null);
      }
    }
  };

  // Get filtered versions
  const filteredVersions = versions.map(group => ({
    ...group,
    items: group.items.filter(item => 
      filterType === 'all' || (filterType === 'named' && item.versionName)
    )
  })).filter(group => group.items.length > 0);

  // Get current version details
  const currentVersionDetails = versions
    .flatMap(g => g.items)
    .find(v => v.id === selectedVersion);

  // Count total versions
  const totalVersions = filteredVersions.reduce((sum, group) => sum + group.items.length, 0);

  // 3-dot menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ------------------------------------------------------------------------------------------------
  // Handle restore version
  const handleRestoreVersion = async () => {
     if (!selectedVersion) return;
     setIsRestoring(true);
     try {
       const resp = await restoreTemplateVersionAPI(templateId, selectedVersion);
       if (resp && resp.success) {
         // Refresh versions and document preview
         try { await fetchVersions(); } catch (e) { console.warn('Failed to refresh versions after restore', e); }
         setShowRestoreModal(false);
         toast.success('Version restored successfully!');
       } else {
         toast.error(resp?.message || 'Failed to restore version');
       }
     } catch (e) {
       console.error('Restore failed', e);
       toast.error(e?.message || 'Failed to restore version');
     } finally {
       setIsRestoring(false);
     }
   };

  const handleCopyVersion = (version) => {
    // Open duplicate modal; use previousName from parent when available as a friendly initial title
    setMenuOpen(null);
    const baseName = previousName || version.versionName || 'Template';
    setDuplicateItem({ ...version, title: `${baseName}` });
    setDuplicateOpen(true);
  };

  const handleBookmarkVersion = (version) => {
    // If already bookmarked -> unbookmark immediately
    if (version.isBookmarked) {
      (async () => {
        try {
          const resp = await updateTemplateVersionBookmarkAPI(id, version.id, { isBookmarked: false });
          if (resp?.success) {
            const returnedNote = resp?.version?.note ?? resp?.data?.version?.note ?? resp?.note ?? '';
            updateLocalBookmark(version.id, false, returnedNote);
            toast.success('Version unbookmarked');
          } else {
            toast.error(resp?.message || 'Unbookmark failed');
          }
        } catch (e) {
          console.error('Failed to unbookmark', e);
          toast.error('Failed to unbookmark version');
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

  // update local bookmark state and reorder items (bookmarked first)
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
      const resp = await updateTemplateVersionBookmarkAPI(id, bookmarkTarget.id, { isBookmarked: true, note: bookmarkName });
      if (resp?.success) {
        const returnedNote = resp?.version?.note ?? resp?.data?.version?.note ?? resp?.note ?? bookmarkName;
        updateLocalBookmark(bookmarkTarget.id, true, returnedNote);
        setShowBookmarkModal(false);
        setBookmarkTarget(null);
        setBookmarkName('');
        toast.success('Version bookmarked');
      } else {
        toast.error(resp?.message || 'Bookmark failed');
      }
    } catch (e) {
      console.error('Bookmark confirm failed', e);
      toast.error('Failed to bookmark version');
    }
  };

  // Inline edit state for notes per version
  const [editingNoteFor, setEditingNoteFor] = useState(null);
  const [editingNoteValue, setEditingNoteValue] = useState('');

  const saveNoteForVersion = async (versionId) => {
    if (!versionId) return;
    try {
      const resp = await updateTemplateVersionBookmarkAPI(id, versionId, { note: editingNoteValue });
      if (resp?.success) {
        setVersions(prev => prev.map(group => ({
          ...group,
          items: group.items.map(item => item.id === versionId ? { ...item, versionName: resp.version.note || editingNoteValue } : item)
        })));
        setEditingNoteFor(null);
      } else {
        toast.error(resp?.message || 'Failed to save note');
      }
    } catch (e) {
      console.error('Failed to save note', e);
      toast.error('Failed to save note');
    }
  };

  

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
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
              {currentVersionDetails?.isCurrent && (
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

        {/* Template Preview */}
        <div className="flex-1 overflow-auto p-8 bg-gray-100">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading version...</p>
                </div>
              </div>
            ) : TextEditor ? (
              <TextEditor
                content={versionContent || currentContent}
                pageSetup={versionPageSetup || pageSetup}
                readOnly={true}
                headerConfig={versionHeaderConfig || null}
                onContentChange={() => {}}
              />
            ) : (
              <div className="p-12">
                <div className="text-center text-gray-500 space-y-2">
                  <Clock className="w-12 h-12 mx-auto text-gray-300" />
                  <p>No preview available</p>
                  <p className="text-sm">Select a version to view its content</p>
                </div>
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
              <Loader message="Loading versions..." />
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
                            version.isCurrent ? 'bg-teal-500' : 'bg-blue-500'
                          }`}
                      />

                        <div className="flex items-start justify-between ml-2">
                         <div className="flex-1 min-w-0 mr-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-medium text-gray-900">
                                  {version.time}
                                </span>
                                {version.versionName && (
                                 <span className="text-xs text-gray-500 break-words">{version.versionName}</span>
                                )}
                            </div>
                            
                            {/* Current Version Label - Only shows for current version */}
                            {version.isCurrent && (
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
                            <span className="text-xs text-gray-600 font-medium hover:text-gray-900 transition-colors break-words flex-1">
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
                           <div className="relative flex items-start gap-2 flex-shrink-0 pt-1" ref={menuOpen === version.id ? menuRef : null}>
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

      {/* Restore Confirmation Modal */}
      {/* Bookmark Modal (extracted) */}
      <BookmarkModal
        show={showBookmarkModal}
        onClose={() => { setShowBookmarkModal(false); setBookmarkTarget(null); }}
        bookmarkName={bookmarkName}
        setBookmarkName={setBookmarkName}
        onConfirm={confirmBookmark}
      />

        {/* Duplicate Modal */}
        <DuplicateModal
          open={duplicateOpen}
          item={duplicateItem}
          submitting={duplicating}
          onClose={() => { setDuplicateOpen(false); setDuplicateItem(null); }}
          onDuplicate={async (itemWithTitle) => {
            if (!itemWithTitle) return;
            setDuplicating(true);
            try {
              const title = itemWithTitle.title;
              // If duplicating a specific version, itemWithTitle should include an id (version id)
              let resp = null;
              if (itemWithTitle && itemWithTitle.id) {
                // Use the duplicate-from-version endpoint
                resp = await duplicateTemplateFromVersionAPI(id, itemWithTitle.id, title);
              } else {
                // Fallback: duplicate the template (entire template)
                resp = await duplicateTemplateAPI(id, title);
              }
              if (resp?.success) {
                setDuplicateOpen(false);
                setDuplicateItem(null);
                await fetchVersions();
                toast.success('Template duplicated successfully');
              } else {
                toast.error(resp?.message || 'Failed to duplicate template');
              }
            } catch (err) {
              console.error('Duplicate failed', err);
              toast.error('Failed to duplicate template');
            } finally {
              setDuplicating(false);
            }
          }}
        />

      {showRestoreModal && (
        <div className="fixed inset-0 backdrop-blur-[2px] bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Restore Version</h1>
                </div>
              </div>
              <button
                onClick={() => setShowRestoreModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="mb-6 space-y-3">
              <p className="text-md text-gray-700">
                Are you sure you want to restore the template to this version?
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
                  By {currentVersionDetails?.author || 'Unknown User'}
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  <strong>Note:</strong> This action will create a new version capturing the restore. Your current version will be preserved in history.
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
              disabled={
                !selectedVersion || currentVersionDetails?.isCurrent
              }
              onClick={handleRestoreVersion}
              className={`flex-1 px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium rounded-lg shadow-sm transition-all
                ${
                  !selectedVersion || currentVersionDetails?.isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'text-white bg-gradient-to-r from-[#0035DA] to-[#043485] hover:from-[#043485] hover:to-[#0035DA] active:scale-95'
                }`}
            >
              <RotateCcw className="w-4 h-4" />
              {currentVersionDetails?.isCurrent
                ? 'Current version'
                : selectedVersion
                ? 'Restore'
                : 'Select a version to restore'}
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}