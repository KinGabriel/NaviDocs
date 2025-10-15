// src/extensions/fields/EditableField.js
import { Node } from "@tiptap/core";

export const EditableField = Node.create({
  name: "editableField",
  group: "inline",
  inline: true,
  content: "text*",
  addAttributes() {
    return {
      key: { default: null },
      type: { default: "text" },      // "text" | "image"
      placeholder: { default: "" },   // required
    };
  },
  parseHTML() {
    return [{
      tag: 'span[data-node="editable-field"]',
      getAttrs: el => ({
        key: el.getAttribute("data-field"),
        type: el.getAttribute("data-type") || "text",
        placeholder: el.getAttribute("data-ph") || "",
      }),
    }];
  },
  renderHTML({ HTMLAttributes }) {
    const { key, type, placeholder } = HTMLAttributes;
    const attrs = {
      "data-node": "editable-field",
      "data-field": key,
      "data-type": type,
      "data-ph": placeholder,
      class: `nd-editable-field nd-editable-field--${type}`,
      role: "textbox",
      "aria-label": `Editable Field: ${key}`,
    };
    if (type === "image") {
      return [
        "span",
        attrs,
        ["span", { class: "nd-image-field-frame", "data-placeholder": "Upload image" }],
      ];
    }
    return ["span", attrs, 0];
  },
  addCommands() {
    return {
      insertEditableField:
        ({ key, type = "text", placeholder }) =>
        ({ chain }) => {
          if (!key || !placeholder) return false;

          // Insert the field, then a single space, so the caret ends *after* the box.
          return chain()
            .insertContent([
              { type: this.name, attrs: { key, type, placeholder } },
              { type: "text", text: " " },
            ])
            .run();
        },
    };
  },
});
