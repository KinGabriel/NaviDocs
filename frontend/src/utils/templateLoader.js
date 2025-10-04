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

  const pageSetup = tpl.pageSetup || null;
  const fontSettings = tpl.fontSettings || null;
  const headerFooter = tpl.headerFooter || null;
  const dateFormat = tpl.dateFormat || null;
  const editableFields = Array.isArray(tpl.fields) ? tpl.fields : [];

  return {
    template: tpl,
    templateTitle,
    notes,
    status,
    approvals,
    approvalMeta,
    approvers: approversArr,
    templateContent,
    pageSetup,
    fontSettings,
    headerFooter,
    dateFormat,
    editableFields,
    rawResponse: res,
  };
}

export default fetchAndNormalizeTemplate;
