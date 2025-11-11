// src/components/font_layout/textColors.jsx
import React, { useMemo, useState, useCallback } from "react";

const normalizeHex = (hex) => {
  if (!hex) return "#000000";
  let h = String(hex).trim().toLowerCase();
  if (!h.startsWith("#")) h = `#${h}`;
  if (h.length === 4) h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  return h;
};

const updateRecent = (prev, picked, max = 8) => {
  const hx = normalizeHex(picked);
  const next = [hx, ...prev.filter((c) => c !== hx)];
  return next.slice(0, max);
};

const DEFAULT_TEXT_PALETTE = Object.freeze([
  "#000000", "#333333", "#666666", "#808080", "#999999", "#b3b3b3",
  "#cccccc", "#e6e6e6", "#f2f2f2", "#ffffff", "#990000", "#ff0000",
  "#ff9900", "#ffff00", "#00cc00", "#00ccff", "#0000ff", "#3333ff",
  "#6600cc", "#ff00ff",
]);


const SwatchButton = React.memo(function SwatchButton({ color, onClick, title }) {
  return (
    <button
      type="button"
      onClick={() => onClick(color)}
      className="h-6 w-6 rounded-full border mr-2 mt-2"
      style={{ background: color }}
      title={title || color}
      aria-label={`Color ${color}`}
    />
  );
});

/* -------------------------------------------------------------------------- */
/* TextColors Component                                                        */
/* -------------------------------------------------------------------------- */
/**
 * Props:
 *  - editor: TipTap editor instance (required to apply color)
 *  - palette: string[] hex codes (optional; defaults to DEFAULT_TEXT_PALETTE)
 *  - defaultColor: string hex (optional; defaults to "#000000")
 *  - maxRecents: number (optional; defaults to 8)
 *  - onChange: (hex) => void (optional callback fired after apply)
 */
export default function TextColors({
  editor,
  palette = DEFAULT_TEXT_PALETTE,
  defaultColor = "#000000",
  maxRecents = 8,
  onChange,
}) {
  const isReady = !!editor;

  // stable palette (avoid accidental mutation)
  const PALETTE = useMemo(() => [...palette], [palette]);

  // state
  const [currentTextColor, setCurrentTextColor] = useState(
    normalizeHex(defaultColor)
  );
  const [recentColors, setRecentColors] = useState(() =>
    PALETTE.slice(0, Math.max(0, maxRecents))
  );

  // actions
  const applyColor = useCallback(
    (hex) => {
      const color = normalizeHex(hex);
      if (isReady) {
        try {
          editor.chain().focus().setColor(color).run();
        } catch {}
      }
      setCurrentTextColor(color);
      setRecentColors((prev) => updateRecent(prev, color, maxRecents));
      if (typeof onChange === "function") onChange(color);
    },
    [editor, isReady, maxRecents, onChange]
  );

  if (!isReady) return null;

  return (
    <div className="mb-4">
      {/* Header + Picker */}
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-800">Text color</div>
        <label
          className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer"
          title="Pick custom text color"
          aria-label="Pick custom text color"
        >
          <span>Picker</span>
          <input
            type="color"
            value={currentTextColor}
            onChange={(e) => applyColor(e.target.value)}
            className="h-5 w-7 p-0 border-0 bg-transparent cursor-pointer"
            aria-label="Text color picker"
          />
        </label>
      </div>

      {/* Fixed palette */}
      <div className="flex flex-wrap mt-2">
        {PALETTE.map((c) => (
          <SwatchButton key={`txt-pal-${c}`} color={c} onClick={applyColor} />
        ))}
      </div>

      {/* Recent */}
      {recentColors.length > 0 && (
        <>
          <div className="text-xs text-gray-500 mt-3 mb-1">Recent</div>
          <div className="flex flex-wrap">
            {recentColors.map((c) => (
              <SwatchButton
                key={`txt-rec-${c}`}
                color={c}
                onClick={applyColor}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
