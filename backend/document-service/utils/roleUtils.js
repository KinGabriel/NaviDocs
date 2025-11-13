/**
 * Authentication/Authorization helpers for controllers
 */

/**
 * Extracts a normalized role string from the request's user payload.
 * Accepts role from req.user.role, req.user.type, or req.user.role_name.
 * Returns a lowercase string, or an empty string if not present.
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
export const getUserRole = (req) => {
  try {
    // Accept multiple shapes: req.user.role may be a string or an object with name
    const rawRole = req?.user?.role;
    let role = '';
    if (typeof rawRole === 'string') {
      role = rawRole;
    } else if (rawRole && typeof rawRole.name === 'string') {
      role = rawRole.name;
    } else {
      // Fallbacks commonly seen in payloads
      role = req?.user?.type || req?.user?.role_name || req?.user?.position || '';
    }

    // Normalize and lowercase
    let normalized = String(role || '').toLowerCase().trim();

    // Unify common variants
    const normalizeMap = {
      'department_head': 'department head',
      'dept-head': 'department head',
      'dept head': 'department head',
      'department-head': 'department head',
      'departmenthead': 'department head',
    };
    if (normalizeMap[normalized]) normalized = normalizeMap[normalized];

    return normalized;
  } catch (_) {
    return '';
  }
};

/**
 * Checks if the current user's role is included in the allowed roles.
 * Roles comparison is case-insensitive.
 *
 * @param {import('express').Request} req
 * @param {string[]} roles - allowed roles (e.g., ['department_head','secretary','dean'])
 * @returns {boolean}
 */
export const hasRole = (req, roles = []) => {
  const current = getUserRole(req);
  if (!current) return false;
  const normalizeAllowed = (val) => {
    const v = String(val || '').toLowerCase().trim();
    const map = {
      'department_head': 'department head',
      'dept-head': 'department head',
      'dept head': 'department head',
      'department-head': 'department head',
      'departmenthead': 'department head',
    };
    return map[v] || v;
  };
  const allowed = Array.isArray(roles) ? roles.map(normalizeAllowed) : [];
  return allowed.includes(current);
};

export default { getUserRole, hasRole };
