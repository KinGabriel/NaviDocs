// src/extensions/fields/EditableField.js
import { Node } from "@tiptap/core";

export const EditableField = Node.create({
  name: "editableField",
  group: "inline",
  inline: true,
  atom: true, // makes it behave as a single unit (not editable inside)
  selectable: true,

  addAttributes() {
    return {
      key: { default: null }, // unique ID
      type: { default: "text" }, // "text" | "image"
      placeholder: { default: "" }, // visible placeholder text or image
      tags: { default: [] }, // array of tag IDs
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
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { key, type, placeholder, tags = [] } = HTMLAttributes;
    const tagColors =
      Array.isArray(tags) && tags.length > 0
        ? `data-tags="${tags.join(",")}"`
        : "";

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
      ...tagColors,
    };

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
        placeholder,
      ],
    ];
  },

  addCommands() {
    return {
      insertEditableField:
        ({ key, type = "text", placeholder = "", tags = [] }) =>
        ({ chain }) => {
          if (!key || !placeholder) return false;

          // Insert node + trailing space (caret placed after)
          return chain()
            .insertContent([
              {
                type: this.name,
                attrs: { key, type, placeholder, tags },
              },
              { type: "text", text: " " },
            ])
            .focus()
            .run();
        },
    };
  },
});
