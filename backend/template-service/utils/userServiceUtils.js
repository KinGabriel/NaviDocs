import axios from 'axios';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || '';

const getProfileEndpoint = (id) => `${USER_SERVICE_URL}/api/user/${encodeURIComponent(id)}`;
const getEmailEndpoint = (id) => `${USER_SERVICE_URL}/api/user/getUserEmail/${encodeURIComponent(id)}`;

/**
 * Fetch a user profile (email, name, role). Tries profile endpoint first, falls back to email-only endpoint.
 * @param {string} id
 * @param {object} headers optional headers to forward
 * @returns {Promise<{id:string,email:string,name?:string,role?:string}|null>} profile or null
 */
export async function fetchUserProfile(id, headers = {}) {
  if (!id) return null;
  try {
    const resp = await axios.get(getProfileEndpoint(id), { headers, timeout: 8000 });
    const data = resp?.data || {};
    const email = data.email || data.emailAddress || null;
    const firstname = data.firstname || data.firstName || data.first_name || '';
    const lastname = data.lastname || data.lastName || data.last_name || '';
    const name = [firstname, lastname].filter(Boolean).join(' ') || data.name || data.displayName || (email ? email.split('@')[0] : null);
    const role = typeof data.role === 'string' ? data.role : (data.role?.name || null);
    return email ? { id, email, name, role } : null;
  } catch (err) {
    // fallback to email-only endpoint
    try {
      const resp = await axios.get(getEmailEndpoint(id), { headers, timeout: 8000 });
      const email = resp?.data?.email;
      return email ? { id, email } : null;
    } catch (err2) {
      console.warn(`Failed to fetch user profile/email for ${id}:`, err2?.response?.status || err2?.message || err2);
      return null;
    }
  }
}

/**
 * Fetch multiple user profiles in parallel and return mapped results (skipping nulls)
 * @param {string[]} ids
 * @param {object} headers
 */
export async function fetchUsersProfiles(ids = [], headers = {}) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const uniq = Array.from(new Set(ids.map(String)));
  const results = await Promise.allSettled(uniq.map(id => fetchUserProfile(id, headers)));
  return results
    .map(r => (r.status === 'fulfilled' ? r.value : null))
    .filter(Boolean);
}

/**
 * Build authentication headers for calls to the user service.
 * Prefers tokens in this order: req.context.token -> req.user.token -> req.cookies.token -> req.headers.cookie
 * Returns an object suitable to pass as axios headers.
 */
export const buildUserServiceHeaders = (req) => {
  const headers = {};
  if (!req) return headers;
  if (req.context && req.context.token) {
    headers['Cookie'] = `token=${req.context.token}`;
  } else if (req.user && req.user.token) {
    headers['Cookie'] = `token=${req.user.token}`;
  } else if (req.cookies && req.cookies.token) {
    headers['Cookie'] = `token=${req.cookies.token}`;
  } else if (req.headers && req.headers.cookie) {
    headers['Cookie'] = req.headers.cookie;
  }
  return headers;
};

/**
 * Fetch user info from the user service by ID.
 * @param {string} userId
 * @param {object} req - Express request object (used to extract auth headers)
 * @param {object} opts - { basic: boolean } - if basic=true, call getUserBasicInfo endpoint
 * @returns {object|null} response data or null on failure
 */
export const fetchUserInfoById = async (userId, req = {}, opts = { basic: false }) => {
  if (!userId) return null;
  try {
    const headers = buildUserServiceHeaders(req);
    const endpoint =  'getUserInfo';
    const url = `${USER_SERVICE_URL}/api/user/${endpoint}/${encodeURIComponent(String(userId))}`;
    const resp = await axios.get(url, { headers, withCredentials: true });
    return resp?.data || null;
  } catch (err) {
    // swallow errors and return null so callers can continue
    return null;
  }
};

export default { fetchUserProfile, fetchUsersProfiles, buildUserServiceHeaders, fetchUserInfoById };
