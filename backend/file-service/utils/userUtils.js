
import axios from 'axios';

/**
 * Get user email by userId, using the request for cookies/headers
 * @param {string} userId
 * @param {object} req - Express request (for cookies/headers)
 * @returns {Promise<string>} email or userId fallback
 */
export const getUserEmail = async (userId, req) => {
  try {
    const headers = {};
    // Use JWT token from request cookies or headers
    const token = req.cookies?.token || req.headers?.cookie?.split('token=')[1]?.split(';')[0];
    if (token) {
      headers['Cookie'] = `token=${token}`;
    }
    const resp = await axios.get(`${process.env.USER_SERVICE_URL || 'http://localhost:3001'}/api/user/getUserEmail/${userId}`, { headers });
    return resp.data?.email || userId;
  } catch (err) {
    console.log('Error fetching user email:', err);
    return userId;
  }
};

/**
 * Map files to resolve owner and allowedUsers to emails for dbfiles
 * @param {Array} files - Array of file objects (Mongoose subdocs or plain)
 * @param {object} req - Express request (for cookies/headers)
 * @param {function} getUserEmail - Utility to resolve userId to email
 * @returns {Promise<Array>} Array of files with emails resolved
 */
export const mapFilesWithEmails = async (files, req, getUserEmail) => {
  if (!Array.isArray(files) || !files.length) return [];
  return Promise.all(files.map(async file => {
    const plainFile = typeof file.toObject === 'function' ? file.toObject() : { ...file };
    const ownerEmail = plainFile.owner ? await getUserEmail(plainFile.owner, req) : (plainFile.uploadedBy ? await getUserEmail(plainFile.uploadedBy, req) : null);
    const allowedUsersEmails = Array.isArray(plainFile.allowedUsers) && plainFile.allowedUsers.length
      ? await Promise.all(plainFile.allowedUsers.map(async u => {
          const email = await getUserEmail(u.userId, req);
          return { ...u, email };
        }))
      : [];
    return {
      ...plainFile,
      owner: ownerEmail,
      allowedUsers: allowedUsersEmails
    };
  }));
};