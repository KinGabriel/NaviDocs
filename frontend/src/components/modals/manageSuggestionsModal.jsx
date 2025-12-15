import React, { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp, Search, HelpCircle, Tag, User, Building2, Trash2, Edit3, Save, XCircle, Check } from 'lucide-react';
import {
  getFieldSuggestionsAPI,
  updateFieldSuggestionAPI,
  deleteFieldSuggestionAPI,
  listAllSuggestionFieldsAPI
} from '../../api/documentsAPI';
import Loader from "../../components/loader";
import PermanentlyDeleteDocumentModal from '../../components/modals/permanentlyDeleteDocumentModal';

// Tooltip Component
const Tooltip = ({ children, content }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg -top-2 left-full ml-2 w-64 animate-in fade-in duration-200">
          <div className="relative">
            {content}
            <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 -left-4 top-3"></div>
          </div>
        </div>
      )}
    </div>
  );
};

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
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
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
      setSelectedAnswers({});
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

  const onRequestDelete = (id, fieldName, valueLabel) => {
    setDeleteError('');
    setDeleteTarget({
      id,
      fieldName,
      itemTitle: valueLabel || '',
    });
  };

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
      setSelectedAnswers((prev) => {
        const copy = { ...prev };
        delete copy[id];
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

  const toggleAnswerSelection = (id) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectAll = (checked) => {
    const newSelected = {};
    displayedFields.forEach(f => {
      const allSuggestions = suggestions[f.name] || [];
      const filteredSuggestions = allSuggestions.filter((s) => {
        if (matchMode !== 'label-tags') return true;
        const rawTags = Array.isArray(s.tags) ? s.tags : (s.tag ? [s.tag] : []);
        return rawTags.length > 0;
      });
      
      filteredSuggestions.forEach(s => {
        const id = s._id || s.id;
        newSelected[id] = checked;
      });
    });
    setSelectedAnswers(newSelected);
  };

  const handleBulkDelete = async () => {
  const idsToDelete = Object.keys(selectedAnswers).filter(id => selectedAnswers[id]);
  if (idsToDelete.length === 0) return;

  setBulkDeletePending(true);
};

  const handleConfirmBulkDelete = async () => {
    const idsToDelete = Object.keys(selectedAnswers).filter(id => selectedAnswers[id]);
    
    setDeleteSubmitting(true);
    setBusyIds(prev => new Set([...prev, ...idsToDelete]));
    
    try {
      await Promise.all(idsToDelete.map(id => deleteFieldSuggestionAPI(id)));
      
      setSuggestions((prev) => {
        const copy = { ...prev };
        Object.keys(copy).forEach(fieldName => {
          if (Array.isArray(copy[fieldName])) {
            copy[fieldName] = copy[fieldName].filter(
              it => !idsToDelete.includes(String(it._id || it.id))
            );
          }
        });
        return copy;
      });
      
      setSelectedAnswers({});
      setBulkDeletePending(false);
      setDeleteError('');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete some answers');
    } finally {
      setDeleteSubmitting(false);
      setBusyIds(prev => {
        const next = new Set(prev);
        idsToDelete.forEach(id => next.delete(id));
        return next;
      });
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

  const selectedCount = Object.values(selectedAnswers).filter(Boolean).length;
  const allDisplayedIds = [];
  displayedFields.forEach(f => {
    const allSuggestions = suggestions[f.name] || [];
    const filteredSuggestions = allSuggestions.filter((s) => {
      if (matchMode !== 'label-tags') return true;
      const rawTags = Array.isArray(s.tags) ? s.tags : (s.tag ? [s.tag] : []);
      return rawTags.length > 0;
    });
    filteredSuggestions.forEach(s => allDisplayedIds.push(s._id || s.id));
  });
  const allSelected = allDisplayedIds.length > 0 && allDisplayedIds.every(id => selectedAnswers[id]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-30 backdrop-blur-[2px]">
      <div className="w-full max-w-5xl mx-4 bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative px-8 py-6 border-b border-gray-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          
          <div className="pr-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Manage Form Responses</h2>
            <p className="text-gray-600 text-base">
              View, edit, and organize your saved form responses for quick filling
            </p>
          </div>
        </div>

        {/* Controls Section */}
        <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50">
          <div className="space-y-4">
            {/* View Options */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Scope Selector */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Show responses from:</span>
                  <Tooltip content="Choose whether to see your personal saved responses or responses shared across your school">
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  </Tooltip>
                </div>
                
                <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                  <button
                    onClick={() => setActiveScope('user')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      activeScope === 'user'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Personal
                  </button>
                  {isController && (
                    <button
                      onClick={() => setActiveScope('school')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        activeScope === 'school'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      School-Wide
                    </button>
                  )}
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
                  className="pl-10 pr-10 py-2.5 w-72 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Mode */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Display:</span>
                  <Tooltip content="Choose whether to show all saved responses or only those with category tags">
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  </Tooltip>
                </div>
                
                <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                  <button
                    onClick={() => setMatchMode('label')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      matchMode === 'label'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    All Responses
                  </button>
                  <button
                    onClick={() => setMatchMode('label-tags')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      matchMode === 'label-tags'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    With Categories
                  </button>
                </div>
              </div>

              {/* Select All */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-700">Select All</span>
                  </label>
                </div>

                {selectedCount > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete {selectedCount} selected
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader message="Loading saved responses..." />
            </div>
          ) : (
            <div className="space-y-4">
              {displayedFields && displayedFields.length > 0 ? (
                <>
                  {displayedFields.map((f) => {
                    const allSuggestions = suggestions[f.name] || [];
                    const filteredSuggestions = allSuggestions.filter((s) => {
                      if (matchMode !== 'label-tags') return true;
                      const rawTags = Array.isArray(s.tags) ? s.tags : (s.tag ? [s.tag] : []);
                      return rawTags.length > 0;
                    });

                    const isExpanded = expandedFields[f.name];
                    const INITIAL_DISPLAY = 3;
                    const displayList = isExpanded ? filteredSuggestions : filteredSuggestions.slice(0, INITIAL_DISPLAY);
                    const hasMore = filteredSuggestions.length > INITIAL_DISPLAY;

                    return (
                      <div
                        key={f.name}
                        className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        {/* Field Header */}
                        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-50/50 border-b border-gray-100 rounded-t-xl">
                          <div className="flex items-center gap-3">
                            <div>
                              <h4 className="text-base font-semibold text-gray-900">{f.label || f.name}</h4>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                              {filteredSuggestions.length} {filteredSuggestions.length === 1 ? 'response' : 'responses'}
                            </span>
                          </div>
                        </div>

                        {/* Saved Values List */}
                        <div className="p-5">
                          {filteredSuggestions.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                                <Search className="w-8 h-8 text-gray-300" />
                              </div>
                              <p className="text-sm text-gray-500">
                                {matchMode === 'label-tags'
                                  ? 'No responses with categories for this field'
                                  : 'No saved responses for this field yet'}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {displayList.map((s) => {
                                const id = s._id || s.id;
                                const isEditing = editing[id] !== undefined;
                                const isBusy = busyIds.has(id);
                                const isSelected = selectedAnswers[id] || false;

                                const rawValue = s.value ?? s;
                                const valueLabel = typeof rawValue === 'string' ? rawValue : String(rawValue);
                                const displayLabel = s.label || valueLabel;

                                const rawTags = Array.isArray(s.tags) ? s.tags : (s.tag ? [s.tag] : []);
                                const tags = rawTags.map(t => {
                                  if (!t) return null;
                                  if (typeof t === 'string') return t;
                                  return t.label || t.name || String(t);
                                }).filter(Boolean);
                                
                                const MAX_TAGS = 4;
                                const visibleTags = tags.slice(0, MAX_TAGS);
                                const extraCount = tags.length - visibleTags.length;

                                return (
                                  <div
                                    key={id}
                                    className={`group flex items-start gap-4 p-4 rounded-lg transition-all duration-200 border ${
                                      isSelected 
                                        ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' 
                                        : 'bg-gray-50 hover:bg-gray-100 border-gray-100'
                                    }`}
                                  >
                               {/* Checkbox - hidden when editing */}
                                      {!isEditing && (
                                        <div className="pt-1">
                                          <label className="relative flex items-center cursor-pointer group">
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => toggleAnswerSelection(id)}
                                              disabled={isBusy}
                                              className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed transition-all"
                                            />
                                            {isSelected && (
                                              <Check className="absolute w-3 h-3 text-white pointer-events-none left-1 top-1" />
                                            )}
                                          </label>
                                        </div>
                                      )}

                                    <div className="flex-1 min-w-0">
                                      {isEditing ? (
                                        <div className="space-y-2">
                                          <label className="text-xs font-medium text-gray-600">Edit your response:</label>
                                          <input
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            value={editing[id]}
                                            onChange={(e) =>
                                              setEditing((ev) => ({ ...ev, [id]: e.target.value }))
                                            }
                                            autoFocus
                                            placeholder="Enter your response"
                                          />
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          <div className="text-sm text-gray-900 font-medium break-words">
                                            {displayLabel}
                                          </div>

                                          {tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                              {visibleTags.map((tag, idx) => (
                                                <span
                                                  key={idx}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-gray-200 text-gray-700"
                                                >
                                                  <Tag className="w-3 h-3" />
                                                  {tag}
                                                </span>
                                              ))}
                                              {extraCount > 0 && (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-200 text-gray-700">
                                                  +{extraCount} more
                                                </span>
                                              )}
                                            </div>
                                          )}

                                          {displayLabel !== valueLabel && (
                                            <p className="text-xs text-gray-500">
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
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
                                          >
                                            <Save className="w-4 h-4" />
                                            Save
                                          </button>
                                          <button
                                            disabled={isBusy}
                                            onClick={() => onCancelEdit(id)}
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                          >
                                            <XCircle className="w-4 h-4" />
                                            Cancel
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => onStartEdit(s)}
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                            Edit
                                          </button>
                                          <button
                                            disabled={isBusy}
                                            onClick={() => onRequestDelete(id, f.name, valueLabel)}
                                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                          >
                                            <Trash2 className="w-4 h-4" />
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
                                  className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-3 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all border border-blue-100"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="w-4 h-4" />
                                      Show less responses
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-4 h-4" />
                                      Show {filteredSuggestions.length - INITIAL_DISPLAY} more {filteredSuggestions.length - INITIAL_DISPLAY === 1 ? 'response' : 'responses'}
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

                  {!searchQuery && hasMoreFields && (
                    <button
                      onClick={() => setShowAllFields(!showAllFields)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium text-blue-700 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all border-2 border-blue-200 border-dashed"
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
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchQuery ? 'No matching fields found' : 'No saved responses yet'}
                  </h3>
                  <p className="text-sm text-gray-500 text-center max-w-md">
                    {searchQuery 
                      ? 'Try searching with different keywords' 
                      : activeScope === 'user'
                        ? 'Your saved responses will appear here once you start saving form responses'
                        : 'No school-wide saved responses available'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
        title="Delete this response?"
        message="This will permanently remove this saved response. You'll need to type it again next time."
        confirmLabel="Delete response"
      />

      <PermanentlyDeleteDocumentModal
        open={bulkDeletePending}
        onClose={() => {
          if (!deleteSubmitting) {
            setBulkDeletePending(false);
            setDeleteError('');
          }
        }}
        itemTitle=""
        onConfirm={handleConfirmBulkDelete}
        submitting={deleteSubmitting}
        error={deleteError}
        title="Delete selected responses?"
        message={`This will permanently delete ${selectedCount} selected response${selectedCount !== 1 ? 's' : ''}. This action cannot be undone.`}
        confirmLabel={`Delete ${selectedCount} response${selectedCount !== 1 ? 's' : ''}`}
      />
    </div>
  );
}