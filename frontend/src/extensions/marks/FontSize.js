// src/extensions/marks/FontSize.js
import { Extension } from '@tiptap/core';

/**
 * Adds a `fontSize` attribute to the `textStyle` mark.
 * We keep size as a CSS value (e.g., "14px", "1rem"). Numbers are treated as px.
 */
const FontSize = Extension.create({
  name: 'fontSize',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => {
              const size = element.style.fontSize;
              return size || null;
            },
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              // If it's numeric, treat as px
              const value = /^\d+(\.\d+)?$/.test(String(attributes.fontSize))
                ? `${attributes.fontSize}px`
                : attributes.fontSize;
              return {
                style: `font-size: ${value}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        size =>
        ({ chain }) => {
          const value =
            /^\d+(\.\d+)?$/.test(String(size)) ? `${size}px` : size || null;
          return chain().setMark('textStyle', { fontSize: value }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: null }).run();
        },
    };
  },
});

export default FontSize;
