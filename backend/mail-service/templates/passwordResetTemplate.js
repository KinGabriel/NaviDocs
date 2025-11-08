export function buildPasswordResetEmail({ firstname = "", lastname = "", otp = "", appName = "NaviDocs" }) {
  const name = [firstname, lastname].filter(Boolean).join(" ") || "there";
  const subject = `${appName} password reset code`;
  const text = `Hello ${name},\n\nYour password reset code is: ${otp}.\nThis code will expire in ${process.env.RESET_OTP_TTL_MIN || 10} minutes.\n\nIf you did not request this, you can ignore this email.\n\n— ${appName}`;
  const html = `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body { font-family: Arial, sans-serif; background:#f7f9fc; color:#1f2937; }
        .wrap { max-width:560px; margin:24px auto; background:#fff; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,.08); overflow:hidden; }
        .hdr { background:linear-gradient(90deg,#1e3a8a,#3b82f6); padding:18px 24px; color:#fff; }
        .hdr h1 { margin:0; font-size:18px; }
        .bd { padding:24px; }
        .code { font-size:28px; font-weight:700; letter-spacing:6px; padding:14px 16px; text-align:center; border:2px dashed #4c96afff; border-radius:10px; color:#1e3a8a; background:#eff6ff; }
        .muted { color:#6b7280; font-size:12px; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="hdr"><h1>${appName} password reset</h1></div>
        <div class="bd">
          <p>Hi ${name},</p>
          <p>Use the verification code below to reset your password. This code expires in <strong>${process.env.RESET_OTP_TTL_MIN || 10} minutes</strong>.</p>
          <div class="code">${otp}</div>
          <p class="muted" style="margin-top:16px">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
  </html>`;
  return { subject, text, html };
}
