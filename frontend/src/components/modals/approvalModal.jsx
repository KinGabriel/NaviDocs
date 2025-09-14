
import { useState } from "react";
import { CheckCircle2, X, AlertTriangle, User, Clock, Tag, FileText, Undo2 } from "lucide-react";
import { formatDate } from "../../utils/formatters.jsx";

export default function ApprovalModal({
  isOpen,
  onClose,
  template,
  user,
  onApprove,
  onReject,
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!isOpen || !template) return null;

  const handleApprove = () => {
    setError("");
    onApprove(template, message);
    onClose();
  };

  const handleReject = () => {
    if (!message.trim()) {
      setError("Please provide a reason for rejection.");
      return;
    }
    onReject(template, message);
    onClose();
  };

  const handleReturn = () => {
    if (!message.trim()) {
      setError("Please provide a reason for returning the template.");
      return;
    }
    onReturn(template, message);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-opacity-50 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Template Approvals
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {/* Template Info */}
          <div className="bg-blue-50 p-4 rounded-md shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-700">Title</p>
                  <p className="font-medium text-gray-900">{template.title || "-"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-700">Assigned To</p>
                  <p className="font-medium text-gray-900">
                    {Array.isArray(template.assignedNames) && template.assignedNames.length > 0
                      ? template.assignedNames.join(", ")
                      : template.createdByName || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-700">Deadline</p>
                  <p className="font-medium text-gray-900">
                    {template.deadline ? formatDate(template.deadline) : "No deadline set"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Tag className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-700">Status</p>
                  <p className="font-medium text-gray-900">
                    {(() => {
                      if (template.status === "approved") return "Approved";
                      if (template.status === "pending") return "Pending Approval";
                      if (template.status === "assigned") return "OnGoing";
                      if (template.status === "published") return "Published";
                      return "-";
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Message/Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Message/Notes (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="3"
              placeholder="Add comments or notes..."
            />
          </div>

     {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
        <button
            onClick={handleApprove}
            className="flex items-center gap-2 px-4 py-2 rounded-md shadow-lg bg-green-600 text-white hover:bg-green-700 hover:shadow-md font-medium transition-all min-w-[120px]"
        >
            <CheckCircle2 className="h-4 w-4" />
            Approve
        </button>

        <button
            onClick={handleReject}
            className="flex items-center gap-2 px-4 py-2 rounded-md shadow-lg bg-red-600 text-white hover:bg-red-700 hover:shadow-md font-medium transition-all min-w-[120px]"
        >
            <X className="h-4 w-4" />
            Reject
        </button>

        <button
            onClick={handleReturn} 
            className="flex items-center gap-2 px-4 py-2 rounded-md shadow-lg bg-amber-600 text-white hover:bg-amber-700 hover:shadow-md font-medium transition-all min-w-[120px]"
        >
            <Undo2 className="h-4 w-4" />
            Return
        </button>


        </div>

          {/* Cancel */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
