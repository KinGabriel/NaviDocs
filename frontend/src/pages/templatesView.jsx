/**
 * TemplatesView Component
 * 
 * Displays detailed view of a template with approval workflow management.
 * Allows approvers (Dean/Secretary) to approve, reject, or return templates.
 * Document controllers can assign members and set deadlines.
 * 
 * @component
 */
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HeaderTemplateView from "../components/headerTemplateView";
import useUser from "../hooks/useUser";
import { 
  getTemplateByIdAPI,
  approveTemplateAPI, 
  rejectTemplateAPI, 
  returnTemplateAPI, 
  assignControllersToTemplateAPI 
} from "../api/documentContollerAPI";
import { formatDateTime } from "../utils/formatters";
import AssignMembersModal from "../components/modals/assignMembersModal";
import TextEditor from "../layout/create_template/textEditor"; 

export default function TemplatesView() {
  // Hooks
  const user = useUser(); // Current logged-in user
  const navigate = useNavigate();
  const { id } = useParams(); // Template ID from URL
  
  // Template state
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Page control state
  // Find all page nodes in pages_json[0].content
  const [currentPage, setCurrentPage] = useState(0);
  const pageNodes = useMemo(() => {
    if (!template?.pages_json?.[0]?.content) return [];
    return template.pages_json[0].content.filter(n => n.type === "page");
  }, [template]);
  const totalPages = pageNodes.length;
  const currentPageNode = pageNodes[currentPage] || null;

  // Build a document-shaped content object that contains only the current page.
  // The create-template page passes the full pages_json[0] (a doc), so matching that
  // shape helps the editor render consistently.
  const contentForEditor = (() => {
    if (!currentPageNode) return null;
    const baseDoc = template?.pages_json?.[0] || { type: 'doc', content: [] };
    // clone baseDoc but replace content with just the current page node
    return { ...baseDoc, content: [currentPageNode] };
  })();

  // Assign modal state
  const [assignOpen, setAssignOpen] = useState(false);
  const [faculty, setFaculty] = useState([]);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  /**
   * Fetches and updates template data from the API
   * Handles different response structures (res.template, res.data, or direct response)
   * 
   * @param {string} templateId - The ID of the template to fetch (defaults to id from URL params)
   */
  const refreshTemplate = async (templateId = id) => {
    if (!templateId) return;
    
    try {
      const res = await getTemplateByIdAPI(templateId);
      console.log("Refreshed template:", res);
      
      // Handle different API response structures
      let updatedTemplate;
      if (res.template) {
        updatedTemplate = res.template;
      } else if (res.data) {
        updatedTemplate = res.data;
      } else {
        updatedTemplate = res;
      }
      
      setTemplate(updatedTemplate);
      console.log("Template updated:", updatedTemplate);
    } catch (err) {
      console.error("Failed to refresh template:", err);
      setError("Failed to fetch template");
    }
  };

  /**
   * Initial template load effect
   * Runs once when component mounts or when template ID changes
   */
  useEffect(() => {
    if (!id) return;
    
    const loadTemplate = async () => {
      setLoading(true);
      await refreshTemplate(id);
      setLoading(false);
    };
    
    loadTemplate();
  }, [id]);

  /**
   * Opens the assign members modal
   * Pre-selects currently assigned members
   */
  const handleAssign = async () => {
    if (!template) return;
    
    // Preselect currently assigned member IDs
    const assigned = Array.isArray(template.assigned) ? template.assigned : [];
    setSelectedIds(assigned);
    setAssignOpen(true);
  };

  /**
   * Approves a template
   * Updates local state optimistically, then syncs with server
   * 
   * @param {Object} templateData - The template object to approve
   * @param {string} message - Optional approval note/comment
   * @throws {Error} If approval fails
   */
  const handleApprove = async (templateData, message) => {
    if (!templateData || !user) return;
    
    // Optimistic update: immediately update local state
    setTemplate(prev => {
      if (!prev) return prev;
      
      const updated = { ...prev, status: "approved" };
      
      // Update approvals array if it exists
      if (Array.isArray(updated.approvals)) {
        updated.approvals = updated.approvals.map(approval => {
          // Match by role or user ID
          if (approval.role?.toLowerCase() === user?.role?.name?.toLowerCase() ||
              approval.assigned_to === user?._id) {
            return {
              ...approval,
              status: "approved",
              isApproved: true,
              isRejected: false,
              isReturned: false,
              approved_at: new Date().toISOString(),
              approved_by: user?._id,
              approved_by_name: user?.name
            };
          }
          return approval;
        });
      }
      
      // Update status_meta.approvals if it exists
      if (updated.status_meta?.approvals) {
        const userRole = user?.role?.name?.toLowerCase();
        if (updated.status_meta.approvals[userRole]) {
          updated.status_meta.approvals[userRole] = {
            ...updated.status_meta.approvals[userRole],
            isApproved: true,
            isRejected: false,
            isReturned: false,
            status: "approved"
          };
        }
      }
      
      return updated;
    });
    
    try {
      // Send approval to server
      const payload = { note: message || "" };
      const res = await approveTemplateAPI(templateData._id, payload);
      console.log("Approve response:", res);
      
      // Refresh from server to get authoritative state
      await refreshTemplate(templateData._id);
      setError(null);
    } catch (err) {
      console.error("Approve error:", err);
      setError("Failed to approve template");
      // Refresh to revert optimistic update
      await refreshTemplate(templateData._id);
      throw err;
    }
  };

  /**
   * Rejects a template
   * Requires a rejection reason
   * 
   * @param {Object} templateData - The template object to reject
   * @param {string} message - Required rejection reason
   * @throws {Error} If rejection reason is not provided or if rejection fails
   */
  const handleReject = async (templateData, message) => {
    if (!templateData || !user) return;
    
    // Validate rejection reason
    if (!message || !message.trim()) {
      setError("Please provide a reason for rejection.");
      throw new Error("Please provide a reason for rejection.");
    }
    
    // Optimistic update
    setTemplate(prev => {
      if (!prev) return prev;
      
      const updated = { ...prev, status: "rejected" };
      
      // Update approvals array
      if (Array.isArray(updated.approvals)) {
        updated.approvals = updated.approvals.map(approval => {
          if (approval.role?.toLowerCase() === user?.role?.name?.toLowerCase() ||
              approval.assigned_to === user?._id) {
            return {
              ...approval,
              status: "rejected",
              isApproved: false,
              isRejected: true,
              isReturned: false,
              rejected_at: new Date().toISOString(),
              rejected_by: user?._id,
              rejected_by_name: user?.name,
              rejection_reason: message
            };
          }
          return approval;
        });
      }
      
      // Update status_meta
      if (updated.status_meta?.approvals) {
        const userRole = user?.role?.name?.toLowerCase();
        if (updated.status_meta.approvals[userRole]) {
          updated.status_meta.approvals[userRole] = {
            ...updated.status_meta.approvals[userRole],
            isApproved: false,
            isRejected: true,
            isReturned: false,
            status: "rejected"
          };
        }
      }
      
      return updated;
    });
    
    try {
      const res = await rejectTemplateAPI(templateData._id, message);
      console.log("Reject response:", res);
      
      await refreshTemplate(templateData._id);
      setError(null);
    } catch (err) {
      console.error("Reject error:", err);
      setError("Failed to reject template");
      await refreshTemplate(templateData._id);
      throw err;
    }
  };

  /**
   * Returns a template for revisions
   * Requires a reason for returning
   * 
   * @param {Object} templateData - The template object to return
   * @param {string} message - Required reason for returning the template
   * @throws {Error} If return reason is not provided or if operation fails
   */
  const handleReturn = async (templateData, message) => {
    if (!templateData || !user) return;
    
    // Validate return reason
    if (!message || !message.trim()) {
      setError("Please provide a reason for returning the template.");
      throw new Error("Please provide a reason for returning the template.");
    }
    
    // Optimistic update
    setTemplate(prev => {
      if (!prev) return prev;
      
      const updated = { ...prev, status: "returned" };
      
      // Update approvals array
      if (Array.isArray(updated.approvals)) {
        updated.approvals = updated.approvals.map(approval => {
          if (approval.role?.toLowerCase() === user?.role?.name?.toLowerCase() ||
              approval.assigned_to === user?._id) {
            return {
              ...approval,
              status: "returned",
              isApproved: false,
              isRejected: false,
              isReturned: true,
              returned_at: new Date().toISOString(),
              returned_by: user?._id,
              returned_by_name: user?.name,
              return_reason: message
            };
          }
          return approval;
        });
      }
      
      // Update status_meta
      if (updated.status_meta?.approvals) {
        const userRole = user?.role?.name?.toLowerCase();
        if (updated.status_meta.approvals[userRole]) {
          updated.status_meta.approvals[userRole] = {
            ...updated.status_meta.approvals[userRole],
            isApproved: false,
            isRejected: false,
            isReturned: true,
            status: "returned"
          };
        }
      }
      
      return updated;
    });
    
    try {
      const res = await returnTemplateAPI(templateData._id, message);
      console.log("Return response:", res);
      
      await refreshTemplate(templateData._id);
      setError(null);
    } catch (err) {
      console.error("Return error:", err);
      setError("Failed to return template");
      await refreshTemplate(templateData._id);
      throw err;
    }
  };

  /**
   * Refreshes template data after deadline update
   */
  const handleUpdateDeadline = async () => {
    await refreshTemplate(id);
  };

  /**
   * Refreshes template data after adding instructions
   */
  const handleAddInstructions = async () => {
    await refreshTemplate(id);
  };

  /**
   * Assigns document controllers to the template
   * 
   * @param {Object} params - Assignment parameters
   * @param {Array<string>} params.assignees - Array of user IDs to assign
   */
  const handleAssignMembers = async ({ assignees }) => {
    if (!template?._id) return;
    
    setAssignSubmitting(true);
    try {
      await assignControllersToTemplateAPI(template._id, assignees);
      
      // Refresh template to get updated assigned members
      await refreshTemplate(template._id);
      
      // Close modal and reset state
      setAssignOpen(false);
      setSelectedIds([]);
      setError(null);
    } catch (e) {
      console.error("Assign error:", e);
      setError("Failed to assign members.");
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Use template data or fallback to placeholder for loading state
  const t = template || { status: 'loading' };

  // Extract assigned members names
  const assignedNames = t.assignedNames || [];
  
  // Format deadline for display
  const deadline = t.deadline ? formatDateTime(t.deadline) : null;
  
  // Extract notes array
  const notes = Array.isArray(t.notes) ? t.notes : [];

  /**
   * Process approvals data into a consistent array format
   * Handles both object and array structures from API

   */
 let approvalsArr = [];
  
  if (t.approvals && typeof t.approvals === 'object' && !Array.isArray(t.approvals)) {
    approvalsArr = Object.entries(t.approvals).map(([role, appr]) => ({
      role,
      name: appr.assigned_to_name || appr.assigned_to || '',
      isApproved: appr.isApproved || Boolean(appr.approved_at) || appr.status === 'approved',
      isRejected: appr.isRejected || Boolean(appr.rejected_at) || appr.status === 'rejected',
      isReturned: appr.isReturned || Boolean(appr.returned_at) || appr.status === 'returned',
    }));
  } else if (Array.isArray(t.approvals)) {
    approvalsArr = t.approvals.map(appr => ({
      ...appr,
      role: appr.role || "Approver",
      name: appr.assigned_to_name || appr.assigned_to || "Unknown",
      isApproved: appr.isApproved || Boolean(appr.approved_at) || appr.status === 'approved',
      isRejected: appr.isRejected || Boolean(appr.rejected_at) || appr.status === 'rejected',
      isReturned: appr.isReturned || Boolean(appr.returned_at) || appr.status === 'returned',
    }));
  }

  /**
   * Sync approval statuses with template status
   * If template is rejected/returned but individual approvals don't reflect it,
   * update based on notes to identify who performed the action
   */
  if ((t.status === 'rejected' || t.status === 'returned') && approvalsArr.length > 0) {
    console.log("Template status:", t.status);
    console.log("Notes array:", notes);
    console.log("Initial approvals:", approvalsArr);
    
    let actionNote;
    
    // Find the most recent rejection or return note
    if (t.status === 'rejected') {
      actionNote = notes
        .filter(note => {
          const type = note.type?.toLowerCase() || '';
          const message = note.message?.toLowerCase() || '';
          return type === 'rejection' || message.includes('reject');
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    } else if (t.status === 'returned') {
      actionNote = notes
        .filter(note => {
          const type = note.type?.toLowerCase() || '';
          const message = note.message?.toLowerCase() || '';
          return type === 'return' || type === 'returned' || message.includes('return');
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    }
    
    console.log("Found action note:", actionNote);
    
    if (actionNote) {
      // Update the approver who performed the action
      const actorName = actionNote.added_by_name || actionNote.added_by;
      console.log("Actor name from note:", actorName);
      console.log("Current user:", user?.name);
      
      approvalsArr = approvalsArr.map(approver => {
        console.log("Checking approver:", approver.name, "vs actor:", actorName);
        if (approver.name === actorName) {
          console.log("Updating approver:", approver.name, "to status:", t.status);
          return {
            ...approver,
            isApproved: false,
            isRejected: t.status === 'rejected',
            isReturned: t.status === 'returned'
          };
        }
        return approver;
      });
    } else {
      // Fallback: if no matching note found, try matching by current user's role
      console.log("No action note found, trying fallback with current user");
      if (user) {
        approvalsArr = approvalsArr.map(approver => {
          if (approver.role?.toLowerCase() === user.role?.name?.toLowerCase()) {
            console.log("Fallback: updating approver by role:", approver.name);
            return {
              ...approver,
              isApproved: false,
              isRejected: t.status === 'rejected',
              isReturned: t.status === 'returned'
            };
          }
          return approver;
        });
      }
    }
    
    console.log("Final approvals after processing:", approvalsArr);
  }

  // Show loading spinner while template is being fetched
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

  // Add right after getting the template
console.log("Raw approvals data:", t.approvals);
console.log("Page setup data:", template?.pageSetup);
  // Main render
  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      {/* Header with action buttons */}
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
          {/* Error message banner */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex justify-between items-center">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                  aria-label="Dismiss error"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {/* Two-column layout: preview and details */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left column: Template preview */}
            <section className="col-span-12 lg:col-span-8  ">
                    {/* Page Controls */}
                    <div className="flex items-center justify-between ">
                      <button
                        className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage + 1} of {totalPages}
                      </span>
                      <button
                        className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage === totalPages - 1}
                      >
                        Next
                      </button>
                    </div>
                    {/* Document Plate with header/footer placeholders */}
                    
                     
                      {/* Page content */}
                      <div className="flex-1 w-full">
                        {contentForEditor && (
                          <TextEditor
                            content={contentForEditor}
                            pageSetup={template?.pageSetup}
                            className="pointer-events-none opacity-100 w-full"
                            onEditorReady={editor => {
                              // Disable editing
                              editor.setEditable(false);
                            }}
                          />
                        )}
                    </div>
            </section>

            {/* Right column: Template details and metadata */}
            <aside className="col-span-12 lg:col-span-4">
              {/* Template Status Panel */}
              <div className="bg-white border rounded-md shadow-sm mb-4">
                <div className="p-5">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold tracking-widest text-gray-900 uppercase font-sans mb-1">
                      Template Status
                    </h3>
                    <div className="w-16 h-0.5 bg-yellow-400 mb-3 rounded" />
                    <div className="text-base text-gray-900 font-sans">
                      {/* Status-specific messages */}
                      {t.status === 'assigned' && (
                        <>Document controllers are still working on the template.</>
                      )}
                      {t.status === 'pending' && (
                        ((user?.role?.name === "Dean" && t.status_meta?.approvals?.secretary?.isApproved !== false) ||
                         (user?.role?.name === "Secretary" && t.status_meta?.approvals?.secretary?.isApproved !== true)) ? (
                          <>Template is awaiting your approval.</>
                        ) : (
                          <>Template is awaiting approval from assigned approvers.</>
                        )
                      )}
                      {t.status === 'approved' && (
                        <>Template has been fully approved and is ready for publishing by the document controller.</>
                      )}
                      {t.status === 'published' && (
                        <>Template is published and available for use.</>
                      )}
                      {t.status === 'rejected' && (
                        <>Template was rejected.</>
                      )}
                      {t.status === 'returned' && (
                        <>Template was returned for changes.</>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Details Panel */}
              <div className="bg-white border rounded-md shadow-sm">
                <div className="p-5">
                  {/* Deadline Section */}
                  <div className="mb-4">
                    <h3 className="text-base font-semibold tracking-widest text-gray-900 uppercase font-sans mb-1">
                      Deadline
                    </h3>
                    <div className="text-base text-gray-900">{deadline || "No deadline set"}</div>
                  </div>
                  
                  {/* Assigned Members Section */}
                  <h3 className="text-base font-semibold tracking-widest text-gray-900 uppercase font-sans mb-1">
                    Assigned Members
                  </h3>
                  
                  <ul className="mb-6">
                    {assignedNames.length > 0 ? (
                      assignedNames.map((name, idx) => (
                        <li key={idx} className="text-sm text-gray-800 mb-1 flex items-center">
                          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2" aria-hidden="true"></span>
                          {name}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-gray-400">No members assigned.</li>
                    )}
                  </ul>
                  
                  {/* Approvers Section */}
                  <h3 className="text-base font-semibold tracking-widest text-gray-900 uppercase font-sans mb-1">
                    To be approved by
                  </h3>
                  
                  <ul className="mb-6">
                    {approvalsArr.length > 0 ? (
                      approvalsArr.map((approver, idx) => {
                        // Determine status badge color and text
                        let statusBadge;
                        if (approver.isRejected) {
                          statusBadge = (
                            <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium">
                              Rejected
                            </span>
                          );
                        } else if (approver.isReturned) {
                          statusBadge = (
                            <span className="ml-2 px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-xs font-medium">
                              Returned
                            </span>
                          );
                        } else if (approver.isApproved) {
                          statusBadge = (
                            <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">
                              Approved
                            </span>
                          );
                        } else {
                          statusBadge = (
                            <span className="ml-2 px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-medium">
                              Pending
                            </span>
                          );
                        }

                        return (
                          <li key={idx} className="flex mb-2 text-sm">
                            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 mt-2 flex-shrink-0" aria-hidden="true"></span>
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800 flex items-center">
                                {approver.name} ({approver.role})
                                {statusBadge}
                              </span>
                            </div>
                          </li>
                        );
                      })
                    ) : (
                      <li className="text-sm text-gray-400">No approvers assigned.</li>
                    )}
                  </ul>
                  
                  {/* Notes Section */}
                  <h3 className="text-base font-bold tracking-widest text-gray-900 uppercase font-sans">
                    Notes
                  </h3>
                  <div className="w-16 h-0.5 bg-yellow-400 mb-3 rounded" />
                  <ul>
                    {notes.length > 0 ? (
                      notes.map((note, idx) => (
                        <li key={idx} className="mb-3">
                          {/* Note metadata */}
                          <div className="text-xs text-gray-500 mb-1 font-sans">
                            {note.added_by_name || note.added_by || ''} &middot; {formatDateTime(note.created_at)}
                          </div>
                          {/* Note type */}
                          <div className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">
                            {note.type || 'Note'}
                          </div>
                          {/* Note message */}
                          <div className="text-base text-gray-800 font-sans">{note.message}</div>
                        </li>
                      ))
                    ) : (
                      <li className="text-base text-gray-400 font-sans">No notes available.</li>
                    )}
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
        onAssign={async ({ assignees }) => {
          if (!template?._id) return;
          
          setAssignSubmitting(true);
          try {
            await assignControllersToTemplateAPI(template._id, assignees);
            const refreshed = await getTemplateByIdAPI(template._id);
            setTemplate(refreshed.template || refreshed.data || refreshed);
            setAssignOpen(false);
            setSelectedIds([]);
          } catch (e) {
            console.error(e);
            setError("Failed to assign members.");
          } finally {
            setAssignSubmitting(false);
          }
        }}
      />
    </div>
  );
}