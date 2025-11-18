/**
 * @fileoverview Submit for Approval Modal Component
 * 
 * This component provides a comprehensive modal interface for submitting templates for approval,
 * tracking approval progress, and publishing approved templates. It handles multiple workflow states
 * including draft submission, revision resubmission, and final publication.
 * 
 * Features:
 * - Submit drafts for initial approval
 * - Resubmit returned templates with revision tracking
 * - Display real-time approval progress
 * - Track individual approver status
 * - Add instructions and notes for reviewers
 * - Automatic document code fetching for revisions
 * - Publish fully approved templates
 * - Visual progress indicators and status badges
 * 
 * Workflow States:
 * - draft: Initial submission state
 * - assigned: Template has been assigned to creator
 * - returned: Template was returned for revision
 * - pending/submitted: Awaiting approver review
 * - publish: All approvals complete, ready to publish
 * 
 * @module SubmitForApprovalModal
 * @requires react
 * @requires lucide-react
 */

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  Send,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import {
  submitTemplateAPI,
  addTemplateNoteAPI,
  fetchPublishedTemplatesAPI,
} from "../../api/documentContollerAPI";

/**
 * SubmitForApprovalModal - Modal component for template submission and approval tracking
 * 
 * This component provides a multi-state interface that adapts based on the template's
 * current approval status. It handles:
 * - Initial submission from draft state
 * - Resubmission after being returned for revision
 * - Tracking approval progress through multiple reviewers
 * - Final publication when all approvals are complete
 * 
 * The component automatically fetches available document codes when in revision mode
 * to help users specify which document is being revised.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Callback when modal closes
 * @param {string} props.status - Current template status ("draft"|"assigned"|"submitted"|"returned"|"pending"|"publish")
 * @param {Array<Object>} [props.approvalProgress=[]] - Array of approval progress objects
 * @param {string} props.approvalProgress[].approverId - ID of approver
 * @param {string} props.approvalProgress[].status - Approval status ("pending"|"approved"|"rejected")
 * @param {string} [props.approvalProgress[].approvedAt] - ISO timestamp of approval
 * @param {Function} props.onSubmit - Callback when template is submitted
 * @param {Function} props.onPublish - Callback when template is published
 * @param {Array<Object>} [props.approvers=[]] - Array of approver objects
 * @param {string} props.approvers[]._id - Approver ID
 * @param {string} props.approvers[].firstname - Approver first name
 * @param {string} props.approvers[].lastname - Approver last name
 * @param {string} props.approvers[].email - Approver email
 * @param {Object|string} props.approvers[].role - Approver role object or string
 * @param {Array<Object|string>} [props.notes=[]] - Array of note objects or strings
 * @param {string} props.notes[].message - Note message text
 * @param {string} [props.notes[].added_by_name] - Name of note author
 * @param {string} props.templateId - ID of template being submitted
 * @param {Function} [props.onSubmitSuccess] - Callback on successful submission
 * @param {Object|null} [props.approvals=null] - Approval data object with role-based keys
 * @param {Object} [props.approvals.document_controller_officer] - Officer approval data
 * @param {Object} [props.approvals.lead_document_controller] - Lead approval data
 * @param {Object} [props.approvals.unit_document_controller] - Unit approval data
 * @param {Object|null} [props.approvalMeta=null] - Alternative approval metadata format
 * @param {boolean} [props.approvalMeta.officerApproved] - Officer approval flag
 * @param {boolean} [props.approvalMeta.leadApproved] - Lead approval flag
 * @param {boolean} [props.approvalMeta.unitApproved] - Unit approval flag
 * @param {Object|null} [props.template=null] - Full template object with status_meta
 * @param {Object} [props.template.status_meta] - Status metadata
 * @param {Object} [props.template.status_meta.approvals] - Approval details by role/ID
 * @param {Array<string>} [props.revisionTargets=[]] - Initial list of document codes for revision
 * @returns {React.ReactElement|null} Modal component or null if not open
 * 
 * @example
 * <SubmitForApprovalModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   status="draft"
 *   templateId={templateId}
 *   approvers={approversList}
 *   onSubmit={handleSubmit}
 *   onSubmitSuccess={(newStatus) => console.log('New status:', newStatus)}
 * />
 * 
 * @example
 * // For revision workflow
 * <SubmitForApprovalModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   status="returned"
 *   templateId={templateId}
 *   approvers={approversList}
 *   notes={reviewerNotes}
 *   revisionTargets={['FM-CICM-001', 'FM-CICM-002']}
 *   onSubmit={handleResubmit}
 * />
 */
