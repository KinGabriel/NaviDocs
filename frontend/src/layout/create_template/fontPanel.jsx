import React, { useMemo, useState } from "react";

/**
 * fontPanel.jsx — Google Docs–style formatting palette for a Tiptap editor
 * EXACT layout and labels as in the provided screenshot.
 *
 * Requirements in editor:
 *  - @tiptap/extension-text-style (for fontSize)
 *  - @tiptap/extension-color (for text color)
 *  - @tiptap/extension-font-family
 *  - @tiptap/extension-underline, @tiptap/extension-superscript, @tiptap/extension-subscript (optional, guarded)
 */
export default function FontPanel({ editor }) {
  const [fontSize, setFontSize] = useState(16);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Serif");
  const [recent, setRecent] = useState(["Adamina", "Gotu", "Castoro"]);
  const [activeFamily, setActiveFamily] = useState("");

  if (!editor) return null;

  const COLORS = useMemo(
    () => [
      // 10 grays incl. white
      "#000000", "#1f1f1f", "#4d4d4d", "#7a7a7a", "#a6a6a6",
      "#c0c0c0", "#d9d9d9", "#e6e6e6", "#f2f2f2", "#ffffff",
      // color row
      "#ff0000", "#ff7f00", "#ffaa00", "#ffd400", "#00cc00",
      "#00ccff", "#0066ff", "#0000ff", "#8000ff", "#ff00ff",
    ],
    []
  );

  const FONT_CATEGORIES = useMemo(
    () => ({
      Serif: [
        "Times New Roman", "Georgia", "Garamond", "Cambria", "Adamina",
        "Castoro", "Cardo", "Merriweather", "Libre Baskerville",
      ],
      Sans: [
        "Arial", "Helvetica", "Verdana", "Tahoma", "Segoe UI", "Inter",
        "Roboto", "Open Sans", "Noto Sans", "Gotu",
      ],
      Mono: [
        "Courier New", "Consolas", "Fira Code", "Source Code Pro", "Monaco",
      ],
    }),
    []
  );

  const allFonts = useMemo(() => {
    const c = FONT_CATEGORIES[activeCategory] || [];
    if (!search) return c;
    return c.filter((f) => f.toLowerCase().includes(search.toLowerCase()));
  }, [FONT_CATEGORIES, activeCategory, search]);

  // Helpers
  const focus = () => editor.chain().focus();

  const safeRun = (fn) => {
    try { fn(); } catch (_) {}
  };

  const setSize = (n) => {
    const v = Math.max(8, Math.min(96, n|0));
    setFontSize(v);
    safeRun(() => focus().setMark("textStyle", { fontSize: `${v}px` }).run());
  };

  const dec = () => setSize(fontSize - 1);
  const inc = () => setSize(fontSize + 1);

  const applyColor = (hex) => {
    safeRun(() => focus().setColor(hex).run());
  };

  const applyFamily = (family) => {
    setActiveFamily(family);
    safeRun(() => focus().setFontFamily(family).run());
    setRecent((prev) => [family, ...prev.filter((f) => f !== family)].slice(0, 8));
  };

  const clearFormatting = () => {
    focus().unsetAllMarks().clearNodes().run();
  };

  // UI atoms
  const IconBtn = ({ title, active, onClick, children }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`h-9 w-9 grid place-items-center border rounded bg-white text-gray-800 hover:bg-gray-50 active:scale-[.98] ${
        active ? "ring-2 ring-gray-800" : ""
      }`}
    >
      {children}
    </button>
  );

  const ColorDot = ({ c }) => (
    <button
      type="button"
      onClick={() => applyColor(c)}
      className="h-6 w-6 rounded-full border border-gray-300 mr-2 mt-2"
      style={{ background: c }}
      title={c}
    />
  );

  const Card = ({ label, sample, active, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-28 h-24 border rounded-xl p-3 text-left bg-white hover:bg-gray-50 transition ${
        active ? "ring-2 ring-gray-800" : ""
      }`}
    >
      <div className="text-3xl leading-none" style={{ fontFamily: sample }}>
        Aa
      </div>
      <div className="text-xs text-gray-600 mt-2">{label}</div>
    </button>
  );

  return (
    <div className="w-full bg-white border rounded-xl p-3 text-sm">
      {/* Size stepper */}
      <div className="flex items-center gap-2">
        <div className="flex items-center border rounded overflow-hidden">
          <button className="px-3 py-2" onClick={dec}>−</button>
          <div className="px-4 py-2 border-l border-r select-none w-16 text-center">{fontSize}</div>
          <button className="px-3 py-2" onClick={inc}>+</button>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <IconBtn title="Bold" active={editor.isActive('bold')} onClick={() => focus().toggleBold().run()}>
            <span className="font-semibold">B</span>
          </IconBtn>
          <IconBtn title="Italic" active={editor.isActive('italic')} onClick={() => focus().toggleItalic().run()}>
            <span className="italic">I</span>
          </IconBtn>
          <IconBtn title="Underline" active={editor.isActive('underline')} onClick={() => safeRun(() => focus().toggleUnderline().run())}>
            <span className="underline">U</span>
          </IconBtn>
          <IconBtn title="Strikethrough" active={editor.isActive('strike')} onClick={() => focus().toggleStrike().run()}>
            <span className="line-through">S</span>
          </IconBtn>
          <IconBtn title="Subscript" active={editor.isActive('subscript')} onClick={() => safeRun(() => focus().toggleSubscript().run())}>
            <span> X<sub>2</sub> </span>
          </IconBtn>
          <IconBtn title="Superscript" active={editor.isActive('superscript')} onClick={() => safeRun(() => focus().toggleSuperscript().run())}>
            <span> X<sup>2</sup> </span>
          </IconBtn>
          <IconBtn title="Clear formatting" onClick={clearFormatting}>
            <span className="tracking-wide">Aa</span>
          </IconBtn>
        </div>
      </div>

      {/* Font Colors */}
      <div className="mt-4">
        <div className="font-semibold text-gray-800">Font Colors</div>
        <div className="flex flex-wrap items-center mt-2">
          {COLORS.map((c) => (
            <ColorDot key={c} c={c} />
          ))}
        </div>
      </div>

      {/* Fonts */}
      <div className="mt-5">
        <div className="font-semibold text-gray-800">Fonts</div>
        <div className="flex items-center gap-3 mt-3">
          <Card label="Serif" sample="Georgia, serif" active={activeCategory==='Serif'} onClick={() => setActiveCategory('Serif')} />
          <Card label="Sans" sample="Inter, Arial, sans-serif" active={activeCategory==='Sans'} onClick={() => setActiveCategory('Sans')} />
          <Card label="Mono" sample="Courier New, monospace" active={activeCategory==='Mono'} onClick={() => setActiveCategory('Mono')} />
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={'Try "Times New Roman"'}
            className="w-full border rounded-lg pl-10 pr-3 py-2"
          />
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>

        {/* Document fonts label */}
        <div className="mt-3 text-xs text-gray-500">Document fonts</div>

        {/* Recently used */}
        <div className="mt-4">
          <div className="text-xs text-gray-500 mb-2">Recently used</div>
          <div className="border rounded-lg overflow-hidden">
            {recent.map((f, idx) => (
              <button
                key={f}
                onClick={() => applyFamily(f)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 ${
                  activeFamily === f ? 'bg-blue-50' : ''
                }`}
                style={{ fontFamily: f }}
              >
                <span className={`inline-block w-4 h-4 rounded-full border ${activeFamily===f ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`} />
                <span>{f}</span>
              </button>
            ))}
          </div>
        </div>

        {/* All fonts */}
        <div className="mt-5 text-xs text-gray-500">All fonts</div>
        <div className="max-h-64 overflow-y-auto border rounded-lg mt-2">
          {allFonts.map((f) => (
            <button
              key={f}
              onClick={() => applyFamily(f)}
              className="w-full block text-left px-3 py-2 hover:bg-gray-50"
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
