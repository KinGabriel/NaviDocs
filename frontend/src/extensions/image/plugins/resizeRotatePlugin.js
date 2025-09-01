// src/extensions/image/plugins/resizeRotatePlugin.js
import { Plugin, PluginKey, NodeSelection, TextSelection } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export const resizeRotateKey = new PluginKey('nd-image-resize-rotate');

function getUsablePageContentWidth(dom) {
  const pageEl = dom?.closest?.('.nd-page') || document.querySelector('.nd-page');
  if (!pageEl) {
    const rs = getComputedStyle(document.documentElement);
    const pageW = parseFloat(rs.getPropertyValue('--nd-page-width')) || 800;
    const padL = parseFloat(rs.getPropertyValue('--nd-margin-left')) || 96;
    const padR = parseFloat(rs.getPropertyValue('--nd-margin-right')) || 96;
    return Math.max(100, Math.round(pageW - padL - padR));
  }
  const cs = getComputedStyle(pageEl);
  const rectW = pageEl.getBoundingClientRect().width;
  const padL = parseFloat(cs.paddingLeft) || 0;
  const padR = parseFloat(cs.paddingRight) || 0;
  return Math.max(100, Math.round(rectW - padL - padR));
}

function findSelectedImagePos(state) {
  const sel = state.selection;
  if (sel instanceof NodeSelection && sel.node.type.name === 'image') {
    return sel.from;
  }
  // Also support cursor when it sits next to an image node
  const $from = sel.$from;
  const nodeBefore = $from.nodeBefore;
  const nodeAfter = $from.nodeAfter;
  if (nodeBefore && nodeBefore.type.name === 'image') return $from.pos - nodeBefore.nodeSize + 1;
  if (nodeAfter && nodeAfter.type.name === 'image') return $from.pos + 1;
  return null;
}

