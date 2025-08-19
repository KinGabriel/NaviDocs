import { Plugin, TextSelection } from "prosemirror-state";

/** ----------------- Auto Pagination (working version) ----------------- */
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

    // find last page + pos (pos BEFORE node)
    let pageNode = null, pagePos = -1;
    doc.descendants((node, pos) => {
      if (node.type?.name === "page") { pageNode = node; pagePos = pos; }
    });
    if (!pageNode) return;

    const pageDom = view.nodeDOM(pagePos);
    if (!(pageDom instanceof Element)) return;

    const css  = getComputedStyle(pageDom);
    const padT = parseFloat(css.paddingTop) || 0;
    const padB = parseFloat(css.paddingBottom) || 0;
    const rect = pageDom.getBoundingClientRect();
    const frameBottom = rect.bottom - padB;
    const EPS = 1;

    const pageStart = pagePos + 1;                     // before first child
    const pageEnd   = pagePos + pageNode.nodeSize - 1; // after last child

    // first child whose bottom crosses the frame bottom
    let cutPos = null, offset = 0;
    for (let i = 0; i < pageNode.childCount; i++) {
      const child = pageNode.child(i);
      const childPos = pageStart + offset;             // before this child
      const childDom = view.nodeDOM(childPos);
      if (childDom && childDom.getBoundingClientRect) {
        const bottom = childDom.getBoundingClientRect().bottom;
        if (bottom > frameBottom + EPS) { cutPos = childPos; break; }
      }
      offset += child.nodeSize;
    }
    if (cutPos == null) return;

    const pageType = schema.nodes.page;
    if (!pageType) return;

    const overflow = doc.slice(cutPos, pageEnd).content;
    if (overflow.size === 0) return;

    // remove overflow from current page
    let tr = state.tr.delete(cutPos, pageEnd);

    // insert a new page *after this one* with the overflow
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
    schedule(view); // keep splitting if still overflowing
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

/** -------- Backspace: remove current page & merge into previous -------- */
export function BackspaceRemovePagePlugin() {
  const NEAR_PX = 12; // visual tolerance near the top edge

  const isAtPageStart = (view, $from, pageDepth, pageStart, pagePos) => {
    // (1) logical: inside first child at offset 0
    const insideFirstChild =
      $from.before(pageDepth + 1) === pageStart && $from.index(pageDepth + 1) === 0;
    if (insideFirstChild && $from.parentOffset === 0) return true;

    // (2) blue-edge caret: exactly before the first child
    if ($from.pos === pageStart + 1) return true;

    // (3) content-aware fallback: no content between first child start and caret
    try {
      const hasTextBefore =
        view.state.doc.textBetween(pageStart + 1, $from.pos, "\n", "\n").trim().length > 0;
      if (!hasTextBefore) return true;
    } catch (_) {}

    // (4) DOM fallback: caret visually within NEAR_PX of printable top
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

  return new Plugin({
    props: {
      handleKeyDown(view, event) {
        if (event.key !== "Backspace" || event.altKey || event.ctrlKey || event.metaKey) {
          return false;
        }

        const { state } = view;
        const { selection, doc } = state;
        if (!selection.empty) return false;
        const { $from } = selection;

        // find containing page
        let pageDepth = -1;
        for (let d = $from.depth; d >= 0; d--) {
          if ($from.node(d).type.name === "page") { pageDepth = d; break; }
        }
        if (pageDepth === -1) return false;

        const pageNode  = $from.node(pageDepth);
        const pagePos   = $from.before(pageDepth);  // before page node
        const pageStart = $from.start(pageDepth);   // before first child
        const pageEnd   = $from.end(pageDepth);     // after last child

        // must have a previous page
        const $pagePos = state.doc.resolve(pagePos);
        const prevPage = $pagePos.nodeBefore;
        if (!prevPage || prevPage.type.name !== "page") return false;

        // accept more cases as "at page start"
        if (!isAtPageStart(view, $from, pageDepth, pageStart, pagePos)) return false;

        // insert current page's inner content at end of previous page
        const prevBefore = pagePos - prevPage.nodeSize;
        const prevEndInside = prevBefore + prevPage.nodeSize - 1;

        const inner = doc.slice(pageStart, pageEnd).content;

        let tr = state.tr.insert(prevEndInside, inner);

        // delete the now-empty page wrapper
        const mappedFrom = tr.mapping.map(pagePos);
        const mappedTo   = tr.mapping.map(pagePos + pageNode.nodeSize);
        tr = tr.delete(mappedFrom, mappedTo);

        // place caret at the join point
        const joinAt = tr.mapping.map(prevEndInside);
        const $join  = tr.doc.resolve(Math.max(1, Math.min(joinAt, tr.doc.content.size - 1)));
        tr = tr.setSelection(TextSelection.near($join, -1)).scrollIntoView();

        view.dispatch(tr);
        event.preventDefault();
        return true;
      },
    },
  });
}