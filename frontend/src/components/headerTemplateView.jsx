import { useState } from "react";
import { approveTemplateAPI, rejectTemplateAPI, returnTemplateAPI } from "../api/documentContollerAPI";
import { UserPlus, CheckCircle2, Calendar, FileText, ChevronDown } from "lucide-react";
import naviLogo from "../assets/images/navilogo.png";
import { useNavigate } from "react-router-dom";
import ApprovalModal from "../components/modals/ApprovalModal"; 

const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");
const API_URL =
  API_URLS.find((url) => url.includes(window.location.hostname)) || API_URLS[0];

export default function HeaderTemplateView({ template, user, handleAssign, onUpdateDeadline, onAddInstructions }) {
  const navigate = useNavigate();
  const t = template || {};
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Approval Modal handlers
  const handleApproveClick = () => setIsApprovalModalOpen(true);

  // Import your API functions at the top of the file:
  // import { approveTemplateAPI, rejectTemplateAPI, returnTemplateAPI } from "../api/documentControllerAPI";
  // Optionally, import a toast/notification system for user feedback
  // import { toast } from "react-toastify";

  const handleModalApprove = async (templateData, message) => {
    try {
      await approveTemplateAPI(templateData._id, { note: message });
      // toast.success("Template approved successfully");
      console.log("Approved template:", templateData, message);
    } catch (error) {
      // toast.error("Failed to approve template");
      console.error("Error approving template:", error);
    } finally {
      setIsApprovalModalOpen(false);
    }
  };

  const handleModalReject = async (templateData, message) => {
    try {
      await rejectTemplateAPI(templateData._id, message);
      // toast.success("Template rejected successfully");
      console.log("Rejected template:", templateData, message);
    } catch (error) {
      // toast.error("Failed to reject template");
      console.error("Error rejecting template:", error);
    } finally {
      setIsApprovalModalOpen(false);
    }
  };

  const handleModalReturn = async (templateData, message) => {
    try {
      await returnTemplateAPI(templateData._id, message);
      // toast.success("Template returned successfully");
      console.log("Returned template:", templateData, message);
    } catch (error) {
      // toast.error("Failed to return template");
      console.error("Error returning template:", error);
    } finally {
      setIsApprovalModalOpen(false);
    }
  };




  return (
    <>
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
                if (role === "Secretary") navigate("/secretary/templates");
                else if (role === "Dean") navigate("/dean/templates");
                else navigate("/documents");
              }}
            />

            {/* Title */}
            <div className="flex items-center">
              <div className="text-sm font-semibold">{t.code}</div>
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
              onClick={handleApproveClick}
              className="inline-flex drop-shadow-md items-center gap-2 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-semibold">Approve Template</span>
            </button>

            {/*  Dropdown */}
            <div className="relative inline-block">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-700 transition"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm font-semibold">Actions</span>
                <ChevronDown className="h-4 w-4" />
              </button>

             {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden backdrop-blur-sm">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        onUpdateDeadline();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 text-gray-800 flex items-center gap-3 transition-all duration-150 group"
                    >
                      <div className="p-1.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Update Deadline</div>
                        <div className="text-xs text-gray-500">Modify template due date</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => {
                        onAddInstructions();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 text-gray-800 flex items-center gap-3 transition-all duration-150 group"
                    >
                      <div className="p-1.5 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                        <FileText className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Add Instructions</div>
                        <div className="text-xs text-gray-500">Provide additional instructions</div>
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
      </div>

      {/* Approval Modal */}
      {isApprovalModalOpen && (
        <ApprovalModal
          isOpen={isApprovalModalOpen}
          onClose={() => setIsApprovalModalOpen(false)}
          template={template}
          user={user}
          onApprove={handleModalApprove}
          onReject={handleModalReject}
          onReturn={handleModalReturn}
        />
      )}
    </>
  );
}
