import axios from "axios";
const rawUrls = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_URLS = rawUrls.split(",");

const API_URL =
  API_URLS.find(url => url.includes(window.location.hostname)) || API_URLS[0];  


/**
 * Fetches dashboard statistics and published templates for the document controller dashboard.
 * Queries the GraphQL API for published, pending, and approved document counts, and published template details including creator info.
 * @returns {Promise<Object>} Dashboard info: { countPublished, countPendingApproval, countApproved, getPublishedTemplates: Array<{id, title, document_code, revision_no, effectivity, created_by, created_by_user: {firstname, lastname}}>} 
 * @throws {Error} When the HTTP request or GraphQL query fails.
 */
// Accept user as a parameter (from useUser hook)
export const fetchDashboardInfoAPI = async (user) => {
  // Extract school from user object
  let school = null;
  if (user) {
    school = user?.role?.school || user?.school || null;
  }
  const query = `
    query {
      templateDashboard {
        countPublished
        countPendingApproval
        countApproved
        getPublishedTemplates {
          id
          title
          document_code
          revision_no
          effectivity
          created_by
          created_by_user {
            firstname
            lastname
          }
        }
      }
    }
  `;
  try {
    const res = await axios.post(
      `${API_URL}/graphql`,
      { query },
      {
        withCredentials: true,
        headers: school ? { 'X-User-School': school } : {},
      }
    );
    return res.data.data.templateDashboard;
  } catch (error) {
    throw new Error(error.response?.data?.errors?.[0]?.message || "Failed to fetch dashboard info.");
  }
};

/**
 * Fetch paginated templates with optional school, status, and search filters.
 * Maps UI friendly status labels (Draft, Pending Approval, Approved, Published) to API enums.
 * @param {Object} params - Query builder.
 * @param {Object} params.user - Current authenticated user (not sent; used for guard logic if needed externally).
 * @param {string} params.selectedSchool - School filter ('All' to disable).
 * @param {string} params.selectedStatus - Status filter ('All' to disable).
 * @param {string} params.search - Free-text search (matches title or document_code).
 * @param {number} params.PAGE_SIZE - Page size (limit).
 * @param {number} params.currentPage - 1-based page index.
 * @returns {Promise<{success:boolean,message:string,data:{templates:Object[],pagination:Object,filters_applied:Object}}>} API response payload.
 */
export const fetchTemplatesAPI = async ({ 
  user, 
  selectedSchool, 
  selectedStatus, 
  search, 
  PAGE_SIZE, 
  currentPage 
}) => {
  const params = {};

  if (selectedSchool !== 'All') params.school = selectedSchool;
  if (selectedStatus !== 'All') {
    const statusMap = {
      'Draft': 'draft',
      'Pending Approval': 'pending',
      'Approved': 'approved',
      'Published': 'published'
    };
    params.status = statusMap[selectedStatus];
  }
  if (search && search.trim()) params.search = search.trim();

  params.limit = PAGE_SIZE;
  params.page = currentPage;

  const res = await axios.get(`${API_URL}/api/templates/`, {
    params,
    withCredentials: true,
  });
  return res.data;
};

/**
 * Fetch published templates (global) with optional school, search, and pagination filters.
 * Calls backend: GET /api/templates/published
 * @param {Object} params - { school, search, limit, page }
 * @returns {Promise<{success:boolean,message:string,data:{templates:Array,pagination:Object,filters_applied:Object}}>} API response
 */
export const fetchPublishedTemplatesAPI = async ({ school, search, limit = 50, page = 1 } = {}) => {
  try {
    const params = { limit, page };
    if (school !== 'All') params.school = school;
    if (search && search.trim()) params.search = search.trim();
    const res = await axios.get(`${API_URL}/api/templates/published`, {
      params,
      withCredentials: true,
    });
    console.log(res.data);
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch published templates');
  }
};

/**
 * Create a new template.
 * Expects backend to auto-generate document_code and default page structure if not provided.
 * @param {Object} templateData - Minimal template payload (title, created_by, school_identifier, etc.).
 * @returns {Promise<{success:boolean,message:string,template:Object}>}
 */
export const createTemplateAPI = async (templateData) => {
  const res = await axios.post(`${API_URL}/api/templates/create-template`, templateData, {
    withCredentials: true,
  });
  return res.data;
};

/**
 * Fetch a single template by id including approvalMeta summary.
 * @param {string} templateId - Template Mongo ObjectId.
 * @returns {Promise<{success:boolean,message:string,template:Object}>}
 */
