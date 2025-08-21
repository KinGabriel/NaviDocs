// src/extensions/template/Page.js
import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Top-level Page container. Not in the generic 'block' group to prevent nesting
 * pages inside pages. Each page holds normal block content.
 */
export const Page = Node.create({
  name: "page",
  // No group => page is only allowed where the schema explicitly permits it (top-level)
  content: "block+",
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      number: { default: null }, // optional, not used by core
    };
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

export default Page;