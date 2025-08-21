// src/editor/useSelectionSnapshot.js
import { useEffect, useState } from 'react';

/**
 * Returns the live formatting state at the current selection/cursor.
 * Keeps UI in sync with editor without storing duplicated truth.
 */
export default function useSelectionSnapshot(editor) {
  const [snapshot, setSnapshot] = useState({
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrikethrough: false,
    isSuperscript: false,
    isSubscript: false,
    fontFamily: null,
    fontColor: null,
    fontSize: '16px',
  });

  useEffect(() => {
    if (!editor) return;

    const compute = () => {
      try {
        const textStyle = editor.getAttributes('textStyle') || {};
        const fontSizeAttr = editor.getAttributes('textStyle')?.fontSize || null;

        setSnapshot({
          isBold: editor.isActive('bold'),
          isItalic: editor.isActive('italic'),
          isUnderline: editor.isActive('underline'),
          isStrikethrough: editor.isActive('strike'),
          isSuperscript: editor.isActive('superscript'),
          isSubscript: editor.isActive('subscript'),
          fontFamily: textStyle.fontFamily || null,
          fontColor: textStyle.color || null,
          fontSize: fontSizeAttr || '16px',
        });
      } catch {
        // ignore
      }
    };

    compute();
    editor.on('selectionUpdate', compute);
    editor.on('transaction', compute);

    return () => {
      editor.off('selectionUpdate', compute);
      editor.off('transaction', compute);
    };
  }, [editor]);

  return snapshot;
}
