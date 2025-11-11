/**
 * TemplatesView Component
 * 
 * Displays detailed view of a template with approval workflow management.
 * Allows approvers (Unit/Lead Document Controller, Document Control Officer) to approve, reject, or return templates.
 * Document controllers can assign members and set deadlines.
 * 
 * @component
 */
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import HeaderTemplateView from "../layout/headers/headerTemplateView";
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
import TextEditor from "../layout/create_template/textEditor"; 
import DocumentDetailsCard from "../components/cards/documentDetailsCard";
import Loader from "../components/loader";  
import fetchAndNormalizeTemplate from "../utils/templateLoader";
import { publishTemplateAPI, unpublishTemplateAPI } from "../api/documentContollerAPI";

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
    if (Array.isArray(template?.templatePages) && template.templatePages.length > 0) {
      return template.templatePages;
    }
    const baseDoc = template?.templateContent || template?.pages_json?.[0] || null;
    if (!baseDoc) return [];

    const content = Array.isArray(baseDoc.content) ? baseDoc.content : [];
    const explicitPages = content.filter(n => n.type === 'page');
    if (explicitPages.length > 0) return explicitPages;

    // No explicit page nodes -> treat the whole document as a single page
    return [{ type: 'page', content }];
  }, [template]);

  // Determine if current page is landscape based on pageSetup
  const isLandscape = useMemo(() => {
    if (!template?.pageSetup) return false;
    
    const pageSetup = template.pageSetup;
    
    // Check if orientation is explicitly set
    if (pageSetup.orientation) {
      return pageSetup.orientation.toLowerCase() === 'landscape';
    }
    
    // Otherwise, determine by comparing dimensions
    const width = parseFloat(pageSetup.width) || 0;
    const height = parseFloat(pageSetup.height) || 0;
    
    return width > height;
  }, [template?.pageSetup]);

  const totalPages = pageNodes.length || 0;
  // Clamp currentPage whenever totalPages changes
  useEffect(() => {
    setCurrentPage(p => Math.min(Math.max(0, p), Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const currentPageNode = pageNodes[currentPage] || null;

  // Build a document-shaped content object that contains only the current page.
  const contentForEditor = (() => {
    // If we have normalized templatePages, return the page doc at currentPage
    if (Array.isArray(template?.templatePages) && template.templatePages.length > 0) {
      return template.templatePages[currentPage] || template.templatePages[0] || null;
    }

    // Build a doc containing only the current page node, or fall back to the
    if (currentPageNode) {
      const baseDoc = template?.templateContent || template?.pages_json?.[0] || { type: 'doc', content: [] };
      return { ...baseDoc, content: [currentPageNode] };
    }

    // If there's a top-level templateContent, use it as-is
    if (template?.templateContent) return template.templateContent;

    // Fallback to pages_json[0]
    if (template?.pages_json?.[0]) return template.pages_json[0];

    return null;
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
      const normalized = await fetchAndNormalizeTemplate(templateId);
      console.log("Refreshed template (normalized):", normalized);
      // Merge the normalized top-level fields into the raw template object so
      // downstream code can access both shapes via the same `template` state.
      const raw = normalized.template || {};
      const merged = { ...raw, ...normalized };
      // If templateContent exists on normalized, keep it as-is; avoid overwriting
      // the nested `pages_json` unless it's missing.
      if (normalized.templateContent && !merged.pages_json) merged.pages_json = [normalized.templateContent];
      setTemplate(merged);
      // Optionally set other local state pieces if needed in this view
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

  // Helpers to prevent overriding actions once taken
  const normalizeRoleKeys = (roleName) => {
    const norm = String(roleName || '')
      .toLowerCase()
      .replace(/[_\s]+/g, ' ')
      .trim();
    const key = norm.replace(/\s+/g, '_');
    const variants = new Set([key]);
    if (key.includes('document') && key.includes('officer')) {
      variants.add('document_controller_officer');
      variants.add('document_control_officer');
    }
    return Array.from(variants);
  };

  const getApprovalEntryForUser = (tpl, usr) => {
    const approvals = tpl?.status_meta?.approvals || {};
    const keys = normalizeRoleKeys(usr?.role?.name);
    for (const k of keys) {
      if (approvals && approvals[k]) return approvals[k];
    }
    return null;
  };

  const alreadyActed = (entry) => {
    if (!entry) return false;
    const st = String(entry?.status || '').toLowerCase();
    return Boolean(
      entry?.isApproved || entry?.approved_at ||
      entry?.isRejected || entry?.rejected_at ||
      // Consider 'returned' as an acted state only when the overall
      // template status is actually 'returned'. This allows returns to be
      // used as a feedback loop without permanently blocking actions when
      // the template is in other states like 'pending' or 'endorsed'.
      (String(template?.status || '').toLowerCase() === 'returned' && (entry?.isReturned || entry?.returned_at || st === 'returned')) ||
      st === 'approved' || st === 'rejected' || st === 'endorsed'
    );
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
    // Disallow overriding past actions (approve/endorse once only)
    const myEntry = getApprovalEntryForUser(templateData, user);
    if (alreadyActed(myEntry, templateData?.status)) {
      setError("You've already taken an action on this template and cannot change it.");
      return;
    }
    
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
    // Disallow overriding past actions
    const myEntry = getApprovalEntryForUser(templateData, user);
    if (alreadyActed(myEntry, templateData?.status)) {
      setError("You've already taken an action on this template and cannot change it.");
      return;
    }
    
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
        setError(err?.response?.data?.message || err?.message || "Failed to reject template");
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
    // Disallow overriding past actions
    const myEntry = getApprovalEntryForUser(templateData, user);
    if (alreadyActed(myEntry, templateData?.status)) {
      setError("You've already taken an action on this template and cannot change it.");
      return;
    }
    
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
        setError(err?.response?.data?.message || err?.message || "Failed to return template");
      await refreshTemplate(templateData._id);
      throw err;
    }
  };

  /**
 * Updates document code and effectivity date
 */
const handleUpdateDocumentDetails = async ({ document_code, effectivity_date }) => {
  if (!template?._id) return;
  
  try {
    // TODO: Add API call
    // await updateDocumentDetailsAPI(template._id, { document_code, effectivity_date });
    
    // For demo, update local state
    setTemplate(prev => ({
      ...prev,
      document_code,
      effectivity_date
    }));
    
    // Refresh from server when API is ready
    // await refreshTemplate(template._id);
    setError(null);
  } catch (err) {
    console.error("Failed to update document details:", err);
    setError("Failed to update document details");
    throw err;
  }
};

/**
 * Updates ISO code
 */
const handleUpdateISOCode = async ({ iso_code }) => {
  if (!template?._id) return;
  
  try {
    // TODO: Add API call
    // await updateISOCodeAPI(template._id, { iso_code });
    
    // For demo, update local state
    setTemplate(prev => ({
      ...prev,
      iso_code
    }));
    
    // Refresh from server when API is ready
    // await refreshTemplate(template._id);
    setError(null);
  } catch (err) {
    console.error("Failed to update ISO code:", err);
    setError("Failed to update ISO code");
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

  // Publish handler (DCO-only; button lives in header)
  const handlePublish = async (templateData, payload = {}) => {
    if (!templateData?._id) return;
    try {
      await publishTemplateAPI(templateData._id, payload || {});
      await refreshTemplate(templateData._id);
      setError(null);
    } catch (err) {
      console.error("Publish error:", err);
      const apiMsg = err?.response?.data?.message || err?.message;
      setError(apiMsg || "Failed to publish template");
      throw err;
    }
  };

  // Unpublish handler (DCO-only)
  const handleUnpublish = async (templateData) => {
    if (!templateData?._id) return;
    try {
      await unpublishTemplateAPI(templateData._id);
      await refreshTemplate(templateData._id);
      setError(null);
    } catch (err) {
      console.error("Unpublish error:", err);
      const apiMsg = err?.response?.data?.message || err?.message;
      setError(apiMsg || "Failed to unpublish template");
      throw err;
    }
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

  // Extract owner and assigned members; display should include owner + assigned
  const ownerName = t.createdByName || t.created_by_name || null;
  const assignedNames = Array.isArray(t.assignedNames) ? t.assignedNames : [];
  const assignedDisplay = Array.from(
    new Set([ownerName, ...assignedNames].filter(Boolean))
  );
  
  // Format deadline for display
  const deadline = t.deadline ? formatDateTime(t.deadline) : null;
  
  // Extract notes array
  const notes = Array.isArray(t.notes) ? t.notes : [];

  /**
   * Process approvals data into a consistent array format
   * Handles both object and array structures from API
   */
  let approvalsArr = [];

  // Helper to convert internal role keys to display labels
  const roleKeyToDisplay = (roleLike) => {
    const raw = (typeof roleLike === 'string') ? roleLike : (roleLike?.name || '');
    const key = String(raw).toLowerCase().replace(/[\s]+/g, '_');
    switch (key) {
      case 'unit_document_controller':
        return 'Unit Document Controller';
      case 'lead_document_controller':
        return 'Lead Document Controller';
      case 'document_controller_officer':
        return 'Document Control Officer';
      default:
        return raw || 'Approver';
    }
  };
  
  if (t.approvals && typeof t.approvals === 'object' && !Array.isArray(t.approvals)) {
    const tplStatus = String(t.status || '').toLowerCase();
    approvalsArr = Object.entries(t.approvals).map(([role, appr]) => ({
      role,
      name: appr.assigned_to_name || appr.assigned_to || '',
      isApproved: appr.isApproved || Boolean(appr.approved_at) || appr.status === 'approved',
      isRejected: appr.isRejected || Boolean(appr.rejected_at) || appr.status === 'rejected',
      // Only treat slot as returned when the overall template status is 'returned'
      isReturned: tplStatus === 'returned' ? (appr.isReturned || Boolean(appr.returned_at) || appr.status === 'returned') : false,
    }));
  } else if (Array.isArray(t.approvals)) {
    const tplStatus = String(t.status || '').toLowerCase();
    approvalsArr = t.approvals.map(appr => ({
      ...appr,
      role: appr.role || "Approver",
      name: appr.assigned_to_name || appr.assigned_to || "Unknown",
      isApproved: appr.isApproved || Boolean(appr.approved_at) || appr.status === 'approved',
      isRejected: appr.isRejected || Boolean(appr.rejected_at) || appr.status === 'rejected',
      isReturned: tplStatus === 'returned' ? (appr.isReturned || Boolean(appr.returned_at) || appr.status === 'returned') : false,
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
    // Helper to normalize role-like values to a stable key
    const roleKey = (r) => String((r?.name || r) || '')
      .toLowerCase()
      .replace(/[^a-z]+/g, ' ')
      .trim()
      .replace(/\s+/g, '_');
    const markUDCReturned = () => {
      approvalsArr = approvalsArr.map(approver => {
        const isUdc = roleKey(approver.role) === 'unit_document_controller' || roleKey(approver.role) === 'udc';
        if (isUdc) {
          return {
            ...approver,
            isApproved: false,
            isRejected: false,
            isReturned: true,
            status: 'returned'
          };
        }
        return approver;
      });
    };
    
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
      // Fallback: if no explicit return-type note, assume the latest note is the return action
      if (!actionNote && notes.length > 0) {
        actionNote = [...notes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      }
      // If returned, explicitly mark UDC as returned when we can infer UDC is the actor
      try {
        const udcMetaReturned = Boolean(t.status_meta?.approvals?.unit_document_controller?.isReturned);
        const anyUdcReturnInNotes = notes.some(note => {
          const type = (note.type || '').toLowerCase();
          const message = (note.message || '').toLowerCase();
          const isReturn = type === 'return' || type === 'returned' || message.includes('return');
          if (!isReturn) return false;
          const rk = roleKey(note.role_snapshot || note.role);
          return rk === 'unit_document_controller' || rk === 'udc';
        });
        if (udcMetaReturned || anyUdcReturnInNotes) {
          markUDCReturned();
        }
      } catch (_) {
        // noop - best-effort enrichment only
      }
    }
    
    console.log("Found action note:", actionNote);
    
    if (actionNote) {
      // Update the approver who performed the action
      const actorName = actionNote.added_by_name || actionNote.added_by;
      const actorRole = actionNote.role_snapshot || actionNote.role || '';
      console.log("Actor name from note:", actorName);
      console.log("Current user:", user?.name);
      
      approvalsArr = approvalsArr.map(approver => {
        console.log("Checking approver:", approver.name, "vs actor:", actorName);
        const approverRoleName = (approver.role?.name || approver.role || '').toString();
        const roleMatches = actorRole && roleKey(approverRoleName) === roleKey(actorRole);
        if (approver.name === actorName || roleMatches) {
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
      // If status is returned and still nobody is marked returned, prefer marking UDC as returned (heuristic)
      if (t.status === 'returned' && !approvalsArr.some(a => a.isReturned)) {
        markUDCReturned();
      }
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
      // Additional heuristic for returned status with no actor match
      if (t.status === 'returned' && !approvalsArr.some(a => a.isReturned)) {
        markUDCReturned();
      }
    }
    
    console.log("Final approvals after processing:", approvalsArr);
  }

  // Show loading spinner while template is being fetched
  if (loading && !template) {
    return (
      <div className="min-h-screen bg-gray-200 flex items-center justify-center">
        <Loader message="Loading template..." />
      </div>
    );
  }

  // debugging after getting the template
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
        handlePublish={handlePublish}
        handleUnpublish={handleUnpublish}
        onUpdateDeadline={handleUpdateDeadline}
        onAddInstructions={handleAddInstructions}
      />
      
      <div className={`mx-auto w-full px-4 py-6 md:pl-2 ${isLandscape ? 'max-w-full' : 'max-w-7xl'} min-h-screen`}>
        <div className="p-8 min-h-screen">
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
          
          {/* preview and details - Dynamic layout based on orientation */}
          <div className={`flex ${isLandscape ? 'flex-row gap-6' : 'flex-col lg:flex-row'} gap-6 items-start`}>
            {/* Template preview */}
            <section className={`${
              isLandscape 
                ? 'flex-1 min-w-0' 
                : 'w-full lg:w-8/12'
            }`}>
              {/* Page content */}
              <div className={`w-full ${isLandscape ? 'overflow-x-auto' : ''}`}>
                {contentForEditor && (
                  <TextEditor
                    key={`${template?._id || template?.id || 'tpl'}-${currentPage}`}
                    content={contentForEditor}
                    pageSetup={template?.pageSetup}
                    headerConfig={{
                      ...(template?.headerConfig || template?.logoConfig || {}),
                      documentStamp: {
                        docCode: template?.document_code || template?.documentCode || "",
                          revisionNo: template?.revision_number || template?.revision_no || template?.revisionNo || "",
                          effectivity: template?.effectivity || template?.effectivity_date || "",
                      },
                    }}
                    templateStatus={template?.status}
                    documentCode={template?.document_code || template?.documentCode}
                      revisionNo={template?.revision_number || template?.revision_no || template?.revisionNo}
                      effectivity={template?.effectivity || template?.effectivity_date}
                    className="pointer-events-none opacity-100 w-full"
                    onEditorReady={editor => {
                      try { editor.setEditable(false); } catch {}
                    }}
                  />
                )}
              </div>
            </section>

            {/* Template details and metadata */}
            <aside className={`${
              isLandscape 
                ? 'w-80 flex-shrink-0' 
                : 'w-full lg:w-4/12'
            } self-start sticky top-20`}>
              <div className="space-y-4">
                {/* Template Status Panel */}
                <div className="bg-white border rounded-md shadow-sm">
                  <div className="p-5">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold tracking-widest text-gray-900 uppercase font-sans mb-1">
                        Template Status
                      </h3>
                      <div className="w-16 h-0.5 bg-yellow-400 mb-3 rounded" />
                      <div className="text-base text-gray-900 font-sans">
                        {t.status === 'assigned' && (
                          <>Document controllers are still working on the template.</>
                        )}
                        {t.status === 'approved' && (
                          <>Template has been fully approved and is ready for publishing by the document control officer.</>
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
                        {t.status === 'pending' && (
                          <>Template is awaiting your endorsement.</>
                        )}
                        {/* Show when LDC has approved but DCO hasn't yet (derived from status_meta) */}
                        {(() => {
                          const approvals = t.status_meta?.approvals || {};
                          const ldc = approvals?.lead_document_controller || {};
                          const dco = approvals?.document_controller_officer || {};
                          const udc = approvals?.unit_document_controller || {};
                          const ldcApproved = ldc?.isApproved === true || Boolean(ldc?.approved_at);
                          const dcoApproved = dco?.isApproved === true || Boolean(dco?.approved_at);
                          const udcApproved = udc?.isApproved === true || Boolean(udc?.approved_at);
                          // Only show this interim message when the template isn't in a terminal/final state
                          const isFinal = ['approved', 'published', 'rejected', 'returned'].includes(String(t.status || '').toLowerCase());
                          if (ldcApproved && !dcoApproved && !isFinal) {
                            return (
                              <>Template has been approved by the Lead Document Controller and is awaiting Document Control  Officer approval.</>
                            );
                          }else if (!udcApproved && (t.status === 'endorsed' || t.status === 'assigned') && !isFinal)   {
                            return (
                              <>Template is awaiting for approval from the School Officials.</>
                            );
                          }
                          else if (!ldcApproved && (t.status === 'endorsed' && !isFinal))   {
                            return (
                              <>Template has been endorsed and is awaiting for approvals.</>
                            );
                          }
                          return null;
                        })()}
                
                      </div>
                    </div>
                  </div>
                </div>

                {/* DocumentDetailsCard - show only when status is approved or published; hide edit pencil for now */}
                {template && (template.status === 'approved' || template.status === 'published') && (
                  <DocumentDetailsCard 
                    template={template}
                    onUpdateDocumentDetails={handleUpdateDocumentDetails}
                    onUpdateISOCode={handleUpdateISOCode}
                    canEdit={false}
                  />
                )}
                
                {/* Details Panel */}
                <div className="bg-white border rounded-md shadow-sm">
                  <div className="p-5">
                    {/* Deadline Section (hidden for now)
                    <div className="mb-4">
                      <h3 className="text-base font-semibold tracking-widest text-gray-900 uppercase font-sans mb-1">
                        Deadline
                      </h3>
                      <div className="text-base text-gray-900">{deadline || "No deadline set"}</div>
                    </div>
                    */}
                    
                    {/* Assigned Members Section (Owner + Assigned) */}
                    <h3 className="text-base font-semibold tracking-widest text-gray-900 uppercase font-sans mb-1">
                      Submitted By: 
                    </h3>
                    
                    <ul className="mb-6">
                      {assignedDisplay.length > 0 ? (
                        assignedDisplay.map((name, idx) => (
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
                        (() => {
                          // Determine if we should hide the UDC row when both UDC and LDC are still pending
                          const normKey = (r) => String((r?.name || r) || '')
                            .toLowerCase()
                            .replace(/\s+/g, '_');
                          const isPending = (a) => !a.isApproved && !a.isRejected && !a.isReturned;
                          const udc = approvalsArr.find(a => normKey(a.role) === 'unit_document_controller');
                          const ldc = approvalsArr.find(a => normKey(a.role) === 'lead_document_controller');
                          const dco = approvalsArr.find(a => normKey(a.role) === 'document_controller_officer');
                          // UDC visibility rule:
                          // - Show UDC when status is 'pending'
                          // - Show UDC when status is 'returned' for Department Head submissions (heuristic: UDC slot exists)
                          // - Otherwise (including 'endorsed'), only show if UDC has approved
                          const statusKey = String(t?.status || '').toLowerCase();
                          const shouldShowUDC =
                            statusKey === 'pending' ||
                            Boolean(udc && udc.isApproved) ||
                            (statusKey === 'returned' && Boolean(udc));
                          const hideUDC = !shouldShowUDC;

                          return approvalsArr.map((approver, idx) => {
                          let statusBadge;
                          const approverRoleName = (approver.role?.name || approver.role || '').toString();
                          const approverRoleKey = normKey(approver.role);
                          const isUDC = approverRoleKey === 'unit_document_controller';

                          // Hide UDC in the list when both UDC and LDC are pending (per request)
                          if (hideUDC && isUDC ) return null;
                          if (approver.isRejected) {
                            statusBadge = (
                              <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium">
                                Rejected
                              </span>
                            );
                          } else if (approver.isReturned) {
                            statusBadge = (
                              <span className="ml-2 px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-xs font-medium">
                                {isUDC ? 'Returned by UDC' : 'Returned'}
                              </span>
                            );
                          } else if (approver.isApproved) {
                            statusBadge = (
                              <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-medium">
                                {isUDC ? 'Endorsed' : 'Approved'}
                              </span>
                            );
                          } else {
                            statusBadge = (
                              <span className="ml-2 px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 text-xs font-medium">
                                {isUDC ? 'Pending Endorsement' : 'Pending'}
                              </span>
                            );
                          }

                          return (
                            <li key={idx} className="flex mb-2 text-sm">
                              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2 mt-2 flex-shrink-0" aria-hidden="true"></span>
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-800 flex items-center flex-wrap">
                                  {(approver.name && String(approver.name).trim()) ? approver.name : 'To Be Reviewed'} ({roleKeyToDisplay(approver.role)})
                                  {statusBadge}
                                </span>
                              </div>
                            </li>
                          );
                          });
                        })()
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
              </div>
            </aside>
          </div>
        </div>
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
            await refreshTemplate(template._id);
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