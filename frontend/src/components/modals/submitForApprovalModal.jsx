import React, { useState, useEffect } from "react";
import { X, CheckCircle2, Clock, UserCheck, Send, FileText, Users, MessageCircle, AlertCircle } from "lucide-react";


import { fetchSchoolStaffAPI } from '../../api/userAPI';
import { submitTemplateAPI } from '../../api/documentContollerAPI';
import SingleSelectDropdown from '../SingleSelectDropdown';

export default function SubmitApprovalModal({
  isOpen,
  onClose,
  status, // "draft"/"assigned"/"submitted"/"publish"
  instructionsFromAssignee,
  approvalProgress = [],
  onSubmit,
  onPublish,
  approvers: approversProp = [],
  notes = [],
  templateId,
}) {
  const [selectedSecretary, setSelectedSecretary] = useState("");
  const [selectedDean, setSelectedDean] = useState("");
  const [secretaries, setSecretaries] = useState([]);
  const [deans, setDeans] = useState([]);
  const [instructions, setInstructions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // In draft mode, selected approvers are the selected secretary and dean (if any)
  const selectedApprovers = [
    ...((selectedSecretary && secretaries.find(s => s.id === selectedSecretary)) ? [secretaries.find(s => s.id === selectedSecretary)] : []),
    ...((selectedDean && deans.find(d => d.id === selectedDean)) ? [deans.find(d => d.id === selectedDean)] : []),
  ];

  useEffect(() => {
    if (isOpen && status === "draft") {
      setInstructions("");
      setSelectedSecretary("");
      setSelectedDean("");
      fetchSchoolStaffAPI().then(({ secretaries = [], deans = [] }) => {
        setSecretaries(secretaries);
        setDeans(deans);
        if (secretaries.length > 0) setSelectedSecretary(secretaries[0].id);
        if (deans.length > 0) setSelectedDean(deans[0].id);
      });
    }
    setIsSubmitting(false);
  }, [isOpen, status]);

  if (!isOpen) return null;



  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitSuccess(false);
    try {
      if (status === "draft") {
        if (selectedDean && selectedSecretary && templateId) {
          await submitTemplateAPI(templateId, selectedDean, selectedSecretary);
          if (typeof onSubmit === 'function') {
            await onSubmit([selectedSecretary, selectedDean], instructions);
          }
          setSubmitSuccess(true);
          setTimeout(() => setSubmitSuccess(false), 1500);
        }
      } else if (status === "assigned") {
        if (templateId) {
          await submitTemplateAPI(templateId, selectedDean, selectedSecretary);
          if (typeof onSubmit === 'function') {
            const allIds = [
              ...secretaries.map(s => s.id),
              ...deans.map(d => d.id)
            ];
            await onSubmit(allIds, instructionsFromAssignee || "");
          }
          setSubmitSuccess(true);
          setTimeout(() => setSubmitSuccess(false), 1500);
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    try {
      await onPublish?.();
    } catch (error) {
      console.error("Publish error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get approval status for display
  const getApprovalStatus = (approverId) => {
    const progress = approvalProgress.find(p => p.approverId === approverId);
    return progress ? progress.status : 'pending';
  };
        useEffect(() => {
          console.log("useEffect triggered with isOpen:", isOpen, "and status:", status);
          if (isOpen && status === "draft") {
            setInstructions("");
            setSelectedSecretary("");
            setSelectedDean("");
            fetchSchoolStaffAPI().then(({ secretaries = [], deans = [] }) => {
              setSecretaries(secretaries);
              setDeans(deans);
              if (secretaries.length > 0) setSelectedSecretary(secretaries[0].id);
              if (deans.length > 0) setSelectedDean(deans[0].id);
            });
          }
          setIsSubmitting(false);
        }, [isOpen, status]);


  // Build approvers for progress display
  const approvers = status === 'assigned' && approversProp.length > 0
    ? approversProp
    : [
        ...secretaries.map(s => ({ id: s.id, name: s.name, role: 'Secretary' })),
        ...deans.map(d => ({ id: d.id, name: d.name, role: 'Dean' })),
      ];

  const allApproved = approvers.every(approver => 
    getApprovalStatus(approver.id) === 'approved'
  );

  const statusConfig = {
    draft: {
      title: "Submit for Approval",
      description: "Select recipients and send your template for review",
      icon: <Send className="h-6 w-6 text-blue-600" />,
      color: "blue"
    },
    assigned: {
      title: "Submit for Approval",
      description: "Complete the approval submission process",
      icon: <Send className="h-6 w-6 text-blue-600" />,
      color: "blue"
    },
    submitted: {
      title: "Approval Progress",
      description: "Track the current status of your submission",
      icon: <Clock className="h-6 w-6 text-yellow-600" />,
      color: "yellow"
    },
    publish: {
      title: "Ready to Publish",
      description: "All approvals complete - ready for publication",
      icon: <CheckCircle2 className="h-6 w-6 text-green-600" />,
      color: "green"
    }
  };

  const currentStatus = statusConfig[status] || statusConfig.draft;

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
          {/* Draft state */}
          {status === "draft" && (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-slate-500" />
                  <h3 className="text-base font-medium text-slate-900">
                    Select Recipients
                  </h3>
                </div>
                <div className="grid gap-3">
                  <SingleSelectDropdown
                    label={<span>Secretary <span className="text-red-500">*</span></span>}
                    icon={UserCheck}
                    options={secretaries.map(s => ({ value: s.id, label: s.name, email: s.email }))}
                    value={selectedSecretary}
                    onChange={setSelectedSecretary}
                    placeholder="Select secretary..."
                  />
                  <SingleSelectDropdown
                    label={<span>Dean <span className="text-red-500">*</span></span>}
                    icon={UserCheck}
                    options={deans.map(d => ({ value: d.id, label: d.name, email: d.email }))}
                    value={selectedDean}
                    onChange={setSelectedDean}
                    placeholder="Select dean..."
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-slate-500" />
                  <h3 className="text-base font-medium text-slate-900">
                    Add Instructions
                    <span className="text-sm font-normal text-slate-500 ml-2">(Optional)</span>
                  </h3>
                </div>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
                  rows={3}
                  placeholder="Add notes or specific instructions for the approvers..."
                />
              </div>
            </>
          )}

          {/* Assigned state */}
          {status === "assigned" && (
            <div className="space-y-6">
              <div>

                {notes && notes.length > 0 && (
                  <div className="mt-4">
                      <h3 className="text-base font-medium text-slate-900 mb-3 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-slate-500" />
                  Instructions from Assignor
                </h3>
                    <ul className="space-y-2">
                      {notes.map((note, i) => (
                        <li key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-slate-700">
                          {note.message || note.note || (typeof note === 'string' ? note : '')}
                          {note.added_by_name && (
                            <span className="ml-2 text-xs text-slate-500 italic">- {note.added_by_name}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-base font-medium text-slate-900 mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-500" />
                  Approvers
                </h3>
                <div className="grid gap-3">
                  {approvers.map((approver) => (
                    <div
                      key={approver.id}
                      className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <UserCheck className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{approver.name}</div>
                        <div className="text-sm text-slate-500">{approver.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Submitted state */}
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
                        approvalStatus === 'approved'
                          ? 'bg-green-50 border-green-200'
                          : approvalStatus === 'rejected'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      {approvalStatus === 'approved' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : approvalStatus === 'rejected' ? (
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">{approver.name}</div>
                        <div className={`text-sm ${
                          approvalStatus === 'approved'
                            ? 'text-green-700'
                            : approvalStatus === 'rejected'
                            ? 'text-red-700'
                            : 'text-yellow-700'
                        }`}>
                          {approvalStatus === 'approved'
                            ? `Approved${approvalDate ? ` on ${approvalDate}` : ''}`
                            : approvalStatus === 'rejected'
                            ? `Rejected${approvalDate ? ` on ${approvalDate}` : ''}`
                            : 'Awaiting review'
                          }
                        </div>
                      </div>
                      <div className={`px-3 py-1 text-xs font-medium rounded-full ${
                        approvalStatus === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : approvalStatus === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {approvalStatus === 'approved'
                          ? 'Approved'
                          : approvalStatus === 'rejected'
                          ? 'Rejected'
                          : 'Pending'
                        }
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
                    {approvalProgress.filter(p => p.status === 'approved').length} of {approvers.length} approved
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(approvalProgress.filter(p => p.status === 'approved').length / approvers.length) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Publish state */}
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
                  All required approvers have reviewed and approved your template. <br></br>
                  You can now publish it to make it available for use. 
                </p>
              </div>

              {/* Final approval summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-900 mb-2">Approved by:</h4>
                <div className="space-y-1">
                  {approvers.map((approver) => (
                    <div key={approver.id} className="flex items-center gap-2 text-sm text-green-700 ">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{approver.name}</span>
                      {getApprovalDate(approver.id) && (
                        <span className="text-green-600">• {getApprovalDate(approver.id)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 bg-slate-50 border-t border-slate-200 px-6 py-4">
          <div className="text-xs text-slate-500">
            {status === "draft" && selectedApprovers.length > 0 && (
              `${selectedApprovers.length} recipient${selectedApprovers.length === 1 ? '' : 's'} selected`
            )}
            {status === "submitted" && (
              `${approvalProgress.filter(p => p.status === 'approved').length}/${approvers.length} approvals complete`
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === "publish" ? "Close" : "Cancel"}
            </button>


            {(status === "draft" || status === "assigned") && (
              <button
                onClick={handleSubmit}
                disabled={
                  (status === "draft" && selectedApprovers.length === 0) || isSubmitting || submitSuccess
                }
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