import React, { useState } from "react";
import PdfThumbnail from "./thumbnails/pdfThumbnail";
import DocxThumbnail from "./thumbnails/docxThumbnail";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
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
  Share2,
  Plus,
  Copy,
} from "lucide-react";

export default function FileComponent({
  file,
  index,
  isMenuOpen,
  toggleMenu,
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isOrganizeOpen, setIsOrganizeOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);

  const [renameInput, setRenameInput] = useState("");
  const [emails, setEmails] = useState([
    { email: "juan@example.com", role: "Viewer" },
    { email: "maria@example.com", role: "Editor" },
  ]);
  const [inputEmail, setInputEmail] = useState("");
  const [inputRole, setInputRole] = useState("Viewer");

  const fileName = typeof file === "string" ? file : file?.originalName;
  //  fileUrl construction for all file objects (filePath, path, url)
  let fileUrl = null;
  if (typeof file !== "string" && file) {
    if (file.filePath) {
      fileUrl = `${API_URL.replace(/\/$/, '')}/${file.filePath.replace(/^\//, '')}`;
    } else if (file.path) {
      // Convert Windows path to POSIX and remove everything before /uploads
      let relPath = file.path.replace(/\\/g, '/');
      const idx = relPath.indexOf('/uploads/');
      if (idx !== -1) relPath = relPath.slice(idx + 1); // remove leading /
      fileUrl = `${API_URL.replace(/\/$/, '')}/${relPath}`;
    } else if (file.url) {
      fileUrl = file.url;
    }
  }

  const handleDownload = async () => {
    if (!fileUrl) return;
    // Always use the original file name if available
    let downloadName = (typeof file !== 'string' && file?.originalName) ? file.originalName : (fileName || 'file');
    try {
      const response = await fetch(fileUrl, { credentials: 'include' });
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        a.remove();
      }, 100);
    } catch (err) {
      alert('Failed to download file.');
    }
  };

  const handleAddEmail = () => {
    if (inputEmail && !emails.some((e) => e.email === inputEmail)) {
      setEmails([...emails, { email: inputEmail, role: inputRole }]);
      setInputEmail("");
      setInputRole("Viewer");
    }
  };

  const handleRemoveEmail = (email) => {
    setEmails(emails.filter((e) => e.email !== email));
  };

  const handleChangeRole = (email, newRole) => {
    setEmails(
      emails.map((e) => (e.email === email ? { ...e, role: newRole } : e))
    );
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `https://mydrive.com/file/${fileName?.replace(/\s+/g, "-")}`
    );
    alert("Link copied to clipboard!");
  };

  return (
    <>
      {/* File Card */}
      <div
        onClick={() => setOpen(true)}
        className="group relative bg-white border border-gray-300 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer"
      >
        {/* 3-bullets menu */}
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
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">
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
                <li
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameInput(fileName);
                    setIsRenameOpen(true);
                  }}
                >
                  <Pencil size={16} className="text-gray-600" />
                  Rename
                </li>

                <hr className="my-1" />

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

                {/* Share with submenu */}
                <li
                  className="relative flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onMouseEnter={() => setIsShareMenuOpen(true)}
                  onMouseLeave={() => setIsShareMenuOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <Share2 size={16} className="text-gray-600" />
                    Share
                  </div>
                  <span className="text-gray-500 text-xs">▶</span>

                  {isShareMenuOpen && (
                    <ul className="absolute left-full top-0 ml-1 w-36 bg-white border rounded-lg shadow-md">
                      <li
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsShareOpen(true);
                        }}
                      >
                        <Share2 size={16} className="text-gray-600" /> Share
                      </li>
                      <li
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleCopyLink()}
                      >
                        <Copy size={16} className="text-gray-600" /> Get Link
                      </li>
                    </ul>
                  )}
                </li>

                <hr className="my-1" />

                {/* Remove */}
                <li
                  className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 cursor-pointer"
                  onClick={() => setIsRemoveOpen(true)}
                >
                  <Trash2 size={16} className="text-red-600" />
                  Remove
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Preview tile */}
        <div className="h-40 flex items-center justify-center bg-gray-50 rounded-t-xl" style={{overflow: 'hidden'}}>
          {fileUrl && (
            (file?.mimetype?.toLowerCase().includes('pdf') || fileName?.toLowerCase().endsWith('.pdf')) ? (
              <PdfThumbnail url={fileUrl} width={120} height={160} />
            ) : (file?.mimetype?.toLowerCase().includes('word') || fileName?.toLowerCase().endsWith('.docx')) ? (
              <DocxThumbnail url={fileUrl} width={120} height={160} />
            ) : (
              <FileText className="w-10 h-10 text-gray-300" />
            )
          )}
        </div>

        {/* Info */}
        <div className="border-t px-3 py-3 rounded-b-xl min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate" title={fileName}>
            {fileName}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {(() => {
              const type = file?.mimetype || '';
              if (type.includes('pdf')) return 'PDF Document';
              if (type.includes('image')) return 'Image File';
              if (type.includes('word')) return 'Word Document';
              if (type.includes('excel') || type.includes('spreadsheet')) return 'Excel Spreadsheet';
              if (type.includes('text')) return 'Text File';
              if (type.includes('zip')) return 'ZIP Archive';
              if (type.includes('powerpoint')) return 'PowerPoint Presentation';
              if (type) return type;
              return 'Filled-out document';
            })()}
          </p>
          {file && (
            <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
              {file.createdAt && (
                <span>
                  Uploaded: {new Date(file.createdAt).toLocaleDateString()} {new Date(file.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {file.size && (
                <span>
                  • Size: {file.size >= 1024 * 1024
                    ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
                    : file.size >= 1024
                    ? (file.size / 1024).toFixed(1) + ' KB'
                    : file.size + ' B'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className={`bg-white rounded-lg shadow-lg relative flex flex-col ${
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
            <div className="flex-1 border rounded-md bg-gray-50 mx-6 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
              {fileUrl && (
                (file?.mimetype?.toLowerCase().includes('pdf') || fileName?.toLowerCase().endsWith('.pdf')) ? (
                  <iframe
                    title="PDF preview"
                    src={fileUrl}
                    className="w-full h-full"
                    style={{ height: '100%', width: '100%', border: 'none', overflow: 'hidden' }}
                    scrolling="no"
                  />
                ) : (file?.mimetype?.toLowerCase().includes('word') || fileName?.toLowerCase().endsWith('.docx')) ? (
                  <iframe
                    title="DOCX preview"
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                    className="w-full h-full"
                    style={{ height: '100%', width: '100%', border: 'none', overflow: 'hidden' }}
                    scrolling="no"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    Preview not available. (Provide a PDF or DOCX URL to render here)
                  </div>
                )
              )}
            </div>

            {/* Action buttons */}
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

      {/* Share Modal */}
      {isShareOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[500px] max-w-full rounded-xl shadow-lg p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
              onClick={() => setIsShareOpen(false)}
            >
              <X size={20} />
            </button>

            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>Share "{fileName}" file</span>
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-lg hover:bg-gray-200"
                title="Copy link"
              >
                <Copy size={18} />
              </button>
            </h2>

            {/* School */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              School
            </label>
            <select className="w-full border rounded-lg px-3 py-2 mb-3">
              <option value="samcis">Samcis</option>
              <option value="sohnabs">Sohnabs</option>
            </select>

            {/* Department */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select className="w-full border rounded-lg px-3 py-2 mb-3">
              <option value="cis">CIS</option>
              <option value="ba">BA</option>
            </select>

            {/* Add people */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add People
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="email"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2"
                placeholder="Enter email"
              />
              <select
                value={inputRole}
                onChange={(e) => setInputRole(e.target.value)}
                className="border rounded-lg px-2"
              >
                <option value="Viewer">Viewer</option>
                <option value="Editor">Editor</option>
              </select>
              <button
                onClick={handleAddEmail}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={16} />
              </button>
            </div>

            <h3 className="text-sm font-medium text-gray-700 mb-2">
              People with access
            </h3>
            <div className="space-y-2 mb-4">
              {emails.map((person, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-lg"
                >
                  <span className="text-sm text-gray-800">{person.email}</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={person.role}
                      onChange={(e) =>
                        handleChangeRole(person.email, e.target.value)
                      }
                      className="border rounded-lg px-2 text-sm"
                    >
                      <option value="Viewer">Viewer</option>
                      <option value="Editor">Editor</option>
                    </select>
                    <button
                      onClick={() => handleRemoveEmail(person.email)}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsShareOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {isRenameOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[400px] max-w-full rounded-xl shadow-lg p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
              onClick={() => setIsRenameOpen(false)}
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold mb-4">Rename</h2>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 mb-4"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsRenameOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsRenameOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Modal */}
      {isRemoveOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[400px] max-w-full rounded-xl shadow-lg p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-black"
              onClick={() => setIsRemoveOpen(false)}
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold mb-4">
              Are you sure you want to remove "{fileName}"?
            </h2>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsRemoveOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsRemoveOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
