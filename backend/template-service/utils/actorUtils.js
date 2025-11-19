/**
 * Normalize actor/user information from the Express request object into a small, predictable shape
 * @param {import('express').Request} req
 * @returns {{id: string|null, name: string, role: string|null, email: string|null}}
 */
export const getActorFromReq = (req) => {
  const u = req?.user || {};
  const id = u._id || u.id || u.userId || null;
  const first = u.firstName || u.firstname || u.first_name || u.givenName || '';
  const last = u.lastName || u.lastname || u.last_name || u.familyName || '';
  let name = `${first} ${last}`.trim();
  if (!name) name = u.name || u.displayName || u.username || u.email || id || 'Unknown User';
  let role = null;
  if (typeof u.role === 'string') role = u.role;
  else if (u.role && typeof u.role === 'object') role = u.role.name || u.role.role || JSON.stringify(u.role);
  else role = u.role || null;
  const email = u.email || u.mail || null;
  return { id, name, role, email };
};
