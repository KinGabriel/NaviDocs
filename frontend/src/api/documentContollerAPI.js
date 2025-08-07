import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Fetches document templates from the API with optional filters.
 * @param {Object} params - The parameters for filtering and pagination.
 * @param {Object} params.user - The current user object.
 * @param {string} params.selectedSchool - The selected school filter.
 * @param {string} params.selectedStatus - The selected status filter.
 * @param {string} params.search - The search query.
 * @param {number} params.PAGE_SIZE - Number of templates per page.
 * @param {number} params.currentPage - Current page number.
 * @returns {Promise<Object>} - Resolves to the templates data.
 * @throws {Error} - Throws an error if the request fails.
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
 * Creates a new document template via the API.
 * @param {Object} templateData - The template data to create.
 * @returns {Promise<Object>} - Resolves to the created template data.
 * @throws {Error} - Throws an error if the request fails.
 */
export const createTemplateAPI = async (templateData) => {
  const res = await axios.post(`${API_URL}/api/templates/create-template`, templateData, {
    withCredentials: true,
  });
  return res.data;
};