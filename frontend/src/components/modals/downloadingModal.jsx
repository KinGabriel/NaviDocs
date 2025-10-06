import React from "react";
import { useEffect, useState } from "react";

/**
 * Simple "Downloading..." modal with spinner + status text.
 * Shows while a file is being generated/downloaded.
 */
export default function DownloadingModal({
  open,
  title = "Downloading PDF…",
  message = "Please wait while your file is being prepared.",
  onClose,
  isError = false,
  errorText = "",
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Modal shell */}
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {isError ? "Download failed" : title}
          </h2>
          {onClose ? (
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-100"
              aria-label="Close"
            >
              ✕
            </button>
          ) : null}
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {!isError ? (
            <>
              <div className="flex items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-b-transparent border-blue-600" />
                <div className="text-sm text-gray-700">
                  {message}
                  <div className="text-xs text-gray-500 mt-1">
                    This window will close automatically when the file is ready.
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-red-600">
              {errorText || "Something went wrong while preparing your PDF."}
              {onClose ? (
                <div className="mt-4">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm rounded bg-gray-800 text-white hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
