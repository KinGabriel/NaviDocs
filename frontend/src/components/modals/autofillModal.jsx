import { useEffect, useState } from 'react';
import { X, Search, ChevronDown, ChevronUp, Check, HelpCircle, Sparkles, User, Building2, Tag, AlertCircle } from 'lucide-react';
import { getFieldSuggestionsAPI } from '../../api/documentsAPI';

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

export default function AutofillModal({
  open,
  onClose,
  fields = [],
  fetchPreview,
  onApply,
  applying = false,
  user,
  matchMode = 'label-tags',
  onChangeMatchMode
}) {
  const [selected, setSelected] = useState({});
  const [previews, setPreviews] = useState({});
  const [fieldScopes, setFieldScopes] = useState({});
  const [choices, setChoices] = useState({});
  const [choiceIndex, setChoiceIndex] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllFields, setShowAllFields] = useState(false);
  const [loadingFields, setLoadingFields] = useState(new Set());

  const allowSchoolScope = (user) => {
    if (!user) return false;
    const norm = (v) => (v ? String(v).trim().toLowerCase() : '');
    const isDean = (v) => { const s = norm(v); return s === 'dean' || s.includes('dean'); };
    const isSecretary = (v) => { const s = norm(v); return s === 'secretary' || s.includes('secretary'); };
    if (isDean(user.role) || isSecretary(user.role)) return true;
    if (user.role && (isDean(user.role.name) || isSecretary(user.role.name) || isDean(user.role.slug) || isSecretary(user.role.slug))) return true;
    if (Array.isArray(user.roles)) {
      for (const r of user.roles) {
        if (isDean(r) || isSecretary(r)) return true;
        if (r && (isDean(r.name) || isSecretary(r.name) || isDean(r.slug) || isSecretary(r.slug))) return true;
      }
    }
    return false;
  };

  useEffect(() => {
    if (!open) return;
    setSelected({});
    setPreviews({});
    setChoices({});
    setChoiceIndex({});
    setSearchQuery('');
    setShowAllFields(false);
    setLoadingFields(new Set());

    let ignore = false;
    (async () => {
      try {
        const map = {};
        const scopes = {};
        const newChoices = {};
        const newChoiceIdx = {};

        for (const f of fields) {
          setLoadingFields(prev => new Set([...prev, f.name]));
          try {
            scopes[f.name] = 'user';

            if (matchMode === 'label-tags' && (!Array.isArray(f.tags) || f.tags.length === 0)) {
              map[f.name] = undefined;
              continue;
            }

            if (matchMode === 'label-tags') {
              const resp = await getFieldSuggestionsAPI(f.name, scopes[f.name], 20, f.label, undefined, 'label');
              const list = Array.isArray(resp) ? resp : (resp?.suggestions || []);
              newChoices[f.name] = list;
              if (list.length > 0) {
                newChoiceIdx[f.name] = 0;
                const first = list[0];
                map[f.name] = first?.value ?? first;
              } else {
                map[f.name] = undefined;
              }
            } else {
              const p = await fetchPreview(f.name, scopes[f.name], matchMode);
              if (p !== undefined) map[f.name] = p;
            }
          } catch {
            // ignore per-field errors
          } finally {
            setLoadingFields(prev => {
              const next = new Set(prev);
              next.delete(f.name);
              return next;
            });
          }
        }

        if (ignore) return;
        setPreviews(map);
        const sel = {};
        fields.forEach(f => {
          if (matchMode === 'label-tags' && (!Array.isArray(f.tags) || f.tags.length === 0)) {
            sel[f.name] = false;
          } else {
            sel[f.name] = !!map[f.name];
          }
        });
        setSelected(sel);
        setFieldScopes(scopes);
        setChoices(newChoices);
        setChoiceIndex(newChoiceIdx);
      } catch (err) {
        if (!ignore) console.error('autofill modal load error', err);
      }
    })();

    return () => { ignore = true; };
  }, [open, fields, matchMode, fetchPreview]);

  const toggle = (name) => setSelected(s => ({ ...s, [name]: !s[name] }));

  const handleScopeChange = async (fieldName, newScope) => {
    const f = fields.find(field => field.name === fieldName);
    if (!f) return;

    setLoadingFields(prev => new Set([...prev, fieldName]));
    setFieldScopes(s => ({ ...s, [fieldName]: newScope }));

    try {
      if (matchMode === 'label-tags' && (!Array.isArray(f.tags) || f.tags.length === 0)) {
        setPreviews(prev => ({ ...prev, [fieldName]: undefined }));
      } else if (matchMode === 'label-tags') {
        const resp = await getFieldSuggestionsAPI(fieldName, newScope, 20, f.label, undefined, 'label');
        const list = Array.isArray(resp) ? resp : (resp?.suggestions || []);
        setChoices(prev => ({ ...prev, [fieldName]: list }));
        const idx = list.length ? 0 : undefined;
        setChoiceIndex(prev => ({ ...prev, [fieldName]: idx ?? 0 }));
        const p = idx !== undefined ? (list[0]?.value ?? list[0]) : undefined;
        setPreviews(prev => ({ ...prev, [fieldName]: p }));
      } else {
        const p = await fetchPreview(fieldName, newScope, matchMode);
        setPreviews(prev => ({ ...prev, [fieldName]: p }));
      }
    } catch {
      setPreviews(prev => ({ ...prev, [fieldName]: undefined }));
    } finally {
      setLoadingFields(prev => {
        const next = new Set(prev);
        next.delete(fieldName);
        return next;
      });
    }
  };

  const filteredFields = fields.filter(f => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (f.label || f.name).toLowerCase().includes(query) ||
      f.name.toLowerCase().includes(query) ||
      (Array.isArray(f.tags) && f.tags.some(t => t.toLowerCase().includes(query)));
  });

  const INITIAL_FIELDS_DISPLAY = 5;
  const displayedFields = showAllFields ? filteredFields : filteredFields.slice(0, INITIAL_FIELDS_DISPLAY);
  const hasMoreFields = filteredFields.length > INITIAL_FIELDS_DISPLAY;
  const selectedCount = Object.values(selected).filter(Boolean).length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] bg-opacity-30" role="dialog" aria-modal="true">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-5xl mx-4 bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in duration-200">
        {/* Header */}
        <div className="relative px-8 py-6 border-b border-gray-200 bg-gradient-to-br from-blue-50 via-white to-blue-50">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          
          <div className="pr-12">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">Quick Fill Form</h2>
            </div>
            <p className="text-gray-600 text-base">
              {selectedCount > 0 
                ? `${selectedCount} field${selectedCount !== 1 ? 's' : ''} selected`
                : 'Select which fields you want to fill automatically with your saved answers'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50">
          <div className="space-y-4">
            {/* Controls Row */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Match Mode */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">Show fields:</span>
                  <Tooltip content="Choose whether to show all saved responses or only those with category tags">
                    <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                  </Tooltip>
                </div>
                
                <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                  <button
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      matchMode === 'label'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    onClick={() => onChangeMatchMode && onChangeMatchMode('label')}
                    type="button"
                  >
                    All Fields
                  </button>
                  <button
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      matchMode === 'label-tags'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    onClick={() => onChangeMatchMode && onChangeMatchMode('label-tags')}
                    type="button"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    With Categories
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="flex items-center gap-3">
                {/* Select All Checkbox */}
                <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={displayedFields.length > 0 && displayedFields.every(f => {
                        const hasNoTags = matchMode === 'label-tags' && (!Array.isArray(f.tags) || f.tags.length === 0);
                        return hasNoTags ? false : selected[f.name];
                      })}
                      onChange={(e) => {
                        const newSelected = { ...selected };
                        displayedFields.forEach(f => {
                          const hasNoTags = matchMode === 'label-tags' && (!Array.isArray(f.tags) || f.tags.length === 0);
                          if (!hasNoTags) {
                            newSelected[f.name] = e.target.checked;
                          }
                        });
                        setSelected(newSelected);
                      }}
                      className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-700">Select All</span>
                  </label>
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
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fields List */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-3">
            {displayedFields.length > 0 ? (
              <>
                {displayedFields.map((f) => {
                  const isLoading = loadingFields.has(f.name);
                  const hasNoTags = matchMode === 'label-tags' && (!Array.isArray(f.tags) || f.tags.length === 0);
                  const isDisabled = hasNoTags;
                  const previewValue = previews[f.name];
                  const hasPreview = previewValue !== undefined;
                  const availableChoices = choices[f.name] || [];
                  const currentChoiceIdx = choiceIndex[f.name] ?? 0;
                  const isSelected = !!selected[f.name];

                  return (
                    <div
                      key={f.name}
                      className={`border rounded-xl bg-white shadow-sm transition-all duration-200 ${
                        isSelected 
                          ? 'border-blue-300 ring-2 ring-blue-100 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow'
                      } ${isDisabled ? 'opacity-60' : ''}`}
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Checkbox with visual indicator */}
                          <div className="pt-1">
                            <label className="relative flex items-center cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => !isDisabled && toggle(f.name)}
                                disabled={isDisabled || isLoading}
                                className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed transition-all"
                              />
                              {isSelected && (
                                <Check className="absolute w-3 h-3 text-white pointer-events-none left-1 top-1" />
                              )}
                            </label>
                          </div>

                          {/* Field Content */}
                          <div className="flex-1 min-w-0">
                            {/* Field Header */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-base font-semibold text-gray-900">
                                    {f.label || f.name}
                                  </h4>
                                </div>

                                {/* Tags with better visual hierarchy */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  {Array.isArray(f.tags) && f.tags.length > 0 ? (
                                    <>
                                      <span className="text-xs text-gray-500 font-medium">Categories:</span>
                                      {f.tags.map((t, i) => (
                                        <span
                                          key={`${f.name}-tag-${i}`}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs border border-purple-200 font-medium"
                                        >
                                          <Tag className="w-3 h-3" />
                                          {t}
                                        </span>
                                      ))}
                                    </>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-50 text-gray-400 text-xs border border-gray-100">
                                      No categories assigned
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Scope Selector */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {allowSchoolScope(user) ? (
                                  <div className="flex items-center gap-2">
                                    <Tooltip content="Choose whether to use your personal saved responses or school-wide response">
                                      <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                    </Tooltip>
                                    <select
                                      value={fieldScopes[f.name] || 'user'}
                                      onChange={(e) => handleScopeChange(f.name, e.target.value)}
                                      disabled={isLoading}
                                      className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm"
                                    >
                                      <option value="user">Personal</option>
                                      <option value="school">School-Wide</option>
                                    </select>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                                    <User className="w-4 h-4" />
                                    Personal
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Preview */}
                            <div className={`p-4 rounded-lg border-2 ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-200' 
                                : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                  {isSelected ? '✓ Will be filled with:' : 'Preview:'}
                                </span>
                                {isLoading && (
                                  <span className="text-xs text-blue-600 font-medium">Loading...</span>
                                )}
                              </div>
                              {isLoading ? (
                                <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4"></div>
                              ) : hasPreview ? (
                                <div className={`text-sm font-medium break-words ${
                                  isSelected ? 'text-blue-900' : 'text-gray-900'
                                }`}>
                                  "{previewValue}"
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-gray-400 italic">
                                  <AlertCircle className="w-4 h-4" />
                                  No saved responses available
                                </div>
                              )}
                            </div>

                            {/* Choice Selector (for label-tags mode) */}
                            {matchMode === 'label-tags' && availableChoices.length > 1 && (
                              <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                                    Multiple options available:
                                  </span>
                                  <Tooltip content="You have saved multiple response for this field. Choose which one to use.">
                                    <HelpCircle className="w-4 h-4 text-blue-400 cursor-help" />
                                  </Tooltip>
                                </div>
                                <select
                                  value={currentChoiceIdx}
                                  onChange={(e) => {
                                    const idx = Number(e.target.value) || 0;
                                    setChoiceIndex(prev => ({ ...prev, [f.name]: idx }));
                                    const option = availableChoices[idx];
                                    setPreviews(prev => ({ ...prev, [f.name]: option?.value ?? option }));
                                  }}
                                  className="w-full text-sm border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                >
                                  {availableChoices.map((opt, idx) => {
                                    const optTags = Array.isArray(opt?.tags) && opt.tags.length
                                      ? opt.tags.join(', ')
                                      : 'no categories';
                                    const optValue = String(opt?.value ?? opt).slice(0, 60);
                                    return (
                                      <option key={`${f.name}-opt-${idx}`} value={idx}>
                                        [{optTags}] — {optValue}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Show More/Less Fields Button */}
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
                  {searchQuery ? 'No matching fields found' : 'No fields available'}
                </h3>
                <p className="text-sm text-gray-500 text-center max-w-md">
                  {searchQuery 
                    ? 'Try searching with different keywords' 
                    : 'There are no fields to fill in this form'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="text-sm">
            {selectedCount > 0 ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-semibold text-gray-900">
                  {selectedCount} field{selectedCount !== 1 ? 's' : ''} ready to fill
                </span>
              </div>
            ) : (
              <span className="text-gray-500">Select fields to get started</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const selectedItems = Object.keys(selected)
                  .filter(k => selected[k])
                  .map(k => ({
                    key: k,
                    value: previews[k],
                    scope: fieldScopes[k] || 'user'
                  }));
                onApply(selectedItems);
              }}
              disabled={applying || selectedCount === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
            >
              {applying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Filling fields...
                </>
              ) : (
                <>
                  Fill Selected Fields
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}