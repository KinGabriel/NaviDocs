const roleLabel = (r) => (r === 'DEAN' ? 'the Dean' : r === 'SECRETARY' ? 'the Secretary' : 'an authorized user');


export const buildAssignmentEmail = ({ actor, template, assignmentType, deadline, recipient }) => {
  const subject = `[NaviDocs] You were assigned: ${template.name} (${template.code})`;
  const effectivity = template.effectivityDate ? new Date(template.effectivityDate).toLocaleDateString() : null;
  const deadlineStr = deadline ? new Date(deadline).toLocaleString() : null;


  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial">
      <h2>New Template Assignment</h2>
      <p>Hi ${recipient.name || 'there'},</p>
      <p>${roleLabel(actor.role)} <strong>${actor.name}</strong> assigned you to:</p>
      <ul>
        <li><strong>${template.name}</strong> <code>(${template.code})</code></li>
        <li>Revision: <strong>${template.revision ?? 0}</strong></li>
        ${effectivity ? `<li>Effectivity: <strong>${effectivity}</strong></li>` : ''}
        <li>Assignment type: <strong>${assignmentType}</strong></li>
        ${deadlineStr ? `<li>Deadline: <strong>${deadlineStr}</strong></li>` : ''}
      </ul>
      <p>Open NaviDocs to review and proceed.</p>
      <hr/><small>Automated notification • NaviDocs</small>
    </div>
  `;


  const text =
`New Template Assignment


${roleLabel(actor.role)} ${actor.name} assigned you to:
- ${template.name} (${template.code})
- Revision: ${template.revision ?? 0}
${effectivity ? `- Effectivity: ${effectivity}\n` : ''}- Assignment type: ${assignmentType}
${deadlineStr ? `- Deadline: ${deadlineStr}\n` : ''}
Open NaviDocs to review and proceed.`;


  return { subject, html, text };
}
