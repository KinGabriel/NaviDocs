import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Trash2, ChevronLeft, Plus, Eye, Settings, Layers, Grid, List } from "lucide-react";
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

const FIELDS_PER_PAGE = 5;
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
  setAccordions = () => { },
  tagsRegistry = [],
  onInsertField = () => { },
  onRemoveField = () => { },
  onUpdateField = () => { },
  onSaveGroup = () => { },
  onBrowse = () => { },
  isSignedIn = false,
}) {
  const [expanded, setExpanded] = useState({});
  const [renaming, setRenaming] = useState({});
  const [renameDraft, setRenameDraft] = useState({});
  const [newAccordionName, setNewAccordionName] = useState("");
  const [groupNameError, setGroupNameError] = useState("");
  
  // Field pagination per accordion
  const [fieldPage, setFieldPage] = useState({});
  const [viewMode, setViewMode] = useState({});
  
  // Field creation wizard state
  const [showFieldWizard, setShowFieldWizard] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
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
      style: normalizeGroupStyle({}),
    };
    setAccordions((prev) => [...prev, newAcc]);
    setNewAccordionName("");
    setGroupNameError("");
    setExpanded((prev) => ({ ...prev, [newAcc.id]: true }));
    setFieldPage((prev) => ({ ...prev, [newAcc.id]: 0 }));
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

  const startFieldWizard = (accordionId) => {
    setShowFieldWizard(accordionId);
    setWizardStep(1);
    setNewFieldData({
      name: "",
      type: "text",
      placeholder: "",
      instructions: "",
      dateFormat: "YYYY-MM-DD",
    });
  };

  const closeFieldWizard = () => {
    setShowFieldWizard(null);
    setWizardStep(1);
    setNewFieldData({
      name: "",
      type: "text",
      placeholder: "",
      instructions: "",
      dateFormat: "YYYY-MM-DD",
    });
  };

  const nextWizardStep = () => {
    if (wizardStep === 1 && !newFieldData.name.trim()) {
      showAlert("Field Name Required", "Please enter a field name to continue.");
      return;
    }
    setWizardStep((prev) => Math.min(3, prev + 1));
  };

  const prevWizardStep = () => {
    setWizardStep((prev) => Math.max(1, prev - 1));
  };

  const completeFieldWizard = () => {
    const nameTrimmed = newFieldData.name.trim();
    if (!nameTrimmed) {
      showAlert("Field Name Required", "Field name is required.");
      return;
    }

    const group = accordions.find((a) => a.id === showFieldWizard);
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
        a.id === showFieldWizard ? { ...a, fields: [...a.fields, field] } : a
      )
    );

    closeFieldWizard();
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

  const getFieldsForPage = (fields, accId) => {
    const page = fieldPage[accId] || 0;
    const start = page * FIELDS_PER_PAGE;
    const end = start + FIELDS_PER_PAGE;
    return fields.slice(start, end);
  };

  const getTotalPages = (fields) => {
    return Math.ceil(fields.length / FIELDS_PER_PAGE);
  };

  const goToNextPage = (accId, totalPages) => {
    setFieldPage((prev) => ({
      ...prev,
      [accId]: Math.min((prev[accId] || 0) + 1, totalPages - 1)
    }));
  };

  const goToPrevPage = (accId) => {
    setFieldPage((prev) => ({
      ...prev,
      [accId]: Math.max((prev[accId] || 0) - 1, 0)
    }));
  };

  const toggleViewMode = (accId) => {
    setViewMode((prev) => ({
      ...prev,
      [accId]: prev[accId] === 'grid' ? 'list' : 'grid'
    }));
  };

  return (
    <div className="space-y-5">
      {/* Header with stats */}
      <div className="bg-white rounded-lg border-t-8 border-indigo-600 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-normal text-gray-900 mb-1">Field Configuration</h2>
            <p className="text-sm text-gray-600">Create and organize your document fields</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>{accordions.length} {accordions.length === 1 ? 'section' : 'sections'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600" />
              <span>{accordions.reduce((sum, a) => sum + (a.fields?.length || 0), 0)} fields</span>
            </div>
          </div>
        </div>

      {/* New group input */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newAccordionName}
            placeholder="Section name (e.g., Personal Information)"
            onChange={(e) => {
              setNewAccordionName(e.target.value);
              if (groupNameError) setGroupNameError("");
            }}
            onKeyPress={(e) => e.key === 'Enter' && addAccordion()}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
            <button
              onClick={addAccordion}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Section
            </button>
            <button
              onClick={() => onBrowse && onBrowse()}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Browse Sections
            </button>
        </div>
        {groupNameError && (
          <p className="text-xs text-red-600 px-1">{groupNameError}</p>
        )}
      </div>
      </div>

      {/* Groups */}
      <div className="space-y-3">
      {accordions.map((acc, accIndex) => {
        const groupStyle = normalizeGroupStyle(acc.style || {});
        const previewStyle = {
          fontFamily: resolveFontCSS(groupStyle.fontFamily),
          fontSize: `${groupStyle.fontSize}px`,
          fontWeight: groupStyle.bold ? "700" : "400",
          fontStyle: groupStyle.italic ? "italic" : "normal",
          color: groupStyle.color,
        };

          const currentPage = fieldPage[acc.id] || 0;
          const totalPages = getTotalPages(acc.fields || []);
          const paginatedFields = getFieldsForPage(acc.fields || [], acc.id);
          const currentViewMode = viewMode[acc.id] || 'list';

        return (
          <div key={acc.id} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Section Header */}
             <div
                className="flex cursor-pointer items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
                onClick={() => toggleAccordion(acc.id)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-semibold text-sm">
                    {accIndex + 1}
                  </div>

                  {!renaming[acc.id] && (
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{acc.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {acc.fields?.length || 0} {acc.fields?.length === 1 ? 'field' : 'fields'}
                      </p>
                    </div>
                  )}

                {renaming[acc.id] && (
                  <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                      value={renameDraft[acc.id] ?? acc.name}
                      onChange={(e) =>
                      setRenameDraft((prev) => ({ ...prev, [acc.id]: e.target.value }))
                      }
                       autoFocus
                    />
                    <button
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                      onClick={() => {
                        const newName = (renameDraft[acc.id] ?? acc.name).trim();
                        if (!newName) return;
                        const exists = accordions.some(
                          (a) => a.id !== acc.id && a.name.trim().toLowerCase() === newName.toLowerCase()
                        );
                        if (exists) {
                          showAlert("Duplicate Section Name", "A section with this name already exists.");
                          return;
                        }
                        setAccordions((prev) =>
                          prev.map((a) => (a.id === acc.id ? { ...a, name: newName } : a))
                        );
                        setRenaming((prev) => ({ ...prev, [acc.id]: false }));
                      }}
                    >
                      Save
                    </button>
                    <button
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
                      onClick={() => setRenaming((prev) => ({ ...prev, [acc.id]: false }))}
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
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Rename
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAccordion(acc.id);
                  }}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete section"
                >
                  <Trash2 size={16} />
                </button>
                 {expanded[acc.id] ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
              </div>
            </div>

            {/* Expanded Content */}
            {expanded[acc.id] && (
              <div className="p-3 bg-gray-50">
                {/* Action Bar */}
                <div className="flex justify-between items-center mb-4">
                  <button
                      onClick={() => startFieldWizard(acc.id)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Field
                    </button>
                    <div className="flex items-center gap-2">
                      {acc.fields?.length > 0 && (
                        <button
                          onClick={() => toggleViewMode(acc.id)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          title={`Switch to ${currentViewMode === 'grid' ? 'list' : 'grid'} view`}
                        >
                          {currentViewMode === 'grid' ? <List size={18} className="text-gray-600" /> : <Grid size={18} className="text-gray-600" />}
                        </button>
                      )}
                      <button
                        onClick={() => isSignedIn && onSaveGroup && onSaveGroup(acc)}
                    disabled={!isSignedIn}
                    title={!isSignedIn ? "Sign in to save this section" : "Save section to your library"}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          isSignedIn
                            ? "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        Save Section
                      </button>
                    </div>
                  </div>

                {/* Font Settings */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-gray-600" />
                    <h4 className="text-sm font-semibold text-gray-900">Section Font Settings</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Font Family</label>
                      <select
                        value={groupStyle.fontFamily}
                        onChange={(e) => updateGroupStyle(acc.id, { fontFamily: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                        style={{ fontFamily: resolveFontCSS(groupStyle.fontFamily) }}
                      >
                        {fontOptions.map((family) => (
                          <option key={family} value={family} style={{ fontFamily: resolveFontCSS(family) }}>
                            {family}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Size (pt)</label>
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
                        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <button
                      type="button"
                      onClick={() => updateGroupStyle(acc.id, { bold: !groupStyle.bold })}
                      className={`w-10 h-10 rounded-md border flex items-center justify-center font-bold transition-colors ${
                        groupStyle.bold
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => updateGroupStyle(acc.id, { italic: !groupStyle.italic })}
                      className={`w-10 h-10 rounded-md border flex items-center justify-center italic transition-colors ${
                        groupStyle.italic
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                      I
                    </button>
                     <div className="flex items-center gap-2 ml-2">
                      <label className="text-xs text-gray-600">Color</label>
                      <input
                        type="color"
                        value={groupStyle.color}
                        onChange={(e) => updateGroupStyle(acc.id, { color: e.target.value || "#000000" })}
                          className="h-10 w-16 cursor-pointer rounded border border-gray-300"
                      />
                    </div>
                  </div>

                  <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded border border-gray-200">
                    <span className="font-medium">Preview: </span>
                    <span style={previewStyle}>Sample placeholder text</span>
                  </div>
                </div>

                {/* Fields List */}
                {acc.fields.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                      <Eye className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 mb-2">No fields yet</p>
                      <button
                        onClick={() => startFieldWizard(acc.id)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Add your first field
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Pagination Info */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mb-3 px-1">
                          <p className="text-sm text-gray-600">
                            Showing {currentPage * FIELDS_PER_PAGE + 1}-{Math.min((currentPage + 1) * FIELDS_PER_PAGE, acc.fields.length)} of {acc.fields.length} fields
                          </p>
                          <p className="text-xs text-gray-500">
                            Page {currentPage + 1} of {totalPages}
                          </p>
                        </div>
                      )}

                      {/* Fields Grid/List */}
                      <div className={currentViewMode === 'grid' ? 'grid grid-cols-1 gap-2' : 'space-y-2'}>
                        {paginatedFields.map((f, fIdx) => {
                          const actualIndex = currentPage * FIELDS_PER_PAGE + fIdx;
                          return (
                            <div
                              key={f.id}
                              className="rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-gray-500">#{actualIndex + 1}</span>
                                    <h5 className="font-medium text-gray-900 text-sm">{f.name}</h5>
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                      {f.type}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    <span className="italic" style={previewStyle}>{f.placeholder}</span>
                                  </p>
                                  {f.type === "date" && f.dateFormat && (
                                    <p className="text-xs text-gray-500 mt-1">Format: {f.dateFormat}</p>
                                  )}
                                  {f.instructions && (
                                    <p className="text-xs text-gray-600 mt-1 bg-blue-50 p-2 rounded border border-blue-200">
                                      💡 {f.instructions}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => insertFieldToEditor(acc, f)}
                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700 transition-colors"
                                  >
                                    Insert
                                  </button>
                                  <button
                                    onClick={() => askDeleteField(acc.id, f)}
                                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-md text-xs font-medium hover:bg-red-100 transition-colors"
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
                          );
                        })}
                      </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                            <button
                              onClick={() => goToPrevPage(acc.id)}
                              disabled={currentPage === 0}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                                currentPage === 0
                                  ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                                  : 'text-indigo-600 hover:bg-indigo-50 bg-white border border-indigo-200'
                              }`}
                            >
                              <ChevronLeft className="w-3 h-3" />
                              Prev
                            </button>

                            <span className="text-xs text-gray-600">
                              Page {currentPage + 1} of {totalPages}
                            </span>

                            <button
                              onClick={() => goToNextPage(acc.id, totalPages)}
                              disabled={currentPage >= totalPages - 1}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                                currentPage >= totalPages - 1
                                  ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                                  : 'text-indigo-600 hover:bg-indigo-50 bg-white border border-indigo-200'
                              }`}
                            >
                              Next
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Field Creation Modal */}
      {showFieldWizard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-indigo-600 text-white p-6">
              <h3 className="text-xl font-semibold mb-2">Add New Field</h3>
              <p className="text-indigo-100 text-sm">Step {wizardStep} of 3</p>
              <div className="mt-4 flex gap-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      step <= wizardStep ? 'bg-white' : 'bg-indigo-400'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Wizard Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {wizardStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Basic Information</h4>
                    <p className="text-sm text-gray-600 mb-4">Let's start with the field name and type</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Field Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newFieldData.name}
                      onChange={(e) => setNewFieldData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Full Name, Email Address, Date of Birth"
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-1">This is the label users will see</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Field Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setNewFieldData((prev) => ({ ...prev, type: "text" }))}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          newFieldData.type === "text"
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-medium text-gray-900 mb-1">Text</div>
                        <div className="text-xs text-gray-600">Single line text input</div>
                      </button>
                      <button
                        onClick={() => setNewFieldData((prev) => ({ ...prev, type: "date" }))}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          newFieldData.type === "date"
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-medium text-gray-900 mb-1">Date</div>
                        <div className="text-xs text-gray-600">Date picker field</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Field Configuration</h4>
                    <p className="text-sm text-gray-600 mb-4">Manage how this field is displayed</p>
                  </div>

                  {newFieldData.type === "date" ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Date Format</label>
                      <select
                        value={newFieldData.dateFormat}
                        onChange={(e) => setNewFieldData((prev) => ({ ...prev, dateFormat: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                      >
                        {DATE_FORMAT_PRESETS.map((fmt) => (
                          <option key={fmt.value} value={fmt.value}>
                            {fmt.label}
                          </option>
                        ))}
                      </select>
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 mb-1">Preview:</p>
                        <p className="text-sm font-medium text-gray-900">
                          {DATE_FORMAT_PRESETS.find(f => f.value === newFieldData.dateFormat)?.example}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Placeholder Text</label>
                      <input
                        type="text"
                        value={newFieldData.placeholder}
                        onChange={(e) => setNewFieldData((prev) => ({ ...prev, placeholder: e.target.value }))}
                        placeholder="e.g., Enter your full name"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Additional Details</h4>
                    <p className="text-sm text-gray-600 mb-4">Add helpful instructions for users</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Instructions (Optional)
                    </label>
                    <textarea
                      value={newFieldData.instructions}
                      onChange={(e) => setNewFieldData((prev) => ({ ...prev, instructions: e.target.value }))}
                      placeholder="e.g., Please enter your full legal name as it appears on official documents"
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h5 className="text-sm font-semibold text-gray-900 mb-3">Field Summary</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium text-gray-900">{newFieldData.name || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium text-gray-900 capitalize">{newFieldData.type}</span>
                      </div>
                      {newFieldData.type === "date" ? (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Format:</span>
                          <span className="font-medium text-gray-900">{newFieldData.dateFormat}</span>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Placeholder:</span>
                          <span className="font-medium text-gray-900">{newFieldData.placeholder || "—"}</span>
                        </div>
                      )}
                      {newFieldData.instructions && (
                        <div className="pt-2 border-t border-gray-200">
                          <span className="text-gray-600 block mb-1">Instructions:</span>
                          <span className="text-gray-900 text-xs">{newFieldData.instructions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
                  <button
                    onClick={closeFieldWizard}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white rounded-lg transition-colors border border-gray-300"
                >
                   Cancel
                  </button>
              <div className="flex items-center gap-2">
                {wizardStep > 1 && (
                  <button
                    onClick={prevWizardStep}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white rounded-lg transition-colors border border-gray-300 flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                )}
                {wizardStep < 3 ? (
                  <button
                    onClick={nextWizardStep}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={completeFieldWizard}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Field
                  </button>
                )}
                </div>
              </div>
          </div>
        </div>
      )}

      {/* DELETE GROUP MODAL */}
      <PermanentlyDeleteDocumentModal
        open={deleteOpen}
        onClose={() => !submittingDelete && setDeleteOpen(false)}
        onConfirm={onConfirmDeleteGroup}
        submitting={submittingDelete}
        error={deleteErr}
        title="Delete Section"
        message="This will permanently delete this section and remove all fields inside it. This action cannot be undone."
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