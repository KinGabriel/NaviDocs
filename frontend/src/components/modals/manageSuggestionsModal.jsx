import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getFieldSuggestionsAPI, updateFieldSuggestionAPI, deleteFieldSuggestionAPI, listAllSuggestionFieldsAPI } from '../../api/documentsAPI';

export default function ManageSuggestionsModal({ open, onClose, fields = [], user = null }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState({});
  const [localFields, setLocalFields] = useState([]);
  const [activeScope, setActiveScope] = useState('user');
  const [editing, setEditing] = useState({}); 
  const [busyIds, setBusyIds] = useState(new Set());

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
        //  fetch the canonical list of suggestion-able fields for the current user/school
        let canonical = [];
        try {
          const resp = await listAllSuggestionFieldsAPI();
          canonical = Array.isArray(resp?.fields) ? resp.fields : [];
        } catch (e) {
          canonical = [];
        }

          const passed = Array.isArray(fields) ? fields : [];
          // Normalize to objects of shape { name, label }
          const normalize = (it) => {
            if (!it) return null;
            if (typeof it === 'string') return { name: it, label: it };
            return { name: it.name || it.key || String(it), label: it.label || it.name || String(it) };
          };

          // Build a map of passed labels (so we can prefer those labels when available)
          const passedMap = new Map();
          passed.forEach((it) => {
            const n = normalize(it);
            if (!n || !n.name) return;
            const k = String(n.name).trim();
            if (!k) return;
            passedMap.set(k, (n.label || k).trim());
          });

          // Only include keys that are present in the canonical list (these are keys that have saved suggestions)
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

          // Only include fields that have values for the active scope
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
      // update local
      setSuggestions((prev) => {
        const copy = { ...prev };
        if (Array.isArray(copy[fieldName])) {
          copy[fieldName] = copy[fieldName].map(it => (String(it._id || it.id) === String(id) ? { ...it, value: val } : it));
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

  const onDelete = async (id, fieldName) => {
    if (!confirm('Delete this saved value?')) return;
    setBusyIds((s) => new Set([...s, id]));
    try {
      await deleteFieldSuggestionAPI(id);
      setSuggestions((prev) => {
        const copy = { ...prev };
        if (Array.isArray(copy[fieldName])) copy[fieldName] = copy[fieldName].filter(it => String(it._id || it.id) !== String(id));
        return copy;
      });
    } catch (err) {
      alert(err.message || 'Failed to delete suggestion');
    } finally {
      setBusyIds((s) => { const c = new Set(s); c.delete(id); return c; });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg overflow-auto max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Manage saved values</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveScope('user')}
                className={`px-3 py-1 rounded ${activeScope === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                User
              </button>
              {isController && (
                <button
                  onClick={() => setActiveScope('school')}
                  className={`px-3 py-1 rounded ${activeScope === 'school' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  School
                </button>
              )}
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading…</div>
          ) : (
            <div className="space-y-6">
              {(localFields && localFields.length > 0) ? (
                localFields.map((f) => (
                <div key={f.name} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">{f.label || f.name}</div>
                    <div className="text-xs text-gray-500">{(suggestions[f.name]||[]).length} saved</div>
                  </div>
                  <div className="space-y-2">
                    {(!suggestions[f.name] || suggestions[f.name].length === 0) && (
                      <div className="text-sm text-gray-400">No saved values for this field.</div>
                    )}
                    {(suggestions[f.name] || []).map((s) => {
                      const id = s._id || s.id;
                      const isEditing = editing[id] !== undefined;
                      return (
                        <div key={id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                          <div className="flex-1">
                            {isEditing ? (
                              <input className="w-full border px-2 py-1 rounded" value={editing[id]} onChange={(e) => setEditing((ev) => ({ ...ev, [id]: e.target.value }))} />
                            ) : (
                              <div className="text-sm text-gray-800">{String(s.value ?? s)}</div>
                            )}
                          </div>
                          <div className="ml-4 flex items-center space-x-2">
                            {isEditing ? (
                              <>
                                <button disabled={busyIds.has(id)} onClick={() => onSaveEdit(id, f.name)} className="text-sm px-2 py-1 bg-green-600 text-white rounded">Save</button>
                                <button disabled={busyIds.has(id)} onClick={() => onCancelEdit(id)} className="text-sm px-2 py-1 bg-gray-100 rounded">Cancel</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => onStartEdit(s)} className="text-sm px-2 py-1 bg-blue-50 text-blue-700 rounded">Edit</button>
                                <button disabled={busyIds.has(id)} onClick={() => onDelete(id, f.name)} className="text-sm px-2 py-1 bg-red-50 text-red-700 rounded">Delete</button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No saved fields for this scope.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
