// src/layout/create_template/textEditor.jsx
import React, { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Underline from "@tiptap/extension-underline";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { PaginationPlus } from "tiptap-pagination-plus";

import RichImage from "../../extensions/image/ImageNode";
import { EditableField, createLockOutsideFieldsPlugin } from "../../extensions/fields";

const inchToPx = (inches) => Math.round(Number(inches || 0) * 96);

const DEFAULT_SETUP = {
  paperSize: "A4",
  orientation: "Portrait",
  margins: { top: 1, bottom: 1, left: 1, right: 1 }, // inches
  headerHeight: 1.0, // inches
  footerHeight: 0.6, // inches
};

// Preset sizes in inches
const PRESETS = {
  A4: { w: 8.27, h: 11.69 },
  Letter: { w: 8.5, h: 11 },
  Legal: { w: 8.5, h: 14 },
};

function computeDims(pageSetup) {
  const p = pageSetup || DEFAULT_SETUP;
  const base = PRESETS[p.paperSize] || PRESETS.A4;
  const portrait = (p.orientation || "Portrait") === "Portrait";
  const wIn = portrait ? base.w : base.h;
  const hIn = portrait ? base.h : base.w;
  const m = p.margins || DEFAULT_SETUP.margins;

  return {
    widthPx: inchToPx(wIn),
    heightPx: inchToPx(hIn),
    marginTopPx: inchToPx(m.top),
    marginBottomPx: inchToPx(m.bottom),
    marginLeftPx: inchToPx(m.left),
    marginRightPx: inchToPx(m.right),
    headerHeightPx: inchToPx(p.headerHeight ?? DEFAULT_SETUP.headerHeight),
    footerHeightPx: inchToPx(p.footerHeight ?? DEFAULT_SETUP.footerHeight),
  };
}

const DEFAULT_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function normalizeInitialContent(content) {
  if (!content) return DEFAULT_DOC;
  if (typeof content === "object") return content;
  if (typeof content === "string") return content;
  return DEFAULT_DOC;
}

// ---- helper to apply header/footer strings safely ----
function applyHeaderFooter(editor, header, footer) {
  const hl = header?.left ?? "";
  const hr = header?.right ?? "";
  const fl = footer?.left ?? "";
  const fr = footer?.right ?? "";
  editor?.chain().updateHeaderContent(hl, hr).updateFooterContent(fl, fr).run();
}

export default function TextEditor({
  content,
  pageSetup = DEFAULT_SETUP,
  onEditorReady,
  onContentChange,
  className = "",
  mode = "template",
  readOnly = false,

  // NEW (optional) props — pass from parent or use defaults below
  header = { left: "", right: "Page {page}" },
  footer = { left: "", right: "" },
}) {
  const dimsRef = useRef(computeDims(pageSetup));
  const [showImageOptions, setShowImageOptions] = useState(false);
  const setPolicyRef = React.useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        document: true,
        bold: true,
        italic: true,
        strike: true,
        blockquote: true,
        bulletList: true,
        orderedList: true,
        heading: { levels: [1, 2, 3] },
        code: false,
        codeBlock: false,
        dropcursor: true,
        gapcursor: true,
        history: true,
      }),

      // Pagination Plus (visual options only; geometry set via commands)
      (() => {
        return PaginationPlus.configure({
          pageGap: 24,
          pageGapBorderSize: 1,
          pageBreakBackground: "#ecececff",
          // Do NOT set page width/height or header/footer content here; we push them via commands
          headerLeft: "",
          headerRight: "",
          footerLeft: "",
          footerRight: "",
        });
      })(),

      TextStyle,
      Color,
      FontFamily,
      Underline,
      Superscript,
      Subscript,

      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,

      RichImage.configure({
        onOpenImageOptions: () => setShowImageOptions(true),
      }),

      EditableField,
    ],
    content: normalizeInitialContent(content),
    editorProps: { attributes: { class: "nd-editor-canvas" } },
    onCreate: ({ editor }) => {
      const { plugin, setPolicy } = createLockOutsideFieldsPlugin({
        initialPolicy: mode === "document" ? "document" : "template",
        nodeTypeName: "editableField",
        keyName: "lock-outside-fields",
      });
      setPolicyRef.current = setPolicy;
      editor.registerPlugin(plugin);

      try {
        editor.setEditable(!readOnly);
      } catch {}

      // Ensure header/footer content appears on first mount
      applyHeaderFooter(editor, header, footer);

      onEditorReady?.(editor);
    },
    onUpdate: ({ editor }) => onContentChange?.(editor.getHTML()),
  });

  // keep editable state in sync
  useEffect(() => {
    if (!editor) return;
    try {
      editor.setEditable(!readOnly);
    } catch {}
  }, [editor, readOnly]);

  // switch lock policy when mode changes
  useEffect(() => {
    if (!setPolicyRef.current) return;
    setPolicyRef.current(mode === "document" ? "document" : "template");
  }, [mode]);

  // ✅ Update page geometry (size, margins, band heights) via commands
  useEffect(() => {
    if (!editor) return;
    const d = computeDims(pageSetup);
    dimsRef.current = d;

    editor
      .chain()
      .updatePageWidth(d.widthPx)
      .updatePageHeight(d.heightPx)
      .updateMargins({
        top: d.marginTopPx,
        right: d.marginRightPx,
        bottom: d.marginBottomPx,
        left: d.marginLeftPx,
      })
      .updateHeaderHeight(d.headerHeightPx)
      .updateFooterHeight(d.footerHeightPx)
      .run();

    // Re-apply header/footer content after geometry changes (helps on new pages)
    applyHeaderFooter(editor, header, footer);
  }, [editor, pageSetup]);

  // Apply header/footer whenever those props change
  useEffect(() => {
    if (!editor) return;
    applyHeaderFooter(editor, header, footer);
  }, [editor, header, footer]);

  // update content safely when prop changes
  useEffect(() => {
    if (!editor) return;
    if (typeof content === "string") {
      const html = normalizeInitialContent(content);
      if (html !== editor.getHTML()) {
        try {
          setPolicyRef.current?.("off");
        } catch {}
        try {
          editor.commands.setContent(html, false);
        } finally {
          try {
            setPolicyRef.current?.(mode === "document" ? "document" : "template");
          } catch {}
        }
      }
    } else if (content && typeof content === "object") {
      try {
        setPolicyRef.current?.("off");
      } catch {}
      try {
        editor.commands.setContent(content, false);
      } finally {
        try {
          setPolicyRef.current?.(mode === "document" ? "document" : "template");
        } catch {}
      }
    }
  }, [editor, content, mode]);

  useEffect(() => () => editor?.destroy(), [editor]);

  return (
    <div className={`w-full flex ${className}`}>
      <div className="flex-1 mx-auto my-6" style={{ maxWidth: "calc(816px + 4rem)" }}>
        {editor ? (
          <EditorContent editor={editor} className="prose max-w-none" />
        ) : (
          <div className="text-sm text-gray-500">Loading editor…</div>
        )}
      </div>
    </div>
  );
}
