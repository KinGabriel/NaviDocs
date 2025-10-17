// src/layout/create_template/headerFooterPanel.jsx
import React, { useState, useEffect, useRef } from "react";
import { toISODate } from "../../utils/formatters";

const SLU_LOGO_SRC = "/assets/images/slu-logo.png";
const CICM_LOGO_SRC = "/assets/images/cicm-logo.png";

export default function HeaderFooterPanel({ value, onChange }) {
  const v = value ?? {};

  // --- Logo toggles ---
  const [showSLULogo, setShowSLULogo] = useState(!!v.showSLULogo);
  const [showCICMLogo, setShowCICMLogo] = useState(!!v.showCICMLogo);

  // --- Center text lines ---
  const [line1, setLine1] = useState(v.line1 ?? "Saint Louis University");
  const [line2, setLine2] = useState(v.line2 ?? "");
  const [line3, setLine3] = useState(v.line3 ?? "");
  const [line4, setLine4] = useState(v.line4 ?? "");
  const [showLine4, setShowLine4] = useState(!!v.showLine4);

  // --- Document stamp fields ---
  const [docCode, setDocCode] = useState(v.docCode ?? "");
  const [revisionNo, setRevisionNo] = useState(v.revisionNo ?? "");
  // Normalize effectivity into ISO string when possible so the input shows a
  // consistent value (handles { $date: ISO } objects and loose date strings).
  const normalizeEffectivityLocal = (val) => {
    if (val === undefined || val === null || val === "") return "";
    if (typeof val === 'object' && val.$date) return val.$date;
    const d = new Date(val);
    return isNaN(d) ? String(val) : d.toISOString();
  };

  const [effectivity, setEffectivity] = useState(normalizeEffectivityLocal(v.effectivity ?? ""));

  // Sync when parent changes value
  // Prevent emitting changes while we're applying incoming props
  const isSyncingRef = useRef(false);

  useEffect(() => {
    isSyncingRef.current = true;
    setShowSLULogo(!!v.showSLULogo);
    setShowCICMLogo(!!v.showCICMLogo);
    setLine1(v.line1 ?? "Saint Louis University");
    setLine2(v.line2 ?? "");
    setLine3(v.line3 ?? "");
    setLine4(v.line4 ?? "");
    setShowLine4(!!v.showLine4);
  setDocCode(v.docCode ?? "");
  setRevisionNo(v.revisionNo ?? "");
  setEffectivity(normalizeEffectivityLocal(v.effectivity ?? ""));
    // release syncing after current tick so the notify effect can fire for user edits
    const t = setTimeout(() => { isSyncingRef.current = false; }, 0);
    return () => clearTimeout(t);
  }, [v]);

  // Notify parent (but skip if we're currently applying incoming props to avoid
  // parent-child feedback loops). Emit both legacy nested `documentStamp` and
  // top-level fields for forward/backward compatibility.
  useEffect(() => {
    if (isSyncingRef.current) return;
    const payload = {
      showSLULogo,
      showCICMLogo,
      assets: { slu: SLU_LOGO_SRC, cicm: CICM_LOGO_SRC },
      center: { line1, line2, line3, line4, showLine4 },
      // legacy nested shape
      documentStamp: { docCode, revisionNo, effectivity },
      // top-level fields (preferred when present)
      document_code: docCode,
      revision_no: revisionNo,
      effectivity: effectivity,
    };
    onChange?.(payload);
  }, [
    showSLULogo,
    showCICMLogo,
    line1,
    line2,
    line3,
    line4,
    showLine4,
    docCode,
    revisionNo,
    effectivity,
    onChange,
  ]);

  return (
    <div className="p-5 bg-white rounded-2xl shadow-md w-full overflow-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Header & Footer Settings</h2>
      <p className="text-sm text-gray-500 mb-4">
        Configure your institutional header with logos, department name, and document info.
      </p>

      {/* --- Logo toggles --- */}
      <div className="space-y-4 mb-6">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showSLULogo}
            onChange={(e) => setShowSLULogo(e.target.checked)}
            className="w-5 h-5 accent-blue-600"
          />
          <span className="text-gray-700 font-medium">Show SLU Logo</span>
        </label>
        {showSLULogo && (
          <div className="ml-8">
            <img src={SLU_LOGO_SRC} alt="SLU Logo" className="h-12 object-contain mt-2" />
          </div>
        )}

        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showCICMLogo}
            onChange={(e) => setShowCICMLogo(e.target.checked)}
            className="w-5 h-5 accent-blue-600"
          />
          <span className="text-gray-700 font-medium">Show CICM Logo</span>
        </label>
        {showCICMLogo && (
          <div className="ml-8">
            <img src={CICM_LOGO_SRC} alt="CICM Logo" className="h-12 object-contain mt-2" />
          </div>
        )}
      </div>

      {/* --- Center Text Block --- */}
      <div className="border-t pt-4 space-y-3">
        <h3 className="font-semibold text-gray-700 mb-2">Center Text Block</h3>
        <div className="space-y-2">
          <input
            type="text"
            className="border rounded-md px-3 py-2 w-full text-sm"
            placeholder="Line 1 (fixed)"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            disabled
          />
          <input
            type="text"
            className="border rounded-md px-3 py-2 w-full text-sm"
            placeholder="Line 2 (e.g., Office / School / Department)"
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
          />
          <input
            type="text"
            className="border rounded-md px-3 py-2 w-full text-sm"
            placeholder="Line 3 (e.g., Cluster: Academic Cluster)"
            value={line3}
            onChange={(e) => setLine3(e.target.value)}
          />

          {/* Optional 4th Line */}
          <div className="flex items-center space-x-2 mt-2">
            <input
              type="checkbox"
              checked={showLine4}
              onChange={(e) => setShowLine4(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <label className="text-sm font-medium text-gray-700">Show additional line</label>
          </div>
          {showLine4 && (
            <input
              type="text"
              className="border rounded-md px-3 py-2 w-full text-sm"
              placeholder="Line 4 (e.g., Document Title)"
              value={line4}
              onChange={(e) => setLine4(e.target.value)}
            />
          )}
        </div>
      </div>

      {/* --- Document Stamp --- */}
      <div className="border-t pt-4 mt-5 space-y-3">
        <h3 className="font-semibold text-gray-700 mb-2">Document Stamp (Right Side Table)</h3>
        <p className="text-xs text-gray-500 mb-3">
          Fixed labels. Only values are editable. Page count is automatic.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 w-1/3">Document Code</span>
            <input
              type="text"
              className="border rounded-md px-2 py-1 text-sm flex-1"
              value={docCode}
              onChange={(e) => setDocCode(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 w-1/3">Revision No.</span>
            <input
              type="text"
              className="border rounded-md px-2 py-1 text-sm flex-1"
              value={revisionNo}
              onChange={(e) => setRevisionNo(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 w-1/3">Effectivity</span>
            <input
              type="text"
              className="border rounded-md px-2 py-1 text-sm flex-1"
              value={toISODate(effectivity)}
              onChange={(e) => setEffectivity(normalizeEffectivityLocal(e.target.value))}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 w-1/3">Page</span>
            <input
              type="text"
              className="border rounded-md px-2 py-1 text-sm flex-1 bg-gray-50 text-gray-500"
              value="1 of N (auto)"
              disabled
            />
          </div>
        </div>
      </div>
    </div>
  );
}
