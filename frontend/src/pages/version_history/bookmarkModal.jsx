import React from 'react';
import { X, Bookmark } from 'lucide-react';

export default function BookmarkModal({ show, onClose, bookmarkName, setBookmarkName, onConfirm }) {
  if (!show) return null;

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 backdrop-blur-[2px] bg-black/40 flex items-center justify-center z-50 px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4 sm:p-6 animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Bookmark Version</h1>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6 space-y-3">
          <p className="text-sm sm:text-md text-gray-700">
            Add a name to help you identify this version later.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bookmark Name <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <input
              value={bookmarkName}
              onChange={(e) => setBookmarkName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-400"
              placeholder="e.g., Final review, Pre-launch draft..."
              autoFocus
              maxLength={100}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Tip:</strong> Bookmarked versions appear at the top of each date group for easy access.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Bookmark className="w-4 h-4" />
            Save Bookmark
          </button>
        </div>
      </div>
    </div>
  );
}