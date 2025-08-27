import React, { useState } from "react";
import {
  FileText,
  MoreVertical,
  X,
  Download,
  Trash2,
  Maximize2,
  Minimize2,
  Pencil,
  FolderCog,
  Move,
} from "lucide-react";

export default function FileComponent({
  file, // string or { name, url }
  index,
  isMenuOpen,
  toggleMenu,
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isOrganizeOpen, setIsOrganizeOpen] = useState(false);

  const fileName = typeof file === "string" ? file : file?.name;
  const fileUrl = typeof file === "string" ? null : file?.url;

  const handleDownload = () => {
    if (!fileUrl) return;
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName || "file";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <>
      {/* Card */}
      <div
        onClick={() => setOpen(true)}
        className="group relative bg-white border border-gray-300 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer"
      >
        {/* 3-bullets */}
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMenu(`file-${index}`);
            }}
            className="p-1 rounded-full hover:bg-gray-200"
            aria-label="file menu"
          >
            <MoreVertical size={18} className="text-gray-600" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg z-50">
              <ul className="text-sm text-gray-700">
                {/* Download */}
                <li
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload();
                  }}
                >
                  <Download size={16} className="text-gray-600" />
                  Download
                </li>

                {/* Rename */}
                <li className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer">
                  <Pencil size={16} className="text-gray-600" />
                  Rename
                </li>

                {/* Organize with submenu */}
                <li
                  className="relative flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onMouseEnter={() => setIsOrganizeOpen(true)}
                  onMouseLeave={() => setIsOrganizeOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <FolderCog size={16} className="text-gray-600" />
                    Organize
                  </div>
                  <span className="text-gray-500 text-xs">▶</span>

                  {isOrganizeOpen && (
                    <ul className="absolute left-full top-0 ml-1 w-32 bg-white border rounded-lg shadow-md">
                      <li className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer">
                        <Move size={16} className="text-gray-600" />
                        Move
                      </li>
                    </ul>
                  )}
                </li>

                {/* Remove */}
                <li className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 cursor-pointer">
                  <Trash2 size={16} className="text-red-600" />
                  Remove
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Preview tile */}
        <div className="h-40 flex items-center justify-center bg-gray-50 rounded-t-xl">
          <FileText className="w-10 h-10 text-gray-300" />
        </div>

        {/* Info */}
        <div className="border-t px-3 py-3 rounded-b-xl min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate" title={fileName}>
            {fileName}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Filled-out document</p>
        </div>
      </div>

      {/* Preview Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className={`bg-white rounded-lg shadow-lg relative transition-all flex flex-col ${
              expanded ? "w-[95vw] h-[95vh]" : "w-[800px] max-w-[95vw] h-[90vh]"
            }`}
          >
            {/* Close */}
            <button
              className="absolute top-3 right-3 text-gray-600 hover:text-black"
              onClick={() => setOpen(false)}
            >
              <X size={22} />
            </button>

            {/* Expand / Collapse */}
            <button
              className="absolute top-3 right-12 text-gray-600 hover:text-black"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
            </button>

            {/* Title */}
            <h2 className="text-lg font-bold mb-4 px-6 pt-6">{fileName}</h2>

            {/* Preview section */}
            <div className="flex-1 border rounded-md bg-gray-50 overflow-hidden mx-6">
              {fileUrl && fileName?.toLowerCase().endsWith(".pdf") ? (
                <iframe title="preview" src={fileUrl} className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  Preview not available. (Provide a PDF URL to render here)
                </div>
              )}
            </div>

            {/* Action buttons pinned at bottom */}
            <div className="p-4 flex justify-end gap-3 border-t bg-white">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                <Download size={18} /> Download
              </button>
              <button className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                <Trash2 size={18} /> Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
