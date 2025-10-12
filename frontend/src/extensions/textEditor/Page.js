// src/extensions/textEditor/Page.js
import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";

const PageConfigKey = new PluginKey("pageConfig");

// ---------------- Default configs ----------------
const DEFAULT_HEADER_CONFIG = {
  fields: {
    sluLogo: true,
    university: true,
    schoolName: true,
    title: true,
    documentStamp: true,
  },
  config: {
    university: { fontSize: 18, fontWeight: "bold", align: "center", color: "#000" },
    schoolName: { fontSize: 14, italic: true, align: "center", color: "#000" },
    title: {
      text: "Document Title",
      uppercase: false,
      fontSize: 16,
      fontWeight: "bold",
      align: "center",
      color: "#000",
    },
    documentStamp: {
      firstColumnFixed: ["Document Code", "Revision No.", "Effectivity", "Page"],
      secondColumnEditable: ["", "", "", ""],
      align: "right",
    },
  },
  // global spacing around header block (px)
  margins: { top: 12, bottom: 12 },
};

const DEFAULT_FOOTER_CONFIG = {
  fields: { pageNumber: true, date: true },
  align: "center",
  // global spacing around footer block (px)
  margins: { top: 12, bottom: 12 },
};

// ---------- helpers to read "active" config from editor storage ----------
/**
 * Preferred shape:
 *   editor.storage.pageHF.current = { headerConfig, footerConfig }
 *
 * Fallback mapping (best-effort):
 *   editor.storage.headerFooter.current = { header: {...}, footer: {...} }
 *   where we map showPageNumber/showDate -> fields.pageNumber/fields.date
 *   and reuse DEFAULT_HEADER_CONFIG with title text if available.
 */
function readActiveConfig(editor) {
  const pageHF = editor?.storage?.pageHF?.current;
  if (pageHF && pageHF.headerConfig && pageHF.footerConfig) {
    return {
      headerConfig: deepMerge(DEFAULT_HEADER_CONFIG, pageHF.headerConfig),
      footerConfig: deepMerge(DEFAULT_FOOTER_CONFIG, pageHF.footerConfig),
    };
  }

  const hf = editor?.storage?.headerFooter?.current;
  if (hf && (hf.header || hf.footer)) {
    const mappedHeader = mapSimpleHeaderToRich(hf.header);
    const mappedFooter = mapSimpleFooterToRich(hf.footer);
    return {
      headerConfig: deepMerge(DEFAULT_HEADER_CONFIG, mappedHeader),
      footerConfig: deepMerge(DEFAULT_FOOTER_CONFIG, mappedFooter),
    };
  }

  return {
    headerConfig: DEFAULT_HEADER_CONFIG,
    footerConfig: DEFAULT_FOOTER_CONFIG,
  };
}

function mapSimpleHeaderToRich(simpleHeader) {
  // simpleHeader example: { showLogo, logoUrl, showTitle, titleText, showDate, dateFormat }
  // We only map what we can confidently translate; keep the rest as defaults.
  const s = simpleHeader || {};
  const next = structuredClone(DEFAULT_HEADER_CONFIG);

  // logo: if simple header showLogo=false, hide the slot; if true, keep visible (we don’t store URL here)
  if (typeof s.showLogo === "boolean") next.fields.sluLogo = s.showLogo;

  // title block visibility & text
  if (typeof s.showTitle === "boolean") next.fields.title = s.showTitle;
  if (typeof s.titleText === "string" && s.titleText.trim()) {
    next.config.title.text = s.titleText.trim();
  }
  return next;
}

function mapSimpleFooterToRich(simpleFooter) {
  // simpleFooter example: { showPageNumber, showEmail, showDate, dateFormat }
  const s = simpleFooter || {};
  const next = structuredClone(DEFAULT_FOOTER_CONFIG);

  if (typeof s.showPageNumber === "boolean") next.fields.pageNumber = s.showPageNumber;
  if (typeof s.showDate === "boolean") next.fields.date = s.showDate;
  // we don’t render email in this rich footer; if you have one, add a field & renderer.
  return next;
}

