// src/layout/create_template/PageSetupPanel.jsx
import { useState, useEffect, useMemo } from "react";
import Dropdown from "../../components/dropdowns/dropdown2";

/**
 * PageSetupPanel (Pure config, inches only)
 * - NO editor calls here. Emits a normalized `pageSetup` object upward via onApply.
 * - Header/footer band heights are kept internally (for compatibility) but UI is hidden.
 * - All numeric inputs snap to 0.25in and are clamped to sensible ranges.
 */

const DEFAULTS = {
  paperSize: "A4",
  orientation: "Portrait",
  margins: { top: 1, right: 1, bottom: 1, left: 1 },
  headerHeight: 1.0,
  footerHeight: 0.6,
};

const PAPER_OPTIONS = [
  { value: "A4", label: "A4 (210 × 297 mm)" },
  { value: "Letter", label: "Letter (8.5 × 11 in)" },
  { value: "Legal", label: "Legal (8.5 × 14 in)" },
];

const ORIENTATIONS = ["Portrait", "Landscape"];

// Utilities
const q = (n) => Math.round(n * 4) / 4; // snap to 0.25
const clamp = (n, min, max) => (n < min ? min : n > max ? max : n);
const toInches = (val, fallback = 1, { min = 0, max = 3 } = {}) => {
  const num = Number(val);
  const safe = Number.isFinite(num) ? num : fallback;
  return clamp(q(safe), min, max);
};

function normalize(setup) {
  const s = setup || {};
  const m = s.margins || {};
  return {
    paperSize: PAPER_OPTIONS.some((o) => o.value === s.paperSize) ? s.paperSize : DEFAULTS.paperSize,
    orientation: ORIENTATIONS.includes(s.orientation) ? s.orientation : DEFAULTS.orientation,
    margins: {
      top: toInches(m.top ?? DEFAULTS.margins.top),
      right: toInches(m.right ?? DEFAULTS.margins.right),
      bottom: toInches(m.bottom ?? DEFAULTS.margins.bottom),
      left: toInches(m.left ?? DEFAULTS.margins.left),
    },
    // kept for compatibility (no UI)
    headerHeight: toInches(s.headerHeight ?? DEFAULTS.headerHeight),
    footerHeight: toInches(s.footerHeight ?? DEFAULTS.footerHeight),
  };
}

export default function PageSetupPanel({
  pageSetup,
  onApply,
  defaultOrientation = DEFAULTS.orientation,
  defaultMargins = DEFAULTS.margins,
  defaultPaperSize = DEFAULTS.paperSize,
  defaultHeaderHeight = DEFAULTS.headerHeight,
  defaultFooterHeight = DEFAULTS.footerHeight,
}) {
  // Build a safe initial from props
  const initial = useMemo(
    () =>
      normalize({
        paperSize: pageSetup?.paperSize ?? defaultPaperSize,
        orientation: pageSetup?.orientation ?? defaultOrientation,
        margins: {
          top: pageSetup?.margins?.top ?? defaultMargins.top,
          right: pageSetup?.margins?.right ?? defaultMargins.right,
          bottom: pageSetup?.margins?.bottom ?? defaultMargins.bottom,
          left: pageSetup?.margins?.left ?? defaultMargins.left,
        },
        headerHeight: pageSetup?.headerHeight ?? defaultHeaderHeight,
        footerHeight: pageSetup?.footerHeight ?? defaultFooterHeight,
      }),
    [pageSetup, defaultPaperSize, defaultOrientation, defaultMargins, defaultHeaderHeight, defaultFooterHeight]
  );

  // Local draft state (edited then applied)
  const [draft, setDraft] = useState(initial);

  // Sync when parent updates
  useEffect(() => setDraft(initial), [initial]);

  const setDraftField = (path, value) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      const segs = path.split(".");
      let cur = next;
      for (let i = 0; i < segs.length - 1; i++) cur = cur[segs[i]];
      cur[segs[segs.length - 1]] = value;
      return normalize(next);
    });
  };

  const handleCancel = () => setDraft(initial);

  const handleReset = () => {
    const resetNormalized = normalize({
      paperSize: defaultPaperSize,
      orientation: defaultOrientation,
      margins: defaultMargins,
      headerHeight: defaultHeaderHeight,
      footerHeight: defaultFooterHeight,
    });
    setDraft(resetNormalized);
    onApply?.(resetNormalized);
  };

  const handleApply = () => onApply?.(normalize(draft));

  // Render
  return (
    <div>
      <div className="font-bold text-xl mb-6">Page Setup</div>

      {/* Orientation */}
      <div className="mb-7">
        <label className="font-semibold text-sm mb-2 block">Orientation</label>
        <div className="flex gap-6">
          {ORIENTATIONS.map((o) => (
            <label key={o} className="flex items-center gap-1">
              <input
                type="radio"
                name="orientation"
                value={o}
                checked={draft.orientation === o}
                onChange={() => setDraftField("orientation", o)}
                className="accent-[#063c8d]"
              />
              {o}
            </label>
          ))}
        </div>
      </div>

      {/* Paper size */}
      <div className="mb-4">
        <Dropdown
          label="Paper size"
          value={draft.paperSize}
          onChange={(v) => setDraftField("paperSize", v)}
          options={PAPER_OPTIONS}
        />
      </div>

      {/* Margins */}
      <div className="mt-6">
        <label className="font-semibold text-sm mb-1 block">Margins (inches)</label>
        <div className="flex gap-2 mb-1">
          <span className="w-1/4 text-xs text-gray-700 text-left">Top</span>
          <span className="w-1/4 text-xs text-gray-700 text-left">Bottom</span>
          <span className="w-1/4 text-xs text-gray-700 text-left">Left</span>
          <span className="w-1/4 text-xs text-gray-700 text-left">Right</span>
        </div>
        <div className="flex gap-2">
          {["top", "bottom", "left", "right"].map((side) => (
            <input
              key={side}
              type="number"
              className="w-1/4 border rounded px-2 py-1 text-center"
              value={draft.margins[side]}
              onChange={(e) =>
                setDraftField(`margins.${side}`, toInches(e.target.value, draft.margins[side]))
              }
              min="0"
              step="0.25"
              placeholder="1"
            />
          ))}
        </div>
      </div>

  

      {/* Actions */}
      <div className="flex justify-end items-center gap-6 mt-20">
        <button className="text-[#063c8d] font-semibold hover:underline" type="button" onClick={handleReset}>
          Reset
        </button>
        <button className="text-[#063c8d] font-semibold hover:underline" type="button" onClick={handleCancel}>
          Cancel
        </button>
        <button
          className="bg-[#063c8d] text-white rounded-full px-8 py-2 font-semibold hover:bg-[#052c6d] transition"
          type="button"
          onClick={handleApply}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
