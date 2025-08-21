// src/extensions/template/BackspaceHandler.js
import { Extension } from "@tiptap/core";
import { Plugin, TextSelection } from "prosemirror-state";

/**
 * Backspace at Page start (N>1):
 * - If Page N is empty (single empty paragraph): delete the page and move caret to end of Page N-1
 * - Else: splice Page N content onto the end of Page N-1 and delete Page N
 * - Preserves selection; consumes the event
 */
export const BackspaceHandler = Extension.create({
  name: "backspaceHandler",
  priority: 1000,

  addProseMirrorPlugins() {
    const listPages = (doc) => {
      const pages = [];
      doc.descendants((node, pos) => {
        if (node.type?.name === "page") pages.push({ node, pos });
        return true;
      });
      return pages;
    };

    const isEmptyParagraph = (node) => node?.type?.name === "paragraph" && node.textContent.trim().length === 0;

    return [
      new Plugin({
        props: {
          handleKeyDown: (view, event) => {
            if (event.key !== "Backspace" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return false;

            const { state } = view;
            const { selection } = state;
            if (!selection.empty) return false;

            const $from = selection.$from;

            // Find the enclosing page depth
            let pageDepth = null;
            for (let d = $from.depth; d >= 0; d--) {
              const n = $from.node(d);
              if (n.type?.name === "page") { pageDepth = d; break; }
            }
            if (pageDepth == null) return false;
            const pagePos = $from.before(pageDepth);
            const pageNode = state.doc.nodeAt(pagePos);
            if (!pageNode) return false;

            // Are we at the very start of the FIRST child of this page?
            const isFirstChild = $from.index(pageDepth) === 0; // index within page's children
            const atStartOfNode = $from.parentOffset === 0;    // at start of the current node
            if (!(isFirstChild && atStartOfNode)) return false;

            // Identify previous page
            const pages = listPages(state.doc);
            const idx = pages.findIndex(p => p.pos === pagePos);
            if (idx <= 0) return false; // first page or not found
            const prev = pages[idx - 1];

            let tr = state.tr;
            const prevEnd = prev.pos + prev.node.nodeSize - 1; // before closing of prev page

            // If current page is empty (single empty paragraph), just delete the page
            const emptyPage = pageNode.childCount === 1 && isEmptyParagraph(pageNode.child(0));
            if (emptyPage) {
              tr = tr.delete(pagePos, pagePos + pageNode.nodeSize);
              const $near = tr.doc.resolve(Math.max(1, Math.min(prevEnd, tr.doc.content.size - 1)));
              tr = tr.setSelection(TextSelection.near($near, -1)).scrollIntoView();
              view.dispatch(tr); event.preventDefault(); return true;
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

            view.dispatch(tr);
            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
});

export default BackspaceHandler;
