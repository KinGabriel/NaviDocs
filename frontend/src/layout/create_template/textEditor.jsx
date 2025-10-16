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

// ---- utils
const inchToPx = (inches) => Math.round(Number(inches || 0) * 96);

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

const DEFAULT_DOC = { type: "doc", content: [{ type: "paragraph" }] };
const normalizeInitialContent = (content) => (content ? content : DEFAULT_DOC);

export default function TextEditor({
  content,
  pageSetup = DEFAULT_SETUP,
  onEditorReady,
  onContentChange,
  className = "",
  mode = "template",
  readOnly = false,
  logoConfig = {},
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

      PaginationPlus.configure({
        pageGap: 24,
        pageGapBorderSize: 1,
        pageBreakBackground: "#ececec",
        pageHeaderHeight: 96,
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

  // ✅ Update page geometry (size + margins only)
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
      .run();
  }, [editor, pageSetup]);

  // update content safely when prop changes
  useEffect(() => {
    if (!editor) return;

    const setWithPolicy = (val) => {
      try {
        setPolicyRef.current?.("off");
      } catch {}
      try {
        editor.commands.setContent(val, false);
      } finally {
        try {
          setPolicyRef.current?.(mode === "document" ? "document" : "template");
        } catch {}
      }
    };

    if (typeof content === "string" || !content?.type) {
      const html = normalizeInitialContent(content);
      if (html !== editor.getHTML()) setWithPolicy(html);
    } else if (content && typeof content === "object") {
      setWithPolicy(content);
    }
  }, [editor, content, mode]);

  useEffect(() => () => editor?.destroy(), [editor]);

  // 🧩 Inject SLU & CICM logos safely (no crash)
  useEffect(() => {
    if (!editor) return;

    let rafId;
    const applyLogos = () => {
      const pages = document.querySelectorAll(".rm-page-break");
      if (!pages.length) return;

      pages.forEach((page) => {
        const headerLeft = page.querySelector(".rm-page-header-left");
        const headerRight = page.querySelector(".rm-page-header-right");

        if (headerLeft) headerLeft.innerHTML = "";
        if (headerRight) headerRight.innerHTML = "";

        if (logoConfig.showSLULogo && headerLeft)
          headerLeft.innerHTML = `<img src="${logoConfig.assets?.slu}" alt="SLU" style="height:48px;object-fit:contain" />`;

        if (logoConfig.showCICMLogo && headerRight)
          headerRight.innerHTML = `<img src="${logoConfig.assets?.cicm}" alt="CICM" style="height:48px;object-fit:contain" />`;
      });

      // handle first page special header
      const firstLeft = document.querySelector(".rm-first-page-header-left");
      const firstRight = document.querySelector(".rm-first-page-header-right");
      if (firstLeft && logoConfig.showSLULogo)
        firstLeft.innerHTML = `<img src="${logoConfig.assets?.slu}" alt="SLU" style="height:48px;object-fit:contain" />`;
      if (firstRight && logoConfig.showCICMLogo)
        firstRight.innerHTML = `<img src="${logoConfig.assets?.cicm}" alt="CICM" style="height:48px;object-fit:contain" />`;
    };

    const schedule = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => applyLogos());
    };

    // Run initially and periodically to catch re-pagination
    schedule();
    const interval = setInterval(() => schedule(), 1200);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(interval);
    };
  }, [editor, logoConfig]);

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
