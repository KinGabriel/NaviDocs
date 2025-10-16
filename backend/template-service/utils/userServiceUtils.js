import axios from 'axios';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:8001';

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
