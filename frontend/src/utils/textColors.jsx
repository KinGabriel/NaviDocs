import React, { useMemo, useState, useCallback } from "react";

/* Helpers */
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

/* Palettes */
const DEFAULT_TEXT_PALETTE = Object.freeze([
  "#000000", "#333333", "#666666", "#808080", "#999999", "#b3b3b3",
  "#cccccc", "#e6e6e6", "#f2f2f2", "#ffffff", "#990000", "#ff0000",
  "#ff9900", "#ffff00", "#00cc00", "#00ccff", "#0000ff", "#3333ff",
  "#6600cc", "#ff00ff",
]);

const DEFAULT_HIGHLIGHT_PALETTE = Object.freeze([
  "#fff59d", "#ffff00", "#fde68a", "#fef08a", "#ffe082", "#ffd27f", "#ffb74d",
  "#bbdefb", "#90caf9", "#80deea", "#b3e5fc", "#a5f3fc",
  "#c8e6c9", "#a5d6a7", "#86efac", "#b9fbc0",
  "#ffcdd2", "#ffd1dc", "#fda4af",
  "#e5e7eb", "#f3f4f6", "#e9d5ff", "#fde2e4", "#fff1c1", "#d1fae5", "#cffafe",
]);

/* Swatch Button */
const SwatchButton = React.memo(function SwatchButton({ color, onClick, title, rounded = "full" }) {
  return (
    <button
      type="button"
      onClick={() => onClick(color)}
      className={`h-6 w-6 rounded-${rounded} border mr-2 mt-2`}
      style={{ background: color }}
      title={title || color}
      aria-label={`Color ${color}`}
    />
  );
});

/* TextColors Component */
/**
 * Props:
 *  - editor: TipTap editor instance (required)
 *  - palette: string[] for text (default DEFAULT_TEXT_PALETTE)
 *  - defaultColor: hex for text (default "#000000")
 *  - maxRecents: number for text recents; set 0 to hide (default 8)
 *  - onChange: (hex) => void after text color applied
 *  - enableHighlight: boolean to render highlight controls (default true)
 *  - highlightPalette: string[] for highlight (default DEFAULT_HIGHLIGHT_PALETTE)
 *  - defaultHighlight: hex (default "#fff59d")
 *  - onHighlightChange: (hex) => void after highlight applied
 *
 *   
 */
export default function TextColors({
  editor,
  palette = DEFAULT_TEXT_PALETTE,
  defaultColor = "#000000",
  maxRecents = 8,
  onChange,

  enableHighlight = true,
  highlightPalette = DEFAULT_HIGHLIGHT_PALETTE,
  defaultHighlight = "#fff59d",
  onHighlightChange,
}) {
  const isReady = !!editor;

  // stable palettes
  const TEXT_PALETTE = useMemo(() => [...palette], [palette]);
  const HL_PALETTE = useMemo(() => [...highlightPalette], [highlightPalette]);

  // text state
  const [currentTextColor, setCurrentTextColor] = useState(
    normalizeHex(defaultColor)
  );
  const [recentColors, setRecentColors] = useState(() =>
    maxRecents > 0 ? TEXT_PALETTE.slice(0, Math.max(0, maxRecents)) : []
  );

  // highlight state
  const [currentHighlight, setCurrentHighlight] = useState(
    normalizeHex(defaultHighlight)
  );

  // actions: text
  const applyTextColor = useCallback(
    (hex) => {
      const color = normalizeHex(hex);
      if (isReady) {
        try {
          editor.chain().focus().setColor(color).run();
        } catch { }
      }
      setCurrentTextColor(color);
      if (maxRecents > 0) {
        setRecentColors((prev) => updateRecent(prev, color, maxRecents));
      }
      if (typeof onChange === "function") onChange(color);
    },
    [editor, isReady, maxRecents, onChange]
  );

  // actions: highlight
  const applyHighlight = useCallback(
    (hex) => {
      const color = normalizeHex(hex);
      if (isReady) {
        try {
          const ch = editor.chain().focus();
          if (editor?.commands?.setHighlight) ch.setHighlight({ color }).run();
          else ch.toggleHighlight({ color }).run();
        } catch { }
      }
      setCurrentHighlight(color);
      if (typeof onHighlightChange === "function") onHighlightChange(color);
    },
    [editor, isReady, onHighlightChange]
  );

  if (!isReady) return null;

  return (
    <div className="mb-4">
      {/* TEXT COLOR */}
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
            onChange={(e) => applyTextColor(e.target.value)}
            className="h-5 w-7 p-0 border-0 bg-transparent cursor-pointer"
            aria-label="Text color picker"
          />
        </label>
      </div>

      <div className="flex flex-wrap mt-2">
        {TEXT_PALETTE.map((c) => (
          <SwatchButton key={`txt-pal-${c}`} color={c} onClick={applyTextColor} />
        ))}
      </div>

      {maxRecents > 0 && recentColors.length > 0 && (
        <>
          <div className="text-xs text-gray-500 mt-3 mb-1">Recent</div>
          <div className="flex flex-wrap">
            {recentColors.map((c) => (
              <SwatchButton key={`txt-rec-${c}`} color={c} onClick={applyTextColor} />
            ))}
          </div>
        </>
      )}

      {/* HIGHLIGHT COLOR */}
      {enableHighlight && (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-gray-800">Highlight</div>
            <label
              className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer"
              title="Pick custom highlight color"
              aria-label="Pick custom highlight color"
            >
              <span>Picker</span>
              <input
                type="color"
                value={currentHighlight}
                onChange={(e) => applyHighlight(e.target.value)}
                className="h-5 w-7 p-0 border-0 bg-transparent cursor-pointer"
                aria-label="Highlight color picker"
              />
            </label>
          </div>


          <div className="flex flex-wrap mt-2">
            {HL_PALETTE.map((c) => (
              <SwatchButton
                key={`hl-pal-${c}`}
                color={c}
                onClick={applyHighlight}
                title={c}
                rounded="md"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}