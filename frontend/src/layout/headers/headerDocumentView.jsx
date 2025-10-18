import { useNavigate } from "react-router-dom";
import naviLogo from "../../assets/images/navilogo.png";

import { Download, Pencil, X } from "lucide-react";

const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");

const API_URL =
  API_URLS.find((url) => url.includes(window.location.hostname)) || API_URLS[0];

export default function HeaderDocumentView({
  title,
  onDownloadPDF,
  onEdit,
  onUnpublish,
  user,
}) {
  const navigate = useNavigate();

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
                else if (role === "Document Controller") navigate("/documents")
            }}
          />

          <button
            onClick={() => {
              const role = user?.role?.name;
              if (role === "Secretary") navigate("/secretary/templates");
              else if (role === "Dean") navigate("/dean/templates");
              else if (role === "Document Controller") navigate("/document-controller/templates")
            }}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
            aria-label="Back"
            title="Back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Divider */}
          <span aria-hidden="true" className="h-5 w-px bg-gray-300 mx-0.5" />
          
          {/* Title */}
          <div className="flex items-center">
            <input
              className="bg-transparent text-2xl font-semibold text-gray-800 outline-none border-none"
              value={title}
              placeholder="Document Title"
              readOnly
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Download btn */}
          <button
            onClick={onDownloadPDF}
            className="bg-[#063c8d] hover:bg-[#052c6d] text-white rounded px-4 py-2 text-sm font-semibold flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download as PDF
          </button>

          {/* Edit btn */}
          <button
            onClick={onEdit}
            className="bg-[#063c8d] hover:bg-[#052c6d] text-white rounded px-4 py-2 text-sm font-semibold flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>

          {/* Unpublish btn */}
         <button onClick={onUnpublish}
          className="bg-[#063c8d] hover:bg-[#052c6d] text-white rounded px-4 py-2 text-sm font-semibold flex items-center gap-2" >
           <svg xmlns="http://www.w3.org/2000/svg" width="1.5em" height="1.5em" viewBox="0 0 24 24"><path fill="#fff" d="m20.475 23.3l-2.95-2.95q-1.2.8-2.587 1.225T12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12q0-1.55.425-2.937T3.65 6.475L.675 3.5L2.1 2.075l19.8 19.8zM12 20q1.125 0 2.138-.3t1.912-.825L12.175 15L10.6 16.6l-4.25-4.25l1.4-1.4l2.85 2.85l.175-.2l-5.65-5.65q-.525.9-.825 1.913T4 12q0 3.325 2.338 5.663T12 20m8.375-2.5L18.9 16.025q.525-.875.813-1.888T20 12q0-3.325-2.337-5.663T12 4q-1.125 0-2.137.288T7.975 5.1L6.5 3.625q1.2-.775 2.588-1.2T12 2q2.075 0 3.9.788t3.175 2.137T21.213 8.1T22 12q0 1.525-.425 2.913t-1.2 2.587m-5.325-5.35l-1.4-1.4l2.6-2.6l1.4 1.4zM10.6 13.4"/></svg>
              Unpublish 
            </button>

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
    </div>
  );
}