export default function SubmitForApprovalModal({
  isOpen,
  onClose,
  status, // "draft"/"assigned"/"submitted"/"publish"
  approvalProgress = [],
  onSubmit,
  onPublish,
  approvers: approversProp = [],
  notes = [],
  templateId,
  onSubmitSuccess,
  approvals = null,
  approvalMeta = null,
  template = null,
  // optional initial document codes list (will be overridden/augmented by fetched codes)
  revisionTargets: revisionTargetsProp = [],
}) {
  const [instructions, setInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState(false);

  // revision-specific state
  const [revisionDocCode, setRevisionDocCode] = useState("");
  const [revisionError, setRevisionError] = useState(false);

  // fetched document codes (from published templates)
  const [revisionTargets, setRevisionTargets] = useState(
    Array.isArray(revisionTargetsProp) ? revisionTargetsProp : []
  );
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [revisionFetchError, setRevisionFetchError] = useState("");

  // treat returned status as revision mode
  const isRevision = status === "returned";

  // reset form when opened / status changes
  useEffect(() => {
    if (
      isOpen &&
      (status === "draft" || status === "assigned" || status === "returned")
    ) {
      setInstructions("");
      setError(false);
      setRevisionDocCode("");
      setRevisionError(false);
      setSubmitSuccess(false);

      // reset fetch error
      setRevisionFetchError("");
    }
    setIsSubmitting(false);
  }, [isOpen, status]);

  /**
   * Effect: Fetches published templates' document codes for revision selection
   * Only runs when modal is open and status is "returned"
   * Merges fetched codes with initial prop values
   */
  // fetch published templates' document codes when in revision mode
  useEffect(() => {
    if (!isOpen || status !== "returned") return;

    let ignore = false;

    const fetchCodes = async () => {
      setRevisionLoading(true);
      setRevisionFetchError("");

      try {
        const params = {
          limit: 500,
          page: 1,
        };

        const result = await fetchPublishedTemplatesAPI(params);

        let arr = [];
        if (result?.success && result.data?.templates) {
          arr = result.data.templates;
        } else if (Array.isArray(result?.templates)) {
          arr = result.templates;
        } else if (Array.isArray(result)) {
          arr = result;
        }

        const codesFromAPI = [
          ...new Set(
            arr
              .map((t) => t.document_code)
              .filter(Boolean)
              .map((c) => String(c).toUpperCase())
          ),
        ];

        const initialFromProp = Array.isArray(revisionTargetsProp)
          ? revisionTargetsProp.map((c) => String(c).toUpperCase())
          : [];

        const merged = [
          ...new Set([...initialFromProp, ...codesFromAPI].filter(Boolean)),
        ];

        if (!ignore) {
          setRevisionTargets(merged);
        }
      } catch (err) {
        if (!ignore) {
          setRevisionTargets(
            Array.isArray(revisionTargetsProp) ? revisionTargetsProp : []
          );
          setRevisionFetchError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to load document codes for revision."
          );
        }
      } finally {
        if (!ignore) setRevisionLoading(false);
      }
    };

    fetchCodes();

    return () => {
      ignore = true;
    };
  }, [isOpen, status, revisionTargetsProp]);

  if (!isOpen) return null;

  const hasExistingApprovals = () => {
    if (status === "pending") return true;
    if (approvals) {
      return Boolean(
        approvals.document_controller_officer?.approved_at ||
        approvals.lead_document_controller?.approved_at ||
        approvals.unit_document_controller?.approved_at
      );
    }
    if (approvalMeta) {
      return Boolean(
        approvalMeta.officerApproved ||
        approvalMeta.leadApproved ||
        approvalMeta.unitApproved
      );
    }
    return false;
  };

  // clear error when user starts typing
  const handleInstructionsChange = (e) => {
    setInstructions(e.target.value);
    if (error && e.target.value.trim()) {
      setError(false);
    }
  };

  const handleRevisionDocCodeChange = (e) => {
    setRevisionDocCode(e.target.value);
    if (revisionError && e.target.value) {
      setRevisionError(false);
    }
  };

  const handleSubmit = async () => {
    // validation in revision mode
    if (status === "returned") {
      // Only validate revisionDocCode - instructions are optional
      if (!revisionDocCode) {
        setRevisionError(true);
        return;
    }
  }

    setIsSubmitting(true);
    setSubmitSuccess(false);
    setError(false);
    setRevisionError(false);

    try {
      if (!templateId) {
        console.error("No template ID provided");
        return;
      }

      // DRAFT
      if (status === "draft") {
        const submitRes = await submitTemplateAPI(templateId);

        if (instructions.trim()) {
          try {
            const noteText = instructions.trim();
            await addTemplateNoteAPI(templateId, noteText);
          } catch (noteErr) {
            console.error("Add note (instructions) failed:", noteErr);
          }
        }

        if (typeof onSubmit === "function") {
          await onSubmit(undefined, instructions);
        }

        if (onSubmitSuccess) {
          const newStatus = submitRes?.template?.status || "pending";
          onSubmitSuccess(newStatus, instructions, approversProp || []);
        }

        setSubmitSuccess(true);
        setTimeout(() => {
          setSubmitSuccess(false);
          onClose();
        }, 1500);
      }

      // ASSIGNED or RETURNED
      if (status === "assigned" || status === "returned") {
        const submitRes = await submitTemplateAPI(templateId);

        if (instructions.trim()) {
          try {
            const noteText =
              status === "returned" && revisionDocCode
                ? `[REVISION OF: ${revisionDocCode}] ${instructions.trim()}`
                : instructions.trim();

            await addTemplateNoteAPI(templateId, noteText);
          } catch (noteErr) {
            console.error("Add note (instructions) failed:", noteErr);
          }
        }

        if (typeof onSubmit === "function") {
          await onSubmit(undefined, instructions);
        }

        if (onSubmitSuccess) {
          const newStatus = submitRes?.template?.status || "pending";
          onSubmitSuccess(newStatus, instructions, approversProp || []);
        }

        setSubmitSuccess(true);
        setTimeout(() => {
          setSubmitSuccess(false);
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert(
        error?.response?.data?.message ||
        error?.message ||
          "Failed to submit template. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    try {
      await onPublish?.();

      if (onSubmitSuccess) {
        onSubmitSuccess("published", null, approversProp || []);
      }
      onClose();
    } catch (error) {
      console.error("Publish error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get approval status for display
  const getApprovalStatus = (approverId) => {
    const progress = approvalProgress.find((p) => p.approverId === approverId);
    return progress ? progress.status : "pending";
  };

  // Get approval date for display
  const getApprovalDate = (approverId) => {
    const progress = approvalProgress.find((p) => p.approverId === approverId);
    return progress && progress.approvedAt
      ? new Date(progress.approvedAt).toLocaleDateString()
      : null;
  };

  // Build approvers for progress display
  const approvers = approversProp || [];

  const allApproved = approvers.every(
    (approver) => getApprovalStatus(approver.id) === "approved"
  );

  const statusConfig = {
    draft: {
      title: hasExistingApprovals()
        ? "Approval Progress"
        : "Submit for Approval",
      description: hasExistingApprovals()
        ? "Track the current status of your submission"
        : "Add instructions and submit your template for review",
      icon: hasExistingApprovals() ? (
        <Clock className="h-6 w-6 text-yellow-600" />
      ) : (
        <Send className="h-6 w-6 text-blue-600" />
      ),
      color: hasExistingApprovals() ? "yellow" : "blue",
    },
    pending: {
      title: "Approval Progress",
      description: "Track the current status of your submission",
      icon: <Clock className="h-6 w-6 text-yellow-600" />,
      color: "yellow",
    },
    assigned: {
      title: hasExistingApprovals()
        ? "Approval Progress"
        : "Submit for Approval",
      description: hasExistingApprovals()
        ? "Track the current status of your submission"
        : "Add instructions and submit your template for review",
      icon: hasExistingApprovals() ? (
        <Clock className="h-6 w-6 text-yellow-600" />
      ) : (
        <Send className="h-6 w-6 text-blue-600" />
      ),
      color: hasExistingApprovals() ? "yellow" : "blue",
    },
    returned: {
      title: "Resubmit for Review",
      description:
        "Add instructions and resubmit to the approver who returned it",
      icon: <Send className="h-6 w-6 text-blue-600" />,
      color: "orange",
    },
    submitted: {
      title: "Approval Progress",
      description: "Track the current status of your submission",
      icon: <Clock className="h-6 w-6 text-yellow-600" />,
      color: "yellow",
    },
    publish: {
      title: "Ready to Publish",
      description: "All approvals complete - ready for publication",
      icon: <CheckCircle2 className="h-6 w-6 text-green-600" />,
      color: "green",
    },
  };

  const currentStatus = statusConfig[status] || statusConfig.draft;

  const getApprovalStatusFromData = (approver) => {
    const approverId = approver._id || approver.id;
    const roleName = (approver?.role?.name || approver?.role || "").toLowerCase();
    const key =
      roleName === "lead document controller"
        ? "lead_document_controller"
        : roleName === "document control officer"
        ? "document_controller_officer"
        : roleName === "unit document controller"
        ? "unit_document_controller"
        : roleName;

    // Check template's status_meta first
    if (template?.status_meta?.approvals) {
      const statusApprovals = template.status_meta.approvals;

      // Check by role
      if (statusApprovals[key]?.isApproved === true) return "approved";
      if (statusApprovals[key]?.isRejected === true) return "rejected";

      // Check by approver ID
      if (statusApprovals[approverId]?.isApproved === true) return "approved";
      if (statusApprovals[approverId]?.isRejected === true) return "rejected";
    }

    // Check approvals prop
    if (approvals) {
      if (approvals[key]?.approved_at || approvals[key]?.isApproved)
        return "approved";
      if (approvals[approverId]?.approved_at || approvals[approverId]?.isApproved)
        return "approved";
    }

    // Check approvalMeta
    if (approvalMeta) {
      if (
        (roleName === "document control officer" &&
          approvalMeta.officerApproved) ||
        (roleName === "lead document controller" && approvalMeta.leadApproved) ||
        (roleName === "unit document controller" && approvalMeta.unitApproved)
      ) {
        return "approved";
      }
    }

    return "pending";
  };

  const getApprovalTimestamp = (approver) => {
    const approverId = approver._id || approver.id;
    const roleName = (approver?.role?.name || approver?.role || "").toLowerCase();
    const key =
      roleName === "lead document controller"
        ? "lead_document_controller"
        : roleName === "document control officer"
        ? "document_controller_officer"
        : roleName === "unit document controller"
        ? "unit_document_controller"
        : roleName;

    // Check template status_meta first
    if (template?.status_meta?.approvals) {
      const statusApprovals = template.status_meta.approvals;
      if (statusApprovals[key]?.approved_at) {
        return new Date(statusApprovals[key].approved_at);
      }
      if (statusApprovals[approverId]?.approved_at) {
        return new Date(statusApprovals[approverId].approved_at);
      }
    }

    // Check approvals prop
    if (approvals && roleName && approvals[key]?.approved_at) {
      return new Date(approvals[key].approved_at);
    }

    return null;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center g-opacity-50 backdrop-blur-[2px] z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm border border-slate-200">
              {currentStatus.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">
                {currentStatus.title}
              </h2>
              <p className="text-sm text-slate-600">
                {currentStatus.description}
              </p>

              {/* Submission type pill */}
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Submission Type
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    isRevision
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {isRevision
                    ? "Revision"
                    : "Creation"}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 text-slate-400 hover:text-slate-600 hover:bg-white/80 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {/* Show approval progress when status is pending or when draft/assigned/returned has existing approvals */}
          {(status === "pending" ||
            (status === "draft" && hasExistingApprovals()) ||
            (status === "assigned" && hasExistingApprovals()) ||
            (status === "returned" && hasExistingApprovals())) && (
            <div className="space-y-4">
              <h3 className="text-base font-medium text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-500" />
                Approval Status
              </h3>
              <div className="space-y-3">
                {approversProp.map((approver) => {
                  const approvalStatus = getApprovalStatusFromData(approver);
                  const approvedAt = getApprovalTimestamp(approver);
                  const timeStr = approvedAt
                    ? approvedAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : null;

                  return (
                    <div
                      key={approver._id}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        approvalStatus === "approved"
                          ? "bg-green-50 border-green-200"
                          : "bg-yellow-50 border-yellow-200"
                      }`}
                    >
                      {approvalStatus === "approved" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">
                          {approver.firstname && approver.lastname
                            ? `${approver.firstname} ${approver.lastname}`
                            : approver.name ||
                              approver.email ||
                              "Unknown Approver"}
                        </div>
                        <div className="text-sm text-slate-500">
                          {approver.role?.name || approver.role || "Approver"}
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          approvalStatus === "approved"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {approvalStatus === "approved"
                          ? `${
                              (approver.role?.name || approver.role || "").toString() ===
                              "Unit Document Controller"
                                ? "Endorsed"
                                : "Approved"
                            }${timeStr ? ` ${timeStr}` : ""}`
                          : `${
                              (approver.role?.name || approver.role || "").toString() ===
                              "Unit Document Controller"
                                ? "Pending Endorsement"
                                : "Pending Approval"
                            }`}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Progress summary */}
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Progress:</span>
                  <span className="font-medium text-slate-900">
                    {
                      approversProp.filter(
                        (a) => getApprovalStatusFromData(a) === "approved"
                      ).length
                    }{" "}
                    of {approversProp.length} approved
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (approversProp.filter(
                          (a) => getApprovalStatusFromData(a) === "approved"
                        ).length /
                          approversProp.length) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {status === "draft" && !hasExistingApprovals() && (
            <>
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-slate-500" />
                    <h3 className="text-base font-medium text-slate-900">
                      Instructions for Approvers{" "}
                      {status === "returned" && (
                        <span className="text-red-500">*</span>
                      )}
                    </h3>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    value={instructions}
                    onChange={(e) => {
                      if (e.target.value.length <= 300) {
                        handleInstructionsChange(e);
                      }
                    }}
                    className={`w-full border rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 pr-14 ${
                      error
                        ? "border-red-300 bg-red-50 focus:ring-red-500"
                        : "border-slate-200"
                    }`}
                    rows={4}
                    placeholder="Add notes or specific instructions for the approvers..."
                  />
                  <span
                    className={`absolute bottom-2 right-3 text-xs ${
                      instructions.length > 300
                        ? "text-red-500"
                        : "text-slate-400"
                    }`}
                  >
                    {instructions.length} / 300
                  </span>
                </div>
              </div>
            </>
          )}

          {(((status === "assigned") && !hasExistingApprovals()) ||
            status === "returned") && (
            <div className="space-y-6">
              <div>
                {notes && notes.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-base font-medium text-slate-900 mb-3 flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-slate-500" />
                      {status === "returned"
                        ? "Instructions from Reviewer"
                        : "Instructions from Assignor"}
                    </h3>
                    <ul className="space-y-2">
                      {notes.map((note, i) => (
                        <li
                          key={i}
                          className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-slate-700"
                        >
                          {note.message ||
                            note.note ||
                            (typeof note === "string" ? note : "")}
                          {note.added_by_name && (
                            <span className="ml-2 text-xs text-slate-500 italic">
                              - {note.added_by_name}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Revision details when returned */}
              {status === "returned" && (
                <div className="space-y-3">
                  <h3 className="text-base font-medium text-slate-900 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    Revision Details
                  </h3>
                  <p className="text-xs text-slate-500">
                    This submission is for a revision. Please indicate which
                    document code will be revised.
                  </p>

                  {revisionTargets && revisionTargets.length > 0 ? (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-800">
                        Document code to be revised{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={revisionDocCode}
                        onChange={handleRevisionDocCodeChange}
                        disabled={revisionLoading}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 bg-white ${
                          revisionError
                            ? "border-red-400 focus:ring-red-500"
                            : "border-slate-200 focus:ring-blue-500"
                        } ${revisionLoading ? "bg-slate-100 cursor-wait" : ""}`}
                      >
                        <option value="">
                          {revisionLoading
                            ? "Loading document codes..."
                            : "Select document code"}
                        </option>
                        {revisionTargets.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                      {revisionFetchError && (
                        <p className="mt-1 text-xs text-amber-700 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {revisionFetchError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-800">
                        Document code to be revised{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={revisionDocCode}
                        onChange={handleRevisionDocCodeChange}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
                          revisionError
                            ? "border-red-400 bg-red-50 focus:ring-red-500"
                            : "border-slate-200 focus:ring-blue-500"
                        }`}
                        placeholder="Enter the document code you are revising (e.g., FM-CICM-001)..."
                      />
                      {revisionFetchError && (
                        <p className="mt-1 text-xs text-amber-700 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {revisionFetchError} You can still type the code
                          manually.
                        </p>
                      )}
                    </div>
                  )}

                  {revisionError && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      Please specify which document code this revision is for.
                    </div>
                  )}
                </div>
              )}

              {/* Instructions field */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-slate-500" />
                  <h3 className="text-base font-medium text-slate-900">
                    {status === "returned"
                      ? "Add Resubmission Notes"
                      : "Add Instructions"}
                    {status !== "returned" && <span className="text-red-500">*</span>}
                    {status === "returned" && <span className="text-slate-400 text-sm ml-1">(optional)</span>}
                  </h3>
                </div>
                <textarea
                  value={instructions}
                  onChange={handleInstructionsChange}
                  className={`w-full border rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow ${
                    error ? "border-red-300 bg-red-50" : "border-slate-200"
                  }`}
                  rows={3}
                  placeholder={
                    status === "returned"
                      ? "Add notes on what you changed or any context for the reviewer..."
                      : "Add notes or specific instructions for the approvers..."
                  }
                />
                {error && status !== "returned" && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    Instructions are required before submitting.
                  </div>
                )}
              </div>
            </div>
          )}

          {status === "submitted" && (
            <div className="space-y-4">
              <h3 className="text-base font-medium text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-500" />
                Approval Status
              </h3>
              <div className="space-y-3">
                {approvers.map((approver) => {
                  const approvalStatus = getApprovalStatus(approver.id);
                  const approvalDate = getApprovalDate(approver.id);

                  return (
                    <div
                      key={approver.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        approvalStatus === "approved"
                          ? "bg-green-50 border-green-200"
                          : approvalStatus === "rejected"
                          ? "bg-red-50 border-red-200"
                          : "bg-yellow-50 border-yellow-200"
                      }`}
                    >
                      {approvalStatus === "approved" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : approvalStatus === "rejected" ? (
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">
                          {approver.name}
                        </div>
                        <div
                          className={`text-sm ${
                            approvalStatus === "approved"
                              ? "text-green-700"
                              : approvalStatus === "rejected"
                              ? "text-red-700"
                              : "text-yellow-700"
                          }`}
                        >
                          {approvalStatus === "approved"
                            ? `Approved${
                                approvalDate ? ` on ${approvalDate}` : ""
                              }`
                            : approvalStatus === "rejected"
                            ? `Rejected${
                                approvalDate ? ` on ${approvalDate}` : ""
                              }`
                            : "Awaiting review"}
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          approvalStatus === "approved"
                            ? "bg-green-100 text-green-800"
                            : approvalStatus === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {approvalStatus === "approved"
                          ? "Approved"
                          : approvalStatus === "rejected"
                          ? "Rejected"
                          : "Pending"}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Progress:</span>
                  <span className="font-medium text-slate-900">
                    {
                      approvalProgress.filter(
                        (p) => p.status === "approved"
                      ).length
                    }{" "}
                    of {approvers.length} approved
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (approvalProgress.filter(
                          (p) => p.status === "approved"
                        ).length /
                          approvers.length) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {status === "publish" && (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  All Approvals Complete!
                </h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  All required approvers have reviewed and approved your
                  template. <br />
                  You can now publish it to make it available for use.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900 mb-2">
                  Approved by:
                </h4>
                <div className="space-y-1">
                  {approvers.map((approver) => {
                    const approvalStatus = getApprovalStatusFromData(approver);
                    const approvedAt = getApprovalTimestamp(approver);
                    const timeStr = approvedAt
                      ? approvedAt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : null;

                    return (
                      <div
                        key={approver.id || approver._id}
                        className={`flex items-center gap-4 p-4 rounded-lg border ${
                          approvalStatus === "approved"
                            ? "bg-green-50 border-green-200"
                            : "bg-yellow-50 border-yellow-200"
                        }`}
                      >
                        {approvalStatus === "approved" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">
                            {approver.firstname && approver.lastname
                              ? `${approver.firstname} ${approver.lastname}`
                              : approver.name ||
                                approver.email ||
                                "Unknown Approver"}
                          </div>
                          <div className="text-sm text-slate-500">
                            {approver.role?.name || approver.role || "Approver"}
                          </div>
                        </div>
                        <div
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            approvalStatus === "approved"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {approvalStatus === "approved"
                            ? `Approved${timeStr ? ` ${timeStr}` : ""}`
                            : "Pending Approval"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 bg-slate-50 border-t border-slate-200 px-6 py-4">
          <div className="text-xs text-slate-500">
            {status === "submitted" &&
              `${approvalProgress.filter((p) => p.status === "approved").length}/${
                approvers.length
              } approvals complete`}
            {(status === "pending" || hasExistingApprovals()) &&
              `${approversProp.filter(
                (a) => getApprovalStatusFromData(a) === "approved"
              ).length}/${approversProp.length} approvals complete`}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === "publish" ? "Close" : "Cancel"}
            </button>

            {(status === "returned" ||
              ((status === "draft" || status === "assigned") &&
                !hasExistingApprovals())) && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || submitSuccess}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Submitting...
                  </>
                ) : submitSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Submitted
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit
                  </>
                )}
              </button>
            )}

            {status === "publish" && (
              <button
                onClick={handlePublish}
                disabled={isSubmitting}
                className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Publish Now
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}