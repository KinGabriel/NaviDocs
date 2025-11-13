import React, { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { 
  getFieldSuggestionsAPI, 
  updateFieldSuggestionAPI, 
  deleteFieldSuggestionAPI, 
  listAllSuggestionFieldsAPI 
} from '../../api/documentsAPI';
import Loader from "../../components/loader";
import PermanentlyDeleteDocumentModal from '../../components/modals/permanentlyDeleteDocumentModal';

export default function ManageSuggestionsModal({ open, onClose, fields = [], user = null }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState({});
  const [localFields, setLocalFields] = useState([]);
  const [activeScope, setActiveScope] = useState('user');
  const [editing, setEditing] = useState({}); 
  const [busyIds, setBusyIds] = useState(new Set());
  const [expandedFields, setExpandedFields] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllFields, setShowAllFields] = useState(false);
  const [matchMode, setMatchMode] = useState('label-tags'); // label / label + tags mode 

  // state for delete modal
  const [deleteTarget, setDeleteTarget] = useState(null); 
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const isController = (() => {
    if (!user) return false;
    if (user === 'Document Controller') return true;
    if (typeof user === 'object') {
      if (user.role && (user.role === 'Document Controller' || user.role?.name === 'Document Controller')) return true;
      if (Array.isArray(user.roles) && user.roles.some(r => r && r.name === 'Document Controller')) return true;
    }
    return false;
  })();

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!open) return;
      setLoading(true);
      try {
        let canonical = [];
        try {
          const resp = await listAllSuggestionFieldsAPI();
          canonical = Array.isArray(resp?.fields) ? resp.fields : [];
        } catch (e) {
          canonical = [];
        }

        const passed = Array.isArray(fields) ? fields : [];
        const normalize = (it) => {
          if (!it) return null;
          if (typeof it === 'string') return { name: it, label: it };
          return { name: it.name || it.key || String(it), label: it.label || it.name || String(it) };
        };

        const passedMap = new Map();
        passed.forEach((it) => {
          const n = normalize(it);
          if (!n || !n.name) return;
          const k = String(n.name).trim();
          if (!k) return;
          passedMap.set(k, (n.label || k).trim());
        });

        const merged = [];
        const seen = new Set();
        (canonical || []).forEach((it) => {
          const n = normalize(it);
          if (!n || !n.name) return;
          const key = String(n.name).trim();
          if (!key) return;
          if (!seen.has(key)) {
            seen.add(key);
            const label = passedMap.get(key) || (n.label || key).trim();
            merged.push({ name: key, label });
          }
        });

        const map = {};
        await Promise.all((merged || []).map(async (f) => {
          try {
            const key = String(f.name).trim();
            const resp = await getFieldSuggestionsAPI(key, activeScope, 20);
            const list = Array.isArray(resp) ? resp : (resp && resp.suggestions) ? resp.suggestions : [];
            map[key] = list;
          } catch (err) {
            const key = String(f.name).trim();
            map[key] = [];
          }
        }));

        const filtered = merged.filter((f) => {
          const key = String(f.name).trim();
          return Array.isArray(map[key]) && map[key].length > 0;
        });

        if (!ignore) {
          setSuggestions(map);
          setLocalFields(filtered);
        }
      } catch (err) {
        console.error('manage suggestions load error', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, [open, fields, activeScope, user]);

  const onStartEdit = (sug) => {
    setEditing((e) => ({ ...e, [sug._id || sug.id]: sug.value ?? sug }));
  };

  const onCancelEdit = (id) => {
    setEditing((e) => { const copy = { ...e }; delete copy[id]; return copy; });
  };

  const onSaveEdit = async (id, fieldName) => {
    const val = editing[id];
    if (val === undefined) return;
    setBusyIds((s) => new Set([...s, id]));
    try {
      await updateFieldSuggestionAPI(id, { value: val });
      setSuggestions((prev) => {
        const copy = { ...prev };
        if (Array.isArray(copy[fieldName])) {
          copy[fieldName] = copy[fieldName].map(it => 
            (String(it._id || it.id) === String(id) ? { ...it, value: val } : it)
          );
        }
        return copy;
      });
      onCancelEdit(id);
    } catch (err) {
      alert(err.message || 'Failed to update suggestion');
    } finally {
      setBusyIds((s) => { const c = new Set(s); c.delete(id); return c; });
    }
  };

  // open delete modal (instead of window.confirm)
  const onRequestDelete = (id, fieldName, valueLabel) => {
    setDeleteError('');
    setDeleteTarget({
      id,
      fieldName,
      itemTitle: valueLabel || '',
    });
  };

  // confirm delete from modal
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, fieldName } = deleteTarget;

    setDeleteSubmitting(true);
    setBusyIds((s) => new Set([...s, id]));

    try {
      await deleteFieldSuggestionAPI(id);
      setSuggestions((prev) => {
        const copy = { ...prev };
        if (Array.isArray(copy[fieldName])) {
          copy[fieldName] = copy[fieldName].filter(
            it => String(it._id || it.id) !== String(id)
          );
        }
        return copy;
      });
      setDeleteTarget(null);
      setDeleteError('');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete saved value.');
    } finally {
      setDeleteSubmitting(false);
      setBusyIds((s) => { const c = new Set(s); c.delete(id); return c; });
    }
  };

  const filteredFields = localFields.filter(f => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return f.label.toLowerCase().includes(query) || f.name.toLowerCase().includes(query);
  });

  const INITIAL_FIELDS_DISPLAY = 5;
  const displayedFields = showAllFields ? filteredFields : filteredFields.slice(0, INITIAL_FIELDS_DISPLAY);
  const hasMoreFields = filteredFields.length > INITIAL_FIELDS_DISPLAY;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-40 backdrop-blur-[2px]">
      <div className="w-full max-w-4xl mx-4 bg-white rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Manage Saved Values</h3>
            <p className="text-sm text-gray-600 mt-0.5">Edit or delete your saved field values</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all duration-200"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scope and Search */}
        <div className="px-6 py-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Scope selector (same as before) */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Scope:</span>
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveScope('user')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeScope === 'user' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                    User
                  </button>
                  {isController && (
                    <button
                      onClick={() => setActiveScope('school')}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                        activeScope === 'school' 
                          ? 'bg-white text-blue-700 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      School
                    </button>
                  )}
                </div>
              </div>

              {/* Mode tab (Label / Label + Tags)  */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Match by:</span>
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      matchMode === 'label' 
                        ? 'bg-white text-blue-700 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    type="button"
                    onClick={() => setMatchMode('label')}
                  >
                    Label only
                  </button>
                  <button
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      matchMode === 'label-tags' 
                        ? 'bg-white text-blue-700 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    type="button"
                    onClick={() => setMatchMode('label-tags')}
                  >
                    Label + Tags
                  </button>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader message="Loading saved values..." />
            </div>
          ) : (
            <div className="space-y-4">
              {displayedFields && displayedFields.length > 0 ? (
                <>
                  {displayedFields.map((f) => {
                    const allSuggestions = suggestions[f.name] || [];

                    // if "label + tags" mode, hide suggestions that have no tags at all
                    const filteredSuggestions = allSuggestions.filter((s) => {
                      if (matchMode !== 'label-tags') return true;
                      const rawTags = Array.isArray(s.tags)
                        ? s.tags
                        : (s.tag ? [s.tag] : []);
                      return rawTags.length > 0;
                    });

                    const isExpanded = expandedFields[f.name];
                    const INITIAL_DISPLAY = 3;
                    const displayList = isExpanded
                      ? filteredSuggestions
                      : filteredSuggestions.slice(0, INITIAL_DISPLAY);
                    const hasMore = filteredSuggestions.length > INITIAL_DISPLAY;

                    return (
                      <div 
                        key={f.name} 
                        className="border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        {/* Field Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                          <h4 className="text-sm font-semibold text-gray-900">{f.label || f.name}</h4>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {filteredSuggestions.length} {filteredSuggestions.length === 1 ? 'value' : 'values'}
                          </span>
                        </div>

                        {/* Field Content */}
                        <div className="p-4">
                          {filteredSuggestions.length === 0 ? (
                            <div className="text-center py-6 text-sm text-gray-400">
                              {matchMode === 'label-tags'
                                ? 'No tagged saved values for this field'
                                : 'No saved values for this field'}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {displayList.map((s) => {
                                const id = s._id || s.id;
                                const isEditing = editing[id] !== undefined;
                                const isBusy = busyIds.has(id);

                                const rawValue = s.value ?? s;
                                const valueLabel = typeof rawValue === 'string'
                                  ? rawValue
                                  : String(rawValue);

                                const displayLabel = s.label || valueLabel;

                                // tags chips (same idea as AutoFillModal)
                                const rawTags = Array.isArray(s.tags)
                                  ? s.tags
                                  : (s.tag ? [s.tag] : []);
                                const tags = rawTags
                                  .map(t => {
                                    if (!t) return null;
                                    if (typeof t === 'string') return t;
                                    return t.label || t.name || String(t);
                                  })
                                  .filter(Boolean);
                                const MAX_TAGS = 4;
                                const visibleTags = tags.slice(0, MAX_TAGS);
                                const extraCount = tags.length - visibleTags.length;

                                return (
                                  <div 
                                    key={id} 
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150"
                                  >
                                    <div className="flex-1 min-w-0">
                                      {isEditing ? (
                                        <input
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                          value={editing[id]}
                                          onChange={(e) =>
                                            setEditing((ev) => ({ ...ev, [id]: e.target.value }))
                                          }
                                          autoFocus
                                        />
                                      ) : (
                                        <div className="space-y-1">
                                          <div className="text-sm text-gray-900 font-medium truncate">
                                            {displayLabel}
                                          </div>

                                          {/* tags row */}
                                          {tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                              {visibleTags.map((tag, idx) => (
                                                <span
                                                  key={idx}
                                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700"
                                                >
                                                  {tag}
                                                </span>
                                              ))}
                                              {extraCount > 0 && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-200 text-gray-700">
                                                  +{extraCount} more
                                                </span>
                                              )}
                                            </div>
                                          )}

                                          {displayLabel !== valueLabel && (
                                            <p className="text-xs text-gray-500 truncate">
                                              Value: {valueLabel}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {isEditing ? (
                                        <>
                                          <button
                                            disabled={isBusy}
                                            onClick={() => onSaveEdit(id, f.name)}
                                            className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                                          >
                                            Save
                                          </button>
                                          <button
                                            disabled={isBusy}
                                            onClick={() => onCancelEdit(id)}
                                            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                                          >
                                            Cancel
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => onStartEdit(s)}
                                            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors duration-150"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            disabled={isBusy}
                                            onClick={() => onRequestDelete(id, f.name, valueLabel)}
                                            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                                          >
                                            Delete
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Show More/Less Button */}
                              {hasMore && (
                                <button
                                  onClick={() =>
                                    setExpandedFields((prev) => ({
                                      ...prev,
                                      [f.name]: !isExpanded,
                                    }))
                                  }
                                  className="w-full flex items-center justify-center gap-2 mt-3 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors duration-150"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-4 h-4" />
                                      Show less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-4 h-4" />
                                      Show {filteredSuggestions.length - INITIAL_DISPLAY} more
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
          
                  {/* Show More/Less Fields Button */}
                  {!searchQuery && hasMoreFields && (
                    <button
                      onClick={() => setShowAllFields(!showAllFields)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-150 border-2 border-blue-200 border-dashed"
                    >
                      {showAllFields ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Show less fields
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Show {filteredFields.length - INITIAL_FIELDS_DISPLAY} more fields
                        </>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">
                    {searchQuery ? 'No fields match your search' : 'No saved fields for this scope'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Field Modal (reusing PermanentlyDeleteDocumentModal) */}
      <PermanentlyDeleteDocumentModal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleteSubmitting) {
            setDeleteTarget(null);
            setDeleteError('');
          }
        }}
        itemTitle={deleteTarget?.itemTitle || ''}
        onConfirm={handleConfirmDelete}
        submitting={deleteSubmitting}
        error={deleteError}
        title="Delete saved value"
        message="This will remove this saved value from your field suggestions. This action cannot be undone."
        confirmLabel="Delete value"
      />
    </div>
  );
}
