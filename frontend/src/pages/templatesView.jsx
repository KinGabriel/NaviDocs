import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HeaderTemplateView from "../components/headerTemplateView";
import useUser from "../hooks/useUser";
import {
  getTemplateByIdAPI,
  approveTemplateAPI,
  rejectTemplateAPI,
  returnTemplateAPI,
  assignControllersToTemplateAPI,
} from "../api/documentContollerAPI";
import { formatDateTime } from "../utils/formatters";
import AssignMembersModal from "../components/modals/assignMembersModal";

export default function TemplatesView() {
  const user = useUser();
  const navigate = useNavigate();
  const { id } = useParams();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Assign modal state
  const [assignOpen, setAssignOpen] = useState(false);
  const [faculty, setFaculty] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // reload template from API
  const refreshTemplate = async (templateId = id) => {
    if (!templateId) return;
    try {
      const res = await getTemplateByIdAPI(templateId);
      const updatedTemplate = res.template || res.data || res;
      setTemplate(updatedTemplate);
      setError(null);
    } catch (err) {
      console.error("Failed to refresh template:", err);
      setError("Failed to fetch template");
    }
  };
  // Initial load
  useEffect(() => {
    if (!id) return;
    const loadTemplate = async () => {
      setLoading(true);
      await refreshTemplate(id);
      setLoading(false);
    };
    loadTemplate();
  }, [id]);

  const handleAssign = async () => {
    if (!template) return;
    const assigned = Array.isArray(template.assigned) ? template.assigned : [];
    setSelectedIds(assigned);
    setAssignOpen(true);
  };

  // approve/reject/return with refresh after API
  const handleApprove = async (templateData, message) => {
    if (!templateData || !user) return;
    try {
      await approveTemplateAPI(templateData._id, { note: message || "" });
      await refreshTemplate(templateData._id);
    } catch (err) {
      console.error("Approve error:", err);
      setError("Failed to approve template");
    }
  };

  const handleReject = async (templateData, message) => {
    if (!templateData || !user) return;
    if (!message?.trim()) {
      setError("Please provide a reason for rejection.");
      return;
    }
    try {
      await rejectTemplateAPI(templateData._id, message);
      await refreshTemplate(templateData._id);
    } catch (err) {
      console.error("Reject error:", err);
      setError("Failed to reject template");
    }
  };

  const handleReturn = async (templateData, message) => {
    if (!templateData || !user) return;
    if (!message?.trim()) {
      setError("Please provide a reason for returning.");
      return;
    }
    try {
      await returnTemplateAPI(templateData._id, message);
      await refreshTemplate(templateData._id);
    } catch (err) {
      console.error("Return error:", err);
      setError("Failed to return template");
    }
  };

  // handler to refresh template after updating deadline
  const handleUpdateDeadline = async () => refreshTemplate(id);
  // handler to refresh template after adding instructions
  const handleAddInstructions = async () => refreshTemplate(id);
  // assign handler that refreshes state
  const handleAssignMembers = async ({ assignees }) => {
    if (!template?._id) return;
    setAssignSubmitting(true);
    try {
      await assignControllersToTemplateAPI(template._id, assignees);
      await refreshTemplate(template._id);
      setAssignOpen(false);
      setSelectedIds([]);
    } catch (e) {
      console.error("Assign error:", e);
      setError("Failed to assign members.");
    } finally {
      setAssignSubmitting(false);
    }
  };

  const t = template || { status: "loading" };
  const assignedNames = t.assignedNames || [];
  const deadline = t.deadline ? formatDateTime(t.deadline) : null;

  const notes = Array.isArray(t.notes) ? t.notes : [];

  // approvals array
  let approvalsArr = [];
  if (t.approvals && typeof t.approvals === "object" && !Array.isArray(t.approvals)) {
    approvalsArr = Object.entries(t.approvals).map(([role, appr]) => ({
      role,
      name: appr.assigned_to_name || appr.assigned_to || "",
      isApproved: appr.isApproved || Boolean(appr.approved_at) || appr.status === "approved",
      isRejected: appr.isRejected || Boolean(appr.rejected_at) || appr.status === "rejected",
      isReturned: appr.isReturned || Boolean(appr.returned_at) || appr.status === "returned",
    }));
  } else if (Array.isArray(t.approvals)) {
    approvalsArr = t.approvals.map((appr) => ({
      ...appr,
      role: appr.role || "Approver",
      name: appr.assigned_to_name || appr.assigned_to || "Unknown",
      isApproved: appr.isApproved || Boolean(appr.approved_at) || appr.status === "approved",
      isRejected: appr.isRejected || Boolean(appr.rejected_at) || appr.status === "rejected",
      isReturned: appr.isReturned || Boolean(appr.returned_at) || appr.status === "returned",
    }));
  }

  // approvals with latest rejection/return notes
  if ((t.status === "rejected" || t.status === "returned") && approvalsArr.length > 0) {
    const actionNote = notes
      .filter((note) => {
        const type = note.type?.toLowerCase() || "";
        const msg = note.message?.toLowerCase() || "";
        return t.status === "rejected"
          ? type === "rejection" || msg.includes("reject")
          : type === "return" || type === "returned" || msg.includes("return");
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (actionNote) {
      const actorName = actionNote.added_by_name || actionNote.added_by;
      approvalsArr = approvalsArr.map((approver) =>
        approver.name === actorName
          ? {
              ...approver,
              isApproved: false,
              isRejected: t.status === "rejected",
              isReturned: t.status === "returned",
            }
          : approver
      );
    }
  }

  if (loading && !template) {
    return (
      <div className="min-h-screen bg-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <HeaderTemplateView
        template={t}
        user={user}
        setTemplate={setTemplate}
        handleAssign={handleAssign}
        handleApprove={handleApprove}
        handleReject={handleReject}
        handleReturn={handleReturn}
        onUpdateDeadline={handleUpdateDeadline}
        onAddInstructions={handleAddInstructions}
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:pl-2">
        <main className="p-8 flex-1 overflow-y-auto">
          {/* display error message*/}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex justify-between items-center">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-12 gap-6">
            {/* Template preview */}
            <section className="col-span-12 lg:col-span-8">
              <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 p-6">
                  <div className="mx-auto bg-white shadow border rounded-md w-full" style={{ minHeight: 900 }}>
                    {/* Replace with <iframe src={...}/> or <img/> once available */}
                    <div className="h-full w-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <div className="text-lg font-medium mb-1">Template Preview</div>
                        <div className="text-sm">This is a placeholder surface for the PDF/image.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Details */}
            <aside className="col-span-12 lg:col-span-4">
              {/* Template Status Panel */}
              <div className="bg-white border rounded-md shadow-sm mb-4">
                <div className="p-5">
                  <h3 className="text-base font-semibold uppercase mb-2">Template Status</h3>
                  <div className="text-base text-gray-900 font-sans">
                    {t.status === "assigned" && <>Document controllers are still working on the template.</>}
                    {t.status === "pending" && <>Template is awaiting approval from assigned approvers.</>}
                    {t.status === "approved" && <>Template has been fully approved and is ready for publishing.</>}
                    {t.status === "published" && <>Template is published and available for use.</>}
                    {t.status === "rejected" && <>Template was rejected.</>}
                    {t.status === "returned" && <>Template was returned for changes.</>}
                  </div>
                </div>
              </div>

              {/* Deadline, Members, Approvers, Notes */}
              <div className="bg-white border rounded-md shadow-sm">
                <div className="p-5">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold uppercase mb-1">Deadline</h3>
                    <div className="text-base text-gray-900">{deadline || "No deadline set"}</div>
                  </div>

                  <h3 className="text-base font-semibold uppercase mb-1">Assigned Members</h3>
                  <ul className="mb-6">
                    {assignedNames.length > 0
                      ? assignedNames.map((name, idx) => (
                          <li key={idx} className="text-sm text-gray-800 mb-1 flex items-center">
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            {name}
                          </li>
                        ))
                      : <li className="text-sm text-gray-400">No members assigned.</li>}
                  </ul>

                  <h3 className="text-base font-semibold uppercase mb-1">To be approved by</h3>
                  <ul className="mb-6">
                    {approvalsArr.length > 0
                      ? approvalsArr.map((approver, idx) => {
                          let statusBadge;
                          if (approver.isRejected)
                            statusBadge = <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium">Rejected</span>;
                          else if (approver.isReturned)
                            statusBadge = <span className="ml-2 px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-xs font-medium">Returned</span>;
                          else if (approver.isApproved)
                            statusBadge = <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">Approved</span>;
                          else
                            statusBadge = <span className="ml-2 px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-medium">Pending</span>;

                          return (
                            <li key={idx} className="flex mb-2 text-sm">
                              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-800 flex items-center">
                                  {approver.name} ({approver.role})
                                  {statusBadge}
                                </span>
                              </div>
                            </li>
                          );
                        })
                      : <li className="text-sm text-gray-400">No approvers assigned.</li>}
                  </ul>

                  <h3 className="text-base font-bold uppercase mb-1">Notes</h3>
                  <div className="w-16 h-0.5 bg-yellow-400 mb-3 rounded" />
                  <ul>
                    {notes.length > 0
                      ? notes.map((note, idx) => (
                          <li key={idx} className="mb-3">
                            <div className="text-xs text-gray-500 mb-1 font-sans">
                              {note.added_by_name || note.added_by || ""} &middot; {formatDateTime(note.created_at)}
                            </div>
                            <div className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">
                              {note.type || "Note"}
                            </div>
                            <div className="text-base text-gray-800 font-sans">{note.message}</div>
                          </li>
                        ))
                      : <li className="text-base text-gray-400 font-sans">No notes available.</li>}
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
      {/* Assign Members Modal */}
      <AssignMembersModal
        open={assignOpen}
        onClose={() => {
          setAssignOpen(false);
          setSelectedIds([]);
        }}
        template={t}
        faculty={faculty}
        facultyLoading={facultyLoading}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        submitting={assignSubmitting}
        onAssign={handleAssignMembers}
      />
    </div>
  );
}
