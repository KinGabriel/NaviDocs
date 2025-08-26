import React, { useMemo, useState } from "react";

/**
 * FontPanel.jsx — Basic formatting toolbar for a Tiptap editor instance.
 *
 * Features covered (guarded by editor.can() so it won’t crash if extension is missing):
 * - Bold, Italic, Underline, Strikethrough
 * - Headings (Paragraph, H1, H2, H3)
 * - Bullet & Numbered Lists
 * - Font Family (requires @tiptap/extension-font-family)
 * - Font Size via TextStyle mark (requires @tiptap/extension-text-style)
 * - Text Color (requires @tiptap/extension-color)
 * - Clear formatting
 *
 * TailwindCSS for styling. No external UI libs required.
 */
export default function FontPanel({ editor }) {
  const [fontSize, setFontSize] = useState(16);
  const [fontColor, setFontColor] = useState("#000000");
  const [fontFamily, setFontFamily] = useState("");

  const families = useMemo(
    () => [
      "", // default (inherit)
      "Inter",
      "Arial, Helvetica, sans-serif",
      "Georgia, serif",
      '"Times New Roman", Times, serif',
      '"Courier New", Courier, monospace',
      '"Trebuchet MS", sans-serif',
      '"Lucida Sans", Verdana, sans-serif',
    ],
    []
  );

  if (!editor) return null;

  // Helpers — keep commands safe if extension not present
  const chainFocus = () => editor.chain().focus();

  const applyFontFamily = (value) => {
    setFontFamily(value);
    const cmd = value ? chainFocus().setFontFamily(value) : chainFocus().unsetFontFamily();
    cmd.run();
  };

  const applyFontSize = (value) => {
    setFontSize(value);
    // Uses TextStyle mark. Value should be px.
    try {
      if (!value) {
        chainFocus().unsetMark('textStyle').run();
      } else {
        chainFocus().setMark('textStyle', { fontSize: `${value}px` }).run();
      }
    } catch (e) {
      // Silently ignore if TextStyle is not available
      console.warn("TextStyle extension not available for font size.");
    }
  };

  const applyFontColor = (hex) => {
    setFontColor(hex);
    try {
      if (hex) chainFocus().setColor(hex).run();
      else chainFocus().unsetColor().run();
    } catch (e) {
      console.warn("Color extension not available.");
    }
  };

  const clearFormatting = () => {
    // Clear marks & node formatting, but keep content
    chainFocus().unsetAllMarks().clearNodes().run();
    setFontFamily("");
    setFontColor("#000000");
    setFontSize(16);
  };

  const Btn = ({
    onClick,
    active = false,
    disabled = false,
    title,
    children,
  }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1 text-sm rounded-md border transition active:scale-[.98] mr-1 mb-1 select-none
        ${active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"}
        ${disabled ? "opacity-40 cursor-not-allowed" : ""}
      `}
    >
      {children}
    </button>
  );

  return (
    <div className="w-full bg-gray-100 border-b border-gray-200 p-2 sticky top-0 z-30">
      <div className="flex flex-wrap items-center gap-2">
        {/* Font family */}
        <div className="flex items-center gap-2 mr-2">
          <label className="text-xs text-gray-600">Font</label>
          <select
            className="px-2 py-1 text-sm rounded-md border border-gray-300 bg-white"
            value={fontFamily}
            onChange={(e) => applyFontFamily(e.target.value)}
          >
            <option value="">Default</option>
            {families.map((f, idx) => (
              <option key={idx} value={f} style={{ fontFamily: f || 'inherit' }}>
                {f || "(inherit)"}
              </option>
            ))}
          </select>
        </div>

        {/* Font size */}
        <div className="flex items-center gap-2 mr-2">
          <label className="text-xs text-gray-600">Size</label>
          <input
            type="number"
            min={8}
            max={96}
            step={1}
            value={fontSize}
            onChange={(e) => applyFontSize(parseInt(e.target.value || 16, 10))}
            className="w-20 px-2 py-1 text-sm rounded-md border border-gray-300 bg-white"
          />
          <span className="text-xs text-gray-500">px</span>
        </div>

        {/* Font color */}
        <div className="flex items-center gap-2 mr-3">
          <label className="text-xs text-gray-600">Color</label>
          <input
            type="color"
            value={fontColor}
            onChange={(e) => applyFontColor(e.target.value)}
            className="h-8 w-10 p-1 rounded-md border border-gray-300 bg-white cursor-pointer"
          />
        </div>

        {/* Strong/Em/Underline/Strike */}
        <div className="flex items-center mr-2">
          <Btn
            title="Bold"
            onClick={() => chainFocus().toggleBold().run()}
            active={editor.isActive('bold')}
            disabled={!editor.can().chain().focus().toggleBold().run()}
          >
            <span className="font-semibold">B</span>
          </Btn>
          <Btn
            title="Italic"
            onClick={() => chainFocus().toggleItalic().run()}
            active={editor.isActive('italic')}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
          >
            <span className="italic">I</span>
          </Btn>
          <Btn
            title="Underline"
            onClick={() => {
              try { chainFocus().toggleUnderline().run(); } catch (e) { console.warn('Underline ext missing'); }
            }}
            active={editor.isActive('underline')}
          >
            <span className="underline">U</span>
          </Btn>
          <Btn
            title="Strikethrough"
            onClick={() => chainFocus().toggleStrike().run()}
            active={editor.isActive('strike')}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
          >
            <span className="line-through">S</span>
          </Btn>
        </div>

        {/* Paragraph / Headings */}
        <div className="flex items-center mr-2">
          <Btn
            title="Paragraph"
            onClick={() => chainFocus().setParagraph().run()}
            active={editor.isActive('paragraph')}
          >
            P
          </Btn>
          <Btn
            title="Heading 1"
            onClick={() => chainFocus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
          >
            H1
          </Btn>
          <Btn
            title="Heading 2"
            onClick={() => chainFocus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
          >
            H2
          </Btn>
          <Btn
            title="Heading 3"
            onClick={() => chainFocus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
          >
            H3
          </Btn>
        </div>

        {/* Lists */}
        <div className="flex items-center mr-2">
          <Btn
            title="Bullet List"
            onClick={() => chainFocus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            disabled={!editor.can().chain().focus().toggleBulletList().run()}
          >
            • List
          </Btn>
          <Btn
            title="Numbered List"
            onClick={() => chainFocus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            disabled={!editor.can().chain().focus().toggleOrderedList().run()}
          >
            1. List
          </Btn>
        </div>

        {/* Blockquote */}
        <div className="flex items-center mr-2">
          <Btn
            title="Blockquote"
            onClick={() => chainFocus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            disabled={!editor.can().chain().focus().toggleBlockquote().run()}
          >
            ❝ ❞
          </Btn>
        </div>

        {/* Clear formatting */}
        <div className="ml-auto">
          <Btn title="Clear formatting" onClick={clearFormatting}>Clear</Btn>
        </div>
      </div>
    </div>
  );
}
