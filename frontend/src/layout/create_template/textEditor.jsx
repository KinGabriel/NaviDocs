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
import { formatDate } from "../../utils/formatters.jsx";

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

// Env-aware API base
const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");
const API_URL = API_URLS.find((url) => url.includes(window.location.hostname)) || API_URLS[0];

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
const { TablePlus, TableRowPlus, TableCellPlus, TableHeaderPlus } = PaginationTable;

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

const getCfg = (cfg) => {
  const center = cfg?.header?.centerText || cfg?.center || {};
  const logos = cfg?.header?.logos || {};
  const headerMarginIn = Number(cfg?.headerMarginIn ?? cfg?.header?.marginIn ?? 0);
  const pageNumber = cfg?.footer?.pageNumber || {};
  const body = cfg?.footer?.body || {};
  return {
    headerEnabled: !!cfg?.headerEnabled,
    footerEnabled: !!cfg?.footerEnabled,
    headerMarginIn,
    footerMarginIn: Number(cfg?.footerMarginIn ?? headerMarginIn),
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
const MIN_HEADER_FOOTER_PX = 90;
const getHeaderBasePx = (cfg) =>
  cfg.headerEnabled ? Math.max(MIN_HEADER_FOOTER_PX, inchToPx(cfg.headerMarginIn ?? 0)) : 0;
const getFooterBasePx = (cfg) =>
  cfg.footerEnabled ? Math.max(MIN_HEADER_FOOTER_PX, inchToPx(cfg.footerMarginIn ?? 0)) : 0;

const autoFitBand = (editor, bandEl, kind, basePx) => {
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
  mode = "template", // "template" | "document"
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
      // include table cell & header so alignment menus can target table nodes
      TextAlign.configure({ types: ["heading", "paragraph", "tableCell", "tableHeader"] }),
      Underline,
      Superscript,
      Subscript,

      // Table with pagination support (as per Tiptap Plus docs)
      TablePlus.configure({
        resizeHandleStyle: { width: "3px" }, // doc-style example; just handle styling
      }),
      TableRowPlus,
      TableCellPlus,
      TableHeaderPlus,

      RichImage.configure({ onOpenImageOptions: () => {} }),

      // Editable field node (atom + caret placed after on insert)
      EditableField,

      // Pagination and page bands
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
      // Install lock policy plugin once; keep a setter to flip at runtime
      const { plugin, setPolicy } = createLockOutsideFieldsPlugin({
        initialPolicy: mode === "document" ? "document" : "template",
        nodeTypeName: "editableField",
        keyName: "lock-outside-fields",
      });
      setPolicyRef.current = setPolicy;
      editor.registerPlugin(plugin);

      // Respect readOnly flag
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

  // Flip edit policy depending on mode
  useEffect(() => {
    if (!setPolicyRef.current) return;
    setPolicyRef.current(mode === "document" ? "document" : "template");
  }, [mode]);

  // Apply page size/margins
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

  // Safe external content set (avoid matchesNode null by briefly disabling policy)
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
  const ensureFlexBand = (bandEl, kind /* 'header' | 'footer' */) => {
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
      bandEl.querySelector(isFooter ? ":scope > .rm-page-footer-left" : ":scope > .rm-page-header-left") ||
      bandEl.querySelector(isFooter ? ":scope > .rm-first-page-footer-left" : ":scope > .rm-first-page-header-left") ||
      bandEl.querySelector(":scope > .nv-band-left");

    if (!left) {
      left = document.createElement("div");
      left.className = "nv-band-left";
      bandEl.insertBefore(left, bandEl.firstChild);
    }

    let right =
      bandEl.querySelector(isFooter ? ":scope > .rm-page-footer-right" : ":scope > .rm-page-header-right") ||
      bandEl.querySelector(isFooter ? ":scope > .rm-first-page-footer-right" : ":scope > .rm-first-page-header-right") ||
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

    bandEl.querySelectorAll(":scope > .nv-header-left, :scope > .nv-header-right").forEach((el) => {
      if (el !== left && el !== right) el.remove();
    });

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

    // LEFT: SLU logo
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

    // CENTER: header text block
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

    // RIGHT: CICM + stamp table
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

    autoFitBand(editor, trip.bandEl, "header", getHeaderBasePx(getCfg(headerConfig)));
  };

  const pickSlot = (trip, align) => {
    if (align === "left") return trip.left;
    if (align === "right") return trip.right;
    return trip.center;
  };

  const renderFooterContent = (trip, rawCfg, pageNo, total) => {
    const cfg = getCfg(rawCfg);
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

    autoFitBand(editor, trip.bandEl, "footer", getFooterBasePx(getCfg(headerConfig)));
  };

  const applyHeaderFooterBands = () => {
    const root = document.querySelector(".rm-with-pagination");
    if (!root) return;
    const breakers = root.querySelectorAll(".rm-page-break");
    const total = breakers.length;

    const firstHeader = root.querySelector(".rm-first-page-header");
    if (firstHeader) {
      const trip = ensureFlexBand(firstHeader, "header");
      renderHeaderContent(trip, headerConfig, 1, total);
    }

    breakers.forEach((brk, i) => {
      const pageNo = i + 1;

      const footer = brk.querySelector(".rm-page-footer");
      if (footer) {
        stripDefaultPageNumber(footer);
        const tripF = ensureFlexBand(footer, "footer");
        renderFooterContent(tripF, headerConfig, pageNo, total);
      }

      const header = brk.querySelector(".rm-page-header");
      if (header && pageNo < total) {
        const trip = ensureFlexBand(header, "header");
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
