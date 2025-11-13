// src/layout/create_template/textEditor.jsx
import React, { useCallback, useEffect, useMemo, useRef } from "react";
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
import { Extension } from "@tiptap/core";
import { PaginationTable } from "tiptap-table-plus";

import { EditableField, createLockOutsideFieldsPlugin } from "../../extensions/fields";
import { formatDate } from "../../utils/formatters.jsx";

/* ---------------------------- Tiptap Table & Pagination Plus ---------------------------- */
const { TablePlus, TableRowPlus, TableCellPlus, TableHeaderPlus } = PaginationTable;

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

/* ----------------------------- TableCell extra attrs ----------------------------- */
// Optional: allow cell background via setCellAttribute('backgroundColor', value)
const TableCellBg = TableCellPlus.extend({
  addAttributes() {
    const parent = this.parent?.() || {};
    return {
      ...parent,
      backgroundColor: {
        default: null,
        renderHTML: (attrs) =>
          attrs.backgroundColor ? { style: `background-color: ${attrs.backgroundColor}` } : {},
        parseHTML: (el) => ({ backgroundColor: el.style.backgroundColor || null }),
      },
    };
  },
});

/* ----------------------------------- utils ----------------------------------- */
const inchToPx = (inches) => Math.round(Number(inches || 0) * 96);
const px = (n) => `${Math.max(0, Number(n) || 0)}px`;
// 1pt ≈ 1.3333px at 96dpi
const ptToPx = (pt) => Math.round(Number(pt || 0) * (96 / 72));

/* ------------------------ Env-aware API base & assets ------------------------ */
const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");
const API_URL =
  API_URLS.find((url) => {
    try {
      return url.includes(window.location.hostname);
    } catch {
      return false;
    }
  }) || API_URLS[0];

const resolveAssetUrl = (val) => {
  const v = String(val ?? "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v) || v.startsWith("data:")) return v;
  const base = String(API_URL || "").replace(/\/+$/, "");
  let path = v.replace(/^\/+/, "");
  if (!path.startsWith("uploads/")) path = `uploads/${path}`;
  return `${base}/${path}`;
};

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

/* ----------------------- normalize header/footer config ----------------------- */
const normDate = (val) => {
  try {
    if (val == null || val === "") return "";
    return formatDate(val);
  } catch {
    try {
      const d = new Date(val);
      if (!isNaN(d)) return formatDate(d.toISOString());
    } catch {}
    return String(val ?? "");
  }
};

const normRevision = (val) => {
  if (val == null || val === "") return "";
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) {
    const str = String(val).trim();
    if (/^\d+$/.test(str)) return str.padStart(2, "0");
    return str;
  }
  return String(n).padStart(2, "0");
};

const buildLineStyle = (center, lineStyleRaw) => {
  const ls = lineStyleRaw || {};
  const baseFamily = center.fontFamily ?? "Inter, system-ui, sans-serif";
  const baseColor = center.color ?? "#000000";
  const baseBold = !!center.bold;
  const baseItalic = !!center.italic;
  const baseFontSizePx = Number(center.fontSize ?? 14);

  const fontFamily = ls.fontFamily ?? baseFamily;
  const fontSizePx =
    ls.fontSizePt != null ? ptToPx(ls.fontSizePt) : baseFontSizePx;
  const bold = ls.bold != null ? !!ls.bold : baseBold;
  const italic = ls.italic != null ? !!ls.italic : baseItalic;
  const color = ls.color ?? baseColor;

  return {
    fontFamily,
    fontSizePx,
    bold,
    italic,
    color,
  };
};

