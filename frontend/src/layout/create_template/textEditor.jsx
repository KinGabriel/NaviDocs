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

// PRO EXTENSIONS
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

/**
 * Extra attributes for TextStyle so fontSize and lineHeight stay in the document.
 */
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
              attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
            parseHTML: (element) => ({
              fontSize: element.style.fontSize || null,
            }),
          },
          lineHeight: {
            default: null,
            renderHTML: (attrs) =>
              attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
            parseHTML: (element) => ({
              lineHeight: element.style.lineHeight || null,
            }),
          },
        },
      },
    ];
  },
});

// ---------- Helpers for header/footer HTML ----------

const escapeHtml = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const buildHeaderHTML = (config = {}) => {
  const {
    assets = {},
    header = {},
    headerEnabled = true,
  } = config;

  if (!headerEnabled) return "";

  const logos = header.logos || {};
  const slu = logos.slu || {};
  const cicm = logos.cicm || {};

  const centerText = header.centerText || {};
  const {
    enabled: centerEnabled = true,
    showHeaderLine = false,        // legacy boolean
    headerLineOffsetPx,            // legacy offset (px) if present
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
  } = centerText;

  // New header line object (preferred)
  const headerLine = header.headerLine || {};
  const {
    enabled: headerLineEnabledRaw,
    topMarginPx,
    thicknessPx,
    color: headerLineColorRaw,
  } = headerLine;

  // Resolve whether to show the line (new config wins, else legacy flag)
  const showLine =
    typeof headerLineEnabledRaw === "boolean"
      ? headerLineEnabledRaw
      : !!showHeaderLine;

  // Resolve top margin (new topMarginPx wins, else legacy headerLineOffsetPx, else 4)
  const lineTopMarginPx =
    typeof topMarginPx === "number"
      ? topMarginPx
      : typeof headerLineOffsetPx === "number"
        ? headerLineOffsetPx
        : 4;

  // Resolve thickness (defaults to 1px)
  const lineThicknessPx =
    typeof thicknessPx === "number" && thicknessPx > 0
      ? thicknessPx
      : 1;

  // Resolve color (defaults to black)
  const lineColor = headerLineColorRaw || "#000000";

  const normalizeLineStyle = (style, fallback) => {
    return {
      fontFamily: style.fontFamily || fallback.fontFamily || "Inter, system-ui, sans-serif",
      fontSizePx:
        typeof style.fontSizePt === "number"
          ? Math.round(style.fontSizePt * (4 / 3))
          : fallback.fontSize || 14,
      bold: style.bold ?? fallback.bold ?? false,
      italic: style.italic ?? fallback.italic ?? false,
      color: style.color || fallback.color || "#000000",
    };
  };

  const baseStyle = {
    fontFamily: fontFamily || "Inter, system-ui, sans-serif",
    fontSize: fontSize || 14,
    bold: !!bold,
    italic: !!italic,
    color: color || "#000000",
  };

  const l1 = normalizeLineStyle(line1Style, baseStyle);
  const l2 = normalizeLineStyle(line2Style, baseStyle);
  const l3 = normalizeLineStyle(line3Style, baseStyle);
  const l4 = normalizeLineStyle(line4Style, baseStyle);

  const logoImg = (src, sizePx) => {
    if (!src) return "";
    return `<img src="${escapeHtml(src)}" style="max-height:${sizePx || 48}px; object-fit:contain;" />`;
  };

  const renderLine = (text, style) => {
    if (!text) return "";
    const weight = style.bold ? "font-weight:bold;" : "";
    const italic = style.italic ? "font-style:italic;" : "";
    return `
      <div
        style="
          font-family:${escapeHtml(style.fontFamily)};
          font-size:${style.fontSizePx}px;
          color:${escapeHtml(style.color)};
          ${weight}
          ${italic}
          line-height:1.2;
        "
      >
        ${escapeHtml(text)}
      </div>
    `;
  };

  const linesHTML = centerEnabled
    ? `
      ${renderLine(line1, l1)}
      ${renderLine(line2, l2)}
      ${renderLine(line3, l3)}
      ${showLine4 ? renderLine(line4, l4) : ""}
    `
    : "";

  // full-width line below the entire header row (now driven by header.headerLine)
  const fullWidthLineHTML = showLine
    ? `<div style="margin-top:${lineTopMarginPx}px; border-bottom:${lineThicknessPx}px solid ${escapeHtml(
        lineColor
      )}; width:100%;"></div>`
    : "";

  return `
    <div
      style="
        box-sizing:border-box;
        width:100%;
        padding:4px 16px;
      "
    >
      <div
        style="
          width:100%;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
        "
      >
        <div style="flex:0 0 auto; display:flex; align-items:center; justify-content:flex-start;">
          ${slu.enabled ? logoImg(assets.slu, slu.sizePx) : ""}
        </div>

        <div style="flex:1 1 auto; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center;">
          ${linesHTML}
        </div>

        <div style="flex:0 0 auto; display:flex; align-items:center; justify-content:flex-end;">
          ${cicm.enabled ? logoImg(assets.cicm, cicm.sizePx) : ""}
        </div>
      </div>

      ${fullWidthLineHTML}
    </div>
  `;
};

