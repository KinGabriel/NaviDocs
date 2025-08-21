// src/layout/create_template/fontPanel.jsx
import React, { useMemo } from "react";
import createEditorActions from "../../editor/EditorActions";
import useSelectionSnapshot from "../../editor/useSelectionSnapshot";

export default function FontPanel({
  
  fontSettings = { fontSize: 16, fontFamily: null, fontColor: null },
  onFontSettingsChange = () => {},
  editor,
}) {

  const actions = useMemo(() => (editor ? createEditorActions(editor) : null), [editor]);
  const snap = useSelectionSnapshot(editor);

  const [searchFont, setSearchFont] = React.useState("");
  const [showCapOptions, setShowCapOptions] = React.useState(false);

  const fontColors = [
    "#000000", "#333333", "#666666", "#999999", "#CCCCCC", "#E0E0E0", "#F0F0F0", "#FFFFFF",
    "#B71C1C", "#FF0000", "#FF9800", "#FFEB3B", "#4CAF50", "#00FFFF", "#4A86E8", "#0000FF",
    "#9900FF", "#FF00FF"
  ];

  const fontFamilies = [
    { name: "Serif", family: "Times New Roman, serif" },
    { name: "Sans", family: "Arial, sans-serif" },
    { name: "Mono", family: "Courier New, monospace" },
  ];

  const recentFonts = ["Adamina", "Gotu", "Castoro"];
  const allFonts = [
    "Hina Mincho", "Darker Grotesque", "Phetsarath", "Camorant", "Ledger",
    "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Oswald", "Source Sans Pro"
  ];

  const filteredFonts = allFonts.filter(f => f.toLowerCase().includes(searchFont.toLowerCase()));

  const changeFontSize = (delta) => {
    if (!actions) return;
    actions.incrementFontSize(delta);
    const current = editor?.getAttributes('textStyle')?.fontSize || "16px";
    onFontSettingsChange({ ...fontSettings, fontSize: current });
  };

  const setFontSize = (value) => {
    if (!actions) return;
    actions.setFontSize(value);
    const current = editor?.getAttributes('textStyle')?.fontSize || "16px";
    onFontSettingsChange({ ...fontSettings, fontSize: current });
  };

  const setColor = (color) => {
    if (!actions) return;
    actions.setColor(color);
    onFontSettingsChange({ ...fontSettings, fontColor: color });
  };

  const setFamily = (family) => {
    if (!actions) return;
    actions.setFontFamily(family);
    onFontSettingsChange({ ...fontSettings, fontFamily: family });
  };

  const doCase = (type) => {
    if (!actions) return;
    actions.transformCase(type);
    setShowCapOptions(false);
  };

  const active = {
    isBold: snap.isBold,
    isItalic: snap.isItalic,
    isUnderline: snap.isUnderline,
    isStrikethrough: snap.isStrikethrough,
    isSuperscript: snap.isSuperscript,
    isSubscript: snap.isSubscript,
    fontColor: snap.fontColor ?? fontSettings.fontColor,
    fontFamily: snap.fontFamily ?? fontSettings.fontFamily,
    fontSize: snap.fontSize ?? fontSettings.fontSize,
  };

  return (
    <div className="space-y-3">
      {/* Font Size + Formatting */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => changeFontSize(-1)} className="p-2 hover:bg-gray-100 rounded">−</button>
          <span className="text-lg font-medium">
            {String(active.fontSize).replace(/px$/, "")}
          </span>
          <button onClick={() => changeFontSize(1)} className="p-2 hover:bg-gray-100 rounded">+</button>
        </div>

        <div className="flex items-center justify-start space-x-2 pl-2.5">
          <button
            onClick={() => actions?.toggleBold()}
            className={`p-2 rounded font-bold text-lg ${active.isBold ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            title="Bold"
          >B</button>

          <button
            onClick={() => actions?.toggleItalic()}
            className={`p-2 rounded italic text-lg ${active.isItalic ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            title="Italic"
          >I</button>

          <button
            onClick={() => actions?.toggleUnderline()}
            className={`p-2 rounded underline text-lg ${active.isUnderline ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            title="Underline"
          >U</button>

          <button
            onClick={() => actions?.toggleStrike()}
            className={`p-2 rounded line-through text-lg ${active.isStrikethrough ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            title="Strikethrough"
          >S</button>

          <button
            onClick={() => actions?.toggleSubscript()}
            className={`p-2 rounded text-lg ${active.isSubscript ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            title="Subscript"
          >X₂</button>

          <button
            onClick={() => actions?.toggleSuperscript()}
            className={`p-2 rounded text-lg ${active.isSuperscript ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            title="Superscript"
          >X²</button>

          {/* Capitalization Dropdown */}
          <div className="relative inline-block text-left">
            <button
              onClick={() => setShowCapOptions((v) => !v)}
              className="bg-gray-100 px-3 py-1 rounded hover:bg-gray-200"
              title="Change case"
            >
              Aa
            </button>
            {showCapOptions && (
              <div className="absolute z-10 mt-1 w-32 bg-white shadow border rounded border-[#D9D9D9]">
                <button onClick={() => doCase('titlecase')} className="block w-full text-sm text-left px-2 py-1 hover:bg-gray-100">Title Case</button>
                <button onClick={() => doCase('uppercase')} className="block w-full text-sm text-left px-2 py-1 hover:bg-gray-100">UPPERCASE</button>
                <button onClick={() => doCase('lowercase')} className="block w-full text-sm text-left px-2 py-1 hover:bg-gray-100">lowercase</button>
              </div>
            )}
          </div>
        </div>

        {/* Font Colors */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Font Colors</h3>
          <div className="grid grid-cols-10 gap-1">
            {fontColors.map((color) => (
              <button
                key={color}
                className={`w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform ${active.fontColor === color ? 'border-blue-500' : 'border-gray-300'}`}
                style={{ backgroundColor: color }}
                onClick={() => setColor(color)}
              />
            ))}
          </div>
        </div>

        {/* Font Family Cards */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Fonts</h3>
          <div className="grid grid-cols-3 gap-2">
            {fontFamilies.map((font) => (
              <button
                key={font.name}
                className={`p-3 rounded-lg border-2 text-center ${active.fontFamily === font.family ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setFamily(font.family)}
              >
                <div className="text-2xl font-bold mb-1" style={{ fontFamily: font.family }}>Aa</div>
                <div className="text-xs text-gray-600">{font.name}</div>
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder='Try "Times New Roman"'
            value={searchFont}
            onChange={(e) => setSearchFont(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />

          {/* Document Fonts */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">Document fonts</h4>
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Recently used</div>
              {recentFonts.map((font) => (
                <button
                  key={font}
                  className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm"
                  onClick={() => setFamily(font)}
                >
                  {font}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* All Fonts */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">All fonts</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {filteredFonts.map((font) => (
              <button
                key={font}
                className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm"
                onClick={() => setFamily(font)}
              >
                {font}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
