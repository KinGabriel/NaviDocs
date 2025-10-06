import React, { useEffect, useMemo, useState } from "react";
import { fetchSchoolStaffAPI } from '../../api/userAPI';
import SingleSelectDropdown from "../dropdowns/singleSelectDropdown";

export default function AssignMembersModal({
  open,
  onClose,
  template,
  selectedIds,
  setSelectedIds,
  setTheDocController,
  onAssign,
  submitting = false,
}) {
  if (!open) return null;

  // Dropdown and search state
  const [controllerToAdd, setControllerToAdd] = useState("");
  const [controllers, setControllers] = useState([]);
  const [controllersLoading, setControllersLoading] = useState(true);

  // Fetch docControllers from API on mount
  useEffect(() => {
    setControllersLoading(true);
    fetchSchoolStaffAPI()
      .then(({ docControllers }) => {

        setControllers(docControllers || []);
        // Set the first controller as selected by default
        if (docControllers && docControllers.length > 0 && setTheDocController) {
          setTheDocController(docControllers[0].id);
        }
      })
      .catch((err) => {
        console.error('fetchSchoolStaffAPI error:', err);
        setControllers([])
      })
      .finally(() => setControllersLoading(false));
  }, [setTheDocController, setSelectedIds]);

  // Dropdown options for controllers (API id/name)
  const controllerOptions = useMemo(() => {
    const opts = controllers.map((u) => ({
      value: u.id,
      label: u.name
    }));
    console.log('controllerOptions:', opts);
    return opts;
  }, [controllers]);

  // Helpers for API docControllers
  const idOf = (u) => u?.id;
  const nameOf = (u) => u?.name;
  const isSelected = (u) => selectedIds.includes(idOf(u));
  const addController = (val) => {
    if (!val) return;
    if (setTheDocController) setTheDocController(val);
    setSelectedIds((prev) => prev.includes(val) ? prev : [...prev, val]);
    setControllerToAdd("");
  };

  // Build list of selected document controllers by matching id to name from controllers (API)
  const selectedControllers = useMemo(() => {
    return selectedIds.map((sid) => {
      const found = controllers.find((c) => c.id === sid);
      return { id: sid, name: found ? found.name : sid };
    });
  }, [selectedIds, controllers]);

  // Owner extraction: use created_by and createdByName from template
  const owner = useMemo(() => {
    if (!template?.created_by) return null;
    const id = template.created_by;
    // Prefer createdByName, fallback to searching assignedNames if possible, else id
    let name = template.createdByName || "";
    if (!name && Array.isArray(template.assigned) && Array.isArray(template.assignedNames)) {
      const idx = template.assigned.indexOf(id);
      if (idx !== -1) name = template.assignedNames[idx];
    }
    if (!name) name = id;
    return { id, name };
  }, [template]);

  // Submit
  const handleDone = async () => {
    if (onAssign) await onAssign({ assignees: selectedIds });
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
            <p className="text-xs text-gray-500">Add document controllers, groups, or emails</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Add controller dropdown */}
        <div className="p-4 border-b">
          {controllersLoading ? (
            <div className="p-6 text-center text-sm text-gray-500">Loading controllers…</div>
          ) : (
            <>
              <SingleSelectDropdown
                label={<span className="flex items-center gap-1">Add Document Controller</span>}
                icon={null}
                value={controllerToAdd}
                onChange={setControllerToAdd}
                options={controllerOptions}
                placeholder="Select controller..."
              />
              <button
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={() => addController(controllerToAdd)}
                disabled={!controllerToAdd}
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

        {/* Document Controllers with access (excluding owner) */}
        <div className="p-4">
          <h3 className="font-medium text-sm mb-2">Document Controllers with access</h3>
          <div className="max-h-72 overflow-auto rounded-md border">
            {selectedControllers.filter((c) => !owner || c.id !== owner.id).length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No controllers selected.</div>
            ) : (
              <ul className="divide-y">
                {selectedControllers.filter((c) => !owner || c.id !== owner.id).map((c) => (
                  <li key={c.id} className="flex items-center justify-between p-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {c.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedIds((prev) => prev.filter((x) => x !== c.id))}
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
              Restricted — only selected document controller can open
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded border text-sm hover:bg-gray-50" onClick={onClose}>
              Cancel
            </button>
            <button
              onClick={handleDone}
              disabled={submitting || !Array.isArray(selectedIds) || selectedIds.length === 0}
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
