// Use shared options and dynamic department filtering
import { SCHOOL_OPTIONS, DEPARTMENT_OPTIONS } from "../utils/options";
import { deleteFolderByIDAPI,addAccessToFoldersAPI } from "../api/storageAPI";
import { searchUsersByEmailAPI,getUserIdByEmailAPI } from "../api/userAPI";
import React, { useState, Fragment,useEffect, useRef } from "react";
import MultiSelectDropdown from './dropdowns/multiSelectDropdown';
import Dropdown3 from './dropdowns/dropdown3';
import useUser from '../hooks/useUser';
import RenameFolderModal from "../components/modals/renameFolderModal";

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
  Copy,
} from "lucide-react";

export default function FolderComponent({
  folder,
  index,
  isMenuOpen,
  toggleMenu,
  onClick,
  onMoveRequest,
  onDelete,
}) {
  const user = useUser();
  const [isOrganizeOpen, setIsOrganizeOpen] = useState(false);
  const [organizeTimeout, setOrganizeTimeout] = useState(null);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [shareTimeout, setShareTimeout] = useState(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);

  // Refs for positioning calculations
  const organizeRef = useRef(null);
  const shareRef = useRef(null);

  // Build people with access from folder data
  const initialPeople = React.useMemo(() => {
    const people = [];
    // Add owner (prefer email if available)
    if (folder.data) {
      const ownerEmail = folder.data.ownerEmail || folder.data.owner;
      if (ownerEmail) {
        people.push({
          email: ownerEmail,
          role: 'Owner',
          isOwner: true
        });
      }
    }
    // Add allowed users
    if (folder.data && Array.isArray(folder.data.allowedUsers)) {
      folder.data.allowedUsers.forEach(u => {
        // If backend returns {email, role}, use those
        if (u.email && u.role) {
          people.push({ email: u.email, role: u.role });
        } else if (u.userId && u.role) {
          people.push({ email: u.userId, role: u.role });
        }
      });
    }
    return people;
  }, [folder]);

  const [emails, setEmails] = useState(() => initialPeople);

  // Always sync emails with backend allowedUsers when modal opens
  useEffect(() => {
    if (isShareOpen && folder.data) {
      const people = [];
      const ownerEmail = folder.data.ownerEmail || folder.data.owner;
      if (ownerEmail) {
        people.push({
          email: ownerEmail,
          role: 'Owner',
          isOwner: true
        });
      }
      if (Array.isArray(folder.data.allowedUsers)) {
        folder.data.allowedUsers.forEach(u => {
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
  }, [isShareOpen, folder.data]);

  const [inputEmail, setInputEmail] = useState("");
  const [inputRole, setInputRole] = useState("Viewer");
  const [renameValue, setRenameValue] = useState(folder.name);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef();
    // Initialize state from backend folder  if available
  const [visibility, setVisibility] = useState(folder.data.visibility || 'private');
  const [selectedSchools, setSelectedSchools] = useState(folder.data.allowedSchools || []);
  const [selectedDepartments, setSelectedDepartments] = useState(folder.data.allowedDepartments || []);
  
  // Compute available departments based on selected schools
  const availableDepartments = selectedSchools
    .flatMap((school) => DEPARTMENT_OPTIONS[school] || [])
    .map((dept) => ({ value: dept, label: dept }));

  // Remove any selected departments that are no longer available
  useEffect(() => {
    setSelectedDepartments((prev) => prev.filter((d) => availableDepartments.some((opt) => opt.value === d)));
    // eslint-disable-next-line
  }, [selectedSchools]);

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
      alert('Please enter a valid email address.');
      return;
    }
    if (emails.some((e) => e.email === inputEmail)) return;
    // Check if user exists via userAPI.js
    let userId;
    try {
      userId = await getUserIdByEmailAPI(inputEmail);
      if (!userId) {
        alert('No user found with this email.');
        return;
      }
    } catch (err) {
      alert('Error checking user existence.');
      return;
    }
    // Add the email and userId to the list with the selected role
    setEmails([...emails, { email: inputEmail, userId, role: inputRole }]);
    setInputEmail("");
    setInputRole("Viewer");
  };
  
  // Email validation 
  const isValidEmail = (email) => {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  };

  // Handle email input changes with auto-add on separators
  const handleEmailInputChange = (e) => {
    const value = e.target.value;
    setInputEmail(value);
  
    // Debounced search for suggestions
    debounceRef.current(value);
  };

  // Handle key press (Enter to add)
  const handleEmailKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
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
      console.log(folder)
    navigator.clipboard.writeText(
      `https://mydrive.com/folder/${folder.name.replace(/\s+/g, "-")}`
    );
    alert("Link copied to clipboard!");
  };

  const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
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
    debounceRef.current = debounce(fetchEmailSuggestions, 400);
  };

  return (
    <>
      {/* Folder Card */}
      <div className="relative bg-gray-100 flex items-center justify-between px-5 py-4 shadow-sm rounded-lg border border-gray-300 hover:bg-gray-200 transition">
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={(e) => {
            // Prevent preview if menu is open
            if (!isMenuOpen) onClick(folder.name);
          }}
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
                {/* Download */}
                <li
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => alert("Download clicked")}
                >
                  <Download size={16} className="text-gray-600" /> Download
                </li>

                {/* Rename */}
                <li
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setRenameValue(folder.name);
                    setIsRenameOpen(true);
                    toggleMenu(index); // Close menu when opening modal
                  }}
                >
                  <Pencil size={16} className="text-gray-600" /> Rename
                </li>

                <hr className="my-1" />

                {/* Organize */}
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
                    <FolderCog size={16} className="text-gray-600" /> Organize
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
                            if (onMoveRequest) onMoveRequest(folder);
                            toggleMenu(index); // Close menu when opening move modal
                          }}
                        >
                          <Move size={16} className="text-gray-600" /> Move
                        </li>
                      </ul>
                    );
                  })()}
                </li>

                {/* Share */}
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
                    <Share2 size={16} className="text-gray-600" /> Share
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
                  className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 cursor-pointer"
                  onClick={() => {
                    setIsRemoveOpen(true);
                    toggleMenu(index); // Close menu when opening modal
                  }}
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
         <div className="bg-white w-[500px] max-w-[95vw] rounded-xl shadow-lg p-6 relative">
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
        
            {/* Visibility Field */}
            <div className="mb-4">
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

            {/* Only show school/department if private */}
            {visibility === 'private' && (
              <>
                <MultiSelectDropdown
                  label="Schools"
                  options={SCHOOL_OPTIONS}
                  value={selectedSchools}
                  onChange={setSelectedSchools}
                  placeholder="Select schools..."
                />

                <MultiSelectDropdown
                  label="Departments"
                  options={availableDepartments}
                  value={selectedDepartments}
                  onChange={setSelectedDepartments}
                  placeholder={availableDepartments.length === 0 ? "Select a school first" : "Select departments..."}
                />
              </>
            )}

            {/* Add People */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Add People</label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="email"
                      value={inputEmail}
                      onChange={(e) => {
                        setInputEmail(e.target.value);
                        debounceRef.current(e.target.value);
                      }}
                      onKeyPress={handleEmailKeyPress}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email"
                    />
                    {inputEmail && isValidEmail(inputEmail) && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                  <select
                    value={inputRole}
                    onChange={(e) => setInputRole(e.target.value)}
                    className="border rounded-lg px-2"
                  >
                    <option value="Viewer">Viewer</option>
                    <option value="Editor">Editor</option>
                  </select>
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

              {/* Tool tip */}
                <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded-lg">
                  <strong>Tool tip:</strong> Press Enter to add the person.
                </div>
              </div>
            </div>

          
            {/* People with access */}
            <h3 className="text-sm font-medium text-gray-700 mb-2">People with access ({emails.length})</h3>
            <div className="space-y-2 mb-4">
              {emails.map((person, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#0035DA] to-[#043485] rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {person.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm text-gray-800 block">{person.email}</span>
                      {person.isOwner && <span className="text-xs text-blue-600 font-semibold">(Owner)</span>}
                    </div>
                  </div>
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
                        <button onClick={() => handleRemoveEmail(person.email)}
                        className="text-gray-500 hover:text-red-600 p-1 rounded hover:bg-red-50"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
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
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                onClick={async () => {
                  // Always resend all current users (except owner) as allowedUsers
                  const allowedUsers = emails
                    .filter(e => !e.isOwner)
                    .map(e => ({
                      userId: e.userId,
                      role: e.role,
                      email: e.email,
                      grantedBy: user?.firstname + ' ' + user?.lastname,
                      emailOfGrantedBy: user?.email
                    }));
                  try {
                    await addAccessToFoldersAPI({
                      folderId: folder._id,
                      allowedUsers,
                      allowedSchools: selectedSchools,
                      allowedDepartments: selectedDepartments,
                      visibility: visibility
                    });
                    setIsShareOpen(false);
                  } catch (err) {
                    alert(err.message || 'Failed to share folder');
                  }
                }}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      <RenameFolderModal
  open={isRenameOpen}
  onClose={() => setIsRenameOpen(false)}
  currentTitle={folder.name}
  onSubmit={async (newTitle) => {
    try {
      const { renameFolderAPI } = await import("../api/storageAPI");
      await renameFolderAPI(folder._id, newTitle);
      setIsRenameOpen(false);
      if (onDelete) onDelete(folder); // Refresh parent view
    } catch (err) {
      alert(err?.message || "Failed to rename folder");
    }
  }}
/>


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
                onClick={async () => {
                  try {
                    await deleteFolderByIDAPI(folder._id);
                    setIsRemoveOpen(false);
                    if (onDelete) onDelete(); // Notify parent to refresh
                  } catch (err) {
                    alert(err.message || "Failed to delete folder");
                  }
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