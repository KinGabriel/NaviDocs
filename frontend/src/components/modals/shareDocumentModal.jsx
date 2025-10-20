import React, { useEffect, useMemo, useState } from "react";
import { fetchSchoolStaffAPI } from '../../api/userAPI';
import { shareDocumentAPI } from '../../api/documentsAPI';
import SingleSelectDropdown from "../dropdowns/singleSelectDropdown";

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
  const [membersLoading, setMembersLoading] = useState(true);
  // per-member access map: { [userId]: 'viewer'|'editor' }
  const [selectedAccess, setSelectedAccess] = useState({});

  // Fetch members from API on mount
  useEffect(() => {
    setMembersLoading(true);
    fetchSchoolStaffAPI()
      .then(({ docControllers, staff }) => {
        // prefer a combined list if available; fall back to docControllers
        const list = (staff && Array.isArray(staff) && staff.length) ? staff : (docControllers || []);
        setMembers(list || []);
      })
      .catch((err) => {
        console.error('fetchSchoolStaffAPI error:', err);
        setMembers([])
      })
      .finally(() => setMembersLoading(false));
  }, []);

  // Dropdown options for members (API id/name)
  const memberOptions = useMemo(() => {
    return members.map((u) => ({ value: u.id, label: u.name }));
  }, [members]);

  const addMember = (val) => {
    if (!val) return;
    setSelectedIds((prev) => prev.includes(val) ? prev : [...prev, val]);
    setSelectedAccess((prev) => ({ ...prev, [val]: prev[val] || 'viewer' }));
    setMemberToAdd("");
  };

  // Build list of selected members by matching id to name from members (API)
  const selectedMembers = useMemo(() => {
    return selectedIds.map((sid) => {
      const found = members.find((c) => c.id === sid);
      return { id: sid, name: found ? found.name : sid };
    });
  }, [selectedIds, members]);

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
    const id = template.created_by;
    // prefer explicit createdByName
    let name = template.createdByName || "";
    // next, try to find the user in the fetched members list
    if (!name && Array.isArray(members) && members.length) {
      const found = members.find((m) => String(m.id) === String(id));
      if (found) name = found.name || found.fullName || found.displayName || '';
    }
    // fallback to assignedNames snapshot on the template
    if (!name && Array.isArray(template.assigned) && Array.isArray(template.assignedNames)) {
      const idx = template.assigned.indexOf(id);
      if (idx !== -1) name = template.assignedNames[idx];
    }
    if (!name) name = id;
    return { id, name };
  }, [template, members]);

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
      if (onClose) onClose();
    } catch (err) {
      console.error('shareDocumentModal share error', err);
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

        {/* Add member dropdown */}
        <div className="p-4 border-b">
          {membersLoading ? (
            <div className="p-6 text-center text-sm text-gray-500">Loading members…</div>
          ) : (
            <>
              <SingleSelectDropdown
                label={<span className="flex items-center gap-1">Add Member</span>}
                icon={null}
                value={memberToAdd}
                onChange={setMemberToAdd}
                options={memberOptions}
                placeholder="Select member..."
              />
              <button
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={() => addMember(memberToAdd)}
                disabled={!memberToAdd}
              >
                Add
              </button>
            </>
          )}
        </div>

        {/* Owner Section */}
        {owner && (
          <div className="px-4 pt-4 pb-2">
            <div className="mb-1 text-xs text-gray-500 font-medium">Owner</div>
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-100">
              <span className="font-semibold text-blue-900 truncate">{owner.name}</span>
              <span className="text-xs text-blue-700 font-normal">(Owner)</span>
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
                  <li key={c.id} className="flex items-center justify-between p-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {c.name}
                      </div>
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
