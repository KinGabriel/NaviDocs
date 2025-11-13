/**
 * Determines the actual status of a submission bin based on its submissions
 * Ensures consistent status across all components
 */
export function getSubmissionBinStatus(bin) {
  if (!bin || !Array.isArray(bin.submissions)) {
    return bin?.status || 'active';
  }
  
  const items = bin.submissions;
  if (items.length === 0) return bin.status || 'active';
  
  // Helper: check if submission has documents
  const hasDocuments = (sub) => 
    (Array.isArray(sub.documents) && sub.documents.length > 0) || 
    (sub.document && sub.document !== null);
  
  // Helper: check if submission is currently returned (since the last resubmission)
  const isReturned = (sub) => {
    if (!sub) return false;
    if (String(sub.status || '').toLowerCase() === 'returned') return true;
    const notes = Array.isArray(sub.notes) ? sub.notes : [];
    if (!notes.length) return false;
    let lastResubmitIdx = -1;
    for (let i = notes.length - 1; i >= 0; i--) {
      if (String(notes[i].type || '').toLowerCase() === 'resubmitted') { lastResubmitIdx = i; break; }
    }
    const windowNotes = lastResubmitIdx >= 0 ? notes.slice(lastResubmitIdx + 1) : notes;
    return windowNotes.some(n => String(n.type || '').toLowerCase() === 'returned');
  };
  
  // Check if ALL submissions are returned
  const allReturned = items.every(sub => isReturned(sub));
  if (allReturned) return 'returned';
  
  // Check if SOME submissions are returned
  const someReturned = items.some(sub => isReturned(sub));
  if (someReturned) return 'pending';
  
  // Check if overdue (has deadline passed and not completed, and no returned submissions)
  const deadline = bin.deadline ? new Date(bin.deadline) : null;
  const now = new Date();
  if (deadline && deadline < now && bin.status !== 'completed' && !someReturned) {
    return 'overdue';
  }
  
  // Check if all submitted (has documents AND submitted_at)
  const allSubmitted = items.length > 0 && items.every(sub => 
    hasDocuments(sub) && sub.submitted_at
  );
  
  if (allSubmitted && !someReturned) {
    return 'completed';
  }
  
  // Otherwise use bin's actual status
  return bin.status || 'active';
}

/**
 * Determines the status of an individual submission item
 */
export function getSubmissionItemStatus(submissionItem, binDeadline) {
  if (!submissionItem) return 'pending';
  
  // Check if returned
  const isReturned = (() => {
    if (!submissionItem) return false;
    if (String(submissionItem.status || '').toLowerCase() === 'returned') return true;
    const notes = Array.isArray(submissionItem.notes) ? submissionItem.notes : [];
    if (!notes.length) return false;
    let lastResubmitIdx = -1;
    for (let i = notes.length - 1; i >= 0; i--) {
      if (String(notes[i].type || '').toLowerCase() === 'resubmitted') { lastResubmitIdx = i; break; }
    }
    const windowNotes = lastResubmitIdx >= 0 ? notes.slice(lastResubmitIdx + 1) : notes;
    return windowNotes.some(n => String(n.type || '').toLowerCase() === 'returned');
  })();
  
  if (isReturned) return 'returned';
  
  // Check if has documents
  const hasDocuments = (Array.isArray(submissionItem.documents) && submissionItem.documents.length > 0) || 
    (submissionItem.document && submissionItem.document !== null);
  
  // Check if submitted (has documents AND submitted_at timestamp)
  if (hasDocuments && submissionItem.submitted_at) {
    return 'submitted';
  }
  
  // Check if overdue
  if (binDeadline && new Date(binDeadline) < new Date() && !hasDocuments) {
    return 'overdue';
  }
  
  // Default to pending
  return 'pending';
}