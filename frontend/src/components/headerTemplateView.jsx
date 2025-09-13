import { UserPlus, CheckCircle2, MessageSquare } from "lucide-react";
import naviLogo from "../assets/images/navilogo.png";
import { useNavigate } from "react-router-dom";

const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");
const API_URL =
  API_URLS.find((url) => url.includes(window.location.hostname)) || API_URLS[0];

export default function HeaderTemplateView({
  template,
  user,
  handleAssign,
  handleApprove,
  handleRequestChange,
}) {
  const navigate = useNavigate();
  const t = template || {};

  return (
    <div>
      <div className="h-4 bg-[#063c8d] w-full" />
      <div className="flex items-center justify-between bg-[#f3f3f3] px-8 py-3 border-b border-gray-200">
        {/* Logo */}
        <div className="flex items-center gap-8">
        <img
        src={naviLogo}
        alt="Logo"
        className="w-15 h-10 cursor-pointer"
        onClick={() => {
            const role = user?.role?.name; 
            if (role === "Secretary") {
            navigate("/secretary/templates");
            } else if (role === "Dean") {
            navigate("/dean/templates");
            } else {
            navigate("/documents"); // fallback
            }
        }}
        />

        {/* Title */}
        <div className="flex items-center">
            <div className="text-sm font-semibold">
              {t.code}
            </div>
            <div className="text-base sm:text-lg font-medium">{t.title}</div>
        </div>
        </div>

        <div className="flex items-center gap-3">
        {/* Assign Members btn */}
        <button
        onClick={handleAssign}
        className="inline-flex drop-shadow-lg items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
        >
        <UserPlus className="h-4 w-4" />
        <span className="text-sm font-semibold">Assign Members</span>
        </button>

        {/* Approve Templates btn */}
        <button
        onClick={handleApprove}
        className="inline-flex drop-shadow-md items-center gap-2 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition"
        >
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm font-semibold">Approve Template</span>
        </button>

        {/* Request Change btn */}
        <button
        onClick={handleRequestChange}
        className="inline-flex drop-shadow-md items-center gap-2 px-4 py-2 rounded bg-yellow-600 text-white hover:bg-yellow-700 transition"
        >
        <MessageSquare className="h-4 w-4" />
        <span className="text-sm font-semibold">Request Change</span>
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
