/**
 * Generates an enhanced HTML email for folder access notification
 * @param {Object} param0
 * @param {string} param0.recipientName
 * @param {string} param0.folderName
 * @param {string} param0.grantedBy
 * @param {string} param0.emailOfGrantedBy
 * @param {string} param0.role
 * @param {string} [param0.folderLink]
 * @param {string} [param0.companyName]
 * @param {string} [param0.message]
 * @returns {string}
 */
export function folderAccessTemplate({ 
  recipientName, 
  folderName, 
  grantedBy, 
  folderLink, 
  emailOfGrantedBy, 
  role, 
  companyName = 'NaviDocs',
  message 
}) {
  const roleColors = {
    'Owner': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    'Editor': { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
    'Viewer': { bg: '#dcfce7', border: '#10b981', text: '#065f46' },
    'Commenter': { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' }
  };
  
  const roleStyle = roleColors[role] || { bg: '#f3f4f6', border: '#6b7280', text: '#374151' };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Folder Access Granted - ${companyName}</title>
      <style>
        * { box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6; 
          color: #1f2937; 
          margin: 0; 
          padding: 0;
          background-color: #f9fafb;
        }
        .email-wrapper {
          background-color: #f9fafb;
          padding: 20px 10px;
          min-height: 100vh;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        /* Header */
        .header { 
          background: linear-gradient(135deg, #0035DA 0%, #043485 100%);
          color: white; 
          padding: 40px 30px 30px; 
          text-align: center;
          position: relative;
        }
        .header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6);
        }
        .header h1 { 
          margin: 0; 
          font-size: 28px; 
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .header-icon {
          display: inline-block;
          width: 60px;
          height: 60px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          margin-bottom: 16px;
          line-height: 60px;
          font-size: 24px;
        }
        
        /* Content */
        .content { 
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 16px;
        }
        .intro-text {
          font-size: 16px;
          color: #4b5563;
          margin-bottom: 32px;
          line-height: 1.7;
        }
        
        /* Folder Info Card */
        .folder-card {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #0ea5e9;
          border-radius: 12px;
          padding: 24px;
          margin: 24px 0;
          position: relative;
          overflow: hidden;
        }
        .folder-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #0ea5e9, #3b82f6);
        }
        .folder-icon {
          display: inline-block;
          width: 48px;
          height: 48px;
          background-color: #0ea5e9;
          border-radius: 8px;
          line-height: 48px;
          text-align: center;
          color: white;
          font-size: 20px;
          margin-bottom: 12px;
        }
        .folder-name {
          font-size: 20px;
          font-weight: 700;
          color: #0c4a6e;
          margin-bottom: 16px;
          word-break: break-word;
        }
        
        /* Access Details */
        .access-details {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 20px;
        }
        .detail-item {
          flex: 1;
          min-width: 200px;
        }
        .detail-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: #6b7280;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .detail-value {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
        }
        .granted-by-email {
          font-size: 14px;
          color: #4b5563;
          font-weight: 400;
        }
        
        /* Role Badge */
        .role-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
        }
        
        /* CTA Button */
        .cta-section {
          text-align: center;
          margin: 32px 0;
        }
        .btn-primary {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #0035DA 0%, #043485 100%);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(0, 53, 218, 0.3);
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 53, 218, 0.4);
        }
        .btn-icon {
          margin-left: 8px;
        }
        
        /* Footer */
        .footer { 
          background-color: #f9fafb;
          text-align: center; 
          padding: 24px 30px; 
          border-top: 1px solid #e5e7eb;
        }
        .footer-text {
          color: #6b7280; 
          font-size: 13px;
          margin: 0 0 8px 0;
        }
        .company-name {
          font-weight: 600;
          color: #374151;
        }
        
        /* Responsive */
        @media (max-width: 600px) {
          .email-wrapper { padding: 10px 5px; }
          .content, .header { padding: 24px 20px; }
          .container { border-radius: 8px; }
          .access-details { flex-direction: column; gap: 12px; }
          .detail-item { min-width: auto; }
          .btn-primary { padding: 12px 24px; font-size: 15px; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="header-icon">📁</div>
            <h1>Access Granted!</h1>
          </div>
          
          <!-- Content -->
          <div class="content">
            <div class="greeting">
              ${recipientName ? `Hi ${recipientName},` : 'Hello,'}
            </div>
            
            <div class="intro-text">
              You've been granted access to a folder. You can now view and interact with the files based on your assigned permissions.
            </div>
            
            <!-- Folder Info Card -->
            <div class="folder-card">
              <div class="folder-icon">📂</div>
              <div class="folder-name">${folderName || 'Shared Folder'}</div>
              
              <div class="access-details">
                <div class="detail-item">
                  <div class="detail-label">Shared by</div>
                  <div class="detail-value">
                    ${grantedBy || 'Administrator'}
                    ${emailOfGrantedBy ? `<div class="granted-by-email">${emailOfGrantedBy}</div>` : ''}
                  </div>
                </div>
                
                ${role ? `
                <div class="detail-item">
                  <div class="detail-label">Your Access Level</div>
                  <div class="detail-value">
                    <span class="role-badge" 
                      style="background-color:${roleStyle.bg}; border:1px solid ${roleStyle.border}; color:${roleStyle.text};">
                      ${role}
                    </span>
                  </div>
                </div>
                ` : ''}
              </div>
            </div>
            
            ${message ? `
            <div class="personal-message">
              <strong>Personal message:</strong><br>
              "${message}"
            </div>
            ` : ''}
            
            <!-- CTA Button -->
            ${folderLink ? `
            <div class="cta-section">
              <a href="${folderLink}" class="btn-primary">
                Open Folder
                <span class="btn-icon">→</span>
              </a>
            </div>
            ` : ''}

          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">
              This is an automated message from <span class="company-name">${companyName}</span>
            </p>
            <p class="footer-text">
              If you believe you received this email in error, please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
