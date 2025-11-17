/**
 * @fileoverview Header component for published template viewing interface.
 * Provides navigation, export options (download/storage), and user profile display.
 * @module components/headers/headerPublishedTemplateView
 */

// header for viewing the published templates
import { useNavigate } from "react-router-dom";
import naviLogo from "../../assets/images/navilogo.png";
import { Download, ChevronDown, FolderPlus } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import defaultProfile from '../../assets/images/profile_picture.png';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Header component for viewing published templates with export functionality
 * @component
 * @param {Object} props - Component props
 * @param {string} props.title - Template title to display (read-only)
 * @param {Function} props.onExportDownload - Callback to export template as PDF and download directly
 * @param {Function} props.onExportToStorage - Callback to export template to storage folder before downloading
 * @param {Function} props.onEdit - Callback function to edit the template
 * @param {Function} props.onUnpublish - Callback function to unpublish the template
 * @param {Object} props.user - Current user object
 * @param {Object} [props.user.role] - User's role information
 * @param {string} [props.user.role.name] - User's role name (Secretary, Dean, Lead Document Controller, Document Control Officer, Department Head)
 * @param {string} [props.user.profile_picture] - URL path to user's profile picture
 * 
 * @returns {React.ReactElement} Header component with published template viewing controls
 * 
 * @description
 * Header component for published template viewing that includes:
 * - Application logo with role-based navigation to /documents
 * - Back button to return to template selection (/select-template)
 * - Read-only template title display
 * - Export dropdown with two options:
 *   1. Export & Download: Direct PDF generation and browser download
 *   2. Export to Storage & Download: Save to folder first, then download
 * - User profile picture display
 * - Click-outside detection to close export dropdown
 * 
 * Export Options:
 * - **Export & Download**: Generates PDF and triggers immediate browser download
 * - **Export to Storage & Download**: Opens folder selection modal, saves to chosen location, then downloads
 * 
 * @example
 * <HeaderPublishedTemplateView
 *   title="Standard Operating Procedure v3"
 *   onExportDownload={handleDirectDownload}
 *   onExportToStorage={handleStorageExport}
 *   onEdit={handleEdit}
 *   onUnpublish={handleUnpublish}
 *   user={{ role: { name: "Dean" }, profile_picture: "/uploads/dean.jpg" }}
 * />
 */
export default function HeaderPublishedTemplateView({
  title,
  onExportDownload,
  onExportToStorage,
  onEdit,
  onUnpublish,
  user,
}) {
  const navigate = useNavigate();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!exportRef.current) return;
      if (!exportRef.current.contains(e.target)) setIsExportOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
     <div className="sticky top-0 z-50 bg-[#f3f3f3] shadow-sm">
      <div className="h-4 bg-[#063c8d] w-full" />
      <div className="flex items-center justify-between bg-[#f3f3f3] px-8 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <img
            src={naviLogo}
            alt="Logo"
            title="Navidocs home"
            className="w-15 h-10 cursor-pointer"
            onClick={() => {
              const role = user?.role?.name;
              if (role === "Secretary") navigate("/documents");
                else if (role === "Dean") navigate("/documents");
                else if (role === "Lead Document Controller") navigate("/documents");
                else if (role === "Document Control Officer") navigate("/documents");
                else if (role === "Department Head") navigate("/documents");
            }}
          />

          {/* Back button */}
          <button
            onClick={() => navigate("/select-template")}
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
          <div className="flex items-center">
            <input
              className="bg-transparent text-xl font-medium text-gray-800 outline-none border-none"
              value={title}
              placeholder="Document Title"
              readOnly
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setIsExportOpen((o) => !o)}
              className="bg-[#063c8d] hover:bg-[#052c6d] text-white rounded px-4 py-2 text-sm font-semibold flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className="w-4 h-4" />
            </button>
            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-72 z-50">
                <div className="bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                  <button
                    className="w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center gap-3"
                    onClick={() => {
                      setIsExportOpen(false);
                      onExportDownload && onExportDownload();
                    }}
                  >
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Download className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">Export & Download</div>
                      <div className="text-xs text-gray-500">Generate PDF and download directly to your browser</div>
                    </div>
                  </button>

                  <button
                    className="w-full text-left mt-2 px-4 py-3 hover:bg-blue-50 flex items-center gap-3"
                    onClick={() => {
                      setIsExportOpen(false);
                      onExportToStorage && onExportToStorage();
                    }}
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FolderPlus className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">Export to Storage & Download…</div>
                      <div className="text-xs text-gray-500">Choose folder or create new, then save and download</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

           {/* Profile picture */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow overflow-hidden bg-white border border-gray-200">
              <img
                src={
                  user?.profile_picture
                    ? `${API_URL}${user.profile_picture}`
                    : defaultProfile
                }
                alt="Profile"
                className={`object-cover ${
                  user?.profile_picture ? "w-full h-full" : "w-8 h-8 object-contain opacity-90"
                }`}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = defaultProfile;
                }}
              />
            </div>
        </div>
      </div>
    </div>
  );
}
