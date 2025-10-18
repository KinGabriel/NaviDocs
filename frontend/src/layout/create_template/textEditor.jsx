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
import { toISODate } from "../../utils/formatters";

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
  // new props
  templateStatus = "",
  documentCode = "",
  revisionNo = "",
  effectivity = "",
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

  const renderHeaders = () => {
    const cfg = logoConfig || {};
    const pages = document.querySelectorAll(".rm-page-break");
    if (!pages.length) return;
    const totalPages = pages.length;

    pages.forEach((page, i) => {
      // Ensure page positioning
      page.style.position = "relative";

      // Remove any previous injected custom header
      let header = page.querySelector(".slu-page-header");
      if (header) header.remove();

      // Create new overlay header container
      header = document.createElement("div");
      header.className = "slu-page-header";
      header.style.position = "absolute";
      header.style.top = "0";
      header.style.left = "0";
      header.style.right = "0";
      header.style.width = "100%";
      header.style.height = "96px";
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.justifyContent = "space-between";
      header.style.padding = "0 24px";
      header.style.background = "white";
      header.style.zIndex = "999";
      header.style.gap = "16px";
      header.style.boxSizing = "border-box";
      header.style.borderBottom = "1px solid transparent"; // visual separation safety

      // LEFT: SLU Logo
      const left = document.createElement("div");
      if (cfg.showSLULogo)
        left.innerHTML = `<img src="${cfg.assets?.slu || ''}" alt="SLU" style="height:60px;object-fit:contain;" />`;

      // CENTER: Vertical text block
  const c = cfg.center || {};
      const center = document.createElement("div");
      center.style.display = "flex";
      center.style.flexDirection = "column";
      center.style.alignItems = "center";
      center.style.textAlign = "center";
      center.style.lineHeight = "1.2";
      center.style.fontFamily = "Arial, sans-serif";
      center.innerHTML = `
        <div style="font-weight:bold;font-size:13px;">${c.line1 || "Saint Louis University"}</div>
        ${c.line2 ? `<div style="font-weight:bold;font-size:14px;text-decoration:underline;">${c.line2}</div>` : ""}
        ${c.line3 ? `<div style="font-size:12px;">${c.line3}</div>` : ""}
        ${c.showLine4 && c.line4 ? `<div style="font-weight:bold;font-size:13px;">${c.line4}</div>` : ""}
      `;

      // RIGHT: CICM Logo + Document Table side-by-side
      // prefer explicit top-level props when provided, otherwise fall back to nested
      const d = {
        docCode: documentCode || cfg.documentStamp?.docCode || cfg.docCode || cfg.document_code || "",
        revisionNo: revisionNo || cfg.documentStamp?.revisionNo || cfg.revisionNo || cfg.revision_no || "",
        effectivity: effectivity || cfg.documentStamp?.effectivity || cfg.effectivity || "",
      };
      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.alignItems = "center";
      right.style.justifyContent = "flex-end";
      right.style.gap = "12px";

      const cicmLogo = cfg.showCICMLogo
        ? `<img src="${cfg.assets?.cicm || ''}" alt="CICM" style="height:52px;object-fit:contain;" />`
        : "";

  // only render table when there's a document code and either:
  // - we're rendering a document (mode === 'document'), or
  // - the template status indicates approved/published
  const showStamp = d.docCode && (mode === 'document' || ['approved', 'published'].includes((templateStatus || '').toLowerCase()));
      const table = showStamp
        ? `
          <table style="border:1px solid #000;border-collapse:collapse;font-size:11px;font-family:Arial,sans-serif;">
            <tr><td style="border:1px solid #000;padding:2px 6px;">Document Code</td><td style="border:1px solid #000;padding:2px 6px;">${d.docCode || ""}</td></tr>
            <tr><td style="border:1px solid #000;padding:2px 6px;">Revision No.</td><td style="border:1px solid #000;padding:2px 6px;">${d.revisionNo || ""}</td></tr>
            <tr><td style="border:1px solid #000;padding:2px 6px;">Effectivity</td><td style="border:1px solid #000;padding:2px 6px;">${toISODate(d.effectivity) || ""}</td></tr>
            <tr><td style="border:1px solid #000;padding:2px 6px;">Page</td><td style="border:1px solid #000;padding:2px 6px;">${i + 1} of ${totalPages}</td></tr>
          </table>
        `
        : "";

      right.innerHTML = `${cicmLogo}${table}`;

      // Assemble
      header.appendChild(left);
      header.appendChild(center);
      header.appendChild(right);
      page.appendChild(header);
    });
  };

  renderHeaders();
  const interval = setInterval(renderHeaders, 1200);
  return () => clearInterval(interval);
}, [editor, logoConfig, templateStatus, documentCode, revisionNo, effectivity, mode]);

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