export const getTemplateByIdAPI = async (templateId) => {
  const res = await axios.get(`${API_URL}/api/templates/${templateId}`, {
    withCredentials: true,
  });
  return res.data;
};


/**
 * Update a template by ID.
 * Performs a PUT request sending only the fields to change (backend validates & persists).
 * @param {string} templateId - MongoDB ObjectId of the template to update.
 * @param {Object} updateData - Partial template payload (title, body, pages_json, status, etc.).
 * @returns {Promise<{success:boolean,message:string,template?:Object}>}
 */
export const updateTemplateAPI = async (templateId, updateData) => {
  const res = await axios.put(`${API_URL}/api/templates/${templateId}`, updateData, {
    withCredentials: true,
  });
  return res.data;
};

/**
 * Delete a template by ID. If the current user is assigned (and allowed), this may return an updated template
 * (removed from assigned); otherwise for owners/admins it deletes the template.
 * @param {string} templateId - Template MongoDB ObjectId
 * @returns {Promise<{success:boolean,message:string,template?:Object}>}
 */
export const deleteTemplateAPI = async (templateId) => {
  const res = await axios.delete(`${API_URL}/api/templates/${templateId}`, {
    withCredentials: true,
  });
  return res.data;
};

/**
 * Duplicate a template by ID with a new title.
 * @param {string} templateId
 * @param {string} title
 * @returns {Promise<{success:boolean,message:string,template:Object}>}
 */
export const duplicateTemplateAPI = async (templateId, title) => {
  const res = await axios.post(
    `${API_URL}/api/templates/${templateId}/duplicate`,
    { title },
    { withCredentials: true }
  );
  return res.data;
};

/**
 * Duplicate a template from a specific version snapshot
 * @param {string} templateId
 * @param {number|string} versionNoOrId - either numeric version_no or versionId
 * @param {string} [newTitle]
 * @returns {Promise<{success:boolean,message:string,template:Object}>}
 */
export const duplicateTemplateFromVersionAPI = async (templateId, versionNoOrId, newTitle) => {
  const payload = {};
  if (typeof versionNoOrId === 'number' || !Number.isNaN(Number(versionNoOrId))) payload.version_no = Number(versionNoOrId);
  else payload.versionId = versionNoOrId;
  if (newTitle && typeof newTitle === 'string') payload.newName = newTitle;
  const res = await axios.post(`${API_URL}/api/templates/${templateId}/duplicate-version`, payload, { withCredentials: true });
  return res.data;
};
/**
 * Approve a template for a specific role (Lead Document Controller or Document Control Officer).
 * Backend records approved_by & approved_at inside status_meta.approvals.<role>.
 * Returns updated template plus approvalMeta (helper summary).
 * @param {string} templateId - Template id.
 * @param {Object} data - Approval payload (role, document_code, effectivity, revision_no, etc.).
 * @returns {Promise<{success:boolean,message:string,template:Object,approvalMeta:Object}>}
 */
export const approveTemplateAPI = async (templateId, data) => {
  const res = await axios.patch(
    `${API_URL}/api/templates/${templateId}/approve`,
    data,
    { withCredentials: true }
  );
  return res.data;
};

/**
 * Insert / set document code, effectivity, and revision number (Document Control Officer only).
 * @param {string} templateId
 * @param {Object} params - { document_code, effectivity, revision_no }
 * @returns {Promise<{success:boolean,message:string,template:Object,approvalMeta:Object}>}
 */
export const insertDocumentCodeAPI = async (templateId, params) => {
  const payload = {};
  if (params?.document_code !== undefined) payload.document_code = params.document_code;
  if (params?.effectivity !== undefined) payload.effectivity = params.effectivity;
  if (params?.revision_no !== undefined) payload.revision_no = params.revision_no;

  try {
    const res = await axios.patch(
      `${API_URL}/api/templates/${templateId}/insert-document-code`,
      payload,
      { withCredentials: true }
    );
    return res.data;
  } catch (err) {
    throw err;
  }
};
/**
 * Reject a template (Document Control Officer only).
 * Backend will add a rejection note and set status to 'rejected'.
 * @param {string} templateId - Template id.
 * @param {string} reason - Reason for rejection.
 * @returns {Promise<{success:boolean,message:string,template:Object}>}
 */
export const rejectTemplateAPI = async (templateId, reason) => {
  const res = await axios.patch(
    `${API_URL}/api/templates/${templateId}/reject`,
    { reason },
    { withCredentials: true }
  );
  return res.data;
};

/**
 * Return a template for revision (change request).
 * Backend will add a 'change' note and set status to 'returned'.
 * @param {string} templateId - Template id.
 * @param {string} reason - Reason for return/change request.
 * @returns {Promise<{success:boolean,message:string,template:Object}>}
 */
