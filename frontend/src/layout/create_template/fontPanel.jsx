// src/layout/create_template/fontPanel.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const PRESET_SIZES_PT = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96];
const PT_TO_PX = 96 / 72;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const pxToPt = (px) => Math.round(Number(px) / PT_TO_PX);
const ptToPx = (pt) => Math.round(Number(pt) * PT_TO_PX);

export default function FontPanel({ editor }) {
  const isReady = !!editor;

  // size control (points only)
  const [fontSizePt, setFontSizePt] = useState(12);     
  const [sizeInput, setSizeInput] = useState("12");
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);

  // other UI state
  const [blockStyle, setBlockStyle] = useState("Body");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Serif");
  const [recentFonts, setRecentFonts] = useState(["Adamina", "Gotu", "Castoro"]);
  const [pinnedFonts, setPinnedFonts] = useState([]);
  const [activeFamily, setActiveFamily] = useState("Adamina");
  const [recentColors, setRecentColors] = useState(["#000000", "#333333", "#ff0000", "#00ccff", "#ffff00", "#00cc00"]);
  const [toggles, setToggles] = useState({ bold:false, italic:false, underline:false, strike:false });
  const [align, setAlign] = useState("left");
  const [lineHeight, setLineHeight] = useState(1); // 1, 1.15, 1.5, 2

  const inputRef = useRef(null);
  const menuRef = useRef(null);

  const supportsHighlight = !!editor?.commands?.toggleHighlight;

  const COLORS = useMemo(() => [
    "#000000","#333333","#666666","#808080","#999999",
    "#b3b3b3","#cccccc","#e6e6e6","#f2f2f2","#ffffff",
    "#990000","#ff0000","#ff9900","#ffff00","#00cc00",
    "#00ccff","#0000ff","#3333ff","#6600cc","#ff00ff",
  ], []);

  const FONT_CATEGORIES = useMemo(() => ({
    Serif: ["Adamina","Gotu","Castoro","Georgia","Times New Roman","Merriweather"],
    Sans:  ["Arial","Inter","Roboto","Helvetica","Verdana","Open Sans"],
    Mono:  ["Courier New","Consolas","Fira Code","Source Code Pro","Monaco"],
  }), []);

  const categoryFonts = FONT_CATEGORIES[activeCategory] || [];
  const filteredFonts = search
    ? categoryFonts.filter(f => f.toLowerCase().includes(search.toLowerCase()))
    : categoryFonts;

  // --- read active size from editor (returns px string or "__MIXED__")
  const pxStringToInt = (v) => {
    if (!v) return null;
    const n = parseInt(String(v).replace("px","").trim(), 10);
    return Number.isFinite(n) ? n : null;
  };
  const readFSFromMarks = (marks) => (marks || []).find(m => m.type?.name === "textStyle")?.attrs?.fontSize || null;

  const getActiveFontSizePx = () => {
    if (!editor) return null;
    const { state } = editor;
    const { from, to, empty } = state.selection;
    if (empty) {
      const stored = readFSFromMarks(state.storedMarks);
      if (stored) return stored;
      const atCursor = readFSFromMarks(state.selection.$from.marks());
      return atCursor || null;
    }
    let first = undefined, mixed = false;
    state.doc.nodesBetween(from, to, (node) => {
      if (mixed) return false;
      if (!node.isText) return;
      const size = readFSFromMarks(node.marks) || null;
      if (first === undefined) first = size;
      else if (first !== size) mixed = true;
      return undefined;
    });
    return mixed ? "__MIXED__" : (first ?? null);
  };

  const detectBlockStyle = () => {
    if (!editor) return "Body";
    if (editor.isActive("heading", { level: 1 })) return "H1";
    if (editor.isActive("heading", { level: 2 })) return "H2";
    if (editor.isActive("heading", { level: 3 })) return "H3";
    if (editor.isActive("blockquote")) return "Quote";
    if (editor.isActive("codeBlock")) return "Code";
    const px = pxStringToInt(getActiveFontSizePx());
    const pt = typeof px === "number" ? pxToPt(px) : null;
    if (pt && editor.isActive("bold") && pt >= 28) return "Title";
    if (pt && editor.isActive("italic") && pt >= 18 && pt <= 24) return "Subtitle";
    return "Body";
  };

  const updateUIFromSelection = () => {
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
    // toggles & paragraph
    setToggles({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
    });
    setAlign(
      editor.isActive({ textAlign: "center" }) ? "center" :
      editor.isActive({ textAlign: "right" })  ? "right"  :
      editor.isActive({ textAlign: "justify"}) ? "justify": "left"
    );
  };

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
  }, [editor]);

  // close size menu on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (
        menuRef.current?.contains(e.target) ||
        inputRef.current?.contains(e.target)
      ) return;
      setSizeMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const focus = () => editor?.chain().focus();
  const safeRun = (fn) => { try { if (isReady) fn(); } catch {} };

  // --- size commands (pt UI → px engine)
  const applySizePt = (pt) => {
    if (!Number.isFinite(pt)) return;
    const clamped = clamp(pt | 0, 6, 96);
    const px = ptToPx(clamped);
    safeRun(() => focus().setMark("textStyle", { fontSize: `${px}px` }).run());
    setFontSizePt(clamped);
    setSizeInput(String(clamped));
    setSizeMenuOpen(false);
  };
  const step = (delta) => {
    const base = typeof fontSizePt === "number" ? fontSizePt : 12;
    applySizePt(base + delta);
  };

  const onSizeInputChange = (e) => {
    const v = e.target.value.replace(/[^\d]/g, "");
    setSizeInput(v);
    const n = parseInt(v, 10);
    if (Number.isFinite(n)) applySizePt(n);
  };

  const applyColor = (hex) => {
    safeRun(() => focus().setColor(hex).run());
    setRecentColors((p) => [hex, ...p.filter(c => c !== hex)].slice(0, 6));
  };
  const applyHighlight = (hex) => {
    if (!supportsHighlight) return;
    const ch = focus();
    if (editor.commands.setHighlight) ch.setHighlight({ color: hex }).run();
    else ch.toggleHighlight().run();
    setRecentColors((p) => [hex, ...p.filter(c => c !== hex)].slice(0, 6));
  };
  const applyFamily = (family) => {
    setActiveFamily(family);
    safeRun(() => focus().setFontFamily(family).run());
    setRecentFonts((p) => [family, ...p.filter(f => f !== family)].slice(0, 8));
  };
  const toggleMark = (mark) => {
    safeRun(() => {
      const ch = focus();
      if (mark === "bold") ch.toggleBold().run();
      else if (mark === "italic") ch.toggleItalic().run();
      else if (mark === "underline") ch.toggleUnderline().run();
      else if (mark === "strike") ch.toggleStrike().run();
      setToggles((prev) => ({ ...prev, [mark]: editor.isActive(mark) }));
    });
  };
  const clearCharacterFormatting = () => {
    safeRun(() =>
      focus()
        .unsetColor()
        .setMark("textStyle", { fontSize: null })
        .setFontFamily(null)
        .unsetUnderline()
        .unsetStrike()
        .run()
    );
    updateUIFromSelection();
  };

  const applyBlockStyle = (style) => {
    setBlockStyle(style);
    const ch = focus();
    const setBody = () => ch.setParagraph();
    switch (style) {
      case "Body": setBody().setMark("textStyle", { fontSize: null }).run(); break;
      case "H1": ch.setHeading({ level: 1 }).run(); break;
      case "H2": ch.setHeading({ level: 2 }).run(); break;
      case "H3": ch.setHeading({ level: 3 }).run(); break;
      case "Title": setBody().setMark("textStyle", { fontSize: `${ptToPx(32)}px` }).setBold().run(); break;
      case "Subtitle": setBody().setMark("textStyle", { fontSize: `${ptToPx(20)}px` }).setItalic().run(); break;
      case "Quote": ch.setBlockquote().run(); break;
      case "Code": ch.setCodeBlock().run(); break;
      default: setBody().run();
    }
    updateUIFromSelection();
  };

  const applyAlign = (dir) => { setAlign(dir); focus().setTextAlign?.(dir).run?.(); };
  const applyLineHeight = (lh) => {
    setLineHeight(lh);
    safeRun(() => focus().setMark("textStyle", { lineHeight: String(lh) }).run());
  };
  const undo = () => safeRun(() => editor.commands.undo());
  const redo = () => safeRun(() => editor.commands.redo());

  if (!isReady) return null;

  const Pinned = ({ f }) => (
    <button
      key={`pin-${f}`}
      onClick={() => applyFamily(f)}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 ${activeFamily === f ? "bg-blue-50" : ""}`}
      style={{ fontFamily: f }}
      title={`Pinned: ${f}`}
    >
      <span className="inline-block w-3 h-3 rounded-full border bg-blue-600 border-blue-600" />
      <span className="flex-1">{f}</span>
      <button
        type="button"
        className="text-xs px-2 py-0.5 border rounded"
        onClick={(e) => { e.stopPropagation(); setPinnedFonts(pinnedFonts.filter(x => x !== f)); }}
      >Unpin</button>
    </button>
  );

  return (
    <div className="w-80 bg-white border rounded-lg p-3 text-sm">
      {/* Row: Undo/Redo, Clear, Lock */}
      <div className="flex items-center gap-2 mb-3">
        <button className="border rounded px-2 py-1" onClick={undo} title="Undo (Ctrl+Z)">Undo</button>
        <button className="border rounded px-2 py-1" onClick={redo} title="Redo (Ctrl+Y)">Redo</button>
        <div className="flex-1" />
        <button className="border rounded px-2 py-1" onClick={clearCharacterFormatting} title="Clear character formatting">Clear</button>
        {!editor.isEditable && <span className="ml-2 text-xs text-gray-500" title="Template fields locked">🔒</span>}
      </div>

      {/* Style selector */}
      <div className="mb-3">
        <label className="block text-xs text-gray-600 mb-1">Style</label>
        <select
          className="border rounded px-2 py-1 w-full"
          value={blockStyle}
          onChange={(e) => applyBlockStyle(e.target.value)}
          title="Paragraph style"
        >
          <option>Body</option><option>H1</option><option>H2</option><option>H3</option>
          <option>Title</option><option>Subtitle</option><option>Quote</option><option>Code</option>
        </select>
      </div>

      {/* SIZE CONTROL */}
      <div className="mb-3">
        <label className="block text-xs text-gray-600 mb-1">Size</label>
        <div className="flex items-stretch border rounded">
          {/* − button */}
          <button
            className="px-3 select-none"
            onClick={() => step(-1)}
            title="Decrease size"
            type="button"
          >
            −
          </button>

          {/* number field + compact dropdown (no extra caret button) */}
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
              inputMode="numeric"
              aria-haspopup="listbox"
              aria-expanded={sizeMenuOpen}
              onFocus={() => setSizeMenuOpen(true)}
              onClick={() => setSizeMenuOpen(true)}
            />

            {sizeMenuOpen && (
              <div
                ref={menuRef}
                role="listbox"
                className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-[70px] max-h-72 overflow-auto border bg-white rounded shadow z-10"
              >
                {PRESET_SIZES_PT.map((pt) => (
                  <button
                    key={pt}
                    role="option"
                    type="button"
                    onClick={() => applySizePt(pt)}
                    className={`w-full text-left px-2 py-1 hover:bg-gray-50 ${
                      fontSizePt === pt ? "bg-gray-100" : ""
                    }`}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* + button */}
          <button
            className="px-3 select-none"
            onClick={() => step(+1)}
            title="Increase size"
            type="button"
          >
            +
          </button>
        </div>
      </div>

      {/* Character toggles */}
      <div className="flex items-center gap-2 mb-3">
        <button className={`h-9 w-9 border rounded font-bold ${toggles.bold ? "bg-gray-200" : ""}`} aria-pressed={toggles.bold} onClick={() => toggleMark("bold")} title="Bold (Ctrl+B)">B</button>
        <button className={`h-9 w-9 border rounded italic ${toggles.italic ? "bg-gray-200" : ""}`} aria-pressed={toggles.italic} onClick={() => toggleMark("italic")} title="Italic (Ctrl+I)">I</button>
        <button className={`h-9 w-9 border rounded underline ${toggles.underline ? "bg-gray-200" : ""}`} aria-pressed={toggles.underline} onClick={() => toggleMark("underline")} title="Underline (Ctrl+U)">U</button>
        <button className={`h-9 w-9 border rounded line-through ${toggles.strike ? "bg-gray-200" : ""}`} aria-pressed={toggles.strike} onClick={() => toggleMark("strike")} title="Strikethrough">S</button>
      </div>

      {/* Colors */}
      <div className="mb-4">
        <div className="font-semibold text-gray-800">Text color</div>
        <div className="flex flex-wrap mt-2">
          {COLORS.map((c) => (
            <button key={c} onClick={() => applyColor(c)} className="h-6 w-6 rounded-full border mr-2 mt-2" style={{ background: c }} title={c} />
          ))}
        </div>
        {supportsHighlight && (
          <>
            <div className="font-semibold text-gray-800 mt-3">Highlight</div>
            <div className="flex flex-wrap mt-2">
              {COLORS.map((c) => (
                <button key={`h-${c}`} onClick={() => applyHighlight(c)} className="h-6 w-6 rounded border mr-2 mt-2" style={{ background: c }} title={`HL ${c}`} />
              ))}
            </div>
          </>
        )}
        <div className="text-xs text-gray-500 mt-2">Recent</div>
        <div className="flex flex-wrap mt-1">
          {recentColors.map((c) => (
            <button key={`r-${c}`} onClick={() => applyColor(c)} className="h-5 w-5 rounded border mr-2 mt-2" style={{ background: c }} title={`Recent ${c}`} />
          ))}
        </div>
      </div>

      {/* Paragraph (Align + Line height select) */}
      <details className="mb-4">
        <summary className="cursor-pointer font-semibold">Paragraph</summary>
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-600 w-16">Align</span>
            {["left","center","right","justify"].map(dir => (
              <button
                key={dir}
                className={`px-2 py-1 border rounded ${align === dir ? "bg-gray-200" : ""}`}
                onClick={() => applyAlign(dir)}
                title={`Align ${dir}`}
              >{dir[0].toUpperCase()+dir.slice(1)}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-600 w-16">Line height</span>
            <select
              className="border rounded px-2 py-1"
              value={String(lineHeight)}
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
      {pinnedFonts.length > 0 && (
        <>
          <div className="mt-2 text-xs text-gray-500">Pinned</div>
          <div className="border rounded-lg">
            {pinnedFonts.map((f) => (
              <Pinned key={`p-${f}`} f={f} />
            ))}
          </div>
        </>
      )}
      <div className="flex gap-3 mt-3">
        {["Serif","Sans","Mono"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`w-20 h-20 border rounded-lg flex flex-col items-center justify-center ${activeCategory === cat ? "ring-2 ring-blue-500" : ""}`}
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
        />
        <svg className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </div>
      <div className="mt-3">
        <div className="text-xs text-gray-500 mb-2">Recently used</div>
        <div className="border rounded-lg">
          {recentFonts.map((f) => (
            <button
              key={`r-${f}`}
              onClick={() => applyFamily(f)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 ${activeFamily === f ? "bg-blue-50" : ""}`}
              style={{ fontFamily: f }}
              title={f}
            >
              <span className={`inline-block w-3 h-3 rounded-full border ${activeFamily === f ? "bg-blue-600 border-blue-600" : "border-gray-400"}`} />
              <span className="flex-1">{f}</span>
              <button
                type="button"
                className="text-xs px-2 py-0.5 border rounded"
                onClick={(e) => { e.stopPropagation(); setPinnedFonts((p)=> p.includes(f)? p : [...p, f]); }}
                title="Pin font"
              >Pin</button>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
