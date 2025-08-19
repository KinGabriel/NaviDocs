// src/extensions/template/PageBreak.js
import { Node } from "@tiptap/core";

export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: false,

  parseHTML: () => [{ tag: 'hr[data-page-break]' }],
  renderHTML: () => ["hr", { "data-page-break": "true", class: "nd-page-break" }],

  addCommands() {
    return {
      insertPageBreak:
        () =>
        ({ state, dispatch }) => {
          const { $from } = state.selection;
          if (!dispatch) return false;
          dispatch(state.tr.insert($from.pos, this.type.create()));
          return true;
        },
    };
  },
});
