import React, { useState } from "react";
import {
  Folder,
  MoreVertical,
  Download,
  Pencil,
  FolderCog,
  Trash2,
  Move,
  Share2,
  X,
  Plus,
  Copy,
} from "lucide-react";

export default function FolderComponent({
  folder,
  index,
  isMenuOpen,
  toggleMenu,
  onClick,
}) {
  const [isOrganizeOpen, setIsOrganizeOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);

  const [emails, setEmails] = useState([
    { email: "juan@example.com", role: "Viewer" },
    { email: "maria@example.com", role: "Editor" },
  ]);
  const [inputEmail, setInputEmail] = useState("");
  const [inputRole, setInputRole] = useState("Viewer");
  const [renameValue, setRenameValue] = useState(folder.name);

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
      `https://mydrive.com/folder/${folder.name.replace(/\s+/g, "-")}`
    );
    alert("Link copied to clipboard!");
  };

  return (
    <>
      {/* Folder Card */}
      <div className="relative bg-gray-100 flex items-center justify-between px-5 py-4 shadow-sm rounded-lg border border-gray-300 hover:bg-gray-200 transition">
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={() => onClick(folder.name)}
          title={folder.name}
        >
          <Folder size={28} className="text-blue-600 flex-shrink-0" />
          <span className="font-medium text-gray-800 truncate">{folder.name}</span>
        </div>

        {/* 3-bullets Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMenu(index);
            }}
            className="p-1 rounded-full hover:bg-gray-300"
            aria-label="folder menu"
          >
            <MoreVertical size={18} className="text-gray-600" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">
              <ul className="text-sm text-gray-700">
                <li
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => alert("Download clicked")}
                >
                  <Download size={16} className="text-gray-600" /> Download
                </li>
                <li
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => setIsRenameOpen(true)}
                >
                  <Pencil size={16} className="text-gray-600" /> Rename
                </li>

                <hr className="my-1" />

                <li
                  className="relative flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onMouseEnter={() => setIsOrganizeOpen(true)}
                  onMouseLeave={() => setIsOrganizeOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <FolderCog size={16} className="text-gray-600" /> Organize
                  </div>
                  <span className="text-gray-500 text-xs">▶</span>
                  {isOrganizeOpen && (
                    <ul className="absolute left-full top-0 ml-1 w-32 bg-white border rounded-lg shadow-md">
                      <li className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer">
                        <Move size={16} className="text-gray-600" /> Move
                      </li>
                    </ul>
                  )}
                </li>

                <li
                  className="relative flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onMouseEnter={() => setIsShareMenuOpen(true)}
                  onMouseLeave={() => setIsShareMenuOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <Share2 size={16} className="text-gray-600" /> Share
                  </div>
                  <span className="text-gray-500 text-xs">▶</span>
                  {isShareMenuOpen && (
                    <ul className="absolute left-full top-0 ml-1 w-32 bg-white border rounded-lg shadow-md">
                      <li
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsShareOpen(true);
                        }}
                      >
                        Share
                      </li>
                      <li
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleCopyLink()}
                      >
                        Get Link
                      </li>
                    </ul>
                  )}
                </li>

                <hr className="my-1" />

                <li
                  className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 cursor-pointer"
                  onClick={() => setIsRemoveOpen(true)}
                >
                  <Trash2 size={16} className="text-red-600" /> Remove
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

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
              <span>
                Share <span className="text-blue-600">"{folder.name}"</span> folder
              </span>
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-lg hover:bg-gray-200"
                title="Copy link"
              >
                <Copy size={18} />
              </button>
            </h2>

            {/* School & Department */}
            <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
            <select className="w-full border rounded-lg px-3 py-2 mb-3">
              <option value="samcis">Samcis</option>
              <option value="sohnabs">Sohnabs</option>
            </select>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select className="w-full border rounded-lg px-3 py-2 mb-3">
              <option value="cis">CIS</option>
              <option value="ba">BA</option>
            </select>

            {/* Add People */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Add People</label>
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

            {/* People with access */}
            <h3 className="text-sm font-medium text-gray-700 mb-2">People with access</h3>
            <div className="space-y-2 mb-4">
              {emails.map((person, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-lg">
                  <span className="text-sm text-gray-800">{person.email}</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={person.role}
                      onChange={(e) => handleChangeRole(person.email, e.target.value)}
                      className="border rounded-lg px-2 text-sm"
                    >
                      <option value="Viewer">Viewer</option>
                      <option value="Editor">Editor</option>
                    </select>
                    <button onClick={() => handleRemoveEmail(person.email)} className="text-gray-500 hover:text-red-600">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsShareOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Share</button>
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
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
                onClick={() => setIsRenameOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  // Save rename logic here
                  alert(`Renamed to "${renameValue}"`);
                  setIsRenameOpen(false);
                }}
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
            <h2 className="text-lg font-semibold mb-4 text-red-600">Remove</h2>
            <p className="mb-4">Are you sure you want to remove "{folder.name}"?</p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
                onClick={() => setIsRemoveOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  alert(`"${folder.name}" removed`);
                  setIsRemoveOpen(false);
                }}
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
