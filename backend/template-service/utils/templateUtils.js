import axios from "axios";
import puppeteer from "puppeteer";
import FormData from "form-data";

/**

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
    const sequentialNumbers = existingTemplates.map(template => {
      const parts = template.document_code.split('-');
      return parseInt(parts[2]) || 0;
    }).filter(num => !isNaN(num));
    if (sequentialNumbers.length > 0) {
      nextSequentialNumber = Math.max(...sequentialNumbers) + 1;
    }
  }
  const sequentialNumber = nextSequentialNumber.toString().padStart(2, '0');
  return `${baseCode}-${sequentialNumber}`;
}
export function buildApprovalMeta(template, currentUserId) {
  const approvals = template?.status_meta?.approvals || {};
  const deanApproved = !!approvals.dean?.approved_at;
  const secretaryApproved = !!approvals.secretary?.approved_at;
  const isFullyApproved = deanApproved && secretaryApproved;
  const hasApprovedCurrentUser = currentUserId ? [approvals.dean?.approved_by?.toString(), approvals.secretary?.approved_by?.toString()].includes(currentUserId.toString()) : false;
  const remainingRoles = [!deanApproved && 'dean', !secretaryApproved && 'secretary'].filter(Boolean);
  const canPublish = template.status === 'approved';
  return { deanApproved, secretaryApproved, isFullyApproved, hasApprovedCurrentUser, remainingRoles, canPublish };
}
export function statusQuery(status) {
  if (!status || status === 'All') return {};
  if (['draft','pending','approved','published'].includes(status)) return { status };
  return {};
/**
 * List of valid school codes.
 * @type {string[]}
 */
export const validSchools = ['VAA', 'SMI', 'STL'];

/**
 * Maps school names to their codes.
 * @type {Object.<string, string>}
 */
export const schoolMap = {
  'University Wide': 'VAA',
  'SAMCIS': 'SMI',
  'STELA': 'STL'
};

/**
 * Returns the school code for a given school name.
 * @param {string} school - The school name or code.
 * @returns {string} - The school code.
 */
export function getSchoolCode(school) {
  return schoolMap[school] || school;
}

/**
 * Generates a new document code for a template based on existing templates and school identifier.
 * @param {Array} existingTemplates - Array of existing template objects.
 * @param {string} schoolIdentifier - The school code (e.g., 'VAA').
 * @returns {string} - The generated document code (e.g., 'FM-VAA-01').
 */
export function generateDocumentCode(existingTemplates, schoolIdentifier) {
  const baseCode = `FM-${schoolIdentifier}`;
  let nextSequentialNumber = 1;

  if (existingTemplates.length > 0) {
    const sequentialNumbers = existingTemplates.map(template => {
      const parts = template.document_code.split('-');
      return parseInt(parts[2]) || 0;
    }).filter(num => !isNaN(num));
    if (sequentialNumbers.length > 0) {
      nextSequentialNumber = Math.max(...sequentialNumbers) + 1;
    }
  }

  const sequentialNumber = nextSequentialNumber.toString().padStart(2, '0');
  return `${baseCode}-${sequentialNumber}`;
}

/**
 * Builds approval meta summary for a template and current user.
 * @param {Object} template - Mongoose template document or plain object.
 * @param {string|ObjectId} currentUserId - Current user id.
 * @returns {{deanApproved:boolean, secretaryApproved:boolean, isFullyApproved:boolean, hasApprovedCurrentUser:boolean, remainingRoles:string[], canPublish:boolean}}
 */
export function buildApprovalMeta(template, currentUserId) {
  const approvals = template?.status_meta?.approvals || {};
  const deanApproved = !!approvals.dean?.approved_at;
  const secretaryApproved = !!approvals.secretary?.approved_at;
  const isFullyApproved = deanApproved && secretaryApproved;
  const hasApprovedCurrentUser = currentUserId ? [approvals.dean?.approved_by?.toString(), approvals.secretary?.approved_by?.toString()].includes(currentUserId.toString()) : false;
  const remainingRoles = [!deanApproved && 'dean', !secretaryApproved && 'secretary'].filter(Boolean);
  const canPublish = template.status === 'approved';
  return { deanApproved, secretaryApproved, isFullyApproved, hasApprovedCurrentUser, remainingRoles, canPublish };
}

/**
 * Builds a MongoDB query fragment for a given status filter.
 * @param {string} status
 * @returns {Object}
 */
export function statusQuery(status) {
  if (!status || status === 'All') return {};
  if (['draft','pending','approved','published'].includes(status)) return { status };
  return {};
}
