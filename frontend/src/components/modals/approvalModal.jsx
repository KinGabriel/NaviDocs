import { useState, useEffect } from "react";
import { CheckCircle2, X, AlertTriangle, User, Clock, Tag, FileText, Undo2 } from "lucide-react";
import { formatDate } from "../../utils/formatters.jsx";

export default function ApprovalModal({
  isOpen,
  onClose,
  template,
  user,
  onApprove,
  onReject,
  onReturn,
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Mini-modal (overlay) state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [approvedDone, setApprovedDone] = useState(false);

  // Clear local state whenever modal opens/closes or template changes
  useEffect(() => {
    if (isOpen) {
      setMessage("");
      setError("");
      setLoading(false);
      setConfirmOpen(false);
      setApprovedDone(false);
    }
  }, [isOpen, template?._id]);

  if (!isOpen || !template) return null;

  const handleApprove = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await onApprove(template, message);
      onClose();
    } catch (err) {
      setError("Failed to approve template.");
      console.error("Error approving template:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (loading) return;
    if (!message.trim()) {
      setError("Please provide a reason for rejection.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onReject(template, message);
      onClose();
    } catch (err) {
      setError("Failed to reject template.");
      console.error("Error rejecting template:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    if (loading) return;
    if (!message.trim()) {
      setError("Please provide a reason for returning the template.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onReturn(template, message);
      onClose();
    } catch (err) {
      setError("Failed to return template.");
      console.error("Error returning template:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Template Approvals</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" disabled={loading}>
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

          {/* Loading Indicator */}
          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-blue-700 text-sm">Processing...</span>
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
                  <p className="font-medium text-gray-900">{template.deadline ? formatDate(template.deadline) : "No deadline set"}</p>
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
                      if (template.status === "rejected") return "Rejected";
                      if (template.status === "returned") return "Returned";
                      return "-";
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions (Optional)</label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows="3"
              placeholder="Add comments or notes..."
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            {/* Approve (opens confirmation overlay) */}
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-md shadow-lg bg-green-600 text-white hover:bg-green-700 hover:shadow-md font-medium transition-all min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4" />
              {loading ? "Processing..." : "Approve"}
            </button>

            <button
              onClick={handleReject}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-md shadow-lg bg-red-600 text-white hover:bg-red-700 hover:shadow-md font-medium transition-all min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4" />
              {loading ? "Processing..." : "Reject"}
            </button>

            <button
              onClick={handleReturn}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-md shadow-lg bg-amber-600 text-white hover:bg-amber-700 hover:shadow-md font-medium transition-all min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Undo2 className="h-4 w-4" />
              {loading ? "Processing..." : "Return"}
            </button>
          </div>

          {/* Cancel */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>

          {/* Approve Confirmation Mini-Modal Overlay */}
          {confirmOpen && (
            <div
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="approve-confirm-title"
            >
              <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b">
                  <h3 id="approve-confirm-title" className="text-lg font-semibold">
                    {approvedDone ? "Template Approved" : "Approve Template"}
                  </h3>
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                  {!approvedDone ? (
                    <p className="text-sm text-gray-700">
                      Are you sure you want to approve this template?
                    </p>
                  ) : (
                    <div className="flex items-start gap-3">
                      <svg className="h-6 w-6 text-green-600 mt-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 22C6.477 22 2 17.522 2 12S6.477 2 12 2s10 4.478 10 10-4.477 10-10 10Zm4.243-13.657a1 1 0 0 0-1.486-1.337l-4.51 5.012-1.979-1.98a1 1 0 1 0-1.414 1.415l2.75 2.75a1 1 0 0 0 1.46-.036l5.179-5.824Z" />
                      </svg>
                      <div>
                        <p className="text-base font-medium text-gray-900">
                          This template has been approved.
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Your approval has been recorded and the status is now <span className="font-semibold">Approved</span>.
                        </p>
                      </div>
                    </div>
                  )}

                  {error && !approvedDone && (
                    <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                      {error}
                    </div>
                  )}
                </div>

                {/* Footer — No (left) and Yes (right) */}
                <div className="px-5 py-4 border-t flex items-center justify-between">
                  {!approvedDone ? (
                    <>
                      {/* No (left) */}
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmOpen(false);
                          setApprovedDone(false);
                        }}
                        className="px-4 py-2 rounded-md border text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-60"
                        disabled={loading}
                      >
                        No
                      </button>

                      {/* Yes (right) */}
                      <button
                        type="button"
                        onClick={async () => {
                          if (loading) return;
                          setError("");
                          setLoading(true);
                          try {
                            await onApprove(template, message);
                            setApprovedDone(true);
                          } catch (e) {
                            setError("Failed to approve template.");
                            console.error("Error approving template:", e);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
                        disabled={loading}
                      >
                        {loading ? "Approving..." : "Yes"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmOpen(false);
                        setApprovedDone(false);
                        onClose(); // close the parent modal after acknowledging success
                      }}
                      className="ml-auto px-4 py-2 rounded-md border text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
