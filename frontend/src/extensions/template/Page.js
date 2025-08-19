// src/extensions/template/Page.js
import { Node, mergeAttributes } from "@tiptap/core";

export const Page = Node.create({
  name: "page",
  group: "block",
  content: "block+",
  isolating: true,
  defining: true,

  addAttributes() {
    return { number: { default: null } };
  },

  parseHTML() {
    return [{ tag: 'section[data-type="nd-page"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-type": "nd-page",
        class: "nd-page",
      }),
      0,
    ];
  },
});
