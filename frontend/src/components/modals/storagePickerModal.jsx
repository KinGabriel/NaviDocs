import React, { useEffect, useMemo, useState } from 'react';
import { getFoldersAPI, createFolderAPI } from '../../api/storageAPI';
import { ArrowLeft, FolderPlus, Folder, ChevronRight } from 'lucide-react';
import Loader from '../../components/loader';

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

    // Extract userId
    const userId = user?._id || user?.userId || user?.id;

    if (!userId) {
      setError('User information not available. Please refresh the page.');
      setLoading(false);
      return;
    }

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
    const list = folders.filter(f => {
      const pid = f.parentFolder || null;
      return (pid || null) === (currentFolderId || null);
    })
      .filter(f => {
        const name = (f.folderName ?? '').trim();
        return name.length > 0 && name !== '...';
      })
      .sort((a, b) => (a.folderName || '').localeCompare(b.folderName || ''));
    return list;
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

  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      // Root
      setCurrentFolderId(null);
      setPath([]);
      setSelectedId(null);
    } else {
      const newPath = path.slice(0, index + 1);
      setPath(newPath);
      setCurrentFolderId(newPath[index]._id);
      setSelectedId(newPath[index]._id);
    }
  };

  const handleCreate = async () => {
    if (!newFolderName.trim() || !user) return;
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
    <div className="fixed inset-0 z-[100] backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Export to Storage</h2>
              <p className="text-sm text-gray-500 mt-1">Choose a destination folder for your PDF, then it will download</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center flex-wrap gap-2 text-sm overflow-x-auto">
            {/* Label */}
            <div className="flex items-center text-gray-600 font-medium whitespace-nowrap">
              <span>Current location:</span>
            </div>

            {/* Root */}
            <button
              onClick={() => handleBreadcrumbClick(-1)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors whitespace-nowrap text-gray-700 hover:text-blue-600 font-medium"
            >
              <span>My Storage</span>
            </button>

            {path.length > 3 && (
              <>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-400 select-none">...</span>
              </>
            )}

            {path.slice(-3).map((p, i) => (
              <React.Fragment key={p._id}>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <button
                  onClick={() => handleBreadcrumbClick(path.length - 3 + i)}
                  className="px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors whitespace-nowrap text-gray-700 hover:text-blue-600 font-medium"
                >
                  {p.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Folders List */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Folder className="w-4 h-4 text-blue-600" />
              Folders in {currentLocationName}
            </h3>

            <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader message='Loading folders...' />
                </div>

              ) : subfolders.length === 0 ? (
                <div className="p-8 text-center">
                  <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  {/* Subfolders list */}
                  <p className="text-sm text-gray-500">No subfolders here</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Create a new folder below to organize your files
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {subfolders.map((folder) => {
                    const isCurrentLocation = selectedId === folder._id;
                    return (
                      <div
                        key={folder._id}
                        className={`flex items-center justify-between p-4 transition-all duration-150 group ${isCurrentLocation
                            ? 'bg-blue-50 border-l-4 border-blue-600'
                            : 'hover:bg-blue-50'
                          }`}
                      >
                        <button
                          className="flex items-center gap-3 flex-1 text-left"
                          onClick={() => handleEnterFolder(folder)}
                        >
                          <div
                            className={`p-2 rounded-lg transition-colors ${isCurrentLocation
                                ? 'bg-blue-200'
                                : 'bg-blue-100 group-hover:bg-blue-200'
                              }`}
                          >
                            <Folder
                              className={`w-5 h-5 ${isCurrentLocation ? 'text-blue-700' : 'text-blue-600'
                                }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              {(folder.folderName || '').trim() || 'Untitled folder'}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </button>
                        <button
                          className="ml-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md"
                          disabled={submitting}
                          onClick={() => handleConfirm(folder._id)}
                        >
                          {submitting ? 'Moving...' : 'Move Here'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Create New Folder */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FolderPlus className="w-4 h-4" />
              Create New Folder
            </label>
            <div className="flex gap-2">
              <input
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && !creating && newFolderName.trim() && handleCreate()}
                placeholder="Enter folder name"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newFolderName.trim()}
                className={`px-5 py-2.5 rounded-lg text-white text-sm font-medium flex items-center gap-2 transition-all ${creating || !newFolderName.trim()
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                  }`}
              >
                <FolderPlus className="w-4 h-4" />
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3 rounded-b-2xl">
          <button
            onClick={handleBack}
            disabled={!path.length}
            className="px-4 py-2.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleConfirm()}
              disabled={submitting}
              className={`px-6 py-2.5 rounded-lg text-white text-sm font-medium transition-all ${submitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                }`}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </span>
              ) : (
                `Move to ${currentLocationName}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}