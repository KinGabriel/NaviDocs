import { useEffect, useState } from "react";

export default function DeleteDocumentModal({
  open,
  onClose,
  documentTitle = "",
  onConfirm,          // async () => void
  submitting = false,
  error = "",
}) {
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (open) setLocalError("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">Delete Document</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded hover:bg-gray-100">✕</button>
        </div>

        {/* Body */}
        <div className="px-5 py-6 space-y-3">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete <span className="font-semibold">“{documentTitle || "this document"}”</span>?
          </p>
          {(localError || error) && (
            <p className="text-sm text-red-600">{localError || error}</p>
          )}
        </div>

        {/* Footer: No (left) | Yes (right) */}
        <div className="flex items-center justify-between px-5 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded border hover:bg-gray-50">
            No
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="px-4 py-2 rounded bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-60"
          >
            {submitting ? "Deleting…" : "Yes"}
          </button>
        </div>
      </div>
    </div>
  );
}
