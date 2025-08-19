// src/layout/create_template/textEditor.jsx
import { useEffect, useMemo, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Underline from "@tiptap/extension-underline";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";

import { Page } from "../../extensions/template/Page";
import { PageBreak } from "../../extensions/template/PageBreak";
import { AutoPaginator, BackspaceRemovePagePlugin } from "../../extensions/template/AutoPaginator";

const PAGE_SIZES = {
  letter: { wIn: 8.5, hIn: 11 },
  legal: { wIn: 8.5, hIn: 14 },
  A4: { wIn: 8.27, hIn: 11.69 },
};

function getDimsInches({ paperSize = "A4", orientation = "Portrait" }) {
  const s = PAGE_SIZES[paperSize] || PAGE_SIZES.A4;
  const landscape = orientation === "Landscape";
  return { widthIn: landscape ? s.hIn : s.wIn, heightIn: landscape ? s.wIn : s.hIn };
}

export default function TextEditor({
  content = "<p></p>",
  pageSetup = {
    paperSize: "A4",
    orientation: "Portrait",
    margins: { top: 1, bottom: 1, left: 1, right: 1 },
  },
  onEditorReady,
  onContentChange,
}) {
  const paginatorRef = useRef(null);
  const backspaceRef = useRef(null);

  const pageCssVars = useMemo(() => {
    const { widthIn, heightIn } = getDimsInches(pageSetup);
    const m = pageSetup?.margins || { top: 1, bottom: 1, left: 1, right: 1 };
    return {
      ["--nd-page-width"]: `${widthIn}in`,
      ["--nd-page-height"]: `${heightIn}in`,
      ["--nd-pad-top"]: `${m.top}in`,
      ["--nd-pad-bottom"]: `${m.bottom}in`,
      ["--nd-pad-left"]: `${m.left}in`,
      ["--nd-pad-right"]: `${m.right}in`,
    };
  }, [pageSetup]);

  const editor = useEditor({
    extensions: [
      Page,
      PageBreak,            // optional, for manual breaks
      StarterKit.configure({ paragraph: { keepOnSplit: false } }),
      TextStyle,
      Color,
      FontFamily,
      Underline,
      Superscript,
      Subscript,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
    ],
    content,
    autofocus: true,
    onUpdate: ({ editor }) => onContentChange?.(editor.getHTML()),
    onCreate: ({ editor }) => {
      // Ensure we always start inside a <section data-type="nd-page">
      const hasPage = editor.state.doc.content.content.some(
        n => n.type && n.type.name === "page"
      );
      if (!hasPage) {
        const html = editor.getHTML();
        editor.commands.setContent(
          `<section data-type="nd-page">${html || "<p></p>"}</section>`,
          false
        );
      }
    },
  });

  // Expose editor
  useEffect(() => { if (editor) onEditorReady?.(editor); }, [editor, onEditorReady]);

  // Install Backspace-join plugin once
  useEffect(() => {
    if (!editor || backspaceRef.current) return;
    const plugin = BackspaceRemovePagePlugin();   // view-level handler

    const nextState = editor.state.reconfigure({
      plugins: [plugin, ...editor.state.plugins], // PREPEND for priority
    });
    editor.view.updateState(nextState);
    backspaceRef.current = plugin;

    return () => {
      if (!editor || !backspaceRef.current) return;
      const cleaned = editor.state.plugins.filter(p => p !== backspaceRef.current);
      editor.view.updateState(editor.state.reconfigure({ plugins: cleaned }));
      backspaceRef.current = null;
    };
  }, [editor]);

  // Install/refresh AutoPaginator (reconfigure state)
  useEffect(() => {
    if (!editor) return;
    const plugin = AutoPaginator();

    const withoutOld = paginatorRef.current
      ? editor.state.plugins.filter(p => p !== paginatorRef.current)
      : editor.state.plugins;

    const next = [...withoutOld, plugin];
    const nextState = editor.state.reconfigure({ plugins: next });
    editor.view.updateState(nextState);
    paginatorRef.current = plugin;

    return () => {
      if (!editor || !paginatorRef.current) return;
      const cleaned = editor.state.plugins.filter(p => p !== paginatorRef.current);
      editor.view.updateState(editor.state.reconfigure({ plugins: cleaned }));
      paginatorRef.current = null;
    };
  }, [editor, pageSetup]);

  return (
    <div className="flex-1 overflow-auto bg-[#f5f5f7]" style={pageCssVars}>
      <style>{`
        .nd-page {
          width: var(--nd-page-width);
          height: var(--nd-page-height);
          padding: var(--nd-pad-top) var(--nd-pad-right) var(--nd-pad-bottom) var(--nd-pad-left);
          margin: 24px auto;
          background: #ffffff;
          border: 1px solid #d1d5db;
          box-shadow: 0 1px 2px rgba(0,0,0,.04);
        }
        .nd-page-break { display: none !important; }
      `}</style>

      <div className="mx-auto my-6 max-w-[calc(var(--nd-page-width)+4rem)]">
        {editor ? (
          <EditorContent editor={editor} className="prose max-w-none" />
        ) : (
          <div className="text-sm text-gray-500">Loading editor…</div>
        )}
      </div>
    </div>
  );
}
