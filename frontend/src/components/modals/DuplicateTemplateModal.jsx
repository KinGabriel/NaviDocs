import React, { useState } from "react";

export default function DuplicateTemplateModal({
  open,
  onClose,
  template,
  onDuplicate,
  submitting = false,
}) {
  const [newTitle, setNewTitle] = useState(template?.title ? `${template.title} (Copy)` : "");

  if (!open) return null;

  const handleDuplicate = async () => {
    if (onDuplicate) {
      await onDuplicate({ ...template, title: newTitle });
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Duplicate Template</h2>

        <label className="block text-sm font-medium mb-2">New Template Name</label>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
          <button
            onClick={handleDuplicate}
            disabled={submitting}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Duplicating…" : "Duplicate"}
          </button>
        </div>
      </div>
    </div>
  );
}
