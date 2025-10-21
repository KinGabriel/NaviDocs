
import React, { useState, useEffect, useRef } from "react";
import Dropdown3 from './dropdowns/dropdown3';
import { deleteFileAPI, deleteFileFromFolderAPI, renameFileAPI, addAccessToFileAPI } from '../api/storageAPI';
import { searchUsersByEmailAPI, getUserIdByEmailAPI } from '../api/userAPI';
import useUser from '../hooks/useUser';
import PdfThumbnail from "./thumbnails/pdfThumbnail";
import DocxThumbnail from "./thumbnails/docxThumbnail";
import RenameModal from "../components/modals/renameModal";
import RemoveModal from "../components/modals/removeModal";
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
import toast, { Toaster } from 'react-hot-toast';

export default function FileComponent({
  file,
  index,
  isMenuOpen,
  toggleMenu,
  onMoveRequest,
  onDelete,
  parentFolderId,
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isOrganizeOpen, setIsOrganizeOpen] = useState(false);
  const [organizeTimeout, setOrganizeTimeout] = useState(null);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [shareTimeout, setShareTimeout] = useState(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(null);
  const [renameInput, setRenameInput] = useState("");

  const user = useUser();

  // Refs for positioning calculations
  const organizeRef = useRef(null);
  const shareRef = useRef(null);

  // Build people with access from file data
  const initialPeople = React.useMemo(() => {
    const people = [];
    // Add owner (prefer email if available)
    let ownerEmail = file?.ownerEmail || file?.owner;
    if (!ownerEmail && user?.email) {
      // If backend does not provide owner, use current user
      ownerEmail = user.email;
    }
    if (ownerEmail) {
      people.push({
        email: ownerEmail,
        role: 'Owner',
        isOwner: true
      });
    }
    // Add allowed users
    if (file && Array.isArray(file.allowedUsers)) {
      file.allowedUsers.forEach(u => {
        if (u.email && u.role) {
          people.push({ email: u.email, role: u.role, userId: u.userId });
        } else if (u.userId && u.role) {
          people.push({ email: u.userId, role: u.role, userId: u.userId });
        }
      });
    }
    return people;
  }, [file, user]);

  const [emails, setEmails] = useState(() => initialPeople);

  // Always sync emails with backend allowedUsers when modal opens
  useEffect(() => {
    if (isShareOpen && file) {
      const people = [];
      let ownerEmail = file.ownerEmail || file.owner;
      if (!ownerEmail && user?.email) {
        ownerEmail = user.email;
      }
      if (ownerEmail) {
        people.push({
          email: ownerEmail,
          role: 'Owner',
          isOwner: true
        });
      }
      if (Array.isArray(file.allowedUsers)) {
        file.allowedUsers.forEach(u => {
          if (u.email && u.role) {
            people.push({ email: u.email, role: u.role, userId: u.userId });
          } else if (u.userId && u.role) {
            people.push({ email: u.userId, role: u.role, userId: u.userId });
          }
        });
      }
      setEmails(people);
    }
    // eslint-disable-next-line
  }, [isShareOpen, file, user]);

  const [visibility, setVisibility] = useState(file?.visibility || "private");
  const [inputEmail, setInputEmail] = useState("");
  const [inputRole, setInputRole] = useState("Viewer");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef();

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
      toast.error('Failed to download file.');
    }
  };

  // Function to determine submenu positioning
  const getSubmenuPosition = (ref) => {
    if (!ref?.current) return { right: false };
    
    const rect = ref.current.getBoundingClientRect();
    const submenuWidth = 160;
    const viewportWidth = window.innerWidth;
    const spaceOnRight = viewportWidth - rect.right;
    
    // If not enough space on the right, position submenu to the left
    return { right: spaceOnRight < submenuWidth };
  };

  const handleAddEmail = async () => {
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!inputEmail) return;
    if (!emailRegex.test(inputEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (emails.some((e) => e.email === inputEmail)) return;
    // Check if user exists via userAPI.js
    let userId;
    try {
      userId = await getUserIdByEmailAPI(inputEmail);
      if (!userId) {
        toast.error('No user found with this email.');
        return;
      }
    } catch (err) {
      toast.error('Error checking user existence.');
      return;
    }
    // Add the email and userId to the list with the selected role
    setEmails([...emails, { email: inputEmail, userId, role: inputRole }]);
    setInputEmail("");
    setInputRole("Viewer");
  };


  const handleRemoveEmail = (email) => {
    setEmails(emails.filter((e) => e.email !== email));
  };


  const handleChangeRole = (email, newRole) => {
    setEmails(
      emails.map((e) => (e.email === email ? { ...e, role: newRole } : e))
    );
  };
  // Debounced email suggestion fetcher
  const fetchEmailSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const users = await searchUsersByEmailAPI(query);
      setSuggestions(users);
    } catch (err) {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Debounced handler
  if (!debounceRef.current) {
    debounceRef.current = (function(fn, delay) {
      let timer;
      return (...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
    })(fetchEmailSuggestions, 400);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `https://mydrive.com/file/${fileName?.replace(/\s+/g, "-")}`
    );
    toast.success("Link copied to clipboard!");
  };

  return (
    <>
      {/* File Card */}
      <div
        onClick={e => {
          // Only open preview if not clicking on menu or its children
          if (
            e.target.closest('.file-menu-area') ||
            e.target.closest('.file-menu-action')
          ) return;
          setOpen(true);
        }}
        className="group relative bg-white border border-gray-300 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer"
      >
        {/* 3-bullets menu */}
        <div className="absolute top-2 right-2 file-menu-area">
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
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50 file-menu-area">
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
                    if (toggleMenu) toggleMenu(null);
                  }}
                >
                  <Pencil size={16} className="text-gray-600" />
                  Rename
                </li>

                <hr className="my-1" />

                {/* Organize with submenu */}
                <li
                  ref={organizeRef}
                  className="relative flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onMouseEnter={() => {
                    if (organizeTimeout) clearTimeout(organizeTimeout);
                    setIsOrganizeOpen(true);
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => setIsOrganizeOpen(false), 150);
                    setOrganizeTimeout(timeout);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <FolderCog size={16} className="text-gray-600" />
                    Organize
                  </div>
                  <span className="text-gray-500 text-xs">▶</span>
                   {isOrganizeOpen && (() => {
                    const position = getSubmenuPosition(organizeRef);
                    return (
                      <ul className={`absolute top-0 ${position.right ? 'right-full mr-1' : 'left-full ml-1'} w-40 bg-white border rounded-lg shadow-md overflow-hidden z-50`}>
                        <li
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={e => {
                            e.stopPropagation();
                            if (onMoveRequest) onMoveRequest(file);
                            toggleMenu(index); // Close menu when opening move modal
                          }}
                        >
                          <Move size={16} className="text-gray-600" /> Move
                        </li>
                      </ul>
                    );
                  })()}
                </li>

                {/* Share with submenu */}
                <li
                  ref={shareRef}
                  className="relative flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onMouseEnter={() => {
                    if (shareTimeout) clearTimeout(shareTimeout);
                    setIsShareMenuOpen(true);
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => setIsShareMenuOpen(false), 150);
                    setShareTimeout(timeout);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Share2 size={16} className="text-gray-600" />
                    Share
                  </div>
                  <span className="text-gray-500 text-xs">▶</span>
                  {isShareMenuOpen && (() => {
                    const position = getSubmenuPosition(shareRef);
                    return (
                      <ul 
                        className={`absolute top-0 ${position.right ? 'right-full mr-1' : 'left-full ml-1'} w-40 bg-white border rounded-lg shadow-md overflow-hidden z-50`}
                        onMouseEnter={() => {
                          if (shareTimeout) clearTimeout(shareTimeout);
                        }}
                        onMouseLeave={() => {
                          const timeout = setTimeout(() => setIsShareMenuOpen(false), 150);
                          setShareTimeout(timeout);
                        }}
                      >
                        <li
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsShareOpen(true);
                            toggleMenu(index); // Close menu when opening modal
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
                    );
                  })()}
                </li>

                <hr className="my-1" />

                {/* Remove */}
                <li
                  className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 cursor-pointer file-menu-action"
                  onClick={e => {
                    e.stopPropagation();
                    setIsRemoveOpen(true);
                    // Close the menu when opening the Remove modal
                    if (toggleMenu) toggleMenu(null);
                  }}
                >
                  <Trash2 size={16} className="text-red-600" />
                  Remove
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Preview tile */}
          <div className="h-40 flex items-center justify-center bg-gray-50 rounded-t-xl overflow-hidden">
            {fileUrl ? (
              (file?.mimetype?.toLowerCase().includes("pdf") ||
                fileName?.toLowerCase().endsWith(".pdf")) ? (
                <PdfThumbnail url={fileUrl} />
              ) : file?.mimetype?.toLowerCase().includes("word") ||
                fileName?.toLowerCase().endsWith(".docx") ? (
                <DocxThumbnail />
              ) : (
                <FileText className="w-12 h-12 text-gray-300" />
              )
            ) : (
              <FileText className="w-12 h-12 text-gray-300" />
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
          <div className="bg-white w-[500px] max-w-[95vw] rounded-xl shadow-lg p-6 relative">
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


            {/* Visibility */}
            <div className="mb-3">
              <Dropdown3
                label="Visibility"
                value={visibility}
                onChange={setVisibility}
                options={[
                  { value: 'private', label: 'Private' },
                  { value: 'public', label: 'Public' },
                ]}
                placeholder="Select visibility..."
              />
            </div>


            {/* Add people */}
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add People
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="email"
                value={inputEmail}
                onChange={(e) => {
                  setInputEmail(e.target.value);
                  debounceRef.current(e.target.value);
                }}
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

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <ul className="left-0 top-full bg-white border rounded-xl shadow  z-10 w-full max-h-60 overflow-y-auto">
                {suggestions.map((user) => (
                  <li
                    key={user.userId}
                    className="px-3 py-2 cursor-pointer hover:bg-blue-100"
                    onClick={() => {
                      setInputEmail(user.email);
                      setSuggestions([]);
                    }}
                  >
                    {user.email}
                  </li>
                ))}
              </ul>
            )}


            <h3 className="text-sm font-medium text-gray-700 mb-2">People with access</h3>
            <div className="space-y-2 mb-4">
              {emails.map((person, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-lg">
                  <span className="text-sm text-gray-800">
                    {person.email}
                    {person.isOwner && <span className="ml-2 text-xs text-blue-600 font-semibold">(Owner)</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    {person.isOwner ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Owner</span>
                    ) : (
                      <>
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
                      </>
                    )}
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
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                onClick={async () => {
  const allowedUsers = emails
    .filter(e => !e.isOwner)
    .map(e => ({
      userId: e.userId,
      role: e.role,
      email: e.email,
      grantedBy: user?.firstname + ' ' + user?.lastname,
      emailOfGrantedBy: user?.email
    }));
  const loadingToast = toast.loading("Sharing file...");
  try {
    await addAccessToFileAPI({
      fileId: file._id,
      folderId: parentFolderId,
      allowedUsers,
      visibility
    });

    toast.dismiss(loadingToast);
    toast.success("File shared successfully!");
    setIsShareOpen(false);
  } catch (err) {
    toast.dismiss(loadingToast);
    toast.error(err?.message || "You are not authorized to share this file.");
  }
}}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      <RenameModal
  open={isRenameOpen}
  onClose={() => setIsRenameOpen(false)}
  currentTitle={file.originalName}
  onSubmit={async (newTitle) => {
    try {
      if (parentFolderId) {
        await renameFileAPI(file._id, newTitle, parentFolderId);
      } else {
        await renameFileAPI(file._id, newTitle);
      }
      setIsRenameOpen(false);
      if (onDelete) onDelete(file); 
    } catch (err) {
      toast.error(err?.message || "Failed to rename file");
    }
  }}
/>

<RemoveModal
  open={isRemoveOpen}
  onClose={() => setIsRemoveOpen(false)}
  itemType="file"
  itemTitle={fileName}
  submitting={removing}
  error={removeError}
  onConfirm={async () => {
    try {
      setRemoving(true);
      setRemoveError("");

      if (parentFolderId) {
        await deleteFileFromFolderAPI(parentFolderId, file._id);
      } else {
        await deleteFileAPI(file._id);
      }

      setIsRemoveOpen(false);
      if (onDelete) onDelete(file._id);
    } catch (err) {
      console.error("Remove error:", err);
      setRemoveError("Failed to remove the file. Please try again.");
      toast.error("Failed to remove the file. Please try again.");
    } finally {
      setRemoving(false);
    }
  }}
/>
<Toaster position="top-center" reverseOrder={false} />

    </>
  );
}