export const returnTemplateAPI = async (templateId, reason) => {
  const res = await axios.patch(
    `${API_URL}/api/templates/${templateId}/return`,
    { reason },
    { withCredentials: true }
  );
  return res.data;
};
/**
 * Submit a template for approval.
 * Backend will set status to 'pending'.
 * @param {string} templateId - Template id.
 * @param {string} lead_document_controller_id - Lead Document Controller user id to assign as approver.
 * @param {string} document_controller_officer_id - Document Control Officer user id to assign as approver.
 * @returns {Promise<{success:boolean,message:string,template:Object}>}
 */
export const submitTemplateAPI = async (templateId, lead_document_controller_id, document_controller_officer_id, unit_document_controller_id) => {
  const payload = {};
  if (lead_document_controller_id) payload.lead_document_controller_id = lead_document_controller_id;
  if (document_controller_officer_id) payload.document_controller_officer_id = document_controller_officer_id;
  if (unit_document_controller_id) payload.unit_document_controller_id = unit_document_controller_id;
  const res = await axios.patch(
    `${API_URL}/api/templates/${templateId}/submit`,
    payload,
    { withCredentials: true }
  );
  return res.data;
};

/**
 * Add a note to a template.
 * @param {string} templateId - The template's Mongo ObjectId.
 * @param {string} message - The note message to add.
 * @returns {Promise<{success:boolean,message:string,template:Object}>}
 */
export const addTemplateNoteAPI = async (templateId, message) => {
  const res = await axios.patch(
    `${API_URL}/api/templates/${templateId}/add-note`,
    { message },
    { withCredentials: true }
  );
  return res.data;
};

/**
 * Adjust the deadline of a template.
 * @param {string} templateId - The template's Mongo ObjectId.
 * @param {string|Date} deadline - The new deadline value.
 * @returns {Promise<{success:boolean,message:string,template:Object}>}
 */
export const adjustTemplateDeadlineAPI = async (templateId, deadline) => {
  const res = await axios.patch(
    `${API_URL}/api/templates/${templateId}/adjust-deadline`,
    { deadline },
    { withCredentials: true }
  );
  return res.data;
};
/**
 * Assigns document controllers to a template (replaces the assigned array).
 * @param {string} templateId - The template's Mongo ObjectId.
 * @param {string[]} controllers - Array of user IDs to assign as controllers.
 * @returns {Promise<{success:boolean,message:string,template:Object}>}
 */
export const assignControllersToTemplateAPI = async (templateId, controllers) => {
  const res = await axios.post(
    `${API_URL}/api/templates/assign-controllers`,
    { templateId, controllers },
    { withCredentials: true }
  );
  return res.data;
};
/**
 * Publish a fully approved template.
 * Server will elevate pending→approved first if both approvals exist, then set status to published.
 * @param {string} templateId - Template id.
 * @returns {Promise<{success:boolean,message:string,template:Object,approvalMeta:Object}>}
 */
export const publishTemplateAPI = async (templateId, payload = {}) => {
  const res = await axios.patch(`${API_URL}/api/templates/${templateId}/publish`, payload || {}, { withCredentials: true });
  return res.data;
};
/**
 * Unpublish a template (set status from published to approved)
 * @param {string} templateId - Template id.
 * @returns {Promise<{success:boolean,message:string,template:Object}>}
 */
export const unpublishTemplateAPI = async (templateId) => {
  const res = await axios.patch(`${API_URL}/api/templates/${templateId}/unpublish`, {}, { withCredentials: true });
  return res.data;
};

/**
 * Unsubmit a template (set status from pending to draft)
 * @param {string} templateId - Template id.
 * @returns {Promise<{success:boolean,message:string,template:Object}>}
 */
export const unsubmitTemplateAPI = async (templateId) => {
  const res = await axios.patch(`${API_URL}/api/templates/${templateId}/unsubmit`, {}, { withCredentials: true });
  return res.data;
};
/**
 * Fetch approvers (university-wide; no school filter) used for displaying who can approve.
 * Backend returns:
 *  - Lead Document Controller and Document Control Officer always
 *  - Unit Document Controller only when the requester is Faculty
 * @param {string} [school] - Ignored by backend (kept for backward compatibility).
 * @returns {Promise<{success?:boolean,approvers?:Array,rolesConsidered?:Array}>}
 * @throws {Error} - When the HTTP request fails.
 */
