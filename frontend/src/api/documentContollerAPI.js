import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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
 * Updates an existing template.
 * @param {string} templateId - ID of the template.
 * @param {Object} updateData - Data to update.
 * @returns {Promise<Object>} - Updated template response.
 */

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
 * Approve a template for a specific role (dean or secretary).
 * Backend records approved_by & approved_at inside status_meta.approvals.<role>.
 * Returns updated template plus approvalMeta (helper summary).
 * @param {string} templateId - Template id.
 * @param {'dean'|'secretary'} role - Approver role.
 * @returns {Promise<{success:boolean,message:string,template:Object,approvalMeta:Object}>}
 */
export const approveTemplateAPI = async (templateId, role) => {
  const res = await axios.post(`${API_URL}/api/templates/${templateId}/approve`, { role }, { withCredentials: true });
  return res.data;
};
/**
 * Publish a fully approved template.
 * Server will elevate pending→approved first if both approvals exist, then set status to published.
 * @param {string} templateId - Template id.
 * @returns {Promise<{success:boolean,message:string,template:Object,approvalMeta:Object}>}
 */
export const publishTemplateAPI = async (templateId) => {
  const res = await axios.post(`${API_URL}/api/templates/${templateId}/publish`, {}, { withCredentials: true });
  return res.data;
};
/**
 * Fetch approvers (Secretary & Dean) for a given school (used for displaying who can approve).
 * @param {string} [school] - School name or code (optional; if omitted backend may infer or return global list).
 * @returns {Promise<{success?:boolean,approvers?:Array}>}
 * @throws {Error} - When the HTTP request fails.
 */
export const fetchApproversAPI = async (school) => {
  try {
    const params = school ? `?school=${encodeURIComponent(school)}` : '';
    const res = await axios.get(`${API_URL}/api/doc-controller/approvers${params}`, {
      withCredentials: true
    });
    return res.data; 
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch approvers');
  }
};
