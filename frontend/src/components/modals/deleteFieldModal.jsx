import React from "react";
import PermanentlyDeleteDocumentModal from "./permanentlyDeleteDocumentModal";

export default function DeleteFieldModal({
  open,
  onClose,
  onConfirm,
  submitting = false,
  error = "",
  fieldName = "",
}) {
  return (
    <PermanentlyDeleteDocumentModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      submitting={submitting}
      error={error}
      title="Delete Field"
      message="This will remove this field from the template. This action cannot be undone."
      confirmLabel="Delete"
      itemTitle={fieldName}
    />
  );
}