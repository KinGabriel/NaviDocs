import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, FolderPlus, X } from "lucide-react";

/**
 * Google Drive-style Move Modal for folders/files
 * @param {Object} props
 * @param {Array} props.folders - All folders
 * @param {boolean} props.open - Show modal
 * @param {function} props.onClose - Close modal
 * @param {function} props.onMove - Callback with destinationId
 * @param {Object} props.itemToMove - The folder or file being moved (must have _id, name)
 * @param {string} [props.type] - 'folder' or 'file' (for label)
 */
export default function MoveModal({
  folders = [],
  open,
  onClose,
  onMove,
  itemToMove,
  type = "folder"
}) {
  const [currentFolderId, setCurrentFolderId] = useState(""); // "" = root
  const [path, setPath] = useState([]); // [{_id, name}]

  // Reset navigation when opening
  useEffect(() => {
    if (open) {
      setCurrentFolderId("");
      setPath([]);
    }
  }, [open]);

  // Get folders in current location
  const subfolders = useMemo(() => {
    return folders.filter(f => (f.data.parentFolder || "") === (currentFolderId || ""));
  }, [folders, currentFolderId]);

  // Get current location name
  const currentLocation = useMemo(() => {
    if (!currentFolderId) return { name: "My Storage", _id: "" };
    const f = folders.find(f => f._id === currentFolderId);
    return f ? { name: f.name, _id: f._id } : { name: "Unknown", _id: currentFolderId };
  }, [currentFolderId, folders]);

  // Prevent moving into self or descendants (for folders only)
  const getDescendantIds = (id) => {
    const descendants = [];
    const find = (pid) => {
      folders.forEach(f => {
        if (f.data.parentFolder === pid) {
          descendants.push(f._id);
          find(f._id);
        }
      });
    };
    find(id);
    return descendants;
  };
  const forbiddenIds = useMemo(() => {
    if (!itemToMove || type !== "folder") return [];
    return [itemToMove._id, ...getDescendantIds(itemToMove._id)];
  }, [itemToMove, folders, type]);

  // Navigation handlers
  const handleEnterFolder = (folder) => {
    setCurrentFolderId(folder._id);
    setPath(prev => [...prev, { _id: folder._id, name: folder.name }]);
  };
  const handleBack = () => {
    if (!path.length) return;
    const newPath = [...path];
    newPath.pop();
    setPath(newPath);
    setCurrentFolderId(newPath.length ? newPath[newPath.length - 1]._id : "");
  };

  // Move here handler
  const handleMoveHere = () => {
    if (!onMove) return;
    onMove(currentFolderId || null);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[420px] max-w-full rounded-xl shadow-lg p-6 relative">
        <button className="absolute top-3 right-3 text-gray-500 hover:text-black" onClick={onClose}>
          <X size={20} />
        </button>
        <h2 className="text-lg font-semibold mb-4">Move "{itemToMove?.name || (type === "file" ? "File" : "Folder")}"</h2>
        {/* Current location */}
        <div className="mb-2 text-sm text-gray-700 flex items-center gap-2">
          <span className="font-medium">Current location:</span>
          <span className="bg-gray-100 px-2 py-1 rounded">{currentLocation.name}</span>
        </div>
        {/* Path breadcrumbs */}
        <div className="flex items-center gap-1 mb-3">
          <button className="text-blue-600 hover:underline text-sm" disabled={!path.length} onClick={handleBack}>
            <ArrowLeft size={16} className="inline mr-1" />
            Back
          </button>
          <span className="ml-2 text-gray-500">{["My Storage", ...path.map(p => p.name)].join(" / ")}</span>
        </div>
        {/* Folder list */}
        <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 mb-4">
          {subfolders.length === 0 && (
            <div className="text-gray-400 italic py-4 text-center">No subfolders</div>
          )}
          {subfolders.map(folder => (
            <div key={folder._id} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleEnterFolder(folder)}>
                <span className="inline-block"><FolderPlus size={18} className="text-blue-500" /></span>
                <span className="font-medium">{folder.name}</span>
              </div>
              <button
                className="ml-2 px-4 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                disabled={forbiddenIds.includes(folder._id)}
                onClick={() => onMove(folder._id)}
              >
                Move
              </button>
            </div>
          ))}
        </div>
        {/* Move to current location (root or folder) */}
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300" onClick={onClose}>Cancel</button>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            onClick={handleMoveHere}
            disabled={forbiddenIds.includes(currentFolderId)}
          >
            Move Here
          </button>
        </div>
      </div>
    </div>
  );
}
