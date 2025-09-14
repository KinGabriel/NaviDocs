import React, { useEffect, useMemo, useState } from "react";

export default function AssignMembersModal({
  open,
  onClose,
  template,
  faculty = [],
  facultyLoading = false,
  selectedIds,
  setSelectedIds,
  onAssign,
  submitting = false,
}) {
  if (!open) return null;

  const [query, setQuery] = useState("");

  // Simple search over name/email
  const filteredFaculty = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faculty;
    return faculty.filter((f) => {
      const name = String(f?.name || f?.fullName || "").toLowerCase();
      const email = String(f?.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [faculty, query]);

  // Helpers
  const idOf = (u) => u?._id || u?.id || u?.email || u?.name || u?.fullName || "";
  const nameOf = (u) => u?.name || u?.fullName || u?.email || "Unknown";

  const isSelected = (u) => selectedIds.includes(idOf(u));
  const toggle = (u) =>
    setSelectedIds((prev) =>
      prev.includes(idOf(u)) ? prev.filter((x) => x !== idOf(u)) : [...prev, idOf(u)]
    );

  // Build list of "Faculty with access" from selectedIds, mapping to faculty objects if possible
  const selectedFaculty = useMemo(() => {
    const map = new Map(faculty.map((f) => [idOf(f), f]));
    return selectedIds.map((sid) => map.get(sid) || { name: sid, email: "", _id: sid });
  }, [selectedIds, faculty]);

  // Submit
  const handleDone = async () => {
    await onAssign({ assignees: selectedIds });
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
            <h2 className="text-lg font-semibold">Share “{template?.title || "Template"}”</h2>
            <p className="text-xs text-gray-500">Add faculty, groups, or emails</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Add box */}
        <div className="p-4 border-b">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Add faculty"
              className="w-full rounded-md border border-gray-300 pl-3 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          {/* Suggestions */}
          {query && (
            <div className="mt-2 max-h-56 overflow-auto rounded-md border">
              {facultyLoading ? (
                <div className="p-6 text-center text-sm text-gray-500">Loading faculty…</div>
              ) : filteredFaculty.length ? (
                <ul className="divide-y">
                  {filteredFaculty.map((f) => (
                    <li key={idOf(f)} className="flex items-center justify-between p-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{nameOf(f)}</div>
                        {f.email && <div className="text-xs text-gray-500 truncate">{f.email}</div>}
                      </div>
                      <button
                        onClick={() => toggle(f)}
                        className={`px-3 py-1 rounded text-sm ${
                          isSelected(f) ? "bg-gray-200" : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {isSelected(f) ? "Added" : "Add"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-6 text-center text-sm text-gray-500">No matches.</div>
              )}
            </div>
          )}
        </div>

        {/* People with access */}
        <div className="p-4">
          <h3 className="font-medium text-sm mb-2">Faculty with access</h3>
          <div className="max-h-72 overflow-auto rounded-md border">
            {!selectedFaculty.length ? (
              <div className="p-6 text-center text-gray-500 text-sm">No faculty selected.</div>
            ) : (
              <ul className="divide-y">
                {selectedFaculty.map((f) => (
                  <li key={idOf(f)} className="flex items-center justify-between p-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{nameOf(f)}</div>
                      {f.email && <div className="text-xs text-gray-500 truncate">{f.email}</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-600">Editor</span>
                      <button
                        onClick={() => setSelectedIds((prev) => prev.filter((x) => x !== idOf(f)))}
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
              Restricted — only selected faculty can open
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded border text-sm hover:bg-gray-50" onClick={onClose}>
              Cancel
            </button>
            <button
              onClick={handleDone}
              disabled={submitting}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Done"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
