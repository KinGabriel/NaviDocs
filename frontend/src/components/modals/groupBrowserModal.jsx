import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { listFieldGroupLibraryAPI } from '../../api/fieldGroupLibraryAPI';

export default function GroupBrowserModal2({ open, onClose, onInsert }) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // all | user | school | global
  const [q, setQ] = useState('');
  const [tagFilter, setTagFilter] = useState([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        const list = await listFieldGroupLibraryAPI();
        setGroups(Array.isArray(list) ? list : []);
      } catch (e) {
        console.warn('Failed to load groups', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const allTags = useMemo(() => {
    const s = new Set();
    for (const g of groups) {
      for (const f of g.fields || []) {
        if (Array.isArray(f.tags)) for (const t of f.tags) s.add(String(t));
      }
    }
    return Array.from(s).sort((a,b)=>a.localeCompare(b));
  }, [groups]);

  const filteredGroups = useMemo(() => {
    const text = q.trim().toLowerCase();
    return (groups || []).filter((g) => {
      if (activeTab !== 'all' && g.scope !== activeTab) return false;
      let matchesText = true;
      if (text) {
        const hay = `${g.key || ''} ${g.label || ''}`.toLowerCase();
        matchesText = hay.includes(text);
        if (!matchesText) {
          const names = (g.fields || []).map((f) => String(f.label || f.key || '').toLowerCase());
          matchesText = names.some((n) => n.includes(text));
        }
      }
      let matchesTags = true;
      if (!text && tagFilter.length) {
        const tags = new Set((g.fields || []).flatMap((f) => f.tags || []).map(String));
        matchesTags = tagFilter.some((t) => tags.has(t));
      }
      return matchesText && matchesTags;
    });
  }, [groups, activeTab, q, tagFilter]);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupKey) return null;
    return filteredGroups.find((g) => g.key === selectedGroupKey) || groups.find((g) => g.key === selectedGroupKey) || null;
  }, [selectedGroupKey, filteredGroups, groups]);

  const toggleTag = (t) => setTagFilter((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const insertSelected = () => {
    if (!selectedGroup || !onInsert) return;
    onInsert(selectedGroup);
    onClose?.();
  };

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-[960px] max-w-[95vw] max-h-[85vh] bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-[1001]">
        <div className="flex items-center justify-between p-3 border-b border-slate-200">
          <div className="font-semibold text-slate-800">Browse Sections</div>
          <button className="text-slate-500 hover:text-slate-700" onClick={onClose}>✕</button>
        </div>

        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-slate-300 overflow-hidden">
              {['all','user','school','global'].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-3 py-1 text-sm ${activeTab===t? 'bg-indigo-600 text-white':'bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  {t==='all' ? 'All' : t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
            <input
              placeholder="Search by name or field…"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>

          {!!allTags.length && (
            <div className="flex flex-wrap gap-1">
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`rounded-full border px-2 py-0.5 text-xs ${tagFilter.includes(t) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                >
                  {t}
                </button>
              ))}
              {!!tagFilter.length && (
                <button
                  onClick={() => setTagFilter([])}
                  className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Clear tags
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <div className="p-2 text-xs text-slate-500 border-b">{loading? 'Loading…' : `${filteredGroups.length} result(s)`}</div>
              <div className="max-h-[48vh] overflow-auto">
                {!loading && filteredGroups.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => setSelectedGroupKey(g.key)}
                    className={`w-full text-left p-2 border-b last:border-b-0 hover:bg-slate-50 ${selectedGroupKey===g.key? 'bg-indigo-50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-slate-800">{g.label || g.key}</div>
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">{g.scope}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Array.from(new Set((g.fields||[]).flatMap((f)=>f.tags||[]).map(String))).slice(0,8).map((t)=>(
                        <span key={t} className="text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-700">{t}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-slate-200 rounded-md overflow-hidden">
              <div className="p-2 text-xs text-slate-500 border-b">Preview</div>
              <div className="max-h-[48vh] overflow-auto p-2">
                {!selectedGroup && (
                  <div className="text-xs text-slate-500">Select a section to preview its fields.</div>
                )}
                {selectedGroup && (
                  <div className="space-y-2">
                    <div className="font-medium text-slate-800">{selectedGroup.label || selectedGroup.key}</div>
                    {(selectedGroup.fields||[]).map((f)=> (
                      <div key={f.key} className="rounded border border-slate-200 p-2">
                        <div className="text-sm font-medium text-slate-800">{f.label || f.key} <span className="text-xs text-slate-500">({f.type || 'text'})</span></div>
                        {f.placeholder && <div className="text-xs text-slate-500">Placeholder: <em>{f.placeholder}</em></div>}
                        {f.instructions && <div className="text-[11px] text-slate-500 mt-0.5">Instructions: <em>{f.instructions}</em></div>}
                        {!!(f.tags||[]).length && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(f.tags||[]).map((t)=>(<span key={t} className="text-[10px] px-1 py-0.5 rounded bg-slate-100 text-slate-700">{String(t)}</span>))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-3 border-t border-slate-200">
          <button onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
          <button
            onClick={insertSelected}
            disabled={!selectedGroup}
            className={`rounded-md px-3 py-1.5 text-sm text-white ${selectedGroup? 'bg-indigo-600 hover:bg-indigo-700':'bg-slate-300 cursor-not-allowed'}`}
          >
            Insert Section
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
