import { normalizeRoleDisplay } from './roleUtils.js';
import { fetchUsersProfiles, buildUserServiceHeaders } from './userServiceUtils.js';

// Helper: choose a deep-link per recipient role and event type
export const linkFor = (type, templateId, role) => {
  const r = normalizeRoleDisplay(role);
  switch (type) {
    case 'template_assignment':
      // All roles land on the unified template view
      return `/templates/${templateId}`;
    case 'template_deadline_update':
    case 'template_returned':
    case 'template_rejected':
    case 'template_partially_approved':
    case 'template_fully_approved':
      // Approvers (Lead/Unit Document Controller, Document Control Officer) land on review/manage page
      return `/templates/${templateId}`;
    case 'template_review_requested':
      return `/templates/${templateId}`; // approvers
    case 'template_published':
    case 'template_unpublished':
      return `/templates/published/${templateId}`; // everyone can view published details
    default:
      return `/templates/${templateId}`;
  }
};

// Helper: group a list of userIds by their role using user-service
export const groupTargetsByRole = async (ids = [], req) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) return {};
    const headers = buildUserServiceHeaders(req);
    const profiles = await fetchUsersProfiles(ids, headers); // [{id,email,name,role}]
    const map = {};
    for (const p of profiles) {
      const r = normalizeRoleDisplay(typeof p.role === 'string' ? p.role : (p.role?.name || p.role));
      if (!r) continue;
      if (!map[r]) map[r] = [];
      map[r].push(String(p.id));
    }
    // Include any ids we couldn't resolve to a role under a generic bucket
    const resolved = new Set(Object.values(map).flat());
    const unresolved = ids.map(String).filter(id => !resolved.has(id));
    if (unresolved.length) {
      map['Unknown'] = (map['Unknown'] || []).concat(unresolved);
    }
    return map;
  } catch (_e) {
    // If lookup fails, just return a single bucket with all ids
    return { Unknown: Array.from(new Set(ids.map(String))) };
  }
};

// Hardening helper: preserve any previously approved slots so actions (submit/return/reject)
// never clear UDC/LDC/DCO approval flags or timestamps.
export const preservePriorApprovals = (current = {}, prior = {}) => {
  try {
    const keys = ['unit_document_controller', 'lead_document_controller', 'document_controller_officer'];
    for (const k of keys) {
      const prev = prior?.[k] || {};
      const cur = current[k] = current[k] || {};
      // If previously approved, keep approval flags and timestamps
      if (prev.approved_at) cur.approved_at = prev.approved_at;
      if (prev.isApproved === true) cur.isApproved = true;
      // Preserve who it was previously routed to if not explicitly re-targeted
      if (!cur.assigned_to && prev.assigned_to) cur.assigned_to = prev.assigned_to;
      // Do NOT carry over negative states here (isRejected/isReturned) — those are event-specific
    }
    return current;
  } catch {
    return current;
  }
};

export default {
  linkFor,
  groupTargetsByRole,
  preservePriorApprovals,
};
