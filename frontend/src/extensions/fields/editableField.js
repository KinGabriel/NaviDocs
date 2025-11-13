// src/extensions/fields/EditableField.js
import { Node } from "@tiptap/core";

export const EditableField = Node.create({
  name: "editableField",
  group: "inline",
  inline: true,
  // Render from node content so textContent updates are visible
  // (no longer an atom)
  atom: false,
  content: "text*",
  selectable: true,

  addAttributes() {
    return {
      key: { default: null },                // unique ID
      type: { default: "text" },             // "text" | "image" | "date"
      placeholder: { default: "" },          // visible placeholder text or image
      tags: { default: [] },                 // array of tag IDs
      dateFormat: { default: null },         // only used when type === "date"
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-node="editable-field"]',
        getAttrs: (el) => ({
          key: el.getAttribute("data-field"),
          type: el.getAttribute("data-type") || "text",
          placeholder: el.getAttribute("data-ph") || "",
          tags: el.getAttribute("data-tags")
            ? el.getAttribute("data-tags").split(",")
            : [],
          dateFormat: el.getAttribute("data-format") || null,
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { key, type, placeholder, dateFormat } = HTMLAttributes;

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

    // Image field frame
    if (type === "image") {
      return [
        "span",
        baseAttrs,
        [
          "span",
          {
            class: "nd-image-field-frame",
            "data-placeholder": placeholder || "Upload image",
          },
        ],
      ];
    }

    return [
      "span",
      baseAttrs,
      [
        "span",
        {
          class: "nd-editable-field__text",
          "data-placeholder": placeholder,
        },
        0,
      ],
    ];
  },

  addCommands() {
    return {
      insertEditableField:
        ({ key, type = "text", placeholder = "", tags = [], dateFormat = null }) =>
        ({ chain }) => {
          if (!key || !placeholder) return false;

          const attrs = {
            key,
            type,
            placeholder,
            tags,
          };

          if (type === "date" && dateFormat) {
            attrs.dateFormat = dateFormat;
          }

          // Insert node + trailing space (caret placed after)
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
