import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';

// UI surfaces
import InlineImageToolbar from '../../layout/image/InlineImageToolbar';
import ImageContextMenu from '../../layout/image/ImageContextMenu';

export default function ImageNodeView(props) {
  const { node, updateAttributes, selected, editor } = props;
  const attrs = node.attrs;

  const wrapperRef = useRef(null);
  const imgRef = useRef(null);
  const roWrapperRef = useRef(null);
  const roImgRef = useRef(null);
  const fileRef = useRef(null); // for Replace (upload)

  const [drag, setDrag] = useState(null);
  const [measured, setMeasured] = useState({ w: null, h: null });

  // ---- helpers -------------------------------------------------------------
  const getUsablePageContentWidth = useCallback(() => {
    const wrapper = wrapperRef.current;
    const pageEl = wrapper?.closest?.('.nd-page') || document.querySelector('.nd-page');
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
  }, []);

  const measureNow = useCallback(() => {
    const el = imgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    setMeasured({ w: Math.round(r.width), h: Math.round(r.height) });
  }, []);

  useEffect(() => {
    measureNow();
    if ('ResizeObserver' in window) {
      if (wrapperRef.current) {
        roWrapperRef.current = new ResizeObserver(measureNow);
        roWrapperRef.current.observe(wrapperRef.current);
      }
      if (imgRef.current) {
        roImgRef.current = new ResizeObserver(measureNow);
        roImgRef.current.observe(imgRef.current);
      }
    }
    window.addEventListener('resize', measureNow);
    return () => {
      roWrapperRef.current?.disconnect?.();
      roWrapperRef.current = null;
      roImgRef.current?.disconnect?.();
      roImgRef.current = null;
      window.removeEventListener('resize', measureNow);
    };
  }, [measureNow, attrs.width, attrs.height, attrs.rotation, attrs.crop, attrs.keepAspect]);

  // ---- derived styles ------------------------------------------------------
  const effectFilter = useMemo(() => {
    const base = [];
    if (attrs.filterPreset === 'grayscale') base.push('grayscale(1)');
    if (attrs.filterPreset === 'sepia') base.push('sepia(1)');
    if (attrs.filterPreset === 'duoLight') base.push('contrast(1.15) brightness(1.1) saturate(1.05)');
    if (attrs.filterPreset === 'duoDark') base.push('contrast(1.2) brightness(0.9) saturate(0.9)');
    base.push(`brightness(${attrs.brightness || 100}%)`);
    base.push(`contrast(${attrs.contrast || 100}%)`);
    base.push(`opacity(${attrs.opacity || 100}%)`);
    return base.join(' ');
  }, [attrs.filterPreset, attrs.brightness, attrs.contrast, attrs.opacity]);

  const containerStyle = useMemo(() => {
    const isBlock = attrs.wrapMode === 'break';
    return {
      display: isBlock ? 'block' : 'inline-block',
      marginTop: attrs.marginTop ?? 0,
      marginRight: attrs.marginRight ?? 0,
      marginBottom: attrs.marginBottom ?? 0,
      marginLeft: attrs.marginLeft ?? 0,
      position: 'relative',
      textAlign: isBlock && attrs.align === 'center' ? 'center' : undefined,
      maxWidth: '100%',
    };
  }, [attrs]);

  const cropBox = attrs.crop; // {x,y,w,h} or null

  const imageStyle = useMemo(() => {
    const rotate = `rotate(${attrs.rotation || 0}deg)`;
    const height = attrs.keepAspect && !cropBox ? 'auto' : (attrs.height || undefined);
    return {
      transform: rotate,
      filter: effectFilter,
      position: cropBox ? 'absolute' : 'static',
      top: cropBox ? -1 * (cropBox.y || 0) : undefined,
      left: cropBox ? -1 * (cropBox.x || 0) : undefined,
      width: attrs.width || undefined,
      height,
      maxWidth: '100%',
      userSelect: 'none',
      pointerEvents: 'none',
      display: 'block',
    };
  }, [attrs.rotation, effectFilter, cropBox, attrs.width, attrs.height, attrs.keepAspect]);

  const cropContainerStyle = useMemo(() => ({
    width: attrs.width || (measured.w ? `${measured.w}px` : 'auto'),
    height: cropBox
      ? (cropBox.h || attrs.height || (measured.h ? `${measured.h}px` : 'auto'))
      : (attrs.height || (measured.h ? `${measured.h}px` : 'auto')),
    overflow: cropBox ? 'hidden' : 'visible',
    position: 'relative',
    display: 'inline-block',
    boxSizing: 'border-box',
  }), [attrs.width, attrs.height, cropBox, measured.w, measured.h]);

  // ---- drag handlers -------------------------------------------------------
  const onPointerDownResize = (e, corner) => {
    e.preventDefault(); e.stopPropagation();
    setDrag({
      type: 'resize', corner,
      startX: e.clientX, startY: e.clientY,
      startAttrs: { width: attrs.width, height: attrs.height, keepAspect: attrs.keepAspect },
      maxW: getUsablePageContentWidth(),
    });
  };

  const onPointerDownRotate = (e) => {
    e.preventDefault(); e.stopPropagation();
    const rect = wrapperRef.current?.getBoundingClientRect();
    setDrag({
      type: 'rotate',
      startX: e.clientX, startY: e.clientY,
      centerX: rect ? rect.left + rect.width / 2 : e.clientX,
      centerY: rect ? rect.top + rect.height / 2 : e.clientY,
      startRotation: attrs.rotation || 0,
    });
  };

  const onPointerDownCrop = (e, edge) => {
    e.preventDefault(); e.stopPropagation();
    const c = cropBox || { x: 0, y: 0, w: attrs.width || measured.w || 100, h: attrs.height || measured.h || 100 };
    setDrag({
      type: 'crop', edge,
      startX: e.clientX, startY: e.clientY,
      startCrop: { ...c },
    });
  };

  const onPointerMove = useCallback((e) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (drag.type === 'resize') {
      const factorX = drag.corner.includes('l') ? -1 : 1;
      const factorY = drag.corner.includes('t') ? -1 : 1;
      let newW = (drag.startAttrs.width || measured.w || 100) + dx * factorX;
      let newH = (drag.startAttrs.height || measured.h || 100) + dy * factorY;

      if (drag.startAttrs.keepAspect) {
        const baseW = drag.startAttrs.width || measured.w || 1;
        const baseH = drag.startAttrs.height || measured.h || 1;
        const aspect = baseW / baseH;
        if (Math.abs(dx) > Math.abs(dy)) newH = newW / aspect;
        else newW = newH * aspect;
      }

      const maxW = drag.maxW || getUsablePageContentWidth();
      if (newW > maxW) {
        newW = maxW;
        if (drag.startAttrs.keepAspect) {
          const baseW = drag.startAttrs.width || measured.w || 1;
          const baseH = drag.startAttrs.height || measured.h || 1;
          const aspect = baseW / baseH;
          newH = newW / aspect;
        }
      }

      newW = Math.max(10, Math.round(newW));
      newH = Math.max(10, Math.round(newH));
      updateAttributes({ width: newW, height: newH });
    }

    if (drag.type === 'rotate') {
      const { centerX: cx, centerY: cy, startRotation } = drag;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
      const startAngle = Math.atan2(drag.startY - cy, drag.startX - cx) * (180 / Math.PI);
      const delta = angle - startAngle;
      updateAttributes({ rotation: Math.round((startRotation || 0) + delta) });
    }

    if (drag.type === 'crop') {
      const s = { ...drag.startCrop };
      const edge = drag.edge;

      if (edge === 'move') {
        updateAttributes({ crop: { ...s, x: Math.max(0, s.x + dx), y: Math.max(0, s.y + dy) } });
        return;
      }

      let { x, y, w, h } = s;
      if (edge.includes('l')) { x = Math.max(0, x + dx); w = Math.max(10, w - dx); }
      if (edge.includes('r')) { w = Math.max(10, w + dx); }
      if (edge.includes('t')) { y = Math.max(0, y + dy); h = Math.max(10, h - dy); }
      if (edge.includes('b')) { h = Math.max(10, h + dy); }
      updateAttributes({ crop: { x, y, w, h } });
    }
  }, [drag, measured.w, measured.h, getUsablePageContentWidth, updateAttributes]);

  const onPointerUp = useCallback(() => setDrag(null), []);
  useEffect(() => {
    if (!drag) return;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [drag, onPointerMove, onPointerUp]);

  // double-click toggles crop mode
  const onDoubleClick = () => {
    updateAttributes({
      isCropping: !attrs.isCropping,
      crop: attrs.crop || { x: 0, y: 0, w: attrs.width || measured.w || 100, h: attrs.height || measured.h || 100 },
    });
  };

  const showFrame = selected && !attrs.isCropping;
  const showCrop = selected && attrs.isCropping;

  // helper to open the sidebar through the extension option
  const openImageOptions = () => {
    const ext = editor?.extensionManager?.extensions?.find(e => e.name === 'richImage');
    ext?.options?.onOpenImageOptions?.({ editor });
  };

  const replaceFromUrl = async () => {
    const url = prompt('Paste image URL:');
    if (url) updateAttributes({ src: url });
  };

  return (
    <NodeViewWrapper
      as="span"
      ref={wrapperRef}
      className="nd-image-wrapper"
      style={containerStyle}
      data-selected={selected ? 'true' : 'false'}
      onDoubleClick={onDoubleClick}
    >
      {/* Inline toolbar appears when selected */}
      {selected && (
        <InlineImageToolbar
          editor={editor}
          onOpenOptions={openImageOptions}
          // Add Replace in toolbar (optional hook; toolbar will call this if provided)
          onReplace={() => fileRef.current?.click()}
        />
      )}

      {/* Hidden file input for Replace (upload) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const objectUrl = URL.createObjectURL(file);
          updateAttributes({ src: objectUrl });
          // Optionally: URL.revokeObjectURL later
        }}
      />

      {/* Context menu wrapper */}
      <ImageContextMenu
        onAction={(action, payload) => {
          if (action === 'options') {
            openImageOptions();
          } else if (action === 'crop') {
            updateAttributes({
              isCropping: true,
              crop: attrs.crop || { x: 0, y: 0, w: attrs.width || measured.w || 100, h: attrs.height || measured.h || 100 },
            });
          } else if (action === 'replace-upload') {
            fileRef.current?.click();
          } else if (action === 'replace-url') {
            replaceFromUrl();
          } else if (action === 'reset') {
            updateAttributes({
              width: null,
              height: null,
              rotation: 0,
              crop: null,
              filterPreset: null,
              brightness: 100,
              contrast: 100,
              opacity: 100,
            });
          } else if (action === 'alt-text') {
            const value = typeof payload === 'string' ? payload : prompt('Alt text:', attrs.alt || '');
            if (value != null) updateAttributes({ alt: value });
          }
        }}
      >
        {/* The crop container wraps the actual rendered image size */}
        <span className="nd-image-crop-container" style={cropContainerStyle}>
          <img
            ref={imgRef}
            src={attrs.src}
            alt={attrs.alt || ''}
            title={node.attrs.title || undefined}
            style={imageStyle}
            draggable={false}
            onLoad={measureNow}
          />

          {/* CROP MODE UI */}
          {showCrop && (
            <>
              <div
                className="nd-crop-overlay"
                style={{
                  position: 'absolute',
                  inset: 0,
                  outline: '1200px solid rgba(0,0,0,0.35)',
                  cursor: 'move',
                }}
                onPointerDown={(e) => onPointerDownCrop(e, 'move')}
              />
              {['t','b','l','r','tl','tr','bl','br'].map(key => {
                const base = {
                  position: 'absolute',
                  width: ['t','b'].includes(key) ? '100%' : 8,
                  height: ['l','r'].includes(key) ? '100%' : 8,
                  background: ['tl','tr','bl','br'].includes(key) ? '#3b82f6' : 'transparent',
                };
                const pos = {
                  t: { top: -3, left: 0, height: 6, cursor: 'ns-resize' },
                  b: { bottom: -3, left: 0, height: 6, cursor: 'ns-resize' },
                  l: { left: -3, top: 0, width: 6, cursor: 'ew-resize' },
                  r: { right: -3, top: 0, width: 6, cursor: 'ew-resize' },
                  tl: { top: -5, left: -5, width: 10, height: 10, cursor: 'nwse-resize' },
                  tr: { top: -5, right: -5, width: 10, height: 10, cursor: 'nesw-resize' },
                  bl: { bottom: -5, left: -5, width: 10, height: 10, cursor: 'nesw-resize' },
                  br: { bottom: -5, right: -5, width: 10, height: 10, cursor: 'nwse-resize' },
                }[key];
                return (
                  <div
                    key={key}
                    style={{ ...base, ...pos }}
                    onPointerDown={(e) => onPointerDownCrop(e, key)}
                  />
                );
              })}
            </>
          )}

          {/* FRAME + RESIZE HANDLES */}
          {showFrame && (
            <>
              <span
                className="nd-frame"
                style={{
                  position: 'absolute',
                  inset: 0,
                  outline: '1.5px solid #3b82f6',
                  pointerEvents: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {['tl','tr','bl','br','t','b','l','r'].map(corner => {
                const pos = {
                  tl: { top: -5, left: -5, cursor: 'nwse-resize' },
                  tr: { top: -5, right: -5, cursor: 'nesw-resize' },
                  bl: { bottom: -5, left: -5, cursor: 'nesw-resize' },
                  br: { bottom: -5, right: -5, cursor: 'nwse-resize' },
                  t:  { top: -5, left: '50%', marginLeft: -5, cursor: 'ns-resize' },
                  b:  { bottom: -5, left: '50%', marginLeft: -5, cursor: 'ns-resize' },
                  l:  { left: -5, top: '50%', marginTop: -5, cursor: 'ew-resize' },
                  r:  { right: -5, top: '50%', marginTop: -5, cursor: 'ew-resize' },
                }[corner];
                return (
                  <span
                    key={corner}
                    style={{
                      position: 'absolute',
                      width: 10,
                      height: 10,
                      background: '#3b82f6',
                      borderRadius: 2,
                      ...pos,
                    }}
                    onPointerDown={(e) => onPointerDownResize(e, corner)}
                  />
                );
              })}
              <span
                title="Drag to rotate"
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: -28,
                  marginLeft: -8,
                  width: 16,
                  height: 16,
                  borderRadius: 16,
                  background: '#3b82f6',
                  cursor: 'grab',
                  boxShadow: '0 0 0 2px white',
                }}
                onPointerDown={onPointerDownRotate}
              />
            </>
          )}
        </span>
      </ImageContextMenu>
    </NodeViewWrapper>
  );
}
