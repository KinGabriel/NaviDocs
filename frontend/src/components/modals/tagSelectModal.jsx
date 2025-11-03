import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check } from 'lucide-react';

export default function TagSelectModal({ open, onClose, tags = [], selected = [], onApply = () => {} }) {
  const [query, setQuery] = useState('');
  const [local, setLocal] = useState(() => new Set(selected));

  useEffect(() => {
    if (open) setLocal(new Set(selected));
  }, [open, selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter(t => (t.name || '').toLowerCase().includes(q) || String(t.id || '').toLowerCase().includes(q));
  }, [tags, query]);

  const toggle = (id) => {
    setLocal(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const apply = () => onApply(Array.from(local));

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-[1000] grid place-items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-[720px] max-w-[95vw] rounded-xl bg-white shadow-2xl z-[1001]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-semibold text-slate-800">Select Tags</div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center rounded-md border border-slate-300 px-2">
            <Search size={16} className="text-slate-400" />
            <input
              className="flex-1 px-2 py-2 text-sm outline-none"
              placeholder="Search tags by name or key"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="max-h-[50vh] overflow-auto divide-y border rounded-md">
            {(!filtered || filtered.length === 0) && (
              <div className="p-4 text-sm text-slate-500">No tags found</div>
            )}
            {filtered.map((t) => (
              <button
                type="button"
                key={`tag-${String(t.id)}`}
                onClick={() => toggle(t.id)}
                className={`flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-slate-50 ${local.has(t.id) ? 'bg-slate-50' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: t.color || '#7e57c2' }} />
                  <span className="text-sm text-slate-800">{t.name}</span>
                </span>
                {local.has(t.id) && <Check size={16} className="text-indigo-600" />}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" onClick={onClose}>Cancel</button>
          <button className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700" onClick={apply}>Apply</button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
