// src/extensions/image/plugins/wrapPositionPlugin.js
import { Plugin, PluginKey, NodeSelection } from 'prosemirror-state';

export const wrapPositionKey = new PluginKey('nd-image-wrap-position');

function imgPos(state) {
  const sel = state.selection;
  if (sel instanceof NodeSelection && sel.node.type.name === 'image') return sel.from;
  return null;
}

export function setWrapMode(mode) {
  return (state, dispatch) => {
    const pos = imgPos(state);
    if (pos == null) return false;
    const node = state.doc.nodeAt(pos);
    if (!node) return false;
    dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, wrapMode: mode }));
    return true;
  };
}

export function setMargins({ top, right, bottom, left }) {
  return (state, dispatch) => {
    const pos = imgPos(state);
    if (pos == null) return false;
    const node = state.doc.nodeAt(pos);
    if (!node) return false;
    const next = {
      ...node.attrs,
      marginTop: top ?? node.attrs.marginTop ?? 0,
      marginRight: right ?? node.attrs.marginRight ?? 0,
      marginBottom: bottom ?? node.attrs.marginBottom ?? 0,
      marginLeft: left ?? node.attrs.marginLeft ?? 0,
    };
    dispatch(state.tr.setNodeMarkup(pos, undefined, next));
    return true;
  };
}

export function toggleFixedPosition() {
  return (state, dispatch) => {
    const pos = imgPos(state);
    if (pos == null) return false;
    const node = state.doc.nodeAt(pos);
    if (!node) return false;
    const isFixed = node.attrs.position === 'fixed';
    const next = isFixed
      ? { ...node.attrs, position: null, x: null, y: null }
      : { ...node.attrs, position: 'fixed', x: node.attrs.x || 0, y: node.attrs.y || 0 };
    dispatch(state.tr.setNodeMarkup(pos, undefined, next));
    return true;
  };
}

export default function wrapPositionPlugin() {
  return new Plugin({
    key: wrapPositionKey,
    props: {
      handleKeyDown(view, event) {
        // Nudge only when an image is selected and it's fixed positioned
        const state = view.state;
        const pos = imgPos(state);
        if (pos == null) return false;
        const node = state.doc.nodeAt(pos);
        if (!node || node.attrs.position !== 'fixed') return false;

        const step = event.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;

        if (event.key === 'ArrowLeft') dx = -step;
        else if (event.key === 'ArrowRight') dx = step;
        else if (event.key === 'ArrowUp') dy = -step;
        else if (event.key === 'ArrowDown') dy = step;
        else return false;

        const x = Math.max(0, (node.attrs.x || 0) + dx);
        const y = Math.max(0, (node.attrs.y || 0) + dy);

        view.dispatch(
          state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, x, y })
        );
        event.preventDefault();
        return true;
      },
    },
  });
}
