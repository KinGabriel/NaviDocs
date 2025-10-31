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
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { PaginationPlus } from "tiptap-pagination-plus";
import { PaginationTable } from "tiptap-table-plus";
import { Extension } from "@tiptap/core";

import RichImage from "../../extensions/image/ImageNode";
import { EditableField, createLockOutsideFieldsPlugin } from "../../extensions/fields";

/* ---------------------------- TextStyle extra attrs ---------------------------- */
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
            parseHTML: (el) => ({ fontSize: el.style.fontSize || null }),
          },
          lineHeight: {
            default: null,
            renderHTML: (attrs) =>
              attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
            parseHTML: (el) => ({ lineHeight: el.style.lineHeight || null }),
          },
        },
      },
    ];
  },
});

/* ----------------------------------- utils ----------------------------------- */
const inchToPx = (inches) => Math.round(Number(inches || 0) * 96);
const px = (n) => `${Math.max(0, Number(n) || 0)}px`;

const DEFAULT_SETUP = {
  paperSize: "A4",
  orientation: "Portrait",
  margins: { top: 1, bottom: 1, left: 1, right: 1 },
};

const PRESETS = {
  A4: { w: 8.27, h: 11.7 },
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
const { TablePlus, TableRowPlus, TableCellPlus, TableHeaderPlus } = PaginationTable;

/* ----------------------- normalize header/footer config ----------------------- */
const getCfg = (cfg) => {
  const center = cfg?.header?.centerText || cfg?.center || {};
  const logos = cfg?.header?.logos || {};
  return {
    headerEnabled: !!cfg?.headerEnabled,
    footerEnabled: !!cfg?.footerEnabled,
    headerMarginIn: Number(cfg?.headerMarginIn ?? 0.5),
    footerMarginIn: Number(cfg?.footerMarginIn ?? 0.5),
    assets: cfg?.assets || {},
    center: {
      enabled: center.enabled ?? true,
      line1: center.line1 ?? cfg?.center?.line1 ?? "Saint Louis University",
      line2: center.line2 ?? cfg?.center?.line2 ?? "",
      line3: center.line3 ?? cfg?.center?.line3 ?? "",
      line4: center.line4 ?? cfg?.center?.line4 ?? "",
      showLine4: !!(center.showLine4 ?? cfg?.center?.showLine4),
      fontFamily: center.fontFamily ?? "Inter, system-ui, sans-serif",
      fontSize: Number(center.fontSize ?? 14),
      bold: !!center.bold,
      italic: !!center.italic,
      color: center.color ?? "#000000",
      showHeaderLine: !!(center.showHeaderLine ?? cfg?.showHeaderLine),
    },
    logos: {
      slu: {
        enabled: !!(logos.slu?.enabled ?? cfg?.showSLULogo),
        sizePx: Number(logos.slu?.sizePx ?? 56),
      },
      cicm: {
        enabled: !!(logos.cicm?.enabled ?? cfg?.showCICMLogo),
        sizePx: Number(logos.cicm?.sizePx ?? 52),
      },
    },
    stamp: {
      docCode: cfg?.documentStamp?.docCode ?? cfg?.document_code ?? "",
      revisionNo: cfg?.documentStamp?.revisionNo ?? cfg?.revision_no ?? "",
      effectivity: cfg?.documentStamp?.effectivity ?? cfg?.effectivity ?? "",
    },
  };
};

const escapeHtml = (v) =>
  String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

/* ---------------------------- dynamic header/footer --------------------------- */
const MIN_HEADER_PX = 90;
const MIN_FOOTER_PX = 0;

const getHeaderBasePx = (cfg) =>
  cfg.headerEnabled ? Math.max(MIN_HEADER_PX, inchToPx(cfg.headerMarginIn ?? 0)) : 0;

const getFooterBasePx = (cfg) =>
  cfg.footerEnabled ? Math.max(MIN_FOOTER_PX, inchToPx(cfg.footerMarginIn ?? 0)) : 0;

// Only increases band to fit content; never smaller than base
const autoFitBand = (editor, bandEl, kind /* 'header' | 'footer' */, basePx) => {
  if (!editor || !bandEl) return;
  const needed = Math.ceil(bandEl.scrollHeight);
  const next = Math.max(basePx, needed);
  const ext = editor.extensionManager.extensions.find((e) => e.name === "paginationPlus");
  if (!ext || !ext.options) return;
  const key = kind === "footer" ? "pageFooterHeight" : "pageHeaderHeight";
  if (ext.options[key] !== next) {
    ext.options[key] = next;
    requestAnimationFrame(() => {});
  }
};

/* --------------------------------- component --------------------------------- */
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
  const dimsRef = useRef(computeDims(pageSetup));
  const setPolicyRef = useRef(null);
  const observerRef = useRef(null);

  const _initCfg = getCfg(headerConfig);
  const initialHeaderH = getHeaderBasePx(_initCfg);
  const initialFooterH = getFooterBasePx(_initCfg);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      TextStyleAttrs,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      Superscript,
      Subscript,
      TablePlus.configure({ resizeHandleStyle: { width: "3px" } }),
      TableRowPlus,
      TableCellPlus,
      TableHeaderPlus,
      RichImage.configure({ onOpenImageOptions: () => {} }),
      EditableField,
      PaginationPlus.configure({
        pageGap: 2,
        pageGapBorderSize: 1,
        pageBreakBackground: "#ffffffff",
        pageHeaderHeight: initialHeaderH,
        pageFooterHeight: initialFooterH,
      }),
    ],
    content: normalizeInitialContent(content),
    editorProps: {
      attributes: {
        class: "tiptap ProseMirror nd-editor-canvas rm-with-pagination",
      },
    },
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
      requestAnimationFrame(applyHeaderFooterBands);
    },
    onUpdate: ({ editor }) => {
      onContentChange?.(editor.getHTML());
      queueMicrotask(() => requestAnimationFrame(applyHeaderFooterBands));
    },
  });

  /* ------------------------------ lifecycle hooks ----------------------------- */
  useEffect(() => {
    if (!editor) return;
    try {
      editor.setEditable(!readOnly);
    } catch {}
  }, [editor, readOnly]);

  useEffect(() => {
    if (!setPolicyRef.current) return;
    setPolicyRef.current(mode === "document" ? "document" : "template");
  }, [mode]);

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
    queueMicrotask(() => requestAnimationFrame(applyHeaderFooterBands));
  }, [editor, pageSetup]);

  useEffect(() => {
    if (!editor) return;
    const setWithPolicy = (val) => {
      try {
        setPolicyRef.current?.("off");
        editor.commands.setContent(val, false);
      } finally {
        setPolicyRef.current?.(mode === "document" ? "document" : "template");
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

  /* ----------------------- react to headerConfig changes ---------------------- */
  useEffect(() => {
    if (!editor) return;
    const c = getCfg(headerConfig);
    const headerH = getHeaderBasePx(c);
    const footerH = getFooterBasePx(c);

    const ext = editor.extensionManager.extensions.find((e) => e.name === "paginationPlus");
    if (ext && ext.options) {
      ext.options.pageHeaderHeight = headerH;
      ext.options.pageFooterHeight = footerH;
    }

    queueMicrotask(() => requestAnimationFrame(applyHeaderFooterBands));
  }, [editor, headerConfig]);

  /* --------------------------- header/footer renderer ------------------------- */
  const ensureFlexBand = (bandEl) => {
    if (!bandEl) return null;

    const { marginLeftPx, marginRightPx } = dimsRef.current;

    bandEl.style.display = "flex";
    bandEl.style.alignItems = "center";
    bandEl.style.justifyContent = "space-between";
    bandEl.style.gap = "16px";
    bandEl.style.paddingTop = "0";
    bandEl.style.paddingBottom = "0";
    bandEl.style.boxSizing = "border-box";
    bandEl.style.position = "relative";
    bandEl.style.background = "white";

    let left =
      bandEl.querySelector(":scope > .rm-page-header-left") ||
      bandEl.querySelector(":scope > .rm-first-page-header-left") ||
      bandEl.querySelector(":scope > .nv-header-left");
    if (!left) {
      left = document.createElement("div");
      left.className = "nv-header-left";
      bandEl.insertBefore(left, bandEl.firstChild);
    }

    let right =
      bandEl.querySelector(":scope > .rm-page-header-right") ||
      bandEl.querySelector(":scope > .rm-first-page-header-right") ||
      bandEl.querySelector(":scope > .nv-header-right");
    if (!right) {
      right = document.createElement("div");
      right.className = "nv-header-right";
      bandEl.appendChild(right);
    }
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.justifyContent = "flex-end";
    right.style.gap = "8px";

    let center = bandEl.querySelector(":scope > .nv-center");
    if (!center) {
      center = document.createElement("div");
      center.className = "nv-center";
      center.style.flex = "1";
      center.style.display = "flex";
      center.style.flexDirection = "row";
      center.style.alignItems = "center";
      center.style.justifyContent = "center";
      center.style.gap = "8px";
      center.style.textAlign = "center";
      bandEl.insertBefore(center, right);
    }

    return { left, center, right, bandEl };
  };

  const renderHeaderContent = (trip, rawCfg, pageNo, total) => {
    const cfg = getCfg(rawCfg);

    trip.bandEl.style.visibility = cfg.headerEnabled ? "visible" : "hidden";
    if (!cfg.headerEnabled) {
      trip.left.innerHTML = "";
      trip.center.innerHTML = "";
      trip.right.innerHTML = "";
      return;
    }

    trip.left.innerHTML = "";
    trip.center.innerHTML = "";
    trip.right.innerHTML = "";

    /* LEFT: SLU logo only */
    if (cfg.logos.slu?.enabled && cfg.assets?.slu) {
      const sluImg = document.createElement("img");
      sluImg.src = cfg.assets.slu;
      sluImg.alt = "SLU";
      sluImg.style.height = px(cfg.logos.slu.sizePx || 56);
      sluImg.style.objectFit = "contain";
      sluImg.style.pointerEvents = "none";
      trip.left.style.display = "flex";
      trip.left.style.alignItems = "center";
      trip.left.appendChild(sluImg);
    }

    /* CENTER: text block */
    const weight = cfg.center.bold ? 700 : 400;
    const styleStr = `
      display:flex;flex-direction:column;align-items:center;line-height:1.15;
      font-family:${cfg.center.fontFamily};color:${cfg.center.color};
      font-size:${px(cfg.center.fontSize)};font-style:${cfg.center.italic ? "italic" : "normal"};
      font-weight:${weight};text-align:center;
    `;
    const line = (txt, extra = "") => (txt ? `<div style="${extra}">${escapeHtml(txt)}</div>` : "");
    trip.center.innerHTML = `
      <div class="nv-center-text" style="${styleStr}">
        ${line(cfg.center.line1)}
        ${line(cfg.center.line2)}
        ${line(cfg.center.line3, "font-size:12px;")}
        ${cfg.center.showLine4 ? line(cfg.center.line4) : ""}
      </div>
    `;

    /* RIGHT: CICM logo (near center) + stamp table */
    const rightRow = document.createElement("div");
    rightRow.style.display = "flex";
    rightRow.style.alignItems = "center";
    rightRow.style.gap = "8px";

    if (cfg.logos.cicm?.enabled && cfg.assets?.cicm) {
      const cicmImg = document.createElement("img");
      cicmImg.src = cfg.assets.cicm;
      cicmImg.alt = "CICM";
      cicmImg.style.height = px(cfg.logos.cicm.sizePx || 52);
      cicmImg.style.objectFit = "contain";
      cicmImg.style.pointerEvents = "none";
      rightRow.appendChild(cicmImg); // sits to the right of the center text
    }

    const stamp = document.createElement("table");
    stamp.style.border = "1px solid #000";
    stamp.style.borderCollapse = "collapse";
    stamp.style.fontSize = "11px";
    stamp.style.fontFamily = "Arial,sans-serif";
    stamp.style.background = "#fff";
    stamp.innerHTML = `
      <tbody>
        <tr><td style="border:1px solid #000;padding:2px 6px;">Document Code</td><td style="border:1px solid #000;padding:2px 6px;">${escapeHtml(cfg.stamp.docCode)}</td></tr>
        <tr><td style="border:1px solid #000;padding:2px 6px;">Revision No.</td><td style="border:1px solid #000;padding:2px 6px;">${escapeHtml(String(cfg.stamp.revisionNo))}</td></tr>
        <tr><td style="border:1px solid #000;padding:2px 6px;">Effectivity</td><td style="border:1px solid #000;padding:2px 6px;">${escapeHtml(String(cfg.stamp.effectivity))}</td></tr>
        <tr><td style="border:1px solid #000;padding:2px 6px;">Page</td><td style="border:1px solid #000;padding:2px 6px;">${pageNo} of ${total}</td></tr>
      </tbody>`;
    rightRow.appendChild(stamp);

    trip.right.appendChild(rightRow);

    // Optional bottom rule
    const wantLine = !!cfg.center.showHeaderLine;
    let lineEl = trip.bandEl.querySelector(":scope > .nv-header-line");
    if (wantLine && !lineEl) {
      lineEl = document.createElement("div");
      lineEl.className = "nv-header-line";
      lineEl.style.position = "absolute";
      lineEl.style.left = "0";
      lineEl.style.right = "0";
      lineEl.style.bottom = "0";
      lineEl.style.height = "1px";
      lineEl.style.background = "#000";
      trip.bandEl.appendChild(lineEl);
    } else if (!wantLine && lineEl) {
      lineEl.remove();
    }

    // Auto-fit to content with 90px minimum
    autoFitBand(editor, trip.bandEl, "header", getHeaderBasePx(getCfg(headerConfig)));
  };

  const renderFooter = (footer, pageNo, total, rawCfg) => {
    const cfg = getCfg(rawCfg);
    footer.style.visibility = cfg.footerEnabled ? "visible" : "hidden";
    if (!cfg.footerEnabled) {
      footer.innerHTML = "";
      return;
    }
    footer.style.display = "flex";
    footer.style.justifyContent = "center";
    footer.style.alignItems = "center";
    footer.style.paddingLeft = px(dimsRef.current.marginLeftPx);
    footer.style.paddingRight = px(dimsRef.current.marginRightPx);
    footer.innerHTML = `<div style="font-family:Arial;font-size:12px;">Page ${pageNo} of ${total}</div>`;

    autoFitBand(editor, footer, "footer", getFooterBasePx(getCfg(headerConfig)));
  };

  const applyHeaderFooterBands = () => {
    const root = document.querySelector(".rm-with-pagination");
    if (!root) return;
    const breakers = root.querySelectorAll(".rm-page-break");
    const total = breakers.length;

    const firstHeader = root.querySelector(".rm-first-page-header");
    if (firstHeader) {
      const trip = ensureFlexBand(firstHeader);
      renderHeaderContent(trip, headerConfig, 1, total);
    }

    breakers.forEach((brk, i) => {
      const pageNo = i + 1;
      const footer = brk.querySelector(".rm-page-footer");
      if (footer) renderFooter(footer, pageNo, total, headerConfig);

      const header = brk.querySelector(".rm-page-header");
      if (header && pageNo < total) {
        const trip = ensureFlexBand(header);
        renderHeaderContent(trip, headerConfig, pageNo + 1, total);
      }
    });
  };

  /* ---------------------------- observe pagination ---------------------------- */
  useEffect(() => {
    requestAnimationFrame(applyHeaderFooterBands);
    const root = document.querySelector(".rm-with-pagination");
    observerRef.current?.disconnect();
    if (root) {
      observerRef.current = new MutationObserver(() =>
        requestAnimationFrame(applyHeaderFooterBands)
      );
      observerRef.current.observe(root, { subtree: true, childList: true });
    }
    return () => observerRef.current?.disconnect();
  }, [editor, headerConfig]);

  /* ----------------------------------- ui ------------------------------------ */
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
