/**
 * Generates an HTML email for folder access notification
 * @param {Object} param0
 * @param {string} param0.recipientName
 * @param {string} param0.folderName
 * @param {string} param0.grantedBy
 * @param {string} [param0.folderLink]
 * @returns {string}
 */
export function folderAccessTemplate({ folderName, grantedBy, folderLink,emailOfGrantedBy,role }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4c96afff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; background-color: #f9f9f9; }
        .info-box {
          background-color: #e7f3ff;
          border: 2px solid #4c96afff;
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
          text-align: center;
        }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4c96afff;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Folder Access Granted</h1>
        </div>
        <div class="content">
          <h2>You've Been Granted Access!</h2>
          <div class="info-box">
            <p>You have been granted access to the folder <b>${folderName || 'a folder'}</b>.</p>
            <p><strong>Granted By:</strong> ${grantedBy || 'an administrator'}${emailOfGrantedBy ? ` (${emailOfGrantedBy})` : ''}</p>
            ${role ? `<p><strong>Your Role:</strong> ${role}</p>` : ''}
          </div>
          ${folderLink ? `<center><a href="${folderLink}" class="btn">Open Folder</a></center>` : ''}
          <p>If you have any questions, please contact your administrator.</p>
        </div>
        <div class="footer">
          This is an automated message from NaviDocs.
        </div>
      </div>
    </body>
    </html>
  `;
}
