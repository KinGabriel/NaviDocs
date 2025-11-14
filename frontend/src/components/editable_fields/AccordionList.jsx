// src/components/editable_fields/accordionList.jsx
import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import TagPicker from "./tagPicker";
import { makeId } from "../../utils/ids";
import PermanentlyDeleteDocumentModal from "../modals/permanentlyDeleteDocumentModal";
import DeleteFieldModal from "../modals/deleteFieldModal";
import SimpleMessageModal from "../modals/simpleMessageModal";
import { DEFAULT_FONT_CATEGORIES, SYSTEM_FALLBACKS } from "../../utils/textFonts";

const DATE_FORMAT_PRESETS = [
  { value: "YYYY-MM-DD", label: "2025-03-15 (YYYY-MM-DD)", example: "2025-03-15" },
  { value: "DD/MM/YYYY", label: "15/03/2025 (DD/MM/YYYY)", example: "15/03/2025" },
  { value: "MM/DD/YYYY", label: "03/15/2025 (MM/DD/YYYY)", example: "03/15/2025" },
];

// Get a default font family based on your font config
const DEFAULT_FAMILY =
  (DEFAULT_FONT_CATEGORIES?.Sans && DEFAULT_FONT_CATEGORIES.Sans[0]) ||
  (Object.values(DEFAULT_FONT_CATEGORIES)[0] &&
    Object.values(DEFAULT_FONT_CATEGORIES)[0][0]) ||
  "Inter";

// Normalize group style object
function normalizeGroupStyle(style) {
  const fontFamily = style?.fontFamily || DEFAULT_FAMILY;
  const fontSize =
    typeof style?.fontSize === "number" && style.fontSize > 0 ? style.fontSize : 11;
  const bold = !!style?.bold;
  const italic = !!style?.italic;
  const color = style?.color || "#000000";

  return { fontFamily, fontSize, bold, italic, color };
}

// Resolve CSS font-family string for preview (uses SYSTEM_FALLBACKS map)
function resolveFontCSS(family) {
  return SYSTEM_FALLBACKS[family] || family || "system-ui, sans-serif";
}