const getCfg = (cfg) => {
  const rawCenter = cfg?.header?.centerText || cfg?.center || {};
  const logos = cfg?.header?.logos || {};
  const headerMarginIn = Number(cfg?.headerMarginIn ?? cfg?.header?.marginIn ?? 0);
  const pageNumber = cfg?.footer?.pageNumber || {};
  const body = cfg?.footer?.body || {};

  const center = {
    enabled: rawCenter.enabled ?? true,
    line1: rawCenter.line1 ?? cfg?.center?.line1 ?? "Saint Louis University",
    line2: rawCenter.line2 ?? cfg?.center?.line2 ?? "",
    line3: rawCenter.line3 ?? cfg?.center?.line3 ?? "",
    line4: rawCenter.line4 ?? cfg?.center?.line4 ?? "",
    showLine4: !!(rawCenter.showLine4 ?? cfg?.center?.showLine4),
    fontFamily: rawCenter.fontFamily ?? "Inter, system-ui, sans-serif",
    fontSize: Number(rawCenter.fontSize ?? 14),
    bold: !!rawCenter.bold,
    italic: !!rawCenter.italic,
    color: rawCenter.color ?? "#000000",
    showHeaderLine: !!(rawCenter.showHeaderLine ?? cfg?.showHeaderLine),
  };

  // Per-line styles (safe even if not present) – this wires your HeaderLineStyleEditor
  center.line1Style = buildLineStyle(center, rawCenter.line1Style);
  center.line2Style = buildLineStyle(center, rawCenter.line2Style);
  center.line3Style = buildLineStyle(center, rawCenter.line3Style);
  center.line4Style = buildLineStyle(center, rawCenter.line4Style);

  return {
    headerEnabled: cfg?.headerEnabled !== undefined ? !!cfg.headerEnabled : true,
    footerEnabled: !!cfg?.footerEnabled,
    headerMarginIn,
    footerMarginIn: Number(cfg?.footerMarginIn ?? headerMarginIn),
    assets: cfg?.assets || {},
    center,
    logos: {
      slu: {
        enabled: !!(logos.slu?.enabled ?? cfg?.showSLULogo),
        sizePx: Number(logos.slu?.sizePx ?? 56),
        xPercent: Number(logos.slu?.xPercent ?? 6),
      },
      cicm: {
        enabled: !!(logos.cicm?.enabled ?? cfg?.showCICMLogo),
        sizePx: Number(logos.cicm?.sizePx ?? 52),
        xPercent: Number(logos.cicm?.xPercent ?? 94),
      },
    },
    stamp: {
      docCode:
        cfg?.documentStamp?.docCode ??

        cfg?.documentStamp?.document_code ??
        cfg?.documentStamp?.documentCode ??
        cfg?.document_code ??
        "",
      revisionNo: normRevision(
        cfg?.documentStamp?.revisionNo ??
          cfg?.documentStamp?.revision_no ??
          cfg?.documentStamp?.revisionNumber ??
          cfg?.documentStamp?.revision_number ??
          cfg?.revision_no ??
          cfg?.revisionNumber ??
          cfg?.revision_number ??
          ""
      ),
      effectivity: normDate(
        cfg?.documentStamp?.effectivity ??
          cfg?.documentStamp?.effectivity_date ??
          cfg?.effectivity ??
          ""
      ),
    },
    footer: {
      pageNumber: {
        enabled: !!pageNumber.enabled,
        pattern: pageNumber.pattern ?? "{page} of {total}",
        align: pageNumber.align ?? "center",
        fontFamily: pageNumber.fontFamily ?? "Inter, system-ui, sans-serif",
        fontSize: Number(pageNumber.fontSize ?? 12),
        bold: !!pageNumber.bold,
        italic: !!pageNumber.italic,
        color: pageNumber.color ?? "#000000",
      },
      body: {
        enabled: !!body.enabled,
        text: body.text ?? "",
        align: body.align ?? "left",
        fontFamily: body.fontFamily ?? "Inter, system-ui, sans-serif",
        fontSize: Number(body.fontSize ?? 12),
        bold: !!body.bold,
        italic: !!body.italic,
        color: body.color ?? "#000000",
      },
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

const stripDefaultPageNumber = (scopeEl) => {
  if (!scopeEl) return;
  scopeEl.querySelectorAll(".rm-page-number").forEach((n) => n.remove());
};

/* ---------------------------- dynamic header/footer --------------------------- */
const MIN_HEADER_FOOTER_PX = 120;
const getHeaderBasePx = (cfg) =>
  cfg.headerEnabled ? Math.max(MIN_HEADER_FOOTER_PX, inchToPx(cfg.headerMarginIn ?? 0)) : 0;
const getFooterBasePx = (cfg) =>
  cfg.footerEnabled ? Math.max(MIN_HEADER_FOOTER_PX, inchToPx(cfg.footerMarginIn ?? 0)) : 0;

/* ------------------------------ perf helpers -------------------------------- */
const makeRafBatcher = (fn) => {
  let id = 0;
  return (...args) => {
    if (id) cancelAnimationFrame(id);
    id = requestAnimationFrame(() => {
      id = 0;
      fn(...args);
    });
  };
};

/* --------------------------------- component --------------------------------- */
export default function TextEditor({
  content,
  pageSetup = DEFAULT_SETUP,
  onEditorReady,
  onContentChange,
  className = "",
  mode = "template", // "template" | "document"
  readOnly = false,
  headerConfig = {},
}) {
  const dimsRef = useRef(computeDims(pageSetup));
  const setPolicyRef = useRef(null);
  const observerRef = useRef(null);

  // initial header/footer height from headerConfig (wired)
  const initialHeaderH = getHeaderBasePx(getCfg(headerConfig));
  const initialFooterH = getFooterBasePx(getCfg(headerConfig));

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      TextStyleAttrs,
      Color,
      FontFamily,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph", "tableCell", "tableHeader"] }),
      Underline,
      Superscript,
      Subscript,

      EditableField,

      // ---- Table Plus (pagination + resize aligned) ----
      TablePlus.configure({ resizeHandleStyle: { width: "4px", opacity: 0.7 } }),
      TableRowPlus,
      TableCellBg,
      TableHeaderPlus,

      // ---- Pagination must come after the table nodes ----
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
      attributes: { class: "tiptap ProseMirror nd-editor-canvas rm-with-pagination" },
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
      requestAnimationFrame(() => applyHeaderFooterBands());
    },
    onUpdate: ({ editor }) => {
      onContentChange?.(editor.getHTML());
      requestAnimationFrame(() => applyHeaderFooterBands());
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
    requestAnimationFrame(() => applyHeaderFooterBands());
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
    requestAnimationFrame(() => applyHeaderFooterBands());
  }, [editor, headerConfig]);

  /* --------------------------- header/footer renderer ------------------------- */
  const ensureFlexBand = useCallback((bandEl, kind /* 'header' | 'footer' */) => {
    if (!bandEl) return null;
    const isFooter = kind === "footer" || bandEl.classList.contains("rm-page-footer");

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
      bandEl.querySelector(
        isFooter ? ":scope > .rm-page-footer-left" : ":scope > .rm-page-header-left"
      ) ||
      bandEl.querySelector(
        isFooter
          ? ":scope > .rm-first-page-footer-left"
          : ":scope > .rm-first-page-header-left"
      ) ||
      bandEl.querySelector(":scope > .nv-band-left");

    if (!left) {
      left = document.createElement("div");
      left.className = "nv-band-left";
      bandEl.insertBefore(left, bandEl.firstChild);
    }

    let right =
      bandEl.querySelector(
        isFooter ? ":scope > .rm-page-footer-right" : ":scope > .rm-page-header-right"
      ) ||
      bandEl.querySelector(
        isFooter
          ? ":scope > .rm-first-page-footer-right"
          : ":scope > .rm-first-page-header-right"
      ) ||
      bandEl.querySelector(":scope > .nv-band-right");

    if (!right) {
      right = document.createElement("div");
      right.className = "nv-band-right";
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
      center.style.flexDirection = isFooter ? "column" : "row";
      center.style.alignItems = "center";
      center.style.justifyContent = "center";
      center.style.gap = isFooter ? "2px" : "8px";
      center.style.textAlign = "center";
      bandEl.insertBefore(center, right);
    }

    bandEl
      .querySelectorAll(":scope > .nv-header-left, :scope > .nv-header-right")
      .forEach((el) => {
        if (el !== left && el !== right) el.remove();
      });

    return { left, center, right, bandEl };
  }, []);

  const renderHeaderContent = useCallback(
    (trip, cfg, pageNo, total) => {
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

      // LEFT: SLU logo (from cfg.assets.slu)
      if (cfg.logos.slu?.enabled && cfg.assets?.slu) {
        const sluImg = document.createElement("img");
        sluImg.src = resolveAssetUrl(cfg.assets.slu);
        sluImg.alt = "SLU";
        sluImg.style.height = px(cfg.logos.slu.sizePx || 56);
        sluImg.style.objectFit = "contain";
        sluImg.style.pointerEvents = "none";
        sluImg.style.userSelect = "none";
        trip.left.style.display = "flex";
        trip.left.style.alignItems = "center";
        trip.left.appendChild(sluImg);
      }

      // CENTER: header text block with per-line styles (wired to line1Style...line4Style)
      const c = cfg.center;

      const lineHtml = (txt, st) => {
        if (!txt) return "";
        const weight = st.bold ? 700 : 400;
        const styleStr =
          `font-family:${st.fontFamily};` +
          `color:${st.color};` +
          `font-size:${px(st.fontSizePx)};` +
          `font-style:${st.italic ? "italic" : "normal"};` +
          `font-weight:${weight};` +
          `line-height:1.15;` +
          `text-align:center;`;
        return `<div style="${styleStr}">${escapeHtml(txt)}</div>`;
      };

      const containerStyle =
        "display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;";

      trip.center.innerHTML = `
        <div class="nv-center-text" style="${containerStyle}">
          ${lineHtml(c.line1, c.line1Style)}
          ${lineHtml(c.line2, c.line2Style)}
          ${lineHtml(c.line3, c.line3Style)}
          ${c.showLine4 ? lineHtml(c.line4, c.line4Style) : ""}
        </div>
      `;

      // RIGHT: CICM logo + stamp card (CICM from cfg.assets.cicm)
      const rightRow = document.createElement("div");
      rightRow.style.display = "flex";
      rightRow.style.alignItems = "center";
      rightRow.style.gap = "8px";

      if (cfg.logos.cicm?.enabled && cfg.assets?.cicm) {
        const cicmImg = document.createElement("img");
        cicmImg.src = resolveAssetUrl(cfg.assets.cicm);
        cicmImg.alt = "CICM";
        cicmImg.style.height = px(cfg.logos.cicm.sizePx || 52);
        cicmImg.style.objectFit = "contain";
        cicmImg.style.pointerEvents = "none";
        cicmImg.style.userSelect = "none";
        rightRow.appendChild(cicmImg);
      }

      const hasDocCode = String(cfg.stamp.docCode || "").trim().length > 0;
      if (hasDocCode) {
        const card = document.createElement("div");
        card.style.border = "1px solid #000";
        card.style.fontSize = "11px";
        card.style.fontFamily = "Arial,sans-serif";
        card.style.background = "#fff";
        card.style.display = "flex";
        card.style.flexDirection = "column";

        const row = (label, value) => {
          const r = document.createElement("div");
          r.style.display = "flex";
          r.style.alignItems = "stretch";
          r.style.borderTop = "1px solid #000";
          const l = document.createElement("div");
          l.textContent = label;
          l.style.padding = "2px 6px";
          l.style.borderRight = "1px solid #000";
          const v = document.createElement("div");
          v.textContent = value;
          v.style.padding = "2px 6px";
          r.appendChild(l);
          r.appendChild(v);
          return r;
        };

        const first = document.createElement("div");
        first.style.display = "flex";
        const fl = document.createElement("div");
        fl.textContent = "Document Code";
        fl.style.padding = "2px 6px";
        fl.style.borderRight = "1px solid #000";
        const fv = document.createElement("div");
        fv.textContent = String(cfg.stamp.docCode);
        fv.style.padding = "2px 6px";
        first.appendChild(fl);
        first.appendChild(fv);
        card.appendChild(first);

        card.appendChild(row("Revision No.", String(cfg.stamp.revisionNo)));
        card.appendChild(row("Effectivity", String(cfg.stamp.effectivity)));
        card.appendChild(row("Page", `${pageNo} of ${total}`));

        rightRow.appendChild(card);
      }

      trip.right.appendChild(rightRow);

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

      autoFitBand(editor, trip.bandEl, "header", getHeaderBasePx(cfg));
    },
    [editor]
  );

  const pickSlot = (trip, align) => {
    if (align === "left") return trip.left;
    if (align === "right") return trip.right;
    return trip.center;
  };

  const renderFooterContent = useCallback(
    (trip, cfg, pageNo, total) => {
      trip.bandEl.style.visibility = cfg.footerEnabled ? "visible" : "hidden";
      if (!cfg.footerEnabled) {
        trip.left.innerHTML = "";
        trip.center.innerHTML = "";
        trip.right.innerHTML = "";
        return;
      }

      stripDefaultPageNumber(trip.bandEl);

      trip.left.innerHTML = "";
      trip.center.innerHTML = "";
      trip.right.innerHTML = "";

      const blockFor = (align) => {
        const host = pickSlot(trip, align);
        host.style.display = "flex";
        host.style.flexDirection = "column";
        host.style.alignItems =
          align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
        host.style.justifyContent = "center";
        host.style.gap = "2px";
        return host;
      };

      if (cfg.footer.pageNumber.enabled) {
        const pn = cfg.footer.pageNumber;
        const weight = pn.bold ? 700 : 400;
        const pnHost = blockFor(pn.align);
        const el = document.createElement("div");
        el.style.fontFamily = pn.fontFamily;
        el.style.fontSize = px(pn.fontSize);
        el.style.color = pn.color;
        el.style.fontStyle = pn.italic ? "italic" : "normal";
        el.style.fontWeight = weight;
        el.style.lineHeight = "1.2";
        el.textContent = (pn.pattern || "{page} of {total}")
          .replace("{page}", String(pageNo))
          .replace("{total}", String(total));
        pnHost.appendChild(el);

        if (cfg.footer.body.enabled && cfg.footer.body.align === pn.align && cfg.footer.body.text) {
          const b = cfg.footer.body;
          const w2 = b.bold ? 700 : 400;
          const el2 = document.createElement("div");
          el2.style.fontFamily = b.fontFamily;
          el2.style.fontSize = px(b.fontSize);
          el2.style.color = b.color;
          el2.style.fontStyle = b.italic ? "italic" : "normal";
          el2.style.fontWeight = w2;
          el2.style.lineHeight = "1.2";
          el2.style.whiteSpace = "pre-wrap";
          el2.textContent = b.text;
          pnHost.appendChild(el2);
        }
      }

      if (
        cfg.footer.body.enabled &&
        cfg.footer.body.text &&
        (!cfg.footer.pageNumber.enabled ||
          cfg.footer.body.align !== cfg.footer.pageNumber.align)
      ) {
        const b = cfg.footer.body;
        const host = blockFor(b.align);
        const w = b.bold ? 700 : 400;
        const el = document.createElement("div");
        el.style.fontFamily = b.fontFamily;
        el.style.fontSize = px(b.fontSize);
        el.style.color = b.color;
        el.style.fontStyle = b.italic ? "italic" : "normal";
        el.style.fontWeight = w;
        el.style.lineHeight = "1.2";
        el.style.whiteSpace = "pre-wrap";
        el.textContent = b.text;
        host.appendChild(el);
      }

      autoFitBand(editor, trip.bandEl, "footer", getFooterBasePx(cfg));
    },
    [editor]
  );

  /* ----------------------------- main apply pass ------------------------------ */
  const applyHeaderFooterBands = useMemo(
    () =>
      makeRafBatcher(() => {
        const root = document.querySelector(".rm-with-pagination");
        if (!root) return;

        const cfg = getCfg(headerConfig);

        const breakers = root.querySelectorAll(".rm-page-break");
        const total = breakers.length;

        const firstHeader = root.querySelector(".rm-first-page-header");
        if (firstHeader) {
          const trip = ensureFlexBand(firstHeader, "header");
          renderHeaderContent(trip, cfg, 1, total);
        }

        breakers.forEach((brk, i) => {
          const pageNo = i + 1;

          const footer = brk.querySelector(".rm-page-footer");
          if (footer) {
            stripDefaultPageNumber(footer);
            const tripF = ensureFlexBand(footer, "footer");
            renderFooterContent(tripF, cfg, pageNo, total);
          }

          const header = brk.querySelector(".rm-page-header");
          if (header && pageNo < total) {
            const trip = ensureFlexBand(header, "header");
            renderHeaderContent(trip, cfg, pageNo + 1, total);
          }
        });
      }),
    [headerConfig, ensureFlexBand, renderHeaderContent, renderFooterContent]
  );

  /* ---------------------------- observe pagination ---------------------------- */
  useEffect(() => {
    applyHeaderFooterBands();

    const root = document.querySelector(".rm-with-pagination");
    observerRef.current?.disconnect();
    if (root) {
      observerRef.current = new MutationObserver((muts) => {
        let needs = false;
        for (const m of muts) {
          if (m.type === "childList") {
            needs = true;
            break;
          }
        }
        if (needs) applyHeaderFooterBands();
      });
      observerRef.current.observe(root, { childList: true });
    }
    return () => observerRef.current?.disconnect();
  }, [editor, headerConfig, applyHeaderFooterBands]);

  /* ----------------------------------- ui ------------------------------------ */
  return (
    <div className={`flex justify-center my-6 ${className}`}>
      <div style={{ width: "816px" }}>
        {editor ? (
          <EditorContent editor={editor} className="prose max-w-none" />
        ) : (
          <div className="text-sm text-gray-500">Loading editor…</div>
        )}
      </div>
    </div>
  );
}

/* ------------------------- helpers that need editor ref ------------------------ */
function autoFitBand(editor, bandEl, kind, basePx) {
  if (!editor || !bandEl) return;
  const needed = Math.ceil(bandEl.scrollHeight);
  const next = Math.max(basePx, needed);
  const ext = editor.extensionManager.extensions.find((e) => e.name === "paginationPlus");
  if (!ext || !ext.options) return;
  const key = kind === "footer" ? "pageFooterHeight" : "pageHeaderHeight";
  if (ext.options[key] !== next) {
    ext.options[key] = next;
  }
}
