// src/layout/create_template/fieldsPanel.jsx
import React from "react";

const TYPES = ["text", "image"];

export default function FieldsPanel({ editor, fields = [], onChange = () => {} }) {
  const [local, setLocal] = React.useState(() => fields);
  const [errors, setErrors] = React.useState({}); // { idx: "message" }

  React.useEffect(() => setLocal(fields), [fields]);

  const addField = () => {
    const base = { key: "", type: "text", placeholder: "" };
    setLocal((prev) => [...prev, base]);
  };

  const removeField = (idx) => {
    setLocal((prev) => prev.filter((_, i) => i !== idx));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const updateField = (idx, patch) => {
    setLocal((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  // For image placeholder: store a dataURL in `placeholder` and a volatile preview `_preview`
  const handlePickImage = (idx, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result || "";
      updateField(idx, { placeholder: dataUrl, _preview: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const validateAll = (list) => {
    const errs = {};
    const seen = new Set();
    list.forEach((f, i) => {
      const k = (f.key || "").trim();
      if (!k) errs[i] = "Field name is required.";
      else if (seen.has(k)) errs[i] = "Field name must be unique.";
      else seen.add(k);

      const t = TYPES.includes(f.type) ? f.type : "text";
      if (t === "text") {
        if (!(f.placeholder || "").trim()) errs[i] = "Placeholder text is required.";
      } else if (t === "image") {
        if (!f.placeholder) errs[i] = "Placeholder image is required.";
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const persist = () => {
    const normalized = local.map((f) => ({
      key: (f.key || "").trim(),
      type: TYPES.includes(f.type) ? f.type : "text",
      // placeholder: for text → trimmed string, for image → dataURL string
      placeholder:
        (f.type === "text" ? (f.placeholder || "").trim() : f.placeholder) || "",
    }));

    if (!validateAll(normalized)) return;

    // Drop volatile preview before emitting
    onChange(
      normalized.map(({ key, type, placeholder }) => ({ key, type, placeholder }))
    );
  };

  const allValid = React.useMemo(() => {
    const tmp = local.map((f) => ({
      key: (f.key || "").trim(),
      type: TYPES.includes(f.type) ? f.type : "text",
      placeholder:
        (f.type === "text" ? (f.placeholder || "").trim() : f.placeholder) || "",
    }));
    return validateAll(tmp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Set Editable Fields</h3>
        <button
          onClick={addField}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
        >
          + Add Field
        </button>
      </div>

      {local.length === 0 && (
        <div className="text-sm text-slate-500">No fields yet. Click “+ Add Field”.</div>
      )}

      <div className="space-y-2">
        {local.map((f, idx) => {
          const err = errors[idx];
          const isImage = f.type === "image";
          return (
            <div
              key={idx}
              className={`rounded-lg border p-2 shadow-xs ${
                err ? "border-red-300" : "border-slate-200"
              }`}
            >
              <div className="mb-2 grid grid-cols-5 gap-2">
                <label className="col-span-3 text-xs text-slate-600">
                  Field Name
                  <input
                    value={f.key || ""}
                    onChange={(e) => updateField(idx, { key: e.target.value })}
                    placeholder="e.g., Full Name"
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>

                <label className="col-span-2 text-xs text-slate-600">
                  Type
                  <select
                    value={f.type || "text"}
                    onChange={(e) => updateField(idx, { type: e.target.value, placeholder: "" })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Placeholder (REQUIRED) */}
              {!isImage ? (
                <label className="mb-2 block text-xs text-slate-600">
                  Placeholder (required)
                  <input
                    value={f.placeholder || ""}
                    onChange={(e) => updateField(idx, { placeholder: e.target.value })}
                    placeholder="Shown when empty (e.g., John D. Cruz)"
                    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>
              ) : (
                <div className="mb-2">
                  <div className="text-xs text-slate-600">Placeholder Image (required)</div>
                  <div className="mt-1 flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePickImage(idx, e.target.files?.[0])}
                      className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1 file:text-sm hover:file:bg-slate-50"
                    />
                  </div>
                  {f._preview || f.placeholder ? (
                    <img
                      src={f._preview || f.placeholder}
                      alt="placeholder preview"
                      className="mt-2 max-h-28 w-auto rounded border"
                    />
                  ) : null}
                </div>
              )}

              {err ? (
                <div className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                  {err}
                </div>
              ) : null}

              <div className="flex justify-between">
                <button
                  onClick={() => removeField(idx)}
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
                <button
                  onClick={persist}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
                >
                  Save Fields
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {local.length > 0 && (
        <div className="pt-2">
          <button
            onClick={persist}
            disabled={!allValid}
            className={`w-full rounded-md px-3 py-2 text-sm font-medium text-white ${
              allValid
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-slate-300 cursor-not-allowed"
            }`}
          >
            Save All Changes
          </button>
        </div>
      )}

      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        Tip: Field Name must be unique. Placeholder is required for both Text and Image
        types. For Image, upload a placeholder image.
      </p>
    </div>
  );
}
