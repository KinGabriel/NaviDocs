// src/extensions/template/BackspaceAcrossPages.js
import { Extension } from "@tiptap/core";
import { Plugin, TextSelection } from "prosemirror-state";

const isWsPara = (node) =>
  node &&
  node.type?.name === "paragraph" &&
  (node.textContent || "").replace(/\u00a0/g, "").trim().length === 0;

export const BackspaceAcrossPages = Extension.create({
  name: "backspaceAcrossPages",
  priority: 1000, // ensure it runs before StarterKit keymaps
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleKeyDown(view, event) {
            if (event.key !== "Backspace") return false;

            const { state } = view;
            if (!state.selection.empty) return false;

            const { $from } = state.selection;
            if (!$from.parent.isTextblock || $from.parentOffset !== 0) return false;

            // climb to containing page
            let d = $from.depth;
            while (d > 0 && $from.node(d).type.name !== "page") d--;
            if (d === 0) return false;

            // must be in first child of the page
            if ($from.index(d) !== 0) return false;

            const pagePos  = $from.before(d);
            const pageNode = $from.node(d);

            // require a pageBreak immediately before
            const $before   = state.doc.resolve(pagePos);
            const breakNode = $before.nodeBefore;
            if (!breakNode || breakNode.type.name !== "pageBreak") return false;

            // previous page (left of the break)
            const $beforeBreak = state.doc.resolve(pagePos - breakNode.nodeSize);
            const prevPage = $beforeBreak.nodeBefore;
            if (!prevPage || prevPage.type.name !== "page") return false;

            const prevPageEnd = pagePos - breakNode.nodeSize;
            let tr = state.tr;

            // 1) trim trailing whitespace-only paragraphs on previous page
            let trim = 0;
            for (let i = prevPage.childCount - 1; i >= 0; i--) {
              const ch = prevPage.child(i);
              if (isWsPara(ch)) trim += ch.nodeSize; else break;
            }
            if (trim > 0) tr.delete(prevPageEnd - trim, prevPageEnd);

            // 2) move current page content to end of previous page
            const curContentStart = pagePos + 1;
            const curContentEnd   = pagePos + pageNode.nodeSize - 1;
            const slice = state.doc.slice(curContentStart, curContentEnd);
            const insertAt = tr.mapping.map(prevPageEnd - trim);
            tr = tr.replaceRange(insertAt, insertAt, slice);

            // 3) remove [pageBreak + now-empty page wrapper]
            const delFrom = tr.mapping.map(pagePos - breakNode.nodeSize);
            const delTo   = tr.mapping.map(pagePos + pageNode.nodeSize);
            tr = tr.delete(delFrom, delTo);

            // 4) put caret at the join point
            const $sel = tr.doc.resolve(Math.max(1, Math.min(insertAt, tr.doc.content.size - 1)));
            tr = tr.setSelection(TextSelection.near($sel, -1)).scrollIntoView();

            view.dispatch(tr);
            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
});

export default BackspaceAcrossPages;
