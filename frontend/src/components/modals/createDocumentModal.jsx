import { useEffect, useState } from "react";

export default function CreateDocumentModal({
  open,
  onClose,
  defaultTitle = "",
  onCreate, 
  submitting = false,
  error = "",
}) {
  const [title, setTitle] = useState(defaultTitle || "");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle || "");
      setLocalError("");
    }
  }, [open, defaultTitle]);

  if (!open) return null;

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setLocalError("Document name is required.");
      return;
    }
    await onCreate(trimmed);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">Create Document</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded hover:bg-gray-100">✕</button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <label className="block text-sm font-medium">Document name</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Untitled Document"
          />
          {(localError || error) && (
            <p className="text-sm text-red-600">{localError || error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded border hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={submitting}
            className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
