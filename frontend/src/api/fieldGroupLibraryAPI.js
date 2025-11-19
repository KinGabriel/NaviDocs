import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL ;
/**
 * List field groups from the library with optional filters.
 * @param {Object} [params]
 * @param {('user'|'school'|'global')} [params.scope] - Filter by scope.
 * @param {string} [params.school] - School identifier (for school scope).
 * @param {string} [params.owner] - User id (for user scope).
 * @param {string} [params.search] - Text search by group label or field names.
 * @param {string[]} [params.tags] - Optional tag filter (implementation dependent).
 * @returns {Promise<Array<Object>>} Resolves with an array of field group objects.
 */
export const listFieldGroupLibraryAPI = async (params = {}) => {
  const res = await axios.get(`${API_URL}/api/templates/field-groups`, {
    params,
    withCredentials: true,
  });
  return res.data?.groups || [];
};

/**
 * Create or update a single field group in the library (merge-on-upsert by key+scope+owner).
 * @param {Object} group - The field group to upsert.
 * @param {string} group.key - Stable identifier for the group.
 * @param {string} group.label - Display label for the group.
 * @param {('user'|'school'|'global')} group.scope - Persistence scope.
 * @param {Array<Object>} group.fields - Field definitions contained in the group.
 * @returns {Promise<Object>} Resolves with the upserted group.
 */
export const upsertFieldGroupToLibraryAPI = async (group) => {
  const res = await axios.post(`${API_URL}/api/templates/field-groups`, group, { withCredentials: true });
  return res.data?.group;
};

/**
 * Bulk create or update multiple field groups.
 * @param {Array<Object>} groups - Array of field group payloads.
 * @returns {Promise<Array<Object>>} Resolves with the upserted groups.
 */
export const bulkUpsertFieldGroupsToLibraryAPI = async (groups) => {
  const res = await axios.post(`${API_URL}/api/templates/field-groups/bulk`, { groups }, { withCredentials: true });
  return res.data?.groups || [];
};

/**
 * Delete a field group from the library by id.
 * @param {string} id - The group id.
 * @returns {Promise<Object>} Resolves with the deletion result.
 */
export const deleteFieldGroupFromLibraryAPI = async (id) => {
  const res = await axios.delete(`${API_URL}/api/templates/field-groups/${id}`, { withCredentials: true });
  return res.data;
};

/**
 * Fetch a single field group by key and scope.
 * @param {string} key - Group key.
 * @param {('user'|'school'|'global')} scope - Scope to search within.
 * @returns {Promise<Object|null>} Resolves with the group or null when not found.
 */
export const getFieldGroupByKeyAPI = async (key, scope) => {
  const res = await axios.get(`${API_URL}/api/templates/field-groups/one`, {
    params: { key, scope },
    withCredentials: true,
  });
  return res.data?.group || null;
};

/**
 * Rename a field group in the library; returns the updated group.
 * @param {string} id - The group id.
 * @param {string} label - New label for the group.
 * @returns {Promise<Object|null>} Resolves with the updated group or null.
 */
export const renameFieldGroupInLibraryAPI = async (id, label) => {
  const res = await axios.patch(`${API_URL}/api/templates/field-groups/${id}`, { label }, { withCredentials: true });
  return res.data?.group || null;
};
