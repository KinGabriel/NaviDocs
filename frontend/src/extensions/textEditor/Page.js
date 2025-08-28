// src/extensions/template/Page.js
import { Node, mergeAttributes } from "@tiptap/core";

export const Page = Node.create({
  name: "page",
  content: "block+",
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      number: { default: null },

      // Header config
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

      // Footer config
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

    // Build header text
    let headerText = [];
    if (headerFields.fullName) headerText.push("Full Name");
    if (headerFields.studentId) headerText.push("Student ID");
    if (headerFields.university) headerText.push("University");
    if (headerFields.school) headerText.push("School");

    // Build footer text
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
        ["div", { class: "nd-content" }, 0], // content hole in its own container ✅
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

          if (dispatch) dispatch(transaction);
          return true;
        },
    };
  },
});

export default Page;
