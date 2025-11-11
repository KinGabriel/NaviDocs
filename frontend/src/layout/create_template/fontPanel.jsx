// src/layout/create_template/fontPanel.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TextColors from "../../components/font_layout/textColors";

/* ------------------------------- Utilities -------------------------------- */
const PRESET_SIZES_PT = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96];
const PT_TO_PX = 96 / 72;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const pxToPt = (px) => Math.round(Number(px) / PT_TO_PX);
const ptToPx = (pt) => Math.round(Number(pt) * PT_TO_PX);

/* ---------------------------- Small UI Helpers ---------------------------- */
const Icon = {
  Bold: () => <span className="font-bold">B</span>,
  Italic: () => <span className="italic">I</span>,
  Underline: () => <span style={{ textDecoration: "underline" }}>U</span>,
  Strike: () => <span style={{ textDecoration: "line-through" }}>S</span>,
  Minus: () => <span>−</span>,
  Plus: () => <span>+</span>,
  High: () => <span>Hi</span>,
};

/* --------------------------------- Panel --------------------------------- */
export default function FontPanel({ editor }) {
  const isReady = !!editor;

  /* ------------------------------ Size control ------------------------------ */
  const [fontSizePt, setFontSizePt] = useState(12);
  const [sizeInput, setSizeInput] = useState("12");
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);

  /* ------------------------------ Style preset ------------------------------ */
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const [activeStyle, setActiveStyle] = useState("Body");

  /* --------------------------------- Fonts --------------------------------- */
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Serif");
  const [recentFonts, setRecentFonts] = useState(["Adamina", "Gotu", "Castoro"]);
  const [activeFamily, setActiveFamily] = useState("Adamina");

  /* --------------------------------- Colors -------------------------------- */
  const [currentTextColor, setCurrentTextColor] = useState("#000000");
  const [currentHighlightColor, setCurrentHighlightColor] = useState("#fff59d");

  /* -------------------------------- Toggles -------------------------------- */
  const [toggles, setToggles] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
  });
  const [align, setAlign] = useState("left");
  const [lineHeight, setLineHeight] = useState(1);

  /* --------------------------- Highlight constants -------------------------- */
  const supportsHighlight = !!editor?.commands?.toggleHighlight;
  const HIGHLIGHT_COLORS = useMemo(
    () => [
      // Yellows / Ambers
      "#fff59d",
      "#ffff00",
      "#fde68a",
      "#fef08a",
      "#ffe082",
      "#ffd27f",
      "#ffb74d",
      // Blues / Cyans
      "#bbdefb",
      "#90caf9",
      "#80deea",
      "#b3e5fc",
      "#a5f3fc",
      // Greens
      "#c8e6c9",
      "#a5d6a7",
      "#86efac",
      "#b9fbc0",
      // Pinks / Reds
      "#ffcdd2",
      "#ffd1dc",
      "#fda4af",
      // Neutrals
      "#e5e7eb",
      "#f3f4f6",
      // Extras
      "#e9d5ff",
      "#fde2e4",
      "#fff1c1",
      "#d1fae5",
      "#cffafe",
    ],
    []
  );

  /* ------------------------------ Refs & menus ------------------------------ */
  const inputRef = useRef(null);
  const sizeMenuRef = useRef(null);
  const styleBtnRef = useRef(null);
  const styleMenuRef = useRef(null);

  /* ------------------------------ Static lists ------------------------------ */
  const FONT_CATEGORIES = useMemo(
    () => ({
      Serif: [
        "Adamina",
        "Gotu",
        "Castoro",
        "Georgia",
        "Times New Roman",
        "Merriweather",
      ],
      Sans: ["Arial", "Inter", "Roboto", "Helvetica", "Verdana", "Open Sans"],
      Mono: ["Courier New", "Consolas", "Fira Code", "Source Code Pro", "Monaco"],
    }),
    []
  );

  const categoryFonts = FONT_CATEGORIES[activeCategory] || [];
  const filteredFonts = useMemo(
    () =>
      search
        ? categoryFonts.filter((f) =>
            f.toLowerCase().includes(search.toLowerCase())
          )
        : categoryFonts,
    [categoryFonts, search]
  );

  /* -------------------------- Selection-based readers ----------------------- */
  const pxStringToInt = useCallback((v) => {
    if (!v) return null;
    const n = parseInt(String(v).replace("px", "").trim(), 10);
    return Number.isFinite(n) ? n : null;
  }, []);

  const readFSFromMarks = useCallback((marks) => {
    return (marks || []).find((m) => m.type?.name === "textStyle")?.attrs
      ?.fontSize;
  }, []);

  const getActiveFontSizePx = useCallback(() => {
    if (!editor) return null;
    const { state } = editor;
    const { from, to, empty } = state.selection;

    if (empty) {
      const stored = readFSFromMarks(state.storedMarks);
      if (stored) return stored;
      const atCursor = readFSFromMarks(state.selection.$from.marks());
      return atCursor || null;
    }

    let first = undefined,
      mixed = false;
    state.doc.nodesBetween(from, to, (node) => {
      if (mixed) return false;
      if (!node.isText) return;
      const size = readFSFromMarks(node.marks) || null;
      if (first === undefined) first = size;
      else if (first !== size) mixed = true;
    });
    return mixed ? "__MIXED__" : first ?? null;
  }, [editor, readFSFromMarks]);

  /* ---------------------------- Preset definitions ------------------------- */
  const [stylePresets, setStylePresets] = useState({
    Body: { type: "paragraph", sizePt: 12, bold: false, italic: false },
    Title: { type: "paragraph", sizePt: 32, bold: true, italic: false },
    Subtitle: { type: "paragraph", sizePt: 20, bold: false, italic: true },
    H1: { type: "heading", level: 1 },
    H2: { type: "heading", level: 2 },
    H3: { type: "heading", level: 3 },
  });

  const detectBlockStyle = useCallback(() => {
    if (!editor) return "Body";
    if (editor.isActive("heading", { level: 1 })) return "H1";
    if (editor.isActive("heading", { level: 2 })) return "H2";
    if (editor.isActive("heading", { level: 3 })) return "H3";
    const px = pxStringToInt(getActiveFontSizePx());
    const pt = typeof px === "number" ? pxToPt(px) : null;
    if (pt && editor.isActive("bold") && pt >= 28) return "Title";
    if (pt && editor.isActive("italic") && pt >= 18 && pt <= 24) return "Subtitle";
    return "Body";
  }, [editor, getActiveFontSizePx, pxStringToInt]);

  const updateUIFromSelection = useCallback(() => {
    if (!editor) return;
    const raw = getActiveFontSizePx();
    if (raw === "__MIXED__") {
      setFontSizePt("Mixed");
      setSizeInput("");
    } else {
      const px = pxStringToInt(raw);
      const pt = typeof px === "number" ? pxToPt(px) : 12;
      setFontSizePt(pt);
      setSizeInput(String(pt));
    }
    setToggles({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
    });
    setAlign(
      editor.isActive({ textAlign: "center" })
        ? "center"
        : editor.isActive({ textAlign: "right" })
        ? "right"
        : editor.isActive({ textAlign: "justify" })
        ? "justify"
        : "left"
    );
    setActiveStyle(detectBlockStyle());

    // read text/highlight color (best-effort)
    try {
      const color = editor.getAttributes("textStyle")?.color || "#000000";
      if (typeof color === "string") setCurrentTextColor(color.toLowerCase());
    } catch {}
    try {
      const hl = editor.getAttributes("highlight")?.color || currentHighlightColor;
      if (typeof hl === "string") setCurrentHighlightColor(hl.toLowerCase());
    } catch {}
  }, [editor, detectBlockStyle, getActiveFontSizePx, pxStringToInt, currentHighlightColor]);

  useEffect(() => {
    if (!editor) return;
    updateUIFromSelection();
    editor.on("selectionUpdate", updateUIFromSelection);
    editor.on("transaction", updateUIFromSelection);
    editor.on("update", updateUIFromSelection);
    return () => {
      editor.off("selectionUpdate", updateUIFromSelection);
      editor.off("transaction", updateUIFromSelection);
      editor.off("update", updateUIFromSelection);
    };
  }, [editor, updateUIFromSelection]);

  /* ---------------------------- Outside click hide -------------------------- */
  useEffect(() => {
    const onDocClick = (e) => {
      if (
        sizeMenuRef.current?.contains(e.target) ||
        inputRef.current?.contains(e.target)
      )
        return;
      setSizeMenuOpen(false);

      if (
        styleMenuRef.current?.contains(e.target) ||
        styleBtnRef.current?.contains(e.target)
      )
        return;
      setStyleMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  /* ------------------------------- Command safes ---------------------------- */
  const focus = useCallback(() => editor?.chain().focus(), [editor]);
  const safeRun = useCallback(
    (fn) => {
      try {
        if (isReady) fn();
      } catch {}
    },
    [isReady]
  );

  /* --------------------------------- Actions -------------------------------- */
  const applySizePt = useCallback(
    (pt) => {
      if (!Number.isFinite(pt)) return;
      const clamped = clamp(pt | 0, 6, 96);
      const px = ptToPx(clamped);
      safeRun(() => focus().setMark("textStyle", { fontSize: `${px}px` }).run());
      setFontSizePt(clamped);
      setSizeInput(String(clamped));
      setSizeMenuOpen(false);
    },
    [focus, safeRun]
  );

  const step = useCallback(
    (delta) => {
      const base = typeof fontSizePt === "number" ? fontSizePt : 12;
      applySizePt(base + delta);
    },
    [fontSizePt, applySizePt]
  );

  const applyFamily = useCallback(
    (family) => {
      setActiveFamily(family);
      safeRun(() => focus().setFontFamily(family).run());
      setRecentFonts((p) => [family, ...p.filter((f) => f !== family)].slice(0, 8));
    },
    [focus, safeRun]
  );

  const toggleMark = useCallback(
    (mark) => {
      safeRun(() => {
        const ch = focus();
        if (mark === "bold") ch.toggleBold().run();
        else if (mark === "italic") ch.toggleItalic().run();
        else if (mark === "underline") ch.toggleUnderline().run();
        else if (mark === "strike") ch.toggleStrike().run();
        setToggles((prev) => ({ ...prev, [mark]: editor.isActive(mark) }));
      });
    },
    [editor, focus, safeRun]
  );

  // ONE CLEAR BUTTON (top) — now also clears highlights
  const clearCharacterFormatting = useCallback(() => {
    safeRun(() =>
      focus()
        .unsetHighlight() // ← added so top "Clear" also removes highlight
        .unsetColor()
        .setMark("textStyle", { fontSize: null, lineHeight: null })
        .setFontFamily(null)
        .unsetUnderline()
        .unsetStrike()
        .run()
    );
    updateUIFromSelection();
  }, [focus, safeRun, updateUIFromSelection]);

  const applyStyleFromPreset = useCallback(
    (name) => {
      const preset = stylePresets[name];
      if (!preset) return;
      const ch = focus();
      if (preset.type === "heading") ch.setHeading({ level: preset.level || 1 }).run();
      else {
        ch.setParagraph().run();
        if (preset.sizePt)
          ch.setMark("textStyle", { fontSize: `${ptToPx(preset.sizePt)}px` });
        if (preset.bold) ch.setBold();
        else ch.unsetBold?.();
        if (preset.italic) ch.setItalic();
        else ch.unsetItalic?.();
        ch.run();
      }
      setActiveStyle(name);
      setStyleMenuOpen(false);
    },
    [focus, stylePresets]
  );

  const stylePreviewMap = useMemo(
    () => ({
      Body: {
        sample: "AaBbCc",
        style: {
          fontSize: `${ptToPx(stylePresets.Body.sizePt)}px`,
          fontWeight: stylePresets.Body.bold ? 700 : 400,
          fontStyle: stylePresets.Body.italic ? "italic" : "normal",
        },
      },
      Title: {
        sample: "Title preview",
        style: {
          fontSize: `${ptToPx(stylePresets.Title.sizePt)}px`,
          fontWeight: stylePresets.Title.bold ? 700 : 400,
        },
      },
      Subtitle: {
        sample: "Subtitle preview",
        style: {
          fontSize: `${ptToPx(stylePresets.Subtitle.sizePt)}px`,
          fontStyle: "italic",
        },
      },
      H1: { sample: "Heading 1", style: { fontSize: `${ptToPx(24)}px`, fontWeight: 700 } },
      H2: { sample: "Heading 2", style: { fontSize: `${ptToPx(18)}px`, fontWeight: 700 } },
      H3: { sample: "Heading 3", style: { fontSize: `${ptToPx(14)}px`, fontWeight: 700 } },
    }),
    [stylePresets]
  );

  const applyAlign = useCallback(
    (dir) => {
      setAlign(dir);
      focus().setTextAlign?.(dir).run?.();
    },
    [focus]
  );

  const applyLineHeight = useCallback(
    (lh) => {
      setLineHeight(lh);
      safeRun(() => focus().setMark("textStyle", { lineHeight: String(lh) }).run());
    },
    [focus, safeRun]
  );

  /* ----------------------------- Highlight actions -------------------------- */
  const commitHighlight = useCallback(
    (hex) => {
      const c = String(hex || "").toLowerCase();
      const ch = focus();
      if (editor?.commands?.setHighlight) ch.setHighlight({ color: c }).run();
      else ch.toggleHighlight({ color: c }).run();
      setCurrentHighlightColor(c);
    },
    [editor, focus]
  );

  /* --------------------------------- Render --------------------------------- */
  if (!isReady) return null;

  return (
    <div className="w-80 bg-white border rounded-lg p-3 text-sm">
      {/* Undo / Redo / Clear (character) */}
      <div className="flex items-center gap-2 mb-3">
        <button
          className="border rounded px-2 py-1"
          onClick={() => editor.commands.undo()}
          title="Undo"
          aria-label="Undo"
        >
          Undo
        </button>
        <button
          className="border rounded px-2 py-1"
          onClick={() => editor.commands.redo()}
          title="Redo"
          aria-label="Redo"
        >
          Redo
        </button>
        <div className="flex-1" />
        <button
          className="border rounded px-2 py-1"
          onClick={clearCharacterFormatting}
          title="Clear all formatting (font, color, highlight, underline, strike)"
          aria-label="Clear all formatting"
        >
          Clear
        </button>
      </div>

      {/* Style */}
      <div className="mb-3 relative">
        <label className="block text-xs text-gray-600 mb-1">Style</label>
        <button
          ref={styleBtnRef}
          type="button"
          onClick={() => setStyleMenuOpen((v) => !v)}
          className="w-full border rounded px-3 py-2 text-left"
          title="Choose a paragraph style"
          aria-label="Choose a paragraph style"
        >
          {activeStyle === "Body" ? "Normal text" : activeStyle}
        </button>

        {styleMenuOpen && (
          <div
            ref={styleMenuRef}
            className="absolute z-20 mt-1 w-72 bg-white border rounded-lg shadow-lg overflow-hidden"
          >
            <div className="py-1">
              <div className="px-3 py-2 text-gray-700 font-medium">
                Normal text
              </div>
              {Object.entries(stylePreviewMap).map(([name, preview]) => (
                <div
                  key={name}
                  onClick={() => applyStyleFromPreset(name)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  title={`Apply ${name}`}
                  aria-label={`Apply ${name}`}
                >
                  <div className="text-gray-900">{name}</div>
                  <div className="text-xs text-gray-500" style={preview.style}>
                    {preview.sample}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Size */}
      <div className="mb-3">
        <label className="block text-xs text-gray-600 mb-1">Size</label>
        <div className="flex items-stretch border rounded">
          <button
            className="px-3"
            onClick={() => step(-1)}
            title="Decrease font size"
            aria-label="Decrease font size"
          >
            <Icon.Minus />
          </button>
          <div className="relative border-l border-r">
            <input
              ref={inputRef}
              className="px-2 py-1.5 w-[56px] text-center outline-none"
              value={sizeInput}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d]/g, "");
                setSizeInput(v);
                const n = parseInt(v, 10);
                if (Number.isFinite(n)) applySizePt(n);
              }}
              onFocus={() => setSizeMenuOpen(true)}
              onClick={() => setSizeMenuOpen(true)}
              title="Type or pick a size (pt)"
              aria-label="Font size input"
            />
            {sizeMenuOpen && (
              <div
                ref={sizeMenuRef}
                className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-[70px] max-h-72 overflow-auto border bg-white rounded shadow z-10"
              >
                {PRESET_SIZES_PT.map((pt) => (
                  <button
                    key={pt}
                    onClick={() => applySizePt(pt)}
                    className="w-full text-left px-2 py-1 hover:bg-gray-50"
                    title={`${pt} pt`}
                    aria-label={`Set font size to ${pt} pt`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="px-3"
            onClick={() => step(+1)}
            title="Increase font size"
            aria-label="Increase font size"
          >
            <Icon.Plus />
          </button>
        </div>
      </div>

      {/* Text style marks + highlight toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          className={`h-9 w-9 border rounded ${toggles.bold ? "bg-gray-200" : ""}`}
          onClick={() => toggleMark("bold")}
          title="Bold"
          aria-label="Bold"
        >
          <Icon.Bold />
        </button>
        <button
          className={`h-9 w-9 border rounded ${toggles.italic ? "bg-gray-200" : ""}`}
          onClick={() => toggleMark("italic")}
          title="Italic"
          aria-label="Italic"
        >
          <Icon.Italic />
        </button>
        <button
          className={`h-9 w-9 border rounded ${toggles.underline ? "bg-gray-200" : ""}`}
          onClick={() => toggleMark("underline")}
          title="Underline"
          aria-label="Underline"
        >
          <Icon.Underline />
        </button>
        <button
          className={`h-9 w-9 border rounded ${toggles.strike ? "bg-gray-200" : ""}`}
          onClick={() => toggleMark("strike")}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <Icon.Strike />
        </button>

        {supportsHighlight && (
          <button
            className={`h-9 px-2 border rounded ${
              editor.isActive("highlight") ? "bg-yellow-200" : ""
            }`}
            onClick={() => focus().toggleHighlight().run()}
            title="Toggle highlight"
            aria-label="Toggle highlight"
          >
            <Icon.High />
          </button>
        )}
      </div>

      {/* Text color (reusable component) — recents disabled */}
      <TextColors
        editor={editor}
        defaultColor={currentTextColor}
        maxRecents={0}              // ← disables "Recent" section
        onChange={(hex) => setCurrentTextColor(String(hex || "").toLowerCase())}
      />

      {/* Highlight with color picker + NO local Clear + NO Recent */}
      {supportsHighlight && (
        <div className="mb-4">
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
                value={currentHighlightColor}
                onChange={(e) => commitHighlight(e.target.value)}
                className="h-5 w-7 p-0 border-0 bg-transparent cursor-pointer"
              />
            </label>
          </div>

          {/* Palette only (no Recent, no Clear here) */}
          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-1">Palette</div>
            <div className="flex flex-wrap">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={`hl-${c}`}
                  onClick={() => commitHighlight(c)}
                  className="h-6 w-6 rounded border mr-2 mt-2"
                  style={{ background: c }}
                  title={c}
                  aria-label={`Highlight ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Paragraph */}
      <details className="mb-4">
        <summary className="cursor-pointer font-semibold">Paragraph</summary>
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-600 w-16">Align</span>
            {["left", "center", "right", "justify"].map((dir) => (
              <button
                key={dir}
                onClick={() => applyAlign(dir)}
                className={`px-2 py-1 border rounded ${align === dir ? "bg-gray-200" : ""}`}
                title={`Align ${dir}`}
                aria-label={`Align ${dir}`}
              >
                {dir[0].toUpperCase() + dir.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-600 w-16">Line height</span>
            <select
              className="border rounded px-2 py-1"
              value={lineHeight}
              onChange={(e) => applyLineHeight(parseFloat(e.target.value))}
              title="Line height"
              aria-label="Line height"
            >
              <option value="1">Single</option>
              <option value="1.15">1.15</option>
              <option value="1.5">1.5</option>
              <option value="2">Double</option>
            </select>
          </div>
        </div>
      </details>

      {/* Fonts */}
      <div className="font-semibold text-gray-800">Fonts</div>
      <div className="flex gap-3 mt-3">
        {["Serif", "Sans", "Mono"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`w-20 h-20 border rounded-lg flex flex-col items-center justify-center ${
              activeCategory === cat ? "ring-2 ring-blue-500" : ""
            }`}
            title={`Category: ${cat}`}
            aria-label={`Font category ${cat}`}
          >
            <div className="text-2xl">Aa</div>
            <div className="text-xs">{cat}</div>
          </button>
        ))}
      </div>
      <div className="mt-3 relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Try "Times New Roman"'
          className="w-full border rounded-lg pl-8 pr-3 py-1.5"
          title="Search fonts"
          aria-label="Search fonts"
        />
        <svg
          className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <div className="mt-3 border rounded-lg">
        {recentFonts.map((f) => (
          <div
            key={f}
            onClick={() => applyFamily(f)}
            className={`flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 cursor-pointer ${
              activeFamily === f ? "bg-blue-50" : ""
            }`}
            style={{ fontFamily: f }}
            title={`Use ${f}`}
            aria-label={`Use font ${f}`}
          >
            <span
              className={`inline-block w-3 h-3 rounded-full border ${
                activeFamily === f ? "bg-blue-600 border-blue-600" : "border-gray-400"
              }`}
            />
            <span className="flex-1">{f}</span>
          </div>
        ))}

        {filteredFonts
          .filter((f) => !recentFonts.includes(f))
          .map((f) => (
            <div
              key={`list-${f}`}
              onClick={() => applyFamily(f)}
              className="flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 cursor-pointer"
              style={{ fontFamily: f }}
              title={`Use ${f}`}
              aria-label={`Use font ${f}`}
            >
              <span className="inline-block w-3 h-3 rounded-full border border-gray-400" />
              <span className="flex-1">{f}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
