import React, { useEffect, useMemo, useState } from 'react';
import { getFoldersAPI, createFolderAPI } from '../../api/storageAPI';
import { ArrowLeft, FolderPlus } from 'lucide-react';

// Hierarchical folder picker with root selection and create-in-place
export default function StoragePickerModal({ open, onClose, user, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // null means root (My Storage)
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [path, setPath] = useState([]); // [{ _id, name }]
  const [selectedId, setSelectedId] = useState(null); // null selects root

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getFoldersAPI({ user });
        const list = Array.isArray(res?.folders) ? res.folders : (Array.isArray(res) ? res : []);
        setFolders(list);
        // default selection is current location (root)
        setSelectedId(null);
        setCurrentFolderId(null);
        setPath([]);
      } catch (e) {
        setError(e?.message || 'Failed to load folders');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, user]);

  const subfolders = useMemo(() => {
    return folders.filter(f => {
      const pid = f.parentFolder || null;
      return (pid || null) === (currentFolderId || null);
    }).sort((a, b) => a.folderName.localeCompare(b.folderName));
  }, [folders, currentFolderId]);

  const currentLocationName = useMemo(() => {
    if (!currentFolderId) return 'My Storage';
    const f = folders.find(x => x._id === currentFolderId);
    return f ? f.folderName : 'Unknown';
  }, [currentFolderId, folders]);

  const handleEnterFolder = (folder) => {
    setCurrentFolderId(folder._id);
    setPath(prev => [...prev, { _id: folder._id, name: folder.folderName }]);
    setSelectedId(folder._id);
  };

  const handleBack = () => {
    if (!path.length) {
      setCurrentFolderId(null);
      setSelectedId(null);
      return;
    }
    const newPath = [...path];
    newPath.pop();
    setPath(newPath);
    const newCurrent = newPath.length ? newPath[newPath.length - 1]._id : null;
    setCurrentFolderId(newCurrent);
    setSelectedId(newCurrent);
  };

  const handleCreate = async () => {
    if (!newFolderName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await createFolderAPI({ folderName: newFolderName.trim(), user, parentFolder: currentFolderId || undefined });
      const created = res?.folder || res;
      if (created && created._id) {
        setFolders(prev => [created, ...prev]);
        setSelectedId(created._id);
        setNewFolderName('');
      }
    } catch (e) {
      setError(e?.message || 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  };

  const handleConfirm = async (targetId = undefined) => {
    setSubmitting(true);
    try {
      // Prefer an explicit target folder if provided, otherwise use current path (currentFolderId), else root
      const dest = typeof targetId !== 'undefined' ? targetId : (currentFolderId || null);
      await onConfirm?.(dest);
      onClose?.();
    } catch (e) {
      setError(e?.message || 'Export failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-800">Export to Storage</div>
            <div className="text-xs text-gray-500 mt-0.5">Choose a folder (or root) to save the PDF, then it will download</div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {/* Current location pill */}
        <div className="px-5 pt-4 pb-1 text-sm text-gray-700 flex items-center gap-2">
          <span className="font-medium">Current location:</span>
          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">{currentLocationName}</span>
        </div>

        <div className="px-5 pt-2 pb-2 flex items-center gap-2">
          <button className="text-blue-600 hover:underline text-sm disabled:text-gray-400" onClick={handleBack} disabled={!path.length}> 
            <ArrowLeft className="inline w-4 h-4 mr-1" />Back
          </button>
          <span className="text-gray-500 text-sm">{['My Storage', ...path.map(p => p.name)].join(' / ')}</span>
        </div>

        <div className="px-5 pb-4">
          {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
          <div className="border border-gray-200 rounded-lg max-h-72 overflow-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-4 text-sm text-gray-500">Loading folders…</div>
            ) : (
              <>
                {/* Subfolders list */}
                {subfolders.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">No subfolders</div>
                )}
                {subfolders.map(folder => (
                  <div key={folder._id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="inline-block"><FolderPlus className="w-4 h-4 text-blue-600" /></span>
                      <button className="text-sm font-medium text-gray-800 hover:underline" onClick={() => handleEnterFolder(folder)}>
                        {folder.folderName}
                      </button>
                    </div>
                    <button
                      className="ml-2 px-4 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      disabled={submitting}
                      onClick={() => handleConfirm(folder._id)}
                    >
                      Move
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Create folder here</label>
            <div className="flex gap-2">
              <input
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder={currentFolderId ? `New folder in ${currentLocationName}` : 'New folder in My Storage'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newFolderName.trim()}
                className={`px-3 py-2 rounded-lg text-white flex items-center gap-2 ${creating || !newFolderName.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                <FolderPlus className="w-4 h-4" />
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800">Cancel</button>
          <button
            onClick={() => handleConfirm()}
            disabled={submitting}
            className={`px-4 py-2 rounded-lg text-white ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {submitting ? 'Exporting…' : 'Move Here'}
          </button>
        </div>
      </div>
    </div>
  );
}
