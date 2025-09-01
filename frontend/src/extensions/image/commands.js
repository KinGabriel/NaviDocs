// src/extensions/image/commands.js

/**
 * Chainable commands for the RichImage node.
 * Usage: editor.chain().focus().insertImage({ src, alt }).run()
 */

export default function imageCommands(extension) {
  const type = () => extension.name;

  const isImageSelection = ({ state }) => {
    const { selection } = state;
    const node = selection?.node;
    return node && node.type && node.type.name === extension.name;
  };

  const updateSelected = (cb) => ({ chain, state }) => {
    if (!isImageSelection({ state })) return false;
    const attrs = state.selection.node.attrs;
    const next = cb(attrs);
    return chain().updateAttributes(type(), next).run();
  };

  return {
    insertImage:
      (attrs) =>
      ({ chain, commands }) => {
        if (!attrs?.src) return false;
        const base = {
          src: attrs.src,
          srcOriginal: attrs.srcOriginal || attrs.src,
          alt: attrs.alt || null,
          title: attrs.title || null,
          width: attrs.width || null,
          height: attrs.height || null,
        };
        return chain().setNode(type(), base).run();
      },

    replaceImage:
      (attrs) =>
      ({ chain, state }) => {
        if (!isImageSelection({ state })) return false;
        const next = {
          ...(attrs || {}),
          srcOriginal: attrs?.srcOriginal || attrs?.src || state.selection.node.attrs.srcOriginal || null,
        };
        return chain().updateAttributes(type(), next).run();
      },

    setImageAttrs:
      (nextAttrs) =>
      ({ chain }) =>
        chain().updateAttributes(type(), nextAttrs).run(),

    resetImage:
      () =>
      ({ chain }) =>
        chain().updateAttributes(type(), {
          rotation: 0,
          crop: null,
          filterPreset: 'none',
          brightness: 100,
          contrast: 100,
          opacity: 100,
        }).run(),

    // Size & Rotation
    setImageSize:
      ({ width, height, keepAspect = true }) =>
      updateSelected((attrs) => {
        const next = { ...attrs, keepAspect };
        if (width != null) next.width = Math.max(10, Math.round(width));
        if (height != null) next.height = Math.max(10, Math.round(height));
        return next;
      }),

    rotateImage:
      (degDelta = 90) =>
      updateSelected((attrs) => ({ ...attrs, rotation: Math.round((attrs.rotation || 0) + degDelta) })),

    // Wrapping & Position
    setWrapMode:
      (mode = 'inline') =>
      updateSelected((attrs) => ({ ...attrs, wrapMode: mode })),

    setMargins:
      ({ top, right, bottom, left }) =>
      updateSelected((attrs) => ({
        ...attrs,
        marginTop: top ?? attrs.marginTop,
        marginRight: right ?? attrs.marginRight,
        marginBottom: bottom ?? attrs.marginBottom,
        marginLeft: left ?? attrs.marginLeft,
      })),

    setPositioning:
      ({ position = 'move', x, y, align }) =>
      updateSelected((attrs) => ({
        ...attrs,
        position,
        x: x ?? attrs.x,
        y: y ?? attrs.y,
        align: align ?? attrs.align,
      })),

    nudgeImage:
      ({ dx = 0, dy = 0, big = false }) =>
      updateSelected((attrs) => {
        const step = big ? 10 : 1;
        if (attrs.position !== 'fixed') return attrs;
        return { ...attrs, x: (attrs.x || 0) + dx * step, y: (attrs.y || 0) + dy * step };
      }),

    // Crop
    toggleCropMode:
      () =>
      updateSelected((attrs) => ({
        ...attrs,
        isCropping: !attrs.isCropping,
        crop: attrs.crop || { x: 0, y: 0, w: attrs.width || 100, h: attrs.height || 100 },
      })),

    setCrop:
      (crop) =>
      updateSelected((attrs) => ({ ...attrs, crop })),

    clearCrop:
      () =>
      updateSelected((attrs) => ({ ...attrs, crop: null, isCropping: false })),

    // Effects
    setFilterPreset:
      (preset = 'none') =>
      updateSelected((attrs) => ({ ...attrs, filterPreset: preset })),

    setAdjustments:
      ({ brightness, contrast, opacity }) =>
      updateSelected((attrs) => ({
        ...attrs,
        brightness: brightness ?? attrs.brightness,
        contrast: contrast ?? attrs.contrast,
        opacity: opacity ?? attrs.opacity,
      })),

    // Alt text
    setAltText:
      (alt) =>
      updateSelected((attrs) => ({ ...attrs, alt })),
  };
}
