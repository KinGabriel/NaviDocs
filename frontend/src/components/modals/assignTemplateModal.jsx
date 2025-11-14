import React, { useMemo, useState } from 'react';

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

  // Local search state
  const [query, setQuery] = useState('');

  // Filtered list (name/fullName/email)
  const filteredFaculty = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faculty || [];
    return (faculty || []).filter((f) => {
      const name = String(f?.name || f?.fullName || '').toLowerCase();
      const email = String(f?.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [faculty, query]);

  const handleSelectAll = () => {
    const ids = filteredFaculty.map((f) => f._id);
    ids.forEach((id) => {
      if (!selectedFacultyIds.includes(id)) toggleFaculty(id);
    });
  };

  const handleDeselectAll = () => {
    const ids = filteredFaculty.map((f) => f._id);
    ids.forEach((id) => {
      if (selectedFacultyIds.includes(id)) toggleFaculty(id);
    });
  };

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

        {/* search input */}
        <div className="mb-3">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search faculty by name or email…"
              className="w-full rounded-md border border-gray-300 pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Search faculty"
            />
            {/* Search icon */}
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10 2a8 8 0 105.293 14.293l4.707 4.707 1.414-1.414-4.707-4.707A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z" />
            </svg>
            {/* Clear button */}
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-gray-100"
                aria-label="Clear search"
                title="Clear"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400"
                  viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* Result count */}
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
            <span>
              {facultyLoading
                ? 'Loading faculty…'
                : `${filteredFaculty.length} result${filteredFaculty.length === 1 ? '' : 's'}`}
            </span>
            {!facultyLoading && filteredFaculty.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-blue-600 hover:underline"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="text-blue-600 hover:underline"
                >
                  Deselect All
                </button>
              </div>
            )}
          </div>
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