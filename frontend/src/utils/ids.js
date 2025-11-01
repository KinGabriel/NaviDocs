// src/utils/ids.js

/**
 * Generates a short, collision-resistant unique ID.
 * Used for accordions, fields, and tags.
 * 
 * Format example: "fld-8gkx1z7n"
 */

export function makeId(prefix = "fld") {
  const randomPart = Math.random().toString(36).substring(2, 9);
  const timestampPart = Date.now().toString(36).substring(5);
  return `${prefix}-${randomPart}${timestampPart}`;
}

/**
 * Creates a UUID-style ID (less readable but more unique).
 * Example: "a3e3b5a2-6d7f-4fcd-b82b-4a18d7cbf9e3"
 */
export function makeUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a compact numeric ID.
 * Example: "1726215321297-582"
 */
export function makeNumericId() {
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
