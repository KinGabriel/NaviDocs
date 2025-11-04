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
    const role = req?.user?.role ?? req?.user?.type ?? req?.user?.role_name ?? '';
    return (typeof role === 'string' ? role : String(role || '')).toLowerCase();
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
  const allowed = Array.isArray(roles) ? roles.map(r => String(r).toLowerCase()) : [];
  return allowed.includes(current);
};

export default { getUserRole, hasRole };
