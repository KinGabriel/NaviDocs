// src/extensions/image/plugins/cropPlugin.js
import { Plugin, PluginKey, NodeSelection } from 'prosemirror-state';

export const cropKey = new PluginKey('nd.cropMode');

function findSelectedImagePos(state, nodeTypeName) {
  const sel = state.selection;
  if (sel instanceof NodeSelection && sel.node.type.name === nodeTypeName) return sel.from;
  const $from = sel.$from;
  const nb = $from.nodeBefore, na = $from.nodeAfter;
  if (nb && nb.type.name === nodeTypeName) return $from.pos - nb.nodeSize + 1;
  if (na && na.type.name === nodeTypeName) return $from.pos + 1;
  return null;
}

// Commands to control crop mode from UI or keymaps
export const enterCrop = ({ nodeTypeName = 'richImage' } = {}) => (state, dispatch, view) => {
  const pos = findSelectedImagePos(state, nodeTypeName);
  if (pos == null) return false;
  const node = state.doc.nodeAt(pos);
  if (!node) return false;

  // Initialize crop rect to current display size if missing
  const width = node.attrs.width || 100;
  const height = node.attrs.height || 100;
  const next = {
    ...node.attrs,
    isCropping: true,
    crop: node.attrs.crop || { x: 0, y: 0, w: Math.round(width), h: Math.round(height) },
  };
  dispatch(state.tr.setNodeMarkup(pos, undefined, next).setMeta(cropKey, { entering: true }));
  // focus so ESC works immediately
  view?.focus();
  return true;
};

export const exitCrop = ({ nodeTypeName = 'richImage' } = {}) => (state, dispatch) => {
  const pos = findSelectedImagePos(state, nodeTypeName);
  if (pos == null) return false;
  const node = state.doc.nodeAt(pos);
  if (!node?.attrs.isCropping) return false;
  dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, isCropping: false })
    .setMeta(cropKey, { exiting: true }));
  return true;
};

export const toggleCrop = ({ nodeTypeName = 'richImage' } = {}) => (state, dispatch, view) => {
  const pos = findSelectedImagePos(state, nodeTypeName);
  if (pos == null) return false;
  const node = state.doc.nodeAt(pos);
  if (!node) return false;
  if (node.attrs.isCropping) return exitCrop({ nodeTypeName })(state, dispatch);
  return enterCrop({ nodeTypeName })(state, dispatch, view);
};

export default function cropPlugin({ nodeTypeName = 'richImage' } = {}) {
  return new Plugin({
    key: cropKey,

    // Auto-exit if selection changes away from the image
    appendTransaction(transactions, oldState, newState) {
      const wasPos = findSelectedImagePos(oldState, nodeTypeName);
      const nowPos = findSelectedImagePos(newState, nodeTypeName);
      if (wasPos != null && nowPos == null) {
        const node = oldState.doc.nodeAt(wasPos);
        if (node?.attrs.isCropping) {
          const tr = newState.tr.setNodeMarkup(
            wasPos, undefined, { ...node.attrs, isCropping: false }
          );
          return tr;
        }
      }
      return null;
    },

    props: {
      // ESC exits crop mode
      handleKeyDown(view, event) {
        if (event.key !== 'Escape') return false;
        const pos = findSelectedImagePos(view.state, nodeTypeName);
        if (pos == null) return false;
        const node = view.state.doc.nodeAt(pos);
        if (!node?.attrs.isCropping) return false;
        view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, isCropping: false }));
        return true;
      },

      // Clicking outside the selected image exits crop
      handleDOMEvents: {
        mousedown(view, event) {
          const pos = findSelectedImagePos(view.state, nodeTypeName);
          if (pos == null) return false;
          const node = view.state.doc.nodeAt(pos);
          if (!node?.attrs.isCropping) return false;

          const nodeDOM = view.nodeDOM(pos);
          const inside = nodeDOM instanceof HTMLElement && nodeDOM.contains(event.target);
          if (!inside) {
            view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, isCropping: false }));
            return true;
          }
          return false;
        },
      },
    },
  });
}
