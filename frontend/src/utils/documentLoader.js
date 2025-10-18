// Utility to fetch a document by ID and normalize the response into a
// consistent shape used by editable pages/components.
import { getDocumentByIdAPI } from "../api/documentsAPI";

/**
 * Fetches a document by id and returns a normalized object matching the
 * server DB structure used across the app.
 *
 * Returned shape contains the raw document plus convenient aliases:
 * {
 *   document, _id, title, created_by, school, template_id, from_template,
 *   document_code, revision_no, effectivity, fields, pages_json, pageSetup,
 *   dateFormat, assigned, status, notes, thumbnailUrl, status_meta,
 *   createdAt, updatedAt, rawResponse
 * }
 */
export async function fetchAndNormalizeDocument(id) {
  if (!id) throw new Error("document id required");

  const res = await getDocumentByIdAPI(id);
  console.log("fetchAndNormalizeDocument response:", res);
  const doc = res?.document || res?.data || res || {};

  const _id = doc._id || doc.id;
  const title = doc.title || doc.name || "Untitled Document";
  const created_by = doc.created_by || doc.creator || null;
  const school = doc.school || null;
  const template_id = doc.template_id || (doc.from_template && doc.from_template.id) || null;

  const from_template = doc.from_template || null; 
  const document_code = doc.document_code || (from_template && from_template.document_code) || null;
  const revision_no = doc.revision_no ?? (from_template && from_template.revision_no) ?? null;
  const effectivity = doc.effectivity || (from_template && from_template.effectivity) || null;

  const fields = Array.isArray(doc.fields)
    ? doc.fields
    : (doc.from_template && Array.isArray(doc.from_template.fields) ? doc.from_template.fields : []);
  const field_values = doc.field_values || {};
  const pages_json = Array.isArray(doc.pages_json)
    ? doc.pages_json
    : (doc.pages_json ? [doc.pages_json] : (doc.from_template && Array.isArray(doc.from_template.pages_json) ? doc.from_template.pages_json : []));
  const pageSetup = doc.pageSetup || doc.from_template?.pageSetup || null;
  const dateFormat = doc.dateFormat || null;

  // Normalize logo/header configuration so UI can rely on a single shape
  const rawLogo = doc.logoConfig || doc.from_template?.logoConfig || doc.from_template || {};
  const logoConfig = {
    assets: {
      slu: (rawLogo.assets && rawLogo.assets.slu) || rawLogo.slu || null,
      cicm: (rawLogo.assets && rawLogo.assets.cicm) || rawLogo.cicm || null,
    },
    showSLULogo: rawLogo.showSLULogo ?? rawLogo.show_slu_logo ?? true,
    showCICMLogo: rawLogo.showCICMLogo ?? rawLogo.show_cicm_logo ?? true,
    documentStamp: {
      document_code: rawLogo.document_code || rawLogo.documentCode || document_code || null,
      revision_no: rawLogo.revision_no || rawLogo.revisionNo || revision_no || null,
      effectivity: rawLogo.effectivity || rawLogo.effectivity_date || effectivity || null,
    },
    center: rawLogo.center || rawLogo.center_text || null,
  };

  const assigned = Array.isArray(doc.assigned) ? doc.assigned : [];
  const status = doc.status || "draft";
  const notes = Array.isArray(doc.notes) ? doc.notes : [];
  const thumbnailUrl = doc.thumbnailUrl || doc.thumbnail || null;

  const status_meta = doc.status_meta || {};

  const createdAt = doc.createdAt || doc.created_at || (status_meta && status_meta.createdAt) || null;
  const updatedAt = doc.updatedAt || doc.updated_at || (status_meta && status_meta.updatedAt) || null;

  return {
    document: doc,
    _id,
    title,
    created_by,
    school,
    template_id,
    from_template,
    document_code,
    revision_no,
    effectivity,
    fields,
  field_values,
    pages_json,
    pageSetup,
    dateFormat,
    assigned,
    status,
    notes,
    thumbnailUrl,
    status_meta,
    createdAt,
    updatedAt,
    logoConfig,
    rawResponse: res,
  };
}

export default fetchAndNormalizeDocument;
