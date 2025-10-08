import { useEffect, useState } from "react";

export default function CreateDocumentModal({
  open,
  onClose,
  defaultTitle = "",
  onCreate,
  submitting = false,
  error = "",
  user = null,
}) {
  const [title, setTitle] = useState(defaultTitle || "");
  const [localError, setLocalError] = useState("");
  const [autoFill, setAutoFill] = useState(true);
  const [autoFillScope, setAutoFillScope] = useState("user");

  const allowSchoolScope = (u) => {
    if (!u) return false;
    if (u === 'Document Controller') return true;
    if (typeof u === 'object') {
      if (u.role && (u.role === 'Document Controller' || u.role.name === 'Document Controller')) return true;
      if (Array.isArray(u.roles) && u.roles.some(r => r && r.name === 'Document Controller')) return true;
    }
    return false;
  };

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
    // pass autofill preference as second argument: false | 'user' | 'school'
    const scope = autoFill ? (autoFillScope || 'user') : false;
    await onCreate(trimmed, scope);
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
          <div className="flex items-center space-x-2 mt-2">
            <input id="autofill" type="checkbox" checked={autoFill} onChange={(e) => setAutoFill(e.target.checked)} className="h-4 w-4" />
            <label htmlFor="autofill" className="text-sm text-gray-700">Autofill empty fields from my saved suggestions</label>
          </div>
          {autoFill && (
            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">Autofill scope</label>
              <div className="flex items-center space-x-3">
                <label className="inline-flex items-center">
                  <input type="radio" name="autofillScope" value="user" checked={autoFillScope === 'user'} onChange={() => setAutoFillScope('user')} className="h-4 w-4" />
                  <span className="ml-2 text-sm">Mine (user)</span>
                </label>
                <label className="inline-flex items-center">
                  <input type="radio" name="autofillScope" value="school" checked={autoFillScope === 'school'} onChange={() => setAutoFillScope('school')} className="h-4 w-4" />
                  <span className={`ml-2 text-sm`}>School</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">Selecting <strong>School</strong> will use school-level suggestions for autofill. Note: only document controllers can save suggestions at the school level; choosing School does not grant you that permission.</p>
            </div>
          )}
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
