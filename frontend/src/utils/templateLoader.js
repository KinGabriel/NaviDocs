// Utility to fetch a template by ID and normalize the response into a
// consistent shape used by various pages/components.
import { getTemplateByIdAPI } from "../api/documentContollerAPI";

const DEFAULT_CONTENT = null;

/**
 * Fetches a template by id and returns a normalized object with commonly
 * needed fields. Throws on error so callers can handle it.
 *
 * Returned shape:
 * {
 *   template, templateTitle, notes, status, approvals, approvalMeta,
 *   approvers, templateContent, pageSetup, fontSettings, headerFooter,
 *   dateFormat, editableFields, rawResponse
 * }
 */
export async function fetchAndNormalizeTemplate(id) {
  if (!id) throw new Error("template id required");

  const res = await getTemplateByIdAPI(id);
  // Normalize server response shapes
  const tpl = res?.template || res?.data || res || {};

  const templateTitle = tpl.title || "Untitled Template";
  const notes = Array.isArray(tpl.notes) ? tpl.notes : [];
  const status = tpl.status || "draft";
  const approvals = tpl.approvals || null;
  const approvalMeta = tpl.approvalMeta || null;

  // Build approvers array (compatible with different response shapes)
  const approvalsObj = tpl.approvals || (tpl.status_meta && tpl.status_meta.approvals) || {};
  const approversArr = [];

  // Approver roles
  if (approvalsObj.document_controller_officer && approvalsObj.document_controller_officer.assigned_to) {
    approversArr.push({
      _id: approvalsObj.document_controller_officer.assigned_to,
      id: approvalsObj.document_controller_officer.assigned_to,
  name: approvalsObj.document_controller_officer.assigned_to_name || 'Document Control Officer',
      firstname: approvalsObj.document_controller_officer.assigned_to_firstname,
      lastname: approvalsObj.document_controller_officer.assigned_to_lastname,
  role: { name: 'Document Control Officer' },
      ...approvalsObj.document_controller_officer
    });
  }
  if (approvalsObj.lead_document_controller && approvalsObj.lead_document_controller.assigned_to) {
    approversArr.push({
      _id: approvalsObj.lead_document_controller.assigned_to,
      id: approvalsObj.lead_document_controller.assigned_to,
      name: approvalsObj.lead_document_controller.assigned_to_name || 'Lead Document Controller',
      firstname: approvalsObj.lead_document_controller.assigned_to_firstname,
      lastname: approvalsObj.lead_document_controller.assigned_to_lastname,
      role: { name: 'Lead Document Controller' },
      ...approvalsObj.lead_document_controller
    });
  }
  // Legacy roles (for backwards compatibility)
  if (approvalsObj.dean && approvalsObj.dean.assigned_to) {
    approversArr.push({
      _id: approvalsObj.dean.assigned_to,
      id: approvalsObj.dean.assigned_to,
      name: approvalsObj.dean.assigned_to_name || 'Dean',
      firstname: approvalsObj.dean.assigned_to_firstname,
      lastname: approvalsObj.dean.assigned_to_lastname,
      role: { name: 'Dean' },
      ...approvalsObj.dean
    });
  }
  if (approvalsObj.secretary && approvalsObj.secretary.assigned_to) {
    approversArr.push({
      _id: approvalsObj.secretary.assigned_to,
      id: approvalsObj.secretary.assigned_to,
      name: approvalsObj.secretary.assigned_to_name || 'Secretary',
      firstname: approvalsObj.secretary.assigned_to_firstname,
      lastname: approvalsObj.secretary.assigned_to_lastname,
      role: { name: 'Secretary' },
      ...approvalsObj.secretary
    });
  }

  const templateContent = (tpl.pages_json && tpl.pages_json.length > 0) ? tpl.pages_json[0] : DEFAULT_CONTENT;

  // Normalize pages: treat each pages_json entry as a page document.
  let templatePages = [];
  if (Array.isArray(tpl.pages_json) && tpl.pages_json.length > 0) {
    templatePages = tpl.pages_json.map(p => (p && p.type === 'doc' ? p : { type: 'doc', content: p?.content || [] }));
  } else if (templateContent) {
    templatePages = [{ type: 'doc', content: templateContent.content || [] }];
  } else {
    templatePages = [];
  }

  const pageSetup = tpl.pageSetup || null;
  const fontSettings = tpl.fontSettings || null;
  // Prefer explicit logoConfig, fall back to older headerFooter/header_footer shapes.
  // Keep a single canonical `logoConfig` to avoid redundancy in the UI.
  const logoConfig = tpl.logoConfig || tpl.headerFooter || tpl.header_footer || null;
  // Keep a small compatibility reference to the older headerFooter shape
  const headerFooter = tpl.headerFooter || tpl.header_footer || null;
  const dateFormat = tpl.dateFormat || null;
  const editableFields = Array.isArray(tpl.fields) ? tpl.fields : [];

  // Helper: try to parse an effectivity/date-like value into ISO when possible
  const normalizeEffectivity = (val) => {
    if (val === undefined || val === null || val === '') return null;
    // Support MongoDB Extended JSON: { $date: "ISO" }
    if (typeof val === 'object' && val.$date) return val.$date;
    // If it's already a Date
    if (val instanceof Date) return val.toISOString();
    // If it's a numeric timestamp
    if (typeof val === 'number' && !isNaN(val)) {
      const d = new Date(val);
      return isNaN(d) ? null : d.toISOString();
    }
    // If it's a string, try Date parsing - fall back to original string if unparsable
    if (typeof val === 'string') {
      const d = new Date(val);
      return isNaN(d) ? val : d.toISOString();
    }
    return null;
  };

  // Derive top-level document stamp values from several possible shapes for
  // compatibility with older data.
  const document_code = (
    tpl.document_code ?? tpl.docCode ?? tpl.documentStamp?.docCode ?? logoConfig?.documentStamp?.docCode ?? headerFooter?.documentStamp?.docCode ?? ""
  );
  const revision_no = (
    tpl.revision_no ?? tpl.revisionNo ?? tpl.documentStamp?.revisionNo ?? logoConfig?.documentStamp?.revisionNo ?? headerFooter?.documentStamp?.revisionNo ?? 0
  );
  const effectivityRaw = (
    tpl.effectivity ?? tpl.effectivityDate ?? tpl.documentStamp?.effectivity ?? logoConfig?.documentStamp?.effectivity ?? null
  );
  const effectivity = normalizeEffectivity(effectivityRaw);

  return {
    template: tpl,
    templateTitle,
    notes,
    status,
    approvals,
    approvalMeta,
    approvers: approversArr,
    templateContent,
    templatePages,
    pageSetup,
    fontSettings,
    logoConfig,
    document_code,
    revision_no,
    effectivity,
    dateFormat,
    editableFields,
    rawResponse: res,
  };
}

export default fetchAndNormalizeTemplate;
