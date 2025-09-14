// src/extensions/fields/EditableField.js
import { Node } from "@tiptap/core";

export const EditableField = Node.create({
  name: "editableField",
  group: "inline",
  inline: true,

  // For text fields we want editable text content; for image fields we render an <img> (atom-like).
  // Keep content always "text*" so cursor can live inside for text-type.
  content: "text*",

  addAttributes() {
    return {
      key: { default: null },                 // Field Name (unique key)
      type: { default: "text" },              // "text" | "image"
      placeholder: { default: "" },           // required
    };
  },

  // Parse/render as <span data-field="key" data-type="text|image" data-ph="...">
  parseHTML() {
    return [
      {
        tag: 'span[data-node="editable-field"]',
        getAttrs: el => {
          const key = el.getAttribute("data-field");
          const type = el.getAttribute("data-type") || "text";
          const placeholder = el.getAttribute("data-ph") || "";
          return { key, type, placeholder };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { key, type, placeholder } = HTMLAttributes;
    const attrs = {
      "data-node": "editable-field",
      "data-field": key,
      "data-type": type,
      "data-ph": placeholder,
      class: `nd-editable-field nd-editable-field--${type}`,
      // role & aria for accessibility
      role: "textbox",
      "aria-label": `Editable Field: ${key}`,
    };

    if (type === "image") {
      // For image field we show an inline frame; the actual upload UI can target this node via selection.
      // We keep the node text-content empty; the placeholder is visually represented.
      return [
        "span",
        attrs,
        ["span", { class: "nd-image-field-frame", "data-placeholder": "Upload image" }],
      ];
    }

    // text field: render inline span with content hole (0) so user can type text
    return ["span", attrs, 0];
  },

  addCommands() {
    return {
      insertEditableField:
        ({ key, type = "text", placeholder }) =>
        ({ chain, state }) => {
          if (!key || !placeholder) return false;
          // For text fields: insert node with placeholder as initial text (you may choose empty)
          if (type === "text") {
            return chain()
              .insertContent({
                type: this.name,
                attrs: { key, type, placeholder },
                content: [{ type: "text", text: placeholder }], // start with placeholder text
              })
              .run();
          }
          // For image fields: insert as empty node (UI will handle upload)
          return chain()
            .insertContent({
              type: this.name,
              attrs: { key, type: "image", placeholder }, // placeholder holds dataURL or placeholder URL
            })
            .run();
        },
    };
  },
});

export default EditableField;
