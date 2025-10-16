// src/extensions/textEditor/AutoPaginator.js
import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";

export const AutoPaginator = Extension.create({
  name: "autoPaginator",

  addProseMirrorPlugins() {
    const editor = this.editor;

    // Per-view state
    const rafIdByView = new WeakMap();
    const running = new WeakSet();
    const overflowCountsByView = new WeakMap();
    const bootSkips = new WeakMap();
    const seededFirstPage = new WeakSet();

    // Active header/footer fallbacks (simple shape)
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

    const getActiveHF = () => editor?.storage?.headerFooter?.current || DEFAULT_HF;

    // Compose attrs so the new page inherits active HF and source page’s attrs
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

    // Ensure per-view overflow counters map
    const ensureCounts = (view) => {
      let m = overflowCountsByView.get(view);
      if (!m) { m = new Map(); overflowCountsByView.set(view, m); }
      return m;
    };

    // List page nodes with positions
    const listPages = (doc) => {
      const pages = [];
      doc.descendants((node, pos) => {
        if (node.type?.name === "page") pages.push({ node, pos });
        return true;
      });
      return pages;
    };

    // Prefer the printable body area for measuring overflow
    const getPageMeasureEl = (pageDom) => {
      if (!(pageDom instanceof HTMLElement)) return null;
      return (
        pageDom.querySelector?.(".nd-page__body") ||
        pageDom.querySelector?.(".pm-page-content") ||
        pageDom.querySelector?.("[data-page-content]") ||
        pageDom
      );
    };

    // Tolerant overflow detection (handles sub-pixel jitter)
    const overflowPx = (pageDom) => {
      const el = getPageMeasureEl(pageDom);
      if (!(el instanceof HTMLElement)) return 0;
      // IMPORTANT: body wrapper must NOT be scrollable; compare content vs box
      const diff = el.scrollHeight - el.clientHeight;
      if (diff >= 1) return diff;          // clear overflow
      if (diff > -1 && diff < 1) return 0; // within +/-1px, treat as fit
      return 0;
    };

    const clamp = (doc, pos) => Math.max(0, Math.min(pos, doc.content.size));
    const isEmptyParagraph = (node) =>
      node?.type?.name === "paragraph" && node.content.size === 0;

    /**
     * Move the LAST block of the page at `pagePos` to a NEW page right after it.
     * Empty paragraph moves are allowed only when we detected real overflow.
     */
    const moveLastBlockToNewPage = (state, tr, pagePos, allowEmptyMove = false) => {
      const { schema } = state;
      const doc0 = tr.doc;
      const page0 = doc0.nodeAt(pagePos);
      if (!page0 || page0.type.name !== "page") return tr;
      if (page0.childCount <= 1) return tr; // keep at least one block in the page

      const lastIndex = page0.childCount - 1;
      const lastNode = page0.child(lastIndex);
      if (isEmptyParagraph(lastNode) && !allowEmptyMove) return tr;

      // Compute absolute positions of the last child within this page
      let lastStart = pagePos + 1;
      for (let i = 0; i < lastIndex; i++) lastStart += page0.child(i).nodeSize;
      const lastEnd = lastStart + lastNode.nodeSize;

      const slice = doc0.slice(lastStart, lastEnd);
      if (slice.size === 0) return tr;

      // Delete that block from current page
      tr = tr.delete(clamp(tr.doc, lastStart), clamp(tr.doc, lastEnd));

      // Map the original page position after deletion
      const mappedPagePos = tr.mapping.map(pagePos, 1);
      const pageAfterDelete = tr.doc.nodeAt(mappedPagePos);
      if (!pageAfterDelete || pageAfterDelete.type.name !== "page") return tr;

      // Insert a new page after current page, with inherited attrs
      const insertPos = mappedPagePos + pageAfterDelete.nodeSize;
      const inheritedAttrs = buildPageAttrs({}, pageAfterDelete.attrs);
      const newPage = schema.nodes.page.create(inheritedAttrs, slice.content);

      tr = tr.insert(clamp(tr.doc, insertPos), newPage);
      tr.setMeta("addToHistory", false);
      return tr;
    };

    // Main paginator loop (rAF)
    const paginateNow = (view) => {
      if (running.has(view)) return;
      running.add(view);
      try {
        const counts = ensureCounts(view);
        const { state } = view;

        // Allow a couple frames for layout to settle on boot
        const seen = bootSkips.get(view) ?? 0;
        if (seen < 2) { bootSkips.set(view, seen + 1); return; }

        // Seed the first page if the document is truly empty
        const pages0 = listPages(state.doc);
        if (!seededFirstPage.has(view) && state.doc.content.size === 0 && pages0.length === 0) {
          const p = state.schema.nodes.paragraph.create();
          const seedAttrs = buildPageAttrs({}, null);
          const firstPage = state.schema.nodes.page.create(seedAttrs, [p]);
          const tr0 = state.tr.insert(0, firstPage).setMeta("addToHistory", false);
          seededFirstPage.add(view);
          view.dispatch(tr0.setMeta("autoPaginator", "init"));
          counts.clear();
          return;
        }

        // Thresholds: require *real* overflow (no special-casing Enter)
        const HARD_OVERFLOW_PX = 48; // immediate move (big spill)
        const SOFT_OVERFLOW_PX = 8;  // mild spill needs persistence
        const REQUIRED_FRAMES = 2;   // debounce so Enter doesn't paginate

        for (let i = 0; i < pages0.length; i++) {
          const { pos, node } = pages0[i];
          if (node.childCount <= 1) continue;

          const dom = view.nodeDOM(pos);
          if (!dom) continue;

          const over = overflowPx(dom);
          const lastChild = node.child(node.childCount - 1);
          const lastIsEmptyPara = isEmptyParagraph(lastChild);

          // Hard overflow → move immediately (allow empty para move too)
          if (over >= HARD_OVERFLOW_PX) {
            const tr1 = moveLastBlockToNewPage(state, state.tr, pos, /* allowEmptyMove */ true);
            if (tr1.doc !== state.doc) {
              view.dispatch(tr1.setMeta("autoPaginator", "move"));
              counts.clear();
              return;
            }
          }
          // Soft overflow → require persistence across frames, then move
          else if (over > SOFT_OVERFLOW_PX) {
            const prev = counts.get(pos) ?? 0;
            const now = prev + 1;
            counts.set(pos, now);
            if (now >= REQUIRED_FRAMES) {
              const tr2 = moveLastBlockToNewPage(state, state.tr, pos, /* allowEmptyMove */ true);
              if (tr2.doc !== state.doc) {
                view.dispatch(tr2.setMeta("autoPaginator", "move"));
                counts.clear();
                return;
              }
            }
          } else {
            // No overflow → reset persistence counter for this page
            if (counts.has(pos)) counts.delete(pos);
          }

          // IMPORTANT: we do NOT move on zero overflow even if last block is empty.
          // This prevents "Enter at bottom" => new page.
        }

        // Cleanup: remove empty trailing pages (keep the very first)
        const pagesAfter = listPages(state.doc);
        let tr4 = state.tr;
        let removed = false;
        for (let i = pagesAfter.length - 1; i >= 1; i--) {
          const { node, pos } = pagesAfter[i];
          if (node.childCount === 0) {
            tr4 = tr4.delete(pos, pos + node.nodeSize);
            removed = true;
          }
        }
        if (removed) {
          view.dispatch(tr4.setMeta("addToHistory", false).setMeta("autoPaginator", "cleanup"));
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

    // Reapply active HF to pages after a panel-driven reflow (keeps inheritance consistent)
    const reflowPlugin = new Plugin({
      appendTransaction: (trs, _old, newState) => {
        const reflow = trs.some(t => t.getMeta("paginatorReflow"));
        if (!reflow) return null;

        const pageType = newState.schema.nodes.page;
        if (!pageType) return null;

        let tr = newState.tr;
        let changed = false;

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

        return changed ? tr : null;
      },
      view: (view) => ({
        update: () => schedule(view),
        destroy: () => {
          const id = rafIdByView.get(view);
          if (id) cancelAnimationFrame(id);
          rafIdByView.delete(view);
          overflowCountsByView.delete(view);
          bootSkips.delete(view);
        },
      }),
    });

    return [reflowPlugin];
  },
});

export default AutoPaginator;
