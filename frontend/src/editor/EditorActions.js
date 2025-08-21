// src/editor/EditorActions.js
// Centralized, selection-safe actions for panels to call.

export default function createEditorActions(editor) {
  const ensure = () => {
    if (!editor) throw new Error("Editor not ready");
    return editor;
  };

  const normalizeFontSize = (size) => {
    // Accepts number or string with unit. Default to px if number.
    if (size == null) return null;
    if (typeof size === "number") return `${Math.max(8, Math.min(72, size))}px`;
    const trimmed = String(size).trim();
    if (/^\d+$/.test(trimmed)) return `${Math.max(8, Math.min(72, Number(trimmed)))}px`;
    return trimmed; // assume with unit
  };

  // ---------- Marks / formatting ----------
  const toggleBold = () => ensure().chain().focus().toggleBold().run();
  const toggleItalic = () => ensure().chain().focus().toggleItalic().run();
  const toggleUnderline = () => ensure().chain().focus().toggleUnderline().run();
  const toggleStrike = () => ensure().chain().focus().toggleStrike().run();

  const toggleSuperscript = () => {
    // Ensure mutual exclusivity with subscript
    const ed = ensure();
    const chain = ed.chain().focus();
    if (ed.isActive('subscript')) chain.unsetSubscript();
    chain.toggleSuperscript().run();
  };

  const toggleSubscript = () => {
    const ed = ensure();
    const chain = ed.chain().focus();
    if (ed.isActive('superscript')) chain.unsetSuperscript();
    chain.toggleSubscript().run();
  };

  const setColor = (color) =>
    ensure().chain().focus().setColor(color || null).run();

  const setFontFamily = (family) =>
    ensure().chain().focus().setFontFamily(family || null).run();

  const setFontSize = (size) => {
    const normalized = normalizeFontSize(size);
    return ensure().chain().focus().setFontSize(normalized).run();
  };

  const incrementFontSize = (delta = 1) => {
    const ed = ensure();
    const a = ed.getAttributes('textStyle') || {};
    const current = a.fontSize ? a.fontSize : '16px';
    const numeric = Number(String(current).replace(/[^0-9.]/g, '')) || 16;
    return setFontSize(numeric + delta);
  };

  // ---------- Transform case on selection ----------
  const transformCase = (type /* 'titlecase' | 'uppercase' | 'lowercase' */) => {
    const ed = ensure();
    const { state, view } = ed;
    const { from, to, empty } = state.selection;

    if (empty || from === to) return false;

    // Extract raw text in selection
    const selectedText = state.doc.textBetween(from, to, '\n');

    let transformed = selectedText;
    switch (type) {
      case 'titlecase':
        // Title-case words while preserving punctuation/spacing
        transformed = selectedText.replace(/\b([\p{L}\p{M}][\p{L}\p{M}'’\-]*)\b/gu, (w) =>
          w[0].toUpperCase() + w.slice(1).toLowerCase()
        );
        break;
      case 'uppercase':
        transformed = selectedText.toUpperCase();
        break;
      case 'lowercase':
        transformed = selectedText.toLowerCase();
        break;
      default:
        return false;
    }

    const tr = state.tr.insertText(transformed, from, to);
    // Optional: keep pagination calm
    tr.setMeta('paginatorReflow', false);
    view.dispatch(tr);
    return true;
  };

  return {
    // Basic toggles
    toggleBold,
    toggleItalic,
    toggleUnderline,
    toggleStrike,
    toggleSuperscript,
    toggleSubscript,

    // TextStyle attributes
    setColor,
    setFontFamily,
    setFontSize,
    incrementFontSize,

    // Utilities
    transformCase,
  };
}
