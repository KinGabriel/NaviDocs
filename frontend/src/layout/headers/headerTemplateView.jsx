import { useState } from "react";
import { approveTemplateAPI, rejectTemplateAPI, returnTemplateAPI } from "../../api/documentContollerAPI";
import { UserPlus, CheckCircle2, Calendar, FileText, ChevronDown } from "lucide-react";
import UpdateDeadlineModal from "../../components/modals/updateDeadlineModal";
import naviLogo from "../../assets/images/navilogo.png";
import { useNavigate } from "react-router-dom";
import ApprovalModal from "../../components/modals/approvalModal"; 
import AddInstructionsModal from "../../components/modals/addInstructionsModal";

const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");
const API_URL =
  API_URLS.find((url) => url.includes(window.location.hostname)) || API_URLS[0];

export default function HeaderTemplateView({ 
  template, 
  user, 
  handleAssign, 
  onUpdateDeadline, 
  onAddInstructions,
  handleApprove,
  handleReject,
  handleReturn 
}) {
  const navigate = useNavigate();
  const roleValue = user?.role?.name || user?.role;
  const t = template || {};
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDeadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [isInstructionsModalOpen, setInstructionsModalOpen] = useState(false);
  // Approval Modal handlers
  const handleApproveClick = () => setIsApprovalModalOpen(true);
  // Import your API functions at the top of the file:
  // import { approveTemplateAPI, rejectTemplateAPI, returnTemplateAPI } from "../api/documentControllerAPI";
  // Optionally, import a toast/notification system for user feedback
  // import { toast } from "react-toastify";

  const handleModalApprove = async (templateData, message) => {
    try {
      // call parent handler which will update state and refresh data
      if (handleApprove) {
        await handleApprove(templateData, message);
      } else {
        // fallback to direct API call if no parent handler
        // toast.success("Template approved successfully");
        await approveTemplateAPI(templateData._id, { note: message });
      }
      // close modal only after successful operation
      setIsApprovalModalOpen(false);
    } catch (error) {
      // toast.error("Failed to approve template");
      console.error("Error approving template:", error);
    }
  };

  const handleModalReject = async (templateData, message) => {
    try {
      // call parent handler which will update state and refresh data
      if (handleReject) {
        await handleReject(templateData, message);
      } else {
        // toast.success("Template rejected successfully");
        // fallback to direct API call if no parent handler
        await rejectTemplateAPI(templateData._id, message);
      }
      // close modal only after successful operation
      setIsApprovalModalOpen(false);
    } catch (error) {
      // toast.error("Failed to reject template");
      console.error("Error rejecting template:", error);
    }
  };

  const handleModalReturn = async (templateData, message) => {
    try {
      // call parent handler which will update state and refresh data
      if (handleReturn) {
        await handleReturn(templateData, message);
      } else {
        // fallback to direct API call if no parent handler
        await returnTemplateAPI(templateData._id, message);
      }
      // close modal only after successful operation
     // toast.success("Template returned successfully");
      setIsApprovalModalOpen(false);
    } catch (error) {
      // toast.error("Failed to return template");
      console.error("Error returning template:", error);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-50 bg-[#f3f3f3] shadow-sm">
        <div className="h-4 bg-[#063c8d] w-full" /> 
        {/* Main header content */}
        <div className="flex items-center justify-between px-8 py-3 border-b border-gray-200 bg-[#f3f3f3]">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <img
              src={naviLogo}
              title="Navidocs home"
              alt="Logo"
              className="w-15 h-10 cursor-pointer"
              onClick={() => {
                const role = user?.role?.name;
                if (role === "Secretary") navigate("/secretary/dashboard");
                else if (role === "Dean") navigate("/dean/dashboard");
                else if (role === "Document Controller") navigate("/document-controller/dashboard")
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
            <div className="flex items-center gap-2">
              {t.code && <div className="text-2xl font-semibold text-gray-600">{t.code}</div>}
              <div className="text-base sm:text-lg font-medium text-gray-800">{t.title}</div>
            </div>
          </div>

          {/* Action buttons */}
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
            {t.status === "pending" && (
              (roleValue === "Dean" && t.status_meta?.approvals?.secretary?.isApproved !== false) ||
              (roleValue === "Secretary" && t.status_meta?.approvals?.secretary?.isApproved !== true)
            ) && (
              <button
                onClick={handleApproveClick}
                className="inline-flex drop-shadow-md items-center gap-2 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-semibold">Manage Template</span>
              </button>
            )}

            {/* Actions Dropdown */}
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
                        setDeadlineModalOpen(true);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-amber-50 text-gray-800 flex items-center gap-3 transition-all duration-150 group"
                    >
                      <div className="p-1.5 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
                        <Calendar className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Update Deadline</div>
                        <div className="text-xs text-gray-500">Modify template due date</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => {
                        setInstructionsModalOpen(true);
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

      {/* Update Deadline Modal */}
      {isDeadlineModalOpen && (
        <UpdateDeadlineModal
          currentDeadline={template?.deadline}
          isOpen={isDeadlineModalOpen}
          onClose={() => setDeadlineModalOpen(false)}
          templateId={template?._id}
          onUpdate={onUpdateDeadline}
        />
      )}

      {/* Add Instructions Modal */}
      {isInstructionsModalOpen && (
        <AddInstructionsModal
          isOpen={isInstructionsModalOpen}
          onClose={() => setInstructionsModalOpen(false)}
          templateId={template?._id}
          currentInstructions={template?.instructions || ''}
          onUpdate={onAddInstructions}
          templateTitle={template?.title}
        />
      )}
    </>
  );
}