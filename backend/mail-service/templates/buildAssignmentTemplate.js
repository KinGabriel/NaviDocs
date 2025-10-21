const roleLabel = (r) => {
  if (!r) return 'an authorized user';
  const s = String(r).toLowerCase();
  if (s.includes('dean')) return 'The Dean';
  if (s.includes('secretary')) return 'The Secretary';
  return 'An authorized user';
};

export const buildAssignmentEmail = ({ actor = {}, template = {}, assignmentType = '', deadline = null, recipient = {}, now = null, notes = [], instructions = '' } = {}) => {
  const subject = `[NaviDocs] You were assigned: ${template.name || 'a template'}${template.code ? ` (${template.code})` : ''}`;
  const effectivity = template.effectivityDate ? new Date(template.effectivityDate).toLocaleDateString() : null;
  const deadlineStr = deadline ? new Date(deadline).toLocaleString() : null;
  const nowStr = now ? new Date(now).toLocaleString() : new Date().toLocaleString();

  // Normalize notes (caller may pass null) and render if present
  const notesArr = Array.isArray(notes) ? notes : [];
  const notesHtml = notesArr.length
    ? `<div style="margin-top:12px"><strong>:</strong><ul style="margin-top:6px">${notesArr.slice(0,5).map(n => `<li>${(n?.message || n).toString()}</li>`).join('')}</ul></div>`
    : '';

  const companyName = process.env.COMPANY_NAME || 'NaviDocs';

  // Determine if recipient should receive this as an approver/reviewer role
  const recipientRoleRaw = (recipient?.role || '')?.toString().toLowerCase() || '';
  let recipientAssignmentRole = null; // human label: 'Approver/Reviewer' when recipient is a dean or secretary
  if (recipientRoleRaw.includes('dean') || recipientRoleRaw.includes('secretary')) {
    recipientAssignmentRole = 'Approver/Reviewer';
  }

  const displayAssignmentType = assignmentType || (recipientAssignmentRole ? recipientAssignmentRole.toLowerCase() : 'shared');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Template Assignment - ${companyName}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#f9fafb; margin:0; color:#111827 }
        .wrapper { padding:20px; }
        .container { max-width:680px; margin:0 auto; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 6px 18px rgba(16,24,40,0.06) }
        .header { background: linear-gradient(135deg,#0035DA 0%,#043485 100%); color:#fff; padding:28px 30px; text-align:left }
        .header h1 { margin:0; font-size:20px }
        .content { padding:28px 30px; color:#374151 }
        .greeting { font-size:18px; font-weight:600; margin-bottom:8px }
        .lead { color:#4b5563; margin-bottom:18px }
        .card { background: linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%); border:1px solid #0ea5e9; padding:18px; border-radius:8px }
        .card .title { font-weight:700; color:#0c4a6e; font-size:16px }
        .meta { margin-top:12px; display:flex; gap:12px; flex-wrap:wrap }
        .meta .item { background:#fff; padding:8px 10px; border-radius:6px; border:1px solid #e6edf6; font-size:13px }
        .instructions { margin-top:18px; background:#f8fafc; padding:14px; border-left:4px solid #c7f0ff; border-radius:6px; color:#0f172a }
        .notes { margin-top:14px; }
        .cta { text-align:center; margin:22px 0 }
  .btn { display:inline-block; padding:12px 22px; background:linear-gradient(135deg,#0035DA 0%,#043485 100%); color:#fff !important; -webkit-text-fill-color: #fff; text-decoration:none; border-radius:8px; font-weight:700; box-shadow: 0 6px 18px rgba(3,7,18,0.12); text-shadow: 0 1px 2px rgba(0,0,0,0.25); border: none }
        .footer { background:#f9fafb; padding:18px 30px; text-align:center; color:#6b7280; font-size:13px }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1>Template Assignment</h1>
          </div>
          <div class="content">
            <div class="greeting">${recipient.name ? `Hi ${recipient.name},` : 'Hello,'}</div>
            <div class="lead">${roleLabel(actor.role)} <strong>${actor.name || ''}</strong> ${recipientAssignmentRole ? `assigned you as <strong>${recipientAssignmentRole}</strong> for the following:` : `assigned you a template${template.code ? ` (${template.code})` : ''}.`}</div>

            <div class="card">
              <div class="title">${template.name || 'Untitled Template'}</div>
              <div class="meta">
                <div class="item">Revision: ${template.revision ?? 0}</div>
                ${effectivity ? `<div class="item">Effectivity: ${effectivity}</div>` : ''}
                <div class="item">Type: ${displayAssignmentType}</div>
                ${deadlineStr ? `<div class="item">Deadline: ${deadlineStr}</div>` : ''}
                <div class="item">When: ${nowStr}</div>
              </div>
            </div>

            ${instructions ? `<div class="instructions"><strong>Instructions</strong><div style="margin-top:8px">${instructions}</div></div>` : ''}

            ${notesHtml ? `<div class="notes"><strong>Notes</strong>${notesHtml.replace(/^<div[^>]*>/,'').replace(/<\/div>$/,'')}</div>` : ''}

            <div class="cta">
              <a class="btn" href="${process.env.FRONTEND_URL || '#'}">Open in ${companyName}</a>
            </div>

          </div>
          <div class="footer">Automated notification • ${companyName}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Plain-text fallback (concise)
  const textLines = [];
  textLines.push('Template Assignment');
  textLines.push('');
  textLines.push(`${roleLabel(actor.role)} ${actor.name || ''} assigned you to: ${template.name || 'Template'}${template.code ? ` (${template.code})` : ''}`);
  textLines.push(`Revision: ${template.revision ?? 0}`);
  if (effectivity) textLines.push(`Effectivity: ${effectivity}`);
  textLines.push(`Type: ${displayAssignmentType}`);
  if (deadlineStr) textLines.push(`Deadline: ${deadlineStr}`);
  textLines.push(`When: ${nowStr}`);
  if (instructions) {
    textLines.push('');
    textLines.push('Instructions:');
    textLines.push(instructions);
  }
  if (notesArr.length) {
    textLines.push('');
    textLines.push('Notes:');
    notesArr.slice(0,5).forEach(n => textLines.push(`- ${n?.message || n}`));
  }
  textLines.push('');
  textLines.push(`Open ${companyName}: ${process.env.FRONTEND_URL || ''}`);

  const text = textLines.join('\n');

  return { subject, html, text };
};
