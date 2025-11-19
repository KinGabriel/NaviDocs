import React, { useState, useEffect, useRef } from "react";
import { Edit2, X } from "lucide-react";

export default function RenameFolderModal({
  open,
  onClose,
  currentTitle = "",
  onSubmit,
  submitting = false,
  error = "",
}) {
  const [title, setTitle] = useState(currentTitle);
  const [localError, setLocalError] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setTitle(currentTitle || "");
      setLocalError("");
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    } else {
      setIsVisible(false);
    }
  }, [open, currentTitle]);

  // Close with ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && open && !submitting) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setLocalError("Folder name is required.");
      return;
    }
    await onSubmit(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !submitting) handleSave();
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-folder-modal-title"
    >
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${isVisible ? "opacity-50" : "opacity-0"
          }`}
        onClick={submitting ? undefined : onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl transform transition-all duration-300 ${isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Edit2 className="w-5 h-5 text-blue-600" />
            </div>
            <h2 id="rename-folder-modal-title" className="text-xl font-semibold text-gray-900">
              Rename Folder
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <label
            htmlFor="rename-folder-input"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            New Folder Name
          </label>
          <input
            ref={inputRef}
            id="rename-folder-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={submitting}
            placeholder="Enter new folder name"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          {(localError || error) && (
            <p className="text-sm text-red-600 mt-2">{localError || error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg font-medium text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || !title.trim()}
            className="px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}