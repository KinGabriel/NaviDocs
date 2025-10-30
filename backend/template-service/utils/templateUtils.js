// Utilities for template service

export const validSchools = ['VAA', 'SMI', 'STL'];

export const schoolMap = {
  'University Wide': 'VAA',
  'SAMCIS': 'SMI',
  'STELA': 'STL'
};

export function getSchoolCode(school) {
  return schoolMap[school] || school;
}

export function generateDocumentCode(existingTemplates, schoolIdentifier) {
  const baseCode = `FM-${schoolIdentifier}`;
  let nextSequentialNumber = 1;
  if (existingTemplates.length > 0) {
    const sequentialNumbers = existingTemplates
      .map(template => {
        const parts = (template.document_code || '').split('-');
        return parseInt(parts[2]) || 0;
      })
      .filter(num => !isNaN(num));
    if (sequentialNumbers.length > 0) {
      nextSequentialNumber = Math.max(...sequentialNumbers) + 1;
    }
  }
  const sequentialNumber = nextSequentialNumber.toString().padStart(2, '0');
  return `${baseCode}-${sequentialNumber}`;
}

export function buildApprovalMeta(template, currentUserId) {
  const approvals = template?.status_meta?.approvals || {};
  const leadApproved = !!approvals.lead_document_controller?.approved_at;
  const officerApproved = !!approvals.document_controller_officer?.approved_at;
  const unitAssigned = !!approvals.unit_document_controller?.assigned_to;
  const unitApproved = !!approvals.unit_document_controller?.approved_at;

  const isFullyApproved = leadApproved && officerApproved && (!unitAssigned || unitApproved);

  const hasApprovedCurrentUser = currentUserId ? [
    approvals.lead_document_controller?.approved_by?.toString(),
    approvals.document_controller_officer?.approved_by?.toString(),
    approvals.unit_document_controller?.approved_by?.toString()
  ].includes(currentUserId.toString()) : false;

  const remainingRoles = [
    !leadApproved && 'lead_document_controller',
    !officerApproved && 'document_controller_officer',
    (unitAssigned && !unitApproved) && 'unit_document_controller'
  ].filter(Boolean);

  const canPublish = template.status === 'approved';
  // Legacy aliases for consumers expecting old keys
  const deanApproved = officerApproved; // dean mapped to officer
  const secretaryApproved = leadApproved; // secretary mapped to lead

  return {
    leadApproved,
    officerApproved,
    unitApproved,
    deanApproved,
    secretaryApproved,
    isFullyApproved,
    hasApprovedCurrentUser,
    remainingRoles,
    canPublish
  };
}

export function statusQuery(status) {
  if (!status || status === 'All') return {};
  if (['draft','pending','endorsed','approved','published'].includes(status)) return { status };
  return {};
}