const buildFooterHTML = (config = {}) => {
  const {
    footer = {},
    footerEnabled = false,
  } = config;

  if (!footerEnabled) return "";

  const pageNumber = footer.pageNumber || {};
  const body = footer.body || {};

  const pnEnabled = !!pageNumber.enabled;
  const bodyEnabled = !!body.enabled;

  if (!pnEnabled && !bodyEnabled) return "";

  const pnAlign = pageNumber.align || "center";
  const pnWeight = pageNumber.bold ? "font-weight:bold;" : "";
  const pnItalic = pageNumber.italic ? "font-style:italic;" : "";
  const pnPattern = pageNumber.pattern || "{page}";
  const pnFontFamily = pageNumber.fontFamily || "Inter, system-ui, sans-serif";
  const pnFontSize = pageNumber.fontSize || 12;
  const pnColor = pageNumber.color || "#000000";

  const bodyAlign = body.align || "left";
  const bodyWeight = body.bold ? "font-weight:bold;" : "";
  const bodyItalic = body.italic ? "font-style:italic;" : "";
  const bodyText = body.text || "";
  const bodyFontFamily = body.fontFamily || "Inter, system-ui, sans-serif";
  const bodyFontSize = body.fontSize || 12;
  const bodyColor = body.color || "#000000";

  // 1) No body text → simple centered page number (full width)
  if (!bodyEnabled) {
    if (!pnEnabled) return "";

    return `
      <div
        style="
          box-sizing:border-box;
          width:100%;
          padding:4px 16px;
          display:flex;
          align-items:center;
          justify-content:center;
        "
      >
        <div
          style="
            font-family:${escapeHtml(pnFontFamily)};
            font-size:${pnFontSize}px;
            color:${escapeHtml(pnColor)};
            text-align:${escapeHtml(pnAlign)};
            ${pnWeight}
            ${pnItalic}
          "
        >
          ${escapeHtml(pnPattern)}
        </div>
      </div>
    `;
  }

  // 2) Body enabled → two-column layout (body + page number)
  const bodyHTML = `
    <div
      style="
        flex:1 1 auto;
        text-align:${escapeHtml(bodyAlign)};
        font-family:${escapeHtml(bodyFontFamily)};
        font-size:${bodyFontSize}px;
        color:${escapeHtml(bodyColor)};
        ${bodyWeight}
        ${bodyItalic}
      "
    >
      ${escapeHtml(bodyText)}
    </div>
  `;

  const pageNumberHTML = pnEnabled
    ? `
      <div
        style="
          flex:0 0 auto;
          min-width:80px;
          text-align:${escapeHtml(pnAlign)};
          font-family:${escapeHtml(pnFontFamily)};
          font-size:${pnFontSize}px;
          color:${escapeHtml(pnColor)};
          ${pnWeight}
          ${pnItalic}
        "
      >
        ${escapeHtml(pnPattern)}
      </div>
    `
    : `<div style="flex:0 0 auto;"></div>`;

  return `
    <div
      style="
        box-sizing:border-box;
        width:100%;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:16px;
        padding:4px 16px;
      "
    >
      ${bodyHTML}
      ${pageNumberHTML}
    </div>
  `;
};

// ---------- Default doc + page setup ----------

const DEFAULT_DOC = { type: "doc", content: [{ type: "paragraph" }] };

const normalizeInitialContent = (content) => {
  if (!content) return DEFAULT_DOC;
  if (typeof content === "string") return content;
  if (typeof content === "object" && content.type) return content;
  return DEFAULT_DOC;
};

const DEFAULT_SETUP = {
  paperSize: "A4",
  orientation: "Portrait",
  margins: { top: 1, bottom: 1, left: 1, right: 1 },
};

const mapPaperSizeToFormatKey = (paperSize) => {
  const key = String(paperSize || "").toUpperCase();
  switch (key) {
    case "A3":
      return "A3";
    case "A5":
      return "A5";
    case "LETTER":
      return "Letter";
    case "LEGAL":
      return "Legal";
    case "TABLOID":
      return "Tabloid";
    default:
      return "A4";
  }
};

const buildPageFormatFromSetup = (pageSetup = DEFAULT_SETUP) => {
  const { paperSize, orientation, margins = {} } = pageSetup;

  const formatKey = mapPaperSizeToFormatKey(paperSize);
  const base = PAGE_FORMATS?.[formatKey] || PAGE_FORMATS.A4;

  const isLandscape = String(orientation || "").toLowerCase() === "landscape";

  const topIn = margins.top ?? DEFAULT_SETUP.margins.top;
  const rightIn = margins.right ?? DEFAULT_SETUP.margins.right;
  const bottomIn = margins.bottom ?? DEFAULT_SETUP.margins.bottom;
  const leftIn = margins.left ?? DEFAULT_SETUP.margins.left;

  return {
    id: `${formatKey.toLowerCase()}-${isLandscape ? "landscape" : "portrait"}`,
    width: isLandscape ? base.height : base.width,
    height: isLandscape ? base.width : base.height,
    margins: {
      top: inchToPixels(topIn),
      right: inchToPixels(rightIn),
      bottom: inchToPixels(bottomIn),
      left: inchToPixels(leftIn),
    },
  };
};

