// src/layout/create_template/fontPanel.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TextColors from "../../components/font_layout/textColors";
import {
  DEFAULT_FONT_CATEGORIES as FONT_CATEGORIES,
  SYSTEM_FALLBACKS,
} from "../../components/font_layout/textFonts";

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
  Chevron: ({ open }) => (
    <svg
      className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.133l3.71-3.9a.75.75 0 111.08 1.04l-4.24 4.46a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" />
    </svg>
  ),
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
  const CATEGORY_NAMES = useMemo(() => Object.keys(FONT_CATEGORIES), []);
  const FIRST_FONT_OF = useMemo(() => {
    const map = {};
    for (const k of CATEGORY_NAMES) map[k] = FONT_CATEGORIES[k]?.[0] || "Arial";
    return map;
  }, [CATEGORY_NAMES]);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(
    CATEGORY_NAMES[0] || "Serif"
  );
  const [recentFonts, setRecentFonts] = useState([
    "Adamina",
    "Gotu",
    "Castoro",
  ]);
  const [activeFamily, setActiveFamily] = useState("Adamina");
  const [typeOpen, setTypeOpen] = useState(false);

  /* --------------------------------- Colors -------------------------------- */
  const [currentTextColor, setCurrentTextColor] = useState("#000000");
  const [currentHighlightColor, setCurrentHighlightColor] =
    useState("#fff59d");

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

  /* ------------------------------ Refs & menus ------------------------------ */
  const inputRef = useRef(null);
  const sizeMenuRef = useRef(null);
  const styleBtnRef = useRef(null);
  const styleMenuRef = useRef(null);
  const typeBtnRef = useRef(null);
  const typeMenuRef = useRef(null);

  /* ------------------------------ Derived lists ----------------------------- */
  const categoryFonts = FONT_CATEGORIES[activeCategory] || [];
  const filteredFonts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categoryFonts;
    return categoryFonts.filter((f) => f.toLowerCase().includes(q));
  }, [categoryFonts, search]);

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
  const [stylePresets] = useState({
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
    if (pt && editor.isActive("italic") && pt >= 18 && pt <= 24)
      return "Subtitle";
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

    try {
      const color = editor.getAttributes("textStyle")?.color || "#000000";
      if (typeof color === "string")
        setCurrentTextColor(color.toLowerCase());
    } catch {}
    try {
      const hl =
        editor.getAttributes("highlight")?.color || currentHighlightColor;
      if (typeof hl === "string")
        setCurrentHighlightColor(hl.toLowerCase());
    } catch {}
  }, [
    editor,
    detectBlockStyle,
    getActiveFontSizePx,
    pxStringToInt,
    currentHighlightColor,
  ]);

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

      if (
        typeMenuRef.current?.contains(e.target) ||
        typeBtnRef.current?.contains(e.target)
      )
        return;
      setTypeOpen(false);
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
      // limit recents to 4
      setRecentFonts((p) => [family, ...p.filter((f) => f !== family)].slice(0, 4));
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

  const clearCharacterFormatting = useCallback(() => {
    safeRun(() =>
      focus()
        .unsetHighlight()
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
      Body: { sample: "AaBbCc", style: { fontSize: `${ptToPx(12)}px` } },
      Title: {
        sample: "Title preview",
        style: { fontSize: `${ptToPx(32)}px`, fontWeight: 700 },
      },
      Subtitle: {
        sample: "Subtitle",
        style: { fontSize: `${ptToPx(20)}px`, fontStyle: "italic" },
      },
      H1: { sample: "Heading 1", style: { fontSize: `${ptToPx(24)}px`, fontWeight: 700 } },
      H2: { sample: "Heading 2", style: { fontSize: `${ptToPx(18)}px`, fontWeight: 700 } },
      H3: { sample: "Heading 3", style: { fontSize: `${ptToPx(14)}px`, fontWeight: 700 } },
    }),
    []
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
      safeRun(() =>
        focus().setMark("textStyle", { lineHeight: String(lh) }).run()
      );
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
      {/* Undo / Redo / Clear */}
      <div className="flex items-center gap-2 mb-3">
        <button
          className="border rounded px-2 py-1"
          onClick={() => editor.commands.undo()}
        >
          Undo
        </button>
        <button
          className="border rounded px-2 py-1"
          onClick={() => editor.commands.redo()}
        >
          Redo
        </button>
        <div className="flex-1" />
        <button
          className="border rounded px-2 py-1"
          onClick={clearCharacterFormatting}
          title="Clear font, color, highlight, underline, strike"
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
        >
          {activeStyle === "Body" ? "Normal text" : activeStyle}
        </button>
        {styleMenuOpen && (
          <div
            ref={styleMenuRef}
            className="absolute z-20 mt-1 w-72 bg-white border rounded-lg shadow-lg overflow-hidden"
          >
            <div className="py-1">
              {Object.entries(stylePreviewMap).map(([name, preview]) => (
                <div
                  key={name}
                  onClick={() => applyStyleFromPreset(name)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
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
          <button className="px-3" onClick={() => step(-1)}>
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
                  >
                    {pt}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="px-3" onClick={() => step(+1)}>
            <Icon.Plus />
          </button>
        </div>
      </div>

      {/* Marks + highlight toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          className={`h-9 w-9 border rounded ${
            toggles.bold ? "bg-gray-200" : ""
          }`}
          onClick={() => toggleMark("bold")}
        >
          <Icon.Bold />
        </button>
        <button
          className={`h-9 w-9 border rounded ${
            toggles.italic ? "bg-gray-200" : ""
          }`}
          onClick={() => toggleMark("italic")}
        >
          <Icon.Italic />
        </button>
        <button
          className={`h-9 w-9 border rounded ${
            toggles.underline ? "bg-gray-200" : ""
          }`}
          onClick={() => toggleMark("underline")}
        >
          <Icon.Underline />
        </button>
        <button
          className={`h-9 w-9 border rounded ${
            toggles.strike ? "bg-gray-200" : ""
          }`}
          onClick={() => toggleMark("strike")}
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
          >
            <Icon.High />
          </button>
        )}
      </div>

      {/* Text + Highlight color (single source of truth) */}
      <TextColors
        editor={editor}
        defaultColor={currentTextColor}
        maxRecents={0}
        onChange={(hex) =>
          setCurrentTextColor(String(hex || "").toLowerCase())
        }
      />

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
                className={`px-2 py-1 border rounded ${
                  align === dir ? "bg-gray-200" : ""
                }`}
                title={`Align ${dir}`}
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

      {/* Type dropdown with visual preview */}
      <div className="mt-3 relative">
        <button
          ref={typeBtnRef}
          type="button"
          onClick={() => setTypeOpen((v) => !v)}
          className="w-full border rounded-lg px-3 py-2 flex items-center justify-between"
          title="Choose font type"
        >
          <span className="flex items-center gap-3">
            <span
              className="text-xl leading-none"
              style={{
                fontFamily:
                  SYSTEM_FALLBACKS[FIRST_FONT_OF[activeCategory]] ||
                  FIRST_FONT_OF[activeCategory],
              }}
            >
              Aa
            </span>
            <span className="text-sm">{activeCategory}</span>
          </span>
          <Icon.Chevron open={typeOpen} />
        </button>

        {typeOpen && (
          <div
            ref={typeMenuRef}
            className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg"
          >
            {CATEGORY_NAMES.map((cat) => (
              <div
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setTypeOpen(false);
                }}
                className={`px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-3 ${
                  activeCategory === cat ? "bg-blue-50" : ""
                }`}
                title={`Category: ${cat}`}
              >
                <span
                  className="text-xl leading-none"
                  style={{
                    fontFamily:
                      SYSTEM_FALLBACKS[FIRST_FONT_OF[cat]] ||
                      FIRST_FONT_OF[cat],
                  }}
                >
                  Aa
                </span>
                <span className="text-sm">{cat}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mt-3 relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Try "Times New Roman"'
          className="w-full border rounded-lg pl-8 pr-3 py-1.5"
          title="Search fonts"
        />
        <svg
          className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      {/* Recent (limited to 4) */}
      {recentFonts.slice(0, 4).length > 0 && (
        <div className="mt-3 border rounded-lg">
          {recentFonts.slice(0, 4).map((f) => (
            <div
              key={f}
              onClick={() => applyFamily(f)}
              className={`flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 cursor-pointer ${
                activeFamily === f ? "bg-blue-50" : ""
              }`}
              style={{ fontFamily: SYSTEM_FALLBACKS[f] || f }}
              title={`Use ${f}`}
            >
              <span
                className={`inline-block w-3 h-3 rounded-full border ${
                  activeFamily === f
                    ? "bg-blue-600 border-blue-600"
                    : "border-gray-400"
                }`}
              />
              <span className="flex-1">{f}</span>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      <div className="mt-3 border rounded-lg">
        {filteredFonts
          .filter((f) => !recentFonts.slice(0, 4).includes(f))
          .map((f) => (
            <div
              key={`list-${f}`}
              onClick={() => applyFamily(f)}
              className="flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 cursor-pointer"
              style={{ fontFamily: SYSTEM_FALLBACKS[f] || f }}
              title={`Use ${f}`}
            >
              <span className="inline-block w-3 h-3 rounded-full border border-gray-400" />
              <span className="flex-1">{f}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
