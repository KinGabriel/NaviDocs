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
  const s = simpleHeader || {};
  const next = structuredClone(DEFAULT_HEADER_CONFIG);

  if (typeof s.showLogo === "boolean") next.fields.sluLogo = s.showLogo;
  if (typeof s.showTitle === "boolean") next.fields.title = s.showTitle;
  if (typeof s.titleText === "string" && s.titleText.trim()) {
    next.config.title.text = s.titleText.trim();
  }
  if (s.margins && (s.margins.top != null || s.margins.bottom != null)) {
    next.margins = {
      top: Number(s.margins.top ?? next.margins.top),
      bottom: Number(s.margins.bottom ?? next.margins.bottom),
    };
  }
  return next;
}

function mapSimpleFooterToRich(simpleFooter) {
  const s = simpleFooter || {};
  const next = structuredClone(DEFAULT_FOOTER_CONFIG);

  if (typeof s.showPageNumber === "boolean") next.fields.pageNumber = s.showPageNumber;
  if (typeof s.showDate === "boolean") next.fields.date = s.showDate;
  if (s.margins && (s.margins.top != null || s.margins.bottom != null)) {
    next.margins = {
      top: Number(s.margins.top ?? next.margins.top),
      bottom: Number(s.margins.bottom ?? next.margins.bottom),
    };
  }
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

      // Simple attrs (used by AutoPaginator + panel)
      header: { default: null },
      footer: { default: null },

      // Rich attrs (for visual rendering)
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

      // Dimensions (useful for CSS var setup if needed)
      widthPx: { default: 816 },   // ~8.5in @96dpi
      heightPx: { default: 1056 }, // ~11in @96dpi (tweak for A4 if you want)
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-type="nd-page"]' }];
  },

  // -------------------------------------------------
  renderHTML({ node, HTMLAttributes }) {
    const number = node.attrs.number;

    // 1) Derive effective rich configs from either simple or rich attrs
    const simpleH = node.attrs.header;
    const simpleF = node.attrs.footer;
    const richH = node.attrs.headerConfig || DEFAULT_HEADER_CONFIG;
    const richF = node.attrs.footerConfig || DEFAULT_FOOTER_CONFIG;

    const headerConfig = simpleH ? mapSimpleHeaderToRich(simpleH) : richH;
    const footerConfig = simpleF ? mapSimpleFooterToRich(simpleF) : richF;

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

    const pageW = Number(node.attrs.widthPx || 816);
    const pageH = Number(node.attrs.heightPx || 1056);

    // ---------- HEADER (flex row: left / center / right) ----------
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
          { style: "padding:6px 10px;border:1px solid #cbd5e1;white-space:nowrap;font-weight:600;background:#f8fafc" },
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

    const headerNode = hasHeader
      ? [
          "div",
          {
            class: "nd-page__header",
            style:
              "display:flex;align-items:flex-start;justify-content:space-between;gap:12px;" +
              `margin-top:${headerMarginTop}px;margin-bottom:${headerMarginBottom}px;`,
          },
          leftCol,
          centerCol,
          rightCol,
        ]
      : ["div", { class: "nd-page__header", style: "display:none" }];

    // ---------- FOOTER ----------
    const fAlign = footerConfig.align || "center";
    const footerText = [];
    if (fFields.pageNumber && number != null) footerText.push(`Page ${number}`);
    if (fFields.date) footerText.push(new Date().toLocaleDateString());

    const footerNode = hasFooter
      ? [
          "div",
          {
            class: "nd-page__footer",
            style:
              `text-align:${fAlign};` +
              `margin-top:${footerMarginTop}px;margin-bottom:${footerMarginBottom}px;`,
          },
          footerText.join(" · "),
        ]
      : ["div", { class: "nd-page__footer", style: "display:none" }];

    // ---------- RETURN ----------
    // Body wrapper is the ONLY place that holds block content (slot 0).
    // AutoPaginator must measure .nd-page__body (no inner scrolling).
    const styleVars = `--paper-width:${pageW}px;--paper-height:${pageH}px;`;

    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-type": "nd-page",
        class: "nd-page",
        style: styleVars,
      }),
      headerNode,
      [
        "div",
        {
          class: "nd-page__body pm-page-content",
          "data-page-content": "true",
          style: "overflow:visible;box-sizing:border-box;", // no inner scrollbar
        },
        0,
      ],
      footerNode,
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
            {
              ...attrs,
              headerConfig,
              footerConfig,
            },
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
              // Keep both shapes in sync: simple + rich
              const headerConfig = mapSimpleHeaderToRich(nextHeader);
              const footerConfig = mapSimpleFooterToRich(nextFooter);

              transaction = transaction.setNodeMarkup(pos, undefined, {
                ...n.attrs,
                header: nextHeader,
                footer: nextFooter,
                headerConfig: deepMerge(n.attrs.headerConfig || DEFAULT_HEADER_CONFIG, headerConfig),
                footerConfig: deepMerge(n.attrs.footerConfig || DEFAULT_FOOTER_CONFIG, footerConfig),
              });
            }
          });

          if (dispatch) {
            dispatch(transaction.setMeta("paginatorReflow", true));
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
            return value;
          },
        },
        // AutoPaginator remains the seeder; we just normalize attributes here.
        appendTransaction(_trs, _old, newState) {
          const type = newState.schema.nodes.page;
          if (!type) return null;

          let tr = newState.tr;
          let changed = false;

          const editor = this.spec.editor;
          const active = readActiveConfig(editor);

          newState.doc.descendants((n, pos) => {
            if (n.type !== type) return;

            const needsSimpleH = !n.attrs?.header;
            const needsSimpleF = !n.attrs?.footer;
            const needsRichH = !n.attrs?.headerConfig;
            const needsRichF = !n.attrs?.footerConfig;

            if (needsSimpleH || needsSimpleF || needsRichH || needsRichF) {
              const header = needsSimpleH ? { margins: active.headerConfig.margins } : n.attrs.header;
              const footer = needsSimpleF ? { margins: active.footerConfig.margins } : n.attrs.footer;

              tr = tr.setNodeMarkup(
                pos,
                type,
                {
                  ...n.attrs,
                  header,
                  footer,
                  headerConfig: needsRichH ? active.headerConfig : n.attrs.headerConfig,
                  footerConfig: needsRichF ? active.footerConfig : n.attrs.footerConfig,
                },
                n.marks
              );
              changed = true;
            }
          });

          return changed ? tr : null;
        },
      }, { editor: this.editor }),
    ];
  },
});

export default Page;
