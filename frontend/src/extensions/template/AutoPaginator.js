 import { Plugin, TextSelection, Selection } from "prosemirror-state";
import { keymap } from "prosemirror-keymap";

/** Find the last page node and its pos (pos is BEFORE that node). */
function findLastPage(doc) {
  let pageNode = null;
  let pagePos = -1;
  doc.descendants((node, pos) => {
    if (node.type?.name === "page") {
      pageNode = node;
      pagePos = pos; // before the page node
    }
  });
  return pageNode ? { pageNode, pagePos } : null;
}

/** Auto create new pages when the last page overflows. */
export function AutoPaginator() {
  let raf = null;
  let lastDocSize = -1;

  const schedule = (view) => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => run(view));
  };

  const run = (view) => {
    const { state } = view;
    const { doc, schema } = state;

    if (doc.content.size === lastDocSize) return;
    lastDocSize = doc.content.size;

    const found = findLastPage(doc);
    if (!found) return;
    const { pageNode, pagePos } = found;

    const pageDom = view.nodeDOM(pagePos);
    if (!(pageDom instanceof Element)) return;

    const css = getComputedStyle(pageDom);
    const padTop = parseFloat(css.paddingTop) || 0;
    const padBottom = parseFloat(css.paddingBottom) || 0;
    const rect = pageDom.getBoundingClientRect();
    const frameBottom = rect.bottom - padBottom;
    const EPS = 1;

    const pageStart = pagePos + 1;                   // pos BEFORE first child
    const pageEnd   = pagePos + pageNode.nodeSize - 1;

    // walk the children by *document* positions, test DOM bottom
    let cutPos = null;
    let offset = 0;
    for (let i = 0; i < pageNode.childCount; i++) {
      const child = pageNode.child(i);
      const childPos = pageStart + offset;           // pos BEFORE this child
      const childDom = view.nodeDOM(childPos);
      if (childDom && childDom.getBoundingClientRect) {
        const bottom = childDom.getBoundingClientRect().bottom;
        if (bottom > frameBottom + EPS) {
          cutPos = childPos;                         // split BEFORE this child
          break;
        }
      }
      offset += child.nodeSize;
    }

    if (cutPos == null) return; // fits

    const pageType = schema.nodes.page;
    if (!pageType) return;

    const overflow = doc.slice(cutPos, pageEnd).content;
    if (overflow.size === 0) return;

    // Delete overflow from current page
    let tr = state.tr.delete(cutPos, pageEnd);

    // Insert a *new* page after this one with the overflow
    const $cut = state.doc.resolve(cutPos);
    let pageDepth = -1;
    for (let d = $cut.depth; d >= 0; d--) {
      if ($cut.node(d).type.name === "page") { pageDepth = d; break; }
    }
    if (pageDepth === -1) return;

    const afterCurrentPage = $cut.after(pageDepth);
    const mappedAfter = tr.mapping.map(afterCurrentPage);

    tr = tr.insert(mappedAfter, pageType.create(null, overflow));
    view.dispatch(tr);

    // loop again if still overflowing
    schedule(view);
  };

  return new Plugin({
    view(view) {
      schedule(view);
      return {
        update() { schedule(view); },
        destroy() { if (raf) cancelAnimationFrame(raf); },
      };
    },
  });
}