export default function TextEditor({
  content,
  pageSetup = DEFAULT_SETUP,
  onEditorReady,
  onContentChange,
  className = "",
  mode = "template",
  readOnly = false,
  headerConfig = {},
}) {
  const setPolicyRef = useRef(null);

  const initialPageFormat = useMemo(
    () => buildPageFormatFromSetup(pageSetup),
    [] // only at mount; later changes handled in effect
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Pages.configure({
        pageFormat: initialPageFormat,
        headerHeight: inchToPixels(headerConfig.headerHeightIn || 0.75),
        footerHeight: inchToPixels(headerConfig.footerHeightIn || 0.75),
        pageGap: 40,
        header: "",               // will be overridden by setHeader effect
        footer: "{page}",         // will be overridden by setFooter effect
      }),
      TableKit,
      TextStyle,
      TextStyleAttrs,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      EditableField,
    ],

    content: normalizeInitialContent(content),

    editorProps: {
      attributes: {
        class: "tiptap ProseMirror nd-editor-canvas",
      },
    },

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

  // readOnly → editor.setEditable
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  // mode → lock policy
  useEffect(() => {
    if (!setPolicyRef.current) return;
    setPolicyRef.current(mode === "document" ? "document" : "template");
  }, [mode]);

  // external content → setContent (defensive against view not ready)
  useEffect(() => {
    if (!editor) return;

    let cancelled = false;

    const applyContent = () => {
      if (cancelled || !editor || editor.isDestroyed) return;

      const view = editor.view;
      if (!view || !view.dom) {
        setTimeout(applyContent, 50);
        return;
      }

      const setWithPolicy = (value) => {
        try {
          setPolicyRef.current?.("off");
          editor.commands.setContent(value, false);
        } catch (err) {
          console.warn("[TextEditor] Safe setContent error (ignored):", err);
        } finally {
          setPolicyRef.current?.(
            mode === "document" ? "document" : "template"
          );
        }
      };

      if (!content) {
        setWithPolicy(DEFAULT_DOC);
        return;
      }

      if (typeof content === "string") {
        if (content !== editor.getHTML()) {
          setWithPolicy(content);
        }
        return;
      }

      if (content?.type) {
        setWithPolicy(content);
        return;
      }
    };

    applyContent();

    return () => {
      cancelled = true;
    };
  }, [editor, content, mode]);

  // pageSetup → setPageFormat (defensive)
  useEffect(() => {
    if (!editor) return;

    let cancelled = false;

    const applyFormat = () => {
      if (cancelled || !editor || editor.isDestroyed) return;

      const view = editor.view;
      if (!view || !view.dom) {
        setTimeout(applyFormat, 50);
        return;
      }

      try {
        const nextFormat = buildPageFormatFromSetup(pageSetup);
        editor.commands.setPageFormat(nextFormat);
      } catch (err) {
        console.warn("[TextEditor] Safe setPageFormat error (ignored):", err);
      }
    };

    applyFormat();

    return () => {
      cancelled = true;
    };
  }, [editor, pageSetup]);

  // headerConfig → setHeader / setFooter / setHeaderHeight / setFooterHeight
  useEffect(() => {
    if (!editor) return;

    let cancelled = false;

    const applyHeaderFooter = () => {
      if (cancelled || !editor || editor.isDestroyed) return;

      const view = editor.view;
      if (!view || !view.dom) {
        setTimeout(applyHeaderFooter, 50);
        return;
      }

      try {
        const cfg = headerConfig || {};

        const headerHTML = buildHeaderHTML(cfg);
        const footerHTML = buildFooterHTML(cfg);

        // Tiptap Pages header/footer commands (per docs)
        editor.commands.setHeader(headerHTML || "");
        editor.commands.setFooter(footerHTML || "");

        if (cfg.headerHeightIn) {
          editor.commands.setHeaderHeight(inchToPixels(cfg.headerHeightIn));
        }
        if (cfg.footerHeightIn) {
          editor.commands.setFooterHeight(inchToPixels(cfg.footerHeightIn));
        }
      } catch (err) {
        console.warn("[TextEditor] Safe header/footer update error (ignored):", err);
      }
    };

    applyHeaderFooter();

    return () => {
      cancelled = true;
    };
  }, [editor, headerConfig]);

  // cleanup
  useEffect(
    () => () => {
      editor?.destroy();
    },
    [editor]
  );

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
