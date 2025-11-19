import React, { useEffect, useRef } from "react";

export default function ArchiveUserModal({
  open,
  userName = "",
  onConfirm,
  onClose,
  loading = false,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={dialogRef}
        className="relative w-[520px] max-w-[92vw] rounded-2xl bg-white p-6 shadow-2xl"
      >
        {/* Close (X) */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-gray-500 hover:bg-gray-100"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-yellow-500">
            <path d="M9 3h6m-9 4h12m-1 0-.7 11.2a2 2 0 0 1-2 1.8H8.7a2 2 0 0 1-2-1.8L6 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 10v6M14 10v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </div>

        {/* Message */}
        <p className="text-center text-lg font-semibold text-gray-800">
          Are you sure you want to archive
          <br />
          <span className="font-bold">{userName}</span>?
        </p>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-md bg-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-md bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Archiving…" : "Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}