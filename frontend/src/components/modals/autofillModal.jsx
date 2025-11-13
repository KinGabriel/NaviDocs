import { useEffect, useState } from 'react';
import { X, Search, ChevronDown, ChevronUp, Check, Info } from 'lucide-react';
import { getFieldSuggestionsAPI } from '../../api/documentsAPI';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[2px]" role="dialog" aria-modal="true">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Autofill Fields</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {selectedCount > 0 ? `${selectedCount} field${selectedCount !== 1 ? 's' : ''} selected` : 'Select fields to autofill'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            aria-label="Close" 
            className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Match Mode Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Match by:</span>
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    matchMode === 'label' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => onChangeMatchMode && onChangeMatchMode('label')}
                  type="button"
                >
                  Label only
                </button>
                <button
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    matchMode === 'label-tags' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => onChangeMatchMode && onChangeMatchMode('label-tags')}
                  type="button"
                >
                  Label + Tags
                </button>
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

          {/* Info Banner */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-900">
              Select fields to autofill with your saved suggestions.
              {allowSchoolScope(user) && ' You can choose between your personal and school-wide suggestions.'}
            </p>
          </div>
        </div>

        {/* Fields List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
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

                  return (
                    <div 
                      key={f.name} 
                      className={`border rounded-lg bg-white shadow-sm transition-all duration-200 ${
                        selected[f.name] ? 'border-blue-300 ring-2 ring-blue-50' : 'border-gray-200 hover:border-gray-300'
                      } ${isDisabled ? 'opacity-60' : ''}`}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div className="pt-0.5">
                            <input 
                              type="checkbox" 
                              checked={!!selected[f.name]} 
                              onChange={() => !isDisabled && toggle(f.name)} 
                              disabled={isDisabled || isLoading}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </div>

                          {/* Field Content */}
                          <div className="flex-1 min-w-0">
                            {/* Field Header */}
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-semibold text-gray-900">
                                    {f.label || f.name}
                                  </h4>
                                  {selected[f.name] && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <Check className="w-3 h-3" />
                                      Selected
                                    </span>
                                  )}
                                </div>
                                
                                {/* Tags */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {Array.isArray(f.tags) && f.tags.length > 0 ? (
                                    f.tags.map((t, i) => (
                                      <span 
                                        key={`${f.name}-tag-${i}`} 
                                        className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs border border-gray-200 font-medium"
                                      >
                                        {t}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md bg-gray-50 text-gray-400 text-xs border border-gray-100">
                                      No tags
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Type and Scope */}
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
                                  {f.type || 'text'}
                                </span>
                                {allowSchoolScope(user) ? (
                                  <select
                                    value={fieldScopes[f.name] || 'user'}
                                    onChange={(e) => handleScopeChange(f.name, e.target.value)}
                                    disabled={isLoading}
                                    className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <option value="user">User</option>
                                    <option value="school">School</option>
                                  </select>
                                ) : (
                                  <span className="text-xs text-gray-500 px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                                    User
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Preview */}
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-600">Preview:</span>
                                {isLoading && (
                                  <span className="text-xs text-blue-600">Loading...</span>
                                )}
                              </div>
                              {isLoading ? (
                                <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4"></div>
                              ) : hasPreview ? (
                                <div className="text-sm font-medium text-gray-900 break-words">
                                  {previewValue}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-400 italic">
                                  No suggestion available
                                </div>
                              )}
                            </div>

                            {/* Choice Selector (for label-tags mode) */}
                            {matchMode === 'label-tags' && availableChoices.length > 1 && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <label className="block text-xs font-medium text-blue-900 mb-2">
                                  Choose from {availableChoices.length} variants:
                                </label>
                                <select
                                  value={currentChoiceIdx}
                                  onChange={(e) => {
                                    const idx = Number(e.target.value) || 0;
                                    setChoiceIndex(prev => ({ ...prev, [f.name]: idx }));
                                    const option = availableChoices[idx];
                                    setPreviews(prev => ({ ...prev, [f.name]: option?.value ?? option }));
                                  }}
                                  className="w-full text-sm border border-blue-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                  {availableChoices.map((opt, idx) => {
                                    const optTags = Array.isArray(opt?.tags) && opt.tags.length 
                                      ? opt.tags.join(', ') 
                                      : 'no tags';
                                    const optValue = String(opt?.value ?? opt).slice(0, 50);
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
                  {searchQuery ? 'No fields match your search' : 'No fields available'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedCount > 0 && (
              <span className="font-medium text-gray-900">
                {selectedCount} field{selectedCount !== 1 ? 's' : ''} ready to autofill
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-white hover:shadow-sm transition-all duration-200"
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
              className="px-6 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
            >
              {applying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Applying...
                </>
              ) : (
                <>
                  Apply selected
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
