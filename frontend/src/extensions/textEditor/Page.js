// src/extensions/template/Page.js
import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";

const PageConfigKey = new PluginKey("pageConfig");

export const Page = Node.create({
  name: "page",
  content: "block+",
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      number: { default: null },

      headerFields: {
        default: { fullName: true, studentId: false, university: false, school: false },
        parseHTML: el =>
          el.getAttribute("data-header-fields")
            ? JSON.parse(el.getAttribute("data-header-fields"))
            : {},
        renderHTML: attrs => ({
          "data-header-fields": JSON.stringify(attrs.headerFields),
        }),
      },
      headerAlign: {
        default: "left",
        parseHTML: el => el.getAttribute("data-header-align") || "left",
        renderHTML: attrs => ({ "data-header-align": attrs.headerAlign }),
      },

      footerFields: {
        default: { pageNumber: false, date: false },
        parseHTML: el =>
          el.getAttribute("data-footer-fields")
            ? JSON.parse(el.getAttribute("data-footer-fields"))
            : {},
        renderHTML: attrs => ({
          "data-footer-fields": JSON.stringify(attrs.footerFields),
        }),
      },
      footerAlign: {
        default: "center",
        parseHTML: el => el.getAttribute("data-footer-align") || "center",
        renderHTML: attrs => ({ "data-footer-align": attrs.footerAlign }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-type="nd-page"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { headerFields, headerAlign, footerFields, footerAlign, number } = node.attrs;

    let headerText = [];
    if (headerFields.fullName) headerText.push("Full Name");
    if (headerFields.studentId) headerText.push("Student ID");
    if (headerFields.university) headerText.push("University");
    if (headerFields.school) headerText.push("School");

    let footerText = [];
    if (footerFields.pageNumber && number) footerText.push(`Page ${number}`);
    if (footerFields.date) footerText.push(new Date().toLocaleDateString());

    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-type": "nd-page",
        class: "nd-page",
      }),
      [
        "div",
        { class: "nd-page-inner" },
        ["header", { class: "nd-header", style: `text-align:${headerAlign}` }, headerText.join(" · ")],
        ["div", { class: "nd-content" }, 0],
        ["footer", { class: "nd-footer", style: `text-align:${footerAlign}` }, footerText.join(" · ")],
      ],
    ];
  },

  addCommands() {
    return {
      applyHeaderFooterToAllPages:
        config =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          const transaction = tr;

          doc.descendants((node, pos) => {
            if (node.type.name === "page") {
              transaction.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                headerFields: config.header.fields,
                headerAlign: config.header.align,
                footerFields: config.footer.fields,
                footerAlign: config.footer.align,
              });
            }
          });

          if (dispatch) {
            dispatch(transaction);

            // Update plugin state with latest config
            const pluginState = PageConfigKey.getState(state);
            if (pluginState) {
              pluginState.currentConfig = config;
            }
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: PageConfigKey,
        state: {
          init: () => ({ currentConfig: null }),
          apply(tr, value) {
            // keep current config unchanged unless command updates it
            return value;
          },
        },
        appendTransaction(transactions, oldState, newState) {
          const pluginState = PageConfigKey.getState(newState);
          if (!pluginState || !pluginState.currentConfig) return null;

          const cfg = pluginState.currentConfig;
          let tr = newState.tr;
          let changed = false;

          newState.doc.descendants((node, pos) => {
            if (node.type.name === "page") {
              const { headerFields, footerFields } = node.attrs;
              // if page still looks like defaults, overwrite
              if (
                JSON.stringify(headerFields) ===
                  JSON.stringify({ fullName: true, studentId: false, university: false, school: false }) &&
                JSON.stringify(footerFields) ===
                  JSON.stringify({ pageNumber: false, date: false })
              ) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  headerFields: cfg.header.fields,
                  headerAlign: cfg.header.align,
                  footerFields: cfg.footer.fields,
                  footerAlign: cfg.footer.align,
                });
                changed = true;
              }
            }
          });

          return changed ? tr : null;
        },
      }),
    ];
  },
});

export default Page;