export const fetchApproversAPI = async (_schoolIgnored) => {
  try {
    // University-wide; backend ignores school, so we don't send a query param.
    const res = await axios.get(`${API_URL}/api/doc-controller/approvers`, {
      withCredentials: true
    });
    return res.data; 
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch approvers');
  }
};

/**
 * Rename a template
 * @param {string} templateId - The ID of the template to rename
 * @param {string} newTitle - The new title for the template
 * @returns {Promise<Object>}
 */
export const renameTemplateAPI = async (templateId, newTitle) => {
  try {
    const res = await axios.patch(
      `${API_URL}/api/templates/${templateId}/rename`,
      { newName: newTitle }, 
      { withCredentials: true }
    );

    return res.data;
  } catch (err) {
    console.error("Rename template error:", err.response?.data || err.message);
    throw err.response?.data || { message: err.message };
  }
};

/**
 * List template versions (history) for a template
 * @param {string} templateId - Template ObjectId
 * @returns {Promise<{success:boolean,versions:Array}>}
 */
export const listTemplateVersionsAPI = async (templateId) => {
  try {
    const res = await axios.get(`${API_URL}/api/templates/${templateId}/versions`, { withCredentials: true });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to list template versions');
  }
};

/**
 * Get a specific template version
 * @param {string} templateId
 * @param {string} versionId
 * @returns {Promise<{success:boolean,version:Object}>}
 */
export const getTemplateVersionAPI = async (templateId, versionId) => {
  try {
    const res = await axios.get(`${API_URL}/api/templates/${templateId}/versions/${versionId}`, { withCredentials: true });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to fetch template version');
  }
};

/**
 * Update the note on a template version
 * @param {string} templateId
 * @param {string} versionId
 * @param {string} note
 * @returns {Promise<{success:boolean,version:Object}>}
 */
export const updateTemplateVersionNoteAPI = async (templateId, versionId, note) => {
  try {
    const res = await axios.patch(`${API_URL}/api/templates/${templateId}/versions/${versionId}/note`, { note }, { withCredentials: true });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to update version note');
  }
};

/**
 * Update bookmark state and note for a template version
 * @param {string} templateId
 * @param {string} versionId
 * @param {Object} payload - { isBookmarked?: boolean, note?: string }
 * @returns {Promise<{success:boolean,version:Object}>}
 */
export const updateTemplateVersionBookmarkAPI = async (templateId, versionId, payload) => {
  try {
    const res = await axios.patch(`${API_URL}/api/templates/${templateId}/versions/${versionId}/bookmark`, payload, { withCredentials: true });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to update version bookmark');
  }
};

/**
 * Restore a template from a version
 * @param {string} templateId
 * @param {string} versionId
 * @returns {Promise<{success:boolean,message:string,template:Object}>}
 */
export const restoreTemplateVersionAPI = async (templateId, versionId) => {
  try {
    const res = await axios.post(`${API_URL}/api/templates/${templateId}/versions/${versionId}/restore`, {}, { withCredentials: true });
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.message || 'Failed to restore template version');
  }
};
/**
 * Archive a template by ID. If owner/admin, sets isArchived=true. If assigned, removes user from assigned.
 * @param {string} templateId - Template MongoDB ObjectId
 * @returns {Promise<{success:boolean,message:string,template?:Object}>}
 */
export const archiveTemplateAPI = async (templateId) => {
  try {
    const res = await axios.patch(`${API_URL}/api/templates/${templateId}/archive`, {}, {
      withCredentials: true,
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to archive template');
  }
};

/**
 * Fetch archived templates with optional school, status, and search filters.
 * Calls backend: GET /api/templates/archived
 * @param {Object} params - { selectedSchool, selectedStatus, search, PAGE_SIZE, currentPage }
 * @returns {Promise<{success:boolean,message:string,data:{templates:Array,pagination:Object,filters_applied:Object}}>} API response
 */
export const fetchArchivedTemplatesAPI = async ({ 
  selectedSchool, 
  selectedStatus, 
  search, 
  PAGE_SIZE, 
  currentPage 
}) => {
  const params = {};
  if (selectedSchool !== 'All') params.school = selectedSchool;
  if (selectedStatus !== 'All') {
    const statusMap = {
      'Draft': 'draft',
      'Pending Approval': 'pending',
      'Approved': 'approved',
      'Published': 'published',
      'Rejected': 'rejected',
      'Returned': 'returned'
    };
    params.status = statusMap[selectedStatus] || selectedStatus;
  }
  if (search && search.trim()) params.search = search.trim();
  params.limit = PAGE_SIZE;
  params.page = currentPage;
  const res = await axios.get(`${API_URL}/api/templates/archived`, {
    params,
    withCredentials: true,
  });
  return res.data;
};