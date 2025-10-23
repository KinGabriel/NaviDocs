// src/layout/create_template/fontPanel.jsx
import React, { useEffect, useMemo, useState } from "react";

export default function FontPanel({ editor }) {
  const [fontSize, setFontSize] = useState(16);         // number | "Mixed"
  const [blockStyle, setBlockStyle] = useState("Body"); // "Body" | "H1" | "H2" | "H3" | "Title" | "Subtitle" | "Quote" | "Code"
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Serif");
  const [recent, setRecent] = useState(["Adamina", "Gotu", "Castoro"]);
  const [activeFamily, setActiveFamily] = useState("Adamina");
  const [toggles, setToggles] = useState({ bold: false, italic: false, underline: false, strike: false });

  const isReady = !!editor;

  // ---------- palettes & font lists ----------
  const COLORS = useMemo(
    () => [
      "#000000","#333333","#666666","#808080","#999999",
      "#b3b3b3","#cccccc","#e6e6e6","#f2f2f2","#ffffff",
      "#990000","#ff0000","#ff9900","#ffff00","#00cc00",
      "#00ccff","#0000ff","#3333ff","#6600cc","#ff00ff",
    ],
    []
  );

  const FONT_CATEGORIES = useMemo(
    () => ({
      Serif: ["Adamina","Gotu","Castoro","Georgia","Times New Roman","Merriweather"],
      Sans:  ["Arial","Inter","Roboto","Helvetica","Verdana","Open Sans"],
      Mono:  ["Courier New","Consolas","Fira Code","Source Code Pro","Monaco"],
    }),
    []
  );

  const allFonts = useMemo(() => {
    const c = FONT_CATEGORIES[activeCategory] || [];
    if (!search) return c;
    return c.filter((f) => f.toLowerCase().includes(search.toLowerCase()));
  }, [FONT_CATEGORIES, activeCategory, search]);

  const focus = () => editor?.chain().focus();
  const safeRun = (fn) => { try { if (isReady) fn(); } catch {} };

  // ---------- helpers: read current char size ----------
  const pxToInt = (v) => {
    if (!v) return null;
    const n = parseInt(String(v).replace("px","").trim(), 10);
    return Number.isFinite(n) ? n : null;
  };
  const readFontSizeFromMarks = (marks) => {
    const m = (marks || []).find((mk) => mk.type?.name === "textStyle");
    return m?.attrs?.fontSize || null; // "16px"
  };
  const getActiveFontSize = () => {
    const { state } = editor;
    const { from, to, empty } = state.selection;

    if (empty) {
      const viaStored = readFontSizeFromMarks(state.storedMarks);
      if (viaStored) return viaStored;
      const atCursor = readFontSizeFromMarks(state.selection.$from.marks());
      if (atCursor) return atCursor;
      return null;
    }

    let first = undefined;
    let mixed = false;
    state.doc.nodesBetween(from, to, (node) => {
      if (mixed) return false;
      if (!node.isText) return;
      const size = readFontSizeFromMarks(node.marks) || null;
      if (first === undefined) first = size;
      else if (first !== size) mixed = true;
      return mixed ? false : undefined;
    });
    if (mixed) return "__MIXED__";
    return first ?? null;
  };

  // ---------- helpers: read current block style ----------
  const detectBlockStyle = () => {
    if (!editor) return "Body";
    if (editor.isActive("heading", { level: 1 })) return "H1";
    if (editor.isActive("heading", { level: 2 })) return "H2";
    if (editor.isActive("heading", { level: 3 })) return "H3";
    if (editor.isActive("blockquote")) return "Quote";
    if (editor.isActive("codeBlock")) return "Code";
    // If user previously applied Title/Subtitle (paragraph + char styles), we infer by size/bold/italic heuristics:
    const size = getActiveFontSize();
    const bold = editor.isActive("bold");
    const italic = editor.isActive("italic");
    const n = pxToInt(size);
    if (n && bold && n >= 28) return "Title";
    if (n && italic && n >= 18 && n <= 24) return "Subtitle";
    return "Body";
  };

  // ---------- sync UI from selection ----------
  const updateUIFromSelection = () => {
    if (!editor) return;
    const raw = getActiveFontSize();
    if (raw === "__MIXED__") setFontSize("Mixed");
    else setFontSize(pxToInt(raw) ?? 16);

    setBlockStyle(detectBlockStyle());

    setToggles({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
    });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // ---------- commands ----------
  const setSize = (n) => {
    const base = Number.isFinite(n) ? n : 16;
    const clamped = Math.max(8, Math.min(96, base | 0));
    safeRun(() => focus().setMark("textStyle", { fontSize: `${clamped}px` }).run());
    setFontSize(clamped);
  };
  const dec = () => setSize((typeof fontSize === "number" ? fontSize : 16) - 1);
  const inc = () => setSize((typeof fontSize === "number" ? fontSize : 16) + 1);

  const clearCharacterFormatting = () => {
    safeRun(() =>
      focus()
        .unsetColor()
        .setMark("textStyle", { fontSize: null }) // clears size (requires your FontSize extension)
        .setFontFamily(null)
        .unsetUnderline()
        .unsetStrike()
        .run()
    );
    // Bold/Italic are often considered "character" too; include if you want a hard reset:
    // safeRun(() => focus().unsetBold().unsetItalic().run());
    updateUIFromSelection();
  };

  const applyColor = (hex) => safeRun(() => focus().setColor(hex).run());
  const applyFamily = (family) => {
    setActiveFamily(family);
    safeRun(() => focus().setFontFamily(family).run());
    setRecent((prev) => [family, ...prev.filter((f) => f !== family)].slice(0, 5));
  };

  const toggleMark = (mark) => {
    safeRun(() => {
      switch (mark) {
        case "bold":      focus().toggleBold().run(); break;
        case "italic":    focus().toggleItalic().run(); break;
        case "underline": focus().toggleUnderline().run(); break;
        case "strike":    focus().toggleStrike().run(); break;
        default: break;
      }
      setToggles((prev) => ({ ...prev, [mark]: editor.isActive(mark) }));
    });
  };

  // ---------- block style apply ----------
  const applyBlockStyle = (style) => {
    if (!editor) return;
    setBlockStyle(style);

    const chain = focus();

    // Normalize to paragraph first for Title/Subtitle/Body
    const setBody = () => chain.setParagraph();

    switch (style) {
      case "Body":
        setBody()
          .setMark("textStyle", { fontSize: null })
          .run();
        break;

      case "H1":
        chain.setHeading({ level: 1 }).run();
        break;

      case "H2":
        chain.setHeading({ level: 2 }).run();
        break;

      case "H3":
        chain.setHeading({ level: 3 }).run();
        break;

      case "Title":
        setBody()
          .setMark("textStyle", { fontSize: "32px" })
          .setBold()
          .run();
        break;

      case "Subtitle":
        setBody()
          .setMark("textStyle", { fontSize: "20px" })
          .setItalic()
          .run();
        break;

      case "Quote":
        chain.setBlockquote().run();
        break;

      case "Code":
        chain.setCodeBlock().run();
        break;

      default:
        setBody().run();
    }

    // Re-sync UI after applying
    updateUIFromSelection();
  };

  if (!isReady) return null;
  const sizeDisplay = typeof fontSize === "string" ? fontSize : String(fontSize);

  return (
    <div className="w-72 bg-white border rounded-lg p-3 text-sm">
      {/* Style selector (Body / H1 / H2 / H3 / Title / Subtitle / Quote / Code) */}
      <div className="mb-3">
        <label className="block text-xs text-gray-600 mb-1">Style</label>
        <div className="flex gap-2">
          <select
            className="border rounded px-2 py-1 w-full"
            value={blockStyle}
            onChange={(e) => applyBlockStyle(e.target.value)}
            title="Paragraph style"
          >
            <option>Body</option>
            <option>H1</option>
            <option>H2</option>
            <option>H3</option>
            <option>Title</option>
            <option>Subtitle</option>
            <option>Quote</option>
            <option>Code</option>
          </select>
          <button
            className="border rounded px-2"
            onClick={clearCharacterFormatting}
            title="Clear character formatting"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Font size */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center border rounded overflow-hidden">
          <button className="px-3 py-1.5" onClick={dec}>−</button>
          <input
            className="px-3 py-1.5 border-l border-r w-16 text-center outline-none"
            value={sizeDisplay === "Mixed" ? "" : sizeDisplay}
            placeholder={sizeDisplay === "Mixed" ? "Mixed" : ""}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (Number.isFinite(n)) setSize(n);
            }}
          />
          <button className="px-3 py-1.5" onClick={inc}>+</button>
        </div>
        <select
          className="border rounded px-2 py-1"
          onChange={(e) => setSize(parseInt(e.target.value, 10))}
          value={typeof fontSize === "number" ? fontSize : 16}
          title="Quick sizes"
        >
          {[10,11,12,14,16,18,20,24,28,32,36,48].map(n => (
            <option key={n} value={n}>{n}px</option>
          ))}
        </select>
      </div>

      {/* Formatting toggles */}
      <div className="flex items-center gap-2 mb-3">
        <button
          className={`h-9 w-9 border rounded font-bold ${toggles.bold ? "bg-gray-200" : ""}`}
          aria-pressed={toggles.bold}
          onClick={() => toggleMark("bold")}
          title="Bold (Ctrl+B)"
        >B</button>
        <button
          className={`h-9 w-9 border rounded italic ${toggles.italic ? "bg-gray-200" : ""}`}
          aria-pressed={toggles.italic}
          onClick={() => toggleMark("italic")}
          title="Italic (Ctrl+I)"
        >I</button>
        <button
          className={`h-9 w-9 border rounded underline ${toggles.underline ? "bg-gray-200" : ""}`}
          aria-pressed={toggles.underline}
          onClick={() => toggleMark("underline")}
          title="Underline (Ctrl+U)"
        >U</button>
        <button
          className={`h-9 w-9 border rounded line-through ${toggles.strike ? "bg-gray-200" : ""}`}
          aria-pressed={toggles.strike}
          onClick={() => toggleMark("strike")}
          title="Strikethrough"
        >S</button>
      </div>

      {/* Font Colors */}
      <div>
        <div className="font-semibold text-gray-800">Font Colors</div>
        <div className="flex flex-wrap mt-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => applyColor(c)}
              className="h-6 w-6 rounded-full border mr-2 mt-2"
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Fonts */}
      <div className="mt-5">
        <div className="font-semibold text-gray-800">Fonts</div>
        <div className="flex gap-3 mt-3">
          {["Serif","Sans","Mono"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-20 h-20 border rounded-lg flex flex-col items-center justify-center ${
                activeCategory === cat ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <div className="text-2xl">Aa</div>
              <div className="text-xs">{cat}</div>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Try "Times New Roman"'
            className="w-full border rounded-lg pl-8 pr-3 py-1.5"
          />
          <svg className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>

        {/* Recently used */}
        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-2">Recently used</div>
          <div className="border rounded-lg">
            {recent.map((f) => (
              <button
                key={f}
                onClick={() => applyFamily(f)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 ${
                  activeFamily === f ? "bg-blue-50" : ""
                }`}
                style={{ fontFamily: f }}
              >
                <span className={`inline-block w-3 h-3 rounded-full border ${
                  activeFamily === f ? "bg-blue-600 border-blue-600" : "border-gray-400"
                }`} />
                <span>{f}</span>
              </button>
            ))}
          </div>
        </div>

        {/* All Fonts */}
        <div className="mt-4 text-xs text-gray-500">All fonts</div>
        <div className="max-h-40 overflow-y-auto border rounded-lg mt-2">
          {allFonts.map((f) => (
            <button
              key={f}
              onClick={() => applyFamily(f)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
              style={{ fontFamily: f }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
