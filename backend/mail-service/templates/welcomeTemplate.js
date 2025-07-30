export const welcomeEmailTemplate = ({ firstname, lastname, email, password, role}) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4c96afff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background-color: #f9f9f9; }
            .password-box { 
                background-color: #e7f3ff; 
                border: 2px solid #4c96afff; 
                padding: 20px; 
                margin: 20px 0; 
                border-radius: 8px; 
                text-align: center;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .warning { color: #d9534f; font-weight: bold; margin: 15px 0; }
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
                <h1>Welcome to NaviDocs!</h1>
            </div>
            <div class="content">
                <h2>Hello ${firstname} ${lastname},</h2>
                <p>Your account has been successfully created! We're excited to have you on board.</p>
                
                <div class="password-box">
                    <h3>🔐 Your Login Credentials</h3>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Temporary Password:</strong> <code style="font-size: 18px; font-weight: bold; color: #4CAF50;">${password}</code></p>
                    <p><strong>Role:</strong> ${role?.name || 'Not specified'}</p>
                </div>
                
                <div class="warning">
                    ⚠️ Important: Please change your password after your first login for security purposes.
                </div>
                
                <p>You can now access your account and start using NaviDocs to manage your documents efficiently.</p>
                
                <center>
                    <a href="${process.env.FRONTEND_URL}/login" class="btn">Login to Your Account</a>
                </center>
                
                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                
                <p>Best regards,<br><strong>The NaviDocs Team</strong></p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>© ${new Date().getFullYear()} NaviDocs. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};