/**
 * Determines the actual status of a submission bin based on its submissions
 * Ensures consistent status across all components
 * NOW: if the bin has an explicit high-level status (active/completed/archived),
 * we always show that on the card and skip auto-computed statuses.
 */
export function getSubmissionBinStatus(bin) {
  if (!bin) return "active";

  const explicit = String(bin.status || "").toLowerCase();

  // 1) HARD OVERRIDE: respect manual bin status from Edit modal
  //    These are the "top-level" states the user can choose.
  if (["active", "completed", "archived"].includes(explicit)) {
    return explicit;
  }

  // 2) No explicit high-level status → fall back to auto logic
  if (!Array.isArray(bin.submissions)) {
    return bin.status || "active";
  }

  const items = bin.submissions;
  if (items.length === 0) return bin.status || "active";

  // Helper: check if submission has documents
  const hasDocuments = (sub) =>
    (Array.isArray(sub.documents) && sub.documents.length > 0) ||
    (sub.document && sub.document !== null);

  // Helper: check if submission is currently returned (since the last resubmission)
  const isReturned = (sub) => {
    if (!sub) return false;
    if (String(sub.status || "").toLowerCase() === "returned") return true;
    const notes = Array.isArray(sub.notes) ? sub.notes : [];
    if (!notes.length) return false;
    let lastResubmitIdx = -1;
    for (let i = notes.length - 1; i >= 0; i--) {
      if (String(notes[i].type || "").toLowerCase() === "resubmitted") {
        lastResubmitIdx = i;
        break;
      }
    }
    const windowNotes =
      lastResubmitIdx >= 0 ? notes.slice(lastResubmitIdx + 1) : notes;
    return windowNotes.some(
      (n) => String(n.type || "").toLowerCase() === "returned"
    );
  };

  // Check if ALL submissions are returned
  const allReturned = items.every((sub) => isReturned(sub));
  if (allReturned) return "returned";

  // Check if SOME submissions are returned
  const someReturned = items.some((sub) => isReturned(sub));
  if (someReturned) return "pending";

  // Check if there are any unsubmitted items (no documents or no submitted_at)
  // This includes newly added faculty after initial completion
  const hasUnsubmitted = items.some(
    (sub) => !hasDocuments(sub) || !sub.submitted_at
  );
  if (hasUnsubmitted) {
    const deadline = bin.deadline ? new Date(bin.deadline) : null;
    const now = new Date();
    if (deadline && deadline < now) {
      return "overdue";
    }
    return "pending";
  }

  // Check if all submitted (has documents AND submitted_at)
  const allSubmitted =
    items.length > 0 &&
    items.every((sub) => hasDocuments(sub) && sub.submitted_at);

  if (allSubmitted && !someReturned) {
    return "completed";
  }

  // Otherwise use bin's actual status
  return bin.status || "active";
}
