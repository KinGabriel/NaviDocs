// User-related dropdown options for reuse across components
export const ROLE_OPTIONS = [
  "Admin",
  "Faculty",
  "Dean",
  "Department Head",
  "Secretary",
  "Unit Document Controller",
  "Lead Document Controller",
  "Document Control Officer"
];

export const SCHOOL_OPTIONS = [
  { value: "SAS", label: "School of Advanced Studies (SAS)" },
  { value: "SAMCIS", label: "School of Accountancy, Management, Computing and Information Studies (SAMCIS)" },
  { value: "SEA", label: "School of Engineering and Architecture (SEA)" },
  { value: "SOL", label: "School of Law (SOL)" },
  { value: "SOM", label: "School of Medicine (SOM)" },
  { value: "SOHNABS", label: "School of Nursing, Allied Health, and Biological Sciences (SOHNABS)" },
  { value: "STELA", label: "School of Teacher Education and Liberal Arts (STELA)" },
];

export const DEPARTMENT_OPTIONS = {
  SAS: ["Department of Social Sciences", "Department of Natural Sciences"],
  SAMCIS: ["Department of Accountancy", "Department of Management", "Department of Computing and Information Studies"],
  SEA: ["Chemical Engineering", "Civil Engineering", "Architecture"],
  SOL: ["Department of Law"],
  SOM: ["Department of Medicine"],
  SOHNABS: ["Department of Nursing", "Department of Allied Health", "Department of Biological Sciences"],
  STELA: ["Department of Teacher Education", "Department of Liberal Arts"],
};

export const YEAR_OPTIONS = ["—", "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];

// Document-related options
// Allowed prefixes for document codes (e.g., FM-VAA-001)
export const DOCUMENT_PREFIX_OPTIONS = [
  'FM',
  'PM'
];

// Allowed identifiers (middle segment) for document codes
export const DOCUMENT_IDENTIFIER_OPTIONS = [
  'VAA', // University-wide
  'SMI', // SAMCIS
  'STL', // STELA
];

// Mapping of school labels to identifier codes
export const SCHOOL_TO_IDENTIFIER_MAP = {
  'University Wide': 'VAA',
  'SAMCIS': 'SMI',
  'STELA': 'STL',
};
