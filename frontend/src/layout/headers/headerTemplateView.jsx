// header for viewing templates
import { useState } from "react";
import { approveTemplateAPI, rejectTemplateAPI, returnTemplateAPI, publishTemplateAPI, unpublishTemplateAPI } from "../../api/documentContollerAPI";
import { CheckCircle2, FileText, ChevronDown } from "lucide-react";
import defaultProfile from '../../assets/images/profile_picture.png';
import naviLogo from "../../assets/images/navilogo.png";
import { useNavigate } from "react-router-dom";
import ApprovalModal from "../../components/modals/approvalModal"; 
import PublishModal from "../../components/modals/publishModal"; 
import AddInstructionsModal from "../../components/modals/addInstructionsModal";

const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");
const API_URL =
  API_URLS.find((url) => url.includes(window.location.hostname)) || API_URLS[0];

export default function HeaderTemplateView({ 
  template, 
  user, 
  onAddInstructions,
  handleApprove,
  handleReject,
  handleReturn,
  handlePublish,
  handleUnpublish,
}) {
  const navigate = useNavigate();
  const roleValue = user?.role?.name || user?.role;
  const t = template || {};
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDeadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [isInstructionsModalOpen, setInstructionsModalOpen] = useState(false);
  const [isPublishModalOpen, setPublishModalOpen] = useState(false);
  const [isUnpublishConfirmOpen, setUnpublishConfirmOpen] = useState(false);
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

  const handleModalPublish = async (templateData, payload) => {
    try {
      // If parent provides a publish handler, use it; else call API directly
      if (typeof handlePublish === 'function') {
        await handlePublish(templateData, payload);
      } else {
        await publishTemplateAPI(templateData._id, payload || {});
      }
      setPublishModalOpen(false);
    } catch (error) {
      console.error("Error publishing template:", error);
      throw error;
    }
  };

  const handleModalUnpublish = async (templateData) => {
    try {
      if (typeof handleUnpublish === 'function') {
        await handleUnpublish(templateData);
      } else {
        await unpublishTemplateAPI(templateData._id);
      }
      setUnpublishConfirmOpen(false);
    } catch (error) {
      console.error("Error unpublishing template:", error);
      throw error;
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
                navigate("/templates");
              }}
            />

            <button
              onClick={() => {
                navigate("/templates");
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
            {/* Assign Members btn (hidden for now)
            {["Unit Document Controller","Lead Document Controller","Document Control Officer"].includes(roleValue) && (
              <button
                onClick={handleAssign}
                className="inline-flex drop-shadow-lg items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                <UserPlus className="h-4 w-4" />
                <span className="text-sm font-semibold">Assign Members</span>
              </button>
            )}
            */}

            {/* Approve/Manage button (appears only when it's this role's turn) */}
            {(() => {
              const approvals = t?.status_meta?.approvals || {};
              const udc = approvals?.unit_document_controller || {};
              const ldc = approvals?.lead_document_controller || {};
              const dco = approvals?.document_controller_officer || {};

              const isUndecided = (entry = {}) =>
                entry?.isApproved !== true && entry?.isRejected !== true && entry?.isReturned !== true;

              // UDC is only required for Department Head submissions; backend uses status === 'pending' to signal this
              const requiresUDC = t.status === "pending";

              const canUDCAct = requiresUDC && isUndecided(udc);
              const canLDCAct = isUndecided(ldc) && (requiresUDC ? udc?.isApproved === true : true);
              const canDCOAct = isUndecided(dco) && (ldc?.isApproved === true) && (requiresUDC ? udc?.isApproved === true : true);

              // Determine if current role already acted (approve/endorse/reject/return)
              const mySlot = roleValue === 'Unit Document Controller' ? udc
                : roleValue === 'Lead Document Controller' ? ldc
                : roleValue === 'Document Control Officer' ? dco
                : {};
              const alreadyActed = Boolean(
                mySlot?.isApproved || mySlot?.approved_at ||
                mySlot?.isRejected || mySlot?.rejected_at ||
                mySlot?.isReturned || mySlot?.returned_at
              );

              //  always show the Manage button when template is in 'pending' or 'endorsed' state regardless of role/slot decisions.
              const statusKey = String(t?.status || '').toLowerCase();
              const showManage = statusKey === 'pending' || statusKey === 'endorsed';

              return showManage ? (
                <button
                  onClick={handleApproveClick}
                  className="inline-flex drop-shadow-md items-center gap-2 px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-semibold">Manage Template</span>
                </button>
              ) : null;
            })()}

            {/* Publish button (DCO only, status approved) */}
            {roleValue === "Document Control Officer" && t?.status === "approved" && (
              <button
                onClick={() => setPublishModalOpen(true)}
                className="inline-flex drop-shadow-md items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm font-semibold">Publish</span>
              </button>
            )}

            {/* Unpublish button (DCO only, status published) */}
            {roleValue === "Document Control Officer" && t?.status === "published" && (
              <button
                onClick={() => setUnpublishConfirmOpen(true)}
                className="inline-flex drop-shadow-md items-center gap-2 px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22C6.477 22 2 17.522 2 12S6.477 2 12 2s10 4.478 10 10-4.477 10-10 10Zm4.243-13.657a1 1 0 0 0-1.486-1.337l-4.51 5.012-1.979-1.98a1 1 0 1 0-1.414 1.415l2.75 2.75a1 1 0 0 0 1.46-.036l5.179-5.824Z"/></svg>
                <span className="text-sm font-semibold">Unpublish</span>
              </button>
            )}

            {/* Actions Dropdown (approvers) */}
            {(["Unit Document Controller","Lead Document Controller","Document Control Officer"].includes(roleValue)) && (
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
                      {/* Update Deadline action (hidden for now)
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
                      */}
                      
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
            )}

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

      {/* Update Deadline Modal (hidden for now)
      {isDeadlineModalOpen && (
        <UpdateDeadlineModal
          currentDeadline={template?.deadline}
          isOpen={isDeadlineModalOpen}
          onClose={() => setDeadlineModalOpen(false)}
          templateId={template?._id}
          onUpdate={onUpdateDeadline}
        />
      )}
      */}

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

      {/* Publish Modal */}
      {isPublishModalOpen && (
        <PublishModal
          isOpen={isPublishModalOpen}
          onClose={() => setPublishModalOpen(false)}
          template={template}
          onPublish={handleModalPublish}
        />
      )}

      {/* Unpublish Confirm */}
      {isUnpublishConfirmOpen && (
        <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="text-lg font-semibold">Unpublish Template</h3>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-700">This will revert the template status back to Approved. Continue?</p>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={() => setUnpublishConfirmOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={() => handleModalUnpublish(template)} className="px-4 py-2 rounded-lg text-white bg-amber-600 hover:bg-amber-700">Unpublish</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}