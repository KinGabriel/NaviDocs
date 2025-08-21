// src/extensions/template/DocumentPages.js
import Document from "@tiptap/extension-document";


// Replace StarterKit's Document so top-level is strictly page+
export const DocumentPages = Document.extend({
// The underlying node name is still 'doc'; we only change its content rule
content: "page+",
});


export default DocumentPages;