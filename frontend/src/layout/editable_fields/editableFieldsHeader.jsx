import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import naviLogo from '../../assets/images/navilogo.png';
import DocumentVersionHistory from '../../pages/version_history/documentVersionHistory';
import { ChevronDown, Copy, Send, FileDown, MoreHorizontal } from "lucide-react";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function EditableFieldsHeader({ 
  title = "Course Syllabus FTS", 
  user,
  setTitle, 
  onSave,
  onArchive,
  saving = false, 
  lastSavedAt, 
  dirty = false,
  documentId,
}) {
  const navigate = useNavigate();
  const handleSave = () => {
    if (onSave) onSave();
  };

  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Inline title edit state
  const [editing, setEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(title || '');
  const inputRef = useRef(null);

  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const saveMenuRef = useRef(null);
  const quickMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target)) {
        setIsSaveOpen(false);
      }
      if (quickMenuRef.current && !quickMenuRef.current.contains(e.target)) {
        setIsQuickOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  useEffect(() => {
    setLocalTitle(title || '');
  }, [title]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitTitle = () => {
    setEditing(false);
    const t = (localTitle || '').trim();
    if (setTitle) setTitle(t);
  };

  const onKeyDownTitle = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTitle();
      if (onSave) onSave();
    } else if (e.key === 'Escape') {
      setEditing(false);
      setLocalTitle(title || '');
    }
  };

    const handleArchive = () => {
    if (onArchive) onArchive();
  };

  return (
    <div className="sticky top-0 z-50 bg-[#f3f3f3] shadow-sm">
      <div className="h-4 bg-[#063c8d] w-full" /> 
      <div className="flex items-center justify-between bg-[#f3f3f3] px-8 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <img 
            title="Navidocs home"
            src={naviLogo} 
            alt="Logo" 
            className="w-15 h-10 cursor-pointer" 
            onClick={() => {
              const role = user?.role?.name;
              if (role === "Secretary") navigate("/documents");
              else if (role === "Dean") navigate("/documents");
              else if (role === "Document Controller") navigate("/documents")
            }}
          />

          {/* Back button */}
          <button
            onClick={() => navigate("/documents")}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
            aria-label="Back"
            title="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span
            aria-hidden="true"
            className="h-6 w-px bg-gray-300 mx-1"
          />
          
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              {editing ? (
                <input
                  ref={inputRef}
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={onKeyDownTitle}
                  className="text-xl font-medium text-gray-800 border-b border-gray-300 focus:outline-none px-1 py-0.5"
                />
              ) : (
                <div className="flex items-center space-x-5">
                  <span className="text-xl font-medium text-gray-800">{title}</span>
                  <button
                    title="Edit title"
                    onClick={() => setEditing(true)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-pen-icon lucide-square-pen"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {/* Save status */}
          <div className="flex flex-col items-start">
            {lastSavedAt && (
              <span className="text-[10px] text-gray-500 leading-tight">
                Saved {lastSavedAt.toLocaleTimeString()}
              </span>
            )}
            {dirty && !saving && (
              <span className="text-[10px] text-amber-600 leading-tight">
                Unsaved changes
              </span>
            )}
            {saving && (
              <span className="text-[10px] text-blue-600 leading-tight">
                Saving...
              </span>
            )}
          </div>

          { /* Version History btn*/} 
            <button 
              onClick={() => setShowVersionHistory(true)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded" 
              title="History"
            > 
              <svg xmlns="http://www.w3.org/2000/svg" width="1.9em" height="1.9em" viewBox="0 0 24 24">
                <path fill="#7D7D7D" 
                  d="M12 21q-3.45 0-6.012-2.287T3.05 13H5.1q.35 2.6 2.313 4.3T12 19q2.925 0 4.963-2.037T19 12t-2.037-4.962T12 5q-1.725 0-3.225.8T6.25 8H9v2H3V4h2v2.35q1.275-1.6 3.113-2.475T12 3q1.875 0 3.513.713t2.85 1.924t1.925 2.85T21 12t-.712 3.513t-1.925 2.85t-2.85 1.925T12 21m2.8-4.8L11 12.4V7h2v4.6l3.2 3.2z"
                />
              </svg> 
            </button>

          {/* Save/Action btn */}
          <div className="relative" ref={saveMenuRef}>
            <button
              onClick={() => setIsSaveOpen((o) => !o)}
              disabled={saving}
              className="bg-[#063c8d] hover:bg-[#052c6d] text-white rounded px-5 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-70"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 0V4a2 2 0 00-2-2H9a2 2 0 00-2 2v3m1 0h4"/>
              </svg>
              {saving ? 'Saving...' : 'Save Draft'}
              <ChevronDown className={`w-3 h-3 transition-transform ${isSaveOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Save options dropdown */}
            {isSaveOpen && (
              <div className="absolute right-0 mt-2 w-64 z-50">
                <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 text-xs text-gray-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Save Options</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">Draft</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Your document is automatically saved as you work. You can continue editing anytime.
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => { handleSave(); setIsSaveOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded bg-gray-50 hover:bg-gray-100 text-[11px]"
                    >
                      <div className="font-medium">Save Draft</div>
                      <div className="text-gray-500">Continue working later</div>
                    </button>
                    <button
                      onClick={() => { handleArchive(); setIsSaveOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded bg-gray-50 hover:bg-gray-100 text-[11px]"
                    >
                      <div className="font-medium">Archive Version</div>
                      <div className="text-gray-500">Store for reference</div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions dropdown */}
          <div className="relative" ref={quickMenuRef}>
            <button
              onClick={() => setIsQuickOpen((o) => !o)}
              className="bg-gray-700 hover:bg-gray-800 text-white rounded px-5 py-2.5 text-sm font-medium flex items-center gap-2 shadow-lg"
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="font-semibold">Quick Actions</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isQuickOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {isQuickOpen && (
              <div className="absolute right-0 mt-2 w-64 z-50">
                <div className="bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                  <button className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3" onClick={() => setIsQuickOpen(false)}>
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Copy className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">Make a Copy</div>
                      <div className="text-xs text-gray-500">Duplicate this document</div>
                    </div>
                  </button>

                  <button className="w-full text-left px-4 py-3 hover:bg-green-50 flex items-center gap-3" onClick={() => setIsQuickOpen(false)}>
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Send className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">Submit</div>
                      <div className="text-xs text-gray-500">Send to department head</div>
                    </div>
                  </button>

                  <button className="w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center gap-3" onClick={() => setIsQuickOpen(false)}>
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <FileDown className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">Export as PDF</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile picture */}
            <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center shadow overflow-hidden">
              <img
                src={
                  user && user.profile_picture
                    ? `${API_URL}${user.profile_picture}`
                    : "/default-avatar.png"
                }
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
        </div>
      </div>

      {/* Version History Full Screen Overlay */}
            {showVersionHistory && (
              <div className="fixed inset-0 z-[100] bg-white">
                <DocumentVersionHistory onClose={() => setShowVersionHistory(false)} documentId={documentId} />
              </div>
            )}

    </div>
    
  );
}