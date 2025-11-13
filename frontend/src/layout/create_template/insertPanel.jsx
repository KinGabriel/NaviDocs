// src/layout/create_template/insertPanel.jsx
import React, { useEffect, useReducer, useState } from "react";

export default function InsertPanel({ editor }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [cellBg, setCellBg] = useState("");
  const [, force] = useReducer((x) => x + 1, 0);

  // ---- subscribe to editor changes so buttons re-evaluate can() ----
  useEffect(() => {
    if (!editor) return;
    const handler = () => force();
    editor.on("transaction", handler);
    editor.on("selectionUpdate", handler);
    editor.on("update", handler);
    return () => {
      editor.off("transaction", handler);
      editor.off("selectionUpdate", handler);
      editor.off("update", handler);
    };
  }, [editor]);

  // ---- can/exec helpers (correct usage of editor.can()) ----
  const canExec = (fn) => {
    if (!editor) return false;
    try {
      const dry = fn(editor.can().chain().focus());
      return typeof dry?.run === "function" ? dry.run() : false;
    } catch {
      return false;
    }
  };

  const exec = (fn) => {
    if (!editor) return;
    fn(editor.chain().focus()).run();
  };

  // Smart "merge or split" based on what is possible
  const canMergeOrSplit = () => {
    if (!editor) return false;

    try {
      const canMerge = editor.can().chain().focus().mergeCells().run();
      const canSplit = editor.can().chain().focus().splitCell().run();
      return canMerge || canSplit;
    } catch {
      return false;
    }
  };

  const doMergeOrSplit = () => {
    if (!editor) return;

    // If we can merge, prefer merge
    if (editor.can().chain().focus().mergeCells().run()) {
      editor.chain().focus().mergeCells().run();
      return;
    }

    // Otherwise, if we can split, split
    if (editor.can().chain().focus().splitCell().run()) {
      editor.chain().focus().splitCell().run();
    }
  };

  const handleInsertTable = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({
        rows: Math.max(1, parseInt(rows) || 1),
        cols: Math.max(1, parseInt(cols) || 1),
        withHeaderRow: true,
      })
      .run();
  };

  // ---------- Compute usable page inner width (for image sizing) ----------
  const getUsablePageContentWidth = () => {
    const pageEl =
      editor?.view?.dom?.closest?.(".nd-page") ||
      document.querySelector(".nd-page");

    if (!pageEl) {
      const rs = getComputedStyle(document.documentElement);
      const pageWidthPx =
        parseFloat(rs.getPropertyValue("--nd-page-width")) || 800;
      const padL =
        parseFloat(rs.getPropertyValue("--nd-margin-left")) || 96;
      const padR =
        parseFloat(rs.getPropertyValue("--nd-margin-right")) || 96;
      return Math.max(100, Math.round(pageWidthPx - padL - padR));
    }

    const cs = getComputedStyle(pageEl);
    const rectW = pageEl.getBoundingClientRect().width;
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    return Math.max(100, Math.round(rectW - padL - padR));
  };

  // ---------- Image upload (uses ImagePlus -> setImage) ----------
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      const img = new Image();

      img.onload = () => {
        const usableW = getUsablePageContentWidth();
        const natW = img.naturalWidth || 1;
        const natH = img.naturalHeight || 1;
        const scale = Math.min(1, usableW / natW);
        const width = Math.round(natW * scale);
        const height = Math.round(natH * scale);

        editor
          .chain()
          .focus()
          .setImage({
            src,
            width,
            height,
            keepAspect: true,
            wrapMode: "break",
          })
          .run();
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const isInTable = !!editor?.isActive?.("table");

  const Btn = ({ onClick, label, disabled, className = "" }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-sm px-3 py-1 rounded ${
        disabled
          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : "bg-gray-100 hover:bg-gray-200"
      } ${className}`}
    >
      {label}
    </button>
  );

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

        {/* Table Tools */}
        {isInTable && (
          <div className="space-y-4 mt-4">
            {/* Structure */}
            <div>
              <h3 className="text-sm font-semibold mb-1">Structure</h3>
              <div className="grid grid-cols-2 gap-2">
                <Btn
                  onClick={() => exec((ch) => ch.addColumnBefore())}
                  label="Add Column Before"
                  disabled={!canExec((ch) => ch.addColumnBefore())}
                />
                <Btn
                  onClick={() => exec((ch) => ch.addColumnAfter())}
                  label="Add Column After"
                  disabled={!canExec((ch) => ch.addColumnAfter())}
                />
                <Btn
                  onClick={() => exec((ch) => ch.addRowBefore())}
                  label="Add Row Before"
                  disabled={!canExec((ch) => ch.addRowBefore())}
                />
                <Btn
                  onClick={() => exec((ch) => ch.addRowAfter())}
                  label="Add Row After"
                  disabled={!canExec((ch) => ch.addRowAfter())}
                />
                <Btn
                  onClick={() => exec((ch) => ch.deleteColumn())}
                  label="Delete Column"
                  disabled={!canExec((ch) => ch.deleteColumn())}
                />
                <Btn
                  onClick={() => exec((ch) => ch.deleteRow())}
                  label="Delete Row"
                  disabled={!canExec((ch) => ch.deleteRow())}
                />
                <button
                  onClick={() => exec((ch) => ch.deleteTable())}
                  className="col-span-2 bg-red-200 text-black px-3 py-1 rounded hover:bg-red-300"
                >
                  Delete Table
                </button>
              </div>
            </div>

            {/* Headers & Merge */}
            <div>
              <h3 className="text-sm font-semibold mb-1">
                Headers &amp; Merge
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <Btn
                  onClick={() => exec((ch) => ch.toggleHeaderRow())}
                  label="Toggle Header Row"
                  disabled={!canExec((ch) => ch.toggleHeaderRow())}
                />
                <Btn
                  onClick={() => exec((ch) => ch.toggleHeaderColumn())}
                  label="Toggle Header Column"
                  disabled={!canExec((ch) => ch.toggleHeaderColumn())}
                />
                <Btn
                  onClick={() => exec((ch) => ch.toggleHeaderCell())}
                  label="Toggle Header Cell"
                  disabled={!canExec((ch) => ch.toggleHeaderCell())}
                />
                <Btn
                  onClick={() => exec((ch) => ch.mergeCells())}
                  label="Merge Cells"
                  disabled={!canExec((ch) => ch.mergeCells())}
                />
                <Btn
                  onClick={() => exec((ch) => ch.splitCell())}
                  label="Split Cell"
                  disabled={!canExec((ch) => ch.splitCell())}
                />
                <Btn
                  onClick={doMergeOrSplit}
                  label="Merge or Split"
                  disabled={!canMergeOrSplit()}
                />
              </div>
            </div>

            {/* Navigate */}
            <div>
              <h3 className="text-sm font-semibold mb-1">Navigate</h3>
              <div className="grid grid-cols-2 gap-2">
                <Btn
                  onClick={() => exec((ch) => ch.goToPreviousCell())}
                  label="Previous Cell"
                  disabled={!canExec((ch) => ch.goToPreviousCell())}
                />
                <Btn
                  onClick={() => exec((ch) => ch.goToNextCell())}
                  label="Next Cell"
                  disabled={!canExec((ch) => ch.goToNextCell())}
                />
              </div>
            </div>

            {/* Maintenance */}
            <div>
              <h3 className="text-sm font-semibold mb-1">Maintenance</h3>
              <div className="grid grid-cols-1 gap-2">
                <Btn
                  onClick={() => exec((ch) => ch.fixTables())}
                  label="Fix Tables"
                  disabled={!canExec((ch) => ch.fixTables())}
                />
              </div>
            </div>

            {/* Text Align (TextAlign must include tableCell/tableHeader/image) */}
            <div>
              <h3 className="text-sm font-semibold mb-1">Text Align</h3>
              <div className="grid grid-cols-4 gap-2">
                <Btn
                  onClick={() => exec((ch) => ch.setTextAlign("left"))}
                  label="Left"
                  disabled={!canExec((ch) => ch.setTextAlign("left"))}
                />
                <Btn
                  onClick={() => exec((ch) => ch.setTextAlign("center"))}
                  label="Center"
                  disabled={!canExec((ch) => ch.setTextAlign("center"))}
                />
                <Btn
                  onClick={() => exec((ch) => ch.setTextAlign("right"))}
                  label="Right"
                  disabled={!canExec((ch) => ch.setTextAlign("right"))}
                />
                <Btn
                  onClick={() => exec((ch) => ch.unsetTextAlign())}
                  label="Clear"
                  disabled={!canExec((ch) => ch.unsetTextAlign())}
                />
              </div>
            </div>

            {/* Cell Background via setCellAttribute */}
            <div>
              <h3 className="text-sm font-semibold mb-1">
                Cell Background
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="#fff3cd or empty"
                  value={cellBg}
                  onChange={(e) => setCellBg(e.target.value)}
                  className="border px-2 py-1 rounded-md w-40"
                />
                <Btn
                  onClick={() =>
                    exec((ch) =>
                      ch.setCellAttribute(
                        "backgroundColor",
                        cellBg.trim() || null
                      )
                    )
                  }
                  label="Apply"
                  disabled={!canExec((ch) =>
                    ch.setCellAttribute(
                      "backgroundColor",
                      cellBg.trim() || null
                    )
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