export default function resizeRotatePlugin() {
  return new Plugin({
    key: resizeRotateKey,

    state: {
      init: () => ({ dragging: null }),
      apply(tr, prev) {
        const meta = tr.getMeta(resizeRotateKey);
        let dragging = prev.dragging;
        if (meta && typeof meta === 'object') {
          dragging = meta.dragging ?? dragging;
        }
        // stop drag if selection/doc changed in ways that invalidate
        if (tr.selectionSet && dragging && !findSelectedImagePos(tr.state)) dragging = null;
        return { dragging };
      },
    },

    props: {
      decorations(state) {
        const pos = findSelectedImagePos(state);
        if (pos == null) return null;

        const deco = [];
        const selNode = state.doc.nodeAt(pos);
        if (!selNode) return null;

        // Widget container that overlays handles; mounted inside NodeView wrapper
        const widget = document.createElement('span');
        widget.className = 'nd-rrp-overlay';
        Object.assign(widget.style, {
          position: 'absolute',
          inset: '0',
          pointerEvents: 'none',
        });

        // 8 resize handles + 1 rotate
        const corners = ['tl','tr','bl','br','t','b','l','r'];
        corners.forEach(key => {
          const el = document.createElement('span');
          el.dataset.ndHandle = key;
          Object.assign(el.style, {
            position: 'absolute',
            width: '10px',
            height: '10px',
            background: '#3b82f6',
            borderRadius: '2px',
            pointerEvents: 'auto',
          });
          const map = {
            tl: { top: '-5px', left: '-5px', cursor: 'nwse-resize' },
            tr: { top: '-5px', right: '-5px', cursor: 'nesw-resize' },
            bl: { bottom: '-5px', left: '-5px', cursor: 'nesw-resize' },
            br: { bottom: '-5px', right: '-5px', cursor: 'nwse-resize' },
            t : { top: '-5px', left: '50%', marginLeft: '-5px', cursor: 'ns-resize' },
            b : { bottom: '-5px', left: '50%', marginLeft: '-5px', cursor: 'ns-resize' },
            l : { left: '-5px', top: '50%', marginTop: '-5px', cursor: 'ew-resize' },
            r : { right: '-5px', top: '50%', marginTop: '-5px', cursor: 'ew-resize' },
          };
          Object.assign(el.style, map[key]);
          widget.appendChild(el);
        });

        const rot = document.createElement('span');
        rot.dataset.ndRotate = '1';
        Object.assign(rot.style, {
          position: 'absolute',
          left: '50%',
          top: '-28px',
          marginLeft: '-8px',
          width: '16px',
          height: '16px',
          borderRadius: '16px',
          background: '#3b82f6',
          pointerEvents: 'auto',
          cursor: 'grab',
          boxShadow: '0 0 0 2px white',
        });
        widget.appendChild(rot);

        // draw blue frame
        const frame = document.createElement('span');
        Object.assign(frame.style, {
          position: 'absolute',
          inset: '0',
          outline: '1.5px solid #3b82f6',
          boxSizing: 'border-box',
          pointerEvents: 'none',
        });
        widget.appendChild(frame);

        const decoWidget = Decoration.widget(pos, () => widget, {
          side: 0,
          key: 'nd-rrp',
        });

        deco.push(decoWidget);
        return DecorationSet.create(state.doc, deco);
      },

      handleDOMEvents: {
        pointerdown(view, event) {
          const target = event.target;
          if (!(target instanceof HTMLElement)) return false;
          if (!target.closest('.nd-rrp-overlay')) return false;

          const state = view.state;
          const pos = findSelectedImagePos(state);
          if (pos == null) return false;
          const node = state.doc.nodeAt(pos);
          const nodeDOM = view.nodeDOM(pos);
          if (!node || !(nodeDOM instanceof HTMLElement)) return false;

          const rect = nodeDOM.getBoundingClientRect();
          const start = { x: event.clientX, y: event.clientY };
          const startAttrs = { width: node.attrs.width, height: node.attrs.height, rotation: node.attrs.rotation || 0 };
          const keepAspectAtStart = !!node.attrs.keepAspect;
          const usableMaxW = getUsablePageContentWidth(nodeDOM);

          // rotation
          if (target.dataset.ndRotate) {
            const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            const startAngle = Math.atan2(start.y - center.y, start.x - center.x) * (180/Math.PI);
            const base = startAttrs.rotation;
            const onMove = (e) => {
              const ang = Math.atan2(e.clientY - center.y, e.clientX - center.x) * (180/Math.PI);
              let next = Math.round(base + (ang - startAngle));
              if (e.altKey) {
                // snap to 15°
                next = Math.round(next / 15) * 15;
              }
              const tr = view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, rotation: next });
              view.dispatch(tr.setMeta(resizeRotateKey, { dragging: 'rotate' }));
            };
            const onUp = () => {
              window.removeEventListener('pointermove', onMove);
              window.removeEventListener('pointerup', onUp);
              view.dispatch(view.state.tr.setMeta(resizeRotateKey, { dragging: null }));
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            event.preventDefault();
            return true;
          }

          // resize
          const handle = target.dataset.ndHandle;
          if (handle) {
            const baseW = startAttrs.width || rect.width;
            const baseH = startAttrs.height || rect.height;
            const aspect = baseW / Math.max(1, baseH);

            const onMove = (e) => {
              const dx = e.clientX - start.x;
              const dy = e.clientY - start.y;

              const factorX = handle.includes('l') ? -1 : 1;
              const factorY = handle.includes('t') ? -1 : 1;

              let w = baseW + dx * factorX;
              let h = baseH + dy * factorY;

              const keepAspect = e.shiftKey || keepAspectAtStart;
              if (keepAspect) {
                if (Math.abs(dx) > Math.abs(dy)) h = w / aspect;
                else w = h * aspect;
              }

              // clamp width
              if (w > usableMaxW) {
                w = usableMaxW;
                if (keepAspect) h = w / aspect;
              }

              w = Math.max(10, Math.round(w));
              h = Math.max(10, Math.round(h));

              const tr = view.state.tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                width: w,
                height: h,
              });
              view.dispatch(tr.setMeta(resizeRotateKey, { dragging: 'resize' }));
            };

            const onUp = () => {
              window.removeEventListener('pointermove', onMove);
              window.removeEventListener('pointerup', onUp);
              view.dispatch(view.state.tr.setMeta(resizeRotateKey, { dragging: null }));
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            event.preventDefault();
            return true;
          }

          return false;
        },
      },
    },
  });
}
