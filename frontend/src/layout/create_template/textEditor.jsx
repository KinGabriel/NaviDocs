// src/layout/create_template/textEditor.jsx
import React, { useEffect, useRef, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Extension } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { ExportDocx } from "@tiptap-pro/extension-export-docx";
import {
  Pages,
  TableKit,
  PAGE_FORMATS,
  inchToPixels,
} from "@tiptap-pro/extension-pages";

import {
  EditableField,
  createLockOutsideFieldsPlugin,
} from "../../extensions/fields";

const TextStyleAttrs = Extension.create({
  name: "textStyleAttrs",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            renderHTML: (attrs) =>
              attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {},
            parseHTML: (el) => ({ fontSize: el.style.fontSize || null }),
          },
          lineHeight: {
            default: null,
            renderHTML: (attrs) =>
              attrs.lineHeight ? { style: `line-height:${attrs.lineHeight}` } : {},
            parseHTML: (el) => ({ lineHeight: el.style.lineHeight || null }),
          },
        },
      },
    ];
  },
});

// helpers
const escapeHtml = (v) =>
  v == null
    ? ""
    : String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const formatEffectivityDate = (val) => {
  try {
    const raw =
      val && typeof val === "object" && "$date" in val ? val.$date : val;
    const d = raw ? new Date(raw) : null;
    if (d && !isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
  } catch (e) {}
  return val ? String(val) : "";
};

//  BUILD HEADER
const buildHeaderHTML = (config = {}, stampOverride = {}) => {
  const { assets = {}, header = {}, headerEnabled = true } = config;
  if (!headerEnabled) return "";

  const logos = header.logos || {};
  const slu = logos.slu || {};
  const cicm = logos.cicm || {};
  const hasCicm = !!cicm.enabled;

  const center = header.centerText || {};
  const {
    line1 = "",
    line2 = "",
    line3 = "",
    line4 = "",
    showLine4 = false,
    line1Style = {},
    line2Style = {},
    line3Style = {},
    line4Style = {},
    fontFamily,
    fontSize,
    bold,
    italic,
    color,
  } = center;

  const normalizeStyle = (s, f) => ({
    fontFamily: s.fontFamily || f.fontFamily || "Inter, sans-serif",
    fontSizePx:
      typeof s.fontSizePt === "number"
        ? Math.round(s.fontSizePt * (4 / 3))
        : f.fontSize || 14,
    bold: s.bold ?? f.bold ?? false,
    italic: s.italic ?? f.italic ?? false,
    color: s.color || f.color || "#000",
  });

  const base = {
    fontFamily: fontFamily || "Inter, sans-serif",
    fontSize: fontSize || 14,
    bold: !!bold,
    italic: !!italic,
    color: color || "#000",
  };

  const l1 = normalizeStyle(line1Style, base);
  const l2 = normalizeStyle(line2Style, base);
  const l3 = normalizeStyle(line3Style, base);
  const l4 = normalizeStyle(line4Style, base);

  const renderLine = (text, s) =>
    !text
      ? ""
      : `
        <div style="
          font-family:${escapeHtml(s.fontFamily)};
          font-size:${s.fontSizePx}px;
          color:${escapeHtml(s.color)};
          ${s.bold ? "font-weight:bold;" : ""}
          ${s.italic ? "font-style:italic;" : ""}
          line-height:1.2;
        ">${escapeHtml(text)}</div>
      `;

  //  DOC STAMP
  const stamp =
    stampOverride && Object.keys(stampOverride).length
      ? stampOverride
      : config.documentStamp || {};

  // determine whether a stamp actually exists (has a code)
  const stampCode =
    stamp.docCode ?? stamp.document_code ?? stamp.document_code ?? "";
  const hasStamp = String(stampCode).trim() !== "";

  const buildStampHTML = (s = {}) => {
    const code = s.docCode ?? s.document_code ?? "";
    if (!String(code).trim()) return "";

    const rev = s.revisionNo ?? s.revision_no ?? "";
    const eff = s.effectivity ? formatEffectivityDate(s.effectivity) : "";

    // Label column – left
    const labelCell =
      "border-top:1px solid #000;" +
      "border-left:1px solid #000;" +
      "border-bottom:1px solid #000;" +
      "border-right:none;" +
      "padding:4px 6px;" +
      "font-size:6px;" +
      "line-height:1.1;" +
      "white-space:nowrap;" +
      "text-align:left;" +
      "min-width:100px;";

    // Value column – right
    const valueCell =
      "border-top:1px solid #000;" +
      "border-right:1px solid #000;" +
      "border-bottom:1px solid #000;" +
      "padding:4px 6px;" +
      "font-size:7px;" +
      "line-height:1.1;" +
      "white-space:nowrap;" +
      "text-align:left;" +
      "min-width:102px;";

    const row = (label, val) =>
      `<tr>
        <td style="${labelCell}">${label}</td>
        <td style="${valueCell}">${escapeHtml(val)}</td>
      </tr>`;

    return `
      <div style="display:inline-block;width:auto;">
        <table style="
          border-collapse:collapse;
          border:1px solid #000;
          background:#fff;
          font-family:Arial, sans-serif;
          font-size:8px;
        ">
          ${row("Document Code", code)}
          ${row("Revision No.", rev)}
          ${eff ? row("Effectivity", eff) : ""}
          ${row("Page", config?.footer?.pageNumber?.pattern || "1 of 1")}
        </table>
      </div>
    `;
  };

  return `
    <div style="width:100%;padding:8px 0;box-sizing:border-box;">
      <div style="
        width:100%;
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
      ">

        <!-- LEFT LOGO -->
        <div style="margin-left:16px;">
          ${
            slu.enabled
              ? `<img src="${escapeHtml(assets.slu)}" style="max-height:${
                  slu.sizePx || 48
                }px;">`
              : ""
          }
        </div>

        <!-- CENTER TEXT -->
        <div style="
          flex:1;
          text-align:center;
          margin:0 16px;
          display:flex;
          flex-direction:column;
          align-items:center;
        ">
          ${renderLine(line1, l1)}
          ${renderLine(line2, l2)}
          ${renderLine(line3, l3)}
          ${showLine4 ? renderLine(line4, l4) : ""}
        </div>

        <!-- RIGHT: CICM + DOC STAMP -->
        <div style="
          display:flex;
          flex-direction:${hasCicm && hasStamp ? "row" : "column"};
          align-items:${hasCicm && hasStamp ? "center" : "flex-end"};
          gap:${hasCicm && hasStamp ? "8px" : "4px"};
          justify-content:flex-end;
          margin-right:8px;
        ">
          ${
            hasCicm
              ? `<img src="${escapeHtml(assets.cicm)}" style="max-height:${
                  cicm.sizePx || 48
                }px; display:block;">`
              : ""
          }

          ${buildStampHTML(stamp)}
        </div>

      </div>

      <div style="margin-top:4px;width:100%;border-bottom:1px solid #000;"></div>
    </div>
  `;
};

// ---------- FOOTER ----------
const buildFooterHTML = (config = {}) => {
  const { footer = {}, footerEnabled = false } = config;
  if (!footerEnabled) return "";

  const body = footer.body || {};
  const pn = footer.pageNumber || {};

  const bodyEnabled = !!body.enabled;
  const pnEnabled = !!pn.enabled;

  if (!bodyEnabled && !pnEnabled) return "";

  const bHTML = bodyEnabled
    ? `
    <div style="
      flex:1;
      font-family:${escapeHtml(body.fontFamily || "Inter")};
      font-size:${body.fontSize || 12}px;
      color:${escapeHtml(body.color || "#000")};
      ${body.bold ? "font-weight:bold;" : ""}
      ${body.italic ? "font-style:italic;" : ""}
      text-align:${escapeHtml(body.align || "left")};
    ">
      ${escapeHtml(body.text || "")}
    </div>`
    : `<div style="flex:1"></div>`;

  const pnHTML = pnEnabled
    ? `
    <div style="
      flex:0 0 auto;
      font-family:${escapeHtml(pn.fontFamily || "Inter")};
      font-size:${pn.fontSize || 12}px;
      color:${escapeHtml(pn.color || "#000")};
      ${pn.bold ? "font-weight:bold;" : ""}
      ${pn.italic ? "font-style:italic;" : ""}
      text-align:${escapeHtml(pn.align || "center")};
      min-width:80px;
    ">
      ${escapeHtml(pn.pattern || "{page}")}
    </div>`
    : `<div style="flex:0 0 auto;"></div>`;

  return `
    <div style="
      width:100%;
      padding:4px 16px;
      box-sizing:border-box;
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:16px;
    ">
      ${bHTML}
      ${pnHTML}
    </div>
  `;
};

// ---------- DEFAULT ----------
const DEFAULT_DOC = { type: "doc", content: [{ type: "paragraph" }] };

const normalizeInitialContent = (c) =>
  !c ? DEFAULT_DOC : typeof c === "string" ? c : c.type ? c : DEFAULT_DOC;

const DEFAULT_SETUP = {
  paperSize: "A4",
  orientation: "Portrait",
  margins: { top: 1, bottom: 1, left: 1, right: 1 },
};

// map sizes
const mapPaper = (ps) => {
  const key = String(ps || "").toUpperCase();
  return PAGE_FORMATS[key] ? key : "A4";
};

const buildPageFormatFromSetup = (setup = DEFAULT_SETUP) => {
  const { paperSize, orientation, margins = {} } = setup;
  const base = PAGE_FORMATS[mapPaper(paperSize)];
  const landscape = String(orientation).toLowerCase() === "landscape";

  return {
    id: `${paperSize}-${orientation}`,
    width: landscape ? base.height : base.width,
    height: landscape ? base.width : base.height,
    margins: {
      top: inchToPixels(margins.top ?? 1),
      right: inchToPixels(margins.right ?? 1),
      bottom: inchToPixels(margins.bottom ?? 1),
      left: inchToPixels(margins.left ?? 1),
    },
  };
};

// ---------- MAIN EDITOR ----------
export default function TextEditor({
  content,
  pageSetup = DEFAULT_SETUP,
  onEditorReady,
  onContentChange,
  className = "",
  mode = "template",
  readOnly = false,
  headerConfig = {},
  documentCode = "",
  revisionNo = null,
  effectivity = null,
}) {
  const setPolicyRef = useRef(null);

  const initialPageFormat = useMemo(
    () => buildPageFormatFromSetup(pageSetup),
    [pageSetup]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Pages.configure({
        pageFormat: initialPageFormat,
        headerHeight: inchToPixels(headerConfig.headerHeightIn || 0.75),
        footerHeight: inchToPixels(headerConfig.footerHeightIn || 0.75),
        pageGap: 2,
        pageBreakBackground: "var(--color-gray-50)",
        header: "",
        footer: "{page}",
      }),
      TableKit,
      TextStyle,
      TextStyleAttrs,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({
        allowBase64: true,
        resize: { enabled: true, alwaysPreserveAspectRatio: true },
      }),
      EditableField,
      ExportDocx.configure({
        exportType: "blob",
        onCompleteExport: (result) => {
          const blob = new Blob([result], {
            type:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "document.docx";
          a.click();
          URL.revokeObjectURL(url);
        },
      }),
    ],

    content: normalizeInitialContent(content),

    editorProps: { attributes: { class: "tiptap ProseMirror nd-editor-canvas" } },

    shouldRerenderOnTransaction: true,

    onCreate: ({ editor }) => {
      const { plugin, setPolicy } = createLockOutsideFieldsPlugin({
        initialPolicy: mode === "document" ? "document" : "template",
        nodeTypeName: "editableField",
        keyName: "lock-outside-fields",
      });
      setPolicyRef.current = setPolicy;
      editor.registerPlugin(plugin);
      editor.setEditable(!readOnly);
      onEditorReady?.(editor);
    },

    onUpdate: ({ editor }) => {
      onContentChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!setPolicyRef.current) return;
    setPolicyRef.current(mode === "document" ? "document" : "template");
  }, [mode]);

  useEffect(() => {
    if (!editor) return;
    let cancel = false;
    const applyContent = () => {
      if (cancel || editor.isDestroyed) return;
      if (!content) {
        editor.commands.setContent(DEFAULT_DOC);
        return;
      }
      editor.commands.setContent(
        typeof content === "string" ? content : content
      );
    };
    applyContent();
    return () => {
      cancel = true;
    };
  }, [editor, content]);

  useEffect(() => {
    if (!editor) return;
    let cancel = false;
    const applyFormat = () => {
      if (cancel || editor.isDestroyed) return;
      editor.commands.setPageFormat(buildPageFormatFromSetup(pageSetup));
    };
    applyFormat();
    return () => {
      cancel = true;
    };
  }, [editor, pageSetup]);

  // UPDATE HEADER/FOOTER
  useEffect(() => {
    if (!editor) return;
    let cancel = false;
    const apply = () => {
      if (cancel || editor.isDestroyed) return;

      const cfg = headerConfig || {};
      const stampOverride = {
        ...(cfg.documentStamp || {}),
        docCode:
          documentCode ||
          cfg.documentStamp?.docCode ||
          cfg.docCode ||
          cfg.document_code ||
          "",
        revisionNo:
          revisionNo ??
          cfg.documentStamp?.revisionNo ??
          cfg.revisionNo ??
          cfg.revision_no ??
          null,
        effectivity:
          effectivity ??
          cfg.documentStamp?.effectivity ??
          cfg.effectivity ??
          null,
      };

      editor.commands.setHeader(buildHeaderHTML(cfg, stampOverride));
      editor.commands.setFooter(buildFooterHTML(cfg));

      if (cfg.headerHeightIn)
        editor.commands.setHeaderHeight(inchToPixels(cfg.headerHeightIn));
      if (cfg.footerHeightIn)
        editor.commands.setFooterHeight(inchToPixels(cfg.footerHeightIn));
    };
    apply();
    return () => {
      cancel = true;
    };
  }, [editor, headerConfig, documentCode, revisionNo, effectivity]);

  useEffect(() => () => editor?.destroy(), [editor]);

  return (
    <div className={`flex justify-center my-6 ${className}`}>
      <div className="w-full max-w-5xl">
        {editor ? (
          <EditorContent editor={editor} className="prose max-w-none" />
        ) : (
          <div className="text-sm text-gray-500">Loading editor…</div>
        )}
      </div>
    </div>
  );
}
