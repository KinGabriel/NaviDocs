import React from 'react';

export default function AssignTemplateModal({
  open,
  onClose,
  template,
  faculty,
  facultyLoading,
  selectedFacultyIds,
  toggleFaculty,
  onConfirm,
  loading
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-template-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 id="assign-template-title" className="text-xl font-bold">Assign Template</h2>
            <p className="text-sm text-gray-600">
              {template?.title || 'Untitled Template'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 hover:bg-gray-100"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"
                 viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd"
                    d="M10 8.586l4.95-4.95a1 1 0 111.414 1.414L11.414 10l4.95 4.95a1 1 0 01-1.414 1.414L10 11.414l-4.95 4.95a1 1 0 01-1.414-1.414L8.586 10l-4.95-4.95A1 1 0 115.05 3.636L10 8.586z"
                    clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Faculty list */}
        <div className="h-64 overflow-auto border rounded-md p-3">
          {facultyLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : faculty?.length ? (
            <ul className="divide-y">
              {faculty.map((f) => (
                <li key={f._id} className="py-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{f.name || f.fullName || f.email}</p>
                    <p className="text-xs text-gray-500 truncate">{f.email}</p>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedFacultyIds.includes(f._id)}
                      onChange={() => toggleFaculty(f._id)}
                    />
                    <span className="text-sm">Select</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center text-gray-500 text-sm">
              No faculty found for your department.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border bg-white text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loading && (
              <span className="h-4 w-4 border-2 border-white border-b-transparent rounded-full animate-spin" />
            )}
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}