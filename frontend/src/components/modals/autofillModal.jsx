import { useEffect, useState } from 'react';

export default function AutofillModal({ open, onClose, fields = [], fetchPreview, onApply, applying = false, user }) {
  const [selected, setSelected] = useState({});
  const [previews, setPreviews] = useState({});
  const [fieldScopes, setFieldScopes] = useState({}); // per-field scope selections

  const allowSchoolScope = (user) => {
    if (!user) return false;
    if (typeof user.role === 'string' && user.role.toLowerCase() === 'document_controller') return true;
    if (user.role && typeof user.role === 'object' && ((user.role.name && String(user.role.name).toLowerCase() === 'document controller') || (user.role.slug && String(user.role.slug).toLowerCase() === 'document_controller'))) return true;
    if (Array.isArray(user.roles) && (user.roles.includes('Document Controller') || user.roles.includes('document_controller'))) return true;
    return false;
  };

  useEffect(() => {
    if (!open) return;
    // initialize selection: default to checked for fields that have a preview
    setSelected({});
    setPreviews({});
    let ignore = false;
    (async () => {
      try {
        const map = {};
        const scopes = {};
        for (const f of fields) {
          try {
            // default per-field scope to 'user'
            scopes[f.name] = 'user';
            const p = await fetchPreview(f.name, scopes[f.name]);
            if (p !== undefined) map[f.name] = p;
          } catch (err) {
            // ignore
          }
        }
        if (ignore) return;
        setPreviews(map);
        const sel = {};
        fields.forEach(f => { sel[f.name] = !!map[f.name]; });
        setSelected(sel);
        setFieldScopes(scopes);
      } catch (err) {
        if (!ignore) console.error('autofill modal load error', err);
      }
    })();
    return () => { ignore = true; };
  }, [open, fields]);

  const toggle = (name) => setSelected(s => ({ ...s, [name]: !s[name] }));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center" role="dialog" aria-modal="true">
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

        <div className="px-5 py-4 space-y-4 max-h-96 overflow-auto">
          <p className="text-sm text-gray-600">Select which fields you want to autofill. Previews show the best available suggestion.</p>
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.name} className="flex items-start space-x-3">
                <input type="checkbox" checked={!!selected[f.name]} onChange={() => toggle(f.name)} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{f.label || f.name}</div>
                    <div className="flex items-center space-x-3">
                      <div className="text-xs text-gray-500">{f.type}</div>
                      {allowSchoolScope(user) ? (
                        <select
                          value={fieldScopes[f.name] || 'user'}
                          onChange={async (e) => {
                            const newScope = e.target.value;
                            setFieldScopes(s => ({ ...s, [f.name]: newScope }));
                            try {
                              const p = await fetchPreview(f.name, newScope);
                              setPreviews(prev => ({ ...prev, [f.name]: p }));
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
