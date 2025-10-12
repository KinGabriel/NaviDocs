// src/extensions/template/AutoPaginator.js
import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";

/**
 * AutoPaginator — frame-scheduled + hysteresis, single-block move.
 * - Schedules pagination at most once per animation frame.
 * - Moves EXACTLY one trailing block forward per run — by creating a NEW page
 *   whose content is that block (no placeholder empty page).
 * - Requires overflow to persist ≥2 frames unless overflow ≥32px.
 * - Cleans empty trailing pages. No state reconfigure; no history spam.
 *
 * Added:
 * - [HF] New pages inherit header/footer attrs from (a) the page they split from,
 *        or (b) editor.storage.headerFooter.current (active panel config), or (c) safe defaults.
 */
export const AutoPaginator = Extension.create({
  name: "autoPaginator",

  addProseMirrorPlugins() {
    const editor = this.editor; // [HF] access active editor storage

    const rafIdByView = new WeakMap();            // per-view RAF id
    const running = new WeakSet();                // per-view reentrancy guard
    const overflowCountsByView = new WeakMap();   // per-view Map<pagePos, count>
    const bootSkips = new WeakMap();              // per-view initial update skips

    // [HF] safe defaults if nothing is configured yet
    const DEFAULT_HF = {
      header: {
        showLogo: false,
        logoUrl: "",
        showTitle: false,
        titleText: "",
        showDate: false,
        dateFormat: "MMMM d, yyyy",
      },
      footer: {
        showPageNumber: true,
        showEmail: false,
        showDate: false,
        dateFormat: "MMMM d, yyyy",
      },
    };

    // [HF] read current panel config from editor storage
    const getActiveHF = () =>
      editor?.storage?.headerFooter?.current || DEFAULT_HF;

    // [HF] build attrs for a new/normalized page
    const buildPageAttrs = (baseAttrs, fromPageAttrs) => {
      const active = getActiveHF();
      const next = { ...(baseAttrs || {}) };

      next.header = {
        ...DEFAULT_HF.header,
        ...(active.header || {}),
        ...(fromPageAttrs?.header || {}),
        ...(baseAttrs?.header || {}),
      };

      next.footer = {
        ...DEFAULT_HF.footer,
        ...(active.footer || {}),
        ...(fromPageAttrs?.footer || {}),
        ...(baseAttrs?.footer || {}),
      };

      return next;
    };

    const ensureCounts = (view) => {
      let m = overflowCountsByView.get(view);
      if (!m) { m = new Map(); overflowCountsByView.set(view, m); }
      return m;
    };

    const listPages = (doc) => {
      const pages = [];
      doc.descendants((node, pos) => {
        if (node.type?.name === "page") pages.push({ node, pos });
        return true;
      });
      return pages;
    };

    const overflowPx = (dom) => {
      if (!(dom instanceof HTMLElement)) return 0;
      const diff = dom.scrollHeight - dom.clientHeight;
      return diff > 0 ? diff : 0;
    };

    const clamp = (doc, pos) => Math.max(0, Math.min(pos, doc.content.size));

    /**
     * Move the LAST block of the page at `pagePos` to a NEW page inserted
     * immediately after the current page. The new page's content is that block
     * (no empty paragraph placeholder). Returns the updated transaction.
     *
     * [HF] The new page inherits header/footer attrs (priority: source page attrs → active panel → defaults).
     */
    const moveLastBlockToNewPage = (state, tr, pagePos) => {
      const { schema } = state;

      // Work off the current tr.doc so we can keep mapping coherent
      const doc0 = tr.doc;
      const page0 = doc0.nodeAt(pagePos);
      if (!page0 || page0.type.name !== "page") return tr;
      if (page0.childCount <= 1) return tr; // keep at least one block in the page

      // Compute the range of the last child inside this page
      const lastIndex = page0.childCount - 1;
      let lastStart = pagePos + 1;
      for (let i = 0; i < lastIndex; i++) lastStart += page0.child(i).nodeSize;
      const lastEnd = lastStart + page0.child(lastIndex).nodeSize;

      // Slice that single block
      const blockSlice = doc0.slice(lastStart, lastEnd);
      if (blockSlice.size === 0) return tr;

      // 1) Delete the last block from the current page
      tr = tr.delete(clamp(tr.doc, lastStart), clamp(tr.doc, lastEnd));

      // 2) Compute the position just AFTER the current page (after the delete)
      const mappedPagePos = tr.mapping.map(pagePos, 1);
      const pageAfterDelete = tr.doc.nodeAt(mappedPagePos);
      if (!pageAfterDelete || pageAfterDelete.type.name !== "page") return tr;
      const insertPos = mappedPagePos + pageAfterDelete.nodeSize; // sibling position

      // 3) Build a new page node with the moved block as its only child
      // [HF] inherit attrs from the source page (pageAfterDelete reflects the same page after deletion)
      const inheritedAttrs = buildPageAttrs({}, pageAfterDelete.attrs);
      const newPage = schema.nodes.page.create(inheritedAttrs, blockSlice.content);

      // 4) Insert the new page as a sibling after the current page
      tr = tr.insert(clamp(tr.doc, insertPos), newPage);

      // This is automatic layout housekeeping — keep history clean
      tr.setMeta("addToHistory", false);

      return tr;
    };

    const paginateNow = (view) => {
      if (running.has(view)) return;
      running.add(view);

      try {
        const counts = ensureCounts(view);
        const { state } = view;

        // Bootstrap: skip first 2 updates to let CSS/DOM settle
        const seen = bootSkips.get(view) ?? 0;
        if (seen < 2) { bootSkips.set(view, seen + 1); return; }

        // Seed first page ONLY if truly empty
        const pages0 = listPages(state.doc);
        if (state.doc.content.size === 0 && pages0.length === 0) {
          const p = state.schema.nodes.paragraph.create();

          // [HF] seed first page with active HF attrs
          const seedAttrs = buildPageAttrs({}, null);
          const firstPage = state.schema.nodes.page.create(seedAttrs, [p]);

          const tr0 = state.tr.insert(0, firstPage).setMeta("addToHistory", false);
          view.dispatch(tr0.setMeta("autoPaginator", "init"));
          counts.clear();
          return;
        }

        // Overflow handling (one move max per run)
        const HARD_OVERFLOW_PX = 32;
        const SOFT_OVERFLOW_PX = 10;
        const REQUIRED_FRAMES = 2;

        for (let i = 0; i < pages0.length; i++) {
          const { pos, node } = pages0[i];
          if (node.childCount <= 1) continue;

          const dom = view.nodeDOM(pos);
          if (!dom) continue;

          const over = overflowPx(dom);

          // Hard overflow → move immediately
          if (over >= HARD_OVERFLOW_PX) {
            const tr1 = moveLastBlockToNewPage(state, state.tr, pos);
            if (tr1.doc !== state.doc) {
              view.dispatch(tr1.setMeta("autoPaginator", "move"));
              counts.clear();
              return;
            }
          }
          // Soft overflow → require persistence for a couple frames
          else if (over > SOFT_OVERFLOW_PX) {
            const prev = counts.get(pos) ?? 0;
            const now = prev + 1;
            counts.set(pos, now);
            if (now >= REQUIRED_FRAMES) {
              const tr2 = moveLastBlockToNewPage(state, state.tr, pos);
              if (tr2.doc !== state.doc) {
                view.dispatch(tr2.setMeta("autoPaginator", "move"));
                counts.clear();
                return;
              }
            }
          } else {
            // reset if no meaningful overflow
            if (counts.has(pos)) counts.delete(pos);
          }
        }

        // Cleanup empty trailing pages (keep first)
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
          counts.clear();
          return;
        }
      } finally {
        running.delete(view);
      }
    };

    const schedule = (view) => {
      if (rafIdByView.get(view)) return;
      const id = requestAnimationFrame(() => {
        rafIdByView.delete(view);
        paginateNow(view);
      });
      rafIdByView.set(view, id);
    };

    return [
      new Plugin({
        view: (view) => ({
          update: () => schedule(view),      // run at most once per frame
          destroy: () => {
            const id = rafIdByView.get(view);
            if (id) cancelAnimationFrame(id);
            rafIdByView.delete(view);
            overflowCountsByView.delete(view);
            bootSkips.delete(view);
          },
        }),
        appendTransaction: (trs, _old, newState) => {
          // Reflow trigger (e.g., pageSetup change)
          const reflow = trs.some(t => t.getMeta("paginatorReflow"));
          if (!reflow) return null;

          // [HF] Normalize any page missing header/footer (e.g., after external paste)
          const { schema } = newState;
          const pageType = schema.nodes.page;
          if (!pageType) return newState.tr;

          let tr = newState.tr;
          let changed = false;
          const active = getActiveHF();

          newState.doc.descendants((node, pos) => {
            if (node.type === pageType) {
              const hasHeader = !!node.attrs?.header;
              const hasFooter = !!node.attrs?.footer;
              if (!hasHeader || !hasFooter) {
                const attrs = buildPageAttrs(node.attrs, node.attrs);
                tr = tr.setNodeMarkup(pos, pageType, attrs, node.marks);
                changed = true;
              }
            }
          });

          return changed ? tr : newState.tr; // still returns a no-op to force view.update -> schedule
        },
      }),
    ];
  },
});

export default AutoPaginator;
