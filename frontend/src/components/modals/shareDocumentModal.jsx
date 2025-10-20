import React, { useEffect, useMemo, useState } from "react";
import { searchUsersByEmailAPI, getUserIdByEmailAPI, getUsersInfoByIdsAPI } from '../../api/userAPI';
import { shareDocumentAPI } from '../../api/documentsAPI';
import { toast } from 'react-hot-toast';

export default function ShareDocumentModal({
  open,
  onClose,
  template,
  selectedIds,
  setSelectedIds,
  onShare,
  submitting = false,
}) {
  if (!open) return null;

  // Dropdown and search state
  const [memberToAdd, setMemberToAdd] = useState("");
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  // local map of known users (from suggestions) keyed by id or email -> { id, email, name }
  const [knownUsers, setKnownUsers] = useState({});
  // per-member access map: { [userId]: 'viewer'|'editor' }
  const [selectedAccess, setSelectedAccess] = useState({});

  // No initial members fetch — suggestions/search drive the user lookup

  // Suggestions + input state
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const addMember = (val) => {
    if (!val) return;
    // val can be an id or an email string. If we have a known user record, prefer its id.
    const key = String(val);
    const known = knownUsers[key] || knownUsers[val] || null;
    const useId = known && known.id ? String(known.id) : key;
    setSelectedIds((prev) => prev.includes(useId) ? prev : [...prev, useId]);
    setSelectedAccess((prev) => ({ ...prev, [useId]: prev[useId] || 'viewer' }));
    setMemberToAdd("");
    setSuggestions([]);
  };

  // Debounced suggestions
  useEffect(() => {
    let t = null;
    const q = String(memberToAdd || "").trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return () => clearTimeout(t);
    }

    setSuggestionsLoading(true);
      t = setTimeout(async () => {
      try {
        // searchUsersByEmailAPI now also supports name queries; map and cache results locally
        const res = await searchUsersByEmailAPI(q);
        const list = Array.isArray(res) ? res.map(u => {
          const id = u.userId || u.id || u._id || u.email;
          const email = u.email || '';
          const name = u.name || u.fullname || u.fullName || (`${u.firstname || ''} ${u.lastname || ''}`).trim() || email;
          return { id, email, name };
        }) : [];
        // update knownUsers map for quick name lookup (key by id and by email)
        setKnownUsers((prev) => {
          const copy = { ...prev };
          list.forEach((u) => {
            if (u.id) copy[String(u.id)] = u;
            if (u.email) copy[String(u.email)] = u;
            if (u.name) copy[String((u.name || '').toLowerCase())] = u;
          });
          return copy;
        });
        setSuggestions(list);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [memberToAdd]);

  // Build list of selected members by matching id to name from members (API)
  const selectedMembers = useMemo(() => {
    return selectedIds.map((sid) => {
      const sidStr = String(sid);
      // prefer knownUsers map
      if (knownUsers[sidStr]) return { id: sidStr, name: knownUsers[sidStr].name };
      // try to find in members fetched earlier
      const found = members.find((c) => String(c.id) === sidStr);
      if (found) return { id: sidStr, name: found.name || found.fullName || found.displayName || sidStr };
      // try template snapshots
      if (Array.isArray(template?.assigned) && Array.isArray(template?.assignedNames)) {
        const idx = template.assigned.indexOf(sid);
        if (idx !== -1) return { id: sidStr, name: template.assignedNames[idx] || sidStr };
      }
      // fallback to raw id/email
      return { id: sidStr, name: sidStr };
    });
  }, [selectedIds, members, knownUsers, template]);

  // Resolve names and emails for all selectedIds in one batch request (fetch on modal open / when selectedIds change)
  useEffect(() => {
    let cancelled = false;
    // Build a candidate list: selectedIds + owner + template.assigned entries
    const sIds = Array.isArray(selectedIds) ? selectedIds.map((s) => String(s)) : [];
    const ownerId = template?.created_by ? String(template.created_by) : null;
    const assignedIds = Array.isArray(template?.assigned) ? template.assigned.map((a) => {
      if (!a) return null;
      if (typeof a === 'string' || typeof a === 'number') return String(a);
      // object-shaped assigned entry
      return String(a.userId || a.id || a._id || a.user || '');
    }).filter(Boolean) : [];

    // union & dedupe
    const all = Array.from(new Set([...(sIds || []), ...(assignedIds || []), ...(ownerId ? [ownerId] : [])]));
    if (!all.length) return;

    (async () => {
      try {
        const users = await getUsersInfoByIdsAPI(all);
        if (cancelled) return;
        setKnownUsers((prev) => {
          const copy = { ...prev };
          users.forEach((u) => {
            const id = String(u.userId || u.id || u._id);
            const email = u.email || '';
            const name = u.name || `${u.firstname || ''} ${u.lastname || ''}`.trim() || email || id;
            const obj = { id, email, name };
            copy[id] = obj;
            if (email) copy[String(email)] = obj;
            if (name) copy[String(name).toLowerCase()] = obj;
          });
          return copy;
        });
      } catch (err) {
        // fallback: leave previous knownUsers
      }
    })();

    return () => { cancelled = true; };
  }, [selectedIds, template]);

  // initialize selectedAccess from template.assigned if available
  useEffect(() => {
    if (!template) return;
    const map = {};
    if (Array.isArray(template.assigned)) {
      template.assigned.forEach((a) => {
        if (!a) return;
        // support legacy string entries and new object entries
        if (typeof a === 'string' || typeof a === 'number') {
          map[String(a)] = map[String(a)] || 'viewer';
        } else if (typeof a === 'object') {
          const uid = a.userId || a.id || a._id || a.user;
          if (uid) map[String(uid)] = a.access === 'editor' ? 'editor' : 'viewer';
        }
      });
    }
    // merge with any existing selectedIds
    setSelectedAccess((prev) => ({ ...map, ...prev }));
  }, [template]);

  // Owner extraction: use created_by and createdByName from template
  const owner = useMemo(() => {
    if (!template?.created_by) return null;
    const id = String(template.created_by);
    // prefer explicit createdByName
    let name = template.createdByName || "";
    let email = '';
    // next, try to find the user in the fetched members list or knownUsers
    if (!name && knownUsers[id]) {
      name = knownUsers[id].name || '';
      email = knownUsers[id].email || '';
    }
    if (!name && Array.isArray(members) && members.length) {
      const found = members.find((m) => String(m.id) === String(id));
      if (found) {
        name = found.name || found.fullName || found.displayName || '';
        email = found.email || '';
      }
    }
    // fallback to assignedNames snapshot on the template
    if (!name && Array.isArray(template.assigned) && Array.isArray(template.assignedNames)) {
      const idx = template.assigned.indexOf(id);
      if (idx !== -1) name = template.assignedNames[idx];
    }
    if (!name) name = id;
    return { id, name, email };
  }, [template, members, knownUsers]);

  // Submit
  const [localLoading, setLocalLoading] = useState(false);

  const handleDone = async () => {
    // Build normalized assignees: [{ userId, access }]
    const assigneesPayload = (Array.isArray(selectedIds) ? selectedIds : []).map((sid) => ({ userId: String(sid), access: (selectedAccess[sid] === 'editor' ? 'editor' : 'viewer') }));

    // Prefer parent-provided handler
    if (onShare) return await onShare({ assignees: assigneesPayload });

    // Fallback: call API directly
    const docId = template?._id || template?.id;
    if (!docId) {
      console.error('shareDocumentModal: document id not found on template');
      return;
    }

    try {
      setLocalLoading(true);
      console.debug('shareDocumentModal: sharing payload', assigneesPayload);
      await shareDocumentAPI(docId, assigneesPayload);
      // close modal on success
     toast.success('Document access updated');
      if (onClose) onClose();
    } catch (err) {
      console.error('shareDocumentModal share error', err);
      toast.error('Failed to update document access');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Share “{template?.title || "Document"}”</h2>
            <p className="text-xs text-gray-500">Add members, groups, or emails</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Add member (email search) */}
        <div className="p-4 border-b">
          {membersLoading ? (
            <div className="p-6 text-center text-sm text-gray-500">Loading members…</div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={memberToAdd}
                onChange={(e) => setMemberToAdd(e.target.value)}
                placeholder="Search user email or name"
                className="w-full h-[44px] px-4 py-2 border border-gray-300 rounded-lg"
              />

              {/* Suggestions */}
              {suggestionsLoading ? (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow p-2 text-sm text-gray-500">Searching…</div>
              ) : (
                suggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow max-h-48 overflow-auto">
                    {suggestions.map((s) => (
                      <button
                        key={s.id || s.email}
                        type="button"
                        onClick={() => addMember(s.id || s.email)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-0"
                      >
                        <div className="font-medium text-gray-900">{s.name || s.email}</div>
                        <div className="text-sm text-gray-500">{s.email}</div>
                      </button>
                    ))}
                  </div>
                )
              )}


            </div>
          )}
        </div>

        {/* Owner Section */}
        {owner && (
          <div className="px-4 pt-4 pb-2">
            <div className="mb-1 text-xs text-gray-500 font-medium">Owner</div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded border border-blue-100">
              <div className="min-w-0">
                <div className="font-semibold text-sm text-blue-900 truncate">{owner.name}</div>
                {owner.email && <div className="text-xs text-gray-600 truncate mt-1">{owner.email}</div>}
              </div>
              <span className="ml-auto text-xs text-blue-700 font-normal">(Owner)</span>
            </div>
          </div>
        )}

        {/* Members with access (excluding owner) */}
        <div className="p-4">
          <h3 className="font-medium text-sm mb-2">Members with access</h3>
          <div className="max-h-72 overflow-auto rounded-md border">
            {selectedMembers.filter((c) => !owner || c.id !== owner.id).length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No members selected.</div>
            ) : (
              <ul className="divide-y">
                {selectedMembers.filter((c) => !owner || c.id !== owner.id).map((c) => (
                  <li key={c.id} className="flex items-center justify-between p-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">{c.name}</div>
                      { (knownUsers[String(c.id)] && knownUsers[String(c.id)].email) ? (
                        <div className="text-xs text-gray-500 truncate mt-1">{knownUsers[String(c.id)].email}</div>
                      ) : null }
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={selectedAccess[c.id] || 'viewer'}
                        onChange={(e) => setSelectedAccess((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        className="text-sm rounded border px-2 py-1"
                        aria-label={`Access for ${c.name}`}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <button
                        onClick={() => {
                          setSelectedIds((prev) => prev.filter((x) => x !== c.id));
                          setSelectedAccess((prev) => { const copy = { ...prev }; delete copy[c.id]; return copy; });
                          toast('Removed member');
                        }}
                        className="px-2 py-1 rounded text-sm hover:bg-gray-100"
                        title="Remove access"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-xs text-gray-600">
            <span className="inline-flex items-center gap-1">
              <span className="h-4 w-4 grid place-items-center rounded-full bg-gray-100">🔒</span>
              Restricted — only selected members can open
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded border text-sm hover:bg-gray-50" onClick={onClose}>
              Cancel
            </button>
            <button
              onClick={handleDone}
              disabled={(submitting || localLoading) || !Array.isArray(selectedIds) || selectedIds.length === 0}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {(submitting || localLoading) ? "Sharing…" : "Share"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
