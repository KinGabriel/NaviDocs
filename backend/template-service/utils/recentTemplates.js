import Template from '../models/templateModel.js';

/**
 * Return the most recent published templates for reuse across services/controllers.
 * Excludes archived templates by default and returns a lightweight projection.
 * @param {number} limit
 * @returns {Promise<Array>} array of template docs (lean())
 */
export const getRecentPublished = (limit = 5) => {
  return Template.find({ status: 'published', isArchived: { $ne: true } })
    .select({ title: 1, document_code: 1, revision_no: 1, effectivity: 1, created_by: 1, 'status_meta.published_at': 1, updatedAt: 1, createdAt: 1 })
    .sort({ 'status_meta.published_at': -1, updatedAt: -1 })
    .limit(limit)
    .lean();
};

export default { getRecentPublished };
