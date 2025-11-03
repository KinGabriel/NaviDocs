import { useEffect, useState } from 'react';
import { getFieldSuggestionsAPI } from '../../api/documentsAPI';

export default function AutofillModal({ open, onClose, fields = [], fetchPreview, onApply, applying = false, user, matchMode = 'label-tags', onChangeMatchMode }) {
  const [selected, setSelected] = useState({});
  const [previews, setPreviews] = useState({});
  const [fieldScopes, setFieldScopes] = useState({}); // per-field scope selections
  const [choices, setChoices] = useState({}); // per-field suggestions array for label+tags mode
  const [choiceIndex, setChoiceIndex] = useState({}); // per-field selected suggestion index

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
    // initialize selection: default to checked for fields that have a preview
    setSelected({});
    setPreviews({});
    setChoices({});
    setChoiceIndex({});
    let ignore = false;
    (async () => {
      try {
        const map = {};
        const scopes = {};
        const newChoices = {};
        const newChoiceIdx = {};
        for (const f of fields) {
          try {
            // default per-field scope to 'user'
            scopes[f.name] = 'user';
            // If matching by label+tags but field has no tags, skip preview
            if (matchMode === 'label-tags' && (!Array.isArray(f.tags) || f.tags.length === 0)) {
              map[f.name] = undefined;
              continue;
            }
            // When in label+tags mode and field has tags, fetch all label-based suggestions to allow choosing among different tag variants
            if (matchMode === 'label-tags') {
              try {
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
              } catch (e) {
                newChoices[f.name] = [];
                map[f.name] = undefined;
              }
            } else {
              const p = await fetchPreview(f.name, scopes[f.name], matchMode);
              if (p !== undefined) map[f.name] = p;
            }
          } catch (err) {
            // ignore
          }
        }
        if (ignore) return;
        setPreviews(map);
        const sel = {};
        fields.forEach(f => {
          if (matchMode === 'label-tags' && (!Array.isArray(f.tags) || f.tags.length === 0)) sel[f.name] = false;
          else sel[f.name] = !!map[f.name];
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-[2px] flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold">Autofill from saved suggestions</h2>
            {allowSchoolScope(user) && (
              <div className="text-sm text-gray-500">Per-field scope available</div>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded hover:bg-gray-100">✕</button>
        </div>

        <div className="px-5 pt-4">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Match by:</div>
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                className={`px-3 py-1.5 text-sm ${matchMode === 'label' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                onClick={() => onChangeMatchMode && onChangeMatchMode('label')}
                type="button"
              >
                Label only
              </button>
              <button
                className={`px-3 py-1.5 text-sm border-l border-gray-200 ${matchMode === 'label-tags' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                onClick={() => onChangeMatchMode && onChangeMatchMode('label-tags')}
                type="button"
              >
                Label + Tags
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-96 overflow-auto">
          <p className="text-sm text-gray-600">Select which fields you want to autofill. Previews show the best available suggestion.</p>
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.name} className="flex items-start space-x-3">
                <input type="checkbox" checked={!!selected[f.name]} onChange={() => toggle(f.name)} className="mt-1" disabled={matchMode === 'label-tags' && (!Array.isArray(f.tags) || f.tags.length === 0)} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <span>{f.label || f.name}</span>
                      <div className="flex items-center gap-1">
                        {Array.isArray(f.tags) && f.tags.length > 0 ? (
                          f.tags.map((t, i) => (
                            <span key={`${f.name}-tag-${i}`} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-xs border border-gray-200">{t}</span>
                          ))
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-gray-50 text-gray-400 text-xs border border-gray-100">No tags</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-xs text-gray-500">{f.type}</div>
                      {allowSchoolScope(user) ? (
                        <select
                          value={fieldScopes[f.name] || 'user'}
                          onChange={async (e) => {
                            const newScope = e.target.value;
                            setFieldScopes(s => ({ ...s, [f.name]: newScope }));
                            try {
                              if (matchMode === 'label-tags' && (!Array.isArray(f.tags) || f.tags.length === 0)) {
                                setPreviews(prev => ({ ...prev, [f.name]: undefined }));
                              } else if (matchMode === 'label-tags') {
                                // re-fetch choices for this scope
                                const resp = await getFieldSuggestionsAPI(f.name, newScope, 20, f.label, undefined, 'label');
                                const list = Array.isArray(resp) ? resp : (resp?.suggestions || []);
                                setChoices(prev => ({ ...prev, [f.name]: list }));
                                const idx = list.length ? 0 : undefined;
                                setChoiceIndex(prev => ({ ...prev, [f.name]: idx ?? 0 }));
                                const p = idx !== undefined ? (list[0]?.value ?? list[0]) : undefined;
                                setPreviews(prev => ({ ...prev, [f.name]: p }));
                              } else {
                                const p = await fetchPreview(f.name, newScope, matchMode);
                                setPreviews(prev => ({ ...prev, [f.name]: p }));
                              }
                            } catch (err) {
                              setPreviews(prev => ({ ...prev, [f.name]: undefined }));
                            }
                          }}
                          className="text-xs border rounded px-2 py-1"
                        >
                          <option value="user">User</option>
                          <option value="school">School</option>
                        </select>
                      ) : (
                        <span className="text-xs text-gray-400">User</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Preview: <span className="font-medium text-gray-800">{previews[f.name] ?? <span className="text-gray-400">— no suggestion —</span>}</span></div>
                  {matchMode === 'label-tags' && Array.isArray(choices[f.name]) && choices[f.name].length > 1 && (
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs text-gray-500">Choose variant:</label>
                      <select
                        value={choiceIndex[f.name] ?? 0}
                        onChange={(e) => {
                          const idx = Number(e.target.value) || 0;
                          setChoiceIndex(prev => ({ ...prev, [f.name]: idx }));
                          const option = choices[f.name][idx];
                          setPreviews(prev => ({ ...prev, [f.name]: option?.value ?? option }));
                        }}
                        className="text-xs border rounded px-2 py-1"
                      >
                        {choices[f.name].map((opt, idx) => (
                          <option key={`${f.name}-opt-${idx}`} value={idx}>
                            {(Array.isArray(opt?.tags) && opt.tags.length ? opt.tags.join(', ') : 'no-tags')} — {(String((opt?.value ?? opt)).slice(0, 24))}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded border hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => onApply(Object.keys(selected).filter(k => selected[k]).map(k => ({ key: k, value: previews[k], scope: fieldScopes[k] || 'user' }))) }
            disabled={applying}
            className="px-4 py-2 rounded bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-60"
          >
            {applying ? 'Applying…' : 'Apply selected'}
          </button>
        </div>
      </div>
    </div>
  );
}
