import { useNavigate } from "react-router-dom";
import naviLogo from "../assets/images/navilogo.png";

import { Download, Pencil, X } from "lucide-react";

const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");

const API_URL =
  API_URLS.find((url) => url.includes(window.location.hostname)) || API_URLS[0];

export default function HeaderPublishedTemplateView({
  title,
  onDownloadPDF,
  onEdit,
  onUnpublish,
  user,
}) {
  const navigate = useNavigate();

  return (
    <div>
      <div className="h-4 bg-[#063c8d] w-full" />
      <div className="flex items-center justify-between bg-[#f3f3f3] px-8 py-3 border-b border-gray-200">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <img
            src={naviLogo}
            alt="Logo"
            className="w-15 h-10 cursor-pointer"
            onClick={() => navigate("/documents")}
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
          {/* Download btn */}
          <button
            onClick={onDownloadPDF}
            className="bg-[#063c8d] hover:bg-[#052c6d] text-white rounded px-4 py-2 text-sm font-semibold flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download as PDF
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
