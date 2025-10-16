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

import RichImage from "../../extensions/image/ImageNode";

// Core schema & behavior
import DocumentPages from "../../extensions/textEditor/DocumentPages";
import Page from "../../extensions/textEditor/Page";
import AutoPaginator from "../../extensions/textEditor/AutoPaginator";
import BackspaceHandler from "../../extensions/textEditor/BackspaceHandler";

// Editable fields + lock plugin (factory returns a plugin + setter)
import { EditableField, createLockOutsideFieldsPlugin } from "../../extensions/fields";

const inchToPx = (inches) => Math.round(Number(inches || 0) * 96);

const DEFAULT_SETUP = {
  paperSize: "A4",
  orientation: "Portrait",
  margins: { top: 1, bottom: 1, left: 1, right: 1 }, // inches
  headerHeight: 1.0, // in
  footerHeight: 0.6, // in
};

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
  content: [{ type: "page", content: [{ type: "paragraph" }] }],
};

function normalizeInitialContent(content) {
  if (!content) return DEFAULT_DOC;
  if (typeof content !== "string") return content;
  if (/data-type\s*=\s*"(nd-)?page"/i.test(content)) return content;
  return `<section data-type="nd-page">${content}</section>`;
}

export default function TextEditor({
  content,
  pageSetup = DEFAULT_SETUP,
  onEditorReady,
  onContentChange,
  className = "",
  mode = "template",
  readOnly = false,
}) {
  const dimsRef = useRef(computeDims(pageSetup));
  const [showImageOptions, setShowImageOptions] = useState(false);

  // lock policy setter from plugin factory
  const setPolicyRef = React.useRef(null);

  // Push CSS vars into the editor/root using the extension command
  const pushCssVars = (editor, d) => {
    if (!editor?.commands?.setHeaderFooterCssVars) return;
    editor.commands.setHeaderFooterCssVars({
      paper:  { width: `${d.widthPx}px`, height: `${d.heightPx}px` },
      margins:{ top: `${d.marginTopPx}px`, bottom: `${d.marginBottomPx}px`, left: `${d.marginLeftPx}px`, right: `${d.marginRightPx}px` },
      header: { height: `${d.headerHeightPx}px` },
      footer: { height: `${d.footerHeightPx}px` },
    });
  };

  const editor = useEditor({
    extensions: [
      DocumentPages,
      Page,
      StarterKit.configure({
        document: false,
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
      AutoPaginator,
      BackspaceHandler,
    ],
    content: normalizeInitialContent(content),
    editorProps: { attributes: { class: "nd-editor-canvas" } },
    onCreate: ({ editor }) => {
      // Lock policy plugin
      const { plugin, setPolicy } = createLockOutsideFieldsPlugin({
        initialPolicy: mode === "document" ? "document" : "template",
        nodeTypeName: "editableField",
        keyName: "lock-outside-fields",
      });
      setPolicyRef.current = setPolicy;
      editor.registerPlugin(plugin);

      // Set initial CSS variables for paper/margins/header/footer
      const d = dimsRef.current;
      pushCssVars(editor, d);

      // First reflow for paginator so it measures the body frame
      editor.commands.reflowPages?.();

      // Respect readOnly prop
      try { editor.setEditable(!readOnly); } catch {}

      onEditorReady?.(editor);
    },
    onUpdate: ({ editor }) => onContentChange?.(editor.getHTML()),
  });

  // keep editable state in sync
  useEffect(() => {
    if (!editor) return;
    try { editor.setEditable(!readOnly); } catch {}
  }, [editor, readOnly]);

  // switch lock policy when mode changes
  useEffect(() => {
    if (!setPolicyRef.current) return;
    setPolicyRef.current(mode === "document" ? "document" : "template");
  }, [mode]);

  // reflow and update CSS variables when pageSetup changes
  useEffect(() => {
    if (!editor) return;
    const d = computeDims(pageSetup);
    dimsRef.current = d;
    pushCssVars(editor, d);
    editor.commands.reflowPages?.();
  }, [editor, pageSetup]);

  // update content safely when prop changes
  useEffect(() => {
    if (!editor) return;
    if (typeof content === "string") {
      const html = normalizeInitialContent(content);
      if (html !== editor.getHTML()) {
        try { setPolicyRef.current?.("off"); } catch {}
        try { editor.commands.setContent(html, false); }
        finally { try { setPolicyRef.current?.(mode === "document" ? "document" : "template"); } catch {} }
        editor.commands.reflowPages?.();
      }
    } else if (content && typeof content === "object") {
      try { setPolicyRef.current?.("off"); } catch {}
      try { editor.commands.setContent(content, false); }
      finally { try { setPolicyRef.current?.(mode === "document" ? "document" : "template"); } catch {} }
      editor.commands.reflowPages?.();
    }
  }, [editor, content, mode]);

  // optional: reflow on window resize (helps when container changes height)
  useEffect(() => {
    if (!editor) return;
    const onResize = () => editor.commands.reflowPages?.();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [editor]);

  useEffect(() => () => editor?.destroy(), [editor]);

  return (
    <div className={`w-full flex ${className}`}>
      {/* Keep container narrow to a page stack; layout rules live in global.css */}
      <div
        className="flex-1 mx-auto my-6"
        style={{ maxWidth: "calc(var(--paper-width, 816px) + 4rem)" }}
      >
        {editor ? (
          <EditorContent editor={editor} className="prose max-w-none" />
        ) : (
          <div className="text-sm text-gray-500">Loading editor…</div>
        )}
      </div>
    </div>
  );
}
