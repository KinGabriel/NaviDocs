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
  // ✅ Global header margins (px) — spacing between page padding and header/content
  margins: { top: 12, bottom: 12 },
};

const DEFAULT_FOOTER_CONFIG = {
  fields: { pageNumber: true, date: true },
  align: "center",
  // ✅ Global footer margins (px) — spacing between content/footer and page padding
  margins: { top: 12, bottom: 12 },
};

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
        parseHTML: el =>
          el.getAttribute("data-header-config")
            ? JSON.parse(el.getAttribute("data-header-config"))
            : DEFAULT_HEADER_CONFIG,
        renderHTML: attrs => ({
          "data-header-config": JSON.stringify(attrs.headerConfig || DEFAULT_HEADER_CONFIG),
        }),
      },

      footerConfig: {
        default: DEFAULT_FOOTER_CONFIG,
        parseHTML: el =>
          el.getAttribute("data-footer-config")
            ? JSON.parse(el.getAttribute("data-footer-config"))
            : DEFAULT_FOOTER_CONFIG,
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
    const {
      number,
      headerConfig = DEFAULT_HEADER_CONFIG,
      footerConfig = DEFAULT_FOOTER_CONFIG,
    } = node.attrs;

    const hFields = headerConfig.fields || {};
    const hCfg = headerConfig.config || {};
    const headerMarginTop = headerConfig.margins?.top ?? 12;
    const headerMarginBottom = headerConfig.margins?.bottom ?? 12;

    // ---------- HEADER (flex row: left / center / right) ----------
    // Left: SLU logo
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
            `font-size:${s.fontSize || 18}px;` +
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
            `font-size:${s.fontSize || 14}px;` +
            `color:${s.color || "#000"};`,
        },
        "School Name",
      ]);
    }
    if (hFields.title) {
      const s = hCfg.title || {};
      const txt = s.uppercase ? String(s.text || "").toUpperCase() : (s.text || "Document Title");
      centerStack.push([
        "div",
        {
          style:
            `margin:6px 0 0;` +
            `font-weight:${s.fontWeight || "bold"};` +
            `font-size:${s.fontSize || 16}px;` +
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

    // Right: Document Stamp table
    let rightCol = ["div", { style: "width:280px;min-width:240px" }];
    if (hFields.documentStamp) {
      const s = hCfg.documentStamp || {};
      const labels = s.firstColumnFixed || ["Document Code", "Revision No.", "Effectivity", "Page"];
      const values = s.secondColumnEditable || ["", "", "", ""];
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
          // If label is "Page", we can show current page; total pages can be added later by a post-pass
          /^page$/i.test(label.trim()) && number != null ? `Page ${number}` : (values[i] ?? ""),
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
          "display:flex;align-items:flex-start;justify-content:space-between;" +
          `gap:12px;margin-top:${headerMarginTop}px;margin-bottom:${headerMarginBottom}px`,
      },
      leftCol,
      centerCol,
      rightCol,
    ];

    // ---------- FOOTER ----------
    const fFields = footerConfig.fields || {};
    const fAlign = footerConfig.align || "center";
    const footerMarginTop = footerConfig.margins?.top ?? 12;
    const footerMarginBottom = footerConfig.margins?.bottom ?? 12;
    const footerText = [];
    if (fFields.pageNumber && number) footerText.push(`Page ${number}`);
    if (fFields.date) footerText.push(new Date().toLocaleDateString());

    const footerNode = [
      "footer",
      {
        class: "nd-footer",
        style: `text-align:${fAlign};margin-top:${footerMarginTop}px;margin-bottom:${footerMarginBottom}px`,
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
        ["div", { class: "nd-content" }, 0],
        footerNode,
      ],
    ];
  },

  // -------------------------------------------------
  addCommands() {
    return {
      applyHeaderFooterToAllPages:
        (config) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          const nextHeader = config?.header || DEFAULT_HEADER_CONFIG;
          const nextFooter = config?.footer || DEFAULT_FOOTER_CONFIG;

          const transaction = tr;
          doc.descendants((node, pos) => {
            if (node.type.name === "page") {
              transaction.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                headerConfig: nextHeader,
                footerConfig: nextFooter,
              });
            }
          });

          if (dispatch) {
            dispatch(transaction);
            const pluginState = PageConfigKey.getState(state);
            if (pluginState) {
              pluginState.currentConfig = { header: nextHeader, footer: nextFooter };
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
          apply(_tr, value) {
            return value;
          },
        },
        appendTransaction(_trs, _old, newState) {
          const pluginState = PageConfigKey.getState(newState);
          if (!pluginState || !pluginState.currentConfig) return null;

          const { header, footer } = pluginState.currentConfig;
          let tr = newState.tr;
          let changed = false;

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== "page") return;
            const {
              headerConfig = DEFAULT_HEADER_CONFIG,
              footerConfig = DEFAULT_FOOTER_CONFIG,
            } = node.attrs;

            const needsHeader =
              !headerConfig || JSON.stringify(headerConfig) === JSON.stringify(DEFAULT_HEADER_CONFIG);
            const needsFooter =
              !footerConfig || JSON.stringify(footerConfig) === JSON.stringify(DEFAULT_FOOTER_CONFIG);

            if (needsHeader || needsFooter) {
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                headerConfig: needsHeader ? header : node.attrs.headerConfig,
                footerConfig: needsFooter ? footer : node.attrs.footerConfig,
              });
              changed = true;
            }
          });

          return changed ? tr : null;
        },
      }),
    ];
  },
});

export default Page;
