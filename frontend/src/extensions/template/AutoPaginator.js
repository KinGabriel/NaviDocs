// src/extensions/template/AutoPaginator.js
import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";

/**
 * AutoPaginator — incremental, DOM-aware pagination with hysteresis.
 * - Moves EXACTLY one trailing block forward only after overflow persisted
 *   for 2 consecutive update cycles (hysteresis), OR when overflow is large.
 * - Cleans empty trailing pages.
 * - Never reconfigures editor state; guards re-entrancy.
 */
export const AutoPaginator = Extension.create({
  name: "autoPaginator",

  addProseMirrorPlugins() {
    const running = new WeakSet();                // per-view reentrancy
    const bootCount = new WeakMap();              // per-view initial updates to skip
    const stateByView = new WeakMap();            // per-view transient state

    const ensureState = (view) => {
      let st = stateByView.get(view);
      if (!st) {
        st = {
          // remember small/persistent overflow per page pos
          overflowCounts: new Map(), // pos -> count of consecutive overflows
        };
        stateByView.set(view, st);
      }
      return st;
    };

    const clamp = (doc, pos) => Math.max(0, Math.min(pos, doc.content.size));

    const listPages = (doc) => {
      const pages = [];
      doc.descendants((node, pos) => {
        if (node.type?.name === "page") pages.push({ node, pos });
        return true;
      });
      return pages;
    };

    // Return overflow amount in pixels (0 if none)
    const overflowPx = (dom) => {
      if (!(dom instanceof HTMLElement)) return 0;
      const diff = dom.scrollHeight - dom.clientHeight;
      return diff > 0 ? diff : 0;
    };

    const makeEmptyPage = (schema) => {
      const p = schema.nodes.paragraph.create();
      return schema.nodes.page.create({}, [p]);
    };

    const moveOneBlockToNextPage = (state, tr, pagePos) => {
      const workingDoc0 = tr.doc;
      const page0 = workingDoc0.nodeAt(pagePos);
      if (!page0 || page0.type.name !== "page") return tr;
      if (page0.childCount <= 1) return tr; // keep at least one block

      // Range of last child inside page0
      const lastIndex = page0.childCount - 1;
      let lastStart = pagePos + 1;
      for (let i = 0; i < lastIndex; i++) lastStart += page0.child(i).nodeSize;
      const lastEnd = lastStart + page0.child(lastIndex).nodeSize;

      // Ensure next page exists BEFORE mapping
      const afterPos0 = pagePos + page0.nodeSize;
      const nodeAfter = workingDoc0.nodeAt(afterPos0);
      if (!nodeAfter || nodeAfter.type.name !== "page") {
        tr = tr.insert(clamp(tr.doc, afterPos0), makeEmptyPage(state.schema));
      }

      // Recompute against the current tr.doc
      const mappedPagePos = tr.mapping.map(pagePos, 1);
      const workingDoc = tr.doc;
      const curPage = workingDoc.nodeAt(mappedPagePos);
      if (!curPage || curPage.type.name !== "page") return tr;

      if (curPage.childCount <= 1) return tr;
      const curLastIndex = curPage.childCount - 1;
      let curLastStart = mappedPagePos + 1;
      for (let i = 0; i < curLastIndex; i++) curLastStart += curPage.child(i).nodeSize;
      const curLastEnd = curLastStart + curPage.child(curLastIndex).nodeSize;

      const nextPagePos = mappedPagePos + curPage.nodeSize;
      const nextPage = workingDoc.nodeAt(nextPagePos);
      if (!nextPage || nextPage.type.name !== "page") return tr;
      const nextStart = clamp(workingDoc, nextPagePos + 1);

      const slice = workingDoc.slice(curLastStart, curLastEnd);

      // Delete last block from current page
      tr = tr.delete(clamp(tr.doc, curLastStart), clamp(tr.doc, curLastEnd));
      // Insert at start of next page
      const mappedInsert = tr.mapping.map(nextStart, 1);
      tr = tr.replaceRange(clamp(tr.doc, mappedInsert), clamp(tr.doc, mappedInsert), slice);

      // Don't spam undo history with auto moves
      tr.setMeta("addToHistory", false);

      return tr;
    };

    const paginateOnce = (view) => {
      if (running.has(view)) return false;
      running.add(view);
      try {
        // Skip a couple of startup updates while CSS/apply kicks in
        const seen = bootCount.get(view) ?? 0;
        if (seen < 2) { bootCount.set(view, seen + 1); return false; }

        const st = ensureState(view);
        const { state } = view;

        // If truly empty, seed a first page
        const pages0 = listPages(state.doc);
        if (state.doc.content.size === 0 && pages0.length === 0) {
          const tr0 = state.tr.insert(0, makeEmptyPage(state.schema)).setMeta("addToHistory", false);
          view.dispatch(tr0.setMeta("autoPaginator", "init"));
          st.overflowCounts.clear();
          return true;
        }

        // PASS 1: overflow handling with hysteresis
        const HARD_OVERFLOW_PX = 32;  // if >= this, move immediately
        const SOFT_OVERFLOW_PX = 10;  // below this, ignore
        const REQUIRED_TICKS = 2;     // must persist this many ticks

        for (let i = 0; i < pages0.length; i++) {
          const { pos, node } = pages0[i];
          if (node.childCount <= 1) continue;

          const dom = view.nodeDOM(pos);
          if (!dom) continue;

          const over = overflowPx(dom);

          if (over >= HARD_OVERFLOW_PX) {
            const tr1 = moveOneBlockToNextPage(state, state.tr, pos);
            if (tr1.doc !== state.doc) {
              view.dispatch(tr1.setMeta("autoPaginator", "move"));
              st.overflowCounts.clear();
              return true;
            }
          } else if (over > SOFT_OVERFLOW_PX) {
            const prev = st.overflowCounts.get(pos) ?? 0;
            const now = prev + 1;
            st.overflowCounts.set(pos, now);
            if (now >= REQUIRED_TICKS) {
              const tr2 = moveOneBlockToNextPage(state, state.tr, pos);
              if (tr2.doc !== state.doc) {
                view.dispatch(tr2.setMeta("autoPaginator", "move"));
                st.overflowCounts.clear();
                return true;
              }
            }
          } else {
            // no meaningful overflow — reset counter for this page
            if (st.overflowCounts.has(pos)) st.overflowCounts.delete(pos);
          }
        }

        // PASS 2: cleanup empty trailing pages (keep first)
        const pagesAfter = listPages(state.doc);
        let tr3 = state.tr;
        let removed = false;
        for (let i = pagesAfter.length - 1; i >= 1; i--) {
          const { node, pos } = pagesAfter[i];
          if (node.childCount === 0) {
            tr3 = tr3.delete(pos, pos + node.nodeSize);
            removed = true;
          }
        }
        if (removed) {
          view.dispatch(tr3.setMeta("addToHistory", false).setMeta("autoPaginator", "cleanup"));
          st.overflowCounts.clear();
          return true;
        }

        return false;
      } finally {
        running.delete(view);
      }
    };

    return [
      new Plugin({
        view: (view) => ({
          update: () => { paginateOnce(view); },
          destroy: () => { bootCount.delete(view); stateByView.delete(view); },
        }),
        appendTransaction: (trs, _old, newState) => {
          // Reflow trigger (e.g., pageSetup change)
          const reflow = trs.some(t => t.getMeta("paginatorReflow"));
          if (!reflow) return null;
          return newState.tr; // no-op, causes a view.update
        },
      }),
    ];
  },
});

export default AutoPaginator;
