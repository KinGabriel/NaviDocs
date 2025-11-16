// src/layout/create_template/insertPanel.jsx
import React, { useState } from "react";

export default function InsertPanel({ editor }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  const getUsablePageContentWidth = () => {
    const pageEl =
      editor?.view?.dom?.closest?.(".nd-page") ||
      document.querySelector(".nd-page");

    if (!pageEl) {
      const rs = getComputedStyle(document.documentElement);
      const pageWidthPx =
        parseFloat(rs.getPropertyValue("--nd-page-width")) || 800;
      const padL = parseFloat(rs.getPropertyValue("--nd-margin-left")) || 96;
      const padR = parseFloat(rs.getPropertyValue("--nd-margin-right")) || 96;
      return Math.max(100, Math.round(pageWidthPx - padL - padR));
    }

    const cs = getComputedStyle(pageEl);
    const rectW = pageEl.getBoundingClientRect().width;
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    return Math.max(100, Math.round(rectW - padL - padR));
  };

  /* IMAGE UPLOAD */
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

        const targetW = Math.round(natW * scale);
        const targetH = Math.round(natH * scale);

        editor
          .chain()
          .focus()
          .setImage({
            src,
            width: targetW,
            height: targetH,
          })
          .run();
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* IMAGE RESIZE + ALIGNMENT */

  const isImageActive = editor?.isActive("image");
  const activeImageAttrs = isImageActive
    ? editor?.getAttributes?.("image") || {}
    : {};
  const currentAlign = activeImageAttrs["data-align"] || "inline";

  const resizeImageToFraction = (fraction) => {
    if (!editor || !isImageActive) return;

    const usableW = getUsablePageContentWidth();
    const targetW = Math.round(usableW * fraction);

    editor
      .chain()
      .focus()
      .updateAttributes("image", {
        width: targetW,
        height: null, // let browser keep aspect ratio
      })
      .run();
  };

  const resetImageSize = () => {
    if (!editor || !isImageActive) return;

    editor
      .chain()
      .focus()
      .updateAttributes("image", {
        width: null,
        height: null,
      })
      .run();
  };

  const alignImage = (align) => {
    if (!editor || !isImageActive) return;

    editor
      .chain()
      .focus()
      .updateAttributes("image", {
        "data-align": align, // styled via CSS
      })
      .run();
  };

  /* TABLE INSERTION */
  const insertTable = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run();
  };

  const addRowBelow = () => editor?.chain().focus().addRowAfter().run();
  const addRowAbove = () => editor?.chain().focus().addRowBefore().run();
  const deleteRow = () => editor?.chain().focus().deleteRow().run();

  const addColLeft = () => editor?.chain().focus().addColumnBefore().run();
  const addColRight = () => editor?.chain().focus().addColumnAfter().run();
  const deleteCol = () => editor?.chain().focus().deleteColumn().run();

  const mergeCells = () => editor?.chain().focus().mergeCells().run();
  const splitCell = () => editor?.chain().focus().splitCell().run();

  const toggleHeaderRow = () =>
    editor?.chain().focus().toggleHeaderRow().run();
  const toggleHeaderColumn = () =>
    editor?.chain().focus().toggleHeaderColumn().run();
  const toggleHeaderCell = () =>
    editor?.chain().focus().toggleHeaderCell().run();

  const deleteTable = () => editor?.chain().focus().deleteTable().run();

  const isInTable = editor?.isActive("table");

  return (
    <div className="w-full p-4 space-y-8">
      {/* IMAGE INSERT */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Insert Image</h2>

        <label className="w-full bg-gray-100 border-2 border-dashed rounded-lg flex flex-col items-center justify-center h-40 cursor-pointer hover:bg-gray-200 transition">
          <span className="text-gray-600">Upload Image</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* IMAGE TOOLS (SIZE + ALIGNMENT) */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Image Tools</h2>

        {!isImageActive && (
          <p className="text-sm text-gray-500">
            Select an image to show size and alignment options.
          </p>
        )}

        {isImageActive && (
          <div className="space-y-4">
            {/* Size options */}
            <div>
              <div className="text-sm font-medium mb-2">Size</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => resizeImageToFraction(0.25)}
                  className="bg-gray-100 px-3 py-2 rounded text-sm hover:bg-gray-200"
                >
                  25% width
                </button>
                <button
                  type="button"
                  onClick={() => resizeImageToFraction(0.5)}
                  className="bg-gray-100 px-3 py-2 rounded text-sm hover:bg-gray-200"
                >
                  50% width
                </button>
                <button
                  type="button"
                  onClick={() => resizeImageToFraction(0.75)}
                  className="bg-gray-100 px-3 py-2 rounded text-sm hover:bg-gray-200"
                >
                  75% width
                </button>
                <button
                  type="button"
                  onClick={() => resizeImageToFraction(1)}
                  className="bg-gray-100 px-3 py-2 rounded text-sm hover:bg-gray-200"
                >
                  100% width
                </button>
              </div>
            </div>

            {/* Alignment options */}
            <div>
              <div className="text-sm font-medium mb-2">Alignment</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => alignImage("left")}
                  className={`px-3 py-2 rounded text-sm border ${
                    currentAlign === "left"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  Left
                </button>
                <button
                  type="button"
                  onClick={() => alignImage("center")}
                  className={`px-3 py-2 rounded text-sm border ${
                    currentAlign === "center"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  Center
                </button>
                <button
                  type="button"
                  onClick={() => alignImage("right")}
                  className={`px-3 py-2 rounded text-sm border ${
                    currentAlign === "right"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  Right
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={resetImageSize}
              className="w-full bg-white border border-gray-300 px-3 py-2 rounded text-sm hover:bg-gray-50"
            >
              Reset size
            </button>
          </div>
        )}
      </div>

      {/* TABLE INSERTION */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Insert Table</h2>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium">Rows</label>
            <input
              type="number"
              min={1}
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              className="w-20 border rounded px-2 py-1"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium">Columns</label>
            <input
              type="number"
              min={1}
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              className="w-20 border rounded px-2 py-1"
            />
          </div>
        </div>

        <button
          onClick={insertTable}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Insert Table
        </button>
      </div>

      {/* TABLE TOOLS */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Table Tools</h2>

        {!isInTable && (
          <p className="text-gray-500 text-sm">
            Place the cursor inside a table to see options.
          </p>
        )}

        {isInTable && (
          <div className="space-y-6">
            {/* ROW CONTROLS */}
            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-700">
                Rows
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={addRowAbove}
                  className="bg-gray-100 px-3 py-2 rounded hover:bg-gray-200"
                >
                  Add Row Above
                </button>
                <button
                  onClick={addRowBelow}
                  className="bg-gray-100 px-3 py-2 rounded hover:bg-gray-200"
                >
                  Add Row Below
                </button>
                <button
                  onClick={deleteRow}
                  className="col-span-2 bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200"
                >
                  Delete Row
                </button>
              </div>
            </div>

            {/* COLUMN CONTROLS */}
            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-700">
                Columns
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={addColLeft}
                  className="bg-gray-100 px-3 py-2 rounded hover:bg-gray-200"
                >
                  Add Col Left
                </button>
                <button
                  onClick={addColRight}
                  className="bg-gray-100 px-3 py-2 rounded hover:bg-gray-200"
                >
                  Add Col Right
                </button>
                <button
                  onClick={deleteCol}
                  className="col-span-2 bg-red-100 text-red-600 px-3 py-2 rounded hover:bg-red-200"
                >
                  Delete Column
                </button>
              </div>
            </div>

            {/* MERGE / SPLIT */}
            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-700">
                Cell Operations
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={mergeCells}
                  className="bg-gray-100 px-3 py-2 rounded hover:bg-gray-200"
                >
                  Merge Cells
                </button>
                <button
                  onClick={splitCell}
                  className="bg-gray-100 px-3 py-2 rounded hover:bg-gray-200"
                >
                  Split Cell
                </button>
              </div>
            </div>

            {/* HEADER OPTIONS */}
            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-700">
                Header Options
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={toggleHeaderRow}
                  className="bg-gray-100 px-3 py-2 rounded hover:bg-gray-200"
                >
                  Toggle Header Row
                </button>
                <button
                  onClick={toggleHeaderColumn}
                  className="bg-gray-100 px-3 py-2 rounded hover:bg-gray-200"
                >
                  Toggle Header Column
                </button>
                <button
                  onClick={toggleHeaderCell}
                  className="col-span-2 bg-gray-100 px-3 py-2 rounded hover:bg-gray-200"
                >
                  Toggle Header Cell
                </button>
              </div>
            </div>

            {/* DELETE TABLE */}
            <div>
              <button
                onClick={deleteTable}
                className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Delete Table
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
