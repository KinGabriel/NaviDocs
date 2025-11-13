// src/extensions/fields/EditableField.js
import { Node } from "@tiptap/core";

export const EditableField = Node.create({
  name: "editableField",
  group: "inline",
  inline: true,
  atom: false,
  content: "text*",
  selectable: true,

  addAttributes() {
    return {
      // Core field metadata
      key: { default: null },            // unique ID
      type: { default: "text" },         // "text" | "date"
      placeholder: { default: "" },      // visible placeholder text
      tags: { default: [] },             // array of tag IDs

      // For date fields
      dateFormat: { default: null },

      // Group + font style (coming from FieldsPanel group settings)
      groupId: { default: null },        // which accordion/group this field belongs to
      fontFamily: { default: null },     // e.g. "Inter"
      fontSize: { default: null },       // number (pt)
      bold: { default: false },          // boolean
      italic: { default: false },        // boolean
      color: { default: null },          // hex or css color
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-node="editable-field"]',
        getAttrs: (el) => {
          const tagsAttr = el.getAttribute("data-tags");
          const rawFontSize = el.getAttribute("data-font-size");
          let parsedFontSize = null;
          if (rawFontSize != null && rawFontSize !== "") {
            const n = parseInt(rawFontSize, 10);
            if (!Number.isNaN(n)) parsedFontSize = n;
          }

          return {
            key: el.getAttribute("data-field"),
            type: el.getAttribute("data-type") || "text",
            placeholder: el.getAttribute("data-ph") || "",
            tags: tagsAttr ? tagsAttr.split(",") : [],
            dateFormat: el.getAttribute("data-format") || null,

            groupId: el.getAttribute("data-group") || null,
            fontFamily: el.getAttribute("data-font-family") || null,
            fontSize: parsedFontSize,
            bold: el.getAttribute("data-bold") === "true",
            italic: el.getAttribute("data-italic") === "true",
            color: el.getAttribute("data-color") || null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const {
      key,
      type,
      placeholder,
      dateFormat,

      groupId,
      fontFamily,
      fontSize,
      bold,
      italic,
      color,
    } = HTMLAttributes;

    const baseAttrs = {
      "data-node": "editable-field",
      "data-field": key,
      "data-type": type,
      "data-ph": placeholder,
      class: `nd-editable-field nd-editable-field--${type}`,
      contenteditable: "false",
      draggable: "false",
      spellcheck: "false",
      tabindex: "0",
      role: "textbox",
      "aria-label": `Editable Field: ${key}`,
    };

    if (type === "date" && dateFormat) {
      baseAttrs["data-format"] = dateFormat;
    }

    // Persist group + font style on the DOM for other consumers (export, inspectors, etc.)
    if (groupId) {
      baseAttrs["data-group"] = groupId;
    }
    if (fontFamily) {
      baseAttrs["data-font-family"] = fontFamily;
    }
    if (typeof fontSize === "number" && fontSize > 0) {
      baseAttrs["data-font-size"] = String(fontSize);
    }
    if (typeof bold === "boolean") {
      baseAttrs["data-bold"] = String(bold);
    }
    if (typeof italic === "boolean") {
      baseAttrs["data-italic"] = String(italic);
    }
    if (color) {
      baseAttrs["data-color"] = color;
    }

    // Build inline style for the visible text/placeholder span
    const styleParts = [];

    if (fontFamily) {
      // Use raw family; SYSTEM_FALLBACKS logic is handled on the React side
      styleParts.push(`font-family: "${fontFamily}", system-ui, sans-serif`);
    }

    if (typeof fontSize === "number" && fontSize > 0) {
      // Group size is defined in pt; apply as pt in CSS
      styleParts.push(`font-size: ${fontSize}pt`);
    }

    if (bold) {
      styleParts.push("font-weight: bold");
    }

    if (italic) {
      styleParts.push("font-style: italic");
    }

    if (color) {
      styleParts.push(`color: ${color}`);
    }

    const inlineStyle = styleParts.length ? styleParts.join("; ") : null;

    // Text / Date fields share the same inner text span
    return [
      "span",
      baseAttrs,
      [
        "span",
        {
          class: "nd-editable-field__text",
          "data-placeholder": placeholder,
          // inline style makes placeholder + filled text visually follow group font settings
          ...(inlineStyle ? { style: inlineStyle } : {}),
        },
        0,
      ],
    ];
  },

  addCommands() {
    return {
      // Accept a generic attrs object so caller (FieldsPanel / TextEditor)
      // controls type-specific and font-style props.
      insertEditableField:
        (attrs = {}) =>
        ({ chain }) => {
          const key = attrs.key;
          const placeholder = attrs.placeholder ?? "";

          if (!key || !placeholder) return false;

          return chain()
            .insertContent([
              {
                type: this.name,
                attrs,
              },
              { type: "text", text: " " },
            ])
            .focus()
            .run();
        },
    };
  },
});
