// src/extensions/image/ImageNode.js
import { mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';

import ImageNodeView from '../image/ImageNodeView.jsx';
import imageCommands from '../image/commands.js';
import imageKeymap from '../image/keymap.js';

import cropPlugin from './plugins/cropPlugin';
import wrapPositionPlugin from './plugins/wrapPositionPlugin';

/**
 * RichImage — replaces @tiptap/extension-image with:
 * - Extra attrs: transforms, layout, meta, non-destructive crop, effects
 * - React NodeView with selection box, resize/rotate handles, crop entry
 * - Rich commands & keymaps
 */

const RichImage = Image.extend({
  name: 'richImage',

  group: 'inline', // keep inline; wrapping/position is handled by attrs + NodeView CSS
  inline: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {},
      // Optional callback to open your sidebar/panel
      onOpenImageOptions: null,
    };
  },

  addAttributes() {
    // NOTE: src/alt/title are inherited from Image
    return {
      ...this.parent?.(),

      // Always keep original (never overwrite) — helpful when cropping/filters are applied
      srcOriginal: {
        default: null,
        parseHTML: element => element.getAttribute('data-src-original') || element.getAttribute('src') || null,
        renderHTML: attributes => {
          if (!attributes.srcOriginal) return {};
          return { 'data-src-original': attributes.srcOriginal };
        },
      },

      // Size / rotation
      width: { default: null },
      height: { default: null },
      keepAspect: { default: true },
      rotation: { default: 0 }, // degrees

      // Non-destructive crop (coords relative to ORIGINAL bitmap)
      crop: {
        default: null, // { x, y, w, h }
        parseHTML: el => {
          const raw = el.getAttribute('data-crop');
          if (!raw) return null;
          try { return JSON.parse(raw); } catch { return null; }
        },
        renderHTML: attrs => {
          if (!attrs.crop) return {};
          return { 'data-crop': JSON.stringify(attrs.crop) };
        },
      },

      // Layout & positioning
      wrapMode: { default: 'inline' }, // inline | square | tight | break
      marginTop: { default: 0 },
      marginRight: { default: 0 },
      marginBottom: { default: 0 },
      marginLeft: { default: 0 },
      align: { default: 'left' }, // left | center | right (applies when block-like)
      position: { default: 'move' }, // move | fixed
      x: { default: 0 }, // used when position === 'fixed'
      y: { default: 0 },

      // Effects
      filterPreset: { default: 'none' }, // none | grayscale | sepia | duoLight | duoDark
      brightness: { default: 100 }, // %
      contrast: { default: 100 }, // %
      opacity: { default: 100 }, // %

      // Accessibility
      alt: {
        default: null,
      },

      // UI state (ephemeral; OK to persist for now)
      isCropping: { default: false },
    };
  },

  parseHTML() {
    // Reuse default img tag parsing, but we also accept figure > img
    return [
      { tag: 'img[src]' },
      { tag: 'figure img[src]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Keep DOM simple; NodeView decorates at runtime.
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView, { contentEditable: false });
  },

  addCommands() {
    // Bring in chainable commands
    return imageCommands(this);
  },

  addKeyboardShortcuts() {
    // Provide keyboard helpers (toggle crop, rotate, nudge, reset, open options)
    return imageKeymap(this);
  },


  addProseMirrorPlugins() {
    const name = this.name; // 'richImage'
    return [
      cropPlugin({ nodeTypeName: name }),
      wrapPositionPlugin({ nodeTypeName: name }),
    ];
  },
});

export default RichImage;