export default function AccordionList({
  accordions = [],
  setAccordions = () => {},
  tagsRegistry = [],
  onInsertField = () => {},
  onRemoveField = () => {},
  onUpdateField = () => {},
  onSaveGroup = () => {},
  onBrowse = () => {},
  isSignedIn = false,
}) {
  const [expanded, setExpanded] = useState({});
  const [renaming, setRenaming] = useState({});
  const [renameDraft, setRenameDraft] = useState({});
  const [newAccordionName, setNewAccordionName] = useState("");
  const [groupNameError, setGroupNameError] = useState("");
  const [newFieldData, setNewFieldData] = useState({
    name: "",
    type: "text",
    placeholder: "",
    instructions: "",
    dateFormat: "YYYY-MM-DD",
  });

  // DELETE GROUP MODAL
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [targetGroup, setTargetGroup] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  // DELETE FIELD MODAL
  const [deleteFieldOpen, setDeleteFieldOpen] = useState(false);
  const [targetField, setTargetField] = useState(null);
  const [targetFieldGroupId, setTargetFieldGroupId] = useState(null);
  const [submittingFieldDelete, setSubmittingFieldDelete] = useState(false);
  const [deleteFieldErr, setDeleteFieldErr] = useState("");

  // SIMPLE ALERT MODAL
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  // Flatten font options from DEFAULT_FONT_CATEGORIES
  const fontOptions = useMemo(() => {
    const set = new Set();
    if (DEFAULT_FONT_CATEGORIES && typeof DEFAULT_FONT_CATEGORIES === "object") {
      Object.values(DEFAULT_FONT_CATEGORIES).forEach((arr) => {
        if (Array.isArray(arr)) {
          arr.forEach((name) => {
            if (typeof name === "string") set.add(name);
          });
        }
      });
    }
    const arr = Array.from(set);
    return arr.length ? arr : ["Inter", "Arial", "Times New Roman"];
  }, []);

  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOpen(true);
  };

  const toggleAccordion = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addAccordion = () => {
    const name = newAccordionName.trim();

    if (!name) {
      setGroupNameError("Group name is required.");
      return;
    }

    const exists = accordions.some(
      (a) => a.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      setGroupNameError("A group with this name already exists. Please use another name.");
      return;
    }

    const newAcc = {
      id: makeId("grp"),
      name,
      fields: [],
      style: normalizeGroupStyle({}), // initialize font settings
    };

    setAccordions((prev) => [...prev, newAcc]);
    setNewAccordionName("");
    setGroupNameError("");
  };

  const removeAccordion = (id) => {
    const acc = accordions.find((a) => a.id === id);
    setTargetGroup(acc || null);
    setDeleteErr("");
    setDeleteOpen(true);
  };

  const onConfirmDeleteGroup = async () => {
    try {
      setSubmittingDelete(true);

      if (accordions.length <= 1) {
        setDeleteErr("At least one group is required. You cannot delete the last group.");
        return;
      }

      const groupId = targetGroup?.id;
      if (!groupId) {
        setDeleteErr("Failed to identify group to delete.");
        return;
      }

      if (targetGroup && Array.isArray(targetGroup.fields)) {
        targetGroup.fields.forEach((f) => {
          if (f?.id) onRemoveField(f.id);
        });
      }

      setAccordions((prev) => prev.filter((a) => a.id !== groupId));
      setDeleteOpen(false);
      setTargetGroup(null);
    } catch (e) {
      setDeleteErr(e?.message || "Failed to delete group.");
    } finally {
      setSubmittingDelete(false);
    }
  };

  // OPEN FIELD DELETE MODAL
  const askDeleteField = (accordionId, field) => {
    setTargetField(field);
    setTargetFieldGroupId(accordionId);
    setDeleteFieldErr("");
    setDeleteFieldOpen(true);
  };

  // CONFIRM FIELD DELETE
  const onConfirmDeleteField = async () => {
    try {
      setSubmittingFieldDelete(true);

      if (!targetFieldGroupId || !targetField?.id) {
        setDeleteFieldErr("Failed to identify field to delete.");
        return;
      }

      setAccordions((prev) =>
        prev.map((a) =>
          a.id === targetFieldGroupId
            ? { ...a, fields: a.fields.filter((f) => f.id !== targetField.id) }
            : a
        )
      );

      onRemoveField(targetField.id);

      setDeleteFieldOpen(false);
      setTargetField(null);
      setTargetFieldGroupId(null);
    } catch (e) {
      setDeleteFieldErr(e?.message || "Failed to delete field.");
    } finally {
      setSubmittingFieldDelete(false);
    }
  };

  const addField = (accordionId) => {
    const nameTrimmed = newFieldData.name.trim();

    if (!nameTrimmed) {
      showAlert("Field Name Required", "Field name is required.");
      return;
    }

    const group = accordions.find((a) => a.id === accordionId);
    if (group && Array.isArray(group.fields)) {
      const exists = group.fields.some(
        (f) => f.name.trim().toLowerCase() === nameTrimmed.toLowerCase()
      );
      if (exists) {
        showAlert(
          "Duplicate Field Name",
          "A field with this name already exists in this group. Please use another name."
        );
        return;
      }
    }

    let placeholder = "";
    let dateFormat;
    const instructions = newFieldData.instructions.trim() || "";

    if (newFieldData.type === "date") {
      dateFormat = newFieldData.dateFormat || "YYYY-MM-DD";
      const preset = DATE_FORMAT_PRESETS.find((p) => p.value === dateFormat);
      placeholder = preset?.example || dateFormat;
    } else {
      placeholder = newFieldData.placeholder.trim() || "Enter value...";
    }

    const field = {
      id: makeId(),
      name: nameTrimmed,
      type: newFieldData.type,
      placeholder,
      instructions,
      tags: [],
      ...(newFieldData.type === "date" ? { dateFormat } : {}),
    };

    setAccordions((prev) =>
      prev.map((a) =>
        a.id === accordionId ? { ...a, fields: [...a.fields, field] } : a
      )
    );
    setNewFieldData({
      name: "",
      type: "text",
      placeholder: "",
      instructions: "",
      dateFormat: "YYYY-MM-DD",
    });
  };

  // Insert field into editor with group fontStyle metadata
  const insertFieldToEditor = (accordion, field) => {
    const style = normalizeGroupStyle(accordion.style || {});
    onInsertField({
      ...field,
      groupId: accordion.id,
      fontStyle: style, // this is what TextEditor will use to enforce styling
    });
  };

  const updateTagsForField = (accordionId, fieldId, tags) => {
    setAccordions((prev) =>
      prev.map((a) =>
        a.id === accordionId
          ? {
              ...a,
              fields: a.fields.map((f) => (f.id === fieldId ? { ...f, tags } : f)),
            }
          : a
      )
    );
    onUpdateField(fieldId, { tags });
  };

  const handleTypeChange = (value) => {
    setNewFieldData((prev) => ({
      ...prev,
      type: value,
    }));
  };

  const handleDateFormatChange = (value) => {
    setNewFieldData((prev) => ({
      ...prev,
      dateFormat: value,
    }));
  };

  const updateGroupStyle = (accordionId, patch) => {
    setAccordions((prev) =>
      prev.map((a) =>
        a.id === accordionId
          ? {
              ...a,
              style: {
                ...normalizeGroupStyle(a.style || {}),
                ...patch,
              },
            }
          : a
      )
    );
  };

  return (
    <div className="space-y-5">
      {/* New group input */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newAccordionName}
            placeholder="Group name"
            onChange={(e) => {
              setNewAccordionName(e.target.value);
              if (groupNameError) setGroupNameError("");
            }}
            className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={addAccordion}
              className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700"
            >
              + Add
            </button>
            <button
              onClick={() => onBrowse && onBrowse()}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              Browse Sections
            </button>
          </div>
        </div>
        {groupNameError && (
          <p className="text-xs text-red-600 px-1">{groupNameError}</p>
        )}
      </div>

      {/* Groups */}
      {accordions.map((acc) => {
        const groupStyle = normalizeGroupStyle(acc.style || {});
        const previewStyle = {
          fontFamily: resolveFontCSS(groupStyle.fontFamily),
          fontSize: `${groupStyle.fontSize}px`,
          fontWeight: groupStyle.bold ? "700" : "400",
          fontStyle: groupStyle.italic ? "italic" : "normal",
          color: groupStyle.color,
        };

        return (
          <div
            key={acc.id}
            className="rounded-md border border-slate-200 bg-white shadow-sm"
          >
            {/* Header row */}
            <div
              className="flex cursor-pointer items-center justify-between border-b border-slate-100 p-2 hover:bg-slate-50"
              onClick={() => toggleAccordion(acc.id)}
            >
              <div className="flex items-center gap-2">
                {expanded[acc.id] ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}

                {!renaming[acc.id] && (
                  <span className="font-medium text-slate-800">{acc.name}</span>
                )}

                {renaming[acc.id] && (
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      value={renameDraft[acc.id] ?? acc.name}
                      onChange={(e) =>
                        setRenameDraft((prev) => ({
                          ...prev,
                          [acc.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      className="rounded-md bg-indigo-600 px-2 py-1 text-xs text-white"
                      onClick={() => {
                        const newName = (renameDraft[acc.id] ?? acc.name).trim();
                        if (!newName) return;

                        const exists = accordions.some(
                          (a) =>
                            a.id !== acc.id &&
                            a.name.trim().toLowerCase() === newName.toLowerCase()
                        );
                        if (exists) {
                          showAlert(
                            "Duplicate Group Name",
                            "A group with this name already exists. Please use another name."
                          );
                          return;
                        }

                        setAccordions((prev) =>
                          prev.map((a) =>
                            a.id === acc.id ? { ...a, name: newName } : a
                          )
                        );
                        setRenaming((prev) => ({ ...prev, [acc.id]: false }));
                      }}
                    >
                      Save
                    </button>
                    <button
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                      onClick={() =>
                        setRenaming((prev) => ({ ...prev, [acc.id]: false }))
                      }
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!renaming[acc.id] && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenaming((prev) => ({ ...prev, [acc.id]: true }));
                      setRenameDraft((prev) => ({ ...prev, [acc.id]: acc.name }));
                    }}
                    className="text-slate-600 hover:text-slate-800 text-xs underline"
                  >
                    Rename
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAccordion(acc.id);
                  }}
                  className="text-red-600 hover:text-red-800"
                  title="Delete group"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Expanded content */}
            {expanded[acc.id] && (
              <div className="space-y-3 p-3">
                {/* Save section */}
                <div className="flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isSignedIn) return;
                      onSaveGroup && onSaveGroup(acc);
                    }}
                    disabled={!isSignedIn}
                    title={
                      !isSignedIn
                        ? "Sign in to save this section"
                        : "Save section to your library"
                    }
                    className={`rounded-md border px-2 py-1 text-xs ${
                      isSignedIn
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 border-slate-300"
                        : "bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed"
                    }`}
                  >
                    Save Section
                  </button>
                </div>

                {/* Group font settings */}
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                  <div className="text-xs mb-2 text-slate-700 font-semibold">
                    Font Settings for this Group
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-600">Font</span>
                      <select
                        value={groupStyle.fontFamily}
                        onChange={(e) =>
                          updateGroupStyle(acc.id, { fontFamily: e.target.value })
                        }
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        style={{ fontFamily: resolveFontCSS(groupStyle.fontFamily) }}
                      >
                        {fontOptions.map((family) => (
                          <option
                            key={family}
                            value={family}
                            style={{ fontFamily: resolveFontCSS(family) }}
                          >
                            {family}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-600">Size (pt)</span>
                      <input
                        type="number"
                        min={6}
                        max={48}
                        value={groupStyle.fontSize}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (Number.isNaN(val)) return;
                          const clamped = Math.min(48, Math.max(6, val));
                          updateGroupStyle(acc.id, { fontSize: clamped });
                        }}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs w-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => updateGroupStyle(acc.id, { bold: !groupStyle.bold })}
                      className={`rounded-md border px-2 py-1 text-xs ${
                        groupStyle.bold
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                      style={{ fontWeight: "600" }}
                    >
                      B
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateGroupStyle(acc.id, { italic: !groupStyle.italic })
                      }
                      className={`rounded-md border px-2 py-1 text-xs ${
                        groupStyle.italic
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                      style={{ fontStyle: "italic" }}
                    >
                      I
                    </button>

                    <div className="flex items-center gap-1 ml-4">
                      <span className="text-[11px] text-slate-600">Color</span>
                      <input
                        type="color"
                        value={groupStyle.color}
                        onChange={(e) =>
                          updateGroupStyle(acc.id, {
                            color: e.target.value || "#000000",
                          })
                        }
                        className="h-5 w-8 cursor-pointer rounded border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  <div className="mt-1 text-[11px] text-slate-500">
                    Preview:&nbsp;
                    <span style={previewStyle}>Sample placeholder preview</span>
                  </div>
                </div>

                {/* Fields list */}
                {acc.fields.length === 0 && (
                  <div className="text-xs text-slate-500">No fields yet.</div>
                )}

                {acc.fields.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-md border border-slate-200 p-2 hover:bg-slate-50"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm text-slate-800">
                          {f.name}{" "}
                          <span className="text-slate-400 text-xs">({f.type})</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Placeholder: <em style={previewStyle}>{f.placeholder}</em>
                        </div>
                        {f.type === "date" && f.dateFormat && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Format: <em>{f.dateFormat}</em>
                          </div>
                        )}
                        {f.instructions && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Instructions: <em>{f.instructions}</em>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => insertFieldToEditor(acc, f)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Insert
                        </button>
                        <button
                          onClick={() => askDeleteField(acc.id, f)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <TagPicker
                      availableTags={tagsRegistry}
                      selectedTags={f.tags}
                      onChange={(tags) => updateTagsForField(acc.id, f.id, tags)}
                    />
                  </div>
                ))}

                {/* Add new field */}
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <div className="text-xs mb-1 text-slate-600 font-medium">
                    Add New Field
                  </div>

                  <div className="flex flex-col gap-2 mb-2">
                    <select
                      value={newFieldData.type}
                      onChange={(e) => handleTypeChange(e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="text">Text</option>
                      <option value="date">Date</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Field name"
                      value={newFieldData.name}
                      onChange={(e) =>
                        setNewFieldData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />

                    {newFieldData.type === "date" ? (
                      <select
                        value={newFieldData.dateFormat}
                        onChange={(e) => handleDateFormatChange(e.target.value)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        {DATE_FORMAT_PRESETS.map((fmt) => (
                          <option key={fmt.value} value={fmt.value}>
                            {fmt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Placeholder"
                        value={newFieldData.placeholder}
                        onChange={(e) =>
                          setNewFieldData((prev) => ({
                            ...prev,
                            placeholder: e.target.value,
                          }))
                        }
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    )}

                    <input
                      type="text"
                      placeholder="Instructions (optional)"
                      value={newFieldData.instructions}
                      onChange={(e) =>
                        setNewFieldData((prev) => ({
                          ...prev,
                          instructions: e.target.value,
                        }))
                      }
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                  </div>

                  <button
                    onClick={() => addField(acc.id)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                  >
                    + Add Field
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* DELETE GROUP MODAL */}
      <PermanentlyDeleteDocumentModal
        open={deleteOpen}
        onClose={() => !submittingDelete && setDeleteOpen(false)}
        onConfirm={onConfirmDeleteGroup}
        submitting={submittingDelete}
        error={deleteErr}
        title="Delete Group"
        message="This will permanently delete this group and remove all fields inside it. This action cannot be undone."
        confirmLabel="Delete"
        itemTitle={targetGroup?.name}
      />

      {/* DELETE FIELD MODAL */}
      <DeleteFieldModal
        open={deleteFieldOpen}
        onClose={() => !submittingFieldDelete && setDeleteFieldOpen(false)}
        onConfirm={onConfirmDeleteField}
        submitting={submittingFieldDelete}
        error={deleteFieldErr}
        fieldName={targetField?.name}
      />

      {/* SIMPLE ALERT MODAL */}
      <SimpleMessageModal
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        title={alertTitle}
        message={alertMessage}
      />
    </div>
  );
}
