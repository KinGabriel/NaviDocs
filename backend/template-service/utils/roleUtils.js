// Role utilities: centralize normalization and mapping between display names and internal approval keys

// Internal key -> display label
export const DISPLAY_FROM_KEY = {
  unit_document_controller: 'Unit Document Controller',
  lead_document_controller: 'Lead Document Controller',
  document_controller_officer: 'Document Control Officer',
  department_head: 'Department Head',
  faculty: 'Faculty',
};

// Display label -> internal key
export const ROLE_TO_KEY = {
  'Unit Document Controller': 'unit_document_controller',
  'Lead Document Controller': 'lead_document_controller',
  'Document Control Officer': 'document_controller_officer',
  'Department Head': 'department_head',
  'Faculty': 'faculty',
};

// Export common role collections for reuse
export const APPROVER_DISPLAY_ROLES = [
  'Unit Document Controller',
  'Lead Document Controller',
  'Document Control Officer',
];

export const APPROVAL_KEYS = [
  'unit_document_controller',
  'lead_document_controller',
  'document_controller_officer',
];

// Normalize any incoming role (string or { name }) to a canonical display label
export const normalizeRoleDisplay = (role) => {
  if (!role) return null;
  const raw = typeof role === 'string' ? role : (role?.name || String(role));
  if (!raw) return null;
  const r = String(raw).trim();
  const lc = r.toLowerCase();

  // If already an exact display label we support, return as-is
  if (ROLE_TO_KEY[r]) return r;

  // Handle common variants and includes-based patterns
  if (lc === 'lead_document_controller' || lc === 'lead document controller') return 'Lead Document Controller';
  if (lc === 'document_control_officer' || lc === 'document controller officer' || lc === 'document_controller_officer' || (lc.includes('document') && lc.includes('officer'))) return 'Document Control Officer';
  if (lc === 'unit_document_controller' || lc === 'unit document controller' || (lc.includes('unit') && lc.includes('document') && lc.includes('controller'))) return 'Unit Document Controller';
  if (lc.includes('department') && lc.includes('head')) return 'Department Head';
  if (lc === 'faculty') return 'Faculty';

  // Fallback: return original string
  return r;
};

// Map incoming role (string or { name }) to an internal approval/storage key
export const toApprovalKey = (role) => {
  if (!role) return null;
  const r = normalizeRoleDisplay(role);
  if (ROLE_TO_KEY[r]) return ROLE_TO_KEY[r];

  // Try best-effort from raw string
  const s = typeof role === 'string' ? role : (role?.name || String(role));
  if (!s) return null;
  const lc = s.toLowerCase();
  if (lc.includes('document') && lc.includes('officer')) return 'document_controller_officer';
  if (lc.includes('lead') && lc.includes('document') && lc.includes('controller')) return 'lead_document_controller';
  if (lc.includes('unit') && lc.includes('document') && lc.includes('controller')) return 'unit_document_controller';
  if (lc.includes('department') && lc.includes('head')) return 'department_head';
  if (lc === 'faculty') return 'faculty';
  return null;
};

export const toDisplayFromKey = (key) => DISPLAY_FROM_KEY[key] || key;

export const isRole = (role, displayLabel) => normalizeRoleDisplay(role) === displayLabel;

export const isApproverKey = (key) => APPROVAL_KEYS.includes(key);
export const isApproverDisplay = (role) => APPROVER_DISPLAY_ROLES.includes(normalizeRoleDisplay(role));
