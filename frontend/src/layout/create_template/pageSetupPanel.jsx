// src/layout/create_template/PageSetupPanel.jsx
import { useState, useEffect } from "react";
import Dropdown from "../../components/dropdowns/dropdown2";

export default function PageSetupPanel({
  pageSetup,
  onApply,
  defaultOrientation = "Portrait",
  defaultMargins = { top: 1, bottom: 1, left: 1, right: 1 },
  defaultPaperSize = "A4",
}) {
  // Local draft state for editing before Apply
  const [draftPaperSize, setDraftPaperSize] = useState(pageSetup.paperSize);
  const [draftOrientation, setDraftOrientation] = useState(pageSetup.orientation);
  const [draftMargins, setDraftMargins] = useState(pageSetup.margins);

  // Sync when parent updates
  useEffect(() => {
    if (!pageSetup) return;
    setDraftPaperSize(pageSetup.paperSize);
    setDraftOrientation(pageSetup.orientation);
    setDraftMargins(pageSetup.margins);
  }, [pageSetup]);

  const safe = (val, fallback = 1) => {
    const n = Number(val);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };

  // Cancel: revert to last applied
  const handleCancel = () => {
    setDraftPaperSize(pageSetup.paperSize);
    setDraftOrientation(pageSetup.orientation);
    setDraftMargins(pageSetup.margins);
  };

  // Apply: send full pageSetup object to parent
  const handleApply = () => {
    const newSetup = {
      paperSize: draftPaperSize,
      orientation: draftOrientation,
      margins: {
        top: safe(draftMargins.top),
        bottom: safe(draftMargins.bottom),
        left: safe(draftMargins.left),
        right: safe(draftMargins.right),
      },
    };
    onApply(newSetup);
  };

  // Reset: restore to defaults
  const handleReset = () => {
    const resetSetup = {
      paperSize: defaultPaperSize,
      orientation: defaultOrientation,
      margins: defaultMargins,
    };
    setDraftPaperSize(defaultPaperSize);
    setDraftOrientation(defaultOrientation);
    setDraftMargins(defaultMargins);
    onApply(resetSetup);
  };

  return (
    <div>
      <div className="font-bold text-xl mb-6">Page Setup</div>

      {/* Orientation */}
      <div className="mb-7">
        <label className="font-semibold text-sm mb-2 block">Orientation</label>
        <div className="flex gap-6">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="orientation"
              value="Portrait"
              checked={draftOrientation === "Portrait"}
              onChange={() => setDraftOrientation("Portrait")}
              className="accent-[#063c8d]"
            />
            Portrait
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="orientation"
              value="Landscape"
              checked={draftOrientation === "Landscape"}
              onChange={() => setDraftOrientation("Landscape")}
              className="accent-[#063c8d]"
            />
            Landscape
          </label>
        </div>
      </div>

      {/* Paper size */}
      <div className="mb-4">
        <Dropdown
          label="Paper size"
          value={draftPaperSize}
          onChange={setDraftPaperSize}
          options={[
            { value: "Letter", label: "Letter" },
            { value: "A4", label: "A4" },
            { value: "Legal", label: "Legal" },
          ]}
        />
      </div>

      {/* Margins */}
      <div className="mt-6">
        <label className="font-semibold text-sm mb-1 block">Margin (inches)</label>
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
              value={draftMargins[side]}
              onChange={(e) =>
                setDraftMargins({ ...draftMargins, [side]: e.target.value })
              }
              min="0"
              step="0.25"
              placeholder="1"
            />
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end items-center gap-6 mt-20">
        <button
          className="text-[#063c8d] font-semibold hover:underline"
          type="button"
          onClick={handleReset}
        >
          Reset
        </button>
        <button
          className="text-[#063c8d] font-semibold hover:underline"
          type="button"
          onClick={handleCancel}
        >
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
