// src/layout/create_template/fontPanel.jsx
import React, { useMemo, useState } from "react";

export default function FontPanel({ editor }) {
  const [fontSize, setFontSize] = useState(16);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Serif");
  const [recent, setRecent] = useState(["Adamina", "Gotu", "Castoro"]);
  const [activeFamily, setActiveFamily] = useState("Adamina");

  // track formatting toggles manually (Google Docs style)
  const [toggles, setToggles] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
  });

  const isReady = !!editor;

  const COLORS = useMemo(
    () => [
      "#000000", "#333333", "#666666", "#808080", "#999999",
      "#b3b3b3", "#cccccc", "#e6e6e6", "#f2f2f2", "#ffffff",
      "#990000", "#ff0000", "#ff9900", "#ffff00", "#00cc00",
      "#00ccff", "#0000ff", "#3333ff", "#6600cc", "#ff00ff",
    ],
    []
  );

  const FONT_CATEGORIES = useMemo(
    () => ({
      Serif: ["Adamina", "Gotu", "Castoro", "Georgia", "Times New Roman", "Merriweather"],
      Sans: ["Arial", "Inter", "Roboto", "Helvetica", "Verdana", "Open Sans"],
      Mono: ["Courier New", "Consolas", "Fira Code", "Source Code Pro", "Monaco"],
    }),
    []
  );

  const allFonts = useMemo(() => {
    const c = FONT_CATEGORIES[activeCategory] || [];
    if (!search) return c;
    return c.filter((f) => f.toLowerCase().includes(search.toLowerCase()));
  }, [FONT_CATEGORIES, activeCategory, search]);

  const focus = () => editor?.chain().focus();
  const safeRun = (fn) => { try { if (isReady) fn(); } catch (_) {} };

  const setSize = (n) => {
    const v = Math.max(8, Math.min(96, n | 0));
    setFontSize(v);
    safeRun(() => focus().setMark("textStyle", { fontSize: `${v}px` }).run());
  };

  const dec = () => setSize(fontSize - 1);
  const inc = () => setSize(fontSize + 1);

  const applyColor = (hex) => safeRun(() => focus().setColor(hex).run());

  const applyFamily = (family) => {
    setActiveFamily(family);
    safeRun(() => focus().setFontFamily(family).run());
    setRecent((prev) => [family, ...prev.filter((f) => f !== family)].slice(0, 5));
  };

  const toggleMark = (mark) => {
    setToggles((prev) => ({ ...prev, [mark]: !prev[mark] }));
    safeRun(() => {
      switch (mark) {
        case "bold": focus().toggleBold().run(); break;
        case "italic": focus().toggleItalic().run(); break;
        case "underline": focus().toggleUnderline().run(); break;
        case "strike": focus().toggleStrike().run(); break;
        default: break;
      }
    });
  };

  if (!isReady) return null;

  return (
    <div className="w-72 bg-white border rounded-lg p-3 text-sm">
      {/* Font size */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center border rounded overflow-hidden">
          <button className="px-3 py-1.5" onClick={dec}>−</button>
          <div className="px-4 py-1.5 border-l border-r select-none w-12 text-center">
            {fontSize}
          </div>
          <button className="px-3 py-1.5" onClick={inc}>+</button>
        </div>
      </div>

      {/* Formatting toggles */}
      <div className="flex items-center gap-2 mb-3">
        <button
          className={`h-9 w-9 border rounded font-bold ${
            toggles.bold ? "bg-gray-200" : ""
          }`}
          onClick={() => toggleMark("bold")}
        >
          B
        </button>
        <button
          className={`h-9 w-9 border rounded italic ${
            toggles.italic ? "bg-gray-200" : ""
          }`}
          onClick={() => toggleMark("italic")}
        >
          I
        </button>
        <button
          className={`h-9 w-9 border rounded underline ${
            toggles.underline ? "bg-gray-200" : ""
          }`}
          onClick={() => toggleMark("underline")}
        >
          U
        </button>
        <button
          className={`h-9 w-9 border rounded line-through ${
            toggles.strike ? "bg-gray-200" : ""
          }`}
          onClick={() => toggleMark("strike")}
        >
          S
        </button>
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
          {["Serif", "Sans", "Mono"].map((cat) => (
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

        {/* Document Fonts */}
        <div className="mt-3 text-xs text-gray-500">Document fonts</div>

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
