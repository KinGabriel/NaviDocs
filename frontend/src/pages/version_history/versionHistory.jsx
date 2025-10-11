import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronDown, ChevronRight, MoreVertical, Clock, Copy} from 'lucide-react';
import { listTemplateVersionsAPI, getTemplateVersionAPI, restoreTemplateVersionAPI } from '../../api/documentContollerAPI';
import TextEditor from '../../layout/create_template/textEditor';


export default function VersionHistory({ 
  onClose, 
  templateId,
  documentId, 
  currentContent,
  pageSetup,
}) {
  const id = templateId || documentId; // use whichever is provided
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [highlightChanges, setHighlightChanges] = useState(true);
  const [expandedDates, setExpandedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [versionContent, setVersionContent] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' or 'named'
  const [menuOpen, setMenuOpen] = useState(null);
  const menuRef = useRef(null);
  const [rawResponse, setRawResponse] = useState(null);
 


  // Fetch version history from API
  useEffect(() => {
    const fetchVersions = async () => {
      setLoading(true);
      let data = null;
      try {
        if (id) {
          // primary: template-service
          data = await listTemplateVersionsAPI(id);
          console.debug('listTemplateVersionsAPI response', data);

          // Support multiple shapes: array, { versions: [...] }, or nested
          let rawVersions = Array.isArray(data)
            ? data
            : Array.isArray(data.versions)
              ? data.versions
              : Array.isArray(data.data && data.data.versions)
                ? data.data.versions
                : [];

          

          if (rawVersions && rawVersions.length > 0) {
            const normalized = rawVersions.map(v => {
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

              // parse created_by: accept { $oid: '...' }, populated object with name, or raw id string
              let author = 'Unknown';
              if (v?.created_by) {
                if (typeof v.created_by === 'string') author = v.created_by;
                else if (v.created_by.$oid) author = v.created_by.$oid;
                else if (v.created_by._id) author = String(v.created_by._id);
                else if (v.created_by.id) author = String(v.created_by.id);
                else if (v.created_by.name) author = v.created_by.name;
              } else if (v.author) {
                author = v.author;
              }

              // prefer the first page from pages_json (TextEditor expects a single doc/page)
              const firstPage = Array.isArray(v.snapshot?.pages_json) && v.snapshot.pages_json.length > 0
                ? v.snapshot.pages_json[0]
                : null;

              return {
                ...v,
                id: v._id || v.id,
                created_at: createdAt,
                last_activity_at: lastActivity,
                content: firstPage || v.content || null,
                author,
                versionName: v.name || v.note || ''
              };
            });

            const grouped = groupVersionsByDate(normalized);
            setVersions(grouped);

            const latestFromGroup = grouped?.[0]?.items?.[0] || normalized[0];
            setSelectedVersion(latestFromGroup.id);
            setVersionContent(latestFromGroup.content);
              
          
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
      const versionDate = new Date(version.last_activity_at || version.upupdated || version.created_at);
      const dateKey = getRelativeDate(versionDate, now);
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      
      grouped[dateKey].push({
        id: version.id || version._id,
        time: formatDateTime(versionDate),
        timestamp: versionDate,
        isCurrent: version.is_current || false,
        author: version.created_by?.name || version.author || 'Unknown',
        content: version.content,
        fieldValues: version.field_values,
        versionName: version.versionName || version.name || version.note || '',
        changes: version.changes || []
      });
    });

    // Convert to array and sort
    return Object.entries(grouped)
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => b.timestamp - a.timestamp)
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
      } else {
      try {
        const data = await getTemplateVersionAPI(id, version.id);
        // unwrap pages_json array to the first element for editor
        const fetchedFirst = Array.isArray(data?.version?.snapshot?.pages_json) && data.version.snapshot.pages_json.length > 0
          ? data.version.snapshot.pages_json[0]
          : null;
        setVersionContent(fetchedFirst || data.version?.snapshot || currentContent);
      } catch (error) {
        console.error('Failed to fetch version content:', error);
        // Fallback to current content
        setVersionContent(currentContent);
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

  const handleCopyVersion = (version) => {
    // Implement copy functionality here
    console.log('Copying version:', version.id);
    setMenuOpen(null);
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
              {!loading && totalVersions > 0 && (
                <span className="ml-2 text-xs text-gray-500">Loaded {totalVersions} {totalVersions === 1 ? 'version' : 'versions'}</span>
              )}
              {currentVersionDetails?.isCurrent && (
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
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
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={async () => {
                if (!selectedVersion) return window.alert('No version selected');
                const ok = window.confirm('Restore this template to the selected version? This will create a new version capturing the restore.');
                if (!ok) return;
                try {
                  const resp = await restoreTemplateVersionAPI(id, selectedVersion);
                  if (resp?.success) {
                    window.alert('Template restored');
                    onClose && onClose();
                    return;
                  }
                  window.alert(resp?.message || 'Restore response received');
                } catch (e) {
                  console.error('Restore failed', e);
                  window.alert('Failed to restore template version');
                }
              }}
            >
              Restore this version
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
                pageSetup={pageSetup}
                readOnly={true}
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
            <option value="named">Named versions only</option>
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
                        {/* Timeline dot */}
                        <div
                          className={`absolute left-3 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white ${
                            version.isCurrent ? 'bg-green-500' : 'bg-blue-500'
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
                            
                            {version.isCurrent && (
                              <span className="block text-xs text-green-600 font-medium mt-1">
                                Current version
                              </span>
                            )}
                            
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-xs text-gray-600 truncate">{version.author}</span>
                            </div>

                            {version.changes && version.changes.length > 0 && (
                              <div className="mt-2 text-xs text-gray-500">
                                {version.changes.length} {version.changes.length === 1 ? 'change' : 'changes'}
                              </div>
                            )}
                          </div>
                          
                          {/* 3-dot button */}
                          <div className="relative" ref={menuOpen === version.id ? menuRef : null}>
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
                              <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded-lg border border-gray-200 z-50">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyVersion(version);
                                  }}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                                >
                                  <Copy className="w-4 h-4 mr-2 text-gray-500" />
                                  Make a Copy
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
    </div>
  );
}