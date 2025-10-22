import React, { useEffect, useMemo, useState } from "react";
import { fetchSchoolStaffAPI } from '../../api/userAPI';
import SingleSelectDropdown from "../dropdowns/singleSelectDropdown";
import Loader from "../../components/loader";

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
  const [isSharing, setIsSharing] = useState(false);
  
  // Access levels for each selected controller: { controllerId: 'viewer' | 'editor' }
  const [accessLevels, setAccessLevels] = useState({});

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
    // Set default access level to 'editor' for newly added controllers
    setAccessLevels((prev) => ({ ...prev, [val]: prev[val] || 'editor' }));
    setControllerToAdd("");
  };

  // Build list of selected document controllers by matching id to name from controllers (API)
  const selectedControllers = useMemo(() => {
    return selectedIds.map((sid) => {
      const found = controllers.find((c) => c.id === sid);
      return { 
        id: sid, 
        name: found ? found.name : sid,
        accessLevel: accessLevels[sid] || 'editor'
      };
    });
  }, [selectedIds, controllers, accessLevels]);

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

  // Update access level for a controller
  const updateAccessLevel = (controllerId, level) => {
    setAccessLevels((prev) => ({ ...prev, [controllerId]: level }));
  };

  // Submit with loading state
  const handleDone = async () => {
    if (onAssign) {
      setIsSharing(true);
      try {
        // Include access levels in the assignment
        await onAssign({ 
          assignees: selectedIds,
          accessLevels: accessLevels
        });
      } finally {
        setIsSharing(false);
      }
    }
  };

  const hasSelectedControllers = selectedControllers.filter((c) => !owner || c.id !== owner.id).length > 0;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-[2px] transition-opacity" 
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1">
                Share Document
              </h2>
              <p className="text-md text-blue-100">
                "{template?.title || "Untitled Document"}"
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
          {/* Owner Section */}
          {owner && (
            <div className="px-6 pt-6 pb-4">
              <div className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Document Owner
              </div>
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {owner.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{owner.name}</div>
                  <div className="text-xs text-blue-700">Full access • Owner</div>
                </div>
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Add controller section */}
          <div className="px-6 py-4 bg-gray-50 border-y border-gray-200">
            <div className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Add Document Controller
            </div>
            {controllersLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader message="Loading controllers..." />
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1">
                  <SingleSelectDropdown
                    label={null}
                    icon={null}
                    value={controllerToAdd}
                    onChange={setControllerToAdd}
                    options={controllerOptions}
                    placeholder="Select a document controller..."
                  />
                </div>
                <button
                  className="px-6 py-2 h-12 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-md"
                  onClick={() => addController(controllerToAdd)}
                  disabled={!controllerToAdd}
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Document Controllers with access */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Shared With
              </h3>
              {hasSelectedControllers && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  {selectedControllers.filter((c) => !owner || c.id !== owner.id).length} controller{selectedControllers.filter((c) => !owner || c.id !== owner.id).length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            <div className="rounded-xl border-2 border-gray-200 overflow-hidden bg-white">
              {!hasSelectedControllers ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium mb-1">No controllers selected</p>
                  <p className="text-sm text-gray-400">Add document controllers to share access</p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <ul className="divide-y divide-gray-200">
                    {selectedControllers.filter((c) => !owner || c.id !== owner.id).map((c) => (
                      <li key={c.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold shadow-md">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900 truncate">
                              {c.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {c.accessLevel === 'viewer' ? 'Can view only' : 'Can view and edit'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Access Level Dropdown */}
                          <div className="relative">
                            <select
                              value={c.accessLevel}
                              onChange={(e) => updateAccessLevel(c.id, e.target.value)}
                              className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                          
                          {/* Remove Button */}
                          <button
                            onClick={() => {
                              setSelectedIds((prev) => prev.filter((x) => x !== c.id));
                              setAccessLevels((prev) => {
                                const newLevels = { ...prev };
                                delete newLevels[c.id];
                                return newLevels;
                              });
                            }}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="Remove access"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Restricted access</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                className="px-5 py-2.5 rounded-md border-1 border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors" 
                onClick={onClose}
                disabled={isSharing}
              >
                Cancel
              </button>
              <button
                onClick={handleDone}
                disabled={isSharing || !Array.isArray(selectedIds) || selectedIds.length === 0}
                className="px-6 py-2.5 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl flex items-center gap-2 min-w-[100px] justify-center"
              >
                {isSharing ? (
                  <>
                  <button disabled className="flex items-center gap-2"> 
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          opacity="0.25"
                          d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Z"
                        />
                        <path
                          fill="white"
                          d="M20 12h2A10 10 0 0 0 12 2V4A8 8 0 0 1 20 12Z"
                        >
                          <animateTransform
                            attributeName="transform"
                            dur="1s"
                            from="0 12 12"
                            to="360 12 12"
                            type="rotate"
                            repeatCount="indefinite"
                          />
                        </path>
                      </svg>
                      <span>Sharing...</span>
                  </button>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span>Share</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}