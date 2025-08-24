/**
 * Checks for required fields based on user role.
 * Returns { valid: boolean, error: string }.
 * @param {object} form - The user form object.
 * @returns {{valid: boolean, error: string}}
 */
export function validateUserRoleFields(form) {
  const role = form?.role?.name;
  if (["Faculty", "Document Controller", "Department Head"].includes(role)) {
    if (!form.role.school) {
      return { valid: false, error: "School is required for this role." };
    } else if (!form.role.department) {
      return { valid: false, error: "Department is required for this role." };
    }
  } else if (["Dean", "Secretary"].includes(role)) {
    if (!form.role.school) {
      return { valid: false, error: "School is required for this role." };
    }
  }
  return { valid: true, error: "" };
}
/**
 * Checks if a user form is valid for saving (creation or update).
 * @param {object} form - The user form object.
 * @returns {boolean} True if the form is valid for saving.
 */
export function canSaveUser(form) {
  const emailOk = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|net|org|edu|gov|mil|biz|info|io|co|ph)$/i.test(form.email);
  return (
    form.firstname.trim() &&
    form.lastname.trim() &&
    emailOk &&
    form.role && form.role.name
  );
}
/**
 * Normalize a name string: trims, removes non-letters, collapses spaces, and capitalizes each word.
 * @param {string} val - The name string to normalize.
 * @returns {string} The normalized name.
 */
export function normalizeName(val) {
  return val
    .replace(/^\s+/, "")
    .replace(/[^a-zA-Z\s']/g, "") // allow letters, spaces, apostrophes
    .replace(/\s{2,}/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) =>
      w
        ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        : ""
    )
    .join(" ");
}
