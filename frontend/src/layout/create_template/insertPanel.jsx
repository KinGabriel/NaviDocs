// src/layout/create_template/insertPanel.jsx
import { useState } from 'react';

export default function InsertPanel({ editor }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  const handleInsertTable = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({
        rows: parseInt(rows),
        cols: parseInt(cols),
        withHeaderRow: true,
      })
      .run();
  };

  // Compute the inner content width of the current page (page width minus left/right padding)
  const getUsablePageContentWidth = () => {
    // Prefer the currently focused page; fallback to the first .nd-page
    const pageEl =
      editor?.view?.dom?.closest?.('.nd-page') ||
      document.querySelector('.nd-page');

    if (!pageEl) {
      // Fallback to CSS vars if no page element found
      const rs = getComputedStyle(document.documentElement);
      const pageWidthPx = parseFloat(rs.getPropertyValue('--nd-page-width')) || 800;
      const padL = parseFloat(rs.getPropertyValue('--nd-margin-left')) || 96;
      const padR = parseFloat(rs.getPropertyValue('--nd-margin-right')) || 96;
      return Math.max(100, Math.round(pageWidthPx - padL - padR));
    }

    const cs = getComputedStyle(pageEl);
    const rectW = pageEl.getBoundingClientRect().width;
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    // Inner content box (where paragraphs/images live)
    const inner = Math.max(100, Math.round(rectW - padL - padR));
    return inner;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;

      // Load to get natural dimensions, then scale to fit the page’s inner width
      const img = new Image();
      img.onload = () => {
        const usableW = getUsablePageContentWidth();
        const natW = img.naturalWidth || 1;
        const natH = img.naturalHeight || 1;

        const scale = Math.min(1, usableW / natW);
        const width = Math.round(natW * scale);
        const height = Math.round(natH * scale);

        // Insert via RichImage’s command (we replaced base Image)
        const ok = editor
          .chain()
          .focus()
          .insertImage({
            src,
            srcOriginal: src,
            width,
            height,
            keepAspect: true,
            wrapMode: 'break', // show on its own line like Docs
          })
          .run();

        if (!ok) {
          // Very rare fallback
          editor
            .chain()
            .focus()
            .insertContent({
              type: 'richImage',
              attrs: {
                src,
                srcOriginal: src,
                width,
                height,
                keepAspect: true,
                wrapMode: 'break',
              },
            })
            .run();
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);

    // Allow selecting the same file again
    e.target.value = '';
  };

  const isInTable = editor?.isActive('table');

  return (
    <div className="w-full p-4 space-y-6">
      {/* Image Upload */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Insert Image</h2>
        <label className="w-full bg-gray-100 border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-40 cursor-pointer hover:bg-gray-200">
          <span className="text-gray-600">Upload Image</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Table Insertion */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Insert Table</h2>
        <div className="flex gap-4 mb-3">
          <div className="flex flex-col">
            <label className="text-sm font-medium">Rows</label>
            <input
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => setRows(parseInt(e.target.value) || 1)}
              className="border px-2 py-1 rounded-md w-20"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium">Columns</label>
            <input
              type="number"
              min={1}
              max={10}
              value={cols}
              onChange={(e) => setCols(parseInt(e.target.value) || 1)}
              className="border px-2 py-1 rounded-md w-20"
            />
          </div>
          <button
            onClick={handleInsertTable}
            disabled={!editor}
            className="self-end bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Insert Table
          </button>
        </div>

        {/* Table Functionality Buttons - will display if table is clicked */}
        {isInTable && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
              Add Column Before
            </button>
            <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
              Add Column After
            </button>
            <button onClick={() => editor.chain().focus().addRowBefore().run()} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
              Add Row Before
            </button>
            <button onClick={() => editor.chain().focus().addRowAfter().run()} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
              Add Row After
            </button>
            <button onClick={() => editor.chain().focus().deleteColumn().run()} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
              Delete Column
            </button>
            <button onClick={() => editor.chain().focus().deleteRow().run()} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
              Delete Row
            </button>
            <button onClick={() => editor.chain().focus().deleteTable().run()} className="col-span-2 bg-red-200 text-black px-3 py-1 rounded hover:bg-red-400">
              Delete Table
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
