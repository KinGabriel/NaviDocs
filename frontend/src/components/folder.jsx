// Use shared options and dynamic department filtering
import { SCHOOL_OPTIONS, DEPARTMENT_OPTIONS } from "../utils/options";
import { deleteFolderByIDAPI,addAccessToFoldersAPI } from "../api/storageAPI";
import { searchUsersByEmailAPI,getUserIdByEmailAPI } from "../api/userAPI";
import React, { useState, Fragment,useEffect, useRef } from "react";
import { Listbox, Transition } from '@headlessui/react';
import axios from "axios";

import {
  Folder,
  MoreVertical,
  Download,
  FolderPen,
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
  onMoveRequest,
  onDelete,
}) {
  const [isOrganizeOpen, setIsOrganizeOpen] = useState(false);
  const [organizeTimeout, setOrganizeTimeout] = useState(null);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [shareTimeout, setShareTimeout] = useState(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);

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

  const [emails, setEmails] = useState(initialPeople);
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
  }

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
                  <FolderPen size={16} className="text-gray-600" /> Rename
                </li>

                <hr className="my-1" />

                {/* Organize */}
                <li
                  className="relative flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onMouseEnter={() => {
                    if (organizeTimeout) clearTimeout(organizeTimeout);
                    setIsOrganizeOpen(true);
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => setIsOrganizeOpen(false), 1000);
                    setOrganizeTimeout(timeout);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <FolderCog size={16} className="text-gray-600" /> Organize
                  </div>
                  <span className="text-gray-500 text-xs">▶</span>
                  {isOrganizeOpen && (
                    <ul className="absolute left-full top-0 ml-1 w-32 bg-white border rounded-lg shadow-md">
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
                  )}
                </li>

                {/* Share */}
                <li
                  className="relative flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onMouseEnter={() => {
                    if (shareTimeout) clearTimeout(shareTimeout);
                    setIsShareMenuOpen(true);
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => setIsShareMenuOpen(false), 1000);
                    setShareTimeout(timeout);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Share2 size={16} className="text-gray-600" /> Share
                  </div>
                  <span className="text-gray-500 text-xs">▶</span>
                  {isShareMenuOpen && (
                    <ul className="absolute left-full top-0 ml-1 w-32 bg-white border rounded-lg shadow-md">
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
                  )}
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



            {/* Visibility Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
              <select
                value={visibility}
                onChange={e => setVisibility(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>

            {/* Only show school/department if private */}
            {visibility === 'private' && (
              <>
                {/* HeadlessUI Listbox Multi-select for Schools */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Schools</label>
                  <Listbox value={selectedSchools} onChange={setSelectedSchools} multiple>
                    <div className="relative mt-1">
                      <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white border py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <span className="block truncate">{selectedSchools.length > 0 ? selectedSchools.map(val => (SCHOOL_OPTIONS.find(o => o.value === val)?.label || val)).join(', ') : 'Select schools...'}</span>
                      </Listbox.Button>
                      <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          {SCHOOL_OPTIONS.map(option => (
                            <Listbox.Option key={option.value} value={option.value} className={({ active }) => `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}` }>
                              {({ selected }) => (
                                <>
                                  <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>{option.label}</span>
                                  {selected ? (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">✔</span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>
                          ))}
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </Listbox>
                </div>

                {/* HeadlessUI Listbox Multi-select for Departments (filtered by selected schools) */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departments</label>
                  <Listbox value={selectedDepartments} onChange={setSelectedDepartments} multiple>
                    <div className="relative mt-1">
                      <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white border py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <span className="block truncate">{selectedDepartments.length > 0 ? selectedDepartments.join(', ') : 'Select departments...'}</span>
                      </Listbox.Button>
                      <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          {availableDepartments.length === 0 ? (
                            <div className="px-4 py-2 text-gray-400">Select a school first</div>
                          ) : (
                            availableDepartments.map(option => (
                              <Listbox.Option key={option.value} value={option.value} className={({ active }) => `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}` }>
                                {({ selected }) => (
                                  <>
                                    <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>{option.label}</span>
                                    {selected ? (
                                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">✔</span>
                                    ) : null}
                                  </>
                                )}
                              </Listbox.Option>
                            ))
                          )}
                        </Listbox.Options>
                      </Transition>
                    </div>
                  </Listbox>
                </div>
              </>
            )}



            {/* Add People */}
            <label className="block text-sm font-medium text-gray-700 mb-1">Add People</label>
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

            {/* People with access */}
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
                  // Only send userId and role, not email
                  const allowedUsers = emails
                    .filter(e => !e.isOwner) // don't send owner
                    .map(e => ({
                      userId: e.userId || e.email, // prefer userId if present, else email
                      role: e.role
                    }));
                  try {
                    await addAccessToFoldersAPI({
                      folderId: folder._id,
                      allowedUsers,
                      allowedSchools: selectedSchools,
                      allowedDepartments: selectedDepartments
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
                onClick={async () => {
                  if (!renameValue || renameValue === folder.name) {
                    setIsRenameOpen(false);
                    return;
                  }
                  try {
                    await import('../api/storageAPI').then(({ renameFolderAPI }) => renameFolderAPI(folder._id, renameValue));
                    setIsRenameOpen(false);
                    // Trigger a refresh or update parent
                    if (onDelete) onDelete(folder); // Use onDelete as a refresh callback
                  } catch (err) {
                    alert(err?.message || 'Failed to rename folder');
                  }
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
