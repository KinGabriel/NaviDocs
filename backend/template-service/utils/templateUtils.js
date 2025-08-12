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
