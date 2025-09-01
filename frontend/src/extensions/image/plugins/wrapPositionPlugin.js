// src/extensions/image/plugins/wrapPositionPlugin.js
import { Plugin, PluginKey, NodeSelection } from 'prosemirror-state';

export const wrapPositionKey = new PluginKey('nd.wrapPosition');

function imgPos(state, nodeTypeName) {
  const sel = state.selection;
  if (sel instanceof NodeSelection && sel.node.type.name === nodeTypeName) return sel.from;
  return null;
}

export const setWrapMode = (mode, { nodeTypeName = 'richImage' } = {}) =>
  (state, dispatch) => {
    const pos = imgPos(state, nodeTypeName);
    if (pos == null) return false;
    const node = state.doc.nodeAt(pos);
    if (!node) return false;
    dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, wrapMode: mode }));
    return true;
  };

export const setMargins = (m, { nodeTypeName = 'richImage' } = {}) =>
  (state, dispatch) => {
    const pos = imgPos(state, nodeTypeName);
    if (pos == null) return false;
    const node = state.doc.nodeAt(pos);
    if (!node) return false;
    const next = {
      ...node.attrs,
      marginTop: m.top ?? node.attrs.marginTop ?? 0,
      marginRight: m.right ?? node.attrs.marginRight ?? 0,
      marginBottom: m.bottom ?? node.attrs.marginBottom ?? 0,
      marginLeft: m.left ?? node.attrs.marginLeft ?? 0,
    };
    dispatch(state.tr.setNodeMarkup(pos, undefined, next));
    return true;
  };

export const toggleFixedPosition = ({ nodeTypeName = 'richImage' } = {}) =>
  (state, dispatch) => {
    const pos = imgPos(state, nodeTypeName);
    if (pos == null) return false;
    const node = state.doc.nodeAt(pos);
    if (!node) return false;
    const fixed = node.attrs.position === 'fixed';
    const next = fixed
      ? { ...node.attrs, position: 'move', x: 0, y: 0 }
      : { ...node.attrs, position: 'fixed', x: node.attrs.x || 0, y: node.attrs.y || 0 };
    dispatch(state.tr.setNodeMarkup(pos, undefined, next));
    return true;
  };

export default function wrapPositionPlugin({ nodeTypeName = 'richImage' } = {}) {
  return new Plugin({
    key: wrapPositionKey,
    props: {
      handleKeyDown(view, event) {
        const pos = imgPos(view.state, nodeTypeName);
        if (pos == null) return false;
        const node = view.state.doc.nodeAt(pos);
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
        view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, x, y }));
        event.preventDefault();
        return true;
      },
    },
  });
}
