// header for viewing the submitted files (submissions)
import { useNavigate } from "react-router-dom";
import naviLogo from "../../assets/images/navilogo.png";
import { Download, ChevronDown, FolderPlus } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import defaultProfile from '../../assets/images/profile_picture.png';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function HeaderSubmittedFilesView({
  title = "Submitted Document", 
  onExportDownload,
  onExportToStorage,
  user,
}) {
  const navigate = useNavigate();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!exportRef.current) return;
      if (!exportRef.current.contains(e.target.value)) setIsExportOpen(false);
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
              if (role === "Secretary") navigate("/document-workflow");
                else if (role === "Dean") navigate("/document-workflow");
                else if (role === "Department Head") navigate("/document-workflow");
                else if (role === "Faculty") navigate("/faculty/document-workflow");
            }}
          />

          {/* Back button */}
          <button
            onClick={() => {
              const role = user?.role?.name;
              if (role === "Secretary") navigate("/document-workflow");
                else if (role === "Dean") navigate("/document-workflow");
                else if (role === "Department Head") navigate("/document-workflow");
                else if (role === "Faculty") navigate("/faculty/document-workflow");
            }}
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

          {/* Title - Show actual title or placeholder */}
          <div className="flex items-center">
            <h1 className="text-xl font-medium text-gray-800">
              {title || "Submitted Document"}
            </h1>
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
