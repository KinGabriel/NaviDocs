// src/extensions/image/plugins/cropPlugin.js
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const cropKey = new PluginKey('nd-image-crop');

function findSelectedImagePos(state) {
  const sel = state.selection;
  if (sel.node && sel.node.type.name === 'image') return sel.from;
  const $from = sel.$from;
  const nb = $from.nodeBefore, na = $from.nodeAfter;
  if (nb && nb.type.name === 'image') return $from.pos - nb.nodeSize + 1;
  if (na && na.type.name === 'image') return $from.pos + 1;
  return null;
}

export default function cropPlugin() {
  return new Plugin({
    key: cropKey,

    state: {
      init: () => ({ dragging: null }),
      apply(tr, prev) {
        const meta = tr.getMeta(cropKey);
        let dragging = prev.dragging;
        if (meta) dragging = meta.dragging ?? dragging;
        if (tr.selectionSet && dragging && !findSelectedImagePos(tr.state)) dragging = null;
        return { dragging };
      },
    },

    props: {
      decorations(state) {
        const pos = findSelectedImagePos(state);
        if (pos == null) return null;
        const node = state.doc.nodeAt(pos);
        if (!node || !node.attrs.isCropping) return null;

        const deco = [];

        // overlay with dark outside area & edges/handles
        const overlay = document.createElement('span');
        overlay.className = 'nd-crop-overlay';
        Object.assign(overlay.style, {
          position: 'absolute',
          inset: 0,
          pointerEvents: 'auto',
          outline: '1200px solid rgba(0,0,0,0.35)',
          cursor: 'move',
        });

        ['t','b','l','r','tl','tr','bl','br'].forEach(key => {
          const el = document.createElement('span');
          el.dataset.ndCrop = key;
          const isCorner = ['tl','tr','bl','br'].includes(key);
          Object.assign(el.style, {
            position: 'absolute',
            pointerEvents: 'auto',
            background: isCorner ? '#3b82f6' : 'transparent',
          });
          const map = {
            t: { top: '-3px', left: 0, height: '6px', width: '100%', cursor: 'ns-resize' },
            b: { bottom: '-3px', left: 0, height: '6px', width: '100%', cursor: 'ns-resize' },
            l: { left: '-3px', top: 0, width: '6px', height: '100%', cursor: 'ew-resize' },
            r: { right: '-3px', top: 0, width: '6px', height: '100%', cursor: 'ew-resize' },
            tl: { top: '-5px', left: '-5px', width: '10px', height: '10px', cursor: 'nwse-resize' },
            tr: { top: '-5px', right: '-5px', width: '10px', height: '10px', cursor: 'nesw-resize' },
            bl: { bottom: '-5px', left: '-5px', width: '10px', height: '10px', cursor: 'nesw-resize' },
            br: { bottom: '-5px', right: '-5px', width: '10px', height: '10px', cursor: 'nwse-resize' },
          }[key];
          Object.assign(el.style, map);
          overlay.appendChild(el);
        });

        const widget = Decoration.widget(pos, () => overlay, { side: 0, key: 'nd-crop' });
        deco.push(widget);

        return DecorationSet.create(state.doc, deco);
      },

      handleKeyDown(view, event) {
        if (event.key === 'Escape') {
          const pos = findSelectedImagePos(view.state);
          if (pos == null) return false;
          const node = view.state.doc.nodeAt(pos);
          if (!node?.attrs.isCropping) return false;
          view.dispatch(
            view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, isCropping: false })
          );
          return true;
        }
        return false;
      },

      handleDOMEvents: {
        pointerdown(view, event) {
          const el = event.target;
          if (!(el instanceof HTMLElement)) return false;
          if (!el.closest('.nd-crop-overlay')) return false;

          const pos = findSelectedImagePos(view.state);
          if (pos == null) return false;
          const node = view.state.doc.nodeAt(pos);
          if (!node) return false;

          const start = { x: event.clientX, y: event.clientY };
          const startCrop = node.attrs.crop || { x: 0, y: 0, w: node.attrs.width || 100, h: node.attrs.height || 100 };
          const edge = el.dataset.ndCrop || 'move';

          const onMove = (e) => {
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;

            if (edge === 'move') {
              const nx = Math.max(0, startCrop.x + dx);
              const ny = Math.max(0, startCrop.y + dy);
              view.dispatch(
                view.state.tr
                  .setNodeMarkup(pos, undefined, { ...node.attrs, crop: { ...startCrop, x: nx, y: ny } })
                  .setMeta(cropKey, { dragging: 'move' })
              );
              return;
            }

            let { x, y, w, h } = { ...startCrop };
            if (edge.includes('l')) { x = Math.max(0, x + dx); w = Math.max(10, w - dx); }
            if (edge.includes('r')) { w = Math.max(10, w + dx); }
            if (edge.includes('t')) { y = Math.max(0, y + dy); h = Math.max(10, h - dy); }
            if (edge.includes('b')) { h = Math.max(10, h + dy); }

            view.dispatch(
              view.state.tr
                .setNodeMarkup(pos, undefined, { ...node.attrs, crop: { x, y, w, h } })
                .setMeta(cropKey, { dragging: edge })
            );
          };

          const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            view.dispatch(view.state.tr.setMeta(cropKey, { dragging: null }));
          };

          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
          event.preventDefault();
          return true;
        },
      },
    },
  });
}
