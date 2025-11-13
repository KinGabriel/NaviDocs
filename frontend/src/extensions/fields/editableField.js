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
      key: { default: null },               // unique ID
      type: { default: "text" },            // "text" | "image" | "date"
      placeholder: { default: "" },         // visible placeholder text or image
      tags: { default: [] },                // array of tag IDs

      // For date fields
      dateFormat: { default: null },

      // For image fields (future-proof for when you bind real image data)
      imageSrc: { default: null },
      imageWidth: { default: null },
      imageHeight: { default: null },
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
          imageSrc: el.getAttribute("data-src") || null,
          imageWidth: el.getAttribute("data-w") || null,
          imageHeight: el.getAttribute("data-h") || null,
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const {
      key,
      type,
      placeholder,
      dateFormat,
      imageSrc,
      imageWidth,
      imageHeight,
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

    if (type === "image") {
      // If imageSrc exists, render an <img> inside the frame
      if (imageSrc) {
        const frameAttrs = {
          class: "nd-image-field-frame",
        };

        const imgAttrs = {
          src: imageSrc,
          style: "",
        };

        if (imageWidth) imgAttrs.style += `width:${imageWidth}px;`;
        if (imageHeight) imgAttrs.style += `height:${imageHeight}px;`;
        if (!imgAttrs.style) {
          imgAttrs.style = "max-width:100%;height:auto;";
        }

        return [
          "span",
          {
            ...baseAttrs,
            "data-src": imageSrc,
            "data-w": imageWidth ?? "",
            "data-h": imageHeight ?? "",
          },
          [
            "span",
            frameAttrs,
            ["img", imgAttrs],
          ],
        ];
      }

      // No image yet – show placeholder frame
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

    // Text / Date fields share the same inner text span
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
      // Accept a generic attrs object so caller (FieldsPanel) controls type-specific props
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
