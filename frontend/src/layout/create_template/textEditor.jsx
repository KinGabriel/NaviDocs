// src/layout/create_template/textEditor.jsx
import React, { useEffect, useRef } from "react";
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
import Image from "@tiptap/extension-image";

// Core schema & behavior
import DocumentPages from "../../extensions/textEditor/DocumentPages";
import Page from "../../extensions/textEditor/Page";
import AutoPaginator from "../../extensions/textEditor/AutoPaginator";
import BackspaceHandler from "../../extensions/textEditor/BackspaceHandler";

const inchToPx = (inches) => Math.round(inches * 96);
const DEFAULT_SETUP = {
  paperSize: "A4",
  orientation: "Portrait",
  margins: { top: 1, bottom: 1, left: 1, right: 1 },
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
}) {
  const dimsRef = useRef(computeDims(pageSetup));

  const applyCssVars = (d) => {
    const root = document.documentElement;
    root.style.setProperty("--nd-page-width", `${d.widthPx}px`);
    root.style.setProperty("--nd-page-height", `${d.heightPx}px`);
    root.style.setProperty("--nd-margin-top", `${d.marginTopPx}px`);
    root.style.setProperty("--nd-margin-bottom", `${d.marginBottomPx}px`);
    root.style.setProperty("--nd-margin-left", `${d.marginLeftPx}px`);
    root.style.setProperty("--nd-margin-right", `${d.marginRightPx}px`);
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
      Image,
      AutoPaginator,
      BackspaceHandler,
    ],
    content: normalizeInitialContent(content),
    editorProps: { attributes: { class: "nd-editor" } },
    onCreate: ({ editor }) => {
      applyCssVars(dimsRef.current);
      editor.view.dispatch(editor.state.tr.setMeta("paginatorReflow", true));
      onEditorReady?.(editor); // expose editor so CreateTemplate can pass it to panels
    },
    onUpdate: ({ editor }) => onContentChange?.(editor.getHTML()),
  });

  useEffect(() => {
    const dims = computeDims(pageSetup);
    dimsRef.current = dims;
    applyCssVars(dims);
    editor?.view.dispatch(editor.state.tr.setMeta("paginatorReflow", true));
  }, [editor, pageSetup]);

  useEffect(() => {
    if (!editor) return;
    if (typeof content === "string") {
      const html = normalizeInitialContent(content);
      if (html !== editor.getHTML()) editor.commands.setContent(html, false);
    } else if (content && typeof content === "object") {
      editor.commands.setContent(content, false);
    }
  }, [editor, content]);

  useEffect(() => () => editor?.destroy(), [editor]);

  return (
    <div className={`w-full ${className}`}>
      <style>{`
        :root {
          --nd-page-width: ${dimsRef.current.widthPx}px;
          --nd-page-height: ${dimsRef.current.heightPx}px;
          --nd-margin-top: ${dimsRef.current.marginTopPx}px;
          --nd-margin-bottom: ${dimsRef.current.marginBottomPx}px;
          --nd-margin-left: ${dimsRef.current.marginLeftPx}px;
          --nd-margin-right: ${dimsRef.current.marginRightPx}px;
        }
        .nd-page {
          box-sizing: border-box;
          width: var(--nd-page-width);
          min-height: var(--nd-page-height);
          max-height: var(--nd-page-height);
          padding: var(--nd-margin-top) var(--nd-margin-right) var(--nd-margin-bottom) var(--nd-margin-left);
          margin: 1.25rem auto;
          background: #fff;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 6px 18px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .nd-editor { outline: none; }
        .ProseMirror:focus { outline: none; }
      `}</style>

      <div
        className="mx-auto my-6"
        style={{ maxWidth: `calc(var(--nd-page-width) + 4rem)` }}
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