// Poor-man deep merge for plain objects/arrays (enough for our config shapes)
function deepMerge(base, patch) {
  if (Array.isArray(base) && Array.isArray(patch)) return patch.slice();
  if (isObj(base) && isObj(patch)) {
    const out = { ...base };
    for (const k of Object.keys(patch)) {
      out[k] = k in base ? deepMerge(base[k], patch[k]) : patch[k];
    }
    return out;
  }
  return patch ?? base;
}
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

// -------------------------------------------------
export const Page = Node.create({
  name: "page",
  content: "block+",
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      number: { default: null },

      headerConfig: {
        default: DEFAULT_HEADER_CONFIG,
        parseHTML: el => {
          const raw = el.getAttribute("data-header-config");
          try { return raw ? JSON.parse(raw) : DEFAULT_HEADER_CONFIG; }
          catch { return DEFAULT_HEADER_CONFIG; }
        },
        renderHTML: attrs => ({
          "data-header-config": JSON.stringify(attrs.headerConfig || DEFAULT_HEADER_CONFIG),
        }),
      },

      footerConfig: {
        default: DEFAULT_FOOTER_CONFIG,
        parseHTML: el => {
          const raw = el.getAttribute("data-footer-config");
          try { return raw ? JSON.parse(raw) : DEFAULT_FOOTER_CONFIG; }
          catch { return DEFAULT_FOOTER_CONFIG; }
        },
        renderHTML: attrs => ({
          "data-footer-config": JSON.stringify(attrs.footerConfig || DEFAULT_FOOTER_CONFIG),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-type="nd-page"]' }];
  },

  // -------------------------------------------------
  renderHTML({ node, HTMLAttributes }) {
    const number = node.attrs.number;
    const headerConfig = node.attrs.headerConfig || DEFAULT_HEADER_CONFIG;
    const footerConfig = node.attrs.footerConfig || DEFAULT_FOOTER_CONFIG;

    const hFields = headerConfig.fields || {};
    const hCfg = headerConfig.config || {};
    const fFields = footerConfig.fields || {};

    const headerMarginTop = Number(headerConfig.margins?.top ?? 12);
    const headerMarginBottom = Number(headerConfig.margins?.bottom ?? 12);
    const footerMarginTop = Number(footerConfig.margins?.top ?? 12);
    const footerMarginBottom = Number(footerConfig.margins?.bottom ?? 12);

    const hasHeader =
      !!(hFields && (hFields.sluLogo || hFields.university || hFields.schoolName || hFields.title || hFields.documentStamp));
    const hasFooter =
      !!(fFields && (fFields.pageNumber || fFields.date));

    // conservative content-height estimates so body never collides with header/footer
    const EST_HEADER_CONTENT = 80; // px
    const EST_FOOTER_CONTENT = 50; // px

    const headerOffsetPx = hasHeader ? headerMarginTop + EST_HEADER_CONTENT + headerMarginBottom : 0;
    const footerOffsetPx = hasFooter ? footerMarginTop + EST_FOOTER_CONTENT + footerMarginBottom : 0;

    // ---------- HEADER (flex row: left / center / right) ----------
    // Left: SLU logo (placeholder)
    const leftCol = hFields.sluLogo
      ? [
          "div",
          { style: "width:72px;min-width:72px;display:flex;justify-content:center" },
          [
            "div",
            {
              class: "nd-h-logo",
              style:
                "width:64px;height:64px;border:1px dashed #cbd5e1;border-radius:6px;background:#f8fafc;display:grid;place-items:center;font-weight:600;color:#64748b",
            },
            "SLU",
          ],
        ]
      : ["div", { style: "width:72px;min-width:72px" }];

    // Center: University / School / Title stack
    const centerStack = [];

    if (hFields.university) {
      const s = hCfg.university || {};
      centerStack.push([
        "div",
        {
          style:
            `margin:2px 0;` +
            `font-weight:${s.fontWeight || "bold"};` +
            `font-size:${Number(s.fontSize ?? 18)}px;` +
            `color:${s.color || "#000"};`,
        },
        "Saint Louis University",
      ]);
    }

    if (hFields.schoolName) {
      const s = hCfg.schoolName || {};
      centerStack.push([
        "div",
        {
          style:
            `margin:2px 0;` +
            `font-style:${s.italic ? "italic" : "normal"};` +
            `font-size:${Number(s.fontSize ?? 14)}px;` +
            `color:${s.color || "#000"};`,
        },
        "School Name",
      ]);
    }

    if (hFields.title) {
      const s = hCfg.title || {};
      const baseText = typeof s.text === "string" && s.text.trim().length ? s.text : "Document Title";
      const txt = s.uppercase ? baseText.toUpperCase() : baseText;
      centerStack.push([
        "div",
        {
          style:
            `margin:6px 0 0;` +
            `font-weight:${s.fontWeight || "bold"};` +
            `font-size:${Number(s.fontSize ?? 16)}px;` +
            `color:${s.color || "#000"};` +
            `letter-spacing:.3px;`,
        },
        txt,
      ]);
    }

    const centerCol = [
      "div",
      { style: "flex:1;min-width:0;text-align:center;line-height:1.2;padding:0 8px" },
      ...centerStack,
    ];

    // Right: Document Stamp (4x2)
    let rightCol = ["div", { style: "width:280px;min-width:240px" }];
    if (hFields.documentStamp) {
      const s = hCfg.documentStamp || {};
      const labels = Array.isArray(s.firstColumnFixed) && s.firstColumnFixed.length
        ? s.firstColumnFixed : ["Document Code", "Revision No.", "Effectivity", "Page"];
      const values = Array.isArray(s.secondColumnEditable) ? s.secondColumnEditable : ["", "", "", ""];
      const rows = labels.slice(0, 4).map((label, i) => [
        "tr",
        {},
        [
          "td",
          {
            style:
              "padding:6px 10px;border:1px solid #cbd5e1;white-space:nowrap;font-weight:600;background:#f8fafc",
          },
          label,
        ],
        [
          "td",
          { style: "padding:6px 10px;border:1px solid #cbd5e1;min-width:140px" },
          /^page$/i.test(String(label).trim()) && number != null ? `Page ${number}` : (values[i] ?? ""),
        ],
      ]);
      rightCol = [
        "div",
        { style: "width:280px;min-width:240px;display:flex;justify-content:flex-end" },
        ["table", { style: "border-collapse:collapse;font-size:12px;color:#0f172a" }, ["tbody", {}, ...rows]],
      ];
    }

    const headerNode = [
      "header",
      {
        class: "nd-header",
        style:
          "display:flex;align-items:flex-start;justify-content:space-between;gap:12px;" +
          `margin-top:${headerMarginTop}px;margin-bottom:${headerMarginBottom}px;flex:0 0 auto`,
      },
      leftCol,
      centerCol,
      rightCol,
    ];

    // ---------- FOOTER ----------
    const fAlign = footerConfig.align || "center";
    const footerText = [];
    if (fFields.pageNumber && number != null) footerText.push(`Page ${number}`);
    if (fFields.date) footerText.push(new Date().toLocaleDateString());

    const footerNode = [
      "footer",
      {
        class: "nd-footer",
        style:
          `text-align:${fAlign};` +
          `margin-top:${footerMarginTop}px;margin-bottom:${footerMarginBottom}px;flex:0 0 auto`,
      },
      footerText.join(" · "),
    ];

    // ---------- RETURN ----------
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-type": "nd-page",
        class: "nd-page",
      }),
      [
        "div",
        { class: "nd-page-inner" },
        headerNode,
        [
          "div",
          {
            class: "nd-content",
            // reserve space for header/footer so the body never overlaps them
            style: `padding-top:${headerOffsetPx}px;padding-bottom:${footerOffsetPx}px`,
          },
          0,
        ],
        footerNode,
      ],
    ];
  },

  // -------------------------------------------------
  addCommands() {
    return {
      // Insert a page at selection end, inheriting "active" header/footer config
      insertPageWithConfig:
        (attrs = {}) =>
        ({ state, tr, dispatch, editor }) => {
          const type = state.schema.nodes.page;
          if (!type) return false;

          const { headerConfig, footerConfig } = readActiveConfig(editor);
          const node = type.create(
            { ...attrs, headerConfig, footerConfig },
            state.schema.nodes.paragraph.create() // ensure non-empty content
          );

          const { to } = state.selection;
          tr.insert(to, node).setMeta("addToHistory", false);
          if (dispatch) dispatch(tr.scrollIntoView());
          return true;
        },

      // Apply the given header/footer config to ALL pages
      applyHeaderFooterToAllPages:
        (config) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          const nextHeader = config?.headerConfig || config?.header || DEFAULT_HEADER_CONFIG;
          const nextFooter = config?.footerConfig || config?.footer || DEFAULT_FOOTER_CONFIG;

          let transaction = tr;
          doc.descendants((n, pos) => {
            if (n.type.name === "page") {
              transaction = transaction.setNodeMarkup(pos, undefined, {
                ...n.attrs,
                headerConfig: deepMerge(n.attrs.headerConfig || DEFAULT_HEADER_CONFIG, nextHeader),
                footerConfig: deepMerge(n.attrs.footerConfig || DEFAULT_FOOTER_CONFIG, nextFooter),
              });
            }
          });

          if (dispatch) {
            dispatch(transaction);
            const pluginState = PageConfigKey.getState(state);
            if (pluginState) {
              pluginState.currentConfig = {
                headerConfig: nextHeader,
                footerConfig: nextFooter,
              };
            }
          }
          return true;
        },
    };
  },

  // -------------------------------------------------
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: PageConfigKey,
        state: {
          init: () => ({ currentConfig: null }),
          apply(tr, value) {
            // Keep any external state if needed
            return value;
          },
        },
        appendTransaction(trs, oldState, newState) {
          // Detect if document is empty and seed a first page with active config
          if (oldState.doc.content.size === 0 && newState.doc.content.size === 0) return null;

          const type = newState.schema.nodes.page;
          if (!type) return null;

          let tr = newState.tr;
          let changed = false;

          // 1) Seed: if doc has no pages, insert one with active config
          const hasPage = (() => {
            let found = false;
            newState.doc.descendants(n => {
              if (n.type === type) { found = true; return false; }
              return true;
            });
            return found;
          })();

          if (!hasPage) {
            const editor = this.spec.editor; // bind editor via plugin factory below
            const { headerConfig, footerConfig } = readActiveConfig(editor);
            const firstPage = type.create(
              { headerConfig, footerConfig },
              newState.schema.nodes.paragraph.create()
            );
            tr = tr.insert(0, firstPage).setMeta("addToHistory", false);
            changed = true;
          }

          // 2) Normalize: ensure every page has header/footer config
          //    If missing, inherit from active config (or last seen page config).
          const editor = this.spec.editor;
          const active = readActiveConfig(editor);

          newState.doc.descendants((n, pos) => {
            if (n.type !== type) return;

            const needsHeader = !n.attrs?.headerConfig;
            const needsFooter = !n.attrs?.footerConfig;

            if (needsHeader || needsFooter) {
              const nextHeader = needsHeader ? active.headerConfig : n.attrs.headerConfig;
              const nextFooter = needsFooter ? active.footerConfig : n.attrs.footerConfig;
              tr = tr.setNodeMarkup(pos, type, { ...n.attrs, headerConfig: nextHeader, footerConfig: nextFooter }, n.marks);
              changed = true;
            }
          });

          return changed ? tr : null;
        },
      }, { editor: this.editor }), // pass editor instance into plugin spec
    ];
  },
});

export default Page;
