// src/extensions/template/BackspaceHandler.js
import { Extension } from "@tiptap/core";
import { TextSelection } from "prosemirror-state";

/**
 * Backspace at Page start (N>1):
 * - If Page N is empty (single empty paragraph): delete the page and place caret at end of Page N-1
 * - Else: splice Page N content into end of Page N-1, delete Page N, keep caret near join
 * Registered as a keyboard shortcut with high priority so it runs before StarterKit keymaps.
 */
export const BackspaceHandler = Extension.create({
  name: "backspaceHandler",
  priority: 1000,

  addKeyboardShortcuts() {
    const isEmptyParagraph = (node) =>
      node?.type?.name === "paragraph" && node.textContent.trim().length === 0;

    const listPages = (doc) => {
      const pages = [];
      doc.descendants((node, pos) => {
        if (node.type?.name === "page") pages.push({ node, pos });
        return true;
      });
      return pages;
    };

    return {
      Backspace: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;

        // Only when the selection is a caret
        if (!selection.empty) return false;

        const $from = selection.$from;

        // Find containing page depth
        let pageDepth = null;
        for (let d = $from.depth; d >= 0; d--) {
          const n = $from.node(d);
          if (n.type?.name === "page") { pageDepth = d; break; }
        }
        if (pageDepth == null) return false;

        const pagePos = $from.before(pageDepth);
        const pageNode = state.doc.nodeAt(pagePos);
        if (!pageNode) return false;

        // Robust "at start of page" detection:
        // caret in first child & at its start (allow off-by-one near the page start)
        const inFirstChild = $from.index(pageDepth) === 0;
        const atStartOfNode = $from.parentOffset === 0;
        const pageStart = $from.start(pageDepth);
        const nearPageStart = selection.from === pageStart || selection.from === pageStart + 1;

        if (!(inFirstChild && (atStartOfNode || nearPageStart))) return false;

        // Identify previous page
        const pages = listPages(state.doc);
        const idx = pages.findIndex(p => p.pos === pagePos);
        if (idx <= 0) return false; // first page or not found
        const prev = pages[idx - 1];

        let tr = state.tr;
        const prevEnd = prev.pos + prev.node.nodeSize - 1; // before close of prev page

        // If current page is empty (single empty paragraph), just delete it
        const emptyPage = pageNode.childCount === 1 && isEmptyParagraph(pageNode.child(0));
        if (emptyPage) {
          tr = tr.delete(pagePos, pagePos + pageNode.nodeSize);
          const $near = tr.doc.resolve(Math.max(1, Math.min(prevEnd, tr.doc.content.size - 1)));
          tr = tr.setSelection(TextSelection.near($near, -1)).scrollIntoView();
          view.dispatch(tr); // keep in history (user intent)
          return true; // consume
        }

        // Otherwise splice all content of current page into previous page
        const contentFrom = pagePos + 1;
        const contentTo = pagePos + pageNode.nodeSize - 1;
        const slice = state.doc.slice(contentFrom, contentTo);

        tr = tr.replaceRange(prevEnd, prevEnd, slice);
        const mappedCurrent = tr.mapping.map(pagePos);
        const mappedNode = tr.doc.nodeAt(mappedCurrent);
        if (mappedNode?.type?.name === "page") {
          tr = tr.delete(mappedCurrent, mappedCurrent + mappedNode.nodeSize);
        }

        const afterInsertEnd = tr.mapping.map(prevEnd + slice.size);
        const $near = tr.doc.resolve(Math.max(1, Math.min(afterInsertEnd, tr.doc.content.size - 1)));
        tr = tr.setSelection(TextSelection.near($near, -1)).scrollIntoView();

        view.dispatch(tr); // keep in history (user intent)
        return true; // consume
      },
    };
  },
});

export default BackspaceHandler;