export function BackspaceRemovePagePlugin() {
  const NEAR_PX = 12;

  const isAtPageStart = (view, $from, pageDepth, pageStart, pagePos) => {
    const insideFirstChild =
      $from.before(pageDepth + 1) === pageStart && $from.index(pageDepth + 1) === 0;
    if (insideFirstChild && $from.parentOffset === 0) return true;
    if ($from.pos === pageStart + 1) return true;
    try {
      const hasTextBefore =
        view.state.doc.textBetween(pageStart + 1, $from.pos, "\n", "\n").trim().length > 0;
      if (!hasTextBefore) return true;
    } catch (_) {}
    const pageDom = view.nodeDOM(pagePos);
    if (pageDom instanceof Element) {
      const css = getComputedStyle(pageDom);
      const padT = parseFloat(css.paddingTop) || 0;
      const topLine = pageDom.getBoundingClientRect().top + padT;
      const caretTop = view.coordsAtPos($from.pos).top;
      if (caretTop <= topLine + NEAR_PX) return true;
    }
    return false;
  };

  // Walk left past any non-page nodes and return the prev page + deletion start
  const findPrevPageAndDelFrom = (doc, pagePos) => {
    let delFrom = pagePos;              // position immediately before current page
    let $pos = doc.resolve(delFrom);
    let before = $pos.nodeBefore;
    while (before && before.type && before.type.name !== "page") {
      delFrom -= before.nodeSize;       // skip pageBreak/spacers/anything
      $pos = doc.resolve(delFrom);
      before = $pos.nodeBefore;
    }
    if (!before || before.type.name !== "page") return null;
    const prevPage = before;
    const prevEndInside = delFrom - 1;  // end position *inside* previous page
    return { prevPage, prevEndInside, delFrom };
  };

  const isWhitespacePara = (n) =>
    n && n.type?.name === "paragraph" &&
    (n.textContent || "").replace(/\u00a0/g, "").trim().length === 0;

  return new Plugin({
    props: {
      handleKeyDown(view, event) {
        if (event.key !== "Backspace") return false;
        const { state } = view;
        if (!state.selection.empty) return false;

        const { $from } = state.selection;

        // find containing page
        let pageDepth = -1;
        for (let d = $from.depth; d >= 0; d--) {
          if ($from.node(d).type.name === "page") { pageDepth = d; break; }
        }
        if (pageDepth === -1) return false;

        const pageNode  = $from.node(pageDepth);
        const pagePos   = $from.before(pageDepth);
        const pageStart = $from.start(pageDepth);
        const pageEnd   = $from.end(pageDepth);

        if (!isAtPageStart(view, $from, pageDepth, pageStart, pagePos)) return false;

        const prevInfo = findPrevPageAndDelFrom(state.doc, pagePos);
        if (!prevInfo) return false;
        const { prevPage, prevEndInside, delFrom } = prevInfo;

        let tr = state.tr;

        // Trim trailing whitespace-only paragraphs on the previous page (visual padding)
        let trim = 0;
        for (let i = prevPage.childCount - 1; i >= 0; i--) {
          const ch = prevPage.child(i);
          if (isWhitespacePara(ch)) trim += ch.nodeSize; else break;
        }
        if (trim > 0) tr = tr.delete(prevEndInside - trim + 1, prevEndInside + 1);

        // Move current page’s inner content to the end of the previous page
        const inner = state.doc.slice(pageStart, pageEnd).content;
        const insertAt = tr.mapping.map(prevEndInside - trim);
        tr = tr.insert(insertAt, inner);

        // Delete everything from (right after prev page) through the current page wrapper
        const delFromMapped = tr.mapping.map(delFrom);
        const delToMapped   = tr.mapping.map(pagePos + pageNode.nodeSize);
        tr = tr.delete(delFromMapped, delToMapped);

        // Put caret at the join point
                // Put caret at the bottom of page 1 (left of the inserted content)
        const joinAt = tr.mapping.map(insertAt); // position where we inserted page2 content
        const docSize = tr.doc.content.size;
        const safePos = Math.max(1, Math.min(joinAt, docSize - 1));
        const $join = tr.doc.resolve(safePos);
        // Prefer a cursor *to the left* of the join (end of prev page),
        // fall back to the right if nothing valid to the left.
         const sel =
          Selection.findFrom($join, -1, true) ||
          Selection.findFrom($join,  1, true) ||
          TextSelection.near($join, 1);
         tr = tr.setSelection(sel).scrollIntoView();

        view.dispatch(tr);
        event.preventDefault();
        return true;
      },
    },
  });
}