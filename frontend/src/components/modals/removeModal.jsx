import React, { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";

export default function RemoveModal({
  open,
  onClose,
  itemType = "item", // "folder" or "file"
  itemTitle = "",
  onConfirm,
  submitting = false,
  error = "",
}) {
  const [localError, setLocalError] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setLocalError("");
    } else {
      setIsVisible(false);
    }
  }, [open]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && open && !submitting) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const displayName =
    itemType.charAt(0).toUpperCase() + itemType.slice(1).toLowerCase();

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-modal-title"
    >
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${isVisible ? "opacity-50" : "opacity-0"
          }`}
        onClick={submitting ? undefined : onClose}
      />

      <div
        className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl transform transition-all duration-300 ${isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h2 id="remove-modal-title" className="text-xl font-semibold text-gray-900">
              Archive {displayName}
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
        <div className="px-6 py-6 text-center">
          <p className="text-gray-700 text-sm leading-relaxed">
            Are you sure you want to archive this{" "}
            <span className="font-semibold text-gray-900">{displayName}</span>{" "}
            {itemTitle && (
              <>
                named <span className="font-semibold text-gray-900">“{itemTitle}”</span>
              </>
            )}
            ? This action can be undone later from the archive.
          </p>
          {(localError || error) && (
            <p className="text-sm text-red-600 mt-3">{localError || error}</p>
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
            onClick={onConfirm}
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                Archiving…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Archive
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}