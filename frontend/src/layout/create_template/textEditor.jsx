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
  headerConfig = {},
}) {
  const dimsRef = useRef(computeDims(pageSetup));
  const setPolicyRef = useRef(null);
  const observerRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
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
      RichImage.configure({ onOpenImageOptions: () => {} }),
      EditableField,
      PaginationPlus.configure({
        pageGap: 24,
        pageGapBorderSize: 1,
        pageBreakBackground: "#ececec",
      }),
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
      editor.setEditable(!readOnly);
      onEditorReady?.(editor);

      requestAnimationFrame(applyHeaderFooterBands);
    },
    onUpdate: ({ editor }) => {
      onContentChange?.(editor.getHTML());
      queueMicrotask(() => requestAnimationFrame(applyHeaderFooterBands));
    },
  });

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

  const ensureFlexBand = (bandEl) => {
    if (!bandEl) return null;
    bandEl.style.display = "flex";
    bandEl.style.alignItems = "center";
    bandEl.style.justifyContent = "space-between";
    bandEl.style.gap = "16px";
    bandEl.style.padding = "0 24px";
    bandEl.style.height = "96px";
    bandEl.style.boxSizing = "border-box";
    bandEl.style.position = "relative";
    bandEl.style.background = "white";

    let left =
      bandEl.querySelector(":scope > .rm-page-header-left") ||
      bandEl.querySelector(":scope > .rm-first-page-header-left") ||
      bandEl.querySelector(":scope > [class$='-left']");
    if (!left) {
      left = document.createElement("div");
      left.className = "nv-header-left";
      bandEl.insertBefore(left, bandEl.firstChild);
    }

    let right =
      bandEl.querySelector(":scope > .rm-page-header-right") ||
      bandEl.querySelector(":scope > .rm-first-page-header-right") ||
      bandEl.querySelector(":scope > [class$='-right']");
    if (!right) {
      right = document.createElement("div");
      right.className = "nv-header-right";
      bandEl.appendChild(right);
    }
    // 🟩 Make sure logo + stamp align side-by-side
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
      center.style.flexDirection = "column";
      center.style.alignItems = "center";
      center.style.textAlign = "center";
      center.style.lineHeight = "1.15";
      center.style.fontFamily = "Arial, sans-serif";
      bandEl.insertBefore(center, right);
    }

    return { left, center, right, bandEl };
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
      if (footer) renderFooter(footer, pageNo, total);
      const header = brk.querySelector(".rm-page-header");
      if (header && pageNo < total) {
        const trip = ensureFlexBand(header);
        renderHeaderContent(trip, headerConfig, pageNo + 1, total);
      }
    });
  };

  const renderHeaderContent = (trip, cfg, pageNo, total) => {
    if (!trip) return;
    const c = cfg?.center || {};
    const showSLU = cfg?.showSLULogo && cfg?.assets?.slu;
    const showCICM = cfg?.showCICMLogo && cfg?.assets?.cicm;
    const d = cfg?.documentStamp || {};
    const docCode = d.docCode || cfg?.document_code || "";
    const revisionNo = d.revisionNo || cfg?.revision_no || "";
    const effectivity = d.effectivity || cfg?.effectivity || "";

    // LEFT: SLU logo
    trip.left.innerHTML = showSLU
      ? `<img src="${cfg.assets.slu}" alt="SLU" style="height:56px;object-fit:contain;">`
      : "";

    // CENTER
    trip.center.innerHTML = `
      <div style="font-weight:700;font-size:13px;">${c.line1 || "Saint Louis University"}</div>
      ${c.line2 ? `<div style="font-weight:700;font-size:14px;text-decoration:underline;">${c.line2}</div>` : ""}
      ${c.line3 ? `<div style="font-size:12px;">${c.line3}</div>` : ""}
      ${c.line4 ? `<div style="font-weight:700;font-size:13px;">${c.line4}</div>` : ""}
    `;

    // RIGHT: CICM logo next to stamp table
    trip.right.innerHTML = `
      ${showCICM ? `<img src="${cfg.assets.cicm}" alt="CICM" style="height:52px;object-fit:contain;flex:0 0 auto;">` : ""}
      <table style="flex:0 0 auto;border:1px solid #000;border-collapse:collapse;font-size:11px;font-family:Arial,sans-serif;background:#fff;">
        <tr><td style="border:1px solid #000;padding:2px 6px;">Document Code</td><td style="border:1px solid #000;padding:2px 6px;">${escapeHtml(docCode)}</td></tr>
        <tr><td style="border:1px solid #000;padding:2px 6px;">Revision No.</td><td style="border:1px solid #000;padding:2px 6px;">${escapeHtml(String(revisionNo))}</td></tr>
        <tr><td style="border:1px solid #000;padding:2px 6px;">Effectivity</td><td style="border:1px solid #000;padding:2px 6px;">${escapeHtml(String(effectivity))}</td></tr>
        <tr><td style="border:1px solid #000;padding:2px 6px;">Page</td><td style="border:1px solid #000;padding:2px 6px;">${pageNo} of ${total}</td></tr>
      </table>
    `;

    const wantLine = !!cfg.showHeaderLine;
    let line = trip.bandEl.querySelector(":scope > .nv-header-line");
    if (wantLine && !line) {
      line = document.createElement("div");
      line.className = "nv-header-line";
      line.style.position = "absolute";
      line.style.left = "0";
      line.style.right = "0";
      line.style.bottom = "0";
      line.style.height = "1px";
      line.style.background = "#000";
      trip.bandEl.appendChild(line);
    } else if (!wantLine && line) {
      line.remove();
    }
  };

  const renderFooter = (footer, pageNo, total) => {
    footer.style.display = "flex";
    footer.style.justifyContent = "center";
    footer.style.alignItems = "center";
    footer.style.height = "40px";
    footer.innerHTML = `<div style="font-family:Arial;font-size:12px;">Page ${pageNo} of ${total}</div>`;
  };

  const escapeHtml = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  useEffect(() => {
    requestAnimationFrame(applyHeaderFooterBands);
    const root = document.querySelector(".rm-with-pagination");
    observerRef.current?.disconnect();
    if (root) {
      observerRef.current = new MutationObserver((muts) => {
        const relevant = muts.some((m) =>
          [...m.addedNodes, ...m.removedNodes].some(
            (n) =>
              n instanceof HTMLElement &&
              (n.matches?.(".rm-page-break, .rm-first-page-header, .rm-page-header, .rm-page-footer") ||
                n.querySelector?.(".rm-page-break, .rm-first-page-header, .rm-page-header, .rm-page-footer"))
          )
        );
        if (relevant) requestAnimationFrame(applyHeaderFooterBands);
      });
      observerRef.current.observe(root, { subtree: true, childList: true });
    }
    return () => observerRef.current?.disconnect();
  }, [editor, headerConfig]);

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
