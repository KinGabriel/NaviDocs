import React from 'react';
import { X } from 'lucide-react';

export default function BookmarkModal({ show, onClose, bookmarkName, setBookmarkName, onConfirm }) {
  if (!show) return null;

  return (
    // Transparent overlay: keep page visible, close when clicking outside modal
    <div onClick={onClose} className="fixed inset-0 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add bookmark name</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-2">Bookmark name (optional)</label>
          <input
            value={bookmarkName}
            onChange={(e) => setBookmarkName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Enter a name to remember this version"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Save bookmark</button>
        </div>
      </div>
    </div>
  );
}
