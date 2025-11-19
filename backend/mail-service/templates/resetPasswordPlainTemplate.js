export const resetPasswordPlainTemplate = ({ firstname = '', lastname = '', email = '', password = '', role = {}, appName = 'NaviDocs' }) => {
  const name = [firstname, lastname].filter(Boolean).join(' ') || 'there';
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body { font-family: Arial, sans-serif; background:#f7f9fc; color:#1f2937; }
        .wrap { max-width:600px; margin:24px auto; background:#fff; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,.06); overflow:hidden; }
        .hdr { background:linear-gradient(90deg,#1e3a8a,#3b82f6); padding:18px 24px; color:#fff; }
        .hdr h1 { margin:0; font-size:18px; }
        .bd { padding:24px; }
        .creds { font-size:16px; padding:14px 16px; text-align:left; border-radius:8px; background:#f1f9ff; border:1px solid rgba(59,130,246,0.12); }
        .muted { color:#6b7280; font-size:13px; }
        .btn { display:inline-block; padding:10px 18px; background:#1e3a8a; color:#fff; border-radius:6px; text-decoration:none; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="hdr"><h1>${appName} — Password Reset</h1></div>
        <div class="bd">
          <p>Hi ${name},</p>
          <p>Your password has been reset by an administrator. Use the credentials below to sign in, then change your password from your account settings.</p>

          <div class="creds">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> <code style="font-size:16px; font-weight:700; color:#0b5fff;">${password}</code></p>
            <p><strong>Role:</strong> ${role?.name || 'Not specified'}</p>
          </div>

          <p style="margin-top:14px" class="muted">For security, this temporary password will remain valid until you change it. If you did not request this change, contact your administrator immediately.</p>

          <p style="margin-top:18px">Best regards,<br/><strong>The ${appName} Team</strong></p>
        </div>
      </div>
    </body>
  </html>
  `;
};
